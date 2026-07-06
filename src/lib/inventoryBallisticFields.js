import { invNum, invStr } from './inventoryIlws.js'
import { parseClickUnitSystem } from './clickUnitSystem.js'

/** @typedef {'weapon' | 'optic' | 'ammo'} InventoryBallisticKind */

export const WEAPON_BALLISTIC_FORM_EMPTY = {
  barrelLength: '',
  twistRate: '',
  muzzleVelocity: '',
  sightHeightDefault: '',
}

export const OPTIC_BALLISTIC_FORM_EMPTY = {
  clickUnitSystem: '',
  magnification: '',
  clickValueMoa: '',
  clickValueMrad: '',
  ffpSfp: '',
  reticleType: '',
}

export const AMMO_BALLISTIC_FORM_EMPTY = {
  bulletWeight: '',
  bulletDiameter: '',
  ballisticCoefficient: '',
  bcModel: '',
}

/**
 * @param {unknown} value
 * @returns {number | null}
 */
export function parseOptionalPositiveNumber(value) {
  if (value == null || value === '') return null
  const n = invNum(value)
  return Number.isFinite(n) && n > 0 ? n : null
}

/**
 * @param {unknown} value
 * @returns {'G1' | 'G7' | null}
 */
export function parseBcModel(value) {
  const raw = invStr(value).toUpperCase()
  return raw === 'G1' || raw === 'G7' ? raw : null
}

/**
 * @param {unknown} value
 * @returns {'FFP' | 'SFP' | null}
 */
export function parseFfpSfp(value) {
  const raw = invStr(value).toUpperCase()
  return raw === 'FFP' || raw === 'SFP' ? raw : null
}

/** @param {Record<string, unknown> | null | undefined} row */
export function weaponBallisticFormFromRow(row) {
  return {
    barrelLength: row?.barrelLength != null && row.barrelLength !== '' ? String(row.barrelLength) : '',
    twistRate: invStr(row?.twistRate).trim() || '',
    muzzleVelocity:
      row?.muzzleVelocity != null && row.muzzleVelocity !== '' ? String(row.muzzleVelocity) : '',
    sightHeightDefault:
      row?.sightHeightDefault != null && row.sightHeightDefault !== ''
        ? String(row.sightHeightDefault)
        : '',
  }
}

/** @param {Record<string, unknown>} form */
export function weaponBallisticPatchFromForm(form) {
  return {
    barrelLength: parseOptionalPositiveNumber(form.barrelLength),
    twistRate: invStr(form.twistRate).trim() || null,
    muzzleVelocity: parseOptionalPositiveNumber(form.muzzleVelocity),
    sightHeightDefault: parseOptionalPositiveNumber(form.sightHeightDefault),
  }
}

/** @param {Record<string, unknown> | null | undefined} row */
export function hasWeaponBallisticData(row) {
  return Boolean(
    (row?.barrelLength != null && row.barrelLength !== '') ||
      invStr(row?.twistRate).trim() ||
      (row?.muzzleVelocity != null && row.muzzleVelocity !== '') ||
      (row?.sightHeightDefault != null && row.sightHeightDefault !== ''),
  )
}

/** @param {Record<string, unknown> | null | undefined} row */
export function opticBallisticFormFromRow(row) {
  const ffp = invStr(row?.ffpSfp).toUpperCase()
  const unit = parseClickUnitSystem(row?.clickUnitSystem)
  return {
    clickUnitSystem: unit ?? '',
    magnification: invStr(row?.magnification).trim() || '',
    clickValueMoa:
      row?.clickValueMoa != null && row.clickValueMoa !== '' ? String(row.clickValueMoa) : '',
    clickValueMrad:
      row?.clickValueMrad != null && row.clickValueMrad !== '' ? String(row.clickValueMrad) : '',
    ffpSfp: ffp === 'FFP' || ffp === 'SFP' ? ffp : '',
    reticleType: invStr(row?.reticleType).trim() || '',
  }
}

/** @param {Record<string, unknown>} form */
export function opticBallisticPatchFromForm(form) {
  const unit = parseClickUnitSystem(form.clickUnitSystem)
  return {
    clickUnitSystem: unit,
    magnification: invStr(form.magnification).trim() || null,
    clickValueMoa:
      unit === 'MRAD' ? null : parseOptionalPositiveNumber(form.clickValueMoa),
    clickValueMrad:
      unit === 'MOA' ? null : parseOptionalPositiveNumber(form.clickValueMrad),
    ffpSfp: parseFfpSfp(form.ffpSfp),
    reticleType: invStr(form.reticleType).trim() || null,
  }
}

/** @param {Record<string, unknown> | null | undefined} row */
export function hasOpticBallisticData(row) {
  return Boolean(
    parseClickUnitSystem(row?.clickUnitSystem) ||
      invStr(row?.magnification).trim() ||
      (row?.clickValueMoa != null && row.clickValueMoa !== '') ||
      (row?.clickValueMrad != null && row.clickValueMrad !== '') ||
      parseFfpSfp(row?.ffpSfp) ||
      invStr(row?.reticleType).trim(),
  )
}

/** @param {Record<string, unknown> | null | undefined} row */
export function ammoBallisticFormFromRow(row) {
  const bc = parseBcModel(row?.bcModel ?? row?.ballisticType)
  return {
    bulletWeight:
      row?.bulletWeight != null && row.bulletWeight !== '' ? String(row.bulletWeight) : '',
    bulletDiameter:
      row?.bulletDiameter != null && row.bulletDiameter !== '' ? String(row.bulletDiameter) : '',
    ballisticCoefficient:
      row?.ballisticCoefficient != null && row.ballisticCoefficient !== ''
        ? String(row.ballisticCoefficient)
        : '',
    bcModel: bc ?? '',
  }
}

/** @param {Record<string, unknown>} form */
export function ammoBallisticPatchFromForm(form) {
  return {
    bulletWeight: parseOptionalPositiveNumber(form.bulletWeight),
    bulletDiameter: parseOptionalPositiveNumber(form.bulletDiameter),
    ballisticCoefficient: parseOptionalPositiveNumber(form.ballisticCoefficient),
    bcModel: parseBcModel(form.bcModel),
  }
}

/** @param {Record<string, unknown> | null | undefined} row */
export function hasAmmoBallisticData(row) {
  return Boolean(
    (row?.bulletWeight != null && row.bulletWeight !== '') ||
      (row?.bulletDiameter != null && row.bulletDiameter !== '') ||
      (row?.ballisticCoefficient != null && row.ballisticCoefficient !== '') ||
      parseBcModel(row?.bcModel ?? row?.ballisticType),
  )
}
