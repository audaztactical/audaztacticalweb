import { collection, orderBy, query } from 'firebase/firestore'
import { db, isFirebaseConfigured } from './firebase'
import { safeOnSnapshot, timestampToMs } from './firestoreSnapshot'

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
 * }} IntelFeedItem
 */

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
        .map((d) => mapIntelFeedDoc(d.data(), d.id))
        .filter(Boolean)
        .sort((a, b) => timestampToMs(b.timestamp) - timestampToMs(a.timestamp))
      onData(rows)
    },
    (err) => onError?.(err),
  )
}
