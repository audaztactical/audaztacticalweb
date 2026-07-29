import { getTacticalCategory, invStr } from './inventoryIlws'
import { labelTacticalCategory } from './armoryDisplayText'
import { weaponDisplayName, weaponTypeFromCategory } from './weaponIlws'

export const TIMER_ACTIVE_WEAPON_STORAGE_KEY = 'audaz.tactical-timer.active-weapon-id.v1'

/**
 * @typedef {Object} TimerActiveWeaponSnapshot
 * @property {string} id
 * @property {string} name
 * @property {string} brand
 * @property {string} serialNo
 * @property {string} calibre
 * @property {string} tacticalCategory
 * @property {string} weaponType
 * @property {string} categoryLabel
 */

/**
 * @returns {string}
 */
export function readStoredActiveWeaponId() {
  try {
    const v = localStorage.getItem(TIMER_ACTIVE_WEAPON_STORAGE_KEY)
    return v ? String(v) : ''
  } catch {
    return ''
  }
}

/**
 * @param {string} id
 */
export function writeStoredActiveWeaponId(id) {
  try {
    if (id) localStorage.setItem(TIMER_ACTIVE_WEAPON_STORAGE_KEY, id)
    else localStorage.removeItem(TIMER_ACTIVE_WEAPON_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

/**
 * @param {Record<string, unknown> | null | undefined} row
 * @returns {TimerActiveWeaponSnapshot | null}
 */
export function buildActiveWeaponSnapshot(row) {
  if (!row || typeof row !== 'object') return null
  const id = invStr(row.id).trim()
  if (!id) return null
  const tacticalCategory = getTacticalCategory(row)
  return {
    id,
    name: weaponDisplayName(row),
    brand: invStr(row.brand).trim(),
    serialNo: invStr(row.serialNo).trim() || invStr(row.serial).trim(),
    calibre: invStr(row.calibre).trim(),
    tacticalCategory,
    weaponType: weaponTypeFromCategory(tacticalCategory),
    categoryLabel: labelTacticalCategory(tacticalCategory),
  }
}

/**
 * @param {unknown} raw
 * @returns {TimerActiveWeaponSnapshot | null}
 */
export function normalizeActiveWeaponSnapshot(raw) {
  if (!raw || typeof raw !== 'object') return null
  const o = /** @type {Record<string, unknown>} */ (raw)
  const id = invStr(o.id).trim()
  if (!id) return null
  const tacticalCategory = invStr(o.tacticalCategory).toUpperCase() || 'T_TAB'
  return {
    id,
    name: invStr(o.name).trim() || '—',
    brand: invStr(o.brand).trim(),
    serialNo: invStr(o.serialNo).trim(),
    calibre: invStr(o.calibre).trim(),
    tacticalCategory,
    weaponType: invStr(o.weaponType).trim() || weaponTypeFromCategory(tacticalCategory),
    categoryLabel: invStr(o.categoryLabel).trim() || labelTacticalCategory(tacticalCategory),
  }
}

/**
 * Rapor / geçmiş tek satır özeti.
 * @param {TimerActiveWeaponSnapshot | null | undefined} snap
 * @returns {string}
 */
export function formatActiveWeaponSummary(snap) {
  if (!snap) return '—'
  const bits = [
    snap.name,
    snap.categoryLabel || snap.tacticalCategory,
    snap.brand || null,
    snap.serialNo ? `S/N ${snap.serialNo}` : null,
    snap.calibre || null,
  ].filter(Boolean)
  return bits.join(' · ')
}
