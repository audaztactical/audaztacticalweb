/**
 * Silahtan Doldur kilit + akordion davranışı smoke testi.
 * npx tsx scripts/inventory-fill-locks-test.mjs
 */
import { buildArmoryFillPayload } from '../src/lib/ballisticProfileBridge.js'
import {
  buildArmorySessionFromLocks,
  flattenInventoryLockFields,
  isArmorySessionFieldLocked,
  isFieldInventoryLocked,
  sectionHasInventoryLocks,
} from '../src/lib/inventoryFillLocks.js'
import { getInventoryFieldControlProps } from '../src/lib/inventoryFieldControl.js'

const BORA12 = {
  id: 'bora-12',
  name: 'Bora-12',
  tacticalCategory: 'KNT',
  calibre: '7.62x51mm NATO',
  barrelLength: 20,
  twistRate: '1:10',
  sightHeightDefault: 4.5,
}

const LAPUA = {
  id: 'lapua-170',
  tacticalCategory: 'MHM',
  calibre: '7.62X51MM NATO LAPUA 170GR',
  bulletWeight: 170,
  bulletDiameter: 0.308,
  ballisticCoefficient: 0.4,
  bcModel: 'G1',
  muzzleVelocity: 2650,
}

const OPTIC = {
  id: 'optic-1',
  tacticalCategory: 'OPT',
  accessoryKind: 'OPTIK',
  magnification: '5-25x',
  clickUnitSystem: 'MOA',
  clickValueMoa: 0.25,
  ffpSfp: 'FFP',
  mountedOnWeaponId: 'bora-12',
}

const bundle = { allItems: [BORA12, LAPUA, OPTIC] }

let failed = false

const { draft, locks } = buildArmoryFillPayload('bora-12', bundle)

console.log('=== buildArmoryFillPayload (Bora-12) ===')
console.log('locks.active:', locks.active, '(beklenen: true)')
console.log('locks.ammo:', locks.ammo)
console.log('draft.linkedWeaponId:', draft.linkedWeaponId)

if (!locks.active) failed = true
if (!locks.ammo.bulletWeight) failed = true
if (!locks.ammo.bcModel) failed = true
if (!locks.weapon.barrelLength) failed = true
if (!locks.optic.clickValueMoa) failed = true

console.log('\n=== isFieldInventoryLocked ===')
const weightLocked = isFieldInventoryLocked(locks, 'ammo', 'bulletWeight')
const zeroEditable = !isFieldInventoryLocked(locks, 'weapon', 'zeroDistance')
console.log('bulletWeight locked:', weightLocked, '(beklenen: true)')
console.log('zeroDistance locked:', !zeroEditable, '(beklenen: false)')

if (!weightLocked) failed = true
if (!zeroEditable) failed = true

console.log('\n=== sectionHasInventoryLocks ===')
console.log('ammo section:', sectionHasInventoryLocks(locks, 'ammo'), '(beklenen: true)')

if (!sectionHasInventoryLocks(locks, 'ammo')) failed = true

const session = buildArmorySessionFromLocks(locks, 1)
const flat = flattenInventoryLockFields(locks)
console.log('\n=== armorySession (form içi kilit — production model) ===')
console.log('lockedFields:', session.lockedFields)
console.log('flat ammo.bulletWeight:', flat['ammo.bulletWeight'])
console.log('session locked bulletWeight:', isArmorySessionFieldLocked(session, 'ammo', 'bulletWeight'))

if (!session.lockedFields['ammo.bulletWeight']) failed = true
if (!isArmorySessionFieldLocked(session, 'ammo', 'bulletWeight')) failed = true

const domProps = getInventoryFieldControlProps({
  group: 'ammo',
  field: 'bulletWeight',
  label: 'Ağırlık (gr)',
  session,
  baseClass: 'input',
})
console.log('\n=== getInventoryFieldControlProps ===')
console.log('disabled:', domProps.disabled, '(beklenen: true)')
console.log('name:', domProps.name, '(beklenen: bulletWeight)')
console.log('data-inventory-locked:', domProps['data-inventory-locked'])

if (domProps.disabled !== true) failed = true
if (domProps.name !== 'bulletWeight') failed = true
if (domProps['data-inventory-locked'] !== 'true') failed = true

console.log('\n=== autoExpand skip when armory locked ===')
const armoryLocked = Object.keys(session.lockedFields).length > 0
const ammoWouldExpand = armoryLocked ? false : draft.ammo.bulletWeight > 0
console.log('ammo autoExpand:', ammoWouldExpand, '(beklenen: false)')

if (ammoWouldExpand) failed = true

if (failed) {
  console.error('\nFAIL: inventory-fill-locks-test')
  process.exit(1)
}

console.log('\nOK: Silahtan Doldur kilit payload doğrulandı.')
