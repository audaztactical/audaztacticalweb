import {
  averageGroupAtisForOperator,
  averageGroupCqbSecForOperator,
  averageGroupOverallForOperator,
  countGroupDrillsForOperator,
  computeGroupLogHitPercent,
} from './groupActivityHud'

/**
 * @typedef {{
 *   uid: string
 *   callsign: string
 *   username: string
 *   totalDrills: number
 *   atisAverage: number
 *   cqbSpeedSec: number | null
 *   fofAverage: number
 *   overallSuccess: number
 * }} GroupLeaderboardRow
 */

/**
 * @param {import('./firestoreInstructor').OperatorProfile} profile
 * @param {import('./firestoreGroupTraining').GroupActivityLog[]} groupLogs
 * @returns {GroupLeaderboardRow}
 */
export function buildGroupLeaderboardRowFromActivity(profile, groupLogs) {
  const uid = profile.uid
  const fofLogs = groupLogs.filter((l) => l.operatorId === uid && l.discipline === 'fof')
  const fofAvg = fofLogs.length
    ? Math.round(
        (fofLogs.reduce((a, l) => a + computeGroupLogHitPercent(l), 0) / fofLogs.length) * 10,
      ) / 10
    : 0

  return {
    uid,
    callsign: profile.callsign || profile.username || 'OPERATÖR',
    username: profile.username || '',
    totalDrills: countGroupDrillsForOperator(groupLogs, uid),
    atisAverage: averageGroupAtisForOperator(groupLogs, uid),
    cqbSpeedSec: averageGroupCqbSecForOperator(groupLogs, uid),
    fofAverage: fofAvg,
    overallSuccess: averageGroupOverallForOperator(groupLogs, uid),
  }
}

/**
 * @param {GroupLeaderboardRow[]} rows
 */
export function sortGroupLeaderboardRows(rows) {
  return [...rows].sort((a, b) => {
    if (b.overallSuccess !== a.overallSuccess) return b.overallSuccess - a.overallSuccess
    if (b.atisAverage !== a.atisAverage) return b.atisAverage - a.atisAverage
    return b.totalDrills - a.totalDrills
  })
}
