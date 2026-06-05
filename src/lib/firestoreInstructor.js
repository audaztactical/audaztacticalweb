import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from './firebase'
import { audazCreate } from './dataManager'
import { summarizeOperatorLogs } from './instructorOperatorAnalytics'
import {
  buildInstructorAuditPayload,
  buildInstructorRangeLogPayload,
} from './instructorLogPayload'

/**
 * @typedef {{
 *   uid: string
 *   username: string
 *   callsign: string
 *   email: string
 *   status: string
 *   role: string
 * }} OperatorProfile
 */

/**
 * @typedef {OperatorProfile & {
 *   sessions: number
 *   avgHitRate: number
 *   tcccStatus: string
 *   summaryLoading?: boolean
 * }} OperatorListRow
 */

function assertDb() {
  if (!isFirebaseConfigured() || !db) {
    const e = new Error('Firebase yapılandırılmadı')
    e.code = 'failed-precondition'
    throw e
  }
}

/**
 * @returns {Promise<OperatorProfile[]>}
 */
export async function fetchOperatorProfiles() {
  assertDb()
  const snap = await getDocs(query(collection(db, 'users'), where('role', '==', 'operator')))
  return snap.docs.map((d) => {
    const data = d.data()
    return {
      uid: d.id,
      username: typeof data.username === 'string' ? data.username : '',
      callsign:
        typeof data.callsign === 'string'
          ? data.callsign
          : typeof data.displayName === 'string'
            ? data.displayName
            : '',
      email: typeof data.email === 'string' ? data.email : '',
      status: typeof data.status === 'string' ? data.status : '',
      role: typeof data.role === 'string' ? data.role : 'operator',
    }
  })
}

/**
 * @param {string} uid
 * @param {number} [maxEntries]
 * @returns {Promise<Record<string, unknown>[]>}
 */
export async function fetchOperatorRangeLogs(uid, maxEntries = 100) {
  assertDb()
  if (!uid) return []

  const entriesRef = collection(db, 'range_logs', uid, 'entries')
  const q = query(entriesRef, orderBy('updatedAt', 'desc'), limit(maxEntries))
  const snap = await getDocs(q)

  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  rows.sort((a, b) => {
    const tb =
      typeof b.updatedAt?.toMillis === 'function'
        ? b.updatedAt.toMillis()
        : Date.parse(String(b.timestamp || '')) || 0
    const ta =
      typeof a.updatedAt?.toMillis === 'function'
        ? a.updatedAt.toMillis()
        : Date.parse(String(a.timestamp || '')) || 0
    return tb - ta
  })
  return rows
}

/**
 * @param {OperatorProfile} operator
 * @returns {Promise<Pick<OperatorListRow, 'sessions' | 'avgHitRate' | 'tcccStatus'>>}
 */
export async function fetchOperatorSummary(operator) {
  const logs = await fetchOperatorRangeLogs(operator.uid, 80)
  return summarizeOperatorLogs(logs)
}

/**
 * @param {{
 *   operatorId: string
 *   instructorId: string
 *   instructorName: string
 *   discipline: import('./instructorLogPayload').InstructorDisciplineKey
 *   score: number
 *   drillSeconds: number
 *   infractions: string[]
 *   commentary: string
 * }} input
 */
export async function submitInstructorAssessment(input) {
  assertDb()
  const { operatorId, instructorId } = input
  if (!operatorId || !instructorId) throw new Error('Operatör ve eğitmen kimliği gerekli')

  const rangePayload = buildInstructorRangeLogPayload(input)
  const auditPayload = buildInstructorAuditPayload(rangePayload)

  await addDoc(collection(db, 'instructorLogs'), auditPayload)
  return audazCreate('range_logs', operatorId, rangePayload)
}
