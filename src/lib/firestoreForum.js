import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from './firebase'
import {
  buildForumPostLink,
  buildMuhabereRequestsLink,
  sendNotificationSafe,
} from '../services/notificationService'
import { fetchUserProfile } from './firestoreUsers'
import { buildContactRequestId } from './firestoreTaktikMuhabere'
import { safeOnSnapshot, timestampToMs } from './firestoreSnapshot'

export const FORUM_CATEGORIES = /** @type {const} */ ([
  'SİLAH SİSTEMLERİ',
  'CQB & TAKTİK',
  'TCCC & MEDİKAL',
  'GENEL OPERASYON',
])

/** @typedef {typeof FORUM_CATEGORIES[number]} ForumCategory */

/** @typedef {{
 *   id: string
 *   title: string
 *   content: string
 *   category: ForumCategory | string
 *   authorId: string
 *   authorCallsign: string
 *   timestamp: unknown
 *   replyCount: number
 *   likes: string[]
 *   imageUrl: string
 * }} ForumPost */

/** @typedef {{
 *   uid: string
 *   callsign: string
 *   username: string
 *   role: string
 *   rank: string
 *   photoURL: string
 * }} ForumAuthorProfile */

/** @typedef {{
 *   id: string
 *   content: string
 *   authorId: string
 *   authorCallsign: string
 *   timestamp: unknown
 *   imageUrl: string
 * }} ForumReply */

function assertDb() {
  if (!isFirebaseConfigured() || !db) {
    const e = new Error('Firebase yapılandırılmadı')
    e.code = 'failed-precondition'
    throw e
  }
}

/**
 * @param {import('firebase/firestore').DocumentSnapshot} snap
 * @returns {ForumPost | null}
 */
export function mapForumPostSnapshot(snap) {
  if (!snap.exists()) return null
  return mapForumPostDoc(snap)
}

/**
 * Tek forum gönderisini kimliğe göre getirir.
 * @param {string} postId
 * @returns {Promise<ForumPost | null>}
 */
export async function fetchForumPostById(postId) {
  assertDb()
  const pid = String(postId ?? '').trim()
  if (!pid) return null

  const snap = await getDoc(doc(db, 'forum_posts', pid))
  return mapForumPostSnapshot(snap)
}

/**
 * @param {import('firebase/firestore').QueryDocumentSnapshot} snap
 * @returns {ForumPost}
 */
function mapForumPostDoc(snap) {
  const d = snap.data()
  const rawCategory = typeof d.category === 'string' ? d.category : 'GENEL OPERASYON'
  const category = FORUM_CATEGORIES.includes(rawCategory) ? rawCategory : 'GENEL OPERASYON'

  return {
    id: snap.id,
    title: typeof d.title === 'string' ? d.title : 'Başlıksız brifing',
    content: typeof d.content === 'string' ? d.content : '',
    category,
    authorId: typeof d.authorId === 'string' ? d.authorId : '',
    authorCallsign: typeof d.authorCallsign === 'string' ? d.authorCallsign : 'OPERATÖR',
    timestamp: d.timestamp ?? null,
    replyCount: typeof d.replyCount === 'number' ? d.replyCount : 0,
    likes: Array.isArray(d.likes) ? d.likes.filter((id) => typeof id === 'string') : [],
    imageUrl: typeof d.imageUrl === 'string' && d.imageUrl.trim() ? d.imageUrl.trim() : '',
  }
}

/**
 * @param {import('firebase/firestore').QueryDocumentSnapshot} snap
 * @returns {ForumReply}
 */
function mapForumReplyDoc(snap) {
  const d = snap.data()
  return {
    id: snap.id,
    content: typeof d.content === 'string' ? d.content : '',
    authorId: typeof d.authorId === 'string' ? d.authorId : '',
    authorCallsign: typeof d.authorCallsign === 'string' ? d.authorCallsign : 'OPERATÖR',
    timestamp: d.timestamp ?? null,
    imageUrl: typeof d.imageUrl === 'string' && d.imageUrl.trim() ? d.imageUrl.trim() : '',
  }
}

/**
 * @param {(posts: ForumPost[]) => void} onNext
 * @param {(err: unknown) => void} [onError]
 */
export function subscribeForumPosts(onNext, onError) {
  assertDb()
  const q = query(collection(db, 'forum_posts'), orderBy('timestamp', 'desc'))
  return safeOnSnapshot(
    q,
    (snap) => {
      onNext(snap.docs.map(mapForumPostDoc))
    },
    onError,
  )
}

