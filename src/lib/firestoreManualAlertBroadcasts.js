import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'
import { assertCanManageAdminContent } from '../config/admin'
import { auth, db, isFirebaseConfigured } from './firebase'
import { safeOnSnapshot } from './firestoreSnapshot'

export const MANUAL_ALERT_BROADCASTS_COLLECTION = 'manual_alert_broadcasts'
export const MANUAL_ALERT_SOURCE = 'AUDAZ KOMUTA MERKEZİ'

/** @typedef {{
 *   id: string
 *   title: string
 *   message: string
 *   publishedAt: unknown
 *   publishedAtMs: number
 *   publishedByUid: string
 *   publishedByEmail: string
 *   systemAlertId: string
 *   fcmSent: boolean
 *   source: string
 *   kind?: string
 * }} ManualAlertBroadcastRecord */

/**
 * @param {unknown} ts
 */
export function formatManualAlertBroadcastTime(ts, fallbackMs = 0) {
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

  const ms = Number(fallbackMs) || Date.parse(String(ts ?? ''))
  if (!ms) return '—'
  const date = new Date(ms)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  const hours = String(date.getHours()).padStart(2, '0')
  const mins = String(date.getMinutes()).padStart(2, '0')
  const secs = String(date.getSeconds()).padStart(2, '0')
  return `${day}.${month}.${year} ${hours}:${mins}:${secs}`
}

/**
 * @param {import('firebase/firestore').DocumentSnapshot} snap
 * @returns {ManualAlertBroadcastRecord | null}
 */
export function mapManualAlertBroadcastDoc(snap) {
  if (!snap.exists()) return null
  const d = snap.data()
  const title = String(d.title ?? '').trim()
  const message = String(d.message ?? '').trim()
  if (!title || !message) return null

  return {
    id: snap.id,
    title,
    message,
    publishedAt: d.publishedAt ?? null,
    publishedAtMs: Number(d.publishedAtMs) || 0,
    publishedByUid: String(d.publishedByUid ?? '').trim(),
    publishedByEmail: String(d.publishedByEmail ?? '').trim(),
    systemAlertId: String(d.systemAlertId ?? snap.id).trim(),
    fcmSent: Boolean(d.fcmSent),
    source: String(d.source ?? MANUAL_ALERT_SOURCE).trim(),
    kind: String(d.kind ?? '').trim() || undefined,
  }
}

/**
 * @param {ManualAlertBroadcastRecord | null} row
 */
export function isAdminManualBroadcastRecord(row) {
  if (!row) return false
  const source = String(row.source ?? '').trim()
  if (source === MANUAL_ALERT_SOURCE) return true
  if (row.id.startsWith('manual_')) return true
  if (row.kind === 'admin_manual') return true
  return false
}

/**
 * @param {import('firebase/firestore').DocumentSnapshot} snap
 */
export function isAdminManualBroadcastSnap(snap) {
  if (!snap.exists()) return false
  const d = snap.data()
  if (String(d.source ?? '').trim() !== MANUAL_ALERT_SOURCE) return false
  if (snap.id.startsWith('manual_')) return true
  if (String(d.kind ?? '').trim() === 'admin_manual') return true
  return false
}

/**
 * @param {Record<string, unknown>} data
 */
export function isNewsFeedAdminManualAlertDoc(data, docId = '') {
  if (!data || typeof data !== 'object') return false
  const id = String(docId ?? '').trim()
  if (id.startsWith('manual_')) return true
  if (String(data.source ?? '').trim() === MANUAL_ALERT_SOURCE) return true
  const tags = Array.isArray(data.tags) ? data.tags : []
  return tags.some((t) => String(t).trim() === 'SİSTEM İKAZI')
}

/**
 * @param {Record<string, unknown>} data
 */
export function isNewsFeedManualAlertDoc(data) {
  return isNewsFeedAdminManualAlertDoc(data)
}

/**
 * news_feed içindeki eski manuel ikazları arşive taşır (admin, bir kez).
 * @returns {Promise<{ migrated: number, removed: number }>}
 */
export async function migrateNewsFeedManualAlertsToArchive() {
  if (!isFirebaseConfigured() || !db) return { migrated: 0, removed: 0 }

  await assertCanManageAdminContent(auth?.currentUser ?? null)

  const snap = await getDocs(
    query(collection(db, 'news_feed'), orderBy('timestamp', 'desc'), limit(500)),
  )

  let migrated = 0
  let removed = 0

  for (const newsSnap of snap.docs) {
    const data = newsSnap.data()
    if (!isNewsFeedAdminManualAlertDoc(data, newsSnap.id)) continue

    const title = String(data.trTitle ?? data.title ?? '').trim()
    const message = String(data.trSummary ?? data.message ?? '').trim()
    if (!title || !message) {
      await deleteDoc(doc(db, 'news_feed', newsSnap.id))
      removed += 1
      continue
    }

    const archiveRef = doc(db, MANUAL_ALERT_BROADCASTS_COLLECTION, newsSnap.id)
    const existing = await getDoc(archiveRef)
    if (!existing.exists()) {
      await setDoc(archiveRef, {
        title,
        message,
        publishedAt: data.timestamp ?? serverTimestamp(),
        publishedAtMs: Date.now(),
        publishedByUid: String(data.createdBy ?? '').trim(),
        publishedByEmail: '',
        systemAlertId: String(data.systemAlertId ?? newsSnap.id).trim(),
        fcmSent: false,
        source: MANUAL_ALERT_SOURCE,
        migratedFromNewsFeed: true,
      })
      migrated += 1
    }

    await deleteDoc(doc(db, 'news_feed', newsSnap.id))
    removed += 1
  }

  return { migrated, removed }
}

