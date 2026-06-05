import { invNum, invStr } from './inventoryIlws'
import { computeIfakExpiryStatus } from './ifakExpiration'
import { TCCC_OPERATION_CATEGORY } from './tcccHealthConstants'

/**
 * @param {{
 *   userId: string
 *   itemName: string
 *   category: string
 *   quantity: string | number
 *   expirationDate: string
 * }} input
 */
export function buildIfakInventoryPayload({ userId, itemName, category, quantity, expirationDate }) {
  const exp = invStr(expirationDate).trim().slice(0, 10)
  const status = computeIfakExpiryStatus(exp)
  const qty = Math.max(0, Math.floor(invNum(quantity)))
  const name = invStr(itemName).trim()
  const cat = invStr(category).trim() || 'Other'

  return {
    userId,
    ownerId: userId,
    operationCategory: TCCC_OPERATION_CATEGORY,
    kind: 'IFAK_INVENTORY_ITEM',
    itemName: name,
    name,
    category: cat,
    quantity: qty,
    expirationDate: exp,
    status,
    timestamp: new Date().toISOString(),
  }
}
