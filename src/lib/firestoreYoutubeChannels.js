import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore'
import { assertCanManageAdminContent } from '../config/admin'
import { callResolveYoutubeChannel } from './cloudFunctions'
import { auth, db, isFirebaseConfigured } from './firebase'
import { safeOnSnapshot } from './firestoreSnapshot'

/** @typedef {{
 *   id: string
 *   name: string
 *   channelId: string
 *   feedUrl: string
 *   enabled: boolean
 *   sortOrder: number
 *   createdAt: unknown
 *   updatedAt: unknown
 * }} YoutubeChannelRecord */

/** Mevcut sabit liste — ilk kurulumda Firestore'a taşınır. */
export const DEFAULT_YOUTUBE_CHANNELS = [
  {
    name: 'TASK & PURPOSE',
    channelId: 'UCSq3p5NKEtyp5Rjd4ctiEbg',
  },
  {
    name: 'T.REX ARMS',
    channelId: 'UCU-ljC8EvKZFhJ-pct_5rMQ',
  },
  {
    name: 'GBRS Group',
    channelId: 'UCJxCLIuutemQ2D71hD3c5ug',
  },
  {
    name: 'Polenar Tactical',
    channelId: 'UC-24483CtyVfhJ-XxRfPr8Q',
  },
  {
    name: 'CarryTrainer',
    channelId: 'UCP09pijua2ypZguXBA7FnQA',
  },
  {
    name: 'SPARTAN117GW',
    channelId: 'UC1gt5hr3hBRMGmkfYJT56Lw',
  },
]

/**
 * @param {string} input Kanal ID, kanal URL veya RSS feed URL
 */
export function parseYouTubeChannelId(input) {
  const s = String(input ?? '').trim()
  if (!s) return ''

  const fromQuery = s.match(/[?&]channel_id=([A-Za-z0-9_-]+)/i)
  if (fromQuery?.[1]) return fromQuery[1]

  const fromPath = s.match(/youtube\.com\/channel\/([A-Za-z0-9_-]+)/i)
  if (fromPath?.[1]) return fromPath[1]

  if (/^UC[\w-]{10,}$/i.test(s)) return s

  return ''
}

/**
 * @param {string} input @handle veya youtube.com/@… URL (UC… değil)
 */
export function looksLikeYoutubeHandle(input) {
  const s = String(input ?? '').trim()
  if (!s) return false
  if (parseYouTubeChannelId(s)) return false
  if (/youtube\.com\/@/i.test(s)) return true
  if (/^@[A-Za-z0-9._-]+$/.test(s)) return true
  if (/^[A-Za-z0-9._-]{3,}$/.test(s) && !s.startsWith('UC')) return true
  return false
}

/**
 * Kanal ID doğrudan veya Cloud Function ile @handle çözümlemesi.
 * @param {string} input
 * @returns {Promise<{ channelId: string; feedUrl: string }>}
 */
export async function resolveYoutubeChannelInput(input) {
  const direct = parseYouTubeChannelId(input)
  if (direct) {
    return { channelId: direct, feedUrl: buildYoutubeFeedUrl(direct) }
  }
  const resolved = await callResolveYoutubeChannel(input)
  const channelId = String(resolved?.channelId ?? '').trim()
  if (!channelId) throw new Error('YouTube kanal kimliği çözümlenemedi.')
  return {
    channelId,
    feedUrl: String(resolved?.feedUrl ?? '').trim() || buildYoutubeFeedUrl(channelId),
  }
}

/**
 * @param {string} channelId
 */
export function buildYoutubeFeedUrl(channelId) {
  const id = String(channelId ?? '').trim()
  if (!id) return ''
  return `https://www.youtube.com/feeds/videos.xml?channel_id=${id}`
}

/**
 * @param {import('firebase/firestore').DocumentSnapshot} snap
 * @returns {YoutubeChannelRecord | null}
 */
export function mapYoutubeChannelDoc(snap) {
  if (!snap.exists()) return null
  const d = snap.data()
  const channelId = String(d.channelId ?? snap.id ?? '').trim()
  const name = String(d.name ?? '').trim()
  if (!channelId || !name) return null

  return {
    id: snap.id,
    name,
    channelId,
    feedUrl:
      String(d.feedUrl ?? '').trim() || buildYoutubeFeedUrl(channelId),
    enabled: d.enabled !== false,
    sortOrder: Number(d.sortOrder) || 0,
    createdAt: d.createdAt ?? null,
    updatedAt: d.updatedAt ?? null,
  }
}

