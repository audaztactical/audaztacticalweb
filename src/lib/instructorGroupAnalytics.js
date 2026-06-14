/**
 * Eğitmen analitik paneli — group_activity_logs + training_results birleşimi.
 */

import { buildGroupLeaderboardRowFromActivity, sortGroupLeaderboardRows } from './groupLeaderboard'

/** @typedef {import('./firestoreGroupTraining').GroupActivityLog} GroupActivityLog */
/** @typedef {import('./firestoreGroupTrainings').TrainingResult} TrainingResult */
/** @typedef {import('./firestoreGroupTrainings').GroupTraining} GroupTraining */

/**
 * @param {unknown} ts
 */
function resolveLogMs(ts) {
  if (ts && typeof ts === 'object' && 'toMillis' in ts && typeof ts.toMillis === 'function') {
    return ts.toMillis()
  }
  return Date.parse(String(ts ?? '')) || 0
}

/**
 * Grup eğitimi sonucunu analitik log satırına dönüştürür.
 * @param {TrainingResult} result
 * @param {GroupTraining | null | undefined} training
 * @returns {GroupActivityLog}
 */
export function trainingResultToSyntheticLog(result, training) {
  const totalAmmo = Math.max(1, Number(result.totalAmmo) || training?.totalAmmo || 1)
  const hits = Math.min(totalAmmo, Math.max(0, Number(result.hits) || 0))
  const accuracy = Math.round((hits / totalAmmo) * 1000) / 10
  const minPassScore = Math.max(0, Number(result.minPassScore) || training?.minPassScore || 0)
  const maxSeconds =
    result.targetTimeSec != null
      ? Math.max(0, Number(result.targetTimeSec) || 0)
      : training?.targetTimeSec != null
        ? Math.max(0, Number(training.targetTimeSec) || 0)
        : 0

  return {
    logId: `tr-${result.id}`,
    groupId: result.groupId,
    operatorId: result.operatorId,
    templateId: result.trainingId,
    instructorId: training?.instructorId ?? '',
    type: 'group_training_result',
    trainingType: 'GROUP',
    operatorSubmitted: true,
    sourceDomain: 'group_trainings',
    sourceLogId: result.id,
    discipline: 'atis',
    drillName: training?.trainingName ?? 'Grup Eğitimi',
    score: accuracy,
    atisShotsFired: totalAmmo,
    atisHits: hits,
    accuracyPercent: accuracy,
    isTimed: Boolean(result.isTimed ?? training?.isTimed),
    duration: result.time != null ? Number(result.time) : null,
    instructorNotes: '',
    statusResult: typeof result.statusResult === 'string' ? result.statusResult : '',
    isTargetMet: result.isPassed === true,
    criticalMetrics: {
      targetType: 'GRP-07',
      maxSeconds,
      totalRounds: totalAmmo,
      totalAmmo,
      requiredHits: minPassScore,
    },
    timestamp: result.submittedAt ?? null,
  }
}

/**
 * Aktivite logları ile canlı training_results kayıtlarını birleştirir (çift kayıt önlenir).
 * @param {GroupActivityLog[]} activityLogs
 * @param {TrainingResult[]} trainingResults
 * @param {GroupTraining[]} trainings
 */
export function mergeInstructorGroupAnalytics(activityLogs, trainingResults, trainings) {
  /** @type {Map<string, GroupTraining>} */
  const trainingMap = new Map()
  trainings.forEach((t) => trainingMap.set(t.id, t))

  const archivedResultIds = new Set(
    activityLogs
      .map((l) => (typeof l.sourceLogId === 'string' ? l.sourceLogId : ''))
      .filter(Boolean),
  )

  const synthetic = trainingResults
    .filter((r) => r?.id && !archivedResultIds.has(r.id))
    .map((r) => trainingResultToSyntheticLog(r, trainingMap.get(r.trainingId) ?? null))

  return [...activityLogs, ...synthetic].sort(
    (a, b) => resolveLogMs(b.timestamp) - resolveLogMs(a.timestamp),
  )
}

/**
 * @param {import('./firestoreGroups').TacticalGroup} group
 * @param {import('./firestoreInstructor').OperatorProfile[]} operators
 * @param {GroupActivityLog[]} logs
 */
export function buildLiveGroupLeaderboard(group, operators, logs) {
  const memberSet = new Set(group.members)
  const profiles = operators.filter((p) => memberSet.has(p.uid))
  const rows = profiles.map((profile) => buildGroupLeaderboardRowFromActivity(profile, logs))
  return sortGroupLeaderboardRows(rows)
}
