import {
  addDoc,
  collection,
  doc,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../lib/firebase'
import { safeOnSnapshot, timestampToMs } from '../lib/firestoreSnapshot'

/** @typedef {'LIKE' | 'COMMENT' | 'FRIEND_REQUEST' | 'TRAINING' | 'ACADEMY' | 'SYSTEM'} NotificationType */

/**
 * @typedef {{
 *   id: string
 *   recipientId: string
 *   type: NotificationType
 *   title: string
 *   message: string
 *   isRead: boolean
 *   link: string
 *   createdAt: unknown
 *   senderId?: string
 *   targetId?: string
 * }} AppNotification */

export const NOTIFICATION_TYPES = /** @type {const} */ ([
  'LIKE',
  'COMMENT',
  'FRIEND_REQUEST',
  'TRAINING',
  'ACADEMY',
  'SYSTEM',
])

/**
 * Forum brifing detayına derin link.
 * @param {string} postId
 * @returns {string}
 */
export function buildForumPostLink(postId) {
  const id = String(postId ?? '').trim()
  return id ? `/forum?post=${encodeURIComponent(id)}` : '/forum'
}

/**
 * Taktik Muhabere — bekleyen tim istekleri görünümü.
 * @returns {string}
 */
export function buildMuhabereRequestsLink() {
  return '/mesajlar?tab=istekler'
}

/**
 * Taktik Muhabere — belirli operatörle DM.
 * @param {string} peerUid
 * @returns {string}
 */
export function buildMuhaberePeerLink(peerUid) {
  const id = String(peerUid ?? '').trim()
  return id ? `/mesajlar?peer=${encodeURIComponent(id)}` : '/mesajlar'
}

/**
 * Antrenman — grup eğitimi sektörü.
 * @param {string} [trainingId]
 * @returns {string}
 */
export function buildGroupTrainingLink(trainingId) {
  const id = String(trainingId ?? '').trim()
  return id
    ? `/antrenman?sector=grup-egitimi&training=${encodeURIComponent(id)}`
    : '/antrenman?sector=grup-egitimi'
}

/**
 * Operatör profil sayfası.
 * @param {string} uid
 * @returns {string}
 */
export function buildOperatorProfileLink(uid) {
  const id = String(uid ?? '').trim()
  return id ? `/profil/${encodeURIComponent(id)}` : '/profil'
}

/**
 * Forum bildirim mesajından brifing başlığını çıkarır (eski bildirimler için yedek).
 * @param {string} message
 * @returns {string}
 */
export function extractForumPostTitleFromMessage(message) {
  const text = String(message ?? '')

  const patterns = [
    /Gönderiniz ["']([^"']+)["']/i,
    /["']([^"']+)["']\s+başlıklı brifingde/i,
    /["']([^"']+)["']\s+başlığına/i,
    /—\s*["']([^"']+)["']\s+başlıklı/i,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match?.[1]) return match[1].trim()
  }

  return ''
}

/**
 * @param {string} link
 * @returns {string}
 */
function extractPostIdFromLink(link) {
  try {
    const url = new URL(link, 'http://audaz.local')
    return url.searchParams.get('post')?.trim() ?? ''
  } catch {
    return ''
  }
}

/**
 * @param {string} link
 * @returns {string}
 */
function extractTrainingIdFromLink(link) {
  try {
    const url = new URL(link, 'http://audaz.local')
    return url.searchParams.get('training')?.trim() ?? ''
  } catch {
    return ''
  }
}

/**
 * Grup eğitimi (GRP-07) bildirimi — TRAINING veya ilgili SYSTEM kayıtları.
 * @param {AppNotification} item
 */
function isGroupTrainingNotification(item) {
  if (item.type === 'TRAINING') return true

  const link = String(item.link ?? '')
  if (link.includes('sector=grup-egitimi')) return true
  if (extractTrainingIdFromLink(link)) return true

  const title = String(item.title ?? '').toLowerCase()
  if (title.includes('grup eğitimi')) return true

  const message = String(item.message ?? '').toLowerCase()
  if (message.includes('antrenman modülünden katılın')) return true

  return false
}

/**
 * @param {AppNotification} item
 * @returns {string}
 */
function resolveGroupTrainingNotificationLink(item) {
  const targetId = String(item.targetId ?? '').trim()
  const storedLink = String(item.link ?? '').trim()
  const trainingId = targetId || extractTrainingIdFromLink(storedLink)
  return buildGroupTrainingLink(trainingId)
}

/**
 * Bildirim tipine göre güvenilir yönlendirme rotası üretir.
 * @param {AppNotification} item
 * @returns {string}
 */
