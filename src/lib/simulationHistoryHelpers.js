import { invNum, invStr } from './inventoryIlws'
import { CASEVAC_TRANSMISSION_DEADLINE_SEC } from './casevacSimulatorConstants'
import { MEDEVAC_TRANSMISSION_DEADLINE_SEC } from './medevacSimulatorValidation'
import { PENALTY_TCCC_BELOW_40 } from './orsEngine'
import { healthLocale, healthT, localizeSimRejectionReasons } from './healthDisplayText'

/** @typedef {'medevac' | 'casevac'} SimMode */

/**
 * @param {Record<string, unknown>} row
 */
export function isTcccSimulationLog(row) {
  if (row.casevacSim === true) return true
  if (row.medevacSim === true) return true
  const st = invStr(row.shootType).toUpperCase()
  return st === 'MEDEVAC_9LINE_RADIO_SIM' || st === 'CASEVAC_MIST_RADIO_SIM'
}

/**
 * @param {Record<string, unknown>} row
 * @returns {SimMode}
 */
export function getSimulationMode(row) {
  if (row.casevacSim === true) return 'casevac'
  const key = invStr(row.tcccPhaseKey).toLowerCase()
  if (key === 'casevac_mist') return 'casevac'
  const st = invStr(row.shootType).toUpperCase()
  if (st === 'CASEVAC_MIST_RADIO_SIM') return 'casevac'
  return 'medevac'
}

/**
 * @param {unknown} ts
 */
