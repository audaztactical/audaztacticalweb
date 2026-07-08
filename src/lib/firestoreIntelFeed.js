import { collection, doc, getDocs, limit, orderBy, query, updateDoc, where } from 'firebase/firestore'
import { db, isFirebaseConfigured } from './firebase'
import { safeOnSnapshot, timestampToMs } from './firestoreSnapshot'

export const INTEL_NEWS_TYPE = 'haber'

/**
 * @typedef {{
 *   id: string
 *   source: string
 *   timestamp: unknown
 *   enTitle: string
 *   trTitle: string
 *   enSummary: string
 *   trSummary: string
 *   tags: string[]
 *   url: string
 *   type?: string
 *   public?: boolean
 *   hiddenFromFeed?: boolean
 *   isAlert?: boolean
 * }} IntelFeedItem
 */

/**
 * Küresel Haber Ağı / landing görünürlük filtresi.
 * isAlert KHA görünürlüğünü etkilemez (yalnızca admin İKAZ rozeti + FCM).
 * @param {Record<string, unknown>} data
 */
export function isIntelFeedDocVisible(data) {
  if (data.hiddenFromFeed === true) return false
  if (String(data.source ?? '').trim() === 'AUDAZ KOMUTA MERKEZİ') return false
  const tags = Array.isArray(data.tags) ? data.tags : []
  if (tags.some((t) => String(t).includes('SİSTEM İKAZI'))) return false
  return true
}

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
 * @returns {IntelFeedItem | null}
 */
export function mapIntelFeedDoc(raw, docId) {
  if (!raw || typeof raw !== 'object') return null
  const d = /** @type {Record<string, unknown>} */ (raw)
  const tags = Array.isArray(d.tags)
    ? d.tags.filter((t) => typeof t === 'string' && t.trim()).map((t) => String(t).trim())
    : []

  return {
    id: typeof d.id === 'string' && d.id.trim() ? d.id.trim() : docId,
    source: String(d.source ?? 'UNKNOWN SOURCE').trim() || 'UNKNOWN SOURCE',
    timestamp: d.timestamp ?? null,
    enTitle: String(d.enTitle ?? '').trim(),
    trTitle: String(d.trTitle ?? '').trim(),
    enSummary: String(d.enSummary ?? '').trim(),
    trSummary: String(d.trSummary ?? '').trim(),
    tags,
    url: String(d.url ?? '').trim(),
    type: String(d.type ?? INTEL_NEWS_TYPE).trim() || INTEL_NEWS_TYPE,
    public: d.public !== false,
    isAlert: d.isAlert === true,
  }
}

/**
 * @param {unknown} ts
 */
export function formatIntelTimestamp(ts) {
  if (ts && typeof ts === 'object' && 'toDate' in ts && typeof ts.toDate === 'function') {
    const date = ts.toDate()
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    const hours = String(date.getHours()).padStart(2, '0')
    const mins = String(date.getMinutes()).padStart(2, '0')
    const secs = String(date.getSeconds()).padStart(2, '0')
    return `${day}.${month}.${year} - ${hours}:${mins}:${secs}`
  }
  const ms = Date.parse(String(ts ?? ''))
  if (!ms) return '—'
  const date = new Date(ms)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  const hours = String(date.getHours()).padStart(2, '0')
  const mins = String(date.getMinutes()).padStart(2, '0')
  const secs = String(date.getSeconds()).padStart(2, '0')
  return `${day}.${month}.${year} - ${hours}:${mins}:${secs}`
}

/**
 * Landing — Küresel Haber Ağı (OSINT) haber önizlemesi (limit 3).
 * @param {number} [max=3]
 * @returns {Promise<IntelFeedItem[]>}
 */
export async function fetchLandingIntelNews(max = 3) {
  if (!isFirebaseConfigured() || !db) return []

  const cap = Math.max(1, Math.min(max, 6))

  try {
    const typed = query(
      collection(db, 'news_feed'),
      where('type', '==', INTEL_NEWS_TYPE),
      orderBy('timestamp', 'desc'),
      limit(cap),
    )
    const snap = await getDocs(typed)
    if (!snap.empty) {
      return snap.docs
        .map((d) => mapIntelFeedDoc(d.data(), d.id))
        .filter((row) => {
          if (!row) return false
          const raw = snap.docs.find((docSnap) => docSnap.id === row.id)?.data()
          return isIntelFeedDocVisible(raw ?? {})
        })
    }
  } catch {
    /* composite index henüz yok — genel sorguya düş */
  }

  const fallback = query(collection(db, 'news_feed'), orderBy('timestamp', 'desc'), limit(12))
  const snap = await getDocs(fallback)
  return snap.docs
    .map((d) => mapIntelFeedDoc(d.data(), d.id))
    .filter((row) => {
      if (!row) return false
      const raw = snap.docs.find((docSnap) => docSnap.id === row.id)?.data()
      if (!isIntelFeedDocVisible(raw ?? {})) return false
      return row.type === INTEL_NEWS_TYPE || row.public !== false
    })
    .slice(0, cap)
}

/**
 * Admin — kaydı Küresel Haber Ağı'ndan gizle / geri al.
 * @param {string} itemId
 * @param {boolean} hidden
 */
export async function setIntelFeedHiddenFromFeed(itemId, hidden) {
  assertDb()
  const id = String(itemId ?? '').trim()
  if (!id) throw new Error('Kayıt kimliği gerekli')
  await updateDoc(doc(db, 'news_feed', id), { hiddenFromFeed: Boolean(hidden) })
}

/**
 * @param {(items: IntelFeedItem[]) => void} onData
 * @param {(err: unknown) => void} [onError]
 */
export function subscribeIntelFeed(onData, onError) {
  if (!isFirebaseConfigured() || !db) {
    onData([])
    return () => {}
  }

  const q = query(collection(db, 'news_feed'), orderBy('timestamp', 'desc'))

  return safeOnSnapshot(
    q,
    (snap) => {
      const rows = snap.docs
        .filter((docSnap) => isIntelFeedDocVisible(docSnap.data()))
        .map((d) => mapIntelFeedDoc(d.data(), d.id))
        .filter(Boolean)
        .sort((a, b) => timestampToMs(b.timestamp) - timestampToMs(a.timestamp))
      onData(rows)
    },
    (err) => onError?.(err),
  )
}
