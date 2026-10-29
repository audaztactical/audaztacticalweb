/**
 * Operatör Beyni — admin backfill (callable + paylaşılan çekirdek).
 */

const { getFirestore, FieldValue } = require('firebase-admin/firestore')
const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { logger } = require('firebase-functions')
const { assertContentAdmin } = require('./adminAuth')
const { rebuildState, normalizeEvent, emptyStoredState } = require('./neural/neuralEngine')
const { NEURAL_SOURCES } = require('./neural/neuralConfig')
const {
  eventKeyFor,
  isTacticalSessionComplete,
  toEventDoc,
  toStateDoc,
} = require('./neuralProcess')

const BATCH_LIMIT = 400

/**
 * @param {FirebaseFirestore.Firestore} db
 * @param {string} uid
 */
async function collectUserSourceEvents(db, uid) {
  /** @type {Array<{ eventKey: string; event: object; logReady?: boolean }>} */
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
  ingest(NEURAL_SOURCES.ACTIVITY_EVENTS, actSnap, (raw, id) => ({
    id,
    type: raw.type,
    createdAt: raw.createdAt,
    timestamp: raw.createdAt,
  }))

  // Deduplicate by eventKey
  const byKey = new Map()
  for (const row of collected) {
    byKey.set(row.eventKey, row)
  }
  return [...byKey.values()]
}

/**
 * @param {string} uid
 * @param {{ dryRun?: boolean }} [opts]
 */
async function runNeuralBackfillForUser(uid, opts = {}) {
  const dryRun = opts.dryRun !== false
  const db = getFirestore()
  const rows = await collectUserSourceEvents(db, uid)

  /** @type {Record<string, number>} */
  const bySource = {}
  for (const r of rows) {
    bySource[r.event.source] = (bySource[r.event.source] || 0) + 1
  }

  const { state, eventLog } = rebuildState(rows.map((r) => r.event))
  const { applyDecay } = require('./neural/neuralEngine')
  const view = applyDecay(state, Date.now())
  /** @type {Record<string, number>} */
  const levels = {}
  for (const id of Object.keys(view.regions)) {
    levels[id] = view.regions[id].level
  }

  if (dryRun) {
    return {
      dryRun: true,
      uid,
      eventCount: rows.length,
      bySource,
      levels,
      totalLevel: view.totalLevel,
      streak: state.streak,
    }
  }

  const eventsCol = db.collection('users').doc(uid).collection('neural_events')
  const stateRef = db.collection('users').doc(uid).collection('neural').doc('state')

  // Write events in batches
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
    const ref = eventsCol.doc(row.eventKey)
    batch.set(ref, {
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
  batch.set(stateRef, toStateDoc(state))
  n += 1
  await batch.commit()

  return {
    dryRun: false,
    uid,
    eventCount: rows.length,
    bySource,
    levels,
    totalLevel: view.totalLevel,
    streak: state.streak,
  }
}

const neuralBackfillUser = onCall(
  {
    // region yok → us-central1 (mevcut onCall'lar ile aynı varsayılan)
    memory: '512MiB',
    timeoutSeconds: 300,
    cors: true,
  },
  async (request) => {
    assertContentAdmin(request)
    const uid = String(request.data?.uid || '')
    if (!uid) throw new HttpsError('invalid-argument', 'uid gerekli')
    const dryRun = request.data?.dryRun !== false
    try {
      return await runNeuralBackfillForUser(uid, { dryRun })
    } catch (err) {
      logger.error('neural_backfill_failed', {
        message: err instanceof Error ? err.message : String(err),
      })
      throw new HttpsError('internal', 'Backfill başarısız')
    }
  },
)

module.exports = {
  neuralBackfillUser,
  runNeuralBackfillForUser,
  collectUserSourceEvents,
  emptyStoredState,
}