export function resolveNotificationLink(item) {
  const type = item.type
  const targetId = String(item.targetId ?? '').trim()
  const storedLink = String(item.link ?? '').trim()
  const postFromStoredLink = extractPostIdFromLink(storedLink)

  if (type === 'LIKE' || type === 'COMMENT') {
    if (targetId) return buildForumPostLink(targetId)
    const postFromLink = extractPostIdFromLink(storedLink)
    if (postFromLink) return buildForumPostLink(postFromLink)
    return '/forum'
  }

  if (type === 'FRIEND_REQUEST') {
    const link = String(item.link ?? '')
    if (link.includes('tab=istekler')) return buildMuhabereRequestsLink()
    if (targetId) return buildMuhaberePeerLink(targetId)
    return buildMuhabereRequestsLink()
  }

  if (type === 'TRAINING') {
    return resolveGroupTrainingNotificationLink(item)
  }

  if (type === 'ACADEMY') {
    return '/akademi'
  }

  if (isGroupTrainingNotification(item)) {
    return resolveGroupTrainingNotificationLink(item)
  }

  if (postFromStoredLink) return buildForumPostLink(postFromStoredLink)

  const link = String(item.link ?? '').trim()
  if (link) return link

  return '/dashboard'
}

/**
 * React Router navigate state — derin link yedekleri.
 * @param {AppNotification} item
 * @returns {Record<string, string>}
 */
export function buildNotificationNavigationState(item) {
  /** @type {Record<string, string>} */
  const state = {}
  const link = resolveNotificationLink(item)
  const targetId = String(item.targetId ?? '').trim()

  if (item.type === 'LIKE' || item.type === 'COMMENT') {
    const postId = targetId || extractPostIdFromLink(link)
    if (postId) state.forumPostId = postId
    else {
      const title = extractForumPostTitleFromMessage(item.message)
      if (title) state.forumPostTitle = title
    }
    return state
  }

  if (item.type === 'FRIEND_REQUEST') {
    if (link.includes('tab=istekler')) return state
    if (targetId) state.peerId = targetId
    return state
  }

  if (item.type === 'TRAINING' || isGroupTrainingNotification(item)) {
    state.trainingSector = 'grup-egitimi'
    const trainingId =
      targetId ||
      extractTrainingIdFromLink(link) ||
      extractTrainingIdFromLink(String(item.link ?? ''))
    if (trainingId) state.groupTrainingId = trainingId
    return state
  }

  const postFromLink = extractPostIdFromLink(link)
  if (postFromLink) state.forumPostId = postFromLink

  return state
}

/**
 * Bildirim tıklaması için React Router hedefi.
 * @param {AppNotification} item
 * @returns {{ pathname: string, search: string, hash: string, state: Record<string, string> }}
 */
export function buildNotificationNavigationTarget(item) {
  const link = resolveNotificationLink(item)
  const state = buildNotificationNavigationState(item)

  try {
    const url = new URL(link, 'http://audaz.local')
    return {
      pathname: url.pathname || '/dashboard',
      search: url.search || '',
      hash: url.hash || '',
      state,
    }
  } catch {
    const [pathPart, hashPart = ''] = link.split('#')
    const [pathname, searchPart = ''] = pathPart.split('?')
    return {
      pathname: pathname.startsWith('/') ? pathname : `/${pathname}`,
      search: searchPart ? `?${searchPart}` : '',
      hash: hashPart ? `#${hashPart}` : '',
      state,
    }
  }
}

function assertDb() {
  if (!isFirebaseConfigured() || !db) {
    const e = new Error('Firebase yapılandırılmadı')
    e.code = 'failed-precondition'
    throw e
  }
}

/**
 * @param {import('firebase/firestore').QueryDocumentSnapshot} snap
 * @returns {AppNotification}
 */
function mapNotificationDoc(snap) {
  const d = snap.data()
  const rawType = typeof d.type === 'string' ? d.type : 'SYSTEM'
  const type = NOTIFICATION_TYPES.includes(rawType) ? rawType : 'SYSTEM'

  return {
    id: snap.id,
    recipientId: typeof d.recipientId === 'string' ? d.recipientId : '',
    type,
    title: typeof d.title === 'string' ? d.title : 'Bildirim',
    message: typeof d.message === 'string' ? d.message : '',
    isRead: d.isRead === true,
    link: typeof d.link === 'string' ? d.link : '/dashboard',
    createdAt: d.createdAt ?? null,
    senderId: typeof d.senderId === 'string' ? d.senderId : undefined,
    targetId: typeof d.targetId === 'string' ? d.targetId : undefined,
  }
}

/**
 * Yeni bildirim oluşturur.
 *
 * @param {{
 *   recipientId: string
 *   type: NotificationType
 *   title: string
 *   message: string
 *   link?: string
 *   senderId?: string
 *   targetId?: string
 * }} payload
 * @returns {Promise<string>} Oluşturulan belge kimliği
 */
export async function sendNotification(payload) {
  assertDb()

  const recipientId = String(payload.recipientId ?? '').trim()
  const title = String(payload.title ?? '').trim()
  const message = String(payload.message ?? '').trim()
  const type = NOTIFICATION_TYPES.includes(payload.type) ? payload.type : 'SYSTEM'
  const link = String(payload.link ?? '/dashboard').trim() || '/dashboard'
  const senderId = String(payload.senderId ?? '').trim()
  const targetId = String(payload.targetId ?? '').trim()

  if (!recipientId) {
    const e = new Error('Bildirim alıcısı (recipientId) zorunludur.')
    e.code = 'invalid-argument'
    throw e
  }
  if (!title || !message) {
    const e = new Error('Bildirim başlığı ve mesajı zorunludur.')
    e.code = 'invalid-argument'
    throw e
  }

  const docPayload = {
    recipientId,
    type,
    title,
    message,
    isRead: false,
    link,
    createdAt: serverTimestamp(),
  }

  if (senderId) docPayload.senderId = senderId
  if (targetId) docPayload.targetId = targetId

  const ref = await addDoc(collection(db, 'notifications'), docPayload)
  return ref.id
}

