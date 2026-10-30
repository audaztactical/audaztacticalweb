/**
 * Operatör Beyni — Node öz-test (bağımlılıksız).
 * Çalıştır: node scripts/neural-selftest.mjs
 */

import {
  ACTIVITY_RULES,
  DAILY_CAP,
  FLOOR_RATIO,
  GRACE_DAYS,
  LEVEL_THRESHOLDS,
  MAX_XP,
  NEURAL_SOURCES,
  RETURN_BONUS,
} from '../src/lib/neural/neuralConfig.js'
import {
  applyDecay,
  applyEvent,
  classifyLegacyRangeLog,
  computeNeuralState,
  decayXp,
  emptyStoredState,
  istanbulDayKey,
  levelForXp,
  normalizeEvent,
  rebuildState,
  scoreAdjustedGain,
  xpToNextLevel,
} from '../src/lib/neural/neuralEngine.js'
import { createRequire } from 'module'
import { spawnSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

let passed = 0
let failed = 0

/**
 * @param {string} name
 * @param {boolean} cond
 * @param {string} [detail]
 */
function assert(name, cond, detail = '') {
  if (cond) {
    passed += 1
    console.log(`  ✓ ${name}`)
  } else {
    failed += 1
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

function approx(a, b, eps = 0.05) {
  return Math.abs(a - b) <= eps
}

console.log('\n=== Operatör Beyni neural-selftest ===\n')

// --- (1) tek ATIS_DRILL skor 90 → doğru dağılım ---
console.log('(1) ATIS_DRILL skor 90 dağılımı')
{
  const base = ACTIVITY_RULES.ATIS_DRILL.baseXp
  const gain = scoreAdjustedGain(base, 90)
  const expectedGain = base * (0.55 + 0.9 * 0.6)
  assert('gain formülü', approx(gain, expectedGain), `${gain} vs ${expectedGain}`)

  const t0 = Date.parse('2026-03-01T12:00:00+03:00')
  const { event } = normalizeEvent(NEURAL_SOURCES.RANGE_LOGS, {
    id: 'a1',
    kind: 'ATIS_DRILL',
    operationCategory: 'atis',
    accuracy: 90,
    timestamp: t0,
  })
  assert('normalize ATIS', event?.type === 'ATIS_DRILL' && event.score === 90)

  const state = computeNeuralState(event ? [event] : [], t0 + 1000)
  const motorXp = state.regions.motor.xp
  const expectedMotor = gain * ACTIVITY_RULES.ATIS_DRILL.weights.motor
  assert('motor payı', approx(motorXp, expectedMotor), `${motorXp} vs ${expectedMotor}`)
  const frontalXp = state.regions.frontal.xp
  assert('frontal payı', approx(frontalXp, gain * 0.1), `${frontalXp}`)
  const sum =
    state.regions.motor.xp +
    state.regions.cerebellum.xp +
    state.regions.occipital.xp +
    state.regions.frontal.xp
  assert('ağırlık toplamı ≈ gain', approx(sum, gain), `${sum} vs ${gain}`)
}

// --- (2) aynı gün 10 kayıt → günlük tavan ---
console.log('\n(2) Günlük tavan (DAILY_CAP)')
{
  const t0 = Date.parse('2026-03-05T10:00:00+03:00')
  /** @type {import('../src/lib/neural/neuralEngine.js').NeuralEvent[]} */
  const events = []
  for (let i = 0; i < 10; i += 1) {
    events.push({
      id: `cap-${i}`,
      source: NEURAL_SOURCES.RANGE_LOGS,
      type: 'ATIS_DRILL',
      ts: t0 + i * 60_000,
      score: 100,
    })
  }
  const state = computeNeuralState(events, t0 + 3600_000)
  assert('motor ≤ DAILY_CAP', state.regions.motor.xp <= DAILY_CAP + 0.001, `xp=${state.regions.motor.xp}`)
  const anyCap = state.eventLog.some((e) => e.hitDailyCap === true)
  assert('en az bir olay tavana takıldı', anyCap)
}

// --- (3) 60 gün boşluk → sönme, taban ≥ 40% peak ---
console.log('\n(3) Sönme (60 gün boşluk)')
{
  const t0 = Date.parse('2026-01-01T12:00:00+03:00')
  const events = [
    {
      id: 'd1',
      source: NEURAL_SOURCES.RANGE_LOGS,
      type: 'ATIS_DRILL',
      ts: t0,
      score: 100,
    },
  ]
  const after = computeNeuralState(events, t0 + 1000)
  const peak = after.regions.motor.peak
  const baseXp = after.regions.motor.xp
  assert('peak > 0', peak > 0)

  const later = t0 + 60 * 86_400_000
  const decayed = computeNeuralState(events, later)
  const eff = decayed.regions.motor.effectiveXp
  const floor = FLOOR_RATIO * peak
  const grace = GRACE_DAYS.motor
  assert('60g > grace', 60 > grace)
  assert('sönme başladı (effective < base)', eff < baseXp - 0.01, `eff=${eff} base=${baseXp}`)
  assert('floor altına inmedi', eff >= floor - 0.01, `eff=${eff} floor=${floor}`)
  assert('decaying true', decayed.regions.motor.decaying === true)

  const manual = decayXp(baseXp, peak, 60, grace)
  assert('applyDecay uyumu', approx(eff, manual), `${eff} vs ${manual}`)
}

// --- (4) sönmeden sonra kayıt → 1.5 kat bonus ---
console.log('\n(4) Geri dönüş bonusu')
{
  const t0 = Date.parse('2026-01-01T12:00:00+03:00')
  const tReturn = t0 + 60 * 86_400_000
  const events = [
    { id: 'b1', source: 'range_logs', type: 'ATIS_DRILL', ts: t0, score: 100 },
    { id: 'b2', source: 'range_logs', type: 'ATIS_DRILL', ts: tReturn, score: 100 },
  ]
  const state = computeNeuralState(events, tReturn + 1000)
  const log2 = state.eventLog.find((e) => e.id === 'b2')
  assert('ikinci olayda returnBonus', log2?.returnBonus === true)
  const raw = scoreAdjustedGain(ACTIVITY_RULES.ATIS_DRILL.baseXp, 100) * 0.6
  const motorGain = log2?.gains?.motor ?? 0
  assert(
    'motor kazancı ≈ 1.5× (tavan yoksa)',
    motorGain > raw * 1.2 || log2?.hitDailyCap === true,
    `gain=${motorGain} raw=${raw} bonusFactor≈${motorGain / raw}`,
  )
  if (!log2?.hitDailyCap) {
    assert('RETURN_BONUS çarpanı', approx(motorGain / raw, RETURN_BONUS, 0.15), `${motorGain / raw}`)
  }
}

// --- (5) 3 ardışık gün → seri + hippocampus ---
console.log('\n(5) Streak + hippocampus')
{
  const d1 = Date.parse('2026-04-01T12:00:00+03:00')
  const d2 = Date.parse('2026-04-02T12:00:00+03:00')
  const d3 = Date.parse('2026-04-03T12:00:00+03:00')
  assert('gün anahtarları ardışık', istanbulDayKey(d2) !== istanbulDayKey(d1))
  const events = [
    { id: 's1', source: 'range_logs', type: 'ATIS_DRILL', ts: d1, score: 80 },
    { id: 's2', source: 'range_logs', type: 'ATIS_DRILL', ts: d2, score: 80 },
    { id: 's3', source: 'range_logs', type: 'ATIS_DRILL', ts: d3, score: 80 },
  ]
  const state = computeNeuralState(events, d3 + 1000)
  assert('streak ≥ 3', state.streak >= 3, `streak=${state.streak}`)
  assert('hippocampus > 0', state.regions.hippocampus.xp > 0, `xp=${state.regions.hippocampus.xp}`)
  const withStreakBonus = state.eventLog.filter((e) => (e.streakBonus ?? 0) > 0)
  assert('streakBonus uygulandı', withStreakBonus.length >= 1)
}

// --- (6) bilinmeyen tip → ignored ---
console.log('\n(6) Bilinmeyen tip ignored')
{
  const { event, ignored } = normalizeEvent(NEURAL_SOURCES.RANGE_LOGS, {
    id: 'x',
    kind: 'UNKNOWN_WIDGET',
    operationCategory: 'space',
    timestamp: Date.now(),
  })
  assert('event null', event == null)
  assert('ignored reason', ignored?.reason === 'unmapped_range_log', ignored?.reason)
  assert('fieldNames mevcut', Array.isArray(ignored?.fieldNames) && ignored.fieldNames.length > 0)
}

// --- (a) medevac_logs artık kaynak değil ---
console.log('\n(a) medevac_logs kaynak dışı')
{
  assert('NEURAL_SOURCES.MEDEVAC_LOGS yok', !('MEDEVAC_LOGS' in NEURAL_SOURCES))
  assert('MEDEVAC_SIM unused', ACTIVITY_RULES.MEDEVAC_SIM?.unused === true)
  const { event, ignored } = normalizeEvent('medevac_logs', {
    id: 'm1',
    medevacSim: true,
    successPercent: 90,
    timestamp: Date.now(),
  })
  assert('medevac_logs → unknown_source', event == null && ignored?.reason === 'unknown_source')
}

// --- (b) VBSS_DRILL doğru dağılıyor ---
console.log('\n(b) VBSS_DRILL dağılımı')
{
  const t0 = Date.parse('2026-05-01T12:00:00+03:00')
  const { event } = normalizeEvent(NEURAL_SOURCES.RANGE_LOGS, {
    id: 'v1',
    kind: 'VBSS_DRILL',
    operationCategory: 'vbss',
    successPercent: 80,
    timestamp: t0,
  })
  assert('normalize VBSS_DRILL', event?.type === 'VBSS_DRILL' && event.score === 80)

  const rule = ACTIVITY_RULES.VBSS_DRILL
  const gain = scoreAdjustedGain(rule.baseXp, 80)
  const state = computeNeuralState(event ? [event] : [], t0 + 1000)
  assert('motor 0.50', approx(state.regions.motor.xp, gain * 0.5), `${state.regions.motor.xp}`)
  assert('frontal 0.30', approx(state.regions.frontal.xp, gain * 0.3), `${state.regions.frontal.xp}`)
  assert('parietal 0.20', approx(state.regions.parietal.xp, gain * 0.2), `${state.regions.parietal.xp}`)

  const { event: ev2 } = normalizeEvent(NEURAL_SOURCES.RANGE_LOGS, {
    id: 'v2',
    kind: 'VBSS_DRILL',
    operationCategory: 'vbss',
    overallScore: 7.5,
    timestamp: t0 + 1000,
  })
  assert('overallScore → 75', ev2?.score === 75, `score=${ev2?.score}`)
}

// --- (c) eski formatlı kayıt sınıflanıyor ---
console.log('\n(c) Legacy range_logs sınıflandırma')
{
  const t0 = Date.parse('2026-02-10T12:00:00+03:00')
  const legacyAtis = {
    id: 'leg-atis',
    roundsTotal: 30,
    hits: 24,
    accuracy: 80,
    shootType: 'Serbest',
    distanceM: 15,
    timestamp: t0,
  }
  assert('classifyLegacy → ATIS_DRILL', classifyLegacyRangeLog(legacyAtis) === 'ATIS_DRILL')
  const { event } = normalizeEvent(NEURAL_SOURCES.RANGE_LOGS, legacyAtis)
  assert('legacy event ATIS', event?.type === 'ATIS_DRILL' && event.legacy === true)
  assert('legacy score 80', event?.score === 80)

  const legacyCqb = {
    id: 'leg-cqb',
    roomTopology: 'L-şekli',
    entryMethod: 'dinamik',
    threatCount: 3,
    neutralizedCount: 3,
    successPercent: 88,
    timestamp: t0,
  }
  assert('classifyLegacy → CQB_DRILL', classifyLegacyRangeLog(legacyCqb) === 'CQB_DRILL')

  const junk = { id: 'junk', foo: 1, bar: 2, timestamp: t0 }
  const { event: eJunk, ignored: igJunk } = normalizeEvent(NEURAL_SOURCES.RANGE_LOGS, junk)
  assert('legacy_unclassified', eJunk == null && igJunk?.reason === 'legacy_unclassified')
}

// --- (d) LEVEL_THRESHOLDS sınırları ---
console.log('\n(d) LEVEL_THRESHOLDS')
{
  assert('thresholds uzunluk 10', LEVEL_THRESHOLDS.length === 10)
  assert('39 → lv1', levelForXp(39) === 1)
  assert('40 → lv2', levelForXp(40) === 2)
  assert('949 → lv9', levelForXp(949) === 9)
  assert('950 → lv10', levelForXp(950) === 10)
  assert('1000 → lv10', levelForXp(1000) === 10)
  assert('MAX_XP=1000', MAX_XP === 1000)
  assert('xpToNext(39)=1', approx(xpToNextLevel(39), 1))
  assert('xpToNext(950)=0', xpToNextLevel(950) === 0)
  assert('region.xpToNext alanı', (() => {
    const t0 = Date.parse('2026-06-01T12:00:00+03:00')
    const st = computeNeuralState(
      [{ id: 'lv', source: 'range_logs', type: 'ATIS_DRILL', ts: t0, score: 100 }],
      t0 + 1000,
    )
    return typeof st.regions.motor.xpToNext === 'number'
  })())
}

// --- (e) applyEvent / rebuildState / applyDecay eşliği ---
console.log('\n(e) applyEvent · rebuildState · applyDecay')
{
  const t0 = Date.parse('2026-03-01T12:00:00+03:00')
  const events = [
    { id: 'e1', source: 'range_logs', type: 'ATIS_DRILL', ts: t0, score: 90 },
    { id: 'e2', source: 'range_logs', type: 'CQB_DRILL', ts: t0 + 3600_000, score: 80 },
    { id: 'e3', source: 'activity_events', type: 'INTEL_READ', ts: t0 + 7200_000, score: null },
  ]
  const viaCompute = computeNeuralState(events, t0 + 86400_000)
  const rebuilt = rebuildState(events)
  const viaDecay = applyDecay(rebuilt.state, t0 + 86400_000)
  assert(
    'rebuild+applyDecay ≡ computeNeuralState (motor)',
    approx(viaCompute.regions.motor.effectiveXp, viaDecay.regions.motor.effectiveXp),
    `${viaCompute.regions.motor.effectiveXp} vs ${viaDecay.regions.motor.effectiveXp}`,
  )
  assert(
    'rebuild+applyDecay ≡ compute (occipital INTEL)',
    approx(viaCompute.regions.occipital.effectiveXp, viaDecay.regions.occipital.effectiveXp),
  )
  let incr = emptyStoredState()
  for (const ev of events) {
    incr = applyEvent(incr, ev).state
  }
  assert(
    'applyEvent zinciri ≡ rebuildState',
    approx(incr.regions.motor.base, rebuilt.state.regions.motor.base) &&
      incr.eventCount === rebuilt.state.eventCount,
  )
}

// --- (e2) AAR_ENTRY tip tavanı ---
console.log('\n(e2) AAR_ENTRY perDayTypeCap')
{
  assert('AAR_ENTRY perDayTypeCap=3', ACTIVITY_RULES.AAR_ENTRY?.perDayTypeCap === 3)
  const t0 = Date.parse('2026-10-30T10:00:00+03:00')
  let st = emptyStoredState()
  const gains = []
  for (let i = 0; i < 4; i += 1) {
    const r = applyEvent(st, {
      id: `aar_${i}`,
      source: NEURAL_SOURCES.ACTIVITY_EVENTS,
      type: 'AAR_ENTRY',
      ts: t0 + i * 1000,
      score: null,
    })
    st = r.state
    gains.push({
      frontal: Number(r.logEntry.gains?.frontal) || 0,
      capped: r.logEntry.cappedType === true,
    })
  }
  assert('ilk 3 AAR frontal > 0', gains[0].frontal > 0 && gains[1].frontal > 0 && gains[2].frontal > 0)
  assert('4. AAR capped / puan 0', gains[3].capped === true && gains[3].frontal === 0)
}

// --- (f) functions kopyası eşliği ---
console.log('\n(f) src ↔ functions/lib/neural kopya eşliği')
{
  const sync = spawnSync(process.execPath, [path.join(__dirname, 'sync-neural-engine.mjs')], {
    cwd: path.join(__dirname, '..'),
    encoding: 'utf8',
  })
  assert('sync:neural çıkış 0', sync.status === 0, sync.stderr || sync.stdout)

  const fnEngine = require('../functions/lib/neural/neuralEngine.js')
  const t0 = Date.parse('2026-04-15T12:00:00+03:00')
  const events = [
    { id: 'c1', source: 'range_logs', type: 'ATIS_DRILL', ts: t0, score: 85 },
    { id: 'c2', source: 'tacticalSessions', type: 'TIMER_STANDARD', ts: t0 + 1000, score: null },
  ]
  const a = computeNeuralState(events, t0 + 5000)
  const b = fnEngine.computeNeuralState(events, t0 + 5000)
  assert(
    'iki motor aynı totalLevel',
    a.totalLevel === b.totalLevel,
    `${a.totalLevel} vs ${b.totalLevel}`,
  )
  assert(
    'iki motor aynı motor.xp',
    approx(a.regions.motor.xp, b.regions.motor.xp),
    `${a.regions.motor.xp} vs ${b.regions.motor.xp}`,
  )
  assert(
    'iki motor aynı cerebellum.xp',
    approx(a.regions.cerebellum.xp, b.regions.cerebellum.xp),
  )
}

console.log(`\n=== Sonuç: ${passed} geçti, ${failed} kaldı ===\n`)
process.exit(failed > 0 ? 1 : 0)
