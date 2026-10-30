/**
 * Lazy init + fullBuild emülatör testleri.
 * Önkoşul: firebase emulators (auth, firestore, functions) — global CLI 15.
 *
 * node scripts/neural-lazy-init-test.mjs
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

spawnSync(process.execPath, [path.join(__dirname, 'sync-neural-engine.mjs')], {
  cwd: root,
  stdio: 'inherit',
})

const { initializeApp, getApps } = require('firebase-admin/app')
const { getAuth } = require('firebase-admin/auth')
const { getFirestore, Timestamp, FieldValue } = require('firebase-admin/firestore')
const {
  buildUserStateFromSources,
  ensureFullUserState,
  needsFullBuild,
} = require('../functions/lib/neuralBuild.js')
const { runNeuralEnsureForCaller } = require('../functions/lib/neuralEnsureState.js')
const { processNeuralEvent } = require('../functions/lib/neuralProcess.js')
const { NEURAL_SOURCES } = require('../functions/lib/neural/neuralConfig.js')

if (!getApps().length) initializeApp({ projectId: 'audaz-web' })
const auth = getAuth()
const db = getFirestore()

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

async function ensureUser(email) {
  try {
    return (await auth.getUserByEmail(email)).uid
  } catch {
    return (await auth.createUser({ email, password: 'lazy-init-pass-1', emailVerified: true }))
      .uid
  }
}

async function wipeNeural(uid) {
  for (let i = 0; i < 5; i += 1) {
    const evs = await db.collection('users').doc(uid).collection('neural_events').get()
    const batch = db.batch()
    evs.docs.forEach((d) => batch.delete(d.ref))
    batch.delete(db.collection('users').doc(uid).collection('neural').doc('state'))
    batch.delete(db.collection('users').doc(uid).collection('neural').doc('meta'))
    await batch.commit()
    await sleep(800)
    const st = await db.collection('users').doc(uid).collection('neural').doc('state').get()
    const ev2 = await db.collection('users').doc(uid).collection('neural_events').get()
    if (!st.exists && ev2.empty) return
  }
}

async function seedHistory(uid, n = 3) {
  for (let i = 1; i <= n; i += 1) {
    await db
      .collection('range_logs')
      .doc(uid)
      .collection('entries')
      .doc(`lazy_h${i}`)
      .set(
        {
          kind: 'ATIS_DRILL',
          operationCategory: 'atis',
          accuracy: 70 + i * 5,
          timestamp: Timestamp.fromMillis(Date.parse(`2026-05-0${i}T12:00:00+03:00`)),
          ownerId: uid,
        },
        { merge: true },
      )
  }
  await sleep(2000)
}

async function main() {
  console.log('\n=== neural-lazy-init-test ===\n')
  const uid = await ensureUser('lazy-init@test.local')
  console.log('uidPrefix', uid.slice(0, 8))

  await seedHistory(uid, 3)
  await wipeNeural(uid)

  console.log('\n(8) dry-run ≡ write build (aynı veri)')
  {
    const dry = await buildUserStateFromSources(uid, { dryRun: true })
    const wet = await buildUserStateFromSources(uid, { dryRun: false })
    assert('eventCount eşit', dry.eventCount === wet.eventCount, `${dry.eventCount} vs ${wet.eventCount}`)
    assert('totalLevel eşit', dry.totalLevel === wet.totalLevel, `${dry.totalLevel} vs ${wet.totalLevel}`)
    const st = await db.collection('users').doc(uid).collection('neural').doc('state').get()
    assert('fullBuild true', st.data()?.fullBuild === true)
    assert('fullBuildAt var', !!st.data()?.fullBuildAt)
    for (const id of Object.keys(dry.regionsBase || {})) {
      assert(
        `base ${id}`,
        Math.abs(Number(dry.regionsBase[id]) - Number(wet.regionsBase[id])) < 0.01,
      )
    }
  }

  console.log('\n(i) state yok + geçmiş → yeni kayıt tüm geçmişle kurar')
  {
    await wipeNeural(uid)
    await sleep(2500)
    await wipeNeural(uid)
    let before = await db.collection('users').doc(uid).collection('neural').doc('state').get()
    // Tetikleyici yarışı: varsa tekrar sil
    if (before.exists) {
      await wipeNeural(uid)
      await sleep(2000)
      before = await db.collection('users').doc(uid).collection('neural').doc('state').get()
    }
    assert('başlangıçta state yok', !before.exists)
    const hist = await db.collection('range_logs').doc(uid).collection('entries').get()
    assert('geçmiş >= 3', hist.size >= 3)

    // Doğrudan processNeuralEvent (tetikleyici yarışını azalt) — kayıt önce kaynakta
    await db.collection('range_logs').doc(uid).collection('entries').doc('lazy_new').set({
      kind: 'ATIS_DRILL',
      operationCategory: 'atis',
      accuracy: 88,
      timestamp: Timestamp.now(),
      ownerId: uid,
    })
    // State tetikleyici ile dolmuş olabilir; yoksa process çağır
    await sleep(1500)
    let stSnap = await db.collection('users').doc(uid).collection('neural').doc('state').get()
    if (!stSnap.exists || stSnap.data()?.fullBuild !== true) {
      await processNeuralEvent(uid, NEURAL_SOURCES.RANGE_LOGS, 'lazy_new', {
        kind: 'ATIS_DRILL',
        operationCategory: 'atis',
        accuracy: 88,
        timestamp: Timestamp.now(),
        ownerId: uid,
      })
      stSnap = await db.collection('users').doc(uid).collection('neural').doc('state').get()
    }
    const st = stSnap.exists ? stSnap.data() : null
    assert('state fullBuild', !!st && st.fullBuild === true)
    assert(
      'eventCount >= geçmiş+yeni',
      Number(st?.eventCount) >= 4,
      `got ${st?.eventCount}`,
    )
    const dry = await buildUserStateFromSources(uid, { dryRun: true })
    assert(
      'kurulum ≈ dry-run eventCount',
      Number(st?.eventCount) === dry.eventCount,
      `${st?.eventCount} vs ${dry.eventCount}`,
    )
  }

  console.log('\n(ii) eşzamanlı iki kayıt → tutarlı state, çift yok')
  {
    await wipeNeural(uid)
    await sleep(1500)
    const idA = 'lazy_par_a_' + Date.now()
    const idB = 'lazy_par_b_' + Date.now()
    await Promise.all([
      db.collection('range_logs').doc(uid).collection('entries').doc(idA).set({
        kind: 'ATIS_DRILL',
        operationCategory: 'atis',
        accuracy: 75,
        timestamp: Timestamp.now(),
        ownerId: uid,
      }),
      db.collection('range_logs').doc(uid).collection('entries').doc(idB).set({
        kind: 'ATIS_DRILL',
        operationCategory: 'atis',
        accuracy: 76,
        timestamp: Timestamp.now(),
        ownerId: uid,
      }),
    ])
    let st = null
    for (let i = 0; i < 50; i += 1) {
      await sleep(500)
      const s = await db.collection('users').doc(uid).collection('neural').doc('state').get()
      if (s.exists && s.data()?.fullBuild === true) {
        st = s.data()
        break
      }
    }
    const evs = await db.collection('users').doc(uid).collection('neural_events').get()
    const keys = evs.docs.map((d) => d.id)
    const uniq = new Set(keys)
    assert('state fullBuild', !!st && st.fullBuild === true)
    assert('event key tekil', keys.length === uniq.size)
    assert(
      'eventCount === neural_events.size',
      Number(st?.eventCount) === evs.size,
      `${st?.eventCount} vs ${evs.size}`,
    )
    assert('her iki yeni key var', keys.includes(`range_logs__${idA}`) && keys.includes(`range_logs__${idB}`))
  }

  console.log('\n(iii) neuralEnsureState')
  {
    // var olan state'e dokunmaz
    const st0 = await db.collection('users').doc(uid).collection('neural').doc('state').get()
    const ec0 = Number(st0.data()?.eventCount)
    const r1 = await runNeuralEnsureForCaller(uid)
    assert('exists', r1.status === 'exists')
    const st1 = await db.collection('users').doc(uid).collection('neural').doc('state').get()
    assert('eventCount aynı', Number(st1.data()?.eventCount) === ec0)

    // olmayanı kurar
    await wipeNeural(uid)
    const r2 = await runNeuralEnsureForCaller(uid)
    assert('built', r2.status === 'built' || r2.status === 'exists')
    const st2 = await db.collection('users').doc(uid).collection('neural').doc('state').get()
    assert('kuruldu fullBuild', st2.data()?.fullBuild === true)
    assert('eventCount > 0', Number(r2.eventCount) > 0)

    // 10 dk içinde ikinci çağrı kurulum yapmaz (rate_limited veya exists)
    const r3 = await runNeuralEnsureForCaller(uid)
    assert(
      'cooldown: exists|rate_limited',
      r3.status === 'exists' || r3.status === 'rate_limited',
      r3.status,
    )

    // partial state (!fullBuild) → yeniden kur
    await db.collection('users').doc(uid).collection('neural').doc('state').set({
      eventCount: 1,
      fullBuild: false,
      initializing: false,
      regions: {},
      updatedAt: FieldValue.serverTimestamp(),
    })
    // meta sil ki cooldown engellemesin
    await db.collection('users').doc(uid).collection('neural').doc('meta').delete()
    const r4 = await runNeuralEnsureForCaller(uid)
    assert('partial → built/exists', r4.status === 'built' || r4.status === 'exists')
    const st4 = await db.collection('users').doc(uid).collection('neural').doc('state').get()
    assert('partial onarıldı fullBuild', st4.data()?.fullBuild === true)
    assert('needsFullBuild false', !needsFullBuild(st4.data()))

    // başka uid parametresi yok — auth uid kullanılır (doğrudan caller test)
    const other = await ensureUser('lazy-other@test.local')
    await wipeNeural(other)
    const rSelf = await runNeuralEnsureForCaller(uid)
    const otherSt = await db.collection('users').doc(other).collection('neural').doc('state').get()
    assert('ensure başka uid kurmaz', !otherSt.exists || needsFullBuild(otherSt.data()))
    assert('ensure kendi state', rSelf.status === 'exists' || rSelf.status === 'built' || rSelf.status === 'rate_limited')
  }

  console.log('\n(extra) processNeuralEvent partial → full build')
  {
    await wipeNeural(uid)
    await db.collection('users').doc(uid).collection('neural').doc('state').set({
      eventCount: 1,
      fullBuild: false,
      regions: {},
    })
    const res = await processNeuralEvent(uid, NEURAL_SOURCES.RANGE_LOGS, 'lazy_proc', {
      kind: 'ATIS_DRILL',
      operationCategory: 'atis',
      accuracy: 80,
      timestamp: Timestamp.now(),
      ownerId: uid,
    })
    // kayıt kaynaklara da yaz
    await db.collection('range_logs').doc(uid).collection('entries').doc('lazy_proc').set({
      kind: 'ATIS_DRILL',
      operationCategory: 'atis',
      accuracy: 80,
      timestamp: Timestamp.now(),
      ownerId: uid,
    })
    await ensureFullUserState(uid)
    const st = await db.collection('users').doc(uid).collection('neural').doc('state').get()
    assert('process path mode full veya ok', res.ok === true)
    assert('son fullBuild', st.data()?.fullBuild === true)
  }

  console.log(`\n=== Sonuç: ${passed} geçti, ${failed} kaldı ===\n`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
