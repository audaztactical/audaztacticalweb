/**
 * Balistik profil ↔ Cephanelik envanter köprüsü ve calculateBallistics giriş dönüşümü.
 * @module ballisticProfileBridge
 */

import { calculateBallistics } from './ballisticsEngine.js'
import { ammoDisplayLabel, filterAmmoRows, findAmmoForWeapon } from './ammoIlws.js'
import { accessoryDisplayName, getMountedWeaponId, resolveAccessoryKind } from './accessoryIlws.js'
import { invNum, invStr } from './inventoryIlws.js'
import { parseBcModel, parseFfpSfp } from './inventoryBallisticFields.js'
import { parseClickUnitSystem } from './clickUnitSystem.js'
import { filterWeaponRows, weaponDisplayName } from './weaponIlws.js'
import { buildInventoryFillLocksFromResolution } from './inventoryFillLocks.js'

/** @typedef {import('./schema.js').BallisticProfileDocument} BallisticProfileDocument */

/**
 * @typedef {Object} BallisticEnvironmentOverrides
 * @property {number} [temperatureC]
 * @property {number} [pressureHpa]
 * @property {number} [humidityPercent]
 * @property {number} [altitudeM]
 * @property {'station'|'sea-level'} [pressureType]
 * @property {number} [windSpeed]
 * @property {'fps'|'mps'|'mph'} [windSpeedUnit]
 * @property {number} [windAngleDegrees]
 * @property {number} [shootingAngle]
 * @property {'meter'|'yard'} [targetUnit]
 * @property {'ftlb'|'joule'} [energyUnit]
 * @property {number} [timeStep]
 */

/**
 * @typedef {Object} BallisticInventoryBundle
 * @property {Record<string, unknown>[]} [weapons]
 * @property {Record<string, unknown>[]} [optics]
 * @property {Record<string, unknown>[]} [ammo]
 * @property {Record<string, unknown>[]} [allItems]
 */

/**
 * @returns {Omit<BallisticProfileDocument, 'profileName'|'ownerId'|'createdAt'|'updatedAt'|'status'>}
 */
export function createDefaultBallisticProfileFields() {
  return {
    linkedWeaponId: null,
    linkedOpticId: null,
    linkedAmmoId: null,
    weapon: {
      barrelLength: null,
      twistRate: null,
      sightHeight: 5,
      zeroDistance: 100,
    },
    optic: {
      clickUnitSystem: null,
      magnification: null,
      clickValueMoa: null,
      clickValueMrad: null,
      ffpSfp: null,
      reticleType: null,
    },
    ammo: {
      bulletWeight: 0,
      bulletDiameter: 0,
      muzzleVelocity: 0,
      ballisticCoefficient: 0,
      bcModel: 'G7',
    },
    advanced: {
      coriolisEnabled: false,
      latitude: null,
      azimuthDegrees: null,
      pressureType: 'station',
    },
  }
}

/**
 * @param {string} uid
 * @returns {Promise<Record<string, unknown>[]>}
 */
