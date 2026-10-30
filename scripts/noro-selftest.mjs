/**
 * NÖRO motor birim testleri (paket yok).
 * Node ESM uzantı kuralı için geçici .js kopyaları üretir.
 *
 * node scripts/noro-selftest.mjs
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const tmp = path.join(__dirname, '.noro-selftest-tmp')
fs.mkdirSync(tmp, { recursive: true })
fs.mkdirSync(path.join(tmp, 'lib'), { recursive: true })
fs.mkdirSync(path.join(tmp, 'noro'), { recursive: true })

function withJsExt(src) {
  return src.replace(/from ['"](\.[^'"]+)['"]/g, (m, p) => {
    if (/\.(js|css|json)$/.test(p)) return m
    return m.replace(p, `${p}.js`)
  })
}

const cfgSrc = path.join(root, 'src', 'lib', 'neural', 'neuralConfig.js')
const copySrc = path.join(root, 'src', 'components', 'neural', 'noro', 'noroCopy.js')
const engSrc = path.join(root, 'src', 'components', 'neural', 'noro', 'noroEngine.js')

fs.writeFileSync(path.join(tmp, 'lib', 'neuralConfig.js'), withJsExt(fs.readFileSync(cfgSrc, 'utf8')))

let copyBody = fs.readFileSync(copySrc, 'utf8')
copyBody = copyBody.replace(
  /from ['"]\.\.\/\.\.\/\.\.\/lib\/neural\/neuralConfig['"]/,
  "from '../lib/neuralConfig.js'",
)
fs.writeFileSync(path.join(tmp, 'noro', 'noroCopy.js'), withJsExt(copyBody))

let engBody = fs.readFileSync(engSrc, 'utf8')
engBody = engBody
  .replace(
    /from ['"]\.\.\/\.\.\/\.\.\/lib\/neural\/neuralConfig['"]/,
    "from '../lib/neuralConfig.js'",
  )
  .replace(/from ['"]\.\/noroCopy['"]/, "from './noroCopy.js'")
fs.writeFileSync(path.join(tmp, 'noro', 'noroEngine.js'), withJsExt(engBody))

const {
  AUTO_MSG_DAY_CAP,
  buildBriefing,
  buildEventReaction,
  canEmitAutoMessage,
  isOpsecRisky,
} = await import(pathToFileURL(path.join(tmp, 'noro', 'noroEngine.js')).href)
const { scoreLine, V } = await import(pathToFileURL(path.join(tmp, 'noro', 'noroCopy.js')).href)

let passed = 0
let failed = 0

function assert(name, cond, detail = '') {
  if (cond) {
    passed += 1
    console.log(`  ✓ ${name}`)
  } else {
    failed += 1
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

function regionEmpty() {
  return ['frontal', 'motor', 'parietal', 'occipital', 'temporal', 'hippocampus', 'cerebellum', 'stem'].map(
    (id) => ({
      id,
      idleDays: 0,
      decayLoss: 0,
      daysToDecay: 20,
      decaying: false,
      level: 1,
    }),
  )
}

console.log('\n=== noro-selftest ===\n')

{
  const r = buildEventReaction({
    tone: 'e',
    gains: { motor: 18, parietal: 2 },
    score: null,
    flags: {},
    streak: 0,
    prevLevels: { motor: 1 },
    nextLevels: { motor: 1 },
  })
  assert('kazanç mesajı motor içerir', /motor|Atış|Tetik|namlu/i.test(r.texts[0] || ''))
  assert('yan bölge sekme', /Parietal|parietal|\+2/i.test(r.texts[0] || ''))
  assert('AAR öner (frontal değil)', r.offerAar === true)
}

{
  const r = buildEventReaction({
    tone: 's',
    gains: { frontal: 10 },
    score: null,
    flags: {},
    streak: 0,
    prevLevels: {},
    nextLevels: {},
  })
  assert('frontal AAR önermez', r.offerAar === false)
}

for (const tone of /** @type {const} */ (['e', 's', 'k'])) {
  const hi = scoreLine(92, tone)
  const mid = scoreLine(80, tone)
  const lo = scoreLine(60, tone)
  assert(`skor ≥90 (${tone})`, /92/.test(hi))
  assert(`skor 75–89 (${tone})`, /80/.test(mid))
  assert(`skor <75 (${tone})`, /60/.test(lo))
  if (tone === 'k') {
    assert('komutan yüksek: Standardı', /Standardı|koru/i.test(hi))
    assert('komutan düşük: Kabul edilemez|Temele', /Kabul edilemez|Temele|tetik/i.test(lo))
  }
  if (tone === 's') {
    assert('sade skor kısa', mid === 'Skor %80.')
  }
}

