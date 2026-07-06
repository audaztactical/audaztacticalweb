import { getTacticalCategory, invNum, invStr, isWeaponCategory } from './inventoryIlws'

/** @typedef {{ date: string, rounds_at_maintenance: number, maintenanceType: string, note: string }} WeaponMaintenanceLogEntry */

export const MAINTENANCE_TYPES = [
  'Detaylı Temizlik & Yağlama',
  'Parça Değişimi',
  'Sıfırlama / Atış Kontrolü',
]

/** @typedef {'P_TFK' | 'T_TAB' | 'AV_TFK' | 'KNT'} WeaponTacticalCode */

export const WEAPON_TACTICAL_CODES = /** @type {WeaponTacticalCode[]} */ (
  ['P_TFK', 'T_TAB', 'AV_TFK', 'KNT']
)

/** Kullanıcıya görünen silah tipi seçenekleri (enum kodu yalnızca value'da). */
export const WEAPON_CATEGORY_OPTIONS = [
  { value: 'T_TAB', label: 'Taktik Tabanca' },
  { value: 'P_TFK', label: 'Piyade Tüfeği' },
  { value: 'AV_TFK', label: 'Av Tüfeği' },
  { value: 'KNT', label: 'Keskin Nişancı Tüfeği' },
]

/** @returns {string} */
export function todayIsoDate() {
  return new Date().toISOString().slice(0, 10)
}

/** @param {Record<string, unknown>} row @returns {string} YYYY-MM-DD veya — */
export function getWeaponCreatedAt(row) {
  const explicit = invStr(row.created_at)
  if (/^\d{4}-\d{2}-\d{2}$/.test(explicit)) return explicit
  const c = row.createdAt
  if (c && typeof c === 'object' && c !== null && 'toDate' in c && typeof c.toDate === 'function') {
    const d = c.toDate()
    if (d instanceof Date && !Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  }
  if (c && typeof c === 'object' && c !== null && 'toMillis' in c && typeof c.toMillis === 'function') {
    const d = new Date(c.toMillis())
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  }
  if (typeof c === 'string' && /^\d{4}-\d{2}-\d{2}/.test(c)) return c.slice(0, 10)
  return '—'
}

/** @param {string} tc @returns {WeaponTacticalCode} */
export function resolveWeaponTacticalCategory(tc) {
  const u = invStr(tc).toUpperCase()
  if (u === 'T_TAB' || u === 'AV_TFK' || u === 'P_TFK' || u === 'KNT') return u
  return 'T_TAB'
}

/** @param {WeaponTacticalCode | string} tc */
export function defaultMaxBarrelLifeForCategory(tc) {
  const cat = resolveWeaponTacticalCategory(tc)
  if (cat === 'T_TAB') return 15000
  if (cat === 'AV_TFK') return 30000
  if (cat === 'KNT') return 9000
  return 20000
}

/** @param {WeaponTacticalCode | string} tc */
export function weaponTypeFromCategory(tc) {
  const cat = resolveWeaponTacticalCategory(tc)
  if (cat === 'T_TAB') return 't_tab'
  if (cat === 'AV_TFK') return 'av_tfk'
  if (cat === 'KNT') return 'knt'
  return 'p_tfk'
}

/** @param {string | undefined} id */
export function weaponStokKodu(id) {
  const raw = (id || 'XXXX').replace(/-/g, '').slice(0, 4).toUpperCase()
  return `SK-TFK-${raw}`
}

/** @param {Record<string, unknown>} row */
export function getMaxBarrelLife(row) {
  const custom = invNum(row.max_barrel_life)
  if (custom > 0) return custom
  return defaultMaxBarrelLifeForCategory(getTacticalCategory(row))
}

/** @param {Record<string, unknown>} row */
export function getTotalRoundsFired(row) {
  if (row.total_rounds_fired != null) return Math.max(0, Math.floor(invNum(row.total_rounds_fired)))
  return Math.max(0, Math.floor(invNum(row.totalRoundsFired)))
}

/**
 * Manuel +/- ayarı; atış günlüğü toplamı ayrı eklenir.
 * @param {Record<string, unknown>} row
 * @param {Record<string, unknown>[]} [rangeLogs]
 */
export function getManualRoundsFired(row, rangeLogs = []) {
  if (row.manual_rounds_fired != null) return Math.max(0, Math.floor(invNum(row.manual_rounds_fired)))
  const stored = getTotalRoundsFired(row)
  if (!rangeLogs.length) return stored
  let fromLogs = 0
  const id = invStr(row.id)
  for (const log of rangeLogs) {
    if (invStr(log.weaponInventoryId) !== id) continue
    fromLogs += Math.max(0, Math.floor(invNum(log.roundsTotal)))
  }
  return Math.max(0, stored - fromLogs)
}

/**
 * @param {number} totalRounds
 * @param {number} maxBarrelLife
 */
export function calculateYivConditionPercent(totalRounds, maxBarrelLife) {
  if (maxBarrelLife <= 0) return 100
  const pct = 100 - (totalRounds / maxBarrelLife) * 100
  return Math.min(100, Math.max(0, Math.round(pct)))
}

/** @param {string} weaponId @param {Record<string, unknown>[]} rangeLogs */
export function sumRangeLogRoundsForWeapon(weaponId, rangeLogs) {
  const id = invStr(weaponId)
  if (!id) return 0
  let sum = 0
  for (const log of rangeLogs) {
    if (invStr(log.weaponInventoryId) !== id) continue
    sum += Math.max(0, Math.floor(invNum(log.roundsTotal)))
  }
  return sum
}

/**
 * @param {Record<string, unknown>} row
 * @param {Record<string, unknown>[]} [rangeLogs]
 */
export function getEffectiveTotalRoundsFired(row, rangeLogs = []) {
  if (!rangeLogs.length) return getTotalRoundsFired(row)
  return getManualRoundsFired(row, rangeLogs) + sumRangeLogRoundsForWeapon(String(row.id), rangeLogs)
}

/**
 * @param {Record<string, unknown>} row
 * @param {Record<string, unknown>[]} [rangeLogs]
 */
export function getYivConditionPercent(row, rangeLogs = []) {
  return calculateYivConditionPercent(getEffectiveTotalRoundsFired(row, rangeLogs), getMaxBarrelLife(row))
}

/** @param {Record<string, unknown>} row @returns {WeaponMaintenanceLogEntry[]} */
export function getWeaponMaintenanceLogs(row) {
  const raw = row.maintenance_logs ?? row.maintenanceLogEntries
  if (!Array.isArray(raw)) return []
  /** @type {WeaponMaintenanceLogEntry[]} */
  const logs = []
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue
    const o = /** @type {Record<string, unknown>} */ (entry)
    logs.push({
      date: invStr(o.date) || '—',
      rounds_at_maintenance: Math.max(0, Math.floor(invNum(o.rounds_at_maintenance ?? o.roundsAtMaintenance))),
      maintenanceType: invStr(o.maintenanceType ?? o.type ?? o.text) || 'Bakım',
      note: invStr(o.note) || '',
    })
  }
  return logs.sort((a, b) => {
    const ta = Date.parse(a.date) || 0
    const tb = Date.parse(b.date) || 0
    return tb - ta
  })
}

