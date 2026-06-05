import { applyTrainingAmmoDeduction } from './ammoRangeSync'
import { getCurrentStock } from './ammoIlws'
import { buildAtisLogPayload } from './atisLogPayload'
import { sanitizeForFirestore } from './firestoreSanitize'
import {
  calculateYivConditionPercent,
  getEffectiveTotalRoundsFired,
  getMaxBarrelLife,
  weaponDisplayName,
} from './weaponIlws'
import { buildMaintenanceRequiredPatch } from './weaponMaintenanceAlarm'
import { syncWeaponAfterRangeLog } from './weaponRoundSync'

/**
 * @param {Record<string, unknown>} ammo
 * @param {number} rounds
 */
export function validateAmmoStock(ammo, rounds) {
  const need = Math.max(0, Math.floor(rounds))
  const stock = getCurrentStock(ammo)
  return { ok: need <= stock, stock, need }
}

/**
 * @param {{
 *   addLog: (payload: Record<string, unknown>) => Promise<{ id: string }>
 *   updateInventory: (id: string, patch: Record<string, unknown>) => Promise<unknown>
 *   weapon: Record<string, unknown>
 *   accessory?: Record<string, unknown> | null
 *   ammo: Record<string, unknown> | null
 *   rangeLogs: Record<string, unknown>[]
 *   userId: string
 *   drillKey: string
 *   customDrillName?: string
 *   distanceM: string | number
 *   isTimed: boolean
 *   timing: { firstShot: string, split: string, total: string }
 *   totalRoundsFired: number
 *   totalHits: number
 *   operationNote?: string
 * }} p
 */
export async function submitAtisRecord({
  addLog,
  updateInventory,
  weapon,
  accessory = null,
  ammo,
  rangeLogs,
  userId,
  drillKey,
  customDrillName = '',
  distanceM,
  isTimed,
  timing,
  totalRoundsFired,
  totalHits,
  operationNote = '',
}) {
  const projectedRounds = getEffectiveTotalRoundsFired(weapon, rangeLogs) + totalRoundsFired
  const yivPct = calculateYivConditionPercent(projectedRounds, getMaxBarrelLife(weapon))
  const barrelWear = 100 - yivPct

  const bundle = buildAtisLogPayload({
    userId,
    weapon,
    accessory,
    ammo,
    drillKey,
    customDrillName,
    distanceM,
    isTimed,
    timing,
    totalRoundsFired,
    totalHits,
    operationNote,
    yivConditionPercentAtShot: yivPct,
    barrelWearPercentAtShot: barrelWear,
  })

  if (ammo) {
    const check = validateAmmoStock(ammo, bundle.totalRoundsFired)
    if (!check.ok) {
      const err = new Error('Yetersiz mühimmat stoku')
      err.code = 'INSUFFICIENT_AMMO'
      const errMeta = /** @type {Record<string, unknown>} */ (err)
      errMeta.stock = check.stock
      errMeta.need = check.need
      throw err
    }
  }

  const payload = /** @type {Record<string, unknown>} */ (sanitizeForFirestore(bundle))
  const ref = await addLog(payload)
  const logId = String(ref?.id ?? '')

  if (!logId) {
    const err = new Error('Range log kimliği alınamadı')
    err.code = 'missing-log-id'
    throw err
  }

  if (ammo && bundle.totalRoundsFired > 0) {
    try {
      await applyTrainingAmmoDeduction({
        updateItem: updateInventory,
        ammo,
        rounds: bundle.totalRoundsFired,
        rangeLogId: logId,
        weaponLabel: String(bundle.weaponLabel ?? 'Atış'),
        date: String(bundle.timestamp).slice(0, 10),
      })
    } catch (ammoErr) {
      const err = new Error('Atış kaydı oluştu; mühimmat stoku güncellenemedi')
      err.code = 'AMMO_SYNC_FAILED'
      err.cause = ammoErr
      throw err
    }
  }

  try {
    await syncWeaponAfterRangeLog(updateInventory, weapon, bundle.totalRoundsFired, rangeLogs)
  } catch (weaponErr) {
    const err = new Error('Atış kaydı oluştu; silah atış sayacı güncellenemedi')
    err.code = 'WEAPON_SYNC_FAILED'
    err.cause = weaponErr
    throw err
  }

  const weaponId = String(weapon.id)
  const label = weaponDisplayName(weapon)
  try {
    await updateInventory(weaponId, {
      ...buildMaintenanceRequiredPatch(weaponId, String(bundle.timestamp)),
      auditLogMsg: `${label} · ATIŞ_SONRASI_BAKIM_ALARMI`,
    })
  } catch (maintErr) {
    const err = new Error('Atış kaydı oluştu; bakım alarmı işaretlenemedi')
    err.code = 'MAINT_ALARM_FAILED'
    err.cause = maintErr
    throw err
  }

  return { logId, bundle }
}
