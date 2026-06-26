import {
  averageGroupOverallForOperator,
  countGroupDrillsForOperator,
} from './groupActivityHud'

/** @typedef {import('./firestoreGroups').TacticalGroup} TacticalGroup */
/** @typedef {import('./firestoreInstructor').OperatorProfile} OperatorProfile */
/** @typedef {import('./firestoreGroupTraining').GroupActivityLog} GroupActivityLog */

/**
 * @typedef {{
 *   uid: string
 *   callsign: string
 *   username: string
 *   email: string
 *   groupNames: string[]
 *   totalSessions: number
 *   overallSuccess: number
 * }} SquadRosterRow
 */

/**
 * @param {TacticalGroup[]} groups
 * @param {OperatorProfile[]} allOperators
 * @param {GroupActivityLog[]} activityLogs
 * @returns {SquadRosterRow[]}
 */
export function buildInstructorSquadRoster(groups, allOperators, activityLogs) {
  /** @type {Map<string, string[]>} */
  const uidToGroups = new Map()

  for (const g of groups) {
    for (const uid of g.members) {
      const list = uidToGroups.get(uid) ?? []
      list.push(g.groupName)
      uidToGroups.set(uid, list)
    }
  }

  const operatorByUid = new Map(allOperators.map((o) => [o.uid, o]))

  return [...uidToGroups.entries()].map(([uid, groupNames]) => {
    const op = operatorByUid.get(uid)
    const totalSessions = countGroupDrillsForOperator(activityLogs, uid)
    const overallSuccess = averageGroupOverallForOperator(activityLogs, uid)

    return {
      uid,
      callsign: op?.callsign || op?.username || 'OPERATÖR',
      username: op?.username || '',
      email: op?.email || '',
      groupNames,
      totalSessions,
      overallSuccess,
    }
  })
}