/**
 * @param {string} postId
 * @param {(replies: ForumReply[]) => void} onNext
 * @param {(err: unknown) => void} [onError]
 */
export function subscribeForumReplies(postId, onNext, onError) {
  assertDb()
  const pid = String(postId ?? '').trim()
  if (!pid) return () => {}

  const q = query(collection(db, 'forum_posts', pid, 'replies'), orderBy('timestamp', 'asc'))
  return safeOnSnapshot(
    q,
    (snap) => {
      onNext(snap.docs.map(mapForumReplyDoc))
    },
    onError,
  )
}

/**
 * @param {{
 *   title: string
 *   content: string
 *   category: ForumCategory | string
 *   authorId: string
 *   authorCallsign: string
 *   imageUrl?: string
 * }} payload
 */
export async function createForumPost(payload) {
  assertDb()
  const title = payload.title.trim()
  const content = payload.content.trim()
  const imageUrl = typeof payload.imageUrl === 'string' ? payload.imageUrl.trim() : ''
  if (!title) {
    const e = new Error('Başlık boş olamaz.')
    e.code = 'invalid-argument'
    throw e
  }
  if (!content && !imageUrl) {
    const e = new Error('İçerik veya görsel gerekli.')
    e.code = 'invalid-argument'
    throw e
  }
  if (title.length > 120) {
    const e = new Error('Başlık en fazla 120 karakter olabilir.')
    e.code = 'invalid-argument'
    throw e
  }
  if (content.length > 4000) {
    const e = new Error('İçerik en fazla 4000 karakter olabilir.')
    e.code = 'invalid-argument'
    throw e
  }

  const rawCategory = payload.category
  const category = FORUM_CATEGORIES.includes(rawCategory) ? rawCategory : 'GENEL OPERASYON'

  const ref = await addDoc(collection(db, 'forum_posts'), {
    title,
    content,
    imageUrl: imageUrl || null,
    category,
    authorId: payload.authorId,
    authorCallsign: payload.authorCallsign.trim() || 'OPERATÖR',
    timestamp: serverTimestamp(),
    replyCount: 0,
    likes: [],
  })
  return ref.id
}

/**
 * @param {string} postId
 * @param {{
 *   content: string
 *   authorId: string
 *   authorCallsign: string
 *   imageUrl?: string
 * }} payload
 */
export async function createForumReply(postId, payload) {
  assertDb()
  const pid = String(postId ?? '').trim()
  const content = payload.content.trim()
  const imageUrl = typeof payload.imageUrl === 'string' ? payload.imageUrl.trim() : ''
  if (!pid) {
    const e = new Error('Başlık bulunamadı.')
    e.code = 'invalid-argument'
    throw e
  }
  if (!content && !imageUrl) {
    const e = new Error('Yanıt veya görsel gerekli.')
    e.code = 'invalid-argument'
    throw e
  }
  if (content.length > 2000) {
    const e = new Error('Yanıt en fazla 2000 karakter olabilir.')
    e.code = 'invalid-argument'
    throw e
  }

  const postSnap = await getDoc(doc(db, 'forum_posts', pid))
  const postData = postSnap.exists() ? postSnap.data() : null
  const postAuthorId = String(postData?.authorId ?? '')
  const postTitle = typeof postData?.title === 'string' ? postData.title : 'Brifing'
  const replierId = String(payload.authorId ?? '').trim()
  const replierCallsign = payload.authorCallsign.trim() || 'OPERATÖR'

  const repliesSnap = await getDocs(collection(db, 'forum_posts', pid, 'replies'))
  const threadParticipantIds = new Set(
    [
      postAuthorId,
      ...repliesSnap.docs.map((d) => String(d.data().authorId ?? '')),
    ].filter(Boolean),
  )
  threadParticipantIds.delete(replierId)

  await addDoc(collection(db, 'forum_posts', pid, 'replies'), {
    content,
    imageUrl: imageUrl || null,
    authorId: payload.authorId,
    authorCallsign: payload.authorCallsign.trim() || 'OPERATÖR',
    timestamp: serverTimestamp(),
  })

  await updateDoc(doc(db, 'forum_posts', pid), {
    replyCount: increment(1),
  })

  await Promise.all(
    [...threadParticipantIds].map((recipientId) =>
      sendNotificationSafe({
        recipientId,
        senderId: replierId,
        type: 'COMMENT',
        title: 'Yeni brifing yanıtı',
        message: `${replierCallsign} — "${postTitle}" başlıklı brifingde yeni yanıt.`,
        link: buildForumPostLink(pid),
        targetId: pid,
      }),
    ),
  )
}

