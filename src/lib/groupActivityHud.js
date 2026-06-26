import { roundSuccessPercent } from './trainingSuccessScore'

/**
 * @typedef {import('./firestoreGroupTraining').GroupActivityLog} GroupActivityLog
 */

/**
 * Akademik grup kaydını Progress HUD / analytics ile uyumlu sentetik satıra dönüştürür.
 * Kişisel range_logs ile karışmaz — type: group_drill.
 * @param {GroupActivityLog} log
 * @returns {Record<string, unknown>}
 */
export function groupActivityLogToProgressRow(log) {
  const rounds = Math.max(1, log.atisShotsFired || log.criticalMetrics.totalRounds || 1)
  const hits = Math.min(rounds, Math.max(0, log.atisHits || log.score))
  const storedAccuracy = Number(log.accuracyPercent)
  const accuracy = Number.isFinite(storedAccuracy) && storedAccuracy > 0
    ? roundSuccessPercent(storedAccuracy)
    : roundSuccessPercent((hits / rounds) * 100)
  const isTimed = log.isTimed !== false
  const maxSec = log.criticalMetrics.maxSeconds || 0
  const requiredHits = Math.min(
    rounds,
    Math.max(1, Number(log.criticalMetrics.requiredHits) || Math.ceil(rounds * 0.5)),
  )
  const duration =
    isTimed && log.duration != null && Number.isFinite(Number(log.duration))
      ? Math.max(0, Number(log.duration))
      : null
  const hitsMet = hits >= requiredHits
  const timeViolation =
    isTimed && maxSec > 0 && duration != null && duration > maxSec
  let passed =
    log.isTargetMet === true ||
    (log.statusResult === 'BAŞARILI'
      ? true
      : log.statusResult
        ? false
        : isTimed
          ? hitsMet && !timeViolation
          : hitsMet)

  if (log.discipline === 'cqb') {
    passed =
      log.statusResult === 'BAŞARILI' ||
      log.cqbSuccessStatus === 'BAŞARILI' ||
      (log.isThreatCleared === true && log.hasNoTacticalViolations === true && log.isTimeValid === true)
  }

  const infractions = Array.isArray(log.infractions) ? log.infractions : []
  const rejectionReasons = Array.isArray(log.rejectionReasons)
    ? log.rejectionReasons
    : Array.isArray(log.instructorInfractions)
      ? log.instructorInfractions
      : infractions

  const base = {
    id: log.logId,
    type: 'group_drill',
    source: 'group_academic',
    groupId: log.groupId,
    operatorId: log.operatorId,
    templateId: log.templateId,
    discipline: log.discipline,
    operationCategory: log.discipline,
    drillName: log.drillName,
    successPercent: accuracy,
    success: passed,
    status: passed ? 'SUCCESS' : 'FAILURE',
    isTimed,
    drillDurationSec: duration,
    clearingTimeSec: log.discipline === 'cqb' ? duration : null,
    operationNote: log.instructorNotes || null,
    tacticalErrors: infractions,
    rejectionReasons,
    instructorInfractions: rejectionReasons,
    timestamp: log.timestamp,
    updatedAt: log.timestamp,
    recordedAt: log.timestamp,
    groupCriticalMetrics: log.criticalMetrics,
  }

  if (log.discipline === 'atis') {
    return {
      ...base,
      kind: 'ATIS_DRILL',
      shootType: 'GROUP_ACADEMIC_ATIS',
      isabetOrani: accuracy,
      accuracy,
      totalRoundsFired: rounds,
      totalHits: hits,
    }
  }

  if (log.discipline === 'cqb') {
    const totalThreats = Math.max(1, log.cqbTotalThreats || log.criticalMetrics.totalThreats || 1)
    const eliminated = Math.min(totalThreats, log.eliminatedThreats ?? log.score ?? 0)
    const cqbPct = Math.round((eliminated / totalThreats) * 100)
    return {
      ...base,
      kind: 'CQB_DRILL',
      roomTopology: log.drillName,
      entryMethod: 'GRUP_EĞİTİM',
      successPercent: cqbPct,
      isabetOrani: cqbPct,
      cqbSuccessStatus: log.statusResult || log.cqbSuccessStatus,
      statusResult: log.statusResult || log.cqbSuccessStatus,
      instructorInfractions: log.instructorInfractions ?? log.rejectionReasons ?? [],
      rejectionReasons: log.rejectionReasons ?? log.instructorInfractions ?? [],
      eliminatedThreats: eliminated,
      totalThreats,
    }
  }

  if (log.discipline === 'vbss') {
    return {
      ...base,
      kind: 'VBSS_DRILL',
      operationCategory: 'vbss',
      insertionMethod: log.drillName,
    }
  }

  if (log.discipline === 'tccc') {
    return {
      ...base,
      kind: 'TCCC_DRILL',
      operationCategory: 'tccc',
      tcccPhase: log.drillName,
    }
  }

  if (log.discipline === 'egitim') {
    return {
      ...base,
      kind: 'TRAINING_PLAN',
      operationCategory: 'egitim',
      shootType: 'GROUP_ACADEMIC_EDU',
    }
  }

  return {
    ...base,
    kind: 'FOF_DRILL',
    scenarioType: log.drillName,
    engagementRounds: rounds,
    lethalHitsDelivered: hits,
    nonLethalHitsDelivered: 0,
  }
}

