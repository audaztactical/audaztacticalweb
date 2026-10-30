/**
 * --triggers-only seed sonrası senaryo 1–4 (puanlama yalnızca CF tetikleyicileri).
 * node scripts/neural-triggers-verify.mjs
 */

import { createRequire } from 'module'
import { spawnSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const require = createRequire(path.join(root, 'functions', 'package.json'))

process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080'
process.env.FIREBASE_AUTH_EMULATOR_HOST =
  process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099'

const { initializeApp, getApps } = require('firebase-admin/app')
const { getAuth } = require('firebase-admin/auth')
const { getFirestore, Timestamp } = require('firebase-admin/firestore')
const { applyDecay } = require('../functions/lib/neural/neuralEngine.js')
const { NEURAL_SOURCES } = require('../functions/lib/neural/neuralConfig.js')
const { runNeuralBackfillForUser } = require('../functions/lib/neuralBackfill.js')
const { eventKeyFor, isTacticalSessionComplete } = require('../functions/lib/neuralProcess.js')

if (!getApps().length) initializeApp({ projectId: 'audaz-web' })
const auth = getAuth()
const db = getFirestore()
const SEED_EMAIL = 'neural-seed@test.local'

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
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function waitForState(uid, minEvents = 1, timeoutMs = 60_000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const snap = await db.collection('users').doc(uid).collection('neural').doc('state').get()
    if (snap.exists && Number(snap.data()?.eventCount || 0) >= minEvents) {
      return { data: snap.data(), waitedMs: Date.now() - start }
    }
    await sleep(1000)
  }
  return { data: null, waitedMs: timeoutMs }
}

async function waitForEvent(uid, source, docId, timeoutMs = 30_000) {
  const key = eventKeyFor(source, docId)
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const snap = await db.collection('users').doc(uid).collection('neural_events').doc(key).get()
    if (snap.exists) return true
    await sleep(500)
  }
  return false
}

