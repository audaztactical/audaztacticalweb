import i18n from '../i18n'
import {
  ACCESSORY_KINDS,
  ACCESSORY_MAINTENANCE_TYPES,
  getAccessoryMountStatusLabel,
  resolveAccessoryKind,
} from './accessoryIlws'
import { AMMO_TX_TYPES } from './ammoIlws'
import {
  ATTACHMENT_PRESETS,
  ILWS_FILTERS,
  TACTICAL_CATEGORIES,
  invStr,
  isWeaponTacticalCategoryId,
} from './inventoryIlws'
import { MAINTENANCE_TYPES, WEAPON_CATEGORY_OPTIONS } from './weaponIlws'

const NS = 'armory'

/** Stable TR values stored in Firestore — display via i18n. */
export const WEAPON_MAINTENANCE_TYPE_VALUES = [...MAINTENANCE_TYPES]

/** @type {Record<string, string>} */
const WEAPON_MAINT_VALUE_TO_ID = {
  'Detaylı Temizlik & Yağlama': 'detailedClean',
  'Parça Değişimi': 'partsReplace',
  'Sıfırlama / Atış Kontrolü': 'zeroingCheck',
}

/** @type {Record<string, string>} */
const ACCESSORY_MAINT_VALUE_TO_ID = {
  'Pil Değişimi (Battery Replacement)': 'battery',
  'Optik Cam Temizliği (Lens Cleaning)': 'lensClean',
  'Sıfırlama / Kalibrasyon Ayarı (Zeroing/Calibration)': 'zeroing',
  'Donanımsal Onarım / Tamir (Hardware Repair)': 'hardware',
}

/** @returns {'tr-TR' | 'en-US'} */
export function armoryLocale() {
  return i18n.language?.startsWith('tr') ? 'tr-TR' : 'en-US'
}

/**
 * @param {string} key
 * @param {Record<string, unknown>} [params]
 */
export function armoryT(key, params = {}) {
  return i18n.t(key, { ns: NS, ...params })
}

/** @param {string} id */
export function labelFilter(id) {
  const key = String(id ?? '').trim()
  if (!key) return armoryT('common.emDash')
  const tKey = `filters.${key}`
  const translated = armoryT(tKey)
  if (translated !== tKey) return translated
  const fallback = ILWS_FILTERS.find((f) => f.id === key)
  return fallback?.code ?? key
}

/** @param {string} id */
export function labelTacticalCategory(id) {
  const key = invStr(id).toUpperCase()
  if (!key) return armoryT('common.emDash')
  const tKey = `categories.${key}`
  const translated = armoryT(tKey)
  return translated === tKey ? key : translated
}

/** @returns {{ value: string, label: string }[]} */
export function tacticalCategoryOptions() {
  return TACTICAL_CATEGORIES.map((c) => ({
    value: c.value,
    label: labelTacticalCategory(c.value),
  }))
}

/** Weapon-only category options for create forms. */
/** @returns {{ value: string, label: string }[]} */
export function weaponCategoryOptions() {
  return WEAPON_CATEGORY_OPTIONS.map((c) => ({
    value: c.value,
    label: labelTacticalCategory(c.value),
  }))
}

/**
 * @param {string} status
 */
export function labelOperationalStatus(status) {
  const raw = invStr(status).trim()
  if (!raw) return armoryT('common.emDash')
  const upper = raw.toUpperCase()
  if (upper === 'BOŞTA' || upper === 'IDLE') return armoryT('status.BOŞTA')
  if (upper === 'AKTİF' || upper === 'ACTIVE') return armoryT('status.AKTİF')
  if (upper === 'BAKIMDA' || upper === 'IN MAINTENANCE') return armoryT('status.BAKIMDA')
  if (upper === 'GÖREV_DIŞI' || upper === 'OUT OF SERVICE') return armoryT('status.GÖREV_DIŞI')
  if (upper.includes('ÜZERİNDE') || upper.includes('MOUNTED ON')) {
    const weapon = raw
      .replace(/\s*ÜZERİNDE\s*$/i, '')
      .replace(/^MOUNTED ON\s+/i, '')
      .trim()
    return formatMountedStatus(weapon || raw)
  }
  if (upper.includes('ENSTALASYONA') || upper.includes('READY TO INSTALL')) {
    return formatIdleStatus()
  }
  const tKey = `status.${upper}`
  const translated = armoryT(tKey)
  return translated === tKey ? raw : translated
}

