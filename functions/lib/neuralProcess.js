/**
 * Operatör Beyni — ortak olay işleyici (Admin SDK).
 * Kayıt silinince puan geri alınmaz (bilinçli).
 */

const { getFirestore, FieldValue } = require('firebase-admin/firestore')
const { logger } = require('firebase-functions')
const {
  emptyStoredState,
  applyEvent,
  rebuildState,
  normalizeEvent,
  isTacticalSessionComplete,
} = require('./neural/neuralEngine')
const { NEURAL_SOURCES } = require('./neural/neuralConfig')

/**
 * @param {string} source
 * @param {string} docId
 */
function eventKeyFor(source, docId) {
  return `${source}__${docId}`
}

/**
 * @param {import('./neural/neuralEngine').NeuralEvent|object} event
 * @param {Record<string, unknown>} logEntry
 */
function toEventDoc(event, logEntry) {
  const gains = /** @type {Record<string, number>} */ (logEntry.gains || {})
  return {
    type: event.type,
    source: event.source,
    ts: event.ts,
    score: event.score == null ? null : event.score,
    gains,
    flags: {
      bonus: logEntry.returnBonus === true,
      cap: logEntry.hitDailyCap === true,
      typeCap: logEntry.cappedType === true,
      streakBonus: Number(logEntry.streakBonus) || 0,
    },
    createdAt: FieldValue.serverTimestamp(),
  }
}

/**
 * @param {ReturnType<typeof emptyStoredState>} state
 */
function toStateDoc(state) {
  return {
    version: state.version,
    regions: state.regions,
    streak: state.streak,
    lastActiveDay: state.lastActiveDay,
    today: state.today,
    lastEventTs: state.lastEventTs,
    eventCount: state.eventCount,
    updatedAt: FieldValue.serverTimestamp(),
  }
}

/**
 * @param {FirebaseFirestore.DocumentData|undefined} raw
 */
function hydrateStored(raw) {
  if (!raw) return emptyStoredState()
  const base = emptyStoredState()
  return {
    ...base,
    ...raw,
    regions: { ...base.regions, ...(raw.regions || {}) },
    today: {
      dayKey: raw.today?.dayKey ?? null,
      perRegion: { ...(raw.today?.perRegion || {}) },
      perType: { ...(raw.today?.perType || {}) },
    },
  }
}

/**
 * @param {FirebaseFirestore.QueryDocumentSnapshot[]} docs
 * @param {{ id: string; source: string; type: string; ts: number; score: number|null }} extra
 */
function eventsFromDocs(docs, extra) {
  /** @type {Array<{ id: string; source: string; type: string; ts: number; score: number|null }>} */
  const out = []
  for (const d of docs) {
    const data = d.data()
    if (!data?.type || !Number.isFinite(data.ts)) continue
    // eventKey = source__docId → id kısmı
    const parts = String(d.id).split('__')
    const id = parts.length > 1 ? parts.slice(1).join('__') : d.id
    out.push({
      id,
      source: String(data.source || parts[0] || 'unknown'),
      type: String(data.type),
      ts: Number(data.ts),
      score: data.score == null ? null : Number(data.score),
    })
  }
  if (extra) {
    const exists = out.some((e) => e.id === extra.id && e.source === extra.source)
    if (!exists) out.push(extra)
  }
  return out
}

/**
 * @param {string} uid
 * @param {string} source
 * @param {string} docId
 * @param {Record<string, unknown>} data
 */
async function processNeuralEvent(uid, source, docId, data) {
  if (!uid || !source || !docId) return { ok: false, reason: 'missing_args' }

  const { event, ignored } = normalizeEvent(source, { id: docId, ...data })
  if (!event) {
    logger.info('neural_skip', {
      source,
      reason: ignored?.reason || 'no_event',
      kind: ignored?.kind || null,
      operationCategory: ignored?.operationCategory || null,
      mode: ignored?.mode || null,
    })
    return { ok: false, reason: ignored?.reason || 'no_event' }
  }

  const db = getFirestore()
  const eventKey = eventKeyFor(source, docId)
  const eventRef = db.collection('users').doc(uid).collection('neural_events').doc(eventKey)
  const stateRef = db.collection('users').doc(uid).collection('neural').doc('state')
  const eventsCol = db.collection('users').doc(uid).collection('neural_events')

  try {
    let outOfOrder = false

    await db.runTransaction(async (tx) => {
      const evSnap = await tx.get(eventRef)
      if (evSnap.exists) {
        return
      }

      const stSnap = await tx.get(stateRef)
      const stored = hydrateStored(stSnap.exists ? stSnap.data() : null)
      const lastTs = Number(stored.lastEventTs) || 0

      if (event.ts >= lastTs) {
        const { state, logEntry } = applyEvent(stored, event)
        tx.set(eventRef, toEventDoc(event, logEntry))
        tx.set(stateRef, toStateDoc(state), { merge: false })
        return
      }

      outOfOrder = true
    })

    if (!outOfOrder) {
      return { ok: true, mode: 'incremental' }
    }

    // Geç gelen olay: tüm event'leri oku + rebuild (idempotent)
    const allSnap = await eventsCol.get()
    const already = allSnap.docs.some((d) => d.id === eventKey)
    if (already) return { ok: true, mode: 'duplicate' }

    const list = eventsFromDocs(allSnap.docs, event)
    const { state, eventLog } = rebuildState(list)
    const logEntry = eventLog.find((e) => e.id === event.id) || {
      gains: {},
      returnBonus: false,
      hitDailyCap: false,
      cappedType: false,
      streakBonus: 0,
    }

    const batch = db.batch()
    batch.set(eventRef, toEventDoc(event, logEntry))
    batch.set(stateRef, toStateDoc(state))
    await batch.commit()
    logger.info('neural_rebuild', { source, reason: 'out_of_order' })
    return { ok: true, mode: 'rebuild' }
  } catch (err) {
    logger.error('neural_process_failed', {
      source,
      message: err instanceof Error ? err.message : String(err),
    })
    return { ok: false, reason: 'error' }
  }
}

module.exports = {
  processNeuralEvent,
  isTacticalSessionComplete,
  eventKeyFor,
  NEURAL_SOURCES,
  hydrateStored,
  toStateDoc,
  toEventDoc,
  eventsFromDocs,
}
