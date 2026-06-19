import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from './firebase'
import {
  buildVideoNewsFilterOptions,
  DEFAULT_YOUTUBE_CHANNELS,
  subscribeYoutubeChannels,
} from './firestoreYoutubeChannels'

/**
 * @typedef {{
 *   id: string
 *   title: string
 *   url: string
 *   origin: string
 *   publishDate: unknown
 *   timestamp: unknown
 *   description?: string
 *   thumbnail?: string
 *   videoId?: string
 * }} VideoNewsItem
 */

export const VIDEO_NEWS_PAGE_SIZE = 20

/** @deprecated Canlı liste için subscribeYoutubeChannelFilters kullanın. */
export const VIDEO_NEWS_CHANNEL_FILTERS = [
  'TÜMÜ',
  'TASK & PURPOSE',
  'T.REX ARMS',
  'GBRS Group',
  'Polenar Tactical',
  'CarryTrainer',
  'SPARTAN117GW',
]

/**
 * @param {unknown} raw
 * @param {string} docId
 * @returns {VideoNewsItem | null}
 */
export function mapVideoNewsDoc(raw, docId) {
  if (!raw || typeof raw !== 'object') return null
  const d = /** @type {Record<string, unknown>} */ (raw)
  const title = String(d.title ?? '').trim()
  const url = String(d.url ?? '').trim()
  if (!title || !url) return null

  return {
    id: docId,
    title,
    url,
    origin: String(d.origin ?? 'UNKNOWN').trim() || 'UNKNOWN',
    publishDate: d.publishDate ?? d.publishedAt ?? null,
    timestamp: d.timestamp ?? null,
    description: String(d.description ?? '').trim() || undefined,
    thumbnail: String(d.thumbnail ?? '').trim() || undefined,
    videoId: String(d.videoId ?? '').trim() || undefined,
  }
}

/**
 * @param {unknown} ts
 */
export function formatVideoNewsTimestamp(ts) {
  if (ts && typeof ts === 'object' && 'toDate' in ts && typeof ts.toDate === 'function') {
    const date = ts.toDate()
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    const hours = String(date.getHours()).padStart(2, '0')
    const mins = String(date.getMinutes()).padStart(2, '0')
    return `${day}.${month}.${year} · ${hours}:${mins}`
  }
  const ms = Date.parse(String(ts ?? ''))
  if (!ms) return '—'
  const date = new Date(ms)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  const hours = String(date.getHours()).padStart(2, '0')
  const mins = String(date.getMinutes()).padStart(2, '0')
  return `${day}.${month}.${year} · ${hours}:${mins}`
}

/**
 * @param {VideoNewsItem} item
 */
export function formatVideoNewsDisplayDate(item) {
  return formatVideoNewsTimestamp(item.publishDate ?? item.timestamp)
}

/**
 * @param {{
 *   filter?: string
 *   pageSize?: number
 *   lastDoc?: import('firebase/firestore').QueryDocumentSnapshot | null
 * }} [options]
 * @returns {Promise<{
 *   items: VideoNewsItem[]
 *   lastDoc: import('firebase/firestore').QueryDocumentSnapshot | null
 *   hasMore: boolean
 * }>}
 */
export async function fetchVideoNewsPage(options = {}) {
  const filter = String(options.filter ?? 'TÜMÜ').trim() || 'TÜMÜ'
  const pageSize = Math.max(1, Number(options.pageSize) || VIDEO_NEWS_PAGE_SIZE)
  const lastDoc = options.lastDoc ?? null

  if (!isFirebaseConfigured() || !db) {
    return { items: [], lastDoc: null, hasMore: false }
  }

  /** @type {import('firebase/firestore').QueryConstraint[]} */
  const constraints = []

  if (filter !== 'TÜMÜ') {
    constraints.push(where('origin', '==', filter))
  }

  constraints.push(orderBy('publishDate', 'desc'))

  if (lastDoc) {
    constraints.push(startAfter(lastDoc))
  }

  constraints.push(limit(pageSize))

  const snap = await getDocs(query(collection(db, 'video_news'), ...constraints))
  const items = snap.docs
    .map((d) => mapVideoNewsDoc(d.data(), d.id))
    .filter(Boolean)

  const nextLastDoc = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : lastDoc

  return {
    items,
    lastDoc: nextLastDoc,
    hasMore: snap.docs.length === pageSize,
  }
}

/**
 * @param {(filters: string[]) => void} onFilters
 * @param {(err: unknown) => void} [onError]
 */
export function subscribeYoutubeChannelFilters(onFilters, onError) {
  const fallback = [
    'TÜMÜ',
    ...DEFAULT_YOUTUBE_CHANNELS.map((row) => row.name),
  ]

  if (!isFirebaseConfigured() || !db) {
    onFilters(fallback)
    return () => {}
  }

  return subscribeYoutubeChannels(
    (rows) => {
      if (rows.length === 0) {
        onFilters(fallback)
        return
      }
      onFilters(buildVideoNewsFilterOptions(rows))
    },
    (err) => {
      onError?.(err)
      onFilters(fallback)
    },
  )
}
