/**
 * Operatör Beyni — tam state kurulumu (kaynaklardan rebuild).
 * Backfill, lazy init ve processNeuralEvent ortak çekirdeği.
 *
 * Not: neuralProcess yardımcıları lazy require (döngüsel bağımlılık yok).
 */

const { getFirestore, FieldValue } = require('firebase-admin/firestore')
const { logger } = require('firebase-functions')
const { rebuildState, normalizeEvent, applyDecay } = require('./neural/neuralEngine')
const { NEURAL_SOURCES } = require('./neural/neuralConfig')

const BATCH_LIMIT = 400
const ENSURE_COOLDOWN_MS = 10 * 60 * 1000
const LOCK_WAIT_MS = 20_000
const LOCK_POLL_MS = 400

function processHelpers() {
  return require('./neuralProcess')
}

/**
 * @param {FirebaseFirestore.DocumentData|null|undefined} data
 */
function needsFullBuild(data) {
  if (!data) return true
  return data.fullBuild !== true
}

/**
 * @param {FirebaseFirestore.Firestore} db
 * @param {string} uid
 */
async function collectUserSourceEvents(db, uid) {
  const { eventKeyFor, isTacticalSessionComplete } = processHelpers()
  /** @type {Array<{ eventKey: string; event: object }>} */
  const collected = []

  /**
   * @param {string} source
   * @param {FirebaseFirestore.QuerySnapshot} snap
   * @param {(data: Record<string, unknown>, id: string) => Record<string, unknown>|null} [mapDoc]
   */
  function ingest(source, snap, mapDoc) {
    for (const d of snap.docs) {
      const raw = d.data() || {}
      const data = mapDoc ? mapDoc(raw, d.id) : { id: d.id, ...raw }
      if (!data) continue
      const { event, ignored } = normalizeEvent(source, data)
      if (!event) {
        logger.info('neural_backfill_skip', { source, reason: ignored?.reason || 'no_event' })
        continue
      }
      collected.push({ eventKey: eventKeyFor(source, String(data.id || d.id)), event })
    }
  }

  const rangeSnap = await db.collection('range_logs').doc(uid).collection('entries').get()
  ingest(NEURAL_SOURCES.RANGE_LOGS, rangeSnap)

  const vbssSnap = await db.collection('vbss_logs').doc(uid).collection('entries').get()
  ingest(NEURAL_SOURCES.VBSS_LOGS, vbssSnap)

  const tcccSnap = await db.collection('tccc_logs').doc(uid).collection('entries').get()
  ingest(NEURAL_SOURCES.TCCC_LOGS, tcccSnap)

  const sessSnap = await db.collection('users').doc(uid).collection('tacticalSessions').get()
  ingest(NEURAL_SOURCES.TACTICAL_SESSIONS, sessSnap, (raw, id) => {
    if (!isTacticalSessionComplete(raw)) return null
    return { id, ...raw }
  })

  const trainSnap = await db
    .collection('trainings')
    .where('ownerId', '==', uid)
    .get()
    .catch(() => null)
  if (trainSnap) ingest(NEURAL_SOURCES.TRAININGS, trainSnap)
  else {
    const allTrain = await db.collection('trainings').limit(500).get()
    ingest(NEURAL_SOURCES.TRAININGS, allTrain, (raw, id) => {
      const owner = String(raw.ownerId || raw.userId || '')
      if (owner !== uid) return null
      return { id, ...raw }
    })
  }

  const balSnap = await db.collection('ballistic_profiles').doc(uid).collection('profiles').get()
  ingest(NEURAL_SOURCES.BALLISTIC_PROFILES, balSnap)

  let forumSnap
  try {
    forumSnap = await db.collection('forum_posts').where('authorId', '==', uid).get()
  } catch {
    forumSnap = await db.collection('forum_posts').limit(200).get()
  }
  ingest(NEURAL_SOURCES.FORUM_POSTS, forumSnap, (raw, id) => {
    if (String(raw.authorId || '') !== uid) return null
    return { id, authorId: uid, timestamp: raw.timestamp ?? raw.createdAt }
  })

  for (const post of forumSnap.docs.slice(0, 40)) {
    if (String(post.data()?.authorId || '') !== uid) continue
    const replies = await post.ref.collection('replies').get()
    ingest(NEURAL_SOURCES.FORUM_REPLIES, replies, (raw, id) => {
      if (String(raw.authorId || '') !== uid) return null
      return {
        id: `${post.id}_${id}`,
        authorId: uid,
        timestamp: raw.timestamp ?? raw.createdAt,
      }
    })
  }

  const actSnap = await db.collection('users').doc(uid).collection('activity_events').get()
  const { REGION_IDS } = require('./neural/neuralConfig')
  /** AAR_ENTRY için not kapısı: not yok/region geçersiz → backfill'e alma */
  /** @type {FirebaseFirestore.QueryDocumentSnapshot[]} */
  const actDocs = []
  for (const d of actSnap.docs) {
    const raw = d.data() || {}
    if (String(raw.type || '') === 'AAR_ENTRY') {
      const refId = String(raw.refId || '').slice(0, 128)
      if (!refId) continue
      const noteSnap = await db.collection('users').doc(uid).collection('aar_notes').doc(refId).get()
      const region = noteSnap.exists ? String(noteSnap.data()?.region || '') : ''
      if (!noteSnap.exists || !REGION_IDS.includes(region)) continue
    }
    actDocs.push(d)
  }
  ingest(NEURAL_SOURCES.ACTIVITY_EVENTS, { docs: actDocs }, (raw, id) => ({
    id,
    type: raw.type,
    createdAt: raw.createdAt,
    timestamp: raw.createdAt,
    refId: raw.refId,
  }))

  const byKey = new Map()
  for (const row of collected) {
    byKey.set(row.eventKey, row)
  }
  return [...byKey.values()]
}

