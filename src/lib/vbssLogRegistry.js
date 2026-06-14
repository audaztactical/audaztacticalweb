import { invNum, invStr } from './inventoryIlws'
import { formatVbssClockSeconds } from './vbssLogPayload'
import { resolveVbssSelectValue } from './vbssOptions'
import { filterIndividualTrainingRecords } from './trainingGroupFields'

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
  return formatVbssClockSeconds(sec)
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
export function getVbssBoardingPoint(row) {
  const label = invStr(row.boardingPoint).trim()
  if (label) return label
  return getVbssInsertionMethod(row)
}

/** @param {Record<string, unknown>} row */
export function getVbssThreatLevel(row) {
  const label = invStr(row.threatLevel).trim()
  if (label) return label
  const key = invStr(row.threatLevelKey).trim()
  return resolveVbssSelectValue(key)
}

/** @param {Record<string, unknown>} row */
export function formatVbssSearchDuration(row) {
  const sec = invNum(row.searchDurationSec)
  if (sec >= 0 && Number.isFinite(sec)) return formatVbssClockSeconds(sec)
  const label = invStr(row.searchDuration).trim()
  return label || '—'
}

/** @param {Record<string, unknown>} row */
export function getVbssSuccessPercent(row) {
  const n = invNum(row.successPercent)
  if (Number.isFinite(n)) return Math.max(0, Math.min(100, Math.round(n * 10) / 10))
  return 0
}

/**
 * @param {Record<string, unknown>[]} dedicatedLogs
 * @param {Record<string, unknown>[]} rangeLogs
 */
export function mergeVbssLogSources(dedicatedLogs = [], rangeLogs = []) {
  const seen = new Set()
  const merged = []
  for (const row of [
    ...filterIndividualTrainingRecords(dedicatedLogs),
    ...filterIndividualTrainingRecords(rangeLogs).filter(isVbssLog),
  ]) {
    const id = String(row.id || '')
    if (id && seen.has(id)) continue
    if (id) seen.add(id)
    merged.push(row)
  }
  return sortVbssLogsDesc(merged)
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
  return sortVbssLogsDesc(filterIndividualTrainingRecords(rangeLogs).filter(isVbssLog))
}

/**
 * @param {{
 *   logs: Record<string, unknown>[]
 *   threatLevelKey?: string
 *   vesselTypeKey?: string
 *   boardingPointKey?: string
 *   seaStateKey?: string
 * }} filters
 */
export function filterVbssLogs({
  logs,
  threatLevelKey = 'ALL',
  vesselTypeKey = 'ALL',
  boardingPointKey = 'ALL',
  seaStateKey = 'ALL',
}) {
  return logs.filter((row) => {
    if (threatLevelKey !== 'ALL') {
      const key = invStr(row.threatLevelKey || row.threatLevel).trim()
      const label = getVbssThreatLevel(row)
      if (key !== threatLevelKey && label !== threatLevelKey) return false
    }
    if (vesselTypeKey !== 'ALL') {
      const key = invStr(row.vesselTypeKey || row.vesselType).trim()
      const label = getVbssVesselType(row)
      if (key !== vesselTypeKey && label !== vesselTypeKey) return false
    }
    if (boardingPointKey !== 'ALL') {
      const key = invStr(row.boardingPointKey || row.insertionMethodKey).trim()
      const label = getVbssBoardingPoint(row)
      if (key !== boardingPointKey && label !== boardingPointKey) return false
    }
    if (seaStateKey !== 'ALL') {
      const key = invStr(row.seaStateKey || row.seaState).trim()
      const label = getVbssSeaState(row)
      if (key !== seaStateKey && label !== seaStateKey) return false
    }
    return true
  })
}

/**
 * @param {{ threatLevelKey?: string, vesselTypeKey?: string, boardingPointKey?: string, seaStateKey?: string }} filters
 */
export function isVbssFilterActive(filters) {
  return (
    (filters.threatLevelKey && filters.threatLevelKey !== 'ALL') ||
    (filters.vesselTypeKey && filters.vesselTypeKey !== 'ALL') ||
    (filters.boardingPointKey && filters.boardingPointKey !== 'ALL') ||
    (filters.seaStateKey && filters.seaStateKey !== 'ALL')
  )
}

/**
 * @param {{ threatLevelKey?: string, vesselTypeKey?: string, boardingPointKey?: string, seaStateKey?: string }} filters
 */
export function formatVbssFilterSummary(filters) {
  const parts = []
  if (filters.boardingPointKey && filters.boardingPointKey !== 'ALL') {
    parts.push(`Giriş: ${filters.boardingPointKey}`)
  }
  if (filters.vesselTypeKey && filters.vesselTypeKey !== 'ALL') {
    parts.push(`Gemi: ${filters.vesselTypeKey}`)
  }
  if (filters.threatLevelKey && filters.threatLevelKey !== 'ALL') {
    parts.push(`Tehdit: ${filters.threatLevelKey}`)
  }
  if (filters.seaStateKey && filters.seaStateKey !== 'ALL') {
    parts.push(`Deniz: ${filters.seaStateKey}`)
  }
  return parts.join(' · ')
}

/**
 * @param {Record<string, unknown>[]} logs
 */
export function extractVbssThreatLevelOptions(logs) {
  const set = new Map()
  for (const row of logs) {
    const label = getVbssThreatLevel(row)
    const key = invStr(row.threatLevelKey).trim() || label
    if (label && label !== '—') set.set(key, label)
  }
  return Array.from(set.entries())
    .map(([key, label]) => ({ key, label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'tr'))
}

/**
 * @param {Record<string, unknown>[]} logs
 */
export function extractVbssVesselTypeOptions(logs) {
  const set = new Map()
  for (const row of logs) {
    const label = getVbssVesselType(row)
    const key = invStr(row.vesselTypeKey).trim() || label
    if (label && label !== '—') set.set(key, label)
  }
  return Array.from(set.entries())
    .map(([key, label]) => ({ key, label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'tr'))
}

/**
 * @param {Record<string, unknown>[]} logs
 */
export function extractVbssBoardingPointOptions(logs) {
  const set = new Map()
  for (const row of logs) {
    const label = getVbssBoardingPoint(row)
    const key = invStr(row.boardingPointKey || row.insertionMethodKey).trim() || label
    if (label && label !== '—') set.set(key, label)
  }
  return Array.from(set.entries())
    .map(([key, label]) => ({ key, label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'tr'))
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