/**
 * @param {GroupActivityLog[]} logs
 * @param {string | null} operatorId
 */
export function groupLogsToProgressRows(logs, operatorId = null) {
  const filtered = operatorId ? logs.filter((l) => l.operatorId === operatorId) : logs
  return filtered.map(groupActivityLogToProgressRow)
}

/**
 * @param {GroupActivityLog[]} logs
 * @param {string} operatorId
 */
export function filterGroupLogsForOperator(logs, operatorId) {
  return logs.filter((l) => l.operatorId === operatorId)
}

/**
 * @param {GroupActivityLog} log
 */
export function computeGroupLogHitPercent(log) {
  const stored = Number(log.accuracyPercent)
  if (Number.isFinite(stored) && stored >= 0) return stored
  if (log.isTimed === false) {
    const shots = Math.max(1, log.atisShotsFired || log.criticalMetrics.totalRounds || 1)
    const hits = Math.min(shots, Math.max(0, log.atisHits || log.score))
    return Math.round((hits / shots) * 1000) / 10
  }
  const rounds = Math.max(1, log.criticalMetrics.totalRounds || 1)
  return Math.round((Math.min(rounds, log.score) / rounds) * 1000) / 10
}

/**
 * @param {GroupActivityLog[]} logs
 * @param {string} operatorId
 */
export function averageGroupAtisForOperator(logs, operatorId) {
  const atis = logs.filter((l) => l.operatorId === operatorId && l.discipline === 'atis')
  if (!atis.length) return 0
  const sum = atis.reduce((a, l) => a + computeGroupLogHitPercent(l), 0)
  return Math.round((sum / atis.length) * 10) / 10
}

/**
 * @param {GroupActivityLog[]} logs
 * @param {string} operatorId
 */
export function averageGroupCqbSecForOperator(logs, operatorId) {
  const cqb = logs.filter((l) => l.operatorId === operatorId && l.discipline === 'cqb')
  const secs = cqb.map((l) => l.duration).filter((n) => Number.isFinite(n) && n > 0)
  if (!secs.length) return null
  return Math.round((secs.reduce((a, b) => a + b, 0) / secs.length) * 10) / 10
}

/**
 * @param {GroupActivityLog[]} logs
 * @param {string} operatorId
 */
export function averageGroupOverallForOperator(logs, operatorId) {
  const mine = logs.filter((l) => l.operatorId === operatorId)
  if (!mine.length) return 0
  const sum = mine.reduce((a, l) => a + computeGroupLogHitPercent(l), 0)
  return Math.round((sum / mine.length) * 10) / 10
}

/**
 * @param {GroupActivityLog[]} logs
 * @param {string} operatorId
 */
export function countGroupDrillsForOperator(logs, operatorId) {
  return logs.filter((l) => l.operatorId === operatorId).length
}

/**
 * @param {GroupActivityLog[]} logs
 */
export function buildGroupAggregateTrend(logs, maxBars = 12) {
  const sorted = [...logs].sort((a, b) => {
    const ta = resolveLogMs(a.timestamp)
    const tb = resolveLogMs(b.timestamp)
    return ta - tb
  })
  return sorted.slice(-maxBars).map((log, index) => ({
    id: log.logId,
    label: `#${index + 1}`,
    value: computeGroupLogHitPercent(log),
    tag: log.discipline === 'atis' ? 'ATIS' : log.discipline === 'cqb' ? 'CQB' : 'FOF',
  }))
}

/**
 * @param {unknown} ts
 */
function resolveLogMs(ts) {
  if (ts && typeof ts === 'object' && 'toMillis' in ts && typeof ts.toMillis === 'function') {
    return ts.toMillis()
  }
  return Date.parse(String(ts ?? '')) || 0
}
