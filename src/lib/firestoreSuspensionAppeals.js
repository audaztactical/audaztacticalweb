import {
  addDoc,
  collection,
  doc,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { sendNotificationSafe } from '../services/notificationService'
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
 *   adminReply: string
 *   repliedAt: import('firebase/firestore').Timestamp | Date | null
 *   repliedBy: string
 *   repliedByEmail: string
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
    adminReply: String(data.adminReply ?? ''),
    repliedAt: coerceFeedbackTimestamp(data.repliedAt),
    repliedBy: String(data.repliedBy ?? ''),
    repliedByEmail: String(data.repliedByEmail ?? ''),
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
 * Mevcut askı dönemine ait itiraz (pending veya replied) — gerçek zamanlı.
 * @param {string} userId
 * @param {string} suspensionReason
 * @param {unknown} suspendedUntil
 * @param {(appeal: SuspensionAppealRecord | null) => void} onData
 * @param {(err: unknown) => void} [onError]
 */
export function subscribeAppealForSuspension(userId, suspensionReason, suspendedUntil, onData, onError) {
  if (!isFirebaseConfigured() || !db || !userId) {
    onData(null)
    return () => {}
  }

  const key = buildSuspensionAppealKey(suspensionReason, suspendedUntil)
  const q = query(collection(db, 'suspensionAppeals'), where('userId', '==', userId))

  return safeOnSnapshot(
    q,
    (snap) => {
      const matches = snap.docs
        .map((d) => mapSuspensionAppealDoc(d.data(), d.id))
        .filter((row) => {
          if (row.suspensionKey) return row.suspensionKey === key
          return buildSuspensionAppealKey(row.suspensionReasonSnapshot, row.suspendedUntilSnapshot) === key
        })
        .sort((a, b) => {
          const ams = suspensionUntilEpochMs(a.createdAt) ?? 0
          const bms = suspensionUntilEpochMs(b.createdAt) ?? 0
          return bms - ams
        })
      onData(matches[0] ?? null)
    },
    (err) => onError?.(err),
  )
}

/**
 * @param {string} appealId
 * @param {(appeal: SuspensionAppealRecord | null) => void} onData
 * @param {(err: unknown) => void} [onError]
 */
export function subscribeAppealById(appealId, onData, onError) {
  if (!isFirebaseConfigured() || !db || !appealId) {
    onData(null)
    return () => {}
  }

  return safeOnSnapshot(
    doc(db, 'suspensionAppeals', appealId),
    (snap) => {
      onData(snap.exists() ? mapSuspensionAppealDoc(snap.data(), snap.id) : null)
    },
    (err) => onError?.(err),
  )
}

/**
 * Admin — itiraza yanıt ver + kullanıcıya bildirim oluştur.
 * @param {string} appealId
 * @param {{
 *   adminReply: string
 *   repliedBy: string
 *   repliedByEmail?: string
 *   recipientId: string
 * }} input
 */
export async function replyToSuspensionAppeal(appealId, { adminReply, repliedBy, repliedByEmail = '', recipientId }) {
  assertDb()
  const id = String(appealId ?? '').trim()
  const body = String(adminReply ?? '').trim()
  const uid = String(repliedBy ?? '').trim()
  const rid = String(recipientId ?? '').trim()

  if (!id) throw new Error('İtiraz kimliği gerekli')
  if (!body || body.length > 2000) throw new Error('Yanıt 1–2000 karakter olmalı')
  if (!uid) throw new Error('Admin oturumu gerekli')
  if (!rid) throw new Error('Alıcı kimliği gerekli')

  await updateDoc(doc(db, 'suspensionAppeals', id), {
    adminReply: body,
    repliedAt: serverTimestamp(),
    repliedBy: uid,
    repliedByEmail: String(repliedByEmail ?? '').trim().slice(0, 320),
    status: 'replied',
  })

  const preview = body.length > 160 ? `${body.slice(0, 160)}…` : body

  await sendNotificationSafe({
    recipientId: rid,
    senderId: uid,
    type: 'SYSTEM',
    title: 'İtirazınıza yanıt geldi',
    message: preview,
    link: '/dashboard',
    targetId: id,
  })
}

/** @deprecated subscribeAppealForSuspension kullanın */
export function subscribePendingAppealForSuspension(userId, suspensionReason, suspendedUntil, onData, onError) {
  return subscribeAppealForSuspension(userId, suspensionReason, suspendedUntil, onData, onError)
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