/**
 * Kaynaklardan state + neural_events yazar (idempotent event key).
 * fullBuild: true işaretler.
 *
 * @param {string} uid
 * @param {{ dryRun?: boolean }} [opts]
 */
async function buildUserStateFromSources(uid, opts = {}) {
  const dryRun = opts.dryRun === true
  const { toEventDoc, toStateDoc } = processHelpers()
  const db = getFirestore()
  const rows = await collectUserSourceEvents(db, uid)

  /** @type {Record<string, number>} */
  const bySource = {}
  for (const r of rows) {
    bySource[r.event.source] = (bySource[r.event.source] || 0) + 1
  }

  const { state, eventLog } = rebuildState(rows.map((r) => r.event))
  const view = applyDecay(state, Date.now())
  /** @type {Record<string, number>} */
  const levels = {}
  for (const id of Object.keys(view.regions)) {
    levels[id] = view.regions[id].level
  }

  const summary = {
    uid,
    eventCount: rows.length,
    bySource,
    levels,
    totalLevel: view.totalLevel,
    streak: state.streak,
    regionsBase: Object.fromEntries(
      Object.entries(state.regions).map(([k, v]) => [k, Number(v.base) || 0]),
    ),
  }

  if (dryRun) {
    return { dryRun: true, ...summary }
  }

  const eventsCol = db.collection('users').doc(uid).collection('neural_events')
  const stateRef = db.collection('users').doc(uid).collection('neural').doc('state')

  let batch = db.batch()
  let n = 0
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i]
    const logEntry = eventLog.find((e) => e.id === row.event.id) || {
      gains: {},
      returnBonus: false,
      hitDailyCap: false,
      cappedType: false,
      streakBonus: 0,
    }
    batch.set(eventsCol.doc(row.eventKey), {
      ...toEventDoc(row.event, logEntry),
      createdAt: FieldValue.serverTimestamp(),
    })
    n += 1
    if (n >= BATCH_LIMIT) {
      await batch.commit()
      batch = db.batch()
      n = 0
    }
  }
  batch.set(stateRef, {
    ...toStateDoc(state),
    fullBuild: true,
    fullBuildAt: FieldValue.serverTimestamp(),
    initializing: false,
  })
  await batch.commit()

  logger.info('neural_full_build', { eventCount: rows.length })
  return { dryRun: false, ...summary }
}

/**
 * create-if-absent + initializing. İkinci tetikleyici busy → bekler;
 * kurulum idempotent olduğundan çift build zararsız yedek yol.
 *
 * @param {string} uid
 * @returns {Promise<'ready'|'claimed'|'busy'>}
 */