/** @param {string} kind */
export function labelAccessoryKind(kind) {
  const id = invStr(kind).toUpperCase() || 'OPTIK'
  const tKey = `accessoryKinds.${id}`
  const translated = armoryT(tKey)
  if (translated !== tKey) return translated
  const found = ACCESSORY_KINDS.find((k) => k.value === id)
  return found?.label ?? id
}

/** @returns {{ value: string, label: string }[]} */
export function accessoryKindOptions() {
  return ACCESSORY_KINDS.map((k) => ({
    value: k.value,
    label: labelAccessoryKind(k.value),
  }))
}

/** @param {string} kind */
export function labelAccessoryKindShort(kind) {
  const id = invStr(kind).toUpperCase() || 'OPTIK'
  const tKey = `accessoryKindShort.${id}`
  const translated = armoryT(tKey)
  return translated === tKey ? id : translated
}

/** @param {string} type — stored Turkish string or stable id */
export function labelWeaponMaintenanceType(type) {
  const raw = invStr(type).trim()
  if (!raw) return armoryT('common.emDash')
  const id = WEAPON_MAINT_VALUE_TO_ID[raw]
  if (id) {
    const byId = armoryT(`weaponMaintenanceTypes.${id}`)
    if (byId !== `weaponMaintenanceTypes.${id}`) return byId
  }
  const legacyKey = `weaponMaintenanceTypes.legacy.${raw}`
  const legacy = armoryT(legacyKey)
  if (legacy !== legacyKey) return legacy
  const byIdDirect = armoryT(`weaponMaintenanceTypes.${raw}`)
  if (byIdDirect !== `weaponMaintenanceTypes.${raw}`) return byIdDirect
  return raw
}

/**
 * Options keep Turkish Firestore values; labels are localized.
 * @returns {{ value: string, label: string }[]}
 */
export function weaponMaintenanceTypeOptions() {
  return WEAPON_MAINTENANCE_TYPE_VALUES.map((value) => ({
    value,
    label: labelWeaponMaintenanceType(value),
  }))
}

/** @param {string} type */
export function labelAccessoryMaintenanceType(type) {
  const raw = invStr(type).trim()
  if (!raw) return armoryT('common.emDash')
  const id = ACCESSORY_MAINT_VALUE_TO_ID[raw]
  if (id) {
    const byId = armoryT(`accessoryMaintenanceTypes.${id}`)
    if (byId !== `accessoryMaintenanceTypes.${id}`) return byId
  }
  const legacyKey = `accessoryMaintenanceTypes.legacy.${raw}`
  const legacy = armoryT(legacyKey)
  if (legacy !== legacyKey) return legacy
  return raw
}

/** @returns {{ value: string, label: string }[]} */
export function accessoryMaintenanceTypeOptions() {
  return ACCESSORY_MAINTENANCE_TYPES.map((value) => ({
    value,
    label: labelAccessoryMaintenanceType(value),
  }))
}

/** @param {string} type — İKMAL / ANTRENMAN_HARCAMASI or SUPPLY/TRAINING */
export function labelAmmoTxType(type) {
  const raw = invStr(type).trim()
  if (!raw) return armoryT('common.emDash')
  if (raw === AMMO_TX_TYPES.SUPPLY || raw === 'SUPPLY') return armoryT('ammoTx.İKMAL')
  if (raw === AMMO_TX_TYPES.TRAINING || raw === 'TRAINING') return armoryT('ammoTx.ANTRENMAN_HARCAMASI')
  const tKey = `ammoTx.${raw}`
  const translated = armoryT(tKey)
  return translated === tKey ? raw : translated
}

/** @returns {{ value: string, label: string }[]} */
export function ammoTxTypeOptions() {
  return [
    { value: AMMO_TX_TYPES.SUPPLY, label: labelAmmoTxType(AMMO_TX_TYPES.SUPPLY) },
    { value: AMMO_TX_TYPES.TRAINING, label: labelAmmoTxType(AMMO_TX_TYPES.TRAINING) },
  ]
}

/** @param {string} id */
export function labelAttachmentPreset(id) {
  const key = invStr(id).toUpperCase()
  if (!key) return armoryT('common.emDash')
  const tKey = `attachmentPresets.${key}`
  const translated = armoryT(tKey)
  return translated === tKey ? key : translated
}

/** @returns {{ value: string, label: string }[]} */
export function attachmentPresetOptions() {
  return ATTACHMENT_PRESETS.map((id) => ({
    value: id,
    label: labelAttachmentPreset(id),
  }))
}