/**
 * @param {{
 *   broadcastId: string
 *   title: string
 *   message: string
 *   systemAlertId: string
 *   fcmSent?: boolean
 *   publishedAtMs?: number
 * }} payload
 */
export async function writeManualAlertBroadcastLog(payload) {
  if (!isFirebaseConfigured() || !db) {
    throw new Error('Firebase yapılandırılmadı.')
  }

  await assertCanManageAdminContent(auth?.currentUser ?? null)

  const id = String(payload.broadcastId ?? '').trim()
  const title = String(payload.title ?? '').trim()
  const message = String(payload.message ?? '').trim()
  if (!id || !title || !message) {
    throw new Error('Yayın kaydı için kimlik, başlık ve mesaj gerekli.')
  }

  const user = auth?.currentUser
  const publishedAtMs = Number(payload.publishedAtMs) || Date.now()

  await setDoc(doc(db, MANUAL_ALERT_BROADCASTS_COLLECTION, id), {
    title,
    message,
    publishedAt: serverTimestamp(),
    publishedAtMs,
    publishedByUid: String(user?.uid ?? '').trim(),
    publishedByEmail: String(user?.email ?? '').trim(),
    systemAlertId: String(payload.systemAlertId ?? id).trim(),
    fcmSent: Boolean(payload.fcmSent),
    source: MANUAL_ALERT_SOURCE,
    kind: 'admin_manual',
  })
}

/**
 * Arşivdeki RSS/otomatik ikaz kayıtlarını temizler; haber akışına geri yazar.
 * @returns {Promise<{ purged: number, restored: number }>}
 */
export async function purgeNonAdminBroadcastArchive() {
  if (!isFirebaseConfigured() || !db) return { purged: 0, restored: 0 }

  await assertCanManageAdminContent(auth?.currentUser ?? null)

  const snap = await getDocs(collection(db, MANUAL_ALERT_BROADCASTS_COLLECTION))
  let purged = 0
  let restored = 0

  for (const archiveSnap of snap.docs) {
    try {
      if (isAdminManualBroadcastSnap(archiveSnap)) continue

      const d = archiveSnap.data()
      const title = String(d.title ?? '').trim()
      const message = String(d.message ?? '').trim()

      if (title && message && !archiveSnap.id.startsWith('manual_')) {
        await setDoc(doc(db, 'news_feed', archiveSnap.id), {
          source: String(d.originalSource ?? 'TRT HABER SON DAKİKA').trim(),
          timestamp: d.publishedAt ?? serverTimestamp(),
          trTitle: title,
          trSummary: message,
          enTitle: `[LOCAL ALERT] ${title}`,
          enSummary: message,
          tags: ['ASAYİŞ', 'SON DAKİKA', 'ACİL'],
          isAlert: true,
          restoredFromArchive: true,
        })
        restored += 1
      }

      await deleteDoc(doc(db, MANUAL_ALERT_BROADCASTS_COLLECTION, archiveSnap.id))
      purged += 1
    } catch {
      /* tek kayıt başarısız — devam */
    }
  }

  return { purged, restored }
}

/**
 * @param {number} [maxRows]
 * @returns {Promise<ManualAlertBroadcastRecord[]>}
 */
export async function fetchManualAlertBroadcasts(maxRows = 100) {
  if (!isFirebaseConfigured() || !db) return []

  await assertCanManageAdminContent(auth?.currentUser ?? null)

  const cap = Math.min(200, Math.max(1, maxRows))
  const q = query(
    collection(db, MANUAL_ALERT_BROADCASTS_COLLECTION),
    orderBy('publishedAt', 'desc'),
    limit(cap),
  )
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => mapManualAlertBroadcastDoc(d))
    .filter(isAdminManualBroadcastRecord)
}

/**
 * @param {(rows: ManualAlertBroadcastRecord[]) => void} onData
 * @param {(err: unknown) => void} [onError]
 * @param {number} [maxRows]
 */
export function subscribeManualAlertBroadcasts(onData, onError, maxRows = 100) {
  if (!isFirebaseConfigured() || !db) {
    onData([])
    return () => {}
  }

  const cap = Math.min(200, Math.max(1, maxRows))

  const emitRows = (/** @type {import('firebase/firestore').QuerySnapshot} */ snap) => {
    const rows = snap.docs
      .map((d) => mapManualAlertBroadcastDoc(d))
      .filter(isAdminManualBroadcastRecord)
    onData(rows)
  }

  const q = query(
    collection(db, MANUAL_ALERT_BROADCASTS_COLLECTION),
    orderBy('publishedAt', 'desc'),
    limit(cap),
  )

  return safeOnSnapshot(
    q,
    emitRows,
    (err) => {
      getDocs(collection(db, MANUAL_ALERT_BROADCASTS_COLLECTION))
        .then((fallbackSnap) => {
          const rows = fallbackSnap.docs
            .map((d) => mapManualAlertBroadcastDoc(d))
            .filter(isAdminManualBroadcastRecord)
            .sort((a, b) => (b.publishedAtMs || 0) - (a.publishedAtMs || 0))
            .slice(0, cap)
          onData(rows)
        })
        .catch((fallbackErr) => onError?.(fallbackErr ?? err))
    },
  )
}

/**
 * Operatör görünümü — acil durum arşivi (giriş yapmış kullanıcılar).
 * @param {(rows: ManualAlertBroadcastRecord[]) => void} onData
 * @param {(err: unknown) => void} [onError]
 */
export function subscribeEmergencyAlertArchive(onData, onError) {
  return subscribeManualAlertBroadcasts(onData, onError, 200)
}
