import { normalizeCalibreKey } from './ammoIlws'
import { invNum, invStr } from './inventoryIlws'
import { filterIndividualTrainingRecords } from './trainingGroupFields'

/** @typedef {'ALL' | 'HANDGUN' | 'RIFLE'} WeaponTypeFilter */
/** @typedef {'ALL' | 'TIMED' | 'UNTIMED'} TimingFilter */

/**
 * @param {Record<string, unknown>} row
 */
export function isAtisShootingLog(row) {
  const cat = invStr(row.operationCategory).toLowerCase()
  const kind = invStr(row.kind).toUpperCase()
  if (cat === 'atis') return true
  if (kind === 'ATIS_DRILL') return true
  return false
}

/**
 * @param {Record<string, unknown>} row
 */
export function getAtisLogTimestampMs(row) {
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
export function getAtisWeaponTypeBucket(row) {
  const specs = row.weaponSpecs
  const tc =
    specs && typeof specs === 'object'
      ? invStr(/** @type {Record<string, unknown>} */ (specs).tacticalCategory).toUpperCase()
      : ''
  if (tc === 'T_TAB') return 'HANDGUN'
  if (tc === 'P_TFK' || tc === 'AV_TFK') return 'RIFLE'
  const wt = invStr(row.weaponType ?? (specs && typeof specs === 'object' ? /** @type {Record<string, unknown>} */ (specs).weaponType : '')).toLowerCase()
  if (wt.includes('tabanca') || wt === 't_tab' || wt === 'pistol') return 'HANDGUN'
  return 'RIFLE'
}

/**
 * @param {Record<string, unknown>} row
 */
export function getAtisCaliberLabel(row) {
  const specs = row.weaponSpecs
  if (specs && typeof specs === 'object') {
    const cal = invStr(/** @type {Record<string, unknown>} */ (specs).calibre).trim()
    if (cal) return cal
  }
  const ammo = invStr(row.ammoLabel).trim()
  if (ammo) {
    const m = ammo.match(/\]\s*(.+)$/)
    if (m) return m[1].trim()
  }
  return 'TANIMSIZ'
}

/**
 * @param {Record<string, unknown>} row
 */
export function getAtisCaliberKey(row) {
  return normalizeCalibreKey(getAtisCaliberLabel(row)) || 'unknown'
}

/**
 * @param {Record<string, unknown>} row
 */
export function getAtisDrillName(row) {
  return invStr(row.drillName ?? row.shootType).trim() || '—'
}

/**
 * @param {Record<string, unknown>} row
 */
export function isAtisTimed(row) {
  if (row.isTimed === false) return false
  if (row.isTimed === true) return true
  const note = invStr(row.timingNote)
  if (note.toLowerCase().includes('süresiz')) return false
  return true
}

/**
 * @param {Record<string, unknown>} row
 */
export function getAtisRoundsAndHits(row) {
  const totalRoundsFired = Math.max(
    0,
    Math.floor(invNum(row.totalRoundsFired ?? row.roundsTotal))
  )
  const totalHits = Math.max(0, Math.floor(invNum(row.totalHits ?? row.hits)))
  const hits = Math.min(totalHits, totalRoundsFired || totalHits)
  return { totalRoundsFired, totalHits: hits }
}

/**
 * @param {Record<string, unknown>} row
 */
export function getAtisAccuracyPercent(row) {
  const stored = invNum(row.accuracy)
  if (stored > 0 && stored <= 100) return Math.round(stored * 10) / 10
  const { totalRoundsFired, totalHits } = getAtisRoundsAndHits(row)
  if (totalRoundsFired <= 0) return 0
  return Math.round((totalHits / totalRoundsFired) * 1000) / 10
}

/**
 * @param {Record<string, unknown>} row
 */
export function getAtisShotDistribution(row) {
  const { totalRoundsFired, totalHits } = getAtisRoundsAndHits(row)
  const misses = Math.max(0, totalRoundsFired - totalHits)
  return {
    hits: totalHits,
    misses,
    total: totalRoundsFired,
    hitRatioPct: totalRoundsFired > 0 ? Math.round((totalHits / totalRoundsFired) * 1000) / 10 : 0,
  }
}

/**
 * @param {Record<string, unknown>} row
 */
export function formatAtisDurationCell(row) {
  if (!isAtisTimed(row)) return { label: 'SÜRESİZ', muted: true }
  const td = row.timingData
  if (td && typeof td === 'object') {
    const total = invNum(/** @type {Record<string, unknown>} */ (td).total)
    if (total > 0) return { label: `${total.toFixed(2)}s`, muted: false }
  }
  return { label: '—', muted: false }
}

/**
 * @param {Record<string, unknown>} row
 */
