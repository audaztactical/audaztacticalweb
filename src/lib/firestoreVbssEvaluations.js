import { collection, doc, query, serverTimestamp, setDoc, where } from 'firebase/firestore'
import { db, isFirebaseConfigured } from './firebase'
import { INSTRUCTOR_EVALUATION_COLLECTIONS } from './firestoreDataDomains'
import { sanitizeForFirestore } from './firestoreSanitize'
import { safeOnSnapshot, timestampToMs } from './firestoreSnapshot'

/** @typedef {{
 *   id: string
 *   groupId: string
 *   instructorId: string
 *   operatorId: string
 *   operatorName: string
 *   discipline: string
 *   type: string
 *   isTimed: boolean
 *   targetOperationSec: number | null
 *   phases: Record<string, { score: number; subScores?: Record<string, number>; observation: string }>
 *   operationalScores: Record<string, { score: number; subScores?: Record<string, number>; observation: string }>
 *   operationalNotes: Record<string, string>
 *   overallScore: number
 *   createdAt?: unknown
 * }} VbssEvaluation
 */

function assertDb() {
  if (!isFirebaseConfigured() || !db) {
    const e = new Error('Firebase yapılandırılmadı')
    e.code = 'failed-precondition'
    throw e
  }
}

/**
 * @param {unknown} raw
 * @param {string} docId
 * @returns {VbssEvaluation | null}
 */
export function mapVbssEvaluationDoc(raw, docId) {
  if (!raw || typeof raw !== 'object') return null
  const d = /** @type {Record<string, unknown>} */ (raw)

  const phasesRaw = d.phases ?? d.operationalScores
  /** @type {Record<string, { score: number; subScores?: Record<string, number>; observation: string }>} */
  const phases = {}
  if (phasesRaw && typeof phasesRaw === 'object') {
    for (const [key, val] of Object.entries(phasesRaw)) {
      if (!val || typeof val !== 'object') continue
      const p = /** @type {Record<string, unknown>} */ (val)
      /** @type {Record<string, number> | undefined} */
      let subScores
      if (p.subScores && typeof p.subScores === 'object') {
        subScores = {}
        for (const [subId, subVal] of Object.entries(p.subScores)) {
          if (typeof subVal === 'number' && Number.isFinite(subVal)) {
            subScores[subId] = Math.min(10, Math.max(0, subVal))
          }
        }
      }
      phases[key] = {
        score: Math.min(10, Math.max(0, Number(p.score) || 0)),
        ...(subScores && Object.keys(subScores).length ? { subScores } : {}),
        observation: String(p.observation ?? ''),
      }
    }
  }

  const notesRaw = d.operationalNotes
  /** @type {Record<string, string>} */
  const operationalNotes = {}
  if (notesRaw && typeof notesRaw === 'object') {
    for (const [key, val] of Object.entries(notesRaw)) {
      operationalNotes[key] = String(val ?? '')
    }
  }

  return {
    id: typeof d.id === 'string' ? d.id : docId,
    groupId: String(d.groupId ?? ''),
    instructorId: String(d.instructorId ?? ''),
    operatorId: String(d.operatorId ?? ''),
    operatorName: String(d.operatorName ?? ''),
    discipline: String(d.discipline ?? 'vbss'),
    type: String(d.type ?? 'vbss_evaluation'),
    isTimed: Boolean(d.isTimed),
    targetOperationSec:
      d.targetOperationSec == null || d.targetOperationSec === ''
        ? null
        : Math.max(0, Number(d.targetOperationSec) || 0) || null,
    phases,
    operationalScores: phases,
    operationalNotes,
    overallScore: Number(d.overallScore) || 0,
    createdAt: d.createdAt,
  }
}

/**
 * @param {Record<string, unknown>} payload
 */
export async function createVbssEvaluation(payload) {
  assertDb()
  const groupId = String(payload.groupId ?? '').trim()
  const instructorId = String(payload.instructorId ?? '').trim()
  const operatorId = String(payload.operatorId ?? '').trim()
  if (!groupId || !instructorId || !operatorId) {
    const e = new Error('Grup, eğitmen ve operatör zorunludur.')
    e.code = 'failed-precondition'
    throw e
  }

  const ref = doc(collection(db, INSTRUCTOR_EVALUATION_COLLECTIONS.VBSS))
  const docPayload = sanitizeForFirestore({
    id: ref.id,
    ...payload,
    createdAt: serverTimestamp(),
  })
  await setDoc(ref, docPayload)
  return { ...(typeof docPayload === 'object' && docPayload ? docPayload : {}), id: ref.id }
}

/**
 * @param {string} groupId
 * @param {(rows: VbssEvaluation[]) => void} onData
 * @param {(err: unknown) => void} [onError]
 */
export function subscribeGroupVbssEvaluations(groupId, onData, onError) {
  if (!isFirebaseConfigured() || !db) {
    onData([])
    return () => {}
  }
  const gid = String(groupId ?? '').trim()
  if (!gid) {
    onData([])
    return () => {}
  }

  const q = query(collection(db, INSTRUCTOR_EVALUATION_COLLECTIONS.VBSS), where('groupId', '==', gid))

  return safeOnSnapshot(
    q,
    (snap) => {
      const rows = snap.docs
        .map((d) => mapVbssEvaluationDoc(d.data(), d.id))
        .filter(Boolean)
        .sort((a, b) => timestampToMs(b.createdAt) - timestampToMs(a.createdAt))
      onData(rows)
    },
    (err) => onError?.(err),
  )
}

/**
 * Operatör HUD — grup + operatör için canlı vbss_evaluations dinleyicisi.
 * @param {string} groupId
 * @param {string} operatorId
 * @param {(rows: VbssEvaluation[]) => void} onData
 * @param {(err: unknown) => void} [onError]
 */
export function subscribeOperatorVbssEvaluations(groupId, operatorId, onData, onError) {
  if (!isFirebaseConfigured() || !db) {
    onData([])
    return () => {}
  }
  const gid = String(groupId ?? '').trim()
  const oid = String(operatorId ?? '').trim()
  if (!gid || !oid) {
    onData([])
    return () => {}
  }

  const q = query(
    collection(db, INSTRUCTOR_EVALUATION_COLLECTIONS.VBSS),
    where('groupId', '==', gid),
    where('operatorId', '==', oid),
  )

  return safeOnSnapshot(
    q,
    (snap) => {
      const rows = snap.docs
        .map((d) => mapVbssEvaluationDoc(d.data(), d.id))
        .filter(Boolean)
        .sort((a, b) => timestampToMs(b.createdAt) - timestampToMs(a.createdAt))
      onData(rows)
    },
    (err) => onError?.(err),
  )
}