/** @param {string} key — ETKİLİ_MENZİL etc. */
export function labelSpecKey(key) {
  const raw = invStr(key).trim()
  if (!raw) return armoryT('common.emDash')
  const tKey = `specs.${raw}`
  const translated = armoryT(tKey)
  return translated === tKey ? raw : translated
}

/** @param {string} text — BAKIM_KAYDI etc. */
export function labelMaintenanceLogText(text) {
  const raw = invStr(text).trim()
  if (!raw) return armoryT('common.emDash')
  const tKey = `maintenanceLog.${raw}`
  const translated = armoryT(tKey)
  if (translated !== tKey) return translated
  return labelWeaponMaintenanceType(raw)
}

/** @param {string} weaponName */
export function formatMountedStatus(weaponName) {
  const weapon = invStr(weaponName).replace(/\s+/g, ' ').trim().toUpperCase() || armoryT('common.emDash')
  return armoryT('status.mountedOn', { weapon })
}

export function formatIdleStatus() {
  return armoryT('status.idleReady')
}

export function unnamedWeapon() {
  return armoryT('fallbacks.unnamedWeapon')
}

export function unnamedAccessory() {
  return armoryT('fallbacks.unnamedAccessory')
}

export function undefinedCalibre() {
  return armoryT('fallbacks.undefinedCalibre')
}

export function techSummaryMissing() {
  return armoryT('fallbacks.techSummaryMissing')
}

export function deletedAccessory() {
  return armoryT('fallbacks.deletedAccessory')
}

export function deletedWeapon() {
  return armoryT('fallbacks.deletedWeapon')
}

/** @deprecated use deletedAccessory */
export function deletedAccessoryLabel() {
  return deletedAccessory()
}

/** @deprecated use deletedWeapon */
export function deletedWeaponLabel() {
  return deletedWeapon()
}

/**
 * Locale-aware mount status for accessory cards/detail.
 * @param {Record<string, unknown>} row
 * @param {Record<string, unknown> | null} [weapon]
 */
export function formatAccessoryMountStatus(row, weapon = null) {
  return labelOperationalStatus(getAccessoryMountStatusLabel(row, weapon))
}

/**
 * Locale-aware accessory kind short label from inventory row.
 * @param {Record<string, unknown>} row
 */
export function formatAccessoryTypeLabel(row) {
  return labelAccessoryKindShort(resolveAccessoryKind(invStr(row.accessoryKind)))
}

/**
 * Locale-aware weapon display name (user name preserved; empty → i18n fallback).
 * @param {Record<string, unknown>} row
 */
export function displayWeaponName(row) {
  return invStr(row.name).trim() || unnamedWeapon()
}

/**
 * Locale-aware accessory display name.
 * @param {Record<string, unknown>} row
 */
export function displayAccessoryName(row) {
  return invStr(row.name).trim() || unnamedAccessory()
}

/**
 * Locale-aware calibre display when empty.
 * @param {Record<string, unknown>} row
 */
export function displayCaliberName(row) {
  const explicit = invStr(row.caliber_name).trim()
  if (explicit) return explicit
  const cal = invStr(row.calibre).trim()
  if (cal) return cal
  const name = invStr(row.name).trim()
  return name || undefinedCalibre()
}

/**
 * Technical description with localized empty fallback.
 * @param {Record<string, unknown>} row
 */
export function displayTechnicalDescription(row) {
  const d = invStr(row.technicalDescription).trim()
  if (d) return d
  const parts = [invStr(row.brand), invStr(row.calibre)].filter(Boolean)
  if (parts.length) return parts.join(' · ')
  const notes = invStr(row.notes).trim()
  if (notes) return notes
  return techSummaryMissing()
}

/** @param {'MONTAJ' | 'SÖKME' | string} actionType */
export function labelAuditAction(actionType) {
  const u = invStr(actionType).toUpperCase()
  if (u === 'SÖKME' || u === 'DETACH') return armoryT('audit.actionSokme')
  return armoryT('audit.actionMontaj')
}

/** Filter chips for ILWS — id preserved, label from i18n. */
export function ilwsFilterOptions() {
  return ILWS_FILTERS.map((f) => ({
    id: f.id,
    code: labelFilter(f.id),
  }))
}

/** @param {string} tc */
export function isWeaponCategoryId(tc) {
  return isWeaponTacticalCategoryId(tc)
}
