import { accessoryDisplayName, accessoryStokKodu } from './accessoryIlws'
import { deletedAccessory, deletedWeapon, labelAuditAction } from './armoryDisplayText'
import { invStr } from './inventoryIlws'
import { weaponDisplayName, weaponStokKodu } from './weaponIlws'

/** @typedef {'MONTAJ' | 'SÖKME'} DeploymentActionType */

/**
 * @param {{
 *   action_type: DeploymentActionType
 *   date: string
 *   accessory: Record<string, unknown>
 *   weapon: Record<string, unknown> | null
 * }} p
 */
export function buildDeploymentAuditPayload({ action_type, date, accessory, weapon }) {
  const accessoryId = String(accessory.id ?? '')
  const weaponId = weapon?.id ? String(weapon.id) : null
  const delWpn = deletedWeapon()
  return {
    eventType: 'ACCESSORY_DEPLOYMENT',
    action_type,
    date: invStr(date).slice(0, 10) || new Date().toISOString().slice(0, 10),
    accessoryId,
    accessoryNameSnapshot: accessoryDisplayName(accessory),
    accessoryStockCodeSnapshot: accessoryStokKodu(accessoryId),
    weaponId,
    weaponNameSnapshot: weapon ? weaponDisplayName(weapon) : delWpn,
    weaponStockCodeSnapshot: weapon ? weaponStokKodu(weaponId) : '—',
    target_weapon: weapon
      ? `${weaponDisplayName(weapon)} [${weaponStokKodu(weaponId)}]`
      : delWpn,
  }
}

/**
 * @param {Record<string, unknown>} entry
 * @param {Record<string, unknown>[]} [weapons]
 * @param {Record<string, unknown>[]} [accessories]
 */
export function resolveAuditEntryDisplay(entry, weapons = [], accessories = []) {
  const accessoryId = invStr(entry.accessoryId)
  const weaponId = invStr(entry.weaponId)
  const liveAccessory = accessories.find((a) => String(a.id) === accessoryId)
  const liveWeapon = weapons.find((w) => String(w.id) === weaponId)

  const delAcc = deletedAccessory()
  const delWpn = deletedWeapon()

  const accessoryLabel =
    invStr(entry.accessoryNameSnapshot).trim() ||
    (liveAccessory ? accessoryDisplayName(liveAccessory) : delAcc)
  const accessoryCode =
    invStr(entry.accessoryStockCodeSnapshot).trim() ||
    (liveAccessory ? accessoryStokKodu(String(liveAccessory.id)) : '—')

  const weaponLabel =
    invStr(entry.weaponNameSnapshot).trim() ||
    (liveWeapon ? weaponDisplayName(liveWeapon) : delWpn)
  const weaponCode =
    invStr(entry.weaponStockCodeSnapshot).trim() ||
    (liveWeapon ? weaponStokKodu(String(liveWeapon.id)) : '—')

  const target =
    invStr(entry.target_weapon).trim() ||
    (weaponLabel !== delWpn ? `${weaponLabel} [${weaponCode}]` : delWpn)

  const actionId = invStr(entry.action_type).toUpperCase() === 'SÖKME' ? 'SÖKME' : 'MONTAJ'

  return {
    date: invStr(entry.date).slice(0, 10) || '—',
    action_type: actionId,
    action_label: labelAuditAction(actionId),
    target_weapon: target,
    accessoryLabel,
    accessoryCode,
    weaponLabel,
    weaponCode,
  }
}

/** @param {unknown} ts */
function auditEntryMillis(ts) {
  if (ts && typeof ts === 'object' && ts !== null && 'toMillis' in ts && typeof ts.toMillis === 'function') {
    return ts.toMillis()
  }
  return 0
}

/**
 * @param {Record<string, unknown>[]} entries
 * @param {string} accessoryId
 */
export function filterAuditForAccessory(entries, accessoryId) {
  const id = invStr(accessoryId)
  if (!id) return []
  return entries
    .filter((e) => invStr(e.accessoryId) === id)
    .sort((a, b) => {
      const byDate = invStr(b.date).localeCompare(invStr(a.date))
      if (byDate !== 0) return byDate
      return auditEntryMillis(b.createdAt) - auditEntryMillis(a.createdAt)
    })
}