async function claimFullBuildLock(uid) {
  const db = getFirestore()
  const stateRef = db.collection('users').doc(uid).collection('neural').doc('state')
  try {
    return await db.runTransaction(async (tx) => {
      const snap = await tx.get(stateRef)
      if (!snap.exists) {
        tx.create(stateRef, {
          initializing: true,
          fullBuild: false,
          eventCount: 0,
          updatedAt: FieldValue.serverTimestamp(),
        })
        return 'claimed'
      }
      const data = snap.data() || {}
      if (data.fullBuild === true && data.initializing !== true) return 'ready'
      if (data.initializing === true) return 'busy'
      tx.set(
        stateRef,
        {
          initializing: true,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      )
      return 'claimed'
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (/already exists|ALREADY_EXISTS/i.test(msg)) return 'busy'
    throw err
  }
}

/**
 * @param {string} uid
 */
async function waitForFullBuild(uid) {
  const db = getFirestore()
  const stateRef = db.collection('users').doc(uid).collection('neural').doc('state')
  const start = Date.now()
  while (Date.now() - start < LOCK_WAIT_MS) {
    const snap = await stateRef.get()
    if (snap.exists && snap.data()?.fullBuild === true && snap.data()?.initializing !== true) {
      return true
    }
    await new Promise((r) => setTimeout(r, LOCK_POLL_MS))
  }
  return false
}

/**
 * @param {string} uid
 */
async function ensureFullUserState(uid) {
  const db = getFirestore()
  const stateRef = db.collection('users').doc(uid).collection('neural').doc('state')
  const snap = await stateRef.get()
  if (snap.exists && !needsFullBuild(snap.data())) {
    return { status: 'exists', eventCount: Number(snap.data()?.eventCount) || 0 }
  }

  const lock = await claimFullBuildLock(uid)
  if (lock === 'ready') {
    const again = await stateRef.get()
    return { status: 'exists', eventCount: Number(again.data()?.eventCount) || 0 }
  }
  if (lock === 'busy') {
    const ok = await waitForFullBuild(uid)
    if (ok) {
      const again = await stateRef.get()
      return { status: 'exists', eventCount: Number(again.data()?.eventCount) || 0 }
    }
  }

  const built = await buildUserStateFromSources(uid, { dryRun: false })
  return { status: 'built', eventCount: built.eventCount, totalLevel: built.totalLevel }
}

/**
 * @param {string} uid
 */
async function checkEnsureCooldown(uid) {
  const db = getFirestore()
  const metaRef = db.collection('users').doc(uid).collection('neural').doc('meta')
  const snap = await metaRef.get()
  if (!snap.exists) return { allowed: true, lastEnsureAt: null }
  const raw = snap.data()?.lastEnsureAt
  let ms = null
  if (raw && typeof raw.toMillis === 'function') ms = raw.toMillis()
  else if (typeof raw === 'number') ms = raw
  if (ms != null && Date.now() - ms < ENSURE_COOLDOWN_MS) {
    return { allowed: false, lastEnsureAt: ms }
  }
  return { allowed: true, lastEnsureAt: ms }
}

/**
 * @param {string} uid
 */
async function touchEnsureMeta(uid) {
  const db = getFirestore()
  const metaRef = db.collection('users').doc(uid).collection('neural').doc('meta')
  await metaRef.set(
    {
      lastEnsureAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  )
}

/**
 * @param {Record<string, unknown>} doc
 * @param {FirebaseFirestore.DocumentData|null|undefined} prev
 */
function withFullBuildPreserved(doc, prev) {
  if (prev && prev.fullBuild === true) {
    return {
      ...doc,
      fullBuild: true,
      fullBuildAt: prev.fullBuildAt ?? FieldValue.serverTimestamp(),
      initializing: false,
    }
  }
  return { ...doc, initializing: false }
}

module.exports = {
  needsFullBuild,
  collectUserSourceEvents,
  buildUserStateFromSources,
  claimFullBuildLock,
  waitForFullBuild,
  ensureFullUserState,
  checkEnsureCooldown,
  touchEnsureMeta,
  withFullBuildPreserved,
  ENSURE_COOLDOWN_MS,
}