async function main() {
  console.log('\n=== neural-triggers-verify (--triggers-only) ===\n')

  spawnSync(process.execPath, [path.join(__dirname, 'sync-neural-engine.mjs')], {
    cwd: root,
    stdio: 'inherit',
  })
  spawnSync(process.execPath, [path.join(__dirname, 'neural-emulator-seed.mjs'), '--triggers-only'], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  })

  const uid = (await auth.getUserByEmail(SEED_EMAIL)).uid
  console.log('\n(poll) neural/state + seed_timer_std event (max 60s)…')
  const { data: early, waitedMs: waitedEarly } = await waitForState(uid, 1, 60_000)
  assert(`state oluştu (bekleme ${waitedEarly}ms)`, !!early)
  if (!early) {
    console.log(`\n=== Sonuç: ${passed} geçti, ${failed} kaldı ===\n`)
    process.exit(1)
  }
  const timerReady = await waitForEvent(uid, NEURAL_SOURCES.TACTICAL_SESSIONS, 'seed_timer_std', 60_000)
  assert('seed_timer_std event (tetikleyici)', timerReady)
  // Seed ~15 olay; tetikleyiciler tamamlanana kadar bekle (min 14 + 3 tur sabit)
  let settled = early
  {
    const seedTargets = [
      [NEURAL_SOURCES.RANGE_LOGS, 'seed_atis_late'],
      [NEURAL_SOURCES.ACTIVITY_EVENTS, 'BCALC_seed1'],
      [NEURAL_SOURCES.TRAININGS, 'seed_train_1'],
      [NEURAL_SOURCES.BALLISTIC_PROFILES, 'seed_bal_1'],
      [NEURAL_SOURCES.FORUM_POSTS, 'seed_forum_1'],
      [NEURAL_SOURCES.TACTICAL_SESSIONS, 'seed_timer_dry'],
    ]
    for (const [src, id] of seedTargets) {
      const ok = await waitForEvent(uid, src, id, 45_000)
      if (!ok) console.warn(`[settle] timeout ${src}__${id}`)
    }
    let last = 0
    let stableRounds = 0
    for (let i = 0; i < 30 && stableRounds < 3; i += 1) {
      await sleep(1000)
      const snap = await db.collection('users').doc(uid).collection('neural').doc('state').get()
      settled = snap.data() || settled
      const n = Number(settled.eventCount || 0)
      if (n === last && n >= 14) stableRounds += 1
      else {
        last = n
        stableRounds = n >= 14 ? 1 : 0
      }
    }
    console.log(`[settle] eventCount=${last}`)
  }

  console.log('\n(1) Seed sonrası state ≡ backfill dry motor')
  {
    const dry = await runNeuralBackfillForUser(uid, { dryRun: true })
    const view = applyDecay(settled, Date.now())
    assert(
      'totalLevel yakın',
      Math.abs(Number(view.totalLevel) - Number(dry.totalLevel)) <= 2,
      `${view.totalLevel} vs ${dry.totalLevel}`,
    )
    assert('motor base > 0', Number(settled.regions?.motor?.base) > 0)
    assert('cerebellum base > 0', Number(settled.regions?.cerebellum?.base) > 0)
    assert('eventCount >= 10 (tetikleyici)', Number(settled.eventCount) >= 10)
  }

  console.log('\n(2) Çift işlem yok (aynı seans tekrar yazımı → tetikleyici)')
  {
    const before = await db.collection('users').doc(uid).collection('neural').doc('state').get()
    const beforeCount = Number(before.data()?.eventCount || 0)
    const payload = {
      mode: 'standard-shot',
      ownerId: uid,
      userId: uid,
      shotTimesMs: [1200, 2100, 3000],
      summary: { shotCount: 3, avgSplitMs: 900 },
      status: 'active',
      touch: Date.now(),
    }
    await db
      .collection('users')
      .doc(uid)
      .collection('tacticalSessions')
      .doc('seed_timer_std')
      .set(payload, { merge: true })
    await sleep(5000)
    const after = await db.collection('users').doc(uid).collection('neural').doc('state').get()
    const afterCount = Number(after.data()?.eventCount || 0)
    assert('eventCount artmadı', afterCount === beforeCount, `${beforeCount} → ${afterCount}`)
    const ev = await db
      .collection('users')
      .doc(uid)
      .collection('neural_events')
      .doc(eventKeyFor(NEURAL_SOURCES.TACTICAL_SESSIONS, 'seed_timer_std'))
      .get()
    assert('timer event tek doküman', ev.exists)
  }

  console.log('\n(3) Yarım timer puan almaz; tamamlanınca alır (tetikleyici)')
  {
    const halfId = 'trig_half_' + Date.now()
    await db.collection('users').doc(uid).collection('tacticalSessions').doc(halfId).set({
      mode: 'standard-shot',
      ownerId: uid,
      userId: uid,
      shotTimesMs: [],
      createdAt: Timestamp.now(),
      status: 'active',
    })
    await sleep(2500)
    let ev = await db
      .collection('users')
      .doc(uid)
      .collection('neural_events')
      .doc(eventKeyFor(NEURAL_SOURCES.TACTICAL_SESSIONS, halfId))
      .get()
    assert('yarım seans event yok', !ev.exists)
    assert(
      'helper yarımı reddeder',
      !isTacticalSessionComplete({ mode: 'standard-shot', shotTimesMs: [] }),
    )

    await db.collection('users').doc(uid).collection('tacticalSessions').doc(halfId).set(
      {
        shotTimesMs: [500, 1000],
        summary: { shotCount: 2 },
      },
      { merge: true },
    )
    const ok = await waitForEvent(uid, NEURAL_SOURCES.TACTICAL_SESSIONS, halfId, 30_000)
    assert('tamamlanınca event var (tetikleyici)', ok)
  }

  console.log('\n(4) Geç gelen kayıt rebuild (tetikleyici)')
  {
    const before = await db.collection('users').doc(uid).collection('neural').doc('state').get()
    const lateId = 'trig_late_' + Date.now()
    const oldTs = Date.parse('2025-01-01T12:00:00+03:00')
    await db.collection('range_logs').doc(uid).collection('entries').doc(lateId).set({
      kind: 'ATIS_DRILL',
      operationCategory: 'atis',
      accuracy: 50,
      timestamp: Timestamp.fromMillis(oldTs),
      ownerId: uid,
    })
    const ok = await waitForEvent(uid, NEURAL_SOURCES.RANGE_LOGS, lateId, 45_000)
    assert('geç olay event yazıldı', ok)
    const after = await db.collection('users').doc(uid).collection('neural').doc('state').get()
    assert('state güncellendi', after.exists)
    assert(
      'eventCount arttı',
      Number(after.data()?.eventCount) > Number(before.data()?.eventCount || 0),
    )
  }

  // Seed tccc_logs / forum reply yazmaz — log kapsamı için birer kayıt
  console.log('\n(kapsam) tccc_logs + forum reply tetikleyicileri')
  {
    const tcccId = 'trig_tccc_' + Date.now()
    await db.collection('tccc_logs').doc(uid).collection('entries').doc(tcccId).set({
      kind: 'TCCC_OBSERVED_EVAL',
      operationCategory: 'tccc',
      overallScore: 7,
      timestamp: Timestamp.now(),
      ownerId: uid,
    })
    const tcccOk = await waitForEvent(uid, NEURAL_SOURCES.TCCC_LOGS, tcccId, 30_000)
    assert('neuralOnTcccLogCreated', tcccOk)

    const replyId = 'trig_reply_' + Date.now()
    await db.collection('forum_posts').doc('seed_forum_1').collection('replies').doc(replyId).set({
      authorId: uid,
      timestamp: Timestamp.now(),
      body: 'x',
    })
    const replyKey = `seed_forum_1_${replyId}`
    const replyOk = await waitForEvent(uid, NEURAL_SOURCES.FORUM_REPLIES, replyKey, 30_000)
    assert('neuralOnForumReplyCreated', replyOk)
  }

  console.log(`\n=== Sonuç: ${passed} geçti, ${failed} kaldı ===\n`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