/**
 * Kendi bildirimine gönderim yapılmaması için güvenli sarmalayıcı.
 *
 * @param {{
 *   recipientId: string
 *   senderId?: string
 *   type: NotificationType
 *   title: string
 *   message: string
 *   link?: string
 *   targetId?: string
 * }} payload
 */
export async function sendNotificationSafe(payload) {
  const recipientId = String(payload.recipientId ?? '').trim()
  const senderId = String(payload.senderId ?? '').trim()
  if (!recipientId || (senderId && recipientId === senderId)) return null

  try {
    return await sendNotification(payload)
  } catch (err) {
    console.error('[notificationService] Bildirim gönderilemedi:', err)
    return null
  }
}

/**
 * Akademi doktrini yayınlandığında tüm operatörlere bildirim gönderir.
 *
 * @param {string[]} recipientIds
 * @param {{ title: string, senderId?: string }} payload
 */
export async function broadcastAcademyNotification(recipientIds, payload) {
  const title = String(payload.title ?? '').trim()
  if (!title || !Array.isArray(recipientIds) || recipientIds.length === 0) return

  await Promise.all(
    recipientIds.map((recipientId) =>
      sendNotificationSafe({
        recipientId,
        senderId: payload.senderId,
        type: 'ACADEMY',
        title: 'Yeni saha doktrini',
        message: `"${title}" Akademi kütüphanesine eklendi.`,
        link: '/akademi',
      }),
    ),
  )
}

/**
 * @param {import('firebase/firestore').QuerySnapshot} snap
 * @param {number} maxDocs
 * @returns {AppNotification[]}
 */
function mapAndSortNotifications(snap, maxDocs) {
  const rows = snap.docs.map(mapNotificationDoc)
  rows.sort((a, b) => timestampToMs(b.createdAt) - timestampToMs(a.createdAt))
  return rows.slice(0, maxDocs)
}

/**
 * @param {unknown} err
 * @returns {boolean}
 */
function isMissingIndexError(err) {
  const code =
    err && typeof err === 'object' && 'code' in err ? String(/** @type {{ code?: string }} */ (err).code) : ''
  return code === 'failed-precondition'
}

/**
 * Kullanıcının bildirimlerini canlı dinler.
 * Composite index hazır değilse yalnızca where sorgusu + istemci sıralaması kullanır.
 *
 * @param {string} recipientId
 * @param {(rows: AppNotification[]) => void} onNext
 * @param {(err: unknown) => void} [onError]
 * @param {number} [maxDocs=40]
 * @returns {() => void}
 */
export function subscribeNotifications(recipientId, onNext, onError, maxDocs = 40) {
  if (!isFirebaseConfigured() || !db) {
    onNext([])
    return () => {}
  }

  const uid = String(recipientId ?? '').trim()
  if (!uid) {
    onNext([])
    return () => {}
  }

  const apply = (/** @type {import('firebase/firestore').QuerySnapshot} */ snap) => {
    onNext(mapAndSortNotifications(snap, maxDocs))
  }

  const indexedQ = query(
    collection(db, 'notifications'),
    where('recipientId', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(maxDocs),
  )

  const fallbackQ = query(collection(db, 'notifications'), where('recipientId', '==', uid))

  let fallbackUnsub = null

  const primaryUnsub = safeOnSnapshot(
    indexedQ,
    apply,
    (err) => {
      if (!isMissingIndexError(err)) {
        onError?.(err)
        return
      }

      fallbackUnsub = safeOnSnapshot(fallbackQ, apply, onError)
    },
  )

  return () => {
    primaryUnsub()
    fallbackUnsub?.()
  }
}

/**
 * Tek bildirimi okundu olarak işaretler.
 *
 * @param {string} notificationId
 */
export async function markAsRead(notificationId) {
  assertDb()
  const id = String(notificationId ?? '').trim()
  if (!id) return

  await updateDoc(doc(db, 'notifications', id), { isRead: true })
}

/**
 * Tüm okunmamış bildirimleri okundu yapar.
 *
 * @param {AppNotification[]} notifications
 */
export async function markAllAsRead(notifications) {
  assertDb()
  const unread = notifications.filter((n) => !n.isRead)
  await Promise.all(unread.map((n) => markAsRead(n.id)))
}

/**
 * @param {unknown} ts
 */
export function formatNotificationTime(ts) {
  const ms =
    ts && typeof ts === 'object' && 'toMillis' in ts && typeof ts.toMillis === 'function'
      ? ts.toMillis()
      : 0
  if (!ms) return '—'

  const diff = Date.now() - ms
  if (diff < 60_000) return 'Az önce'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} dk önce`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} sa önce`

  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(ms))
}
