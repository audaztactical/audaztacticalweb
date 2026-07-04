import { invNum, invStr } from './inventoryIlws'
import { getProgressLogTimestampMs } from './progressAnalytics'
import {
  filterSimulationLogs,
  formatSimulationTimingSec,
  getSimulationElapsedSec,
  getSimulationMode,
  getSimulationOvertimeSec,
  getSimulationSuccess,
  getStoredRejectionReasons,
  reactionEfficiencyPercent,
  sortSimulationLogsNewestFirst,
} from './simulationHistoryHelpers'

/** @typedef {'medevac' | 'casevac'} SimMode */

/**
 * @param {Record<string, unknown>} row
 */
export function getTcccSimStatusLabel(row) {
  const stored = invStr(row.tcccSimStatus).toUpperCase()
  if (stored === 'BAŞARILI' || stored === 'BASARILI') return 'BAŞARILI / CLEAN HIT'
  if (stored === 'BAŞARISIZ' || stored === 'BASARISIZ') return 'BAŞARISIZ / COLD HIT'
  return getSimulationSuccess(row) ? 'BAŞARILI / CLEAN HIT' : 'BAŞARISIZ / COLD HIT'
}

/**
 * @param {Record<string, unknown>} row
 */
export function isTcccSimulationFailed(row) {
  const status = invStr(row.tcccSimStatus).toUpperCase()
  if (status === 'BAŞARISIZ' || status === 'BASARISIZ') return true
  if (status === 'BAŞARILI' || status === 'BASARILI') return false
  return !getSimulationSuccess(row)
}

/**
 * @param {Record<string, unknown>} row
 */
export function getTcccSimRejectionSnippet(row) {
  const reasons = getStoredRejectionReasons(row)
  if (reasons.length > 0) return reasons[0].replace(/^•\s*/, '')
  if (isTcccSimulationFailed(row)) {
    return invStr(row.medevacFailureReason).trim() || 'İletim hatası'
  }
  return 'TEMİZ / HATA YOK'
}

/**
 * @param {Record<string, unknown>} row
 */
export function getTcccSimulationModeLabel(row) {
  return getSimulationMode(row) === 'casevac' ? 'CASEVAC MIST' : 'MEDEVAC 9-LINE'
}

/**
 * @param {Record<string, unknown>} row
 */
export function buildTcccHudTooltipModel(row) {
  const failed = isTcccSimulationFailed(row)
  const elapsedSec = getSimulationElapsedSec(row)
  const overtimeSec = getSimulationOvertimeSec(row)

  return {
    statusLabel: getTcccSimStatusLabel(row),
    failed,
    elapsedTime: formatSimulationTimingSec(elapsedSec),
    overtimeSec,
    overtimeLabel:
      overtimeSec > 0
        ? `-${formatSimulationTimingSec(overtimeSec)} SN`
        : 'YOK / SÜRE SINIRI İÇİNDE',
    simulationMode: getTcccSimulationModeLabel(row),
    efficiency: resolveTcccReactionChartEfficiency(row),
    rejectionReasons: getStoredRejectionReasons(row),
  }
}

/**
 * BAŞARILI → stored or time-based efficiency; BAŞARISIZ → ORS band penalty from overtime.
 * @param {Record<string, unknown>} row
 */
export function resolveTcccReactionChartEfficiency(row) {
  const status = invStr(row.tcccSimStatus ?? row.status).toUpperCase()
  const isBasarili =
    status === 'BAŞARILI' ||
    status === 'BASARILI' ||
    (status !== 'BAŞARISIZ' && status !== 'BASARISIZ' && !isTcccSimulationFailed(row))

  const overtime = getSimulationOvertimeSec(row)
  if (isBasarili) {
    const stored = invNum(row.efficiency)
    if (stored > 0) return Math.round(Math.min(100, stored))
    const mode = getSimulationMode(row)
    const elapsed = getSimulationElapsedSec(row)
    return reactionEfficiencyPercent(mode, elapsed)
  }
  return Math.max(0, Math.round(40 - overtime))
}

/**
 * @param {Record<string, unknown>} row
 * @param {number} idx
 */
export function formatTcccReactionChartTimestamp(row, idx) {
  const ms = getProgressLogTimestampMs(row)
  if (ms > 0) {
    return new Date(ms).toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }
  const raw = invStr(row.timestamp)
  if (raw) {
    const d = new Date(raw)
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    }
  }
  return `O${idx + 1}`
}

/**
 * @param {Record<string, unknown>[]} logs
 * @param {number} [limit]
 */
export function buildTcccReactionChartPoints(logs, limit = 8) {
  const sims = filterSimulationLogs(logs)
  const newest = sortSimulationLogsNewestFirst(sims).slice(0, limit)
  const chronological = [...newest].reverse()

  return chronological.map((row, idx) => {
    const mode = getSimulationMode(row)
    const modLabel = mode === 'casevac' ? 'CASEVAC' : 'MEDEVAC'

    return {
      id: invStr(row.id) || `tccc-sim-${idx}`,
      label: `O${idx + 1}`,
      timestamp: formatTcccReactionChartTimestamp(row, idx),
      efficiency: resolveTcccReactionChartEfficiency(row),
      mod: modLabel,
      statusLabel: getTcccSimStatusLabel(row),
      rejectionReason: getTcccSimRejectionSnippet(row),
      logRow: row,
    }
  })
}
