import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db, isFirebaseConfigured } from './firebase'
import { safeOnSnapshot, timestampToMs } from './firestoreSnapshot'

/** @typedef {{
 *   id: string
 *   title: string
 *   teaser: string
 *   body: string
 *   category: string
 *   isPublic: boolean
 *   createdAt: unknown
 * }} AkademiDoctrine */

/** @typedef {{
 *   id: string
 *   title: string
 *   url: string
 *   createdAt: unknown
 * }} AkademiVideo */

function assertDb() {
  if (!isFirebaseConfigured() || !db) {
    const e = new Error('Firebase yapılandırılmadı')
    e.code = 'failed-precondition'
    throw e
  }
}

/**
 * @param {import('firebase/firestore').QueryDocumentSnapshot} snap
 * @returns {AkademiDoctrine}
 */
function mapDoctrineDoc(snap) {
  const data = snap.data()
  const teaser = data.teaser ?? data.summary ?? ''
  return {
    id: snap.id,
    title: typeof data.title === 'string' ? data.title : 'Başlıksız doktrin',
    teaser: typeof teaser === 'string' ? teaser : '',
    body: typeof data.body === 'string' ? data.body : '',
    category: typeof data.category === 'string' ? data.category : 'Genel',
    isPublic: data.isPublic === true,
    createdAt: data.createdAt ?? null,
  }
}

/**
 * @param {import('firebase/firestore').QueryDocumentSnapshot} snap
 * @returns {AkademiVideo}
 */
function mapVideoDoc(snap) {
  const data = snap.data()
  return {
    id: snap.id,
    title: typeof data.title === 'string' ? data.title : 'Başlıksız video',
    url: typeof data.url === 'string' ? data.url : '',
    createdAt: data.createdAt ?? null,
  }
}

/**
 * @param {(rows: AkademiDoctrine[]) => void} onNext
 * @param {(err: unknown) => void} [onError]
 */
export function subscribeAkademiDoctrines(onNext, onError) {
  assertDb()

  const apply = (/** @type {import('firebase/firestore').QuerySnapshot} */ snap) => {
    const rows = snap.docs.map(mapDoctrineDoc)
    rows.sort((a, b) => timestampToMs(b.createdAt) - timestampToMs(a.createdAt))
    onNext(rows)
  }

  try {
    const q = query(collection(db, 'doktrinler'), orderBy('createdAt', 'desc'))
    return safeOnSnapshot(q, apply, onError)
  } catch {
    return onSnapshot(
      collection(db, 'doktrinler'),
      (snap) => {
        try {
          apply(snap)
        } catch (err) {
          onError?.(err)
        }
      },
      (err) => onError?.(err),
    )
  }
}

/**
 * @param {(rows: AkademiVideo[]) => void} onNext
 * @param {(err: unknown) => void} [onError]
 */
export function subscribeAkademiVideos(onNext, onError) {
  assertDb()

  const apply = (/** @type {import('firebase/firestore').QuerySnapshot} */ snap) => {
    const rows = snap.docs.map(mapVideoDoc)
    rows.sort((a, b) => timestampToMs(b.createdAt) - timestampToMs(a.createdAt))
    onNext(rows)
  }

  try {
    const q = query(collection(db, 'egitim_videolari'), orderBy('createdAt', 'desc'))
    return safeOnSnapshot(q, apply, onError)
  } catch {
    return onSnapshot(
      collection(db, 'egitim_videolari'),
      (snap) => {
        try {
          apply(snap)
        } catch (err) {
          onError?.(err)
        }
      },
      (err) => onError?.(err),
    )
  }
}

/**
 * @param {unknown} ts
 */
export function formatAkademiDate(ts) {
  const ms = timestampToMs(ts)
  if (!ms) return '—'
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(ms))
}

/**
 * @param {string} url
 */
export function toVideoEmbedUrl(url) {
  const raw = String(url ?? '').trim()
  if (!raw) return ''

  try {
    const u = new URL(raw)
    if (u.hostname.includes('youtu.be')) {
      const id = u.pathname.replace(/^\//, '').split('/')[0]
      return id ? `https://www.youtube.com/embed/${id}` : raw
    }
    if (u.hostname.includes('youtube.com') || u.hostname.includes('youtube-nocookie.com')) {
      const v = u.searchParams.get('v')
      if (v) return `https://www.youtube.com/embed/${v}`
      const parts = u.pathname.split('/')
      const embedIdx = parts.indexOf('embed')
      if (embedIdx >= 0 && parts[embedIdx + 1]) {
        return `https://www.youtube.com/embed/${parts[embedIdx + 1]}`
      }
    }
  } catch {
    return raw
  }

  return raw
}