{
  const r = buildEventReaction({
    tone: 's',
    gains: { motor: 12 },
    score: null,
    flags: { bonus: true },
    streak: 0,
    prevLevels: {},
    nextLevels: {},
  })
  assert('geri dönüş bonusu', /1,?5|bonus/i.test(r.texts.join(' ')))
}

{
  const r = buildEventReaction({
    tone: 'e',
    gains: { motor: 0 },
    score: null,
    flags: { cap: true },
    streak: 0,
    prevLevels: {},
    nextLevels: {},
  })
  assert('günlük tavan (cap)', /sınır|doydu|Yarın/i.test(r.texts.join(' ')))
}

{
  const r = buildEventReaction({
    tone: 'e',
    gains: { motor: 8 },
    score: null,
    flags: { streakBonus: 2 },
    streak: 7,
    prevLevels: {},
    nextLevels: {},
  })
  assert('seri mesajı', /Seri|7/i.test(r.texts.join(' ')))
}

{
  const r = buildEventReaction({
    tone: 'e',
    gains: { motor: 20 },
    score: null,
    flags: {},
    streak: 0,
    prevLevels: { motor: 2 },
    nextLevels: { motor: 3 },
  })
  assert('seviye atlama', /lv 3|Seviye/i.test(r.texts.join(' ')))
}

{
  const r = buildEventReaction({
    tone: 'e',
    gains: { motor: 5, cerebellum: 5 },
    score: null,
    flags: {},
    streak: 0,
    prevLevels: { motor: 2, cerebellum: 3 },
    nextLevels: { motor: 3, cerebellum: 3 },
  })
  assert('yeni köprü', /Köprü|bağlantı|Bağlantı/i.test(r.texts.join(' ')))
}

{
  const decay = buildBriefing({
    tone: 's',
    daysSince: 3,
    regions: [
      {
        id: 'motor',
        idleDays: 20,
        decayLoss: 4,
        daysToDecay: 0,
        decaying: true,
        level: 2,
      },
    ],
    streak: 0,
  })
  assert('brifing sönme başladı', /sönme|boşta|−4|-4/i.test(decay.join(' ')))

  const soon = buildBriefing({
    tone: 'e',
    daysSince: 2,
    regions: [
      {
        id: 'stem',
        idleDays: 10,
        decayLoss: 0,
        daysToDecay: 4,
        decaying: false,
        level: 1,
      },
    ],
    streak: 3,
  })
  assert('brifing yakında sönecek', /gün kaldı|sönmeye|içinde/i.test(soon.join(' ')))

  const calm = buildBriefing({
    tone: 'k',
    daysSince: 1,
    regions: regionEmpty(),
    streak: 5,
  })
  assert('brifing sakin selam', /stabil|geçti/i.test(calm.join(' ')))
}

assert('auto cap sabiti 3', AUTO_MSG_DAY_CAP === 3)
assert('0/3 izin', canEmitAutoMessage('2026-10-30', 0))
assert('2/3 izin', canEmitAutoMessage('2026-10-30', 2))
assert('3/3 yasak', !canEmitAutoMessage('2026-10-30', 3))

assert('OPSEC koordinat engel', isOpsecRisky('hedef 41.01234° N'))
assert('OPSEC plaka engel', isOpsecRisky('araç 34 ABC 123'))
assert('OPSEC telefon engel', isOpsecRisky('ara 0532 111 22 33'))
assert('OPSEC operasyon bölgesi engel', isOpsecRisky('operasyon bölgesi temiz'))
assert('OPSEC normal geçer', !isOpsecRisky('Tutuş ve nefes kontrolü iyiydi.'))
assert('V ton seçimi', V('k', 'e', 's', 'k') === 'k')

{
  const { ACTIVITY_RULES } = await import(pathToFileURL(path.join(tmp, 'lib', 'neuralConfig.js')).href)
  assert('AAR_ENTRY perDayTypeCap=3', ACTIVITY_RULES.AAR_ENTRY?.perDayTypeCap === 3)
}

console.log(`\n=== Sonuç: ${passed} geçti, ${failed} kaldı ===\n`)
process.exit(failed > 0 ? 1 : 0)
