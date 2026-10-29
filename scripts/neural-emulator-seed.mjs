/**
 * Emülatöre anonim test kullanıcısı + örnek neural kaynak kayıtları yazar.
 * Önkoşul: firebase emulators (auth+firestore+functions) çalışıyor olmalı.
 *
 * node scripts/neural-emulator-seed.mjs
 * node scripts/neural-emulator-seed.mjs --triggers-only
 *   → yalnızca Firestore yazımı; processNeuralEvent çağrılmaz (puanlamayı CF tetikleyicileri yapar)
 */

import { createRequire } from 'module'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(path.join(__dirname, '..', 'functions', 'package.json'))

process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080'
process.env.FIREBASE_AUTH_EMULATOR_HOST =
  process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099'

const TRIGGERS_ONLY = process.argv.includes('--triggers-only')

const { initializeApp, getApps } = require('firebase-admin/app')
const { getAuth } = require('firebase-admin/auth')
const { getFirestore, Timestamp, FieldValue } = require('firebase-admin/firestore')
const { NEURAL_SOURCES } = require('../functions/lib/neural/neuralConfig.js')

/** @type {((uid: string, source: string, docId: string, data: object) => Promise<unknown>)|null} */
let runProcess = null
if (!TRIGGERS_ONLY) {
  const { processNeuralEvent } = require('../functions/lib/neuralProcess.js')
  runProcess = (uid, source, docId, data) => processNeuralEvent(uid, source, docId, data)
}

if (!getApps().length) {
  initializeApp({ projectId: 'audaz-web' })
}

const auth = getAuth()
const db = getFirestore()
const SEED_EMAIL = 'neural-seed@test.local'
const SEED_PASS = 'neural-seed-pass-1'
const t0 = Date.parse('2026-05-10T10:00:00+03:00')

function enqueue(jobs, fn) {
  if (TRIGGERS_ONLY || !runProcess) return
  jobs.push(fn)
}

async function ensureUser() {
  try {
    const u = await auth.getUserByEmail(SEED_EMAIL)
    return u.uid
  } catch {
    const u = await auth.createUser({
      email: SEED_EMAIL,
      password: SEED_PASS,
      emailVerified: true,
    })
    return u.uid
  }
}

