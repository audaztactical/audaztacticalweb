import {
  addDoc,
  collection,
  query,
  serverTimestamp,
  Timestamp,
  where,
} from 'firebase/firestore'
import { coerceFeedbackTimestamp, formatFeedbackTimestamp } from './firestoreFeedback'
import { db, isFirebaseConfigured } from './firebase'
import { safeOnSnapshot } from './firestoreSnapshot'

/** @typedef {{
 *   id: string
 *   userId: string
 *   userEmail: string
 *   message: string
 *   status: string
 *   suspensionReasonSnapshot: string
 *   suspendedUntilSnapshot: import('firebase/firestore').Timestamp | Date | null
 *   suspensionKey: string
 *   createdAt: import('firebase/firestore').Timestamp | Date | null
 * }} SuspensionAppealRecord */

function assertDb() {
  if (!isFirebaseConfigured() || !db) {
    const e = new Error('Firebase yapılandırılmadı')
    e.code = 'failed-precondition'
    throw e
  }
}

/**
 * @param {unknown} suspendedUntil
 * @returns {number | null} epoch ms veya null (süresiz)
 */
export function suspensionUntilEpochMs(suspendedUntil) {
  const coerced = coerceFeedbackTimestamp(suspendedUntil)
  if (!coerced) return null
  if (coerced instanceof Date) return coerced.getTime()
  if (typeof coerced.toDate === 'function') {
    try {
      return coerced.toDate().getTime()
    } catch {
      return null
    }
  }
  return null
}

/**
 * @param {string} suspensionReason
 * @param {unknown} suspendedUntil
 */
export function buildSuspensionAppealKey(suspensionReason, suspendedUntil) {
  const reason = String(suspensionReason ?? '').trim()
  const untilMs = suspensionUntilEpochMs(suspendedUntil)
  return `${reason}::${untilMs == null ? 'indefinite' : String(untilMs)}`
}

/**
 * @param {import('firebase/firestore').DocumentData} data
 * @param {string} id
 * @returns {SuspensionAppealRecord}
 */
export function mapSuspensionAppealDoc(data, id) {
  const rawUntil = data.suspendedUntilSnapshot ?? data.suspendedUntil ?? null
  return {
    id,
    userId: String(data.userId ?? ''),
    userEmail: String(data.userEmail ?? ''),
    message: String(data.message ?? ''),
    status: String(data.status ?? 'pending'),
    suspensionReasonSnapshot: String(data.suspensionReasonSnapshot ?? ''),
    suspendedUntilSnapshot: coerceFeedbackTimestamp(rawUntil),
    suspensionKey: String(data.suspensionKey ?? ''),
    createdAt: coerceFeedbackTimestamp(data.createdAt),
  }
}

/**
 * @param {unknown} suspendedUntil
 * @returns {boolean}
 */
export function hasTimedSuspensionEnd(suspendedUntil) {
  return suspensionUntilEpochMs(suspendedUntil) != null
}

/**
 * @param {{
 *   userId: string
 *   userEmail?: string
 *   message: string
 *   suspensionReason: string
 *   suspendedUntil: unknown
 * }} input
 */
export async function submitSuspensionAppeal({
  userId,
  userEmail = '',
  message,
  suspensionReason,
  suspendedUntil,
}) {
  assertDb()
  const uid = String(userId ?? '').trim()
  const body = String(message ?? '').trim()
  if (!uid) throw new Error('Oturum gerekli')
  if (!body || body.length > 2000) throw new Error('İtiraz mesajı 1–2000 karakter olmalı')

  const reasonSnapshot = String(suspensionReason ?? '').trim().slice(0, 500)
  const untilMs = suspensionUntilEpochMs(suspendedUntil)

  const payload = {
    userId: uid,
    userEmail: String(userEmail ?? '').trim().slice(0, 320),
    message: body,
    status: 'pending',
    suspensionReasonSnapshot: reasonSnapshot,
    suspendedUntilSnapshot: untilMs == null ? null : Timestamp.fromMillis(untilMs),
    suspensionKey: buildSuspensionAppealKey(reasonSnapshot, suspendedUntil),
    createdAt: serverTimestamp(),
  }

  const ref = await addDoc(collection(db, 'suspensionAppeals'), payload)
  return ref.id
}

/**
 * @param {string} userId
 * @param {string} suspensionReason
 * @param {unknown} suspendedUntil
 * @returns {Promise<SuspensionAppealRecord | null>}
 */
export async function fetchPendingAppealForSuspension(userId, suspensionReason, suspendedUntil) {
  assertDb()
  const uid = String(userId ?? '').trim()
  if (!uid) return null

  const key = buildSuspensionAppealKey(suspensionReason, suspendedUntil)

  return new Promise((resolve, reject) => {
    const q = query(
      collection(db, 'suspensionAppeals'),
      where('userId', '==', uid),
      where('status', '==', 'pending'),
    )

    const unsub = safeOnSnapshot(
      q,
      (snap) => {
        unsub()
        const match = snap.docs
          .map((d) => mapSuspensionAppealDoc(d.data(), d.id))
          .find((row) => {
            if (row.suspensionKey) return row.suspensionKey === key
            return buildSuspensionAppealKey(row.suspensionReasonSnapshot, row.suspendedUntilSnapshot) === key
          })
        resolve(match ?? null)
      },
      (err) => {
        unsub()
        reject(err)
      },
    )
  })
}

/**
 * @param {(appeal: SuspensionAppealRecord | null) => void} onData
 * @param {(err: unknown) => void} [onError]
 */
export function subscribePendingAppealForSuspension(userId, suspensionReason, suspendedUntil, onData, onError) {
  if (!isFirebaseConfigured() || !db || !userId) {
    onData(null)
    return () => {}
  }

  const key = buildSuspensionAppealKey(suspensionReason, suspendedUntil)
  const q = query(
    collection(db, 'suspensionAppeals'),
    where('userId', '==', userId),
    where('status', '==', 'pending'),
  )

  return safeOnSnapshot(
    q,
    (snap) => {
      const match =
        snap.docs
          .map((d) => mapSuspensionAppealDoc(d.data(), d.id))
          .find((row) => {
            if (row.suspensionKey) return row.suspensionKey === key
            return buildSuspensionAppealKey(row.suspensionReasonSnapshot, row.suspendedUntilSnapshot) === key
          }) ??
        null
      onData(match)
    },
    (err) => onError?.(err),
  )
}

/**
 * Admin — bekleyen itirazlar (userId → kayıt).
 * @param {(map: Record<string, SuspensionAppealRecord>) => void} onData
 * @param {(err: unknown) => void} [onError]
 */
export function subscribePendingAppealsByUser(onData, onError) {
  if (!isFirebaseConfigured() || !db) {
    onData({})
    return () => {}
  }

  const q = query(collection(db, 'suspensionAppeals'), where('status', '==', 'pending'))

  return safeOnSnapshot(
    q,
    (snap) => {
      /** @type {Record<string, SuspensionAppealRecord>} */
      const map = {}
      for (const d of snap.docs) {
        const row = mapSuspensionAppealDoc(d.data(), d.id)
        if (row.userId) map[row.userId] = row
      }
      onData(map)
    },
    (err) => onError?.(err),
  )
}

export { formatFeedbackTimestamp }
