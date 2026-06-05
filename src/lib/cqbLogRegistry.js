import { invNum, invStr } from './inventoryIlws'
import {
  groupTacticalErrorsForDisplay,
  labelTacticalError,
  resolveCqbSelectValue,
} from './cqbOptions'

/**
 * @param {Record<string, unknown>} row
 */
export function isCqbLog(row) {
  const cat = invStr(row.operationCategory).toLowerCase()
  const kind = invStr(row.kind).toUpperCase()
  if (cat === 'cqb') return true
  if (kind === 'CQB_DRILL') return true
  return false
}

/**
 * @param {Record<string, unknown>} row
 */
export function getCqbLogTimestampMs(row) {
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
export function formatCqbDateCell(row) {
  const ms = getCqbLogTimestampMs(row)
  if (!ms) return '—'
  return new Date(ms).toLocaleString('tr-TR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

/**
 * @param {Record<string, unknown>} row
 */
export function getCqbRoomTopology(row) {
  const label = invStr(row.roomTopology).trim()
  if (label) return label
  const key = invStr(row.roomTopologyKey).trim()
  const custom = invStr(row.customRoomTopology).trim()
  return resolveCqbSelectValue(key, custom)
}

/**
 * @param {Record<string, unknown>} row
 */
export function getCqbEntryMethod(row) {
  const label = invStr(row.entryMethod).trim()
  if (label) return label
  const key = invStr(row.entryMethodKey).trim()
  const custom = invStr(row.customEntryMethod).trim()
  return resolveCqbSelectValue(key, custom)
}

/**
 * @param {Record<string, unknown>} row
 */
export function getCqbBreachingType(row) {
  const label = invStr(row.breachingType).trim()
  if (label) return label
  const key = invStr(row.breachingTypeKey).trim()
  const custom = invStr(row.customBreachingType).trim()
  return resolveCqbSelectValue(key, custom)
}

/**
 * @param {Record<string, unknown>} row
 */
export function getCqbDoorState(row) {
  const label = invStr(row.doorState).trim()
  if (label) return label
  return resolveCqbSelectValue(invStr(row.doorStateKey))
}

/**
 * @param {Record<string, unknown>} row
 */
export function getCqbTeamSize(row) {
  return invStr(row.teamSize).trim() || '—'
}

/**
 * @param {Record<string, unknown>} row
 */
export function getCqbThreatNeutralized(row) {
  const threats = Math.max(0, Math.floor(invNum(row.threatCount)))
  const neutralized = Math.min(Math.max(0, Math.floor(invNum(row.neutralizedCount))), threats)
  return { threats, neutralized }
}

/**
 * @param {Record<string, unknown>} row
 */
export function formatCqbClearingTime(row) {
  const sec = invNum(row.clearingTimeSec)
  if (sec > 0) return `${sec.toFixed(2)}s`
  const label = invStr(row.clearingTime).trim()
  if (label) return label
  return '—'
}

/**
 * @param {Record<string, unknown>} row
 */
/**
 * @param {Record<string, unknown>} row
 */
export function getCqbTacticalErrorIds(row) {
  const ids = row.tacticalErrors
  if (!Array.isArray(ids)) return []
  return ids.map((id) => invStr(id).trim()).filter(Boolean)
}

/**
 * @param {Record<string, unknown>} row
 */
export function getCqbTacticalErrors(row) {
  const ids = getCqbTacticalErrorIds(row)
  if (ids.length) {
    return ids.map((id) => labelTacticalError(id)).filter(Boolean)
  }
  const labels = row.tacticalErrorsLabels
  if (Array.isArray(labels) && labels.length) {
    return labels.map((l) => invStr(l).trim()).filter(Boolean)
  }
  return []
}

/**
 * @param {Record<string, unknown>} row
 * @returns {{ phaseTitle: string; labels: string[] }[]}
 */
export function getCqbTacticalErrorsGrouped(row) {
  const ids = getCqbTacticalErrorIds(row)
  if (ids.length) return groupTacticalErrorsForDisplay(ids)
  const flat = getCqbTacticalErrors(row)
  if (!flat.length) return []
  return [{ phaseTitle: 'TAKTİK HATALAR', labels: flat }]
}

/**
 * @param {Record<string, unknown>} row
 */
export function countCqbTacticalErrors(row) {
  return getCqbTacticalErrorIds(row).length || getCqbTacticalErrors(row).length
}

/**
 * @param {Record<string, unknown>} row
 */
export function getCqbOperationNote(row) {
  return invStr(row.operationNote ?? row.notes).trim() || 'Operasyon notu kayıtlı değil.'
}

/**
 * @param {Record<string, unknown>[]} logs
 */
export function sortCqbLogsDesc(logs) {
  return [...logs].sort((a, b) => getCqbLogTimestampMs(b) - getCqbLogTimestampMs(a))
}

/**
 * @param {Record<string, unknown>[]} rangeLogs
 */
export function selectCqbLogs(rangeLogs) {
  return sortCqbLogsDesc(rangeLogs.filter(isCqbLog))
}

/** @typedef {'ALL' | string} TopologyFilter */

/**
 * @param {{
 *   logs: Record<string, unknown>[]
 *   roomTopologyKey: string
 *   entryMethodKey: string
 *   teamSize: string
 * }} filters
 */
export function filterCqbLogs({ logs, roomTopologyKey, entryMethodKey, teamSize }) {
  return logs.filter((row) => {
    if (roomTopologyKey !== 'ALL') {
      const key = invStr(row.roomTopologyKey || row.roomTopology).trim()
      const label = getCqbRoomTopology(row)
      if (key !== roomTopologyKey && label !== roomTopologyKey) return false
    }
    if (entryMethodKey !== 'ALL') {
      const key = invStr(row.entryMethodKey || row.entryMethod).trim()
      const label = getCqbEntryMethod(row)
      if (key !== entryMethodKey && label !== entryMethodKey) return false
    }
    if (teamSize !== 'ALL' && getCqbTeamSize(row) !== teamSize) return false
    return true
  })
}

/**
 * @param {Record<string, unknown>[]} logs
 */
export function extractCqbTopologyOptions(logs) {
  const set = new Map()
  for (const row of logs) {
    const label = getCqbRoomTopology(row)
    const key = invStr(row.roomTopologyKey).trim() || label
    if (label && label !== '—') set.set(key, label)
  }
  return Array.from(set.entries())
    .map(([key, label]) => ({ key, label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'tr'))
}

/**
 * @param {Record<string, unknown>[]} logs
 */
export function extractCqbEntryOptions(logs) {
  const set = new Map()
  for (const row of logs) {
    const label = getCqbEntryMethod(row)
    const key = invStr(row.entryMethodKey).trim() || label
    if (label && label !== '—') set.set(key, label)
  }
  return Array.from(set.entries())
    .map(([key, label]) => ({ key, label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'tr'))
}

/**
 * @param {Record<string, unknown>[]} logs
 */
export function extractCqbTeamSizeOptions(logs) {
  const set = new Set()
  for (const row of logs) {
    const t = getCqbTeamSize(row)
    if (t && t !== '—') set.add(t)
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'tr'))
}
