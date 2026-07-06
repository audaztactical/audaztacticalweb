/**
 * Hızlı Referans elevation/wind ok-metin senkron smoke testi.
 * npx tsx scripts/quick-ref-direction-test.mjs
 */

/** @param {number} dropCm */
function elevationCue(dropCm) {
  const dialUp = dropCm >= 0
  return { arrow: dialUp ? '↑' : '↓', label: dialUp ? 'YUKARI' : 'AŞAĞI' }
}

/** @param {number} windageCm */
function windCue(windageCm) {
  if (Math.abs(windageCm) < 0.05) return { arrow: '·', label: '—' }
  const aimLeft = windageCm > 0
  return { arrow: aimLeft ? '←' : '→', label: aimLeft ? 'SOLA' : 'SAĞA' }
}

let failed = false

const dropPos = elevationCue(12)
const dropNeg = elevationCue(-8)
const windPos = windCue(3)
const windNeg = windCue(-2)

console.log('drop +12cm:', dropPos, '(beklenen: ↑ YUKARI)')
console.log('drop -8cm:', dropNeg, '(beklenen: ↓ AŞAĞI)')
console.log('wind +3cm:', windPos, '(beklenen: ← SOLA)')
console.log('wind -2cm:', windNeg, '(beklenen: → SAĞA)')

if (dropPos.arrow !== '↑' || dropPos.label !== 'YUKARI') failed = true
if (dropNeg.arrow !== '↓' || dropNeg.label !== 'AŞAĞI') failed = true
if (windPos.arrow !== '←' || windPos.label !== 'SOLA') failed = true
if (windNeg.arrow !== '→' || windNeg.label !== 'SAĞA') failed = true

if (failed) {
  console.error('\nFAIL: quick-ref-direction-test')
  process.exit(1)
}

console.log('\nOK: ok ve yön metni senkron.')
