import { invStr } from './inventoryIlws'
import { resolveFirestoreTimestampMs } from './progressAnalytics'
import {
  OBSERVED_EVAL_TYPE,
  TCCC_OBSERVED_EVAL_KIND,
  VBSS_OBSERVED_EVAL_KIND,
  VERIFICATION_STATUS_UNVERIFIED,
} from './observedEvalConstants'

/**
 * @param {Record<string, unknown>} row
 */
export function isVbssObservedEval(row) {
  return String(row?.kind ?? '').toUpperCase() === VBSS_OBSERVED_EVAL_KIND
}

/**
 * @param {Record<string, unknown>} row
 */
export function isTcccObservedEval(row) {
  return String(row?.kind ?? '').toUpperCase() === TCCC_OBSERVED_EVAL_KIND
}

/**
 * @param {Record<string, unknown>} row
 */
export function isObservedEvalLog(row) {
  return isVbssObservedEval(row) || isTcccObservedEval(row)
}

/**
 * @param {Record<string, unknown>} row
 */
export function isUnverifiedObservedEval(row) {
  if (!isObservedEvalLog(row)) return false
  const status = String(row?.verificationStatus ?? VERIFICATION_STATUS_UNVERIFIED)
  return status === VERIFICATION_STATUS_UNVERIFIED
}

/**
 * @param {Record<string, unknown>} row
 */
export function observedEvalTimestampMs(row) {
  const observedAt = invStr(row?.observedAt).trim()
  if (observedAt) {
    const parsed = Date.parse(observedAt)
    if (!Number.isNaN(parsed)) return parsed
  }
  return Math.max(
    resolveFirestoreTimestampMs(row?.timestamp),
    resolveFirestoreTimestampMs(row?.updatedAt),
    resolveFirestoreTimestampMs(row?.createdAt),
  )
}

/**
 * @param {Record<string, unknown>} row
 */
export function getObservedEvalOverallScore(row) {
  const raw = Number(row?.overallScore)
  if (Number.isFinite(raw)) return raw
  return null
}

/**
 * @param {Record<string, unknown>} row
 */
export function getObservedEvalSuccessPercent(row) {
  const sp = Number(row?.successPercent)
  if (Number.isFinite(sp)) return Math.round(sp)
  const overall = getObservedEvalOverallScore(row)
  if (overall == null) return null
  return Math.round(overall * 10)
}

/**
 * @param {Record<string, unknown>} row
 */
export function getObservedEvalActivityTitle(row) {
  if (isVbssObservedEval(row)) {
    const observer = invStr(row?.observerName).trim() || 'Gözlemci'
    return `VBSS Gözlem · ${observer}`
  }
  if (isTcccObservedEval(row)) {
    const observer = invStr(row?.observerName).trim() || 'Gözlemci'
    return `TCCC MARCH Gözlem · ${observer}`
  }
  return 'Gözlem kaydı'
}

/**
 * @param {Record<string, unknown>[]} rows
 */
export function filterObservedEvalLogs(rows) {
  if (!Array.isArray(rows)) return []
  return rows.filter(isObservedEvalLog)
}

/**
 * @param {Record<string, unknown>[]} rows
 */
export function sortObservedEvalLogsDesc(rows) {
  return [...rows].sort((a, b) => observedEvalTimestampMs(b) - observedEvalTimestampMs(a))
}

/**
 * @param {Record<string, unknown>} row
 */
export function formatObservedEvalDate(row) {
  const ms = observedEvalTimestampMs(row)
  if (!ms) return '—'
  return new Date(ms).toLocaleString('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * @param {Record<string, unknown>} row
 */
export function observedEvalTypeLabel(row) {
  if (String(row?.type ?? '') !== OBSERVED_EVAL_TYPE) return '—'
  return isUnverifiedObservedEval(row) ? 'Gözlem · Doğrulanmadı' : 'Gözlem · Onaylı'
}
