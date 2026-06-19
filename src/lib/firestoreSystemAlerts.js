import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from './firebase'
import { finalizeSystemAlertAcknowledgment } from './firestoreSystemAlertReceipts'

/** @typedef {{
 *   id: string
 *   title: string
 *   message: string
 *   active: boolean
 *   mandatory: boolean
 *   source: string
 *   createdAt: unknown
 * }} SystemAlertRecord */

/**
 * @param {import('firebase/firestore').DocumentSnapshot} snap
 * @returns {SystemAlertRecord | null}
 */
export function mapSystemAlertDoc(snap) {
  if (!snap.exists()) return null
  const d = snap.data()
  const title = String(d.title ?? '').trim()
  const message = String(d.message ?? '').trim()
  if (!title || !message) return null

  return {
    id: snap.id,
    title,
    message,
    active: d.active !== false,
    mandatory: d.mandatory !== false,
    source: String(d.source ?? 'AUDAZ KOMUTA MERKEZİ').trim(),
    createdAt: d.createdAt ?? null,
  }
}

/**
 * @param {string} uid
 * @param {(pending: SystemAlertRecord[]) => void} onPending
 * @param {(err: unknown) => void} [onError]
 */
export function subscribePendingSystemAlerts(uid, onPending, onError) {
  if (!isFirebaseConfigured() || !db || !uid) {
    onPending([])
    return () => {}
  }

  /** @type {SystemAlertRecord[]} */
  let activeAlerts = []
  /** @type {Set<string>} */
  let ackedIds = new Set()

  const emit = () => {
    const pending = activeAlerts
      .filter((row) => row.mandatory && !ackedIds.has(row.id))
      .sort((a, b) => {
        const ta = a.createdAt?.toDate?.()?.getTime?.() ?? 0
        const tb = b.createdAt?.toDate?.()?.getTime?.() ?? 0
        return ta - tb
      })
    onPending(pending)
  }

  const alertsQuery = query(
    collection(db, 'system_alerts'),
    where('active', '==', true),
    orderBy('createdAt', 'desc'),
    limit(20),
  )

  const acksRef = collection(db, 'users', uid, 'system_alert_acks')

  const unsubAlerts = onSnapshot(
    alertsQuery,
    (snap) => {
      activeAlerts = snap.docs.map((d) => mapSystemAlertDoc(d)).filter(Boolean)
      emit()
    },
    (err) => {
      onError?.(err)
      try {
        getDocs(collection(db, 'system_alerts'))
          .then((fallback) => {
            activeAlerts = fallback.docs
              .map((d) => mapSystemAlertDoc(d))
              .filter((row) => row?.active)
            emit()
          })
          .catch((fallbackErr) => onError?.(fallbackErr))
      } catch {
        /* ignore */
      }
    },
  )

  const unsubAcks = onSnapshot(
    acksRef,
    (snap) => {
      ackedIds = new Set(snap.docs.map((d) => d.id))
      emit()
    },
    (err) => onError?.(err),
  )

  return () => {
    unsubAlerts()
    unsubAcks()
  }
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
export async function acknowledgeSystemAlert(uid, alertId, profile = {}) {
  return finalizeSystemAlertAcknowledgment(uid, alertId, profile)
}
