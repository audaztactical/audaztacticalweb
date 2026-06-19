import { collection, getDocs, limit, orderBy, query, startAfter } from 'firebase/firestore'
import { assertCanManageAdminContent } from '../config/admin'
import { auth, db, isFirebaseConfigured } from './firebase'
import {
  formatManualAlertBroadcastTime,
  isAdminManualBroadcastRecord,
  MANUAL_ALERT_BROADCASTS_COLLECTION,
  mapManualAlertBroadcastDoc,
} from './firestoreManualAlertBroadcasts'

/** @typedef {import('./firestoreManualAlertBroadcasts').ManualAlertBroadcastRecord} ManualAlertBroadcastRecord */

const EXPORT_BATCH_SIZE = 200
const EXPORT_MAX_ROWS = 2000

/**
 * Tüm yayın günlüğü (sayfalı okuma, rapor için).
 * @returns {Promise<ManualAlertBroadcastRecord[]>}
 */
export async function fetchAllManualAlertBroadcasts() {
  if (!isFirebaseConfigured() || !db) return []

  await assertCanManageAdminContent(auth?.currentUser ?? null)

  /** @type {ManualAlertBroadcastRecord[]} */
  const all = []
  /** @type {import('firebase/firestore').QueryDocumentSnapshot | null} */
  let lastDoc = null

  while (all.length < EXPORT_MAX_ROWS) {
    /** @type {import('firebase/firestore').QueryConstraint[]} */
    const constraints = [
      orderBy('publishedAt', 'desc'),
      limit(EXPORT_BATCH_SIZE),
    ]
    if (lastDoc) {
      constraints.push(startAfter(lastDoc))
    }

    const snap = await getDocs(
      query(collection(db, MANUAL_ALERT_BROADCASTS_COLLECTION), ...constraints),
    )
    if (snap.empty) break

    for (const docSnap of snap.docs) {
      const row = mapManualAlertBroadcastDoc(docSnap)
      if (row && isAdminManualBroadcastRecord(row)) all.push(row)
    }

    lastDoc = snap.docs[snap.docs.length - 1]
    if (snap.docs.length < EXPORT_BATCH_SIZE) break
  }

  return all
}

/**
 * @param {ManualAlertBroadcastRecord[]} rows
 */
export function buildManualAlertBroadcastCsv(rows) {
  const header = ['Yayın zamanı', 'Başlık', 'İçerik', 'Yayınlayan', 'Push', 'Kayıt ID']
  const escape = (/** @type {string} */ v) => {
    const s = String(v ?? '').replace(/"/g, '""')
    return `"${s}"`
  }

  const lines = [
    header.map(escape).join(','),
    ...rows.map((row) =>
      [
        formatManualAlertBroadcastTime(row.publishedAt, row.publishedAtMs),
        row.title,
        row.message,
        row.publishedByEmail || row.publishedByUid,
        row.fcmSent ? 'Gönderildi' : '—',
        row.id,
      ]
        .map(escape)
        .join(','),
    ),
  ]

  return `\uFEFF${lines.join('\r\n')}`
}

/**
 * @param {ManualAlertBroadcastRecord[]} rows
 */
export function downloadManualAlertBroadcastCsv(rows) {
  const csv = buildManualAlertBroadcastCsv(rows)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `AUDAZ-IKAZ-GUNLUGU-${stamp}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