/**
 * @param {Record<string, unknown>} row
 * @param {Record<string, unknown>[]} [rangeLogs]
 */
export function getRoundsSinceLastMaintenance(row, rangeLogs = []) {
  const total = getEffectiveTotalRoundsFired(row, rangeLogs)
  const logs = getWeaponMaintenanceLogs(row)
  if (logs.length === 0) return total
  const latest = logs[0]
  return Math.max(0, total - latest.rounds_at_maintenance)
}

/** @param {Record<string, unknown>} row */
export function getAttachedAccessoryId(row) {
  return invStr(row.attached_accessory_id ?? row.attachedAccessoryId).trim() || null
}

/** @param {Record<string, unknown>} row — aksesuar montajına müsait silah (takılı aksesuar yok) */
export function isWeaponIdleForAccessoryMount(row) {
  if (getAttachedAccessoryId(row)) return false
  const status = invStr(row.operationalStatus).toUpperCase()
  if (status.includes('ÜZERİNDE') || status === 'MOUNTED') return false
  return true
}

/** @param {Record<string, unknown>} row */
export function isOpticIdle(row) {
  if (getTacticalCategory(row) !== 'OPT') return false
  if (invStr(row.mountedOnWeaponId).trim()) return false
  const status = invStr(row.operationalStatus).toUpperCase()
  if (status.includes('ÜZERİNDE') || status === 'MOUNTED') return false
  if (invStr(row.linkedWeaponName).trim()) return false
  if (invStr(row.attachmentLink).trim() === 'MOUNTED') return false
  return true
}

/** @param {number} percent @param {number} segments */
export function formatConditionBar(percent, segments = 10) {
  const filled = Math.round((percent / 100) * segments)
  const safe = Math.min(segments, Math.max(0, filled))
  return `${'█'.repeat(safe)}${'░'.repeat(segments - safe)}`
}

/** @param {Record<string, unknown>} row */
export function weaponDisplayName(row) {
  return invStr(row.name).trim() || 'İSİMSİZ_SİLAH'
}

/** @param {Record<string, unknown>} row */
export function normalizeWeaponNameForStatus(row) {
  return weaponDisplayName(row).replace(/\s+/g, ' ').toUpperCase()
}

/** @param {Record<string, unknown>[]} items */
export function filterWeaponRows(items) {
  return items.filter((row) => isWeaponCategory(row))
}

/** @param {Record<string, unknown>[]} items */
export function filterOpticRows(items) {
  return items.filter((row) => getTacticalCategory(row) === 'OPT')
}

/**
 * @param {Record<string, unknown>} weapon
 * @param {number} effectiveTotal
 */
export function buildWeaponRoundsFirestorePatch(weapon, effectiveTotal) {
  const total = Math.max(0, Math.floor(effectiveTotal))
  return {
    total_rounds_fired: total,
    conditionPercent: calculateYivConditionPercent(total, getMaxBarrelLife(weapon)),
  }
}
