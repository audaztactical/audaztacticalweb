/**
 * Operatör Beyni — ortak olay işleyici (Admin SDK).
 * Kayıt silinince puan geri alınmaz (bilinçli).
 * State yok / fullBuild değilse tam kurulum (lazy init).
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
const { NEURAL_SOURCES, REGION_IDS } = require('./neural/neuralConfig')

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
/**
 * AAR_ENTRY: puan vermeden önce aar_notes/{refId} var + region geçerli olmalı.
 * Transaction dışı tek okuma. PII yazılmaz.
 * @param {FirebaseFirestore.Firestore} db
 * @param {string} uid
 * @param {Record<string, unknown>} data
 * @returns {Promise<{ ok: true } | { ok: false; reason: string }>}
 */
async function assertAarNoteExists(db, uid, data) {
  const refId = String(data.refId || '').slice(0, 128)
  if (!refId) {
    return { ok: false, reason: 'aar_note_missing' }
  }
  const noteSnap = await db.collection('users').doc(uid).collection('aar_notes').doc(refId).get()
  if (!noteSnap.exists) {
    return { ok: false, reason: 'aar_note_missing' }
  }
  const region = String(noteSnap.data()?.region || '')
  if (!REGION_IDS.includes(region)) {
    return { ok: false, reason: 'aar_note_invalid_region' }
  }
  return { ok: true }
}

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

  if (source === NEURAL_SOURCES.ACTIVITY_EVENTS && event.type === 'AAR_ENTRY') {
    const gate = await assertAarNoteExists(db, uid, data)
    if (!gate.ok) {
      logger.info('neural_skip', { source, reason: gate.reason, type: 'AAR_ENTRY' })
      return { ok: false, reason: gate.reason }
    }
  }

  const eventKey = eventKeyFor(source, docId)
  const eventRef = db.collection('users').doc(uid).collection('neural_events').doc(eventKey)
  const stateRef = db.collection('users').doc(uid).collection('neural').doc('state')
  const eventsCol = db.collection('users').doc(uid).collection('neural_events')

  try {
    const {
      needsFullBuild,
      ensureFullUserState,
      withFullBuildPreserved,
    } = require('./neuralBuild')

    const pre = await stateRef.get()
    if (needsFullBuild(pre.exists ? pre.data() : null)) {
      // Tetikleyen kayıt kaynaklarda; tam kurulum geçmişi de alır
      const ensured = await ensureFullUserState(uid)
      logger.info('neural_lazy_init', {
        source,
        status: ensured.status,
        eventCount: ensured.eventCount,
      })
      return { ok: true, mode: 'full_build', ...ensured }
    }

    let outOfOrder = false
    let racedNeedsBuild = false
    /** @type {FirebaseFirestore.DocumentData|null} */
    let prevStateData = null

    await db.runTransaction(async (tx) => {
      const evSnap = await tx.get(eventRef)
      if (evSnap.exists) {
        return
      }

      const stSnap = await tx.get(stateRef)
      prevStateData = stSnap.exists ? stSnap.data() || null : null
      if (needsFullBuild(prevStateData)) {
        racedNeedsBuild = true
        return
      }

      const stored = hydrateStored(prevStateData)
      const lastTs = Number(stored.lastEventTs) || 0

      if (event.ts >= lastTs) {
        const { state, logEntry } = applyEvent(stored, event)
        tx.set(eventRef, toEventDoc(event, logEntry))
        tx.set(
          stateRef,
          withFullBuildPreserved(toStateDoc(state), prevStateData),
          { merge: false },
        )
        return
      }

      outOfOrder = true
    })

    if (racedNeedsBuild) {
      const ensured = await ensureFullUserState(uid)
      return { ok: true, mode: 'full_build', ...ensured }
    }

    if (!outOfOrder) {
      return { ok: true, mode: 'incremental' }
    }

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

    const stSnap2 = await stateRef.get()
    const batch = db.batch()
    batch.set(eventRef, toEventDoc(event, logEntry))
    batch.set(
      stateRef,
      withFullBuildPreserved(toStateDoc(state), stSnap2.exists ? stSnap2.data() : null),
    )
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
