import { collection, doc, query, serverTimestamp, setDoc, where } from 'firebase/firestore'
import { db, isFirebaseConfigured } from './firebase'
import { INSTRUCTOR_EVALUATION_COLLECTIONS } from './firestoreDataDomains'
import { sanitizeForFirestore } from './firestoreSanitize'
import { safeOnSnapshot, timestampToMs } from './firestoreSnapshot'

/** @typedef {'m' | 'a' | 'r' | 'c' | 'h'} TcccMarchPhaseId */

/** @typedef {{
 *   score: number
 *   subScores?: Record<string, number>
 *   observation: string
 *   criticalFail: boolean
 *   actionChips?: string[]
 * }} TcccMarchPhaseRecord */

/** @typedef {{
 *   id: string
 *   groupId: string
 *   instructorId: string
 *   operatorId: string
 *   operatorName: string
 *   discipline: string
 *   type: string
 *   isTimed: boolean
 *   targetInterventionSec: number | null
 *   phases: Record<TcccMarchPhaseId, TcccMarchPhaseRecord>
 *   marchScores: Record<TcccMarchPhaseId, TcccMarchPhaseRecord>
 *   operationalNotes: Record<string, string>
 *   criticalFails: Record<TcccMarchPhaseId, boolean>
 *   marchActionChips?: Record<TcccMarchPhaseId, string[]>
 *   casualtyStatus?: 'STABLE' | 'EKS_KIA'
 *   overallScore: number
 *   createdAt?: unknown
 * }} TcccEvaluation
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
 * @returns {TcccEvaluation | null}
 */
export function mapTcccEvaluationDoc(raw, docId) {
  if (!raw || typeof raw !== 'object') return null
  const d = /** @type {Record<string, unknown>} */ (raw)

  const phasesRaw = d.phases ?? d.marchScores
  /** @type {Record<TcccMarchPhaseId, TcccMarchPhaseRecord>} */
  const phases = {}
  if (phasesRaw && typeof phasesRaw === 'object') {
    for (const [key, val] of Object.entries(phasesRaw)) {
      if (!val || typeof val !== 'object') continue
      const p = /** @type {Record<string, unknown>} */ (val)
      const chipsRaw = p.actionChips
      const actionChips = Array.isArray(chipsRaw)
        ? chipsRaw.map((c) => String(c)).filter(Boolean)
        : []
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
      phases[/** @type {TcccMarchPhaseId} */ (key)] = {
        score: Math.min(10, Math.max(0, Number(p.score) || 0)),
        ...(subScores && Object.keys(subScores).length ? { subScores } : {}),
        observation: String(p.observation ?? ''),
        criticalFail: Boolean(p.criticalFail),
        actionChips,
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

  const failsRaw = d.criticalFails
  /** @type {Record<TcccMarchPhaseId, boolean>} */
  const criticalFails = {}
  if (failsRaw && typeof failsRaw === 'object') {
    for (const [key, val] of Object.entries(failsRaw)) {
      criticalFails[/** @type {TcccMarchPhaseId} */ (key)] = Boolean(val)
    }
  }
  for (const key of Object.keys(phases)) {
    const pid = /** @type {TcccMarchPhaseId} */ (key)
    if (criticalFails[pid] === undefined) {
      criticalFails[pid] = phases[pid]?.criticalFail ?? false
    }
  }

  return {
    id: typeof d.id === 'string' ? d.id : docId,
    groupId: String(d.groupId ?? ''),
    instructorId: String(d.instructorId ?? ''),
    operatorId: String(d.operatorId ?? ''),
    operatorName: String(d.operatorName ?? ''),
    discipline: String(d.discipline ?? 'tccc'),
    type: String(d.type ?? 'tccc_evaluation'),
    isTimed: Boolean(d.isTimed),
    targetInterventionSec:
      d.targetInterventionSec == null || d.targetInterventionSec === ''
        ? null
        : Math.max(0, Number(d.targetInterventionSec) || 0) || null,
    phases,
    marchScores: phases,
    operationalNotes,
    criticalFails,
    marchActionChips:
      d.marchActionChips && typeof d.marchActionChips === 'object'
        ? Object.fromEntries(
            Object.entries(d.marchActionChips).map(([k, v]) => [
              k,
              Array.isArray(v) ? v.map((c) => String(c)) : [],
            ]),
          )
        : undefined,
    casualtyStatus: d.casualtyStatus === 'EKS_KIA' ? 'EKS_KIA' : 'STABLE',
    overallScore: Number(d.overallScore) || 0,
    createdAt: d.createdAt,
  }
}

/**
 * @param {Record<string, unknown>} payload
 */
export async function createTcccEvaluation(payload) {
  assertDb()
  const groupId = String(payload.groupId ?? '').trim()
  const instructorId = String(payload.instructorId ?? '').trim()
  const operatorId = String(payload.operatorId ?? '').trim()
  if (!groupId || !instructorId || !operatorId) {
    const e = new Error('Grup, eğitmen ve operatör zorunludur.')
    e.code = 'failed-precondition'
    throw e
  }

  const ref = doc(collection(db, INSTRUCTOR_EVALUATION_COLLECTIONS.TCCC))
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
 * @param {(rows: TcccEvaluation[]) => void} onData
 * @param {(err: unknown) => void} [onError]
 */
export function subscribeGroupTcccEvaluations(groupId, onData, onError) {
  if (!isFirebaseConfigured() || !db) {
    onData([])
    return () => {}
  }
  const gid = String(groupId ?? '').trim()
  if (!gid) {
    onData([])
    return () => {}
  }

  const q = query(collection(db, INSTRUCTOR_EVALUATION_COLLECTIONS.TCCC), where('groupId', '==', gid))

  return safeOnSnapshot(
    q,
    (snap) => {
      const rows = snap.docs
        .map((d) => mapTcccEvaluationDoc(d.data(), d.id))
        .filter(Boolean)
        .sort((a, b) => timestampToMs(b.createdAt) - timestampToMs(a.createdAt))
      onData(rows)
    },
    (err) => onError?.(err),
  )
}

/**
 * @param {string} groupId
 * @param {string} operatorId
 * @param {(rows: TcccEvaluation[]) => void} onData
 * @param {(err: unknown) => void} [onError]
 */
export function subscribeOperatorTcccEvaluations(groupId, operatorId, onData, onError) {
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
    collection(db, INSTRUCTOR_EVALUATION_COLLECTIONS.TCCC),
    where('groupId', '==', gid),
    where('operatorId', '==', oid),
  )

  return safeOnSnapshot(
    q,
    (snap) => {
      const rows = snap.docs
        .map((d) => mapTcccEvaluationDoc(d.data(), d.id))
        .filter(Boolean)
        .sort((a, b) => timestampToMs(b.createdAt) - timestampToMs(a.createdAt))
      onData(rows)
    },
    (err) => onError?.(err),
  )
}
