import { invNum, invStr } from './inventoryIlws'
import { resolveVbssSelectValue } from './vbssOptions'

/**
 * @param {Record<string, unknown>} row
 */
export function isVbssLog(row) {
  const cat = invStr(row.operationCategory).toLowerCase()
  const kind = invStr(row.kind).toUpperCase()
  if (cat === 'vbss') return true
  if (kind === 'VBSS_DRILL') return true
  return false
}

/**
 * @param {Record<string, unknown>} row
 */
export function getVbssLogTimestampMs(row) {
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
export function formatVbssDateCell(row) {
  const ms = getVbssLogTimestampMs(row)
  if (!ms) return '—'
  return new Date(ms).toLocaleString('tr-TR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

/**
 * @param {number | null | undefined} sec
 */
function formatSec(sec) {
  if (sec == null || !Number.isFinite(sec) || sec < 0) return '—'
  return `${sec}s`
}

/**
 * @param {Record<string, unknown>} row
 * @param {'boardingTime' | 'bridgeControlTime' | 'engineRoomControlTime' | 'containmentTime'} field
 */
function formatTimeField(row, field) {
  const secKey = `${field}Sec`
  const sec = invNum(row[secKey])
  if (sec > 0) return formatSec(sec)
  const label = invStr(row[field]).trim()
  return label || '—'
}

/** @param {Record<string, unknown>} row */
export function formatVbssBoardingTime(row) {
  return formatTimeField(row, 'boardingTime')
}

/** @param {Record<string, unknown>} row */
export function formatVbssBridgeControlTime(row) {
  return formatTimeField(row, 'bridgeControlTime')
}

/** @param {Record<string, unknown>} row */
export function formatVbssEngineRoomControlTime(row) {
  return formatTimeField(row, 'engineRoomControlTime')
}

/** @param {Record<string, unknown>} row */
export function formatVbssContainmentTime(row) {
  return formatTimeField(row, 'containmentTime')
}

/**
 * @param {Record<string, unknown>} row
 * @param {'insertionMethod' | 'vesselType' | 'seaState'} field
 */
function getVbssSelectField(row, field) {
  const label = invStr(row[field]).trim()
  if (label) return label
  const keyField = `${field}Key`
  const customField = field === 'insertionMethod'
    ? 'customInsertionMethod'
    : field === 'vesselType'
      ? 'customVesselType'
      : 'customSeaState'
  const key = invStr(row[keyField]).trim()
  const custom = invStr(row[customField]).trim()
  return resolveVbssSelectValue(key, custom)
}

/** @param {Record<string, unknown>} row */
export function getVbssInsertionMethod(row) {
  return getVbssSelectField(row, 'insertionMethod')
}

/** @param {Record<string, unknown>} row */
export function getVbssVesselType(row) {
  return getVbssSelectField(row, 'vesselType')
}

/**
 * @param {Record<string, unknown>} row
 */
export function getVbssSeaState(row) {
  return getVbssSelectField(row, 'seaState')
}

/**
 * @param {Record<string, unknown>} row
 */
export function formatVbssVesselSpeed(row) {
  const kt = invNum(row.vesselSpeedKnots)
  if (kt >= 0 && Number.isFinite(kt)) return `${kt} kt`
  const label = invStr(row.vesselSpeed).trim()
  return label || '—'
}

/**
 * @param {Record<string, unknown>} row
 */
export function getVbssCrewCount(row) {
  return Math.max(0, Math.floor(invNum(row.crewCount)))
}

/**
 * @param {Record<string, unknown>} row
 */
export function getVbssContrabandFound(row) {
  return Boolean(row.contrabandFound)
}

/**
 * @param {Record<string, unknown>} row
 */
export function getVbssBiometricCheck(row) {
  return Boolean(row.biometricCheck)
}

/**
 * @param {Record<string, unknown>} row
 */
export function getVbssScuttlingAttempt(row) {
  return Boolean(row.scuttlingAttempt)
}

/**
 * @param {Record<string, unknown>} row
 */
export function getVbssCommsBlackoutSuccess(row) {
  return Boolean(row.commsBlackoutSuccess)
}

/**
 * @param {Record<string, unknown>} row
 */
export function getVbssOperationNote(row) {
  return invStr(row.operationNote ?? row.notes).trim() || 'Operasyon notu kayıtlı değil.'
}

/**
 * @param {boolean} value
 */
export function formatVbssBoolTr(value) {
  return value ? 'EVET' : 'HAYIR'
}

/**
 * @param {Record<string, unknown>[]} logs
 */
export function sortVbssLogsDesc(logs) {
  return [...logs].sort((a, b) => getVbssLogTimestampMs(b) - getVbssLogTimestampMs(a))
}

/**
 * @param {Record<string, unknown>[]} rangeLogs
 */
export function selectVbssLogs(rangeLogs) {
  return sortVbssLogsDesc(rangeLogs.filter(isVbssLog))
}

/**
 * @param {{
 *   logs: Record<string, unknown>[]
 *   seaStateKey: string
 * }} filters
 */
export function filterVbssLogs({ logs, seaStateKey }) {
  return logs.filter((row) => {
    if (seaStateKey === 'ALL') return true
    const key = invStr(row.seaStateKey || row.seaState).trim()
    const label = getVbssSeaState(row)
    return key === seaStateKey || label === seaStateKey
  })
}

/**
 * @param {Record<string, unknown>[]} logs
 */
export function extractVbssSeaStateOptions(logs) {
  const set = new Map()
  for (const row of logs) {
    const label = getVbssSeaState(row)
    const key = invStr(row.seaStateKey).trim() || label
    if (label && label !== '—') set.set(key, label)
  }
  return Array.from(set.entries())
    .map(([key, label]) => ({ key, label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'tr'))
}