export function formatSimulationTimestamp(ts) {
  const locale = healthLocale()
  if (ts && typeof ts === 'object' && ts !== null && 'toDate' in ts && typeof ts.toDate === 'function') {
    return ts.toDate().toLocaleString(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }
  const s = invStr(ts)
  if (!s) return healthT('common.emDash')
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? s : d.toLocaleString(locale)
}

/**
 * @param {Record<string, unknown>} row
 */
export function getSimulationSuccess(row) {
  if (typeof row.medevacTransmissionSuccess === 'boolean') {
    return row.medevacTransmissionSuccess
  }
  const sp = invNum(row.successPercent)
  return sp >= 85
}

/**
 * @param {Record<string, unknown>} row
 */
export function getSimulationElapsedSec(row) {
  const elapsed = invNum(row.elapsedTime)
  if (Number.isFinite(elapsed) && elapsed >= 0) return elapsed
  const n = invNum(row.medevacTransmissionSec)
  return Number.isFinite(n) ? n : 0
}

/**
 * @param {Record<string, unknown>} row
 */
export function getSimulationRemainingSec(row) {
  const mode = getSimulationMode(row)
  const deadline =
    mode === 'casevac' ? CASEVAC_TRANSMISSION_DEADLINE_SEC : MEDEVAC_TRANSMISSION_DEADLINE_SEC
  const elapsed = getSimulationElapsedSec(row)
  return Math.max(0, Math.round((deadline - elapsed) * 10) / 10)
}

/**
 * @param {number} sec
 */
export function formatSimulationTimingSec(sec) {
  const n = Number(sec)
  if (!Number.isFinite(n)) return '0'
  const rounded = Math.round(n * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

/**
 * @param {SimMode} mode
 */
export function getSimulationDeadlineSec(mode) {
  return mode === 'casevac' ? CASEVAC_TRANSMISSION_DEADLINE_SEC : MEDEVAC_TRANSMISSION_DEADLINE_SEC
}

/**
 * @param {SimMode} mode
 * @param {number} elapsedSec
 */
export function computeSimulationOvertimeSec(mode, elapsedSec) {
  const deadline = getSimulationDeadlineSec(mode)
  return Math.max(0, Math.round((Math.max(0, elapsedSec) - deadline) * 10) / 10)
}

/**
 * @param {Record<string, unknown>} row
 */
export function getSimulationOvertimeSec(row) {
  const stored = invNum(row.overtime)
  if (Number.isFinite(stored) && stored >= 0) return stored
  return computeSimulationOvertimeSec(getSimulationMode(row), getSimulationElapsedSec(row))
}

/**
 * @param {Record<string, unknown>} row
 */
export function isSimulationTimeoutFailure(row) {
  if (row.simTimedOut === true) return true
  const failure = invStr(row.medevacFailureReason).toUpperCase()
  if (
    failure.includes('YAYIN SÜRESİ AŞILDI') ||
    failure.includes('TIMEOUT') ||
    failure.includes('TRANSMISSION TIME EXCEEDED')
  ) {
    return true
  }
  if (getSimulationOvertimeSec(row) > 0 && !getSimulationSuccess(row)) return true
  return false
}

/**
 * @param {number} overtimeSec
 */
export function formatOvertimeDebriefLine(overtimeSec) {
  const ot = formatSimulationTimingSec(overtimeSec)
  return healthT('sim.reject.overtime', { sec: ot })
}

/** Stable marker shared by TR/EN overtime debrief lines */
export function isOvertimeDebriefLine(text) {
  const s = invStr(text).toUpperCase()
  return s.includes('CRITICAL_DELAY') || s.includes('KRİTİK GECİKME') || s.includes('CRITICAL DELAY')
}

/**
 * @param {SimMode} mode
 * @param {number} elapsedSec
 * @param {boolean} [timedOut]
 * @param {number} [finalRemaining] countdown at submit (deadline − elapsed); negative = overtime
 */
export function buildSimulationTimingFields(mode, elapsedSec, timedOut = false, finalRemaining) {
  const deadline = getSimulationDeadlineSec(mode)

  if (typeof finalRemaining === 'number' && finalRemaining < 0) {
    const overtime = Math.abs(finalRemaining)
    const elapsedTime = deadline + overtime
    return {
      elapsedTime,
      overtime,
      timeDisplayString: healthT('sim.history.timeDisplayNeg', { sec: overtime }),
      medevacTransmissionSec: elapsedTime,
      simTimedOut: true,
    }
  }

  const elapsedTime = Math.round(Math.max(0, elapsedSec) * 10) / 10
  const overtime = computeSimulationOvertimeSec(mode, elapsedTime)
  return {
    elapsedTime,
    overtime,
    timeDisplayString:
      overtime > 0 ? healthT('sim.history.timeDisplayNeg', { sec: overtime }) : null,
    medevacTransmissionSec: elapsedTime,
    simTimedOut: timedOut || overtime > 0,
  }
}

/**
 * @param {SimMode} mode
 * @param {number} elapsedSec
 */
export function reactionEfficiencyPercent(mode, elapsedSec) {
  const deadline =
    mode === 'casevac' ? CASEVAC_TRANSMISSION_DEADLINE_SEC : MEDEVAC_TRANSMISSION_DEADLINE_SEC
  const elapsed = Math.max(0, elapsedSec)
  const raw = ((deadline - elapsed) / deadline) * 100
  return Math.max(0, Math.min(100, Math.round(raw)))
}

/**
 * @param {Record<string, unknown>} row
 */
export function formatScoreOrsEffect(row) {
  const sp = Math.round(invNum(row.successPercent))
  const display = Number.isFinite(sp) ? sp : 0
  if (display < 40) {
    return healthT('sim.history.scoreOrs', { pct: display, penalty: PENALTY_TCCC_BELOW_40 })
  }
  return healthT('sim.history.scorePlain', { pct: display })
}

/**
 * @param {Record<string, unknown>} row
 * @returns {string[]}
 */
export function getStoredRejectionReasons(row) {
  const arr = row.simRejectionReasons
  if (Array.isArray(arr) && arr.length > 0) {
    return localizeSimRejectionReasons(arr.map((r) => invStr(r).trim()).filter(Boolean))
  }
  const legacy = invStr(row.medevacFailureReason).trim()
  if (!legacy) return []
  return localizeSimRejectionReasons(
    legacy
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => (s.startsWith('•') ? s : `• ${s}`)),
  )
}

/**
 * @param {Record<string, unknown>[]} logs
 */
export function filterSimulationLogs(logs) {
  return logs.filter(isTcccSimulationLog)
}

/**
 * @param {Record<string, unknown>[]} logs
 */
export function sortSimulationLogsNewestFirst(logs) {
  return [...logs].sort((a, b) => {
    const tb = entrySortMs(b)
    const ta = entrySortMs(a)
    return tb - ta
  })
}

/** @param {Record<string, unknown>} row */
function entrySortMs(row) {
  const u = row.updatedAt ?? row.createdAt ?? row.timestamp
  if (u && typeof u === 'object' && u !== null && 'toMillis' in u && typeof u.toMillis === 'function') {
    return u.toMillis()
  }
  const t = Date.parse(invStr(row.timestamp))
  return Number.isNaN(t) ? 0 : t
}