/**
 * Forum gönderi sahibinin profil özetini getirir.
 * @param {string} authorId
 * @returns {Promise<ForumAuthorProfile | null>}
 */
export async function fetchForumAuthorProfile(authorId) {
  const uid = String(authorId ?? '').trim()
  if (!uid) return null

  const profile = await fetchUserProfile(uid)
  if (!profile) {
    return {
      uid,
      callsign: 'OPERATÖR',
      username: '',
      role: 'operator',
      rank: 'OPERATÖR',
      photoURL: '',
    }
  }

  const role = typeof profile.role === 'string' ? profile.role : 'operator'
  const status = typeof profile.status === 'string' ? profile.status.trim() : ''

  return {
    uid,
    callsign: profile.callsign?.trim() || profile.username?.trim() || 'OPERATÖR',
    username: profile.username ?? '',
    role,
    rank: status || formatForumRoleLabel(role),
    photoURL: (profile.photoURL || '').trim(),
  }
}

/**
 * @param {unknown} role
 * @returns {string}
 */
export function formatForumRoleLabel(role) {
  const r = String(role || 'operator').toLowerCase()
  if (r === 'admin') return 'YÖNETİCİ'
  if (r === 'instructor') return 'EĞİTMEN'
  if (r === 'operator') return 'OPERATÖR'
  return String(role || 'OPERATÖR').toUpperCase()
}

/**
 * Gönderi likes dizisinde mevcut kullanıcının UID'sini ekler veya çıkarır.
 * @param {string} postId
 * @param {string} uid
 */
export async function toggleForumPostLike(postId, uid) {
  assertDb()
  const pid = String(postId ?? '').trim()
  const me = String(uid ?? '').trim()
  if (!pid || !me) {
    const e = new Error('Beğeni işlemi için oturum gerekli.')
    e.code = 'invalid-argument'
    throw e
  }

  const ref = doc(db, 'forum_posts', pid)
  const snap = await getDoc(ref)
  if (!snap.exists()) {
    const e = new Error('Brifing bulunamadı.')
    e.code = 'not-found'
    throw e
  }

  const likes = Array.isArray(snap.data().likes) ? snap.data().likes : []
  const liked = likes.includes(me)

  const authorId = String(snap.data().authorId ?? '')
  const postTitle = typeof snap.data().title === 'string' ? snap.data().title : 'Brifing'

  await updateDoc(ref, {
    likes: liked ? arrayRemove(me) : arrayUnion(me),
  })

  if (!liked) {
    await sendNotificationSafe({
      recipientId: authorId,
      senderId: me,
      type: 'LIKE',
      title: 'Brifing mutabık',
      message: `Gönderiniz "${postTitle}" mutabık olarak işaretlendi.`,
      link: buildForumPostLink(pid),
      targetId: pid,
    })
  }
}

/**
 * Gönderi sahibine tim/irtibat isteği gönderir.
 * Koleksiyon şeması: senderId (from), receiverId (to), status, senderCallsign, createdAt.
 *
 * @param {string} fromUid — isteği gönderen
 * @param {string} toUid — gönderi sahibi
 * @param {string} senderCallsign
 */
export async function sendForumContactRequest(fromUid, toUid, senderCallsign) {
  assertDb()
  const from = String(fromUid ?? '').trim()
  const to = String(toUid ?? '').trim()
  if (!from || !to || from === to) {
    const e = new Error('İrtibat hedefi geçersiz.')
    e.code = 'invalid-argument'
    throw e
  }

  const requestId = buildContactRequestId(from, to)
  if (!requestId) {
    const e = new Error('İstek kimliği oluşturulamadı.')
    e.code = 'invalid-argument'
    throw e
  }

  const requestRef = doc(db, 'contact_requests', requestId)
  const existing = await getDoc(requestRef)
  if (existing.exists()) {
    const data = existing.data()
    const sender = String(data?.senderId ?? data?.from ?? '')
    if (sender === from && String(data?.status ?? '') === 'pending') {
      const e = new Error('İstek zaten iletildi.')
      e.code = 'already-exists'
      throw e
    }
    if (sender === from) {
      await deleteDoc(requestRef)
    }
  }

  const reverseId = buildContactRequestId(to, from)
  const reverse = await getDoc(doc(db, 'contact_requests', reverseId))
  if (reverse.exists() && reverse.data()?.status === 'pending') {
    const e = new Error('Bu operatörden zaten bir istek var.')
    e.code = 'failed-precondition'
    throw e
  }

  await setDoc(requestRef, {
    senderId: from,
    receiverId: to,
    status: 'pending',
    senderCallsign: senderCallsign.trim() || 'OPERATÖR',
    createdAt: serverTimestamp(),
    timestamp: serverTimestamp(),
  })

  await sendNotificationSafe({
    recipientId: to,
    senderId: from,
    type: 'FRIEND_REQUEST',
    title: 'İrtibat isteği',
    message: `${senderCallsign.trim() || 'OPERATÖR'} tim isteği gönderdi.`,
    link: buildMuhabereRequestsLink(),
    targetId: from,
  })
}

