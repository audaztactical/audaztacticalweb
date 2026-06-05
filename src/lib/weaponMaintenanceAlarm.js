import { invStr } from './inventoryIlws'
import { getAttachedAccessoryId, weaponDisplayName } from './weaponIlws'

export const MAINTENANCE_ALERT_MESSAGE =
  'KRİTİK NAMLU BAKIMI GEREKLİ - ATIŞ SONRASI TEMİZLİK VE YİV-SET KONTROLÜ BEKLENİYOR'

/** @param {Record<string, unknown>} row */
export function isMaintenanceRequired(row) {
  return row.maintenance_required === true || row.maintenanceRequired === true
}

/**
 * @param {Record<string, unknown>} weapons
 */
export function filterWeaponsRequiringMaintenance(weapons) {
  return weapons.filter(isMaintenanceRequired)
}

/**
 * @param {Record<string, unknown>} weapon
 * @param {Record<string, unknown> | null} accessory
 */
export function buildAccessoriesAtShotSnapshot(weapon, accessory) {
  /** @type {{ role: string, name: string, active: boolean }[]} */
  const items = []

  if (accessory) {
    const kind = invStr(accessory.accessoryKind ?? 'OPTIK').toUpperCase()
    items.push({
      role: kind.includes('SUPPRESS') ? 'SUSTURUCU' : kind.includes('LASER') ? 'LAZER' : 'OPTIK',
      name: invStr(accessory.name).trim() || '—',
      active: true,
    })
  } else if (getAttachedAccessoryId(weapon)) {
    items.push({ role: 'AKSESUAR', name: 'Montajlı (kayıt anında)', active: true })
  } else {
    items.push({ role: 'YOK', name: 'Montajlı aksesuar yok', active: false })
  }

  return items
}

/**
 * @param {unknown} raw
 */
export function formatAccessoriesAtShotLines(raw) {
  if (Array.isArray(raw) && raw.length) {
    return raw.map((item) => {
      if (!item || typeof item !== 'object') return '—'
      const o = /** @type {Record<string, unknown>} */ (item)
      const active = o.active === true
      const role = invStr(o.role).trim() || 'AKS'
      const name = invStr(o.name).trim() || '—'
      return `${active ? '●' : '○'} ${role}: ${name}`
    })
  }
  return ['○ AKS: Kayıt anında veri yok']
}

/**
 * @param {Record<string, unknown>} row
 */
export function getLogYivConditionPercent(row) {
  if (row.yivConditionPercentAtShot != null) {
    return Math.min(100, Math.max(0, Math.round(Number(row.yivConditionPercentAtShot))))
  }
  if (row.barrelWearPercentAtShot != null) {
    return Math.max(0, 100 - Math.round(Number(row.barrelWearPercentAtShot)))
  }
  return null
}

/**
 * @param {Record<string, unknown>} row
 */
export function getLogBarrelWearPercent(row) {
  if (row.barrelWearPercentAtShot != null) {
    return Math.min(100, Math.max(0, Math.round(Number(row.barrelWearPercentAtShot))))
  }
  const yiv = getLogYivConditionPercent(row)
  if (yiv != null) return 100 - yiv
  return null
}

/** @param {string} weaponId @param {string} [iso] */
export function buildMaintenanceRequiredPatch(weaponId, iso) {
  const label = weaponId
  return {
    maintenance_required: true,
    maintenance_alarm_at: iso || new Date().toISOString(),
    auditLogCode: 'CEP_GNC',
    auditLogMsg: `ATIŞ_SONRASI_BAKIM_ALARMI · ${label}`,
  }
}

/** @param {Record<string, unknown>} weapon */
export function buildMaintenanceClearedPatch(weapon) {
  return {
    maintenance_required: false,
    maintenance_cleared_at: new Date().toISOString(),
    auditLogCode: 'CEP_GNC',
    auditLogMsg: `${weaponDisplayName(weapon)} · BAKIM_ONAYLANDI`,
  }
}
