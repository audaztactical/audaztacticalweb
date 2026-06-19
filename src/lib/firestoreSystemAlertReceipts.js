import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'
import { assertCanManageAdminContent } from '../config/admin'
import { auth, db, isFirebaseConfigured } from './firebase'
import { safeOnSnapshot } from './firestoreSnapshot'

/** @typedef {{
 *   id: string
 *   uid: string
 *   alertId: string
 *   email: string
 *   displayName: string
 *   callsign: string
 *   seenAt: unknown
 *   acknowledgedAt: unknown
 * }} SystemAlertReceiptRecord */

/**
 * @param {unknown} ts
 */
export function formatSystemAlertReceiptTime(ts) {
  if (ts && typeof ts === 'object' && 'toDate' in ts && typeof ts.toDate === 'function') {
    const date = ts.toDate()
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    const hours = String(date.getHours()).padStart(2, '0')
    const mins = String(date.getMinutes()).padStart(2, '0')
    const secs = String(date.getSeconds()).padStart(2, '0')
    return `${day}.${month}.${year} ${hours}:${mins}:${secs}`
  }
  return '—'
}

/**
 * @param {import('firebase/firestore').DocumentSnapshot} snap
 * @returns {SystemAlertReceiptRecord | null}
 */
export function mapSystemAlertReceiptDoc(snap) {
  if (!snap.exists()) return null
  const d = snap.data()
  return {
    id: snap.id,
    uid: String(d.uid ?? snap.id ?? '').trim(),
    alertId: String(d.alertId ?? '').trim(),
    email: String(d.email ?? '').trim(),
    displayName: String(d.displayName ?? '').trim(),
    callsign: String(d.callsign ?? '').trim(),
    seenAt: d.seenAt ?? null,
    acknowledgedAt: d.acknowledgedAt ?? null,
  }
}

/**
 * @param {string} alertId
 * @param {{
 *   uid: string
 *   email?: string
 *   displayName?: string
 *   callsign?: string
 * }} user
 */
export async function recordSystemAlertSeen(alertId, user) {
  if (!isFirebaseConfigured() || !db) return

  const id = String(alertId ?? '').trim()
  const uid = String(user?.uid ?? '').trim()
  if (!id || !uid) return

  const ref = doc(db, 'system_alerts', id, 'receipts', uid)
  await setDoc(
    ref,
    {
      alertId: id,
      uid,
      email: String(user.email ?? '').trim(),
      displayName: String(user.displayName ?? '').trim(),
      callsign: String(user.callsign ?? '').trim(),
      seenAt: serverTimestamp(),
    },
    { merge: true },
  )
}

/**
 * @param {string} uid
 * @param {string} alertId
 * @param {{
 *   email?: string
 *   displayName?: string
 *   callsign?: string
 * }} [profile]
 */
export async function finalizeSystemAlertAcknowledgment(uid, alertId, profile = {}) {
  if (!isFirebaseConfigured() || !db) {
    throw new Error('Firebase yapılandırılmadı.')
  }

  const userId = String(uid ?? '').trim()
  const id = String(alertId ?? '').trim()
  if (!userId || !id) {
    throw new Error('Onay için oturum ve ikaz kimliği gerekli.')
  }

  await setDoc(doc(db, 'users', userId, 'system_alert_acks', id), {
    alertId: id,
    acknowledgedAt: serverTimestamp(),
  })

  await setDoc(
    doc(db, 'system_alerts', id, 'receipts', userId),
    {
      alertId: id,
      uid: userId,
      email: String(profile.email ?? auth?.currentUser?.email ?? '').trim(),
      displayName: String(profile.displayName ?? auth?.currentUser?.displayName ?? '').trim(),
      callsign: String(profile.callsign ?? '').trim(),
      acknowledgedAt: serverTimestamp(),
    },
    { merge: true },
  )
}

/**
 * @param {string} alertId
 * @returns {Promise<SystemAlertReceiptRecord[]>}
 */
export async function fetchSystemAlertReceipts(alertId) {
  if (!isFirebaseConfigured() || !db) return []

  await assertCanManageAdminContent(auth?.currentUser ?? null)

  const id = String(alertId ?? '').trim()
  if (!id) return []

  const snap = await getDocs(collection(db, 'system_alerts', id, 'receipts'))
  const rows = snap.docs.map((d) => mapSystemAlertReceiptDoc(d)).filter(Boolean)
  rows.sort((a, b) => {
    const ackA = a.acknowledgedAt?.toDate?.()?.getTime?.() ?? 0
    const ackB = b.acknowledgedAt?.toDate?.()?.getTime?.() ?? 0
    if (ackA && ackB) return ackB - ackA
    if (ackA) return -1
    if (ackB) return 1
    const seenA = a.seenAt?.toDate?.()?.getTime?.() ?? 0
    const seenB = b.seenAt?.toDate?.()?.getTime?.() ?? 0
    return seenB - seenA
  })
  return rows
}

/**
 * @param {string} alertId
 * @param {(rows: SystemAlertReceiptRecord[]) => void} onData
 * @param {(err: unknown) => void} [onError]
 */
export function subscribeSystemAlertReceipts(alertId, onData, onError) {
  if (!isFirebaseConfigured() || !db) {
    onData([])
    return () => {}
  }

  const id = String(alertId ?? '').trim()
  if (!id) {
    onData([])
    return () => {}
  }

  return safeOnSnapshot(
    collection(db, 'system_alerts', id, 'receipts'),
    (snap) => {
      const rows = snap.docs.map((d) => mapSystemAlertReceiptDoc(d)).filter(Boolean)
      rows.sort((a, b) => {
        const ackA = a.acknowledgedAt?.toDate?.()?.getTime?.() ?? 0
        const ackB = b.acknowledgedAt?.toDate?.()?.getTime?.() ?? 0
        if (ackA && ackB) return ackB - ackA
        if (ackA) return -1
        if (ackB) return 1
        const seenA = a.seenAt?.toDate?.()?.getTime?.() ?? 0
        const seenB = b.seenAt?.toDate?.()?.getTime?.() ?? 0
        return seenB - seenA
      })
      onData(rows)
    },
    (err) => onError?.(err),
  )
}

/**
 * @param {SystemAlertReceiptRecord[]} rows
 */
export function summarizeSystemAlertReceipts(rows) {
  const seen = rows.filter((r) => r.seenAt).length
  const acked = rows.filter((r) => r.acknowledgedAt).length
  return { seen, acked, total: rows.length }
}
