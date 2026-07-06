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
