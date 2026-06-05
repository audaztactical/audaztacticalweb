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
    const mine = activityLogs.filter((l) => l.operatorId === uid)
    const totalSessions = mine.length
    const overallSuccess = totalSessions
      ? Math.round(
          (mine.reduce((acc, l) => {
            const rounds = Math.max(1, l.criticalMetrics?.totalRounds || 1)
            return acc + (Math.min(rounds, l.score) / rounds) * 100
          }, 0) /
            totalSessions) *
            10,
        ) / 10
      : 0

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
