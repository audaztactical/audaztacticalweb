/**
 * Geriye dönük uyumluluk: eski envanter kayıtları buildProfileDefaultsFromInventory ile hata vermemeli.
 * node scripts/inventory-ballistic-bridge-compat-test.mjs
 */
import {
  buildProfileDefaultsFromInventory,
  createDefaultBallisticProfileFields,
} from '../src/lib/ballisticProfileBridge.js'

const LEGACY_WEAPON = {
  id: 'legacy-w1',
  name: 'Eski Kayıt AR-15',
  tacticalCategory: 'P_TFK',
  calibre: '.308 Win',
  attached_accessory_id: 'legacy-o1',
}

const LEGACY_OPTIC = {
  id: 'legacy-o1',
  name: 'Eski Optik',
  tacticalCategory: 'OPT',
  accessoryKind: 'OPTIK',
  mountedOnWeaponId: 'legacy-w1',
}

const LEGACY_AMMO = {
  id: 'legacy-a1',
  name: 'Eski Mühimmat',
  tacticalCategory: 'MHM',
  calibre: '.308 Win',
  ballisticType: 'G7',
}

const LEGACY_INVENTORY = [LEGACY_WEAPON, LEGACY_OPTIC, LEGACY_AMMO]

const defaults = createDefaultBallisticProfileFields()

let failed = false

try {
  const draft = buildProfileDefaultsFromInventory('legacy-w1', null, null, {
    allItems: LEGACY_INVENTORY,
  })

  console.log('=== Geriye Dönük Uyumluluk Testi ===')
  console.log('Profil adı:', draft.profileName)
  console.log('linkedWeaponId:', draft.linkedWeaponId, '(beklenen: legacy-w1)')
  console.log('linkedOpticId:', draft.linkedOpticId, '(beklenen: legacy-o1)')
  console.log('linkedAmmoId:', draft.linkedAmmoId, '(beklenen: legacy-a1)')

  if (draft.linkedWeaponId !== 'legacy-w1') failed = true
  if (draft.linkedOpticId !== 'legacy-o1') failed = true
  if (draft.linkedAmmoId !== 'legacy-a1') failed = true

  const checks = [
    ['weapon.barrelLength', draft.weapon.barrelLength, null],
    ['weapon.twistRate', draft.weapon.twistRate, null],
    ['weapon.sightHeight', draft.weapon.sightHeight, defaults.weapon.sightHeight],
    ['optic.magnification', draft.optic.magnification, null],
    ['optic.clickValueMoa', draft.optic.clickValueMoa, null],
    ['optic.clickValueMrad', draft.optic.clickValueMrad, null],
    ['optic.ffpSfp', draft.optic.ffpSfp, null],
    ['ammo.bulletWeight', draft.ammo.bulletWeight, defaults.ammo.bulletWeight],
    ['ammo.bulletDiameter', draft.ammo.bulletDiameter, defaults.ammo.bulletDiameter],
    ['ammo.muzzleVelocity', draft.ammo.muzzleVelocity, defaults.ammo.muzzleVelocity],
    ['ammo.ballisticCoefficient', draft.ammo.ballisticCoefficient, defaults.ammo.ballisticCoefficient],
    ['ammo.bcModel', draft.ammo.bcModel, 'G7'],
  ]

  for (const [label, actual, expected] of checks) {
    const ok = actual === expected
    console.log(`${ok ? 'OK' : 'FAIL'} ${label}:`, actual, `(beklenen: ${expected})`)
    if (!ok) failed = true
  }
} catch (err) {
  console.error('HATA: buildProfileDefaultsFromInventory istisna fırlattı:', err)
  failed = true
}

const RICH_WEAPON = {
  ...LEGACY_WEAPON,
  id: 'rich-w1',
  barrelLength: 16,
  twistRate: '1:10',
  muzzleVelocity: 2650,
  sightHeightDefault: 4.5,
  attached_accessory_id: 'rich-o1',
}

const RICH_OPTIC = {
  ...LEGACY_OPTIC,
  id: 'rich-o1',
  mountedOnWeaponId: 'rich-w1',
  magnification: '3-18x',
  clickValueMoa: 0.25,
  clickValueMrad: 0.1,
  ffpSfp: 'FFP',
  reticleType: 'Horus',
}

const RICH_AMMO = {
  ...LEGACY_AMMO,
  id: 'rich-a1',
  bulletWeight: 175,
  bulletDiameter: 0.308,
  ballisticCoefficient: 0.243,
  bcModel: 'G7',
}

try {
  const rich = buildProfileDefaultsFromInventory('rich-w1', null, 'rich-a1', {
    allItems: [RICH_WEAPON, RICH_OPTIC, RICH_AMMO],
  })

  console.log('\n=== Zengin Envanter Aktarımı ===')
  console.log('weapon.barrelLength:', rich.weapon.barrelLength, '(beklenen: 16)')
  console.log('weapon.twistRate:', rich.weapon.twistRate, '(beklenen: 1:10)')
  console.log('weapon.sightHeight:', rich.weapon.sightHeight, '(beklenen: 4.5)')
  console.log('optic.clickValueMoa:', rich.optic.clickValueMoa, '(beklenen: 0.25)')
  console.log('ammo.bulletWeight:', rich.ammo.bulletWeight, '(beklenen: 175)')
  console.log('ammo.muzzleVelocity:', rich.ammo.muzzleVelocity, '(beklenen: 175 grain ammo veya 2650 weapon)')

  if (rich.weapon.barrelLength !== 16) failed = true
  if (rich.weapon.sightHeight !== 4.5) failed = true
  if (rich.optic.clickValueMoa !== 0.25) failed = true
  if (rich.ammo.bulletWeight !== 175) failed = true
  if (rich.ammo.ballisticCoefficient !== 0.243) failed = true
} catch (err) {
  console.error('HATA: zengin envanter testi başarısız:', err)
  failed = true
}

if (failed) {
  console.error('\nFAIL: Uyumluluk testi başarısız')
  process.exit(1)
}

console.log('\nOK: Geriye dönük uyumluluk ve zengin aktarım testleri geçti.')
