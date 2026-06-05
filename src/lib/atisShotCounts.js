import { invNum } from './inventoryIlws'

/**
 * @param {string | number} roundsRaw
 * @param {string | number} hitsRaw
 */
export function sanitizeShotCounts(roundsRaw, hitsRaw) {
  const totalRoundsFired = Math.max(1, Math.floor(invNum(roundsRaw)))
  let totalHits = Math.max(0, Math.floor(invNum(hitsRaw)))
  let hitsCapped = false
  if (totalHits > totalRoundsFired) {
    totalHits = totalRoundsFired
    hitsCapped = true
  }
  const accuracy =
    totalRoundsFired > 0 ? Math.round((Math.min(totalHits, totalRoundsFired) / totalRoundsFired) * 1000) / 10 : 0
  return { totalRoundsFired, totalHits, hitsCapped, accuracy }
}
