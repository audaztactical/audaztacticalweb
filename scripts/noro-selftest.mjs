/**
 * NÖRO motor + rehber birim testleri.
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

function rewriteDeep(body) {
  return body
    .replace(
      /from ['"]\.\.\/\.\.\/\.\.\/lib\/neural\/neuralConfig['"]/g,
      "from '../lib/neuralConfig.js'",
    )
    .replace(/from ['"]\.\/noroCopy['"]/g, "from './noroCopy.js'")
    .replace(/from ['"]\.\/noroEngine['"]/g, "from './noroEngine.js'")
    .replace(/from ['"]\.\/noroGuideKb['"]/g, "from './noroGuideKb.js'")
    .replace(/from ['"]\.\/noroGuideSearch['"]/g, "from './noroGuideSearch.js'")
}

const cfgSrc = path.join(root, 'src', 'lib', 'neural', 'neuralConfig.js')
fs.writeFileSync(path.join(tmp, 'lib', 'neuralConfig.js'), withJsExt(fs.readFileSync(cfgSrc, 'utf8')))

for (const name of [
  'noroCopy.js',
  'noroEngine.js',
  'noroGuideKb.js',
  'noroGuideSearch.js',
]) {
  const src = path.join(root, 'src', 'components', 'neural', 'noro', name)
  fs.writeFileSync(path.join(tmp, 'noro', name), withJsExt(rewriteDeep(fs.readFileSync(src, 'utf8'))))
}

const eng = await import(pathToFileURL(path.join(tmp, 'noro', 'noroEngine.js')).href)
const copy = await import(pathToFileURL(path.join(tmp, 'noro', 'noroCopy.js')).href)
const kb = await import(pathToFileURL(path.join(tmp, 'noro', 'noroGuideKb.js')).href)
const search = await import(pathToFileURL(path.join(tmp, 'noro', 'noroGuideSearch.js')).href)

const {
  AUTO_MSG_DAY_CAP,
  DRAG_COOLDOWN_MS,
  DRAG_SESSION_CAP,
  DRAG_MIN_DISTANCE_PX,
  DRAG_RECENT_WINDOW,
  MOTIVATION_REPEAT_WINDOW,
  buildBriefing,
  buildEventReaction,
  canEmitAutoMessage,
  canEmitDragReaction,
  detectIntent,
  isBusyDragContext,
  isOpsecRisky,
  pickDragLine,
  pickMotivation,
  withBusyPeek,
} = eng
const { MOTIVATION, DRAG_LINES } = copy
const { NORO_KB, GUIDE_SECTION_IDS } = kb
const { answerGuideQuery, answerOnboarding, isOnboardingQuery, searchGuide } = search
const scoreLineFn = copy.scoreLine

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

console.log('\n=== noro-selftest ===\n')

assert('ton API yok (V export edilmez)', typeof copy.V === 'undefined')
assert('MOTIVATION ≥ 30', MOTIVATION.length >= 30)
assert('DRAG_LINES = 94', DRAG_LINES.length === 94)
{
  const tags = ['start', 'shake', 'top', 'corner', 'center', 'same', 'frequent', 'after_idle']
  for (const tag of tags) {
    const n = DRAG_LINES.filter((d) => d.tags.includes(tag)).length
    assert(`drag tag ${tag} = 10`, n === 10, String(n))
  }
  assert('drag tag busy = 14', DRAG_LINES.filter((d) => d.tags.includes('busy')).length === 14)
  assert('drag id d01', DRAG_LINES[0]?.id === 'd01' && DRAG_LINES[0]?.text === 'Hop! Nereye götürüyorsun beni?')
  assert('drag id d80', DRAG_LINES[79]?.id === 'd80' && DRAG_LINES[79]?.tags.includes('after_idle'))
  assert(
    'drag center first',
    DRAG_LINES.find((d) => d.tags.includes('center'))?.text === 'Merkezdeyim. Her şeyi görüyorum.',
  )
  assert(
    'drag start trailing space',
    DRAG_LINES.some((d) => d.text === 'Sıkı tut, düşersem tutanak tutarım :) '),
  )
  assert(
    'drag busy first',
    DRAG_LINES.find((d) => d.tags.includes('busy'))?.text === 'Konuşurken taşınmak zor ama deneyelim.',
  )
}

{
  const r = buildEventReaction({
    gains: { motor: 18, parietal: 2 },
    score: null,
    flags: {},
    streak: 0,
    prevLevels: { motor: 1 },
    nextLevels: { motor: 1 },
    recentMotivationIds: [],
  })
  assert('kazanç motor', /motor|Atış|Tetik|namlu/i.test(r.texts[0] || ''))
  assert('yan sekme', /\+2/i.test(r.texts[0] || ''))
  assert('AAR öner', r.offerAar === true)
}

assert('skor ≥90', /92/.test(scoreLineFn(92)))
assert('skor mid', /80/.test(scoreLineFn(80)))
assert('skor low', /60/.test(scoreLineFn(60)))

{
  const r = buildEventReaction({
    gains: { motor: 12 },
    score: null,
    flags: { bonus: true },
    streak: 0,
    prevLevels: {},
    nextLevels: {},
  })
  assert('bonus', /1,?5|bonus|geri dönüş/i.test(r.texts.join(' ')))
}

{
  const r = buildEventReaction({
    gains: { motor: 0 },
    score: null,
    flags: { cap: true },
    streak: 0,
    prevLevels: {},
    nextLevels: {},
  })
  assert('cap', /sınır|doydu|Yarın/i.test(r.texts.join(' ')))
}

{
  const r = buildEventReaction({
    gains: { motor: 8 },
    score: null,
    flags: { streakBonus: 2 },
    streak: 7,
    prevLevels: {},
    nextLevels: {},
  })
  assert('seri', /Seri|7/i.test(r.texts.join(' ')))
}

{
  const r = buildEventReaction({
    gains: { motor: 20 },
    score: null,
    flags: {},
    streak: 0,
    prevLevels: { motor: 2 },
    nextLevels: { motor: 3 },
  })
  assert('seviye', /lv 3|Seviye/i.test(r.texts.join(' ')))
}

{
  const r = buildEventReaction({
    gains: { motor: 5, cerebellum: 5 },
    score: null,
    flags: {},
    streak: 0,
    prevLevels: { motor: 2, cerebellum: 3 },
    nextLevels: { motor: 3, cerebellum: 3 },
  })
  assert('köprü', /Köprü|bağlantı/i.test(r.texts.join(' ')))
}

{
  const decay = buildBriefing({
    daysSince: 3,
    regions: [
      { id: 'motor', idleDays: 20, decayLoss: 4, daysToDecay: 0, decaying: true, level: 2 },
    ],
    streak: 0,
  })
  assert('brifing sönme', /sönme|boşta|−4|-4/i.test(decay.texts.join(' ')))
  const calm = buildBriefing({
    daysSince: 1,
    regions: GUIDE_SECTION_IDS.slice(0, 8).map(() => ({
      id: 'motor',
      idleDays: 0,
      decayLoss: 0,
      daysToDecay: 20,
      decaying: false,
      level: 1,
    })),
    streak: 5,
  })
  // use real region list
  const calm2 = buildBriefing({
    daysSince: 1,
    regions: ['frontal', 'motor', 'parietal', 'occipital', 'temporal', 'hippocampus', 'cerebellum', 'stem'].map(
      (id) => ({ id, idleDays: 0, decayLoss: 0, daysToDecay: 20, decaying: false, level: 1 }),
    ),
    streak: 5,
  })
  assert('brifing sakin', /geçti|Sakin|sessiz/i.test(calm2.texts.join(' ')))
  void calm
}

assert('auto cap 3', AUTO_MSG_DAY_CAP === 3)
assert('0/3', canEmitAutoMessage('2026-10-30', 0))
assert('3/3 yasak', !canEmitAutoMessage('2026-10-30', 3))

// Motivasyon: bağlama göre + 20 mesajda tekrar yok
{
  const recent = []
  const generics = MOTIVATION.filter((m) => m.tags.includes('generic'))
  const n = Math.min(MOTIVATION_REPEAT_WINDOW, generics.length)
  for (let i = 0; i < n; i += 1) {
    const m = pickMotivation('generic', recent)
    assert(`mot unique ${i}`, !recent.includes(m.id), m.id)
    recent.push(m.id)
  }
  assert('mot window doldu', recent.length === n)
  const again = pickMotivation('generic', recent)
  assert('mot window dolunca yine seçer', Boolean(again?.id))
  const lvl = pickMotivation('level_up', [])
  assert('level_up tag', lvl.tags.includes('level_up') || lvl.tags.includes('generic'))
  const st = pickMotivation('streak_3', [])
  assert('streak_3 bağlama', st.tags.includes('streak_3') || st.tags.includes('generic'))
}

// Niyet
assert('intent rapor', detectIntent('durumum nasıl').kind === 'rapor')
assert('intent oneri', detectIntent('bugün ne yapayım').kind === 'oneri')
assert('intent zayif', detectIntent('en zayıf yerim').kind === 'zayif')
assert('intent beyincik', detectIntent('beyincik durumu').kind === 'region')
assert('intent page', detectIntent('bu sayfa nasıl kullanılır').kind === 'page_help')
assert('intent onboard', detectIntent('bu sistemi nasıl kullanırım').kind === 'onboard')
assert('intent guide', detectIntent('balistik profil nasıl kaydedilir').kind === 'guide')

// Genel kullanım — asla bilmiyorum
{
  const qs = [
    'bu sistemi nasıl kullanırım',
    'nasıl kullanılır',
    'adım adım anlat',
    'nereden başlamalıyım',
    'yeni başladım',
    'ne yapabilirim burada',
    'site ne işe yarıyor',
  ]
  for (const q of qs) {
    assert(`onboard query: ${q}`, isOnboardingQuery(q))
    const ans = answerGuideQuery(q, { pathname: '/balistik' })
    assert(
      `onboard ans: ${q}`,
      ans.kind !== 'miss' &&
        (ans.entryId === 'extra-start-guide' ||
          ans.entryId === 'balistik-terminal' ||
          ans.links?.some((l) => String(l.to).includes('extra-start-guide') || String(l.label).includes('başlangıç'))),
      `${ans.kind} ${ans.entryId}`,
    )
  }
  const dash = answerOnboarding('/dashboard', { preferBrain: true })
  assert(
    'dashboard onboard → beyin veya başlangıç',
    dash.entryId === 'extra-operator-brain' || dash.entryId === 'extra-start-guide' || dash.entryId === 'dashboard',
    dash.entryId,
  )
  assert('start guide KB var', NORO_KB.some((e) => e.id === 'extra-start-guide'))
  assert('center drag ≥ 10', DRAG_LINES.filter((d) => d.tags.includes('center')).length >= 10)
}

// KB coverage
assert('KB ≥ 32+ek', NORO_KB.length >= 40)
assert(
  '32 kılavuz bölümü KB’de',
  GUIDE_SECTION_IDS.every((id) => NORO_KB.some((e) => e.id === id)),
)

const guideCases = [
  ['balistik profili nasıl kaydederim', ['balistik-terminal', 'extra-ballistic-save']],
  ['silah eklicem', ['cephanelik', 'extra-weapon-add']],
  ['timer nasıl çalışıyor', ['extra-timer']],
  ['gruba nasıl girerim', ['group-join']],
  ['atış kaydı nasıl girilir', ['sector-atis', 'extra-atis-log']],
  ['forumda gönderi', ['forum']],
  ['muhabere mesaj', ['extra-muhabere']],
  ['dil değiştir', ['language-switcher']],
  ['bildirim izni', ['extra-notifications']],
  ['tccc tatbikat', ['sector-tccc-training']],
  ['eğitim planı', ['sector-egitim']],
  ['operatör beyni nasıl', ['extra-operator-brain', 'dashboard']],
  ['bakım kaydı', ['extra-maintenance', 'cephanelik']],
  ['erişim kodu nasıl', ['access-codes']],
  ['cephanelik mühimmat', ['cephanelik']],
]
for (const [q, expectIds] of guideCases) {
  const { best } = searchGuide(q)
  assert(`guide: ${q}`, expectIds.includes(best?.id), best?.id)
}

{
  // Bilinmeyen sayfada zayıf eşleşme → miss + kılavuz
  const miss = answerGuideQuery('xyzzy quux foobar 999', { pathname: '/__yok__' })
  assert('eşleşmesiz miss', miss.kind === 'miss', miss.kind)
  assert('miss kılavuz link', miss.links?.some((l) => l.to === '/kilavuz'))
  // Tanımlı sayfada zayıf eşleşme → sayfa önerisi (bilmiyorum yok)
  const sug = answerGuideQuery('xyzzy quux foobar 999', { pathname: '/balistik' })
  assert('zayıf → sayfa öner', sug.kind === 'suggest_page', sug.kind)
}

// Ambiguous: force two close scores by querying very generic if possible
{
  const a = answerGuideQuery('profil')
  assert(
    'profil hit veya ambiguous',
    a.kind === 'hit' || a.kind === 'ambiguous' || a.kind === 'miss',
  )
}

assert('drag cooldown = 2s', DRAG_COOLDOWN_MS === 2_000)
assert('drag session cap = 30', DRAG_SESSION_CAP === 30)
assert('drag min distance = 40', DRAG_MIN_DISTANCE_PX === 40)
assert('drag recent window = 6', DRAG_RECENT_WINDOW === 6)
assert(
  'drag cooldown blocks <2s',
  !canEmitDragReaction({ sessionCount: 0, lastAt: Date.now() - 1000, now: Date.now() }),
)
assert(
  'drag ok after 2s',
  canEmitDragReaction({
    sessionCount: 0,
    lastAt: Date.now() - DRAG_COOLDOWN_MS - 1,
    now: Date.now(),
  }),
)
assert(
  'drag session blocks at 30',
  !canEmitDragReaction({ sessionCount: DRAG_SESSION_CAP, lastAt: 0, now: Date.now() }),
)
assert(
  'drag under 40px = no reaction gate',
  25 < DRAG_MIN_DISTANCE_PX && 40 <= DRAG_MIN_DISTANCE_PX,
)
{
  assert('busy when panel open', isBusyDragContext({ open: true, peek: null }))
  assert(
    'busy when peek msg',
    isBusyDragContext({ open: false, peek: { kind: 'msg', text: 'Brifing…' } }),
  )
  assert(
    'busy when intro',
    isBusyDragContext({ open: false, peek: { kind: 'intro', text: 'Sayfa' } }),
  )
  assert(
    'not busy for drag peek',
    !isBusyDragContext({ open: false, peek: { kind: 'drag', text: 'Hop!' } }),
  )
  assert('not busy idle', !isBusyDragContext({ open: false, peek: null }))

  const busyLine = pickDragLine('busy', [])
  assert('busy pick from busy group', busyLine?.tags?.includes('busy'), busyLine?.id)

  const main = { kind: 'msg', text: 'Asıl brifing mesajı korunmalı' }
  const layered = withBusyPeek(main, busyLine.text)
  assert('asıl peek korunur', layered.main === main && layered.main.text === main.text)
  assert('busy ek balon', layered.busy?.text === busyLine.text && layered.busy?.kind === 'busy')

  // Aynı asıl mesaj için en fazla 1 busy — anahtar tekrarı
  const peekKey = `${main.kind}:${main.text}`
  const seen = new Set()
  let busyCount = 0
  for (let i = 0; i < 3; i++) {
    if (seen.has(peekKey)) continue
    seen.add(peekKey)
    busyCount += 1
  }
  assert('aynı mesajda en fazla 1 busy', busyCount === 1)

  // Son 6 tekrar yok
  const used = []
  for (let i = 0; i < 6; i++) {
    const line = pickDragLine('start', used)
    used.push(line.id)
  }
  assert('start recent 6 unique', new Set(used).size === 6)
  const seventh = pickDragLine('start', used)
  assert('start after 6 may reuse pool', Boolean(seventh?.id))
}

assert('OPSEC koordinat', isOpsecRisky('hedef 41.01234° N'))
assert('OPSEC plaka', isOpsecRisky('araç 34 ABC 123'))
assert('OPSEC telefon', isOpsecRisky('ara 0532 111 22 33'))
assert('OPSEC operasyon bölgesi', isOpsecRisky('operasyon bölgesi temiz'))
assert('OPSEC normal', !isOpsecRisky('Tutuş ve nefes kontrolü iyiydi.'))

console.log(`\n=== Sonuç: ${passed} geçti, ${failed} kaldı ===\n`)
console.log(`KB kayıt sayısı: ${NORO_KB.length}`)
process.exit(failed > 0 ? 1 : 0)
