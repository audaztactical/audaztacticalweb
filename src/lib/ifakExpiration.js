/** @typedef {'OK' | 'WARNING' | 'CRITICAL_EXPIRED'} IfakExpiryStatus */

const MS_PER_DAY = 24 * 60 * 60 * 1000
export const IFAK_CRITICAL_WINDOW_DAYS = 30
export const IFAK_WARNING_WINDOW_DAYS = 90

/**
 * @param {Date} d
 */
function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/**
 * @param {unknown} iso
 * @returns {Date | null}
 */
export function parseIfakExpirationDate(iso) {
  const text = String(iso ?? '').trim().slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null
  const t = Date.parse(`${text}T12:00:00`)
  if (Number.isNaN(t)) return null
  return new Date(t)
}

/**
 * @param {unknown} expirationDate YYYY-MM-DD
 * @param {Date} [referenceDate]
 * @returns {IfakExpiryStatus}
 */
export function computeIfakExpiryStatus(expirationDate, referenceDate = new Date()) {
  const exp = parseIfakExpirationDate(expirationDate)
  if (!exp) return 'CRITICAL_EXPIRED'

  const ref = startOfDay(referenceDate)
  const expDay = startOfDay(exp)
  const daysLeft = Math.ceil((expDay.getTime() - ref.getTime()) / MS_PER_DAY)

  if (daysLeft <= IFAK_CRITICAL_WINDOW_DAYS) return 'CRITICAL_EXPIRED'
  if (daysLeft <= IFAK_WARNING_WINDOW_DAYS) return 'WARNING'
  return 'OK'
}

/**
 * @param {Record<string, unknown>} item
 * @param {Date} [referenceDate]
 */
export function enrichIfakInventoryItem(item, referenceDate = new Date()) {
  const expirationDate = String(item.expirationDate ?? item.expiryDate ?? '').trim()
  const status = computeIfakExpiryStatus(expirationDate, referenceDate)
  return {
    ...item,
    expirationDate,
    status,
  }
}

/**
 * @param {Record<string, unknown>[]} items
 * @param {Date} [referenceDate]
 */
export function scanIfakInventoryAlerts(items, referenceDate = new Date()) {
  const enriched = items.map((row) => enrichIfakInventoryItem(row, referenceDate))
  const criticalItems = enriched.filter((row) => row.status === 'CRITICAL_EXPIRED')
  return {
    items: enriched,
    criticalItems,
    criticalCount: criticalItems.length,
    hasCriticalExpiry: criticalItems.length > 0,
  }
}
