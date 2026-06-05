import {
  buildWeaponRoundsFirestorePatch as buildRoundsPatch,
  getEffectiveTotalRoundsFired,
  getManualRoundsFired,
  sumRangeLogRoundsForWeapon,
  weaponDisplayName,
} from './weaponIlws'

export { sumRangeLogRoundsForWeapon, getEffectiveTotalRoundsFired }

export { buildRoundsPatch as buildWeaponRoundsFirestorePatch }

/**
 * @param {Record<string, unknown>} weapon
 * @param {number} manualDelta
 * @param {Record<string, unknown>[]} rangeLogs
 */
export function buildManualRoundsPatch(weapon, manualDelta, rangeLogs) {
  const manual = Math.max(0, Math.floor(manualDelta))
  const fromLogs = sumRangeLogRoundsForWeapon(String(weapon.id), rangeLogs)
  const effective = manual + fromLogs
  return {
    manual_rounds_fired: manual,
    ...buildRoundsPatch(weapon, effective),
  }
}

/**
 * @param {(id: string, patch: Record<string, unknown>) => Promise<unknown>} updateItem
 * @param {Record<string, unknown>} weapon
 * @param {number} roundsToAdd
 * @param {Record<string, unknown>[]} rangeLogs
 */
export async function syncWeaponAfterRangeLog(updateItem, weapon, roundsToAdd, rangeLogs) {
  const weaponId = String(weapon.id)
  const manual = getManualRoundsFired(weapon, rangeLogs)
  const fromLogs = sumRangeLogRoundsForWeapon(weaponId, rangeLogs) + Math.max(0, Math.floor(roundsToAdd))
  const effective = manual + fromLogs
  const label = weaponDisplayName(weapon)
  await updateItem(weaponId, {
    ...buildRoundsPatch(weapon, effective),
    auditLogCode: 'CEP_GNC',
    auditLogMsg: `${label} · ATIŞ_KAYDI +${roundsToAdd}`,
  })
}