export function formatAtisDateCell(row) {
  const ms = getAtisLogTimestampMs(row)
  if (!ms) return '—'
  return new Date(ms).toLocaleString('tr-TR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

/**
 * @param {Record<string, unknown>} row
 */
export function getAtisDistanceM(row) {
  const d = Number(row.distance ?? row.distanceM)
  return Number.isFinite(d) ? d : 0
}

/**
 * @param {Record<string, unknown>} row
 */
export function getAtisWeaponLabel(row) {
  const label = invStr(row.weaponLabel).trim()
  if (label) return label
  const specs = row.weaponSpecs
  if (specs && typeof specs === 'object') {
    return invStr(/** @type {Record<string, unknown>} */ (specs).displayName).trim() || '—'
  }
  return '—'
}

/**
 * @param {Record<string, unknown>} row
 */
export function getAtisAmmoName(row) {
  const label = invStr(row.ammoLabel).trim()
  if (label) return label
  return '—'
}

/**
 * @param {Record<string, unknown>} row
 */
export function getAtisOperationNote(row) {
  const explicit = invStr(row.operationNote ?? row.notes ?? row.operation_note).trim()
  if (explicit) return explicit
  const parts = []
  if (invStr(row.timingNote).trim()) parts.push(invStr(row.timingNote))
  if (row.drillLevel != null && row.drillLevel !== '') parts.push(`SEVİYE ${row.drillLevel}`)
  const tags = row.tags
  if (Array.isArray(tags) && tags.length) {
    parts.push(tags.map((t) => (invStr(t).startsWith('#') ? invStr(t) : `#${invStr(t)}`)).join(' '))
  }
  return parts.length ? parts.join(' · ') : 'Operasyon notu kayıtlı değil.'
}

/**
 * @param {Record<string, unknown>} row
 */
export function getAtisTimingDetails(row) {
  if (!isAtisTimed(row)) return null
  const td = row.timingData
  if (!td || typeof td !== 'object') return null
  const o = /** @type {Record<string, unknown>} */ (td)
  const first = invNum(o.firstShot)
  const split = invNum(o.split)
  const total = invNum(o.total)
  return {
    firstShot: first > 0 ? `${first.toFixed(2)}s` : '—',
    split: split > 0 ? `${split.toFixed(2)}s` : '—',
    total: total > 0 ? `${total.toFixed(2)}s` : '—',
  }
}

/**
 * @param {Record<string, unknown>} row
 */
export function formatWeaponSpecsBlock(row) {
  const specs = row.weaponSpecs
  if (!specs || typeof specs !== 'object') return []
  const s = /** @type {Record<string, unknown>} */ (specs)
  const lines = []
  if (s.displayName) lines.push(`AD: ${invStr(s.displayName)}`)
  if (s.brand) lines.push(`MARKA: ${invStr(s.brand)}`)
  if (s.calibre) lines.push(`KALİBRE: ${invStr(s.calibre)}`)
  if (s.tacticalCategory) lines.push(`KOD: ${invStr(s.tacticalCategory)}`)
  if (s.opticLabel) lines.push(`OPTİK: ${invStr(s.opticLabel)}`)
  if (s.serialNo) lines.push(`SERİ: ${invStr(s.serialNo)}`)
  return lines
}

/**
 * @param {Record<string, unknown>[]} logs
 */
export function sortAtisLogsDesc(logs) {
  return [...logs].sort((a, b) => getAtisLogTimestampMs(b) - getAtisLogTimestampMs(a))
}

/**
 * @param {Record<string, unknown>[]} logs
 */
export function extractAtisCaliberOptions(logs) {
  const map = new Map()
  for (const row of logs) {
    const key = getAtisCaliberKey(row)
    const label = getAtisCaliberLabel(row)
    if (!map.has(key)) map.set(key, label)
  }
  return Array.from(map.entries())
    .map(([key, label]) => ({ key, label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'tr'))
}

/**
 * @param {Record<string, unknown>[]} logs
 */
export function extractAtisDrillOptions(logs) {
  const set = new Set()
  for (const row of logs) {
    const name = getAtisDrillName(row)
    if (name && name !== '—') set.add(name)
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'tr'))
}

/**
 * @param {{
 *   logs: Record<string, unknown>[]
 *   weaponType: WeaponTypeFilter
 *   caliberKey: string
 *   drillName: string
 *   timing: TimingFilter
 * }} filters
 */
export function filterAtisLogs({ logs, weaponType, caliberKey, drillName, timing }) {
  return logs.filter((row) => {
    if (weaponType !== 'ALL' && getAtisWeaponTypeBucket(row) !== weaponType) return false
    if (caliberKey !== 'ALL' && getAtisCaliberKey(row) !== caliberKey) return false
    if (drillName !== 'ALL' && getAtisDrillName(row) !== drillName) return false
    if (timing === 'TIMED' && !isAtisTimed(row)) return false
    if (timing === 'UNTIMED' && isAtisTimed(row)) return false
    return true
  })
}

/**
 * @param {{ weaponType?: string, caliberKey?: string, drillName?: string, timing?: string }} filters
 */
export function isAtisFilterActive(filters) {
  return (
    (filters.weaponType && filters.weaponType !== 'ALL') ||
    (filters.caliberKey && filters.caliberKey !== 'ALL') ||
    (filters.drillName && filters.drillName !== 'ALL') ||
    (filters.timing && filters.timing !== 'ALL')
  )
}

/**
 * @param {{ weaponType?: string, caliberKey?: string, drillName?: string, timing?: string }} filters
 */
export function formatAtisFilterSummary(filters) {
  const parts = []
  if (filters.weaponType && filters.weaponType !== 'ALL') {
    const map = { HANDGUN: 'Tabanca', RIFLE: 'Tüfek' }
    parts.push(`Silah: ${map[/** @type {keyof typeof map} */ (filters.weaponType)] ?? filters.weaponType}`)
  }
  if (filters.caliberKey && filters.caliberKey !== 'ALL') {
    parts.push(`Kalibre: ${filters.caliberKey}`)
  }
  if (filters.drillName && filters.drillName !== 'ALL') {
    parts.push(`Atış türü: ${filters.drillName}`)
  }
  if (filters.timing && filters.timing !== 'ALL') {
    parts.push(`Süre: ${filters.timing === 'TIMED' ? 'Süreli' : 'Süresiz'}`)
  }
  return parts.join(' · ')
}

/**
 * @param {Record<string, unknown>[]} rangeLogs
 */
export function selectAtisShootingLogs(rangeLogs) {
  return sortAtisLogsDesc(filterIndividualTrainingRecords(rangeLogs).filter(isAtisShootingLog))
}