async function main() {
  const uid = await ensureUser()
  console.log(
    `[seed] uid (truncated)= ${uid.slice(0, 8)} mode=${TRIGGERS_ONLY ? 'triggers-only' : 'direct-process'}`,
  )

  await db.collection('users').doc(uid).set(
    {
      email: SEED_EMAIL,
      callsign: 'SEED-OP',
      role: 'operator',
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  )

  const ts = (ms) => Timestamp.fromMillis(ms)

  const jobs = []

  // ATIŞ
  const atis1 = {
    kind: 'ATIS_DRILL',
    operationCategory: 'atis',
    accuracy: 90,
    timestamp: ts(t0),
    ownerId: uid,
  }
  await db.collection('range_logs').doc(uid).collection('entries').doc('seed_atis_1').set(atis1)
  enqueue(jobs, () => runProcess(uid, NEURAL_SOURCES.RANGE_LOGS, 'seed_atis_1', atis1))

  const cqb1 = {
    kind: 'CQB_DRILL',
    operationCategory: 'cqb',
    successPercent: 85,
    timestamp: ts(t0 + 3600_000),
    ownerId: uid,
  }
  await db.collection('range_logs').doc(uid).collection('entries').doc('seed_cqb_1').set(cqb1)
  enqueue(jobs, () => runProcess(uid, NEURAL_SOURCES.RANGE_LOGS, 'seed_cqb_1', cqb1))

  const fof1 = {
    kind: 'FOF_DRILL',
    operationCategory: 'fof',
    successPercent: 70,
    timestamp: ts(t0 + 7200_000),
    ownerId: uid,
  }
  await db.collection('range_logs').doc(uid).collection('entries').doc('seed_fof_1').set(fof1)
  enqueue(jobs, () => runProcess(uid, NEURAL_SOURCES.RANGE_LOGS, 'seed_fof_1', fof1))

  const vbssD = {
    kind: 'VBSS_DRILL',
    operationCategory: 'vbss',
    successPercent: 80,
    timestamp: ts(t0 + 10_800_000),
    ownerId: uid,
  }
  await db.collection('range_logs').doc(uid).collection('entries').doc('seed_vbss_drill').set(vbssD)
  enqueue(jobs, () => runProcess(uid, NEURAL_SOURCES.RANGE_LOGS, 'seed_vbss_drill', vbssD))

  const vbssO = {
    kind: 'VBSS_OBSERVED_EVAL',
    operationCategory: 'vbss',
    overallScore: 8,
    timestamp: ts(t0 + 14_400_000),
    ownerId: uid,
  }
  await db.collection('vbss_logs').doc(uid).collection('entries').doc('seed_vbss_obs').set(vbssO)
  enqueue(jobs, () => runProcess(uid, NEURAL_SOURCES.VBSS_LOGS, 'seed_vbss_obs', vbssO))

  const tccc1 = {
    kind: 'TCCC_DRILL',
    operationCategory: 'tccc',
    casevacSim: true,
    successPercent: 75,
    timestamp: ts(t0 + 18_000_000),
    ownerId: uid,
  }
  await db.collection('range_logs').doc(uid).collection('entries').doc('seed_tccc_sim').set(tccc1)
  enqueue(jobs, () => runProcess(uid, NEURAL_SOURCES.RANGE_LOGS, 'seed_tccc_sim', tccc1))

  // Timer incomplete then complete (standard)
  const sessId = 'seed_timer_std'
  await db.collection('users').doc(uid).collection('tacticalSessions').doc(sessId).set({
    mode: 'standard-shot',
    ownerId: uid,
    userId: uid,
    shotTimesMs: [],
    createdAt: ts(t0 + 20_000_000),
    status: 'active',
  })
  const sessComplete = {
    mode: 'standard-shot',
    ownerId: uid,
    userId: uid,
    shotTimesMs: [1200, 2100, 3000],
    summary: { shotCount: 3, avgSplitMs: 900 },
    createdAt: ts(t0 + 20_000_000),
    status: 'active',
  }
  await db.collection('users').doc(uid).collection('tacticalSessions').doc(sessId).set(sessComplete, {
    merge: true,
  })
  enqueue(jobs, () => runProcess(uid, NEURAL_SOURCES.TACTICAL_SESSIONS, sessId, sessComplete))

  const dry = {
    mode: 'dry-fire',
    ownerId: uid,
    userId: uid,
    shotTimesMs: [800, 1500],
    hits: [{ t: 800 }, { t: 1500 }],
    timingSummary: { reactionMs: 800, shotCount: 2 },
    createdAt: ts(t0 + 22_000_000),
    status: 'active',
  }
  await db.collection('users').doc(uid).collection('tacticalSessions').doc('seed_timer_dry').set(dry)
  enqueue(jobs, () => runProcess(uid, NEURAL_SOURCES.TACTICAL_SESSIONS, 'seed_timer_dry', dry))

  const train = {
    kind: 'TRAINING_PLAN',
    ownerId: uid,
    userId: uid,
    createdAt: ts(t0 + 24_000_000),
    title: 'Seed plan',
  }
  await db.collection('trainings').doc('seed_train_1').set(train)
  enqueue(jobs, () => runProcess(uid, NEURAL_SOURCES.TRAININGS, 'seed_train_1', train))

  const bal = {
    profileName: 'Seed Profile',
    createdAt: ts(t0 + 26_000_000),
    ownerId: uid,
  }
  await db.collection('ballistic_profiles').doc(uid).collection('profiles').doc('seed_bal_1').set(bal)
  enqueue(jobs, () => runProcess(uid, NEURAL_SOURCES.BALLISTIC_PROFILES, 'seed_bal_1', bal))

  const forum = {
    authorId: uid,
    title: 'Seed',
    timestamp: ts(t0 + 28_000_000),
  }
  await db.collection('forum_posts').doc('seed_forum_1').set(forum)
  enqueue(jobs, () =>
    runProcess(uid, NEURAL_SOURCES.FORUM_POSTS, 'seed_forum_1', {
      authorId: uid,
      timestamp: forum.timestamp,
    }),
  )

  const intel = {
    type: 'INTEL_READ',
    refId: 'seed-news-1',
    createdAt: Timestamp.fromMillis(t0 + 30_000_000),
  }
  await db.collection('users').doc(uid).collection('activity_events').doc('INTEL_seed1').set(intel)
  enqueue(jobs, () =>
    runProcess(uid, NEURAL_SOURCES.ACTIVITY_EVENTS, 'INTEL_seed1', {
      ...intel,
      timestamp: intel.createdAt,
    }),
  )

  const guide = {
    type: 'GUIDE_READ',
    refId: 'platform-intro',
    createdAt: Timestamp.fromMillis(t0 + 31_000_000),
  }
  await db.collection('users').doc(uid).collection('activity_events').doc('GUIDE_seed1').set(guide)
  enqueue(jobs, () =>
    runProcess(uid, NEURAL_SOURCES.ACTIVITY_EVENTS, 'GUIDE_seed1', {
      ...guide,
      timestamp: guide.createdAt,
    }),
  )

  const bcalc = {
    type: 'BALLISTIC_CALC',
    refId: 'calc_1',
    createdAt: Timestamp.fromMillis(t0 + 32_000_000),
  }
  await db.collection('users').doc(uid).collection('activity_events').doc('BCALC_seed1').set(bcalc)
  enqueue(jobs, () =>
    runProcess(uid, NEURAL_SOURCES.ACTIVITY_EVENTS, 'BCALC_seed1', {
      ...bcalc,
      timestamp: bcalc.createdAt,
    }),
  )

  // Late event (out of order) — older ATIS
  const late = {
    kind: 'ATIS_DRILL',
    operationCategory: 'atis',
    accuracy: 60,
    timestamp: ts(t0 - 86_400_000),
    ownerId: uid,
  }
  await db.collection('range_logs').doc(uid).collection('entries').doc('seed_atis_late').set(late)

  if (!TRIGGERS_ONLY) {
    for (const job of jobs) {
      await job()
    }
    await runProcess(uid, NEURAL_SOURCES.RANGE_LOGS, 'seed_atis_late', late)
    console.log('[seed] yazıldı + processNeuralEvent uygulandı.')
  } else {
    console.log('[seed] yazıldı (triggers-only — processNeuralEvent çağrılmadı).')
  }
  console.log(JSON.stringify({ seedEmail: SEED_EMAIL, uidPrefix: uid.slice(0, 8), triggersOnly: TRIGGERS_ONLY }))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
