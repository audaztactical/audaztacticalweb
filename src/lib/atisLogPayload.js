import { ATIS_DRILL_CUSTOM, resolveAtisDrillMeta } from './atisDrills'
import { ammoDisplayLabel } from './ammoIlws'
import { getTacticalCategory, invNum, invStr } from './inventoryIlws'
import { weaponDisplayName } from './weaponIlws'
import { sanitizeShotCounts } from './atisShotCounts'
import { buildAccessoriesAtShotSnapshot } from './weaponMaintenanceAlarm'

/**
 * @param {Record<string, unknown>} weapon
 * @param {Record<string, unknown> | null} accessory
 */
export function buildWeaponSpecsSnapshot(weapon, accessory) {
  const tacticalCategory = getTacticalCategory(weapon)
  /** @type {Record<string, unknown>} */
  const specs = {
    displayName: weaponDisplayName(weapon),
    brand: invStr(weapon.brand).trim() || null,
    model: invStr(weapon.name).trim() || null,
    calibre: invStr(weapon.calibre).trim() || null,
    tacticalCategory,
    serialNo: invStr(weapon.serialNo).trim() || null,
    weaponType: invStr(weapon.weaponType).trim() || null,
  }
  if (accessory) {
    specs.opticType = invStr(accessory.accessoryKind ?? accessory.name).trim() || null
    specs.opticLabel = invStr(accessory.name).trim() || null
  }
  return specs
}

/**
 * @param {{
 *   userId: string
 *   weapon: Record<string, unknown>
 *   accessory?: Record<string, unknown> | null
 *   ammo?: Record<string, unknown> | null
 *   drillKey: string
 *   customDrillName?: string
 *   distanceM: string | number
 *   isTimed: boolean
 *   timing: { firstShot: string, split: string, total: string }
 *   totalRoundsFired: number
 *   totalHits: number
 *   operationNote?: string | null
 *   yivConditionPercentAtShot?: number | null
 *   barrelWearPercentAtShot?: number | null
 *   meteoData?: Record<string, unknown> | null
 * }} input
 */
export function buildAtisLogPayload({
  userId,
  weapon,
  accessory = null,
  ammo = null,
  drillKey,
  customDrillName = '',
  distanceM,
  isTimed,
  timing,
  totalRoundsFired: roundsInput,
  totalHits: hitsInput,
  operationNote = '',
  yivConditionPercentAtShot = null,
  barrelWearPercentAtShot = null,
  meteoData = null,
}) {
  const weaponId = String(weapon.id)
  const ammoId = ammo ? String(ammo.id) : null
  const weaponSpecs = buildWeaponSpecsSnapshot(weapon, accessory ?? null)

  let drillName = ''
  let drillLevel = /** @type {number | null} */ (null)
  let drillId = drillKey

  if (drillKey === ATIS_DRILL_CUSTOM) {
    drillName = customDrillName.trim()
    drillId = 'custom'
    drillLevel = null
  } else {
    const meta = resolveAtisDrillMeta(drillKey)
    drillName = meta.drillName
    drillLevel = meta.level
    drillId = meta.drillId
  }

  const dist = Math.max(0, invNum(distanceM))
  const { totalRoundsFired, totalHits, accuracy } = sanitizeShotCounts(roundsInput, hitsInput)

  /** @type {{ firstShot: number | null, split: number | null, total: number | null }} */
  const timingData = {
    firstShot: null,
    split: null,
    total: null,
  }

  let timingNote = null
  if (isTimed) {
    timingData.firstShot = parseTimingSec(timing.firstShot)
    timingData.split = parseTimingSec(timing.split)
    timingData.total = parseTimingSec(timing.total)
  } else {
    timingNote = 'Süresiz Atış'
  }

  const weaponLabel = [
    weaponSpecs.displayName,
    weaponSpecs.brand ? String(weaponSpecs.brand) : '',
    weaponSpecs.calibre ? String(weaponSpecs.calibre) : '',
  ]
    .filter(Boolean)
    .join(' · ')

  const timestamp = new Date().toISOString()
  const operationNoteText = invStr(operationNote ?? '').trim()
  const accessoriesAtShot = buildAccessoriesAtShotSnapshot(weapon, accessory ?? null)
  const yivPct =
    yivConditionPercentAtShot != null
      ? Math.min(100, Math.max(0, Math.round(yivConditionPercentAtShot)))
      : null
  const wearPct =
    barrelWearPercentAtShot != null
      ? Math.min(100, Math.max(0, Math.round(barrelWearPercentAtShot)))
      : yivPct != null
        ? 100 - yivPct
        : null

  return {
    userId,
    weaponId,
    ammoId,
    drillName,
    distance: dist,
    totalRoundsFired,
    totalHits,
    isTimed,
    timingData,
    timestamp,
    weaponInventoryId: weaponId,
    ammoInventoryId: ammoId,
    ammoLabel: ammo ? ammoDisplayLabel(ammo) : null,
    weaponSpecs,
    accessoriesAtShot,
    yivConditionPercentAtShot: yivPct,
    barrelWearPercentAtShot: wearPct,
    weaponLabel,
    drillId,
    drillLevel,
    distanceM: dist,
    timingNote,
    operationNote: operationNoteText,
    accuracy,
    roundsTotal: totalRoundsFired,
    hits: totalHits,
    operationCategory: 'atis',
    kind: 'ATIS_DRILL',
    shootType: drillName,
    status: 'active',
    ...(meteoData ? { meteoData } : {}),
  }
}

/** @param {string} raw */
function parseTimingSec(raw) {
  const s = invStr(raw).trim().replace(',', '.')
  if (!s) return null
  const n = Number(s)
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 1000) / 1000 : null
}
