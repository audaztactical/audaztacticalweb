import { parseBcModel, parseFfpSfp } from './inventoryBallisticFields.js'
import { parseClickUnitSystem } from './clickUnitSystem.js'
import { invNum, invStr } from './inventoryIlws.js'

/** @typedef {'weapon' | 'optic' | 'ammo'} InventoryLockGroup */

/**
 * @typedef {Object} InventoryFillLockState
 * @property {boolean} active — Silahtan Doldur kullanıldı mı
 * @property {Record<string, boolean>} weapon
 * @property {Record<string, boolean>} optic
 * @property {Record<string, boolean>} ammo
 * @property {Record<InventoryLockGroup, boolean>} unlocked
 * @property {Record<string, boolean>} overridden — örn. 'ammo.bulletWeight'
 */

export const INVENTORY_UNLOCK_WARNING =
  "Bu veriler Cephanelik'ten otomatik alındı. Değiştirirseniz bu profildeki değerler artık envanterdeki kayıtla senkron olmayacak, elle güncellemeniz gerekecek. Devam etmek istiyor musunuz?"

/** Form alan adları — kilit map anahtarları ile birebir aynı olmalı */
export const INVENTORY_LOCK_FIELD_KEYS = {
  ammo: ['bulletWeight', 'bulletDiameter', 'muzzleVelocity', 'ballisticCoefficient', 'bcModel'],
  weapon: ['barrelLength', 'twistRate', 'sightHeight'],
  optic: [
    'clickUnitSystem',
    'magnification',
    'reticleType',
    'clickValueMoa',
    'clickValueMrad',
    'ffpSfp',
  ],
}

export const EMPTY_INVENTORY_FILL_LOCKS = /** @type {InventoryFillLockState} */ ({
  active: false,
  weapon: {},
  optic: {},
  ammo: {},
  unlocked: { weapon: false, optic: false, ammo: false },
  overridden: {},
})

/**
 * Cephanelik çözümlemesinden kilit state — draft ile aynı kaynak satırları kullanılmalı.
 * @param {Record<string, unknown> | null | undefined} weapon
 * @param {Record<string, unknown> | null | undefined} resolvedOptic
 * @param {Record<string, unknown> | null | undefined} resolvedAmmo
 * @returns {InventoryFillLockState}
 */
export function buildInventoryFillLocksFromResolution(weapon, resolvedOptic, resolvedAmmo) {
  if (!weapon) return { ...EMPTY_INVENTORY_FILL_LOCKS, overridden: {} }

  /** @type {InventoryFillLockState} */
  const locks = {
    active: true,
    weapon: {},
    optic: {},
    ammo: {},
    unlocked: { weapon: false, optic: false, ammo: false },
    overridden: {},
  }

  if (weapon.barrelLength != null && weapon.barrelLength !== '') locks.weapon.barrelLength = true
  if (invStr(weapon.twistRate).trim() || invStr(weapon.b_twt).trim()) locks.weapon.twistRate = true
  if (weapon.sightHeightDefault != null && invNum(weapon.sightHeightDefault) > 0) {
    locks.weapon.sightHeight = true
  }

  if (resolvedOptic) {
    if (parseClickUnitSystem(resolvedOptic.clickUnitSystem)) locks.optic.clickUnitSystem = true
    if (invStr(resolvedOptic.magnification).trim()) locks.optic.magnification = true
    if (invStr(resolvedOptic.reticleType ?? resolvedOptic.reticle).trim()) {
      locks.optic.reticleType = true
    }
    if (parseFfpSfp(resolvedOptic.ffpSfp)) locks.optic.ffpSfp = true
    if (resolvedOptic.clickValueMoa != null && invNum(resolvedOptic.clickValueMoa) > 0) {
      locks.optic.clickValueMoa = true
    }
    if (resolvedOptic.clickValueMrad != null && invNum(resolvedOptic.clickValueMrad) > 0) {
      locks.optic.clickValueMrad = true
    }
  }

  if (resolvedAmmo) {
    if (resolvedAmmo.bulletWeight != null && invNum(resolvedAmmo.bulletWeight) > 0) {
      locks.ammo.bulletWeight = true
    }
    if (resolvedAmmo.bulletDiameter != null && invNum(resolvedAmmo.bulletDiameter) > 0) {
      locks.ammo.bulletDiameter = true
    }
    if (resolvedAmmo.muzzleVelocity != null && invNum(resolvedAmmo.muzzleVelocity) > 0) {
      locks.ammo.muzzleVelocity = true
    }
    if (resolvedAmmo.ballisticCoefficient != null && invNum(resolvedAmmo.ballisticCoefficient) > 0) {
      locks.ammo.ballisticCoefficient = true
    }
    if (parseBcModel(resolvedAmmo.bcModel ?? resolvedAmmo.ballisticType)) {
      locks.ammo.bcModel = true
    }
  }

  return locks
}

/**
 * Nested lock state → düz path map ('ammo.bulletWeight' → true)
 * @param {InventoryFillLockState} locks
 * @returns {Record<string, boolean>}
 */
export function flattenInventoryLockFields(locks) {
  /** @type {Record<string, boolean>} */
  const flat = {}
  if (!locks?.active) return flat

  for (const [group, fields] of /** @type {const} */ ([
    ['ammo', locks.ammo],
    ['weapon', locks.weapon],
    ['optic', locks.optic],
  ])) {
    for (const [field, on] of Object.entries(fields ?? {})) {
      if (on) flat[`${group}.${field}`] = true
    }
  }
  return flat
}

