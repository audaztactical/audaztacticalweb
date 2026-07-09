import { isAtisShootingLog, getAtisAccuracyPercent, getAtisRoundsAndHits } from './atisLogRegistry'
import { isCqbLog } from './cqbLogRegistry'
import { isFofLog } from './fofLogRegistry'
import { isVbssLog } from './vbssLogRegistry'
import { invNum, invStr } from './inventoryIlws'
import {
  filterSimulationLogs,
  isTcccSimulationLog,
  sortSimulationLogsNewestFirst,
} from './simulationHistoryHelpers'
import {
  getLogAccuracyPercent,
  getLogDisciplineTag,
  getLogSuccessOrAccuracy,
  getProgressLogTimestampMs,
} from './progressAnalytics'
import {
  buildTcccReactionChartPoints,
  resolveTcccReactionChartEfficiency,
} from './tcccSimHudAnalytics'
import { formatProgressTacticalErrorLabel, progressLocale, progressT } from './progressDisplayText.js'

/** @param {Record<string, unknown>} row */
export function getLogCompletionTimeSec(row) {
  if (row.isTimed === false || row.source === 'group_academic' && row.isTimed === false) {
    return null
  }
  if (row.source === 'group_academic' && (row.drillDurationSec == null || row.duration == null)) {
    return null
  }
  if (isAtisShootingLog(row) || invStr(row.kind).toUpperCase() === 'ATIS_DRILL') {
    const sec = invNum(row.drillDurationSec)
    if (row.isTimed === false) return null
    if (sec > 0) return Math.round(sec * 1000) / 1000
  }
  if (isCqbLog(row)) {
    const sec = invNum(row.clearingTimeSec)
    if (sec > 0) return Math.round(sec * 1000) / 1000
  }
  if (isAtisShootingLog(row)) {
    const td = row.timingData
    if (td && typeof td === 'object') {
      const o = /** @type {Record<string, unknown>} */ (td)
      const split = invNum(o.split)
      const total = invNum(o.total)
      const first = invNum(o.firstShot)
      const pick = split > 0 ? split : total > 0 ? total : first > 0 ? first : null
      if (pick != null) return Math.round(pick * 1000) / 1000
    }
  }
  if (isFofLog(row)) {
    const sec = invNum(row.clearingTimeSec) || invNum(row.scenarioDurationSec)
    if (sec > 0) return Math.round(sec * 1000) / 1000
  }
  if (isVbssLog(row)) {
    const sec = invNum(row.boardingTimeSec)
    if (sec > 0) return Math.round(sec * 1000) / 1000
  }
  return null
}

/** @param {Record<string, unknown>} row */
export function getLogReactionTimeSec(row) {
  if (isAtisShootingLog(row)) {
    const td = row.timingData
    if (td && typeof td === 'object') {
      const o = /** @type {Record<string, unknown>} */ (td)
      const split = invNum(o.split)
      const first = invNum(o.firstShot)
      if (split > 0) return Math.round(split * 1000) / 1000
      if (first > 0) return Math.round(first * 1000) / 1000
    }
  }
  if (isFofLog(row)) {
    const ttfe = invNum(row.timeToFirstEngagementSec)
    if (ttfe > 0) return Math.round(ttfe * 1000) / 1000
  }
  if (isVbssLog(row)) {
    const boarding = invNum(row.boardingTimeSec)
    if (boarding > 0) return Math.round(boarding * 1000) / 1000
  }
  const completion = getLogCompletionTimeSec(row)
  return completion
}

/** @param {Record<string, unknown>} row */
export function resolveLogFocusId(row) {
  return invStr(row.id) || `${getProgressLogTimestampMs(row)}`
}

/** @param {Record<string, unknown>} row */
export function getLogHudAccuracyPercent(row) {
  if (isAtisShootingLog(row)) return getAtisAccuracyPercent(row)

  if (isFofLog(row)) {
    const rounds = invNum(row.engagementRounds)
    const lethal = invNum(row.lethalHitsDelivered)
    const nonLethal = invNum(row.nonLethalHitsDelivered)
    if (rounds > 0) {
      return Math.min(100, Math.round(((lethal + nonLethal) / rounds) * 1000) / 10)
    }
  }

  const fromRegistry = getLogAccuracyPercent(row)
  if (fromRegistry != null) return fromRegistry
  return getLogSuccessOrAccuracy(row)
}