/**
 * Bekleyen giden irtibat isteği var mı?
 * @param {string} fromUid
 * @param {string} toUid
 * @returns {Promise<boolean>}
 */
export async function hasPendingForumContactRequest(fromUid, toUid) {
  if (!isFirebaseConfigured() || !db) return false

  const from = String(fromUid ?? '').trim()
  const to = String(toUid ?? '').trim()
  if (!from || !to) return false

  const requestId = buildContactRequestId(from, to)
  if (!requestId) return false

  const snap = await getDoc(doc(db, 'contact_requests', requestId))
  if (!snap.exists()) return false

  const data = snap.data()
  return isForumContactRequestPending(data, from, to)
}

/**
 * contact_requests belgesinin bekleyen giden istek olup olmadığını doğrular.
 * senderId/receiverId veya from/to alan adlarını destekler.
 *
 * @param {import('firebase/firestore').DocumentData | undefined} data
 * @param {string} fromUid
 * @param {string} toUid
 * @returns {boolean}
 */
export function isForumContactRequestPending(data, fromUid, toUid) {
  if (!data) return false
  const from = String(fromUid ?? '').trim()
  const to = String(toUid ?? '').trim()
  const sender = String(data.senderId ?? data.from ?? '').trim()
  const receiver = String(data.receiverId ?? data.to ?? '').trim()
  return sender === from && receiver === to && String(data.status ?? '') === 'pending'
}

/**
 * Giden irtibat isteği durumunu canlı dinler (sayfa yenileme sonrası senkron).
 *
 * @param {string} fromUid
 * @param {string} toUid
 * @param {(pending: boolean) => void} onStatus
 * @param {(err: unknown) => void} [onError]
 * @returns {() => void}
 */
export function subscribeForumContactRequestStatus(fromUid, toUid, onStatus, onError) {
  if (!isFirebaseConfigured() || !db) {
    onStatus(false)
    return () => {}
  }

  const from = String(fromUid ?? '').trim()
  const to = String(toUid ?? '').trim()
  if (!from || !to || from === to) {
    onStatus(false)
    return () => {}
  }

  const requestId = buildContactRequestId(from, to)
  if (!requestId) {
    onStatus(false)
    return () => {}
  }

  return safeOnSnapshot(
    doc(db, 'contact_requests', requestId),
    (snap) => {
      onStatus(snap.exists() && isForumContactRequestPending(snap.data(), from, to))
    },
    onError,
  )
}

/**
 * Mevcut kullanıcının tim rehberinde (users.contacts) hedef operatör var mı — canlı dinler.
 *
 * @param {string} currentUid
 * @param {string} peerUid
 * @param {(isFriend: boolean) => void} onStatus
 * @param {(err: unknown) => void} [onError]
 * @returns {() => void}
 */
export function subscribeForumPeerInContacts(currentUid, peerUid, onStatus, onError) {
  if (!isFirebaseConfigured() || !db) {
    onStatus(false)
    return () => {}
  }

  const me = String(currentUid ?? '').trim()
  const peer = String(peerUid ?? '').trim()
  if (!me || !peer || me === peer) {
    onStatus(false)
    return () => {}
  }

  return safeOnSnapshot(
    doc(db, 'users', me),
    (snap) => {
      if (!snap.exists()) {
        onStatus(false)
        return
      }
      const contacts = snap.data().contacts
      const list = Array.isArray(contacts) ? contacts.filter((id) => typeof id === 'string') : []
      onStatus(list.includes(peer))
    },
    onError,
  )
}

/**
 * @param {unknown} ts
 */
export function formatForumTimestamp(ts) {
  const ms = timestampToMs(ts)
  if (!ms) return '—'
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(ms))
}