/**
 * @typedef {Object} ArmorySessionState
 * @property {number} revision
 * @property {Record<string, boolean>} lockedFields — 'ammo.bulletWeight'
 * @property {Record<InventoryLockGroup, boolean>} unlocked
 * @property {Record<string, boolean>} overridden
 */

export const EMPTY_ARMORY_SESSION = /** @type {ArmorySessionState | null} */ (null)

/**
 * Silahtan Doldur sonrası form ile birlikte taşınan kilit oturumu (ayrı state senkron kaybını önler).
 * @param {InventoryFillLockState} locks
 * @param {number} revision
 * @returns {ArmorySessionState}
 */
export function buildArmorySessionFromLocks(locks, revision) {
  return {
    revision,
    lockedFields: flattenInventoryLockFields(locks),
    unlocked: { ...(locks.unlocked ?? { weapon: false, optic: false, ammo: false }) },
    overridden: { ...(locks.overridden ?? {}) },
  }
}

/**
 * Envanter çözümlemesi + form draft — kilit map'i birleştirir (alan adı kaçaklarını kapatır).
 * @param {Record<string, unknown>} draft
 * @param {InventoryFillLockState} locks
 * @param {number} revision
 * @returns {ArmorySessionState}
 */
export function buildArmorySessionFromArmoryFill(draft, locks, revision) {
  /** @type {Record<string, boolean>} */
  const lockedFields = { ...flattenInventoryLockFields(locks) }

  if (draft?.linkedWeaponId) {
    const weapon = /** @type {Record<string, unknown>} */ (draft.weapon ?? {})
    if (weapon.barrelLength != null && weapon.barrelLength !== '') lockedFields['weapon.barrelLength'] = true
    if (invStr(weapon.twistRate).trim()) lockedFields['weapon.twistRate'] = true
    if (Number(weapon.sightHeight) > 0 && Number(weapon.sightHeight) !== 5) {
      lockedFields['weapon.sightHeight'] = true
    }
  }

  if (draft?.linkedAmmoId) {
    const ammo = /** @type {Record<string, unknown>} */ (draft.ammo ?? {})
    if (Number(ammo.bulletWeight) > 0) lockedFields['ammo.bulletWeight'] = true
    if (Number(ammo.bulletDiameter) > 0) lockedFields['ammo.bulletDiameter'] = true
    if (Number(ammo.muzzleVelocity) > 0) lockedFields['ammo.muzzleVelocity'] = true
    if (Number(ammo.ballisticCoefficient) > 0) lockedFields['ammo.ballisticCoefficient'] = true
    if (parseBcModel(ammo.bcModel)) lockedFields['ammo.bcModel'] = true
  }

  if (draft?.linkedOpticId) {
    const optic = /** @type {Record<string, unknown>} */ (draft.optic ?? {})
    if (parseClickUnitSystem(optic.clickUnitSystem)) lockedFields['optic.clickUnitSystem'] = true
    if (invStr(optic.magnification).trim()) lockedFields['optic.magnification'] = true
    if (invStr(optic.reticleType).trim()) lockedFields['optic.reticleType'] = true
    if (parseFfpSfp(optic.ffpSfp)) lockedFields['optic.ffpSfp'] = true
    if (Number(optic.clickValueMoa) > 0) lockedFields['optic.clickValueMoa'] = true
    if (Number(optic.clickValueMrad) > 0) lockedFields['optic.clickValueMrad'] = true
  }

  return {
    revision,
    lockedFields,
    unlocked: { ...(locks.unlocked ?? { weapon: false, optic: false, ammo: false }) },
    overridden: { ...(locks.overridden ?? {}) },
  }
}

/**
 * @param {ArmorySessionState | null | undefined} session
 * @param {InventoryLockGroup} group
 * @param {string} field
 */
export function isArmorySessionFieldLocked(session, group, field) {
  if (!session?.lockedFields) return false
  if (session.unlocked?.[group]) return false
  return Boolean(session.lockedFields[`${group}.${field}`])
}

/**
 * @param {ArmorySessionState | null | undefined} session
 * @param {InventoryLockGroup} group
 */
export function armorySessionGroupHasLocks(session, group) {
  if (!session?.lockedFields) return false
  const prefix = `${group}.`
  return Object.keys(session.lockedFields).some((k) => k.startsWith(prefix))
}

/**
 * @param {ArmorySessionState | null | undefined} session
 * @param {InventoryLockGroup} group
 * @param {string} field
 */
export function isArmorySessionFieldOverridden(session, group, field) {
  return Boolean(session?.overridden?.[`${group}.${field}`])
}

/**
 * @param {InventoryFillLockState | null | undefined} locks
 * @param {InventoryLockGroup} group
 * @param {string} field
 */
export function isFieldInventoryLocked(locks, group, field) {
  if (!locks?.active) return false
  if (locks.unlocked?.[group]) return false
  return Boolean(locks[group]?.[field])
}

/**
 * @param {InventoryFillLockState | null | undefined} locks
 * @param {InventoryLockGroup} group
 */
export function sectionHasInventoryLocks(locks, group) {
  if (!locks?.active) return false
  return Object.keys(locks[group] ?? {}).length > 0
}

/**
 * @param {InventoryFillLockState | null | undefined} locks
 * @param {InventoryLockGroup} group
 * @param {string} field
 */
export function isFieldInventoryOverridden(locks, group, field) {
  return Boolean(locks?.overridden?.[`${group}.${field}`])
}