/**
 * @param {Record<string, unknown>[]} logs
 */
export function buildCharacterMatrix(logs) {
  /** @type {{ id: string; reaction: number; accuracy: number; tag: string }[]} */
  const points = []

  for (const row of logs) {
    const reaction = getLogReactionTimeSec(row)
    const accuracy = getLogHudAccuracyPercent(row)
    if (reaction == null || reaction <= 0 || accuracy == null) continue
    points.push({
      id: resolveLogFocusId(row),
      reaction,
      accuracy: Math.min(100, Math.max(0, accuracy)),
      tag: getLogDisciplineTag(row),
    })
  }

  const maxReaction = points.length
    ? Math.max(0.5, ...points.map((p) => p.reaction)) * 1.15
    : 3

  return { points, maxReaction }
}

const ERROR_CODES = {
  // Stable display codes — never truncate id to 8 chars (that produced ERR_BLIND_EN)
  breaching_delay: 'ERR_BREACH_DELAY',
  stack_exposure: 'ERR_STACK_EXPOSURE',
  noise_discipline_compromised: 'ERR_NOISE_DISC',
  poor_threshold_pieing: 'ERR_THRESHOLD_PIE',
  fatal_funnel_hang: 'ERR_FATAL_FUNNEL',
  over_penetration: 'ERR_OVER_PEN',
  blind_entry: 'ERR_BLIND_ENTRY',
  slow_breach: 'ERR_SLOW_BREACH',
  slow_breaching: 'ERR_SLOW_BREACH',
  poor_corner_check: 'ERR_CORNER_CHECK',
  poor_corner_piercing: 'ERR_CORNER_PIERCE',
  leaving_sectors_uncovered: 'ERR_SECTOR_GAP',
  colliding_with_teammate: 'ERR_COLLISION',
  muzzle_flagging: 'ERR_MUZZLE_FLAG',
  tunnel_vision: 'ERR_TUNNEL_VISION',
  poor_comm_discipline: 'ERR_COMM_DISC',
  blue_on_blue: 'ERR_BLUE_ON_BLUE',
}

/**
 * @param {string} errorId
 */
function radarErrorCode(errorId) {
  const id = String(errorId ?? '').trim()
  if (!id) return 'ERR_UNKNOWN'
  if (ERROR_CODES[/** @type {keyof typeof ERROR_CODES} */ (id)]) {
    return ERROR_CODES[/** @type {keyof typeof ERROR_CODES} */ (id)]
  }
  // Full id, not slice(0,8) — avoids ERR_BLIND_EN style truncations
  return `ERR_${id.replace(/[^a-zA-Z0-9]+/g, '_').toUpperCase()}`
}

/**
 * @param {Record<string, unknown>[]} logs
 */
export function buildChronicErrorRadar(logs) {
  /** @type {Map<string, { id: string; label: string; code: string; count: number }>} */
  const counts = new Map()

  const bump = (id, label, code) => {
    const key = id
    const prev = counts.get(key)
    if (prev) prev.count += 1
    else counts.set(key, { id, label, code, count: 1 })
  }

  for (const row of logs) {
    if (row.blueOnBlue) {
      bump('blue_on_blue', progressT('radarErrors.blueOnBlueFof'), radarErrorCode('blue_on_blue'))
    }
    const errors = Array.isArray(row.tacticalErrors) ? row.tacticalErrors : []
    for (const raw of errors) {
      const id = invStr(raw).trim()
      if (!id) continue
      const label = formatProgressTacticalErrorLabel(id, getLogDisciplineTag(row)).toUpperCase()
      bump(id, label, radarErrorCode(id))
    }
  }

  const items = [...counts.values()].sort((a, b) => b.count - a.count)
  const maxCount = items.length ? Math.max(...items.map((i) => i.count)) : 1

  return { items, maxCount }
}

