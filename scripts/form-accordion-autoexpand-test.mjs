/**
 * Akordion autoExpand + userToggled mantığı smoke testi.
 * npx tsx scripts/form-accordion-autoexpand-test.mjs
 */

/** @typedef {'profile' | 'ammo' | 'weapon' | 'optic' | 'env' | 'advanced' | 'range'} FormSectionId */

/**
 * @param {Record<FormSectionId, boolean>} prevOpen
 * @param {Partial<Record<FormSectionId, boolean>>} flags
 * @param {Set<FormSectionId>} userToggled
 */
function mergeAutoExpand(prevOpen, flags, userToggled) {
  /** @type {Record<FormSectionId, boolean>} */
  const next = { ...prevOpen }
  for (const [id, shouldOpen] of Object.entries(flags)) {
    const sectionId = /** @type {FormSectionId} */ (id)
    if (userToggled.has(sectionId)) continue
    if (shouldOpen) next[sectionId] = true
  }
  return next
}

let failed = false

const DEFAULT_OPEN = {
  profile: true,
  ammo: false,
  weapon: false,
  optic: false,
  env: false,
  advanced: false,
  range: false,
}

const userToggled = new Set(/** @type {FormSectionId[]} */ (['optic']))

let open = { ...DEFAULT_OPEN }

console.log('=== Senaryo: ilk autoExpand — mermi verisi var, optic userToggled ===')
open = mergeAutoExpand(open, { profile: true, ammo: true, weapon: true, optic: true }, userToggled)
console.log('ammo açık:', open.ammo, '(beklenen: true)')
console.log('optic açık:', open.optic, '(beklenen: false — userToggled)')

if (!open.ammo) failed = true
if (open.optic) failed = true

console.log('\n=== Senaryo: kullanıcı mermiye yazmaya devam ediyor (autoExpand TEKRAR çalışmaz) ===')
console.log('optic hâlâ kapalı:', !open.optic, '(beklenen: true)')
console.log('ammo hâlâ açık:', open.ammo, '(beklenen: true)')

if (open.optic) failed = true
if (!open.ammo) failed = true

userToggled.clear()
open = mergeAutoExpand(open, { ammo: true, weapon: true, optic: true }, userToggled)

console.log('\n=== Senaryo: Silahtan Doldur — userToggled sıfırlandı ===')
console.log('optic açık:', open.optic, '(beklenen: true)')

if (!open.optic) failed = true

if (failed) {
  console.error('\nFAIL: form-accordion-autoexpand-test')
  process.exit(1)
}

console.log('\nOK: autoExpand userToggled mantığı doğrulandı.')