export async function fetchInventoryItems(uid) {
  if (!uid) return []
  const [{ isFirebaseConfigured }, { getDocs, orderBy, query }, { audazCollectionRef }] =
    await Promise.all([
      import('./firebase.js'),
      import('firebase/firestore'),
      import('./dataManager.js'),
    ])
  if (!isFirebaseConfigured()) return []
  const ref = audazCollectionRef('inventory', uid)
  const snap = await getDocs(query(ref, orderBy('updatedAt', 'desc')))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

/** @param {Record<string, unknown>[]} items */
export function filterInventoryWeapons(items) {
  return filterWeaponRows(items)
}

/** @param {Record<string, unknown>[]} items */
export function filterInventoryOptics(items) {
  return items.filter(
    (row) =>
      invStr(row.tacticalCategory).toUpperCase() === 'OPT' &&
      resolveAccessoryKind(row.accessoryKind) === 'OPTIK',
  )
}

/** @param {Record<string, unknown>[]} items */
export function filterInventoryAmmo(items) {
  return filterAmmoRows(items)
}

/**
 * @param {string} uid
 * @param {Record<string, unknown>[] | undefined} [prefetchedItems]
 */
export async function getInventoryWeapons(uid, prefetchedItems) {
  const items = prefetchedItems ?? (await fetchInventoryItems(uid))
  return filterInventoryWeapons(items)
}

/**
 * @param {string} uid
 * @param {Record<string, unknown>[] | undefined} [prefetchedItems]
 */
export async function getInventoryOptics(uid, prefetchedItems) {
  const items = prefetchedItems ?? (await fetchInventoryItems(uid))
  return filterInventoryOptics(items)
}

/**
 * @param {string} uid
 * @param {Record<string, unknown>[] | undefined} [prefetchedItems]
 */
export async function getInventoryAmmo(uid, prefetchedItems) {
  const items = prefetchedItems ?? (await fetchInventoryItems(uid))
  return filterInventoryAmmo(items)
}

/**
 * Silaha takılı optiği bul — attached_accessory_id ve mountedOnWeaponId eşlemesi.
 * @param {string} weaponId
 * @param {Record<string, unknown>[]} optics
 * @param {Record<string, unknown>[]} [weapons]
 */
export function getMountedOpticForWeapon(weaponId, optics, weapons = []) {
  const wid = invStr(weaponId).trim()
  if (!wid) return null

  const weapon = weapons.find((w) => String(w.id) === wid)
  const attachedId = invStr(weapon?.attached_accessory_id).trim()
  if (attachedId) {
    const byAttachment = optics.find((o) => String(o.id) === attachedId)
    if (byAttachment) return byAttachment
  }

  return (
    optics.find(
      (o) =>
        getMountedWeaponId(o) === wid && resolveAccessoryKind(o.accessoryKind) === 'OPTIK',
    ) ?? null
  )
}

/**
 * @param {Record<string, unknown>} weapon
 * @param {Record<string, unknown>[]} ammoList
 */
export function getMatchingAmmoForWeapon(weapon, ammoList) {
  return findAmmoForWeapon(ammoList, weapon)
}

/**
 * @param {BallisticInventoryBundle} inventoryData
 */
function resolveInventoryBundle(inventoryData = {}) {
  const allItems = inventoryData.allItems ?? []
  const weapons = inventoryData.weapons ?? filterInventoryWeapons(allItems)
  const optics = inventoryData.optics ?? filterInventoryOptics(allItems)
  const ammo = inventoryData.ammo ?? filterInventoryAmmo(allItems)
  return { weapons, optics, ammo }
}

/**
 * Envanter seçiminden profil varsayılanları — balistik alanlar boş/varsayılan kalır.
 * @param {string|null|undefined} weaponId
 * @param {string|null|undefined} opticId
 * @param {string|null|undefined} ammoId
 * @param {BallisticInventoryBundle} inventoryData
 * @returns {BallisticProfileDocument}
 */
export function buildProfileDefaultsFromInventory(weaponId, opticId, ammoId, inventoryData = {}) {
  const { weapons, optics, ammo } = resolveInventoryBundle(inventoryData)
  const base = createDefaultBallisticProfileFields()

  const weapon = weaponId ? weapons.find((w) => String(w.id) === String(weaponId)) : null
  const optic = opticId ? optics.find((o) => String(o.id) === String(opticId)) : null
  const ammoRow = ammoId ? ammo.find((a) => String(a.id) === String(ammoId)) : null

  const resolvedOptic =
    optic ??
    (weapon ? getMountedOpticForWeapon(String(weapon.id), optics, weapons) : null)
  const resolvedAmmo =
    ammoRow ?? (weapon ? getMatchingAmmoForWeapon(weapon, ammo) : null)

  const ammoBcModel = parseBcModel(resolvedAmmo?.bcModel ?? resolvedAmmo?.ballisticType)
  const opticFfp = parseFfpSfp(resolvedOptic?.ffpSfp)

  const weaponLabel = weapon ? weaponDisplayName(weapon) : 'Manuel Silah'
  const ammoLabel = resolvedAmmo ? ammoDisplayLabel(resolvedAmmo) : 'Manuel Mühimmat'
  const opticLabel = resolvedOptic ? accessoryDisplayName(resolvedOptic) : null

  /** @type {string} */
  let profileName = `${weaponLabel} / ${ammoLabel}`
  if (opticLabel) profileName += ` · ${opticLabel}`

  return {
    profileName,
    ...base,
    linkedWeaponId: weapon ? String(weapon.id) : null,
    linkedOpticId: resolvedOptic ? String(resolvedOptic.id) : null,
    linkedAmmoId: resolvedAmmo ? String(resolvedAmmo.id) : null,
    weapon: {
      ...base.weapon,
      barrelLength:
        weapon?.barrelLength != null && weapon.barrelLength !== ''
          ? invNum(weapon.barrelLength) || null
          : null,
      twistRate: invStr(weapon?.twistRate).trim() || invStr(weapon?.b_twt).trim() || null,
      sightHeight:
        weapon?.sightHeightDefault != null && invNum(weapon.sightHeightDefault) > 0
          ? invNum(weapon.sightHeightDefault)
          : base.weapon.sightHeight,
    },
    optic: {
      ...base.optic,
      clickUnitSystem: parseClickUnitSystem(resolvedOptic?.clickUnitSystem),
      magnification: invStr(resolvedOptic?.magnification).trim() || null,
      clickValueMoa:
        resolvedOptic?.clickValueMoa != null && resolvedOptic.clickValueMoa !== ''
          ? invNum(resolvedOptic.clickValueMoa) || null
          : null,
      clickValueMrad:
        resolvedOptic?.clickValueMrad != null && resolvedOptic.clickValueMrad !== ''
          ? invNum(resolvedOptic.clickValueMrad) || null
          : null,
      ffpSfp: opticFfp,
      reticleType: invStr(resolvedOptic?.reticleType ?? resolvedOptic?.reticle).trim() || null,
    },
    ammo: resolvedAmmo
      ? {
          bulletWeight:
            resolvedAmmo.bulletWeight != null && invNum(resolvedAmmo.bulletWeight) > 0
              ? invNum(resolvedAmmo.bulletWeight)
              : 0,
          bulletDiameter:
            resolvedAmmo.bulletDiameter != null && invNum(resolvedAmmo.bulletDiameter) > 0
              ? invNum(resolvedAmmo.bulletDiameter)
              : 0,
          muzzleVelocity:
            resolvedAmmo.muzzleVelocity != null && invNum(resolvedAmmo.muzzleVelocity) > 0
              ? invNum(resolvedAmmo.muzzleVelocity)
              : weapon?.muzzleVelocity != null && invNum(weapon.muzzleVelocity) > 0
                ? invNum(weapon.muzzleVelocity)
                : 0,
          ballisticCoefficient:
            resolvedAmmo.ballisticCoefficient != null && invNum(resolvedAmmo.ballisticCoefficient) > 0
              ? invNum(resolvedAmmo.ballisticCoefficient)
              : 0,
          bcModel: ammoBcModel ?? 'G7',
        }
      : {
          bulletWeight: 0,
          bulletDiameter: 0,
          muzzleVelocity: 0,
          ballisticCoefficient: 0,
          bcModel: 'G7',
        },
  }
}

/**
 * Silahtan Doldur — tek çözümleme ile draft + kilit state (senkron garanti).
 * @param {string|null|undefined} weaponId
 * @param {BallisticInventoryBundle} inventoryData
 * @returns {{ draft: BallisticProfileDocument, locks: import('./inventoryFillLocks.js').InventoryFillLockState }}
 */
export function buildArmoryFillPayload(weaponId, inventoryData = {}) {
  const { weapons, optics, ammo } = resolveInventoryBundle(inventoryData)
  const weapon = weaponId ? weapons.find((w) => String(w.id) === String(weaponId)) : null
  const resolvedOptic = weapon ? getMountedOpticForWeapon(String(weapon.id), optics, weapons) : null
  const resolvedAmmo = weapon ? getMatchingAmmoForWeapon(weapon, ammo) : null
  const draft = buildProfileDefaultsFromInventory(weaponId, null, null, inventoryData)
  const locks = buildInventoryFillLocksFromResolution(weapon, resolvedOptic, resolvedAmmo)
  return { draft, locks }
}

/**
 * @param {unknown} profile
 * @returns {BallisticProfileDocument}
 */
export function normalizeBallisticProfile(profile) {
  const p = /** @type {Record<string, unknown>} */ (profile ?? {})
  const defaults = createDefaultBallisticProfileFields()
  const weapon = /** @type {Record<string, unknown>} */ (p.weapon ?? {})
  const optic = /** @type {Record<string, unknown>} */ (p.optic ?? {})
  const ammo = /** @type {Record<string, unknown>} */ (p.ammo ?? {})
  const advanced = /** @type {Record<string, unknown>} */ (p.advanced ?? {})

  const bcModelRaw = invStr(ammo.bcModel).toUpperCase()
  const bcModel = bcModelRaw === 'G1' ? 'G1' : 'G7'

  const pressureRaw = invStr(advanced.pressureType).toLowerCase()
  const pressureType = pressureRaw === 'sea-level' ? 'sea-level' : 'station'

  const ffpRaw = invStr(optic.ffpSfp).toUpperCase()
  const ffpSfp = ffpRaw === 'FFP' || ffpRaw === 'SFP' ? ffpRaw : null
  const clickUnitSystem = parseClickUnitSystem(optic.clickUnitSystem)

  return {
    id: p.id != null ? String(p.id) : undefined,
    profileName: invStr(p.profileName).trim() || 'Adsız Profil',
    linkedWeaponId: p.linkedWeaponId != null ? String(p.linkedWeaponId) : null,
    linkedOpticId: p.linkedOpticId != null ? String(p.linkedOpticId) : null,
    linkedAmmoId: p.linkedAmmoId != null ? String(p.linkedAmmoId) : null,
    weapon: {
      barrelLength: weapon.barrelLength != null && weapon.barrelLength !== '' ? invNum(weapon.barrelLength) : null,
      twistRate: invStr(weapon.twistRate).trim() || null,
      sightHeight: invNum(weapon.sightHeight) > 0 ? invNum(weapon.sightHeight) : 5,
      zeroDistance: invNum(weapon.zeroDistance) > 0 ? invNum(weapon.zeroDistance) : 100,
    },
    optic: {
      clickUnitSystem,
      magnification: invStr(optic.magnification).trim() || null,
      clickValueMoa:
        clickUnitSystem === 'MRAD'
          ? null
          : optic.clickValueMoa != null && optic.clickValueMoa !== ''
            ? invNum(optic.clickValueMoa)
            : null,
      clickValueMrad:
        clickUnitSystem === 'MOA'
          ? null
          : optic.clickValueMrad != null && optic.clickValueMrad !== ''
            ? invNum(optic.clickValueMrad)
            : null,
      ffpSfp,
      reticleType: invStr(optic.reticleType).trim() || null,
    },
    ammo: {
      bulletWeight: invNum(ammo.bulletWeight),
      bulletDiameter: invNum(ammo.bulletDiameter),
      muzzleVelocity: invNum(ammo.muzzleVelocity),
      ballisticCoefficient: invNum(ammo.ballisticCoefficient),
      bcModel,
    },
    advanced: {
      coriolisEnabled: Boolean(advanced.coriolisEnabled),
      latitude: advanced.latitude != null && advanced.latitude !== '' ? invNum(advanced.latitude) : null,
      azimuthDegrees:
        advanced.azimuthDegrees != null && advanced.azimuthDegrees !== ''
          ? invNum(advanced.azimuthDegrees)
          : null,
      pressureType,
    },
    ownerId: p.ownerId != null ? String(p.ownerId) : undefined,
    status: invStr(p.status).trim() || 'active',
  }
}

/**
 * Profil alanlarının motor için yeterli olup olmadığını doğrular.
 * @param {BallisticProfileDocument} profile
 */
export function validateProfileForBallistics(profile) {
  const missing = []
  if (!profile.ammo.bulletWeight) missing.push('ammo.bulletWeight')
  if (!profile.ammo.bulletDiameter) missing.push('ammo.bulletDiameter')
  if (!profile.ammo.muzzleVelocity) missing.push('ammo.muzzleVelocity')
  if (!profile.ammo.ballisticCoefficient) missing.push('ammo.ballisticCoefficient')
  if (!profile.weapon.sightHeight) missing.push('weapon.sightHeight')
  if (!profile.weapon.zeroDistance) missing.push('weapon.zeroDistance')
  if (missing.length) {
    throw new Error(`Balistik profil eksik alanlar: ${missing.join(', ')}`)
  }
}

/**
 * @param {BallisticProfileDocument | Record<string, unknown>} profile
 * @param {number[]} targetDistances
 * @param {BallisticEnvironmentOverrides} [environmentOverrides]
 */
export function runBallisticsForProfile(profile, targetDistances, environmentOverrides = {}) {
  const normalized = normalizeBallisticProfile(profile)
  validateProfileForBallistics(normalized)

  const env = environmentOverrides
  const pressureType = env.pressureType ?? normalized.advanced.pressureType ?? 'station'

  return calculateBallistics({
    muzzleVelocity: normalized.ammo.muzzleVelocity,
    velocityUnit: 'fps',
    ballisticCoefficient: normalized.ammo.ballisticCoefficient,
    bcModel: normalized.ammo.bcModel,
    bulletWeight: normalized.ammo.bulletWeight,
    weightUnit: 'grain',
    bulletDiameter: normalized.ammo.bulletDiameter,
    bulletDiameterUnit: 'inch',
    sightHeight: normalized.weapon.sightHeight,
    sightHeightUnit: 'cm',
    zeroDistance: normalized.weapon.zeroDistance,
    zeroUnit: 'meter',
    shootingAngle: env.shootingAngle ?? 0,
    windSpeed: env.windSpeed ?? 0,
    windSpeedUnit: env.windSpeedUnit ?? 'mph',
    windAngleDegrees: env.windAngleDegrees ?? 90,
    clickValueMoa: normalized.optic.clickValueMoa ?? undefined,
    clickValueMrad: normalized.optic.clickValueMrad ?? undefined,
    energyUnit: env.energyUnit ?? 'ftlb',
    atmospheric: {
      temperatureC: env.temperatureC ?? 15,
      pressureHpa: env.pressureHpa ?? 1013.25,
      humidityPercent: env.humidityPercent ?? 0,
      altitudeM: env.altitudeM ?? 0,
      pressureType,
    },
    coriolis: {
      enabled: normalized.advanced.coriolisEnabled,
      latitude: normalized.advanced.latitude ?? 0,
      azimuthDegrees: normalized.advanced.azimuthDegrees ?? 0,
    },
    targetDistances,
    targetUnit: env.targetUnit ?? 'meter',
    timeStep: env.timeStep ?? 0.0005,
  })
}