/**
 * @param {Record<string, unknown>[]} logs
 */
export function buildStressPerformanceWave(logs) {
  const sims = sortSimulationLogsNewestFirst(filterSimulationLogs(logs))
  if (sims.length >= 2) {
    const simSeries = buildTcccReactionChartPoints(logs, 12)
    return {
      source: 'tccc_sim',
      simSeries,
      days: [],
      activeSessions: simSeries.map((pt) => ({
        id: pt.id,
        ms: getProgressLogTimestampMs(
          pt.logRow && typeof pt.logRow === 'object'
            ? /** @type {Record<string, unknown>} */ (pt.logRow)
            : {},
        ),
        value: pt.efficiency,
        label: pt.timestamp,
        logRow: pt.logRow,
      })),
      dayLabel: 'TCCC SIM',
    }
  }

  const sorted = [...logs].sort((a, b) => getProgressLogTimestampMs(a) - getProgressLogTimestampMs(b))

  /** @type {Map<string, { dayKey: string; sessions: { id: string; ms: number; value: number; label: string }[] }>} */
  const byDay = new Map()

  for (const row of sorted) {
    const ms = getProgressLogTimestampMs(row)
    if (!ms) continue
    const d = new Date(ms)
    const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const simEfficiency = isTcccSimulationLog(row) ? resolveTcccReactionChartEfficiency(row) : null
    const value =
      simEfficiency != null
        ? simEfficiency
        : (getLogSuccessOrAccuracy(row) ?? getLogAccuracyPercent(row) ?? 0)
    if (!byDay.has(dayKey)) byDay.set(dayKey, { dayKey, sessions: [] })
    byDay.get(dayKey).sessions.push({
      id: resolveLogFocusId(row),
      ms,
      value: Math.min(100, Math.max(0, value)),
      label: d.toLocaleTimeString(progressLocale(), { hour: '2-digit', minute: '2-digit' }),
    })
  }

  const days = [...byDay.values()]
    .sort((a, b) => a.dayKey.localeCompare(b.dayKey))
    .slice(-5)

  const latestDay = days.length ? days[days.length - 1] : { dayKey: '', sessions: [] }

  return {
    source: 'daily',
    simSeries: [],
    days,
    activeSessions: latestDay.sessions,
    dayLabel: latestDay.dayKey,
  }
}

/**
 * ORS için yavaş drill / düşük isabet özeti.
 * @param {Record<string, unknown>[]} logs
 */
export function summarizeSpeedAndSafetyPenalties(logs) {
  let slowDrillCount = 0
  let lowAccuracyCount = 0
  let safetyViolationCount = 0

  for (const row of logs) {
    const errors = Array.isArray(row.tacticalErrors) ? row.tacticalErrors : []
    for (const raw of errors) {
      const id = invStr(raw).trim()
      if (
        id === 'muzzle_flagging' ||
        id === 'fatal_funnel_hang' ||
        id === 'slow_breach' ||
        id === 'poor_corner_piercing' ||
        id === 'blue_on_blue'
      ) {
        safetyViolationCount += 1
      }
    }
    if (row.blueOnBlue) safetyViolationCount += 1

    const sec = getLogCompletionTimeSec(row)
    if (isCqbLog(row) && sec != null && sec > 12) slowDrillCount += 1
    if (isAtisShootingLog(row) && sec != null && sec > 2.5) slowDrillCount += 1
    if (isFofLog(row) && sec != null && sec > 180) slowDrillCount += 1
    if (isVbssLog(row) && sec != null && sec > 90) slowDrillCount += 1

    const acc = getLogAccuracyPercent(row)
    const { totalRoundsFired, totalHits } = isAtisShootingLog(row)
      ? getAtisRoundsAndHits(row)
      : { totalRoundsFired: 0, totalHits: 0 }
    if (acc != null && acc < 50) lowAccuracyCount += 1
    if (totalRoundsFired > 0 && totalHits / totalRoundsFired < 0.5) lowAccuracyCount += 1
  }

  return { slowDrillCount, lowAccuracyCount, safetyViolationCount }
}
