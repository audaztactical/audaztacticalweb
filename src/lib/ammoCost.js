import { findAmmoForWeapon, filterAmmoRows, getAmmoUnitPrice } from './ammoIlws'
import { invNum, invStr } from './inventoryIlws'

/** @param {Record<string, unknown>} log */
export function getLogAmmoQuantity(log) {
  return Math.max(
    0,
    Math.floor(invNum(log.totalRoundsFired ?? log.roundsTotal ?? log.engagementRounds ?? log.rounds))
  )
}

/**
 * @param {Record<string, unknown>} log
 * @param {Record<string, unknown>[]} inventory
 * @param {Record<string, unknown>[]} [weapons]
 */
export function resolveLogAmmoRow(log, inventory, weapons = []) {
  const ammoRows = filterAmmoRows(inventory)
  const ammoId = invStr(log.ammoInventoryId ?? log.ammoId).trim()
  if (ammoId) {
    return ammoRows.find((a) => String(a.id) === ammoId) ?? null
  }
  const weaponId = invStr(log.weaponInventoryId ?? log.weaponId).trim()
  if (!weaponId || !weapons.length) return null
  const weapon = weapons.find((w) => String(w.id) === weaponId)
  if (!weapon) return null
  return findAmmoForWeapon(ammoRows, weapon)
}

/** @param {number} quantity @param {number} unitPrice */
export function computeAmmoTotalCost(quantity, unitPrice) {
  if (quantity <= 0 || unitPrice <= 0) return 0
  return Math.round(quantity * unitPrice * 100) / 100
}

/**
 * @param {Record<string, unknown>} log
 * @param {Record<string, unknown>[]} [inventory]
 * @param {Record<string, unknown>[]} [weapons]
 * @returns {{ quantity: number, unitPrice: number, totalCost: number } | null}
 */
export function resolveLogAmmoCost(log, inventory = [], weapons = []) {
  const quantity = getLogAmmoQuantity(log)
  if (quantity <= 0) return null

  const storedTotal = log.totalCost ?? log.toplamMaliyet
  if (storedTotal != null && storedTotal !== '') {
    const totalCost = Math.round(invNum(storedTotal) * 100) / 100
    if (totalCost > 0) {
      const storedUnit = log.unitPrice ?? log.unit_price
      const unitPrice =
        storedUnit != null && storedUnit !== ''
          ? Math.round(invNum(storedUnit) * 100) / 100
          : Math.round((totalCost / quantity) * 100) / 100
      return { quantity, unitPrice, totalCost }
    }
  }

  if (!inventory.length) return null

  const ammo = resolveLogAmmoRow(log, inventory, weapons)
  if (!ammo) return null

  const unitPrice = getAmmoUnitPrice(ammo)
  if (unitPrice <= 0) return null

  return {
    quantity,
    unitPrice,
    totalCost: computeAmmoTotalCost(quantity, unitPrice),
  }
}

/** @param {number | null | undefined} amount */
export function formatAmmoCostTry(amount) {
  if (amount == null || !Number.isFinite(amount) || amount <= 0) return '—'
  return `${amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`
}

/**
 * @param {Record<string, unknown>} log
 * @param {Record<string, unknown>[]} [inventory]
 * @param {Record<string, unknown>[]} [weapons]
 */
export function formatLogAmmoCostLabel(log, inventory = [], weapons = []) {
  return formatAmmoCostTry(resolveLogAmmoCost(log, inventory, weapons)?.totalCost)
}
