import { buildDeploymentAuditPayload } from './armoryAuditTrail'
import { accessoryDisplayName } from './accessoryIlws'
import { invStr } from './inventoryIlws'
import { normalizeWeaponNameForStatus, weaponDisplayName } from './weaponIlws'

/**
 * @typedef {{
 *   inventoryUpdates: { docId: string, patch: Record<string, unknown> }[]
 *   auditEntries: Record<string, unknown>[]
 * }} DeploymentBatchPayload
 */

/**
 * @param {{
 *   commitDeploymentBatch: (ops: DeploymentBatchPayload) => Promise<unknown>
 *   accessory: Record<string, unknown>
 *   weapon: Record<string, unknown>
 *   logDate: string
 *   previousAccessoryOnWeapon?: Record<string, unknown> | null
 * }} p
 */
export async function syncMountAccessory({
  commitDeploymentBatch,
  accessory,
  weapon,
  logDate,
  previousAccessoryOnWeapon = null,
}) {
  const weaponId = String(weapon.id)
  const accessoryId = String(accessory.id)
  const weaponLabel = normalizeWeaponNameForStatus(weapon)
  const weaponName = weaponDisplayName(weapon)
  const accessoryName = accessoryDisplayName(accessory)
  const savedDate = invStr(logDate).slice(0, 10) || new Date().toISOString().slice(0, 10)

  /** @type {DeploymentBatchPayload} */
  const batch = { inventoryUpdates: [], auditEntries: [] }

  if (previousAccessoryOnWeapon?.id && String(previousAccessoryOnWeapon.id) !== accessoryId) {
    const prevId = String(previousAccessoryOnWeapon.id)
    const prevName = accessoryDisplayName(previousAccessoryOnWeapon)
    batch.inventoryUpdates.push(
      { docId: weaponId, patch: { attached_accessory_id: null } },
      {
        docId: prevId,
        patch: {
          operationalStatus: 'BOŞTA',
          linkedWeaponName: null,
          mountedOnWeaponId: null,
          attachmentLink: 'YOK',
          auditLogCode: 'CEP_GNC',
          auditLogMsg: `${prevName} · BOŞTA`,
        },
      }
    )
    batch.auditEntries.push(
      buildDeploymentAuditPayload({
        action_type: 'SÖKME',
        date: savedDate,
        accessory: previousAccessoryOnWeapon,
        weapon,
      })
    )
  }

  batch.inventoryUpdates.push(
    {
      docId: weaponId,
      patch: {
        attached_accessory_id: accessoryId,
        auditLogCode: 'CEP_GNC',
        auditLogMsg: `${weaponName} · AKSESUAR_MONTAJ`,
      },
    },
    {
      docId: accessoryId,
      patch: {
        operationalStatus: `${weaponLabel} ÜZERİNDE`,
        linkedWeaponName: weaponLabel,
        mountedOnWeaponId: weaponId,
        attachmentLink: 'MOUNTED',
        auditLogCode: 'CEP_GNC',
        auditLogMsg: `${accessoryName} · ${weaponLabel} ÜZERİNDE`,
      },
    }
  )
  batch.auditEntries.push(
    buildDeploymentAuditPayload({
      action_type: 'MONTAJ',
      date: savedDate,
      accessory,
      weapon,
    })
  )

  await commitDeploymentBatch(batch)
}

/**
 * @param {{
 *   commitDeploymentBatch: (ops: DeploymentBatchPayload) => Promise<unknown>
 *   accessory: Record<string, unknown>
 *   weapon: Record<string, unknown> | null
 *   logDate: string
 *   skipWeaponClear?: boolean
 *   skipAudit?: boolean
 * }} p
 */
export async function syncDetachAccessory({
  commitDeploymentBatch,
  accessory,
  weapon,
  logDate,
  skipWeaponClear = false,
  skipAudit = false,
}) {
  const accessoryId = String(accessory.id)
  const accessoryName = accessoryDisplayName(accessory)
  const weaponId = weapon?.id ? String(weapon.id) : invStr(accessory.mountedOnWeaponId) || null
  const savedDate = invStr(logDate).slice(0, 10) || new Date().toISOString().slice(0, 10)

  /** @type {DeploymentBatchPayload} */
  const batch = { inventoryUpdates: [], auditEntries: [] }

  if (weaponId && !skipWeaponClear) {
    batch.inventoryUpdates.push({
      docId: weaponId,
      patch: {
        attached_accessory_id: null,
        auditLogCode: 'CEP_GNC',
        auditLogMsg: weapon ? `${weaponDisplayName(weapon)} · AKSESUAR_SÖKÜLDÜ` : 'AKSESUAR_SÖKÜLDÜ',
      },
    })
  } else if (weaponId && skipWeaponClear) {
    batch.inventoryUpdates.push({
      docId: weaponId,
      patch: { attached_accessory_id: null },
    })
  }

  batch.inventoryUpdates.push({
    docId: accessoryId,
    patch: {
      operationalStatus: 'BOŞTA',
      linkedWeaponName: null,
      mountedOnWeaponId: null,
      attachmentLink: 'YOK',
      auditLogCode: 'CEP_GNC',
      auditLogMsg: `${accessoryName} · BOŞTA`,
    },
  })

  if (!skipAudit) {
    batch.auditEntries.push(
      buildDeploymentAuditPayload({
        action_type: 'SÖKME',
        date: savedDate,
        accessory,
        weapon,
      })
    )
  }

  await commitDeploymentBatch(batch)
}