/**
 * @param {YoutubeChannelRecord[]} rows
 */
export function buildVideoNewsFilterOptions(rows) {
  const names = rows
    .filter((row) => row.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'tr'))
    .map((row) => row.name)
  return ['TÜMÜ', ...names]
}

/**
 * @returns {Promise<YoutubeChannelRecord[]>}
 */
export async function fetchYoutubeChannels() {
  if (!isFirebaseConfigured() || !db) return []

  try {
    const q = query(collection(db, 'youtube_channels'), orderBy('sortOrder', 'asc'))
    const snap = await getDocs(q)
    return snap.docs.map((d) => mapYoutubeChannelDoc(d)).filter(Boolean)
  } catch {
    const snap = await getDocs(collection(db, 'youtube_channels'))
    return snap.docs
      .map((d) => mapYoutubeChannelDoc(d))
      .filter(Boolean)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'tr'))
  }
}

/**
 * @param {(rows: YoutubeChannelRecord[]) => void} onData
 * @param {(err: unknown) => void} [onError]
 */
export function subscribeYoutubeChannels(onData, onError) {
  if (!isFirebaseConfigured() || !db) {
    onData([])
    return () => {}
  }

  const mapRows = (/** @type {import('firebase/firestore').QuerySnapshot} */ snap) => {
    const rows = snap.docs.map((d) => mapYoutubeChannelDoc(d)).filter(Boolean)
    rows.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'tr'))
    onData(rows)
  }

  try {
    const q = query(collection(db, 'youtube_channels'), orderBy('sortOrder', 'asc'))
    return safeOnSnapshot(q, mapRows, (err) => onError?.(err))
  } catch (err) {
    return safeOnSnapshot(
      collection(db, 'youtube_channels'),
      mapRows,
      (snapErr) => onError?.(snapErr ?? err),
    )
  }
}

/**
 * Koleksiyon boşsa varsayılan kanalları yükler.
 */
export async function seedDefaultYoutubeChannelsIfEmpty() {
  if (!isFirebaseConfigured() || !db) return 0
  await assertCanManageAdminContent(auth?.currentUser ?? null)

  const existing = await getDocs(collection(db, 'youtube_channels'))
  if (!existing.empty) return 0

  const batch = writeBatch(db)
  let order = 0
  for (const row of DEFAULT_YOUTUBE_CHANNELS) {
    const channelId = String(row.channelId ?? '').trim()
    const name = String(row.name ?? '').trim()
    if (!channelId || !name) continue
    order += 10
    const ref = doc(db, 'youtube_channels', channelId)
    batch.set(ref, {
      name,
      channelId,
      feedUrl: buildYoutubeFeedUrl(channelId),
      enabled: true,
      sortOrder: order,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  }
  await batch.commit()
  return order / 10
}

/**
 * @param {{ name: string; channelInput: string }} payload
 */
export async function addYoutubeChannel(payload) {
  if (!isFirebaseConfigured() || !db) throw new Error('Firebase yapılandırılmadı')
  await assertCanManageAdminContent(auth?.currentUser ?? null)

  const name = String(payload.name ?? '').trim()
  if (!name) throw new Error('Kanal adı gerekli.')

  const { channelId } = await resolveYoutubeChannelInput(payload.channelInput)
  if (!channelId) throw new Error('Geçerli YouTube kanal kimliği veya URL girin.')

  const ref = doc(db, 'youtube_channels', channelId)
  await setDoc(
    ref,
    {
      name,
      channelId,
      feedUrl: buildYoutubeFeedUrl(channelId),
      enabled: true,
      sortOrder: Date.now(),
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true },
  )
}

/**
 * @param {string} channelDocId
 */
export async function deleteYoutubeChannel(channelDocId) {
  if (!isFirebaseConfigured() || !db) throw new Error('Firebase yapılandırılmadı')
  await assertCanManageAdminContent(auth?.currentUser ?? null)

  const id = String(channelDocId ?? '').trim()
  if (!id) throw new Error('Kanal kimliği gerekli.')
  await deleteDoc(doc(db, 'youtube_channels', id))
}
