/**
 * Operatör Beyni — emülatör senaryo testleri (paket eklemeden).
 * Önkoşul: emulators + seed çalışmış olmalı.
 *
 * node scripts/neural-emulator-test.mjs
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

const { initializeApp, getApps, deleteApp } = require('firebase-admin/app')
const { getAuth } = require('firebase-admin/auth')
const { getFirestore, Timestamp } = require('firebase-admin/firestore')
const { computeNeuralState, normalizeEvent, rebuildState, applyDecay } =
  require('../functions/lib/neural/neuralEngine.js')
const { NEURAL_SOURCES } = require('../functions/lib/neural/neuralConfig.js')
const { runNeuralBackfillForUser } = require('../functions/lib/neuralBackfill.js')
const { processNeuralEvent, isTacticalSessionComplete } = require('../functions/lib/neuralProcess.js')
const { eventKeyFor } = require('../functions/lib/neuralProcess.js')

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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function findSeedUid() {
  try {
    return (await auth.getUserByEmail(SEED_EMAIL)).uid
  } catch {
    return null
  }
}

async function waitForState(uid, minEvents = 1, tries = 40) {
  for (let i = 0; i < tries; i += 1) {
    const snap = await db.collection('users').doc(uid).collection('neural').doc('state').get()
    if (snap.exists && Number(snap.data()?.eventCount || 0) >= minEvents) return snap.data()
    await sleep(500)
  }
  return null
}

async function main() {
  console.log('\n=== neural-emulator-test ===\n')

  // Seed (idempotent)
  spawnSync(process.execPath, [path.join(__dirname, 'neural-emulator-seed.mjs')], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  })

  const uid = await findSeedUid()
  assert('seed kullanıcı var', !!uid)
  if (!uid) {
    console.log(`\n=== Sonuç: ${passed} geçti, ${failed} kaldı ===\n`)
    process.exit(1)
  }

  console.log('\n(1) Seed sonrası state ≡ istemci motor')
  const stored = await waitForState(uid, 5)
  assert('neural/state oluştu', !!stored, 'tetikleyiciler çalışmamış olabilir')

  if (stored) {
    // Rebuild from source docs roughly via backfill dry path events
    const dry = await runNeuralBackfillForUser(uid, { dryRun: true })
    const view = applyDecay(stored, Date.now())
    assert(
      'totalLevel yakın (tetikleyici vs backfill dry)',
      Math.abs(Number(view.totalLevel) - Number(dry.totalLevel)) <= 1,
      `${view.totalLevel} vs ${dry.totalLevel}`,
    )
    assert('motor base > 0', Number(stored.regions?.motor?.base) > 0)
    assert('cerebellum base > 0 (timer)', Number(stored.regions?.cerebellum?.base) > 0)
  }

  console.log('\n(2) Çift işlem yok (aynı tacticalSessions işleme)')
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
      createdAt: Timestamp.now(),
    }
    await processNeuralEvent(uid, NEURAL_SOURCES.TACTICAL_SESSIONS, 'seed_timer_std', payload)
    await processNeuralEvent(uid, NEURAL_SOURCES.TACTICAL_SESSIONS, 'seed_timer_std', payload)
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

  console.log('\n(3) Yarım timer puan almaz; tamamlanınca alır')
  {
    const halfId = 'seed_timer_half_' + Date.now()
    const incomplete = {
      mode: 'standard-shot',
      ownerId: uid,
      userId: uid,
      shotTimesMs: [],
      createdAt: Timestamp.now(),
      status: 'active',
    }
    assert('helper yarımı reddeder', !isTacticalSessionComplete(incomplete))
    await processNeuralEvent(uid, NEURAL_SOURCES.TACTICAL_SESSIONS, halfId, incomplete)
    let ev = await db
      .collection('users')
      .doc(uid)
      .collection('neural_events')
      .doc(eventKeyFor(NEURAL_SOURCES.TACTICAL_SESSIONS, halfId))
      .get()
    assert('yarım seans event yok', !ev.exists)

    const complete = {
      ...incomplete,
      shotTimesMs: [500, 1000],
      summary: { shotCount: 2 },
    }
    assert('helper tamamı kabul', isTacticalSessionComplete(complete))
    await processNeuralEvent(uid, NEURAL_SOURCES.TACTICAL_SESSIONS, halfId, complete)
    ev = await db
      .collection('users')
      .doc(uid)
      .collection('neural_events')
      .doc(eventKeyFor(NEURAL_SOURCES.TACTICAL_SESSIONS, halfId))
      .get()
    assert('tamamlanınca event var', ev.exists)
  }

  console.log('\n(4) Geç gelen kayıt rebuild yolu')
  {
    const before = await db.collection('users').doc(uid).collection('neural').doc('state').get()
    const lateId = 'seed_atis_ooo_' + Date.now()
    const oldTs = Date.parse('2025-01-01T12:00:00+03:00')
    const lateDoc = {
      kind: 'ATIS_DRILL',
      operationCategory: 'atis',
      accuracy: 50,
      timestamp: Timestamp.fromMillis(oldTs),
      ownerId: uid,
    }
    await db.collection('range_logs').doc(uid).collection('entries').doc(lateId).set(lateDoc)
    const res = await processNeuralEvent(uid, NEURAL_SOURCES.RANGE_LOGS, lateId, lateDoc)
    assert('rebuild veya incremental', res.ok === true, JSON.stringify(res))
    const ev = await db
      .collection('users')
      .doc(uid)
      .collection('neural_events')
      .doc(eventKeyFor(NEURAL_SOURCES.RANGE_LOGS, lateId))
      .get()
    assert('geç olay event yazıldı', ev.exists)
    const after = await db.collection('users').doc(uid).collection('neural').doc('state').get()
    assert('state güncellendi', after.exists)
    assert(
      'eventCount arttı',
      Number(after.data()?.eventCount) > Number(before.data()?.eventCount || 0),
    )
  }

  console.log('\n(5) Rules (istemci SDK)')
  {
    const requireRoot = createRequire(path.join(root, 'package.json'))
    const { initializeApp: initClient, deleteApp: delClient } = requireRoot('firebase/app')
    const {
      getAuth: getClientAuth,
      connectAuthEmulator,
      signInWithEmailAndPassword,
      createUserWithEmailAndPassword,
      signOut,
    } = requireRoot('firebase/auth')
    const {
      getFirestore: getClientFs,
      connectFirestoreEmulator,
      doc,
      getDoc,
      setDoc,
      serverTimestamp,
    } = requireRoot('firebase/firestore')

    const app = initClient(
      {
        apiKey: 'demo',
        projectId: 'audaz-web',
        appId: 'demo',
      },
      'neural-rules-test',
    )
    const cAuth = getClientAuth(app)
    const cDb = getClientFs(app)
    connectAuthEmulator(cAuth, 'http://127.0.0.1:9099', { disableWarnings: true })
    connectFirestoreEmulator(cDb, '127.0.0.1', 8080)

    await signInWithEmailAndPassword(cAuth, SEED_EMAIL, 'neural-seed-pass-1')
    const ownState = await getDoc(doc(cDb, 'users', uid, 'neural', 'state'))
    assert('sahip state okuyabilir', ownState.exists())

    let writeDenied = false
    try {
      await setDoc(doc(cDb, 'users', uid, 'neural', 'state'), { hack: true }, { merge: true })
    } catch {
      writeDenied = true
    }
    assert('sahip state YAZAMAZ', writeDenied)

    // other user
    const otherEmail = `other_${Date.now()}@test.local`
    try {
      await createUserWithEmailAndPassword(cAuth, otherEmail, 'other-pass-123')
    } catch {
      await signInWithEmailAndPassword(cAuth, otherEmail, 'other-pass-123')
    }
    const otherUid = cAuth.currentUser.uid
    await signOut(cAuth)
    await signInWithEmailAndPassword(cAuth, otherEmail, 'other-pass-123')

    let foreignReadDenied = false
    try {
      const snap = await getDoc(doc(cDb, 'users', uid, 'neural', 'state'))
      // Emulator may return empty without throw depending on rules; treat exists as fail
      if (snap.exists()) foreignReadDenied = false
      else foreignReadDenied = true
    } catch {
      foreignReadDenied = true
    }
    assert('başka kullanıcı state okuyamaz', foreignReadDenied)

    // bad activity_event schema
    let badSchemaDenied = false
    try {
      await setDoc(doc(cDb, 'users', otherUid, 'activity_events', 'bad1'), {
        type: 'INTEL_READ',
        refId: 'x',
        createdAt: serverTimestamp(),
        extra: 'nope',
      })
    } catch {
      badSchemaDenied = true
    }
    assert('activity_events ekstra alan reddedilir', badSchemaDenied)

    let badTypeDenied = false
    try {
      await setDoc(doc(cDb, 'users', otherUid, 'activity_events', 'bad2'), {
        type: 'HACK',
        refId: 'x',
        createdAt: serverTimestamp(),
      })
    } catch {
      badTypeDenied = true
    }
    assert('activity_events yanlış tip reddedilir', badTypeDenied)

    // AAR_ENTRY tipi kabul
    let aarTypeOk = false
    try {
      await setDoc(doc(cDb, 'users', otherUid, 'activity_events', 'AAR_rules_ok'), {
        type: 'AAR_ENTRY',
        refId: 'ev_rules_ok',
        createdAt: serverTimestamp(),
      })
      aarTypeOk = true
    } catch {
      aarTypeOk = false
    }
    assert('activity_events AAR_ENTRY kabul', aarTypeOk)

    // aar_notes — sahip yazabilir; yabancı okuyamaz; şema/update/delete reddi
    await signOut(cAuth)
    await signInWithEmailAndPassword(cAuth, SEED_EMAIL, 'neural-seed-pass-1')
    const aarKey = `aar_rule_${Date.now()}`
    let aarWriteOk = false
    try {
      await setDoc(doc(cDb, 'users', uid, 'aar_notes', aarKey), {
        eventKey: aarKey,
        region: 'motor',
        good: 'Tutuş iyiydi',
        change: 'Nefes kontrolü',
        createdAt: serverTimestamp(),
      })
      aarWriteOk = true
    } catch (e) {
      aarWriteOk = false
      console.error('    aar write err', e?.message || e)
    }
    assert('sahip aar_notes yazabilir', aarWriteOk)

    let aarBadSchema = false
    try {
      await setDoc(doc(cDb, 'users', uid, 'aar_notes', `${aarKey}_bad`), {
        eventKey: `${aarKey}_bad`,
        region: 'motor',
        good: 'x',
        change: 'y',
        createdAt: serverTimestamp(),
        extra: 'nope',
      })
    } catch {
      aarBadSchema = true
    }
    assert('aar_notes ekstra alan reddedilir', aarBadSchema)

    let aarUpdateDenied = false
    try {
      await setDoc(
        doc(cDb, 'users', uid, 'aar_notes', aarKey),
        { good: 'hack' },
        { merge: true },
      )
    } catch {
      aarUpdateDenied = true
    }
    assert('aar_notes update reddedilir', aarUpdateDenied)

    await signOut(cAuth)
    await signInWithEmailAndPassword(cAuth, otherEmail, 'other-pass-123')
    let aarForeignDenied = false
    try {
      const snap = await getDoc(doc(cDb, 'users', uid, 'aar_notes', aarKey))
      aarForeignDenied = !snap.exists()
    } catch {
      aarForeignDenied = true
    }
    assert('başkasının aar_notes okunamaz', aarForeignDenied)

    // instructor role user cannot read owner's neural
    await db.collection('users').doc(otherUid).set({ role: 'instructor', email: otherEmail }, { merge: true })
    let instructorDenied = false
    try {
      const snap = await getDoc(doc(cDb, 'users', uid, 'neural', 'state'))
      instructorDenied = !snap.exists()
    } catch {
      instructorDenied = true
    }
    assert('eğitmen başkasının beynini okuyamaz', instructorDenied)

    await delClient(app)
  }

  console.log('\n(5b) AAR_ENTRY güvenlik: not kapısı + günlük tip tavanı')
  {
    const stamp = Date.now()

    // (a) aar_notes yok → puan yok
    const orphanId = `aar_orphan_${stamp}`
    const orphanPayload = {
      type: 'AAR_ENTRY',
      refId: orphanId,
      createdAt: Timestamp.now(),
    }
    await db
      .collection('users')
      .doc(uid)
      .collection('activity_events')
      .doc(`AAR_${orphanId}`)
      .set(orphanPayload)
    const orphanRes = await processNeuralEvent(
      uid,
      NEURAL_SOURCES.ACTIVITY_EVENTS,
      `AAR_${orphanId}`,
      orphanPayload,
    )
    assert('a) notsuz AAR skip', orphanRes.ok === false && orphanRes.reason === 'aar_note_missing')
    const orphanEv = await db
      .collection('users')
      .doc(uid)
      .collection('neural_events')
      .doc(eventKeyFor(NEURAL_SOURCES.ACTIVITY_EVENTS, `AAR_${orphanId}`))
      .get()
    assert('a) notsuz AAR event yok', !orphanEv.exists)

    // (b) geçerli not → frontal puan
    const before = await db.collection('users').doc(uid).collection('neural').doc('state').get()
    const countBefore = Number(before.data()?.eventCount || 0)
    const aarEvId = `aar_e2e_${stamp}`
    await db
      .collection('users')
      .doc(uid)
      .collection('aar_notes')
      .doc(aarEvId)
      .set({
        eventKey: aarEvId,
        region: 'motor',
        good: 'Tutuş',
        change: 'Nefes',
        createdAt: Timestamp.now(),
      })
    const payload = {
      type: 'AAR_ENTRY',
      refId: aarEvId,
      createdAt: Timestamp.now(),
    }
    await db.collection('users').doc(uid).collection('activity_events').doc(`AAR_${aarEvId}`).set(payload)
    const res = await processNeuralEvent(uid, NEURAL_SOURCES.ACTIVITY_EVENTS, `AAR_${aarEvId}`, payload)
    assert('b) geçerli AAR işlendi', res.ok === true, JSON.stringify(res))
    const nev = await db
      .collection('users')
      .doc(uid)
      .collection('neural_events')
      .doc(eventKeyFor(NEURAL_SOURCES.ACTIVITY_EVENTS, `AAR_${aarEvId}`))
      .get()
    assert('b) AAR neural_event yazıldı', nev.exists)
    assert('b) AAR frontal > 0', Number(nev.data()?.gains?.frontal) > 0, JSON.stringify(nev.data()?.gains))
    const afterB = await db.collection('users').doc(uid).collection('neural').doc('state').get()
    assert(
      'b) eventCount arttı',
      Number(afterB.data()?.eventCount || 0) > countBefore,
      `${countBefore} → ${afterB.data()?.eventCount}`,
    )

    // (c) aynı gün 4. AAR → tip tavanı, puan yok
    // (b) zaten 1 AAR saydı → 2 daha doldur, 4. capped
    const dayBase = stamp + 1
    for (let i = 0; i < 2; i += 1) {
      const id = `aar_cap_${dayBase}_${i}`
      await db
        .collection('users')
        .doc(uid)
        .collection('aar_notes')
        .doc(id)
        .set({
          eventKey: id,
          region: 'motor',
          good: 'g',
          change: 'c',
          createdAt: Timestamp.now(),
        })
      const p = { type: 'AAR_ENTRY', refId: id, createdAt: Timestamp.now() }
      await db.collection('users').doc(uid).collection('activity_events').doc(`AAR_${id}`).set(p)
      await processNeuralEvent(uid, NEURAL_SOURCES.ACTIVITY_EVENTS, `AAR_${id}`, p)
    }
    const fourthId = `aar_cap_${dayBase}_3`
    await db
      .collection('users')
      .doc(uid)
      .collection('aar_notes')
      .doc(fourthId)
      .set({
        eventKey: fourthId,
        region: 'motor',
        good: 'g',
        change: 'c',
        createdAt: Timestamp.now(),
      })
    const fourthPayload = {
      type: 'AAR_ENTRY',
      refId: fourthId,
      createdAt: Timestamp.now(),
    }
    await db
      .collection('users')
      .doc(uid)
      .collection('activity_events')
      .doc(`AAR_${fourthId}`)
      .set(fourthPayload)
    const fourthRes = await processNeuralEvent(
      uid,
      NEURAL_SOURCES.ACTIVITY_EVENTS,
      `AAR_${fourthId}`,
      fourthPayload,
    )
    assert('c) 4. AAR process ok', fourthRes.ok === true, JSON.stringify(fourthRes))
    const fourthEv = await db
      .collection('users')
      .doc(uid)
      .collection('neural_events')
      .doc(eventKeyFor(NEURAL_SOURCES.ACTIVITY_EVENTS, `AAR_${fourthId}`))
      .get()
    const fg = fourthEv.data()?.gains || {}
    const frontalGain = Number(fg.frontal) || 0
    assert(
      'c) 4. AAR puan almaz (typeCap)',
      fourthEv.exists &&
        (fourthEv.data()?.flags?.typeCap === true || frontalGain === 0),
      JSON.stringify(fourthEv.data()),
    )
  }

  console.log('\n(6) Backfill dry-run / write idempotent')
  {
    const d1 = await runNeuralBackfillForUser(uid, { dryRun: true })
    assert('dry-run eventCount > 0', d1.eventCount > 0)
    const w1 = await runNeuralBackfillForUser(uid, { dryRun: false })
    const st1 = await db.collection('users').doc(uid).collection('neural').doc('state').get()
    const c1 = Number(st1.data()?.eventCount || 0)
    const w2 = await runNeuralBackfillForUser(uid, { dryRun: false })
    const st2 = await db.collection('users').doc(uid).collection('neural').doc('state').get()
    const c2 = Number(st2.data()?.eventCount || 0)
    assert('ikinci write eventCount aynı', c1 === c2, `${c1} vs ${c2}`)
    assert(
      'backfill totalLevel ≈ state',
      Math.abs(w1.totalLevel - applyDecay(st2.data(), Date.now()).totalLevel) <= 1,
    )
    assert('dry-run write değil', d1.dryRun === true && w2.dryRun === false)
  }

  console.log(`\n=== Sonuç: ${passed} geçti, ${failed} kaldı ===\n`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
