import {
  AMMO_TX_TYPES,
  findAmmoForWeapon,
  getAmmoTransactionLogs,
  getCurrentStock,
  hasProcessedRangeLog,
} from './ammoIlws'
import { invNum, invStr } from './inventoryIlws'
import { todayIsoDate, weaponDisplayName } from './weaponIlws'

/** @param {unknown} ts */
function logDateFromRow(ts) {
  if (ts && typeof ts === 'object' && typeof ts.toMillis === 'function') {
    return new Date(ts.toMillis()).toISOString().slice(0, 10)
  }
  if (typeof ts === 'string' && ts.trim()) return ts.trim().slice(0, 10)
  return todayIsoDate()
}

/**
 * Tek mühimmat satırına antrenman düşümü uygular.
 * @param {{
 *   updateItem: (id: string, patch: Record<string, unknown>) => Promise<unknown>
 *   ammo: Record<string, unknown>
 *   rounds: number
 *   rangeLogId: string
 *   weaponLabel: string
 *   date: string
 * }} p
 */
export async function applyTrainingAmmoDeduction({ updateItem, ammo, rounds, rangeLogId, weaponLabel, date }) {
  const id = String(ammo.id)
  if (hasProcessedRangeLog(ammo, rangeLogId)) return

  const deduct = Math.max(0, Math.floor(rounds))
  if (deduct <= 0) return

  const prevStock = getCurrentStock(ammo)
  const nextStock = Math.max(0, prevStock - deduct)
  const savedDate = invStr(date).slice(0, 10) || todayIsoDate()
  const entry = {
    date: savedDate,
    type: AMMO_TX_TYPES.TRAINING,
    amount: -deduct,
    note: `Antrenman · ${weaponLabel}`,
    rangeLogId,
    balanceAfter: nextStock,
  }
  const prevLogs = getAmmoTransactionLogs(ammo)

  await updateItem(id, {
    current_stock: nextStock,
    quantity: nextStock,
    ammo_transaction_logs: [entry, ...prevLogs],
    auditLogCode: 'CEP_GNC',
    auditLogMsg: `MHM_HARCAMA · −${deduct} · ${weaponLabel}`,
  })
}

/**
 * İşlenmemiş atış günlüklerini eşleşen kalibre mühimmatından düşer.
 * @param {{
 *   rangeLogs: Record<string, unknown>[]
 *   ammoRows: Record<string, unknown>[]
 *   weapons: Record<string, unknown>[]
 *   updateItem: (id: string, patch: Record<string, unknown>) => Promise<unknown>
 * }} p
 */
export async function processUnsyncedRangeLogsForAmmo({ rangeLogs, ammoRows, weapons, updateItem }) {
  for (const log of rangeLogs) {
    const logId = String(log.id ?? '')
    if (!logId) continue
    const weaponId = invStr(log.weaponInventoryId).trim()
    if (!weaponId) continue
    const weapon = weapons.find((w) => String(w.id) === weaponId)
    if (!weapon) continue
    const ammo = findAmmoForWeapon(ammoRows, weapon)
    if (!ammo) continue
    if (hasProcessedRangeLog(ammo, logId)) continue

    const rounds = Math.max(0, Math.floor(invNum(log.roundsTotal)))
    if (rounds <= 0) continue

    const date = logDateFromRow(log.recordedAt ?? log.createdAt ?? log.performedAt)
    await applyTrainingAmmoDeduction({
      updateItem,
      ammo,
      rounds,
      rangeLogId: logId,
      weaponLabel: weaponDisplayName(weapon),
      date,
    })
  }
}

/**
 * Hızlı ikmal kaydı.
 * @param {{
 *   updateItem: (id: string, patch: Record<string, unknown>) => Promise<unknown>
 *   ammo: Record<string, unknown>
 *   amount: number
 *   note: string
 *   date: string
 * }} p
 */
export async function applyAmmoSupply({ updateItem, ammo, amount, note, date }) {
  const id = String(ammo.id)
  const add = Math.max(0, Math.floor(amount))
  if (add <= 0) return

  const prevStock = getCurrentStock(ammo)
  const nextStock = prevStock + add
  const savedDate = invStr(date).slice(0, 10) || todayIsoDate()
  const entry = {
    date: savedDate,
    type: AMMO_TX_TYPES.SUPPLY,
    amount: add,
    note: note.trim() || 'Hızlı ikmal',
    balanceAfter: nextStock,
  }
  const prevLogs = getAmmoTransactionLogs(ammo)

  await updateItem(id, {
    current_stock: nextStock,
    quantity: nextStock,
    ammo_transaction_logs: [entry, ...prevLogs],
    auditLogCode: 'CEP_GNC',
    auditLogMsg: `MHM_İKMAL · +${add}`,
  })
}
