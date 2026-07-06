/**
 * Bora-12 + Lapua kalibre eşleştirme ve Silahtan Doldur mühimmat aktarımı testi.
 * npx tsx scripts/ammo-calibre-match-test.mjs
 */
import { findAmmoForWeapon, scoreCalibreMatch, normalizeCalibreKey } from '../src/lib/ammoIlws.js'
import { buildProfileDefaultsFromInventory } from '../src/lib/ballisticProfileBridge.js'

const BORA12 = {
  id: 'bora-12',
  name: 'Bora-12',
  tacticalCategory: 'KNT',
  calibre: '7.62x51mm NATO',
}

const LAPUA = {
  id: 'lapua-170',
  name: 'Lapua 170gr',
  tacticalCategory: 'MHM',
  calibre: '7.62X51MM NATO LAPUA 170GR',
  bulletWeight: 170,
  bulletDiameter: 0.308,
  ballisticCoefficient: 0.4,
  bcModel: 'G1',
}

const OTHER_AMMO = {
  id: 'other-308',
  name: 'Test .308',
  tacticalCategory: 'MHM',
  calibre: '.308 Win',
  bulletWeight: 175,
  bulletDiameter: 0.308,
  ballisticCoefficient: 0.243,
  bcModel: 'G7',
  muzzleVelocity: 2600,
}

let failed = false

const wKey = normalizeCalibreKey(BORA12.calibre)
const lapuaKey = normalizeCalibreKey(LAPUA.calibre)
const score = scoreCalibreMatch(wKey, lapuaKey)

console.log('=== Kalibre Eşleştirme ===')
console.log('Silah key:', wKey)
console.log('Lapua key:', lapuaKey)
console.log('scoreCalibreMatch:', score, `(beklenen: > 0)`)
if (score <= 0) failed = true

const matched = findAmmoForWeapon([OTHER_AMMO, LAPUA], BORA12)
console.log('\nfindAmmoForWeapon id:', matched?.id, `(beklenen: lapua-170)`)
if (matched?.id !== LAPUA.id) failed = true

const draft = buildProfileDefaultsFromInventory('bora-12', null, null, {
  allItems: [BORA12, LAPUA, OTHER_AMMO],
})

console.log('\n=== Silahtan Doldur (buildProfileDefaultsFromInventory) ===')
console.log('linkedAmmoId:', draft.linkedAmmoId, `(beklenen: lapua-170)`)
console.log('bulletWeight:', draft.ammo.bulletWeight, `(beklenen: 170)`)
console.log('bulletDiameter:', draft.ammo.bulletDiameter, `(beklenen: 0.308)`)
console.log('ballisticCoefficient:', draft.ammo.ballisticCoefficient, `(beklenen: 0.4)`)
console.log('bcModel:', draft.ammo.bcModel, `(beklenen: G1)`)
console.log('muzzleVelocity:', draft.ammo.muzzleVelocity, `(beklenen: 0 — ammo kaydında yok)`)

if (draft.linkedAmmoId !== LAPUA.id) failed = true
if (draft.ammo.bulletWeight !== 170) failed = true
if (draft.ammo.bulletDiameter !== 0.308) failed = true
if (draft.ammo.ballisticCoefficient !== 0.4) failed = true
if (draft.ammo.bcModel !== 'G1') failed = true
if (draft.ammo.muzzleVelocity !== 0) failed = true

const noMatchDraft = buildProfileDefaultsFromInventory('bora-12', null, null, {
  allItems: [BORA12, OTHER_AMMO],
})

console.log('\n=== Eşleşme Yok (yalnızca .308 Win — alt string değil) ===')
console.log('linkedAmmoId:', noMatchDraft.linkedAmmoId, `(beklenen: null)`)
console.log('bulletWeight:', noMatchDraft.ammo.bulletWeight, `(beklenen: 0)`)
console.log('muzzleVelocity:', noMatchDraft.ammo.muzzleVelocity, `(beklenen: 0, silah fallback yok)`)

if (noMatchDraft.linkedAmmoId != null) failed = true
if (noMatchDraft.ammo.bulletWeight !== 0) failed = true
if (noMatchDraft.ammo.muzzleVelocity !== 0) failed = true

if (failed) {
  console.error('\nFAIL: ammo-calibre-match-test')
  process.exit(1)
}

console.log('\nOK: Bora-12 + Lapua senaryosu doğrulandı.')
