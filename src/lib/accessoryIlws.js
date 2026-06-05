import { getTacticalCategory, invStr } from './inventoryIlws'
import { getWeaponCreatedAt, weaponDisplayName } from './weaponIlws'

/** @typedef {'OPTIK' | 'LAZER' | 'FENER' | 'TUTAMAK_SUSTURUCU'} AccessoryKind */

export const ACCESSORY_KINDS = /** @type {{ value: AccessoryKind, label: string }[]} */ ([
  { value: 'OPTIK', label: 'OPTİK · Nişangah' },
  { value: 'LAZER', label: 'LAZER · İşaretleyici' },
  { value: 'FENER', label: 'FENER · Aydınlatma' },
  { value: 'TUTAMAK_SUSTURUCU', label: 'TUTAMAK / SUSTURUCU' },
])

/** @param {string} kind */
export function resolveAccessoryKind(kind) {
  const u = invStr(kind).toUpperCase()
  if (u === 'LAZER' || u === 'FENER' || u === 'TUTAMAK_SUSTURUCU' || u === 'OPTIK') return u
  return 'OPTIK'
}

/** @param {Record<string, unknown>} row */
export function localizedAccessoryTypeLabel(row) {
  const map = {
    OPTIK: 'Nişangah',
    LAZER: 'İşaretleyici',
    FENER: 'Aydınlatma',
    TUTAMAK_SUSTURUCU: 'Tutamak / Susturucu',
  }
  return map[resolveAccessoryKind(invStr(row.accessoryKind))] ?? 'Nişangah'
}

/** @param {string | undefined} id */
export function accessoryStokKodu(id) {
  const raw = (id || 'XXXX').replace(/-/g, '').slice(0, 4).toUpperCase()
  return `SK-OPT-${raw}`
}

/** @param {Record<string, unknown>} row */
export function accessoryDisplayName(row) {
  return invStr(row.name).trim() || 'İSİMSİZ_AKSESUAR'
}

/** @param {Record<string, unknown>[]} items */
export function filterAccessoryRows(items) {
  return items.filter((row) => getTacticalCategory(row) === 'OPT')
}

/** @param {Record<string, unknown>} row */
export function getMountedWeaponId(row) {
  return invStr(row.mountedOnWeaponId).trim() || null
}

/** @param {Record<string, unknown>} row */
export function isAccessoryMounted(row) {
  if (getMountedWeaponId(row)) return true
  const status = invStr(row.operationalStatus).toUpperCase()
  if (status.includes('ÜZERİNDE') || status === 'MOUNTED') return true
  if (invStr(row.linkedWeaponName).trim()) return true
  if (invStr(row.attachmentLink).trim() === 'MOUNTED') return true
  return false
}

/** @param {Record<string, unknown>} row */
export function isAccessoryIdle(row) {
  return getTacticalCategory(row) === 'OPT' && !isAccessoryMounted(row)
}

/** @param {Record<string, unknown>} row @param {Record<string, unknown> | null} [weapon] */
export function getAccessoryMountStatusLabel(row, weapon = null) {
  if (!isAccessoryMounted(row)) return 'BOŞTA · ENSTALASYONA HAZIR'
  if (weapon) return `${weaponDisplayName(weapon).replace(/\s+/g, ' ').toUpperCase()} ÜZERİNDE`
  const linked = invStr(row.linkedWeaponName).trim()
  if (linked) return `${linked} ÜZERİNDE`
  const status = invStr(row.operationalStatus).trim()
  if (status.includes('ÜZERİNDE')) return status
  return 'MOUNT_UNKNOWN'
}

/** @param {Record<string, unknown>} row */
export function getAccessoryCreatedAt(row) {
  return getWeaponCreatedAt(row)
}

/** @typedef {{ date: string, maintenanceType: string, note: string }} AccessoryMaintenanceLogEntry */

export const ACCESSORY_MAINTENANCE_TYPES = [
  'Pil Değişimi (Battery Replacement)',
  'Optik Cam Temizliği (Lens Cleaning)',
  'Sıfırlama / Kalibrasyon Ayarı (Zeroing/Calibration)',
  'Donanımsal Onarım / Tamir (Hardware Repair)',
]

/** @param {Record<string, unknown>} row @returns {AccessoryMaintenanceLogEntry[]} */
export function getAccessoryMaintenanceLogs(row) {
  const raw = row.maintenance_logs ?? row.maintenanceLogEntries
  if (!Array.isArray(raw)) return []
  /** @type {AccessoryMaintenanceLogEntry[]} */
  const logs = []
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue
    const o = /** @type {Record<string, unknown>} */ (entry)
    const type = invStr(o.maintenanceType ?? o.type ?? o.bakimTuru).trim()
    logs.push({
      date: invStr(o.date).slice(0, 10) || '—',
      maintenanceType: type || ACCESSORY_MAINTENANCE_TYPES[0],
      note: invStr(o.note ?? o.technicalNote ?? o.description).trim(),
    })
  }
  return logs.sort((a, b) => invStr(b.date).localeCompare(invStr(a.date)))
}
