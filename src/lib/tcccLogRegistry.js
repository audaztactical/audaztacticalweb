import { invNum, invStr } from './inventoryIlws'
import { resolveInjuryTypeValue, resolveTcccSelectValue } from './tcccOptions'
import { getTcccScoredMarchInterventions } from './trainingSuccessScore'

/**
 * @param {Record<string, unknown>} row
 */
export function isTcccLog(row) {
  const cat = invStr(row.operationCategory).toLowerCase()
  const kind = invStr(row.kind).toUpperCase()
  if (cat === 'tccc') return true
  if (kind === 'TCCC_DRILL') return true
  return false
}

/**
 * @param {Record<string, unknown>} row
 */
export function getTcccLogTimestampMs(row) {
  const iso = invStr(row.timestamp)
  if (iso) {
    const t = Date.parse(iso)
    if (!Number.isNaN(t)) return t
  }
  const u = row.updatedAt
  if (u && typeof u === 'object' && typeof u.toMillis === 'function') return u.toMillis()
  const c = row.createdAt
  if (c && typeof c === 'object' && typeof c.toMillis === 'function') return c.toMillis()
  return 0
}

/**
 * @param {Record<string, unknown>} row
 */
export function formatTcccDateCell(row) {
  const ms = getTcccLogTimestampMs(row)
  if (!ms) return '—'
  return new Date(ms).toLocaleString('tr-TR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

/**
 * @param {Record<string, unknown>} row
 * @param {'tcccPhase' | 'tourniquetLocation'} field
 */
function getTcccSelectField(row, field) {
  const label = invStr(row[field]).trim()
  if (label) return label
  const keyField = `${field}Key`
  const customField =
    field === 'tcccPhase' ? 'customTcccPhase' : 'customTourniquetLocation'
  const key = invStr(row[keyField]).trim()
  const custom = invStr(row[customField]).trim()
  return resolveTcccSelectValue(key, custom)
}

/** @param {Record<string, unknown>} row */
export function getTcccPhase(row) {
  return getTcccSelectField(row, 'tcccPhase')
}

/** @param {Record<string, unknown>} row */
export function getTcccTourniquetLocation(row) {
  return getTcccSelectField(row, 'tourniquetLocation')
}

/** @param {Record<string, unknown>} row */
export function getTcccInjuryType(row) {
  const label = invStr(row.injuryType).trim()
  if (label) return label
  const key = invStr(row.injuryTypeKey).trim()
  return resolveInjuryTypeValue(key)
}

/**
 * @param {Record<string, unknown>} row
 */
export function countTcccScoredMarchInterventions(row) {
  const injuryKey = invStr(row.injuryTypeKey || row.injuryType).trim()
  const scored = getTcccScoredMarchInterventions(injuryKey)
  if (!scored.size) return { done: 0, total: 0 }

  let done = 0
  for (const key of scored) {
    if (row[key]) done += 1
  }
  return { done, total: scored.size }
}

/**
 * @param {Record<string, unknown>} row
 * @param {'injuryToTqTime' | 'evacWaitingTime'} field
 */
function formatMetricField(row, field) {
  const secKey = field === 'injuryToTqTime' ? 'injuryToTqTimeSec' : 'evacWaitingTimeMin'
  const n = invNum(row[secKey])
  if (n > 0 && field === 'injuryToTqTime') return `${n}s`
  if (n > 0 && field === 'evacWaitingTime') return `${n} dk`
  const label = invStr(row[field]).trim()
  return label || '—'
}

/** @param {Record<string, unknown>} row */
export function formatTcccInjuryToTqTime(row) {
  return formatMetricField(row, 'injuryToTqTime')
}

/** @param {Record<string, unknown>} row */
export function formatTcccEvacWaitingTime(row) {
  return formatMetricField(row, 'evacWaitingTime')
}

/** @param {Record<string, unknown>} row */
export function formatTcccSystolicBp(row) {
  const n = invNum(row.systolicBp)
  if (n > 0) return `${n} mmHg`
  const label = invStr(row.systolicBpLabel).trim()
  return label || '—'
}

/** @param {Record<string, unknown>} row */
export function getTcccTourniquetApplied(row) {
  return Boolean(row.tourniquetApplied)
}

/** @param {Record<string, unknown>} row */
export function getTcccWoundPacking(row) {
  return Boolean(row.woundPacking)
}

/** @param {Record<string, unknown>} row */
export function getTcccNpaInserted(row) {
  return Boolean(row.npaInserted)
}

/** @param {Record<string, unknown>} row */
export function getTcccChestSealApplied(row) {
  return Boolean(row.chestSealApplied)
}

/** @param {Record<string, unknown>} row */
export function getTcccNeedleDecompression(row) {
  return Boolean(row.needleDecompression)
}

/** @param {Record<string, unknown>} row */
export function getTcccHypothermiaBlanket(row) {
  return Boolean(row.hypothermiaBlanket)
}

/** @param {Record<string, unknown>} row */
export function getTcccOperationNote(row) {
  return invStr(row.operationNote ?? row.notes).trim() || 'Operasyon notu kayıtlı değil.'
}

/** @param {boolean} value */
export function formatTcccBoolTr(value) {
  return value ? 'EVET' : 'HAYIR'
}

/** @param {Record<string, unknown>} row */
export function countTcccMarchInterventions(row) {
  return [
    getTcccTourniquetApplied(row),
    getTcccWoundPacking(row),
    getTcccNpaInserted(row),
    getTcccChestSealApplied(row),
    getTcccNeedleDecompression(row),
    getTcccHypothermiaBlanket(row),
  ].filter(Boolean).length
}

/**
 * @param {Record<string, unknown>[]} logs
 */
export function sortTcccLogsDesc(logs) {
  return [...logs].sort((a, b) => getTcccLogTimestampMs(b) - getTcccLogTimestampMs(a))
}

/**
 * @param {Record<string, unknown>[]} rangeLogs
 */
export function selectTcccLogs(rangeLogs) {
  return sortTcccLogsDesc(rangeLogs.filter(isTcccLog))
}

/**
 * @param {{
 *   logs: Record<string, unknown>[]
 *   tcccPhaseKey: string
 * }} filters
 */
export function filterTcccLogs({ logs, tcccPhaseKey }) {
  return logs.filter((row) => {
    if (tcccPhaseKey === 'ALL') return true
    const key = invStr(row.tcccPhaseKey || row.tcccPhase).trim()
    const label = getTcccPhase(row)
    return key === tcccPhaseKey || label === tcccPhaseKey
  })
}

/**
 * @param {Record<string, unknown>[]} logs
 */
export function extractTcccPhaseOptions(logs) {
  const set = new Map()
  for (const row of logs) {
    const label = getTcccPhase(row)
    const key = invStr(row.tcccPhaseKey).trim() || label
    if (label && label !== '—') set.set(key, label)
  }
  return Array.from(set.entries())
    .map(([key, label]) => ({ key, label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'tr'))
}
