import { invNum, invStr } from './inventoryIlws'
import { resolveFofSelectValue } from './fofOptions'

/**
 * @param {Record<string, unknown>} row
 */
export function isFofLog(row) {
  const cat = invStr(row.operationCategory).toLowerCase()
  const kind = invStr(row.kind).toUpperCase()
  if (cat === 'fof') return true
  if (kind === 'FOF_DRILL') return true
  return false
}

/**
 * @param {Record<string, unknown>} row
 */
export function getFofLogTimestampMs(row) {
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
export function formatFofDateCell(row) {
  const ms = getFofLogTimestampMs(row)
  if (!ms) return '—'
  return new Date(ms).toLocaleString('tr-TR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

/**
 * @param {Record<string, unknown>} row
 */
export function getFofScenarioType(row) {
  const label = invStr(row.scenarioType).trim()
  if (label) return label
  const key = invStr(row.scenarioTypeKey).trim()
  const custom = invStr(row.customScenarioType).trim()
  return resolveFofSelectValue(key, custom)
}

/**
 * @param {Record<string, unknown>} row
 */
export function getFofSimSystem(row) {
  const label = invStr(row.simSystem).trim()
  if (label) return label
  const key = invStr(row.simSystemKey).trim()
  const custom = invStr(row.customSimSystem).trim()
  return resolveFofSelectValue(key, custom)
}

/**
 * @param {Record<string, unknown>} row
 */
export function getFofOpforCount(row) {
  return Math.max(0, Math.floor(invNum(row.opforCount)))
}

/**
 * @param {Record<string, unknown>} row
 */
export function formatFofDuration(row) {
  const sec = invNum(row.scenarioDurationSec)
  if (sec > 0) return `${sec}s`
  const label = invStr(row.scenarioDuration).trim()
  return label || '—'
}

/**
 * @param {Record<string, unknown>} row
 */
export function formatFofCoverUtilization(row) {
  const pct = invNum(row.coverUtilizationPercent)
  if (pct >= 0 && Number.isFinite(pct)) return `${pct}%`
  const label = invStr(row.coverUtilizationLabel).trim()
  return label || '—'
}

/**
 * @param {Record<string, unknown>} row
 */
export function getFofHitsTaken(row) {
  return Math.max(0, Math.floor(invNum(row.hitsTaken)))
}

/**
 * @param {Record<string, unknown>} row
 */
export function getFofLethalHits(row) {
  return Math.max(0, Math.floor(invNum(row.lethalHitsDelivered)))
}

/**
 * @param {Record<string, unknown>} row
 */
export function getFofNonLethalHits(row) {
  return Math.max(0, Math.floor(invNum(row.nonLethalHitsDelivered)))
}

/**
 * @param {Record<string, unknown>} row
 */
export function formatFofTimeToFirstEngagement(row) {
  const sec = invNum(row.timeToFirstEngagementSec)
  if (sec > 0) return `${sec}s`
  const label = invStr(row.timeToFirstEngagement).trim()
  return label || '—'
}

/**
 * @param {Record<string, unknown>} row
 */
export function getFofFriendlyCasualties(row) {
  return Math.max(0, Math.floor(invNum(row.friendlyCasualties)))
}

/**
 * @param {Record<string, unknown>} row
 */
export function getFofBlueOnBlue(row) {
  return Boolean(row.blueOnBlue)
}

/**
 * @param {Record<string, unknown>} row
 */
export function getFofSelfTcccApplied(row) {
  return Boolean(row.selfTcccApplied)
}

/**
 * @param {Record<string, unknown>} row
 */
export function getFofOperationNote(row) {
  return invStr(row.operationNote ?? row.notes).trim() || 'Operasyon notu kayıtlı değil.'
}

/**
 * @param {Record<string, unknown>[]} logs
 */
export function sortFofLogsDesc(logs) {
  return [...logs].sort((a, b) => getFofLogTimestampMs(b) - getFofLogTimestampMs(a))
}

/**
 * @param {Record<string, unknown>[]} rangeLogs
 */
export function selectFofLogs(rangeLogs) {
  return sortFofLogsDesc(rangeLogs.filter(isFofLog))
}

/**
 * @param {{
 *   logs: Record<string, unknown>[]
 *   scenarioTypeKey: string
 *   simSystemKey: string
 * }} filters
 */
export function filterFofLogs({ logs, scenarioTypeKey, simSystemKey }) {
  return logs.filter((row) => {
    if (scenarioTypeKey !== 'ALL') {
      const key = invStr(row.scenarioTypeKey || row.scenarioType).trim()
      const label = getFofScenarioType(row)
      if (key !== scenarioTypeKey && label !== scenarioTypeKey) return false
    }
    if (simSystemKey !== 'ALL') {
      const key = invStr(row.simSystemKey || row.simSystem).trim()
      const label = getFofSimSystem(row)
      if (key !== simSystemKey && label !== simSystemKey) return false
    }
    return true
  })
}

/**
 * @param {Record<string, unknown>[]} logs
 */
export function extractFofScenarioOptions(logs) {
  const set = new Map()
  for (const row of logs) {
    const label = getFofScenarioType(row)
    const key = invStr(row.scenarioTypeKey).trim() || label
    if (label && label !== '—') set.set(key, label)
  }
  return Array.from(set.entries())
    .map(([key, label]) => ({ key, label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'tr'))
}

/**
 * @param {Record<string, unknown>[]} logs
 */
export function extractFofSimSystemOptions(logs) {
  const set = new Map()
  for (const row of logs) {
    const label = getFofSimSystem(row)
    const key = invStr(row.simSystemKey).trim() || label
    if (label && label !== '—') set.set(key, label)
  }
  return Array.from(set.entries())
    .map(([key, label]) => ({ key, label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'tr'))
}
