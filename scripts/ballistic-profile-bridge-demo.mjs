/**
 * Balistik profil köprüsü — mock envanter + motor örneği (Firebase gerekmez).
 * node scripts/ballistic-profile-bridge-demo.mjs
 */
import {
  buildProfileDefaultsFromInventory,
  filterInventoryAmmo,
  filterInventoryOptics,
  filterInventoryWeapons,
  getMatchingAmmoForWeapon,
  getMountedOpticForWeapon,
  runBallisticsForProfile,
} from '../src/lib/ballisticProfileBridge.js'

const MOCK_INVENTORY = [
  {
    id: 'w-ar15',
    name: 'AR-15 Patrol',
    tacticalCategory: 'P_TFK',
    calibre: '.308 Win',
    attached_accessory_id: 'o-vortex',
  },
  {
    id: 'w-65',
    name: '6.5 Creedmoor Precision',
    tacticalCategory: 'P_TFK',
    calibre: '6.5 Creedmoor',
    attached_accessory_id: null,
  },
  {
    id: 'o-vortex',
    name: 'Vortex Razor HD',
    tacticalCategory: 'OPT',
    accessoryKind: 'OPTIK',
    mountedOnWeaponId: 'w-ar15',
    clickValueMoa: 0.25,
  },
  {
    id: 'o-leupold',
    name: 'Leupold Mark 5',
    tacticalCategory: 'OPT',
    accessoryKind: 'OPTIK',
    mountedOnWeaponId: 'w-65',
  },
  {
    id: 'a-308',
    name: '175gr SMK .308',
    tacticalCategory: 'MHM',
    calibre: '.308 Win',
    ballisticType: 'G7',
  },
  {
    id: 'a-65',
    name: '140gr ELD Match',
    tacticalCategory: 'MHM',
    calibre: '6.5 Creedmoor',
  },
  {
    id: 'x-laser',
    name: 'PEQ-15',
    tacticalCategory: 'OPT',
    accessoryKind: 'LAZER',
  },
]

const weapons = filterInventoryWeapons(MOCK_INVENTORY)
const optics = filterInventoryOptics(MOCK_INVENTORY)
const ammo = filterInventoryAmmo(MOCK_INVENTORY)

console.log('=== Cephanelik filtreleri (mock) ===')
console.log('Silahlar:', weapons.map((w) => w.name).join(', '))
console.log('Optikler:', optics.map((o) => o.name).join(', '))
console.log('Mühimmat:', ammo.map((a) => a.name).join(', '))

const ar15 = weapons.find((w) => w.id === 'w-ar15')
const mountedOptic = getMountedOpticForWeapon('w-ar15', optics, weapons)
const matchedAmmo = getMatchingAmmoForWeapon(ar15, ammo)
console.log('AR-15 takılı optik:', mountedOptic?.name)
console.log('AR-15 eşleşen mühimmat:', matchedAmmo?.name)

const draft = buildProfileDefaultsFromInventory('w-ar15', null, null, {
  allItems: MOCK_INVENTORY,
})
console.log('\nOtomatik profil taslağı:', draft.profileName)
console.log('linkedWeaponId:', draft.linkedWeaponId, 'optic:', draft.linkedOpticId, 'ammo:', draft.linkedAmmoId)

const profile = {
  ...draft,
  ammo: {
    bulletWeight: 175,
    bulletDiameter: 0.308,
    muzzleVelocity: 2600,
    ballisticCoefficient: 0.243,
    bcModel: 'G7',
  },
  weapon: {
    ...draft.weapon,
    sightHeight: 5,
    zeroDistance: 100,
  },
  optic: {
    ...draft.optic,
    clickValueMoa: 0.25,
  },
}

const result = runBallisticsForProfile(profile, [100, 300, 500], {
  temperatureC: 15,
  pressureHpa: 1013.25,
  humidityPercent: 0,
  altitudeM: 0,
  pressureType: 'station',
  windSpeed: 0,
})

console.log('\n=== runBallisticsForProfile (Senaryo 1 benzeri) ===')
console.log('Launch angle (deg):', result.launchAngleDegrees)
for (const r of result.results) {
  console.log(
    `${r.distance}m | drop ${r.dropCm.toFixed(1)} cm | vel ${r.velocityRemaining.toFixed(0)} fps | TOF ${r.timeOfFlightSeconds.toFixed(3)} s`,
  )
}
