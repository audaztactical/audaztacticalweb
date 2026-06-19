import { getTacticalCategory, invNum, invStr } from './inventoryIlws'
import { formatConditionBar } from './weaponIlws'
import { todayIsoDate } from './weaponIlws'

/** @typedef {{ date: string, type: string, amount: number, note: string, rangeLogId?: string, balanceAfter?: number }} AmmoTransactionLogEntry */

export const AMMO_TX_TYPES = {
  SUPPLY: 'İKMAL',
  TRAINING: 'ANTRENMAN_HARCAMASI',
}

export const DEFAULT_CRITICAL_THRESHOLD = 500

/** @param {string | undefined} id */
export function ammoStokKodu(id) {
  const raw = (id || 'XXXX').replace(/-/g, '').slice(0, 4).toUpperCase()
  return `SK-MHM-${raw}`
}

/** @param {string} s */
export function normalizeCalibreKey(s) {
  return invStr(s)
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/×/g, 'x')
    .replace(/-/g, '')
}

/** @param {Record<string, unknown>} row */
export function getCaliberName(row) {
  const explicit = invStr(row.caliber_name).trim()
  if (explicit) return explicit
  const cal = invStr(row.calibre).trim()
  if (cal) return cal
  return invStr(row.name).trim() || 'TANIMSIZ_KALİBRE'
}

/** @param {Record<string, unknown>} row */
export function ammoDisplayLabel(row) {
  return `[${ammoStokKodu(String(row.id))}] ${getCaliberName(row)}`
}

/** @param {Record<string, unknown>} row */
export function getCurrentStock(row) {
  if (row.current_stock != null && row.current_stock !== '') return Math.max(0, Math.floor(invNum(row.current_stock)))
  return Math.max(0, Math.floor(invNum(row.quantity)))
}

/** @param {Record<string, unknown>} row */
export function getCriticalThreshold(row) {
  const t = invNum(row.critical_threshold)
  return t > 0 ? Math.floor(t) : DEFAULT_CRITICAL_THRESHOLD
}

/** @param {Record<string, unknown>} row */
export function getAmmoUnitPrice(row) {
  const price = invNum(row.unitPrice ?? row.unit_price ?? row.birimFiyat)
  if (!Number.isFinite(price) || price < 0) return 0
  return Math.round(price * 100) / 100
}

/** @param {number} stock @param {number} threshold */
export function getSafetyMarginPercent(stock, threshold) {
  const denom = threshold * 3
  if (denom <= 0) return 0
  return Math.min(100, Math.round((stock / denom) * 100))
}

/** @param {number} stock @param {number} threshold */
export function getSafetyMarginBar(stock, threshold) {
  return formatConditionBar(getSafetyMarginPercent(stock, threshold), 10)
}

/** @param {Record<string, unknown>} row */
export function isAmmoCritical(row) {
  return getCurrentStock(row) <= getCriticalThreshold(row)
}

/** @param {Record<string, unknown>} row @returns {AmmoTransactionLogEntry[]} */
export function getAmmoTransactionLogs(row) {
  const raw = row.ammo_transaction_logs ?? row.transaction_logs ?? row.ammoTransactionLogs
  if (!Array.isArray(raw)) return []
  /** @type {AmmoTransactionLogEntry[]} */
  const logs = []
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue
    const o = /** @type {Record<string, unknown>} */ (entry)
    /** @type {AmmoTransactionLogEntry} */
    const parsed = {
      date: invStr(o.date).slice(0, 10) || '—',
      type: invStr(o.type ?? o.transactionType).trim() || AMMO_TX_TYPES.SUPPLY,
      amount: Math.floor(invNum(o.amount ?? o.quantity ?? o.delta)),
      note: invStr(o.note ?? o.supplier ?? o.description).trim(),
    }
    const rangeLogId = invStr(o.rangeLogId).trim()
    if (rangeLogId) parsed.rangeLogId = rangeLogId
    if (o.balanceAfter != null) parsed.balanceAfter = Math.floor(invNum(o.balanceAfter))
    logs.push(parsed)
  }
  return logs.sort((a, b) => invStr(b.date).localeCompare(invStr(a.date)))
}

/** @param {Record<string, unknown>} row @param {string} rangeLogId */
export function hasProcessedRangeLog(row, rangeLogId) {
  if (!rangeLogId) return false
  return getAmmoTransactionLogs(row).some((t) => t.rangeLogId === rangeLogId)
}

/** @param {Record<string, unknown>[]} items */
export function filterAmmoRows(items) {
  return items.filter((row) => getTacticalCategory(row) === 'MHM')
}

/** @param {Record<string, unknown>[]} ammoRows @param {Record<string, unknown>} weapon */
export function findAmmoForWeapon(ammoRows, weapon) {
  const wKey = normalizeCalibreKey(weapon.calibre)
  if (!wKey) return null
  return (
    ammoRows.find((a) => {
      const k = normalizeCalibreKey(getCaliberName(a))
      const k2 = normalizeCalibreKey(a.calibre)
      return k === wKey || k2 === wKey
    }) ?? null
  )
}

/** @param {Record<string, unknown>} row */
export function getAmmoCreatedAt(row) {
  const c = row.created_at ?? row.createdAt
  if (typeof c === 'string' && c.trim()) return c.trim().slice(0, 10)
  if (c && typeof c === 'object' && typeof c.toMillis === 'function') {
    return new Date(c.toMillis()).toISOString().slice(0, 10)
  }
  return todayIsoDate()
}
