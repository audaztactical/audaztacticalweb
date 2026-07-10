import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  documentId,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import {
  buildMuhaberePeerLink,
  buildMuhabereRequestsLink,
  previewNotificationText,
  sendNotificationSafe,
} from '../services/notificationService'
import { fetchUserProfile } from './firestoreUsers'
import { assertMuhabereContentAllowed } from './muhabereContentFilter'
import {
  MUHABERE_PREVIEW_IMAGE,
  MUHABERE_PREVIEW_LOCATION,
} from './muhaberePreviewTokens'
import { buildConversationId, mapConversationSummaryDoc } from './muhabereConversation'
import { db, isFirebaseConfigured } from './firebase'
import { safeOnSnapshot, timestampToMs } from './firestoreSnapshot'
import { formatMuhabereErrorDisplay } from './messagesDisplayText'

export const MUHABERE_MESSAGE_PAGE_SIZE = 20

/**
 * DM / kanal mesajı sonrası alıcılara MESSAGE bildirimi (fire-and-forget).
 * @param {{ senderId: string, recipientIds: string[], preview: string }} input
 */
async function notifyMuhabereMessageRecipients({ senderId, recipientIds, preview }) {
  const from = String(senderId ?? '').trim()
  const recipients = [
    ...new Set(
      recipientIds.map((id) => String(id ?? '').trim()).filter(Boolean),
    ),
  ].filter((id) => id !== from)

  if (!from || recipients.length === 0) return

  let callsign = 'OPERATÖR'
  try {
    const profile = await fetchUserProfile(from)
    const label = String(profile?.callsign ?? '').trim()
    if (label) callsign = label
  } catch {
    /* profil okunamazsa varsayılan callsign */
  }

  const messagePreview = previewNotificationText(preview, 60)

  await Promise.all(
    recipients.map((recipientId) =>
      sendNotificationSafe({
        recipientId,
        senderId: from,
        type: 'MESSAGE',
        title: callsign,
        message: messagePreview,
        link: '/mesajlar',
      }),
    ),
  )
}

/**
 * @param {string} senderId
 * @param {string[]} recipientIds
 * @param {string} preview
 */
function queueMuhabereMessageNotifications(senderId, recipientIds, preview) {
  void notifyMuhabereMessageRecipients({ senderId, recipientIds, preview }).catch((err) => {
    if (import.meta.env.DEV) {
      console.warn('[muhabere] MESSAGE bildirimi gönderilemedi:', err)
    }
  })
}

/** @typedef {{
 *   uid: string
 *   callsign: string
 *   username: string
 *   role: string
 *   photoURL: string | null
 * }} MuhabereContact */

/** @typedef {'text' | 'image' | 'location'} MuhabereMessageType */

/** @typedef {{
 *   id: string
 *   text: string
 *   senderId: string
 *   receiverId: string
 *   timestamp: unknown
 *   read?: boolean
 *   status?: MuhabereMessageStatus
 *   readBy?: string[]
 *   chatId?: string
 *   channelId?: string
 *   type?: MuhabereMessageType
 *   imageUrl?: string
 *   lat?: number
 *   lng?: number
 *   isBurn?: boolean
 *   burnTime?: number
 *   destroyed?: boolean
 * }} MuhabereMessage */

/** @typedef {{
 *   id: string
 *   name: string
 *   members: string[]
 *   createdBy: string
 *   createdAt: unknown
 * }} MuhabereChannel */

/** @typedef {{
 *   uid: string
 *   callsign: string
 *   username: string
 *   role: string
 *   email: string
 *   status: string
 *   bloodType: string
 *   enrolledAt: unknown
 *   photoURL: string | null
 * }} MuhabereOperatorProfile
 */

const ROSTER_ROLES = ['member', 'operator', 'premium_member', 'instructor']
const SEARCH_RESULT_LIMIT = 24
const CONTACTS_IN_CHUNK = 30

/**
 * Throw a muhabere error with stable `__audazCode` for i18n display.
 * `Error.message` is the code (not a localized string).
 * @param {string} audazCode
 * @param {string} [firebaseCode]
 * @returns {never}
 */
function throwMuhabereError(audazCode, firebaseCode = 'failed-precondition') {
  const e = new Error(audazCode)
  e.code = firebaseCode
  e.__audazCode = audazCode
  throw e
}

function assertDb() {
  if (!isFirebaseConfigured() || !db) {
    throwMuhabereError('FIREBASE_NOT_CONFIGURED', 'failed-precondition')
  }
}

/**
 * @param {unknown} raw
 * @returns {string[]}
 */
function normalizeContactUids(raw) {
  if (!Array.isArray(raw)) return []
  const seen = new Set()
  const out = []
  for (const item of raw) {
    const id = String(item ?? '').trim()
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push(id)
  }
  return out
}

/**
 * @param {import('firebase/firestore').QueryDocumentSnapshot} docSnap
 * @returns {MuhabereContact | null}
 */
function mapUserDocToContact(docSnap) {
  const role = typeof docSnap.data().role === 'string' ? docSnap.data().role : ''
  if (!ROSTER_ROLES.includes(role)) return null

  const data = docSnap.data()
  return {
    uid: docSnap.id,
    callsign:
      typeof data.callsign === 'string' && data.callsign.trim()
        ? data.callsign.trim()
        : typeof data.displayName === 'string' && data.displayName.trim()
          ? data.displayName.trim()
          : typeof data.username === 'string' && data.username.trim()
            ? data.username.trim()
            : docSnap.id.slice(0, 8),
    username: typeof data.username === 'string' ? data.username : '',
    role,
    photoURL:
      typeof data.photoURL === 'string' && data.photoURL.trim()
        ? data.photoURL.trim()
        : typeof data.avatarUrl === 'string' && data.avatarUrl.trim()
          ? data.avatarUrl.trim()
          : null,
  }
}

/**
 * @param {string[]} uids
 * @returns {Promise<MuhabereContact[]>}
 */
async function fetchUsersByUids(uids) {
  assertDb()
  const unique = [...new Set(uids.map((id) => String(id ?? '').trim()).filter(Boolean))]
  if (unique.length === 0) return []

  /** @type {Map<string, MuhabereContact>} */
  const byUid = new Map()

  for (let i = 0; i < unique.length; i += CONTACTS_IN_CHUNK) {
    const chunk = unique.slice(i, i + CONTACTS_IN_CHUNK)
    const snap = await getDocs(
      query(collection(db, 'users'), where(documentId(), 'in', chunk)),
    )
    for (const d of snap.docs) {
      const row = mapUserDocToContact(d)
      if (row) byUid.set(row.uid, row)
    }
  }

  return unique
    .map((id) => byUid.get(id))
    .filter((row) => row != null)
    .sort((a, b) => a.callsign.localeCompare(b.callsign, 'tr'))
}

/**
 * @param {string} currentUid
 * @returns {Promise<string[]>}
 */
export async function fetchUserContactUids(currentUid) {
  assertDb()
  const me = String(currentUid ?? '').trim()
  if (!me) return []

  const snap = await getDoc(doc(db, 'users', me))
  if (!snap.exists()) return []
  return normalizeContactUids(snap.data().contacts)
}

/**
 * Rehber / tim — yalnızca users/{me}.contacts içindeki operatörler.
 * @param {string} currentUid
 * @returns {Promise<MuhabereContact[]>}
 */
export async function fetchMuhabereContacts(currentUid) {
  const me = String(currentUid ?? '').trim()
  if (!me) return []
  const uids = await fetchUserContactUids(me)
  return fetchUsersByUids(uids)
}

/**
 * Çağrı adı / kullanıcı adı — istemci tarafı filtre (Firestore tam metin araması yok).
 * @param {string} currentUid
 * @param {string} searchText
 * @returns {Promise<MuhabereContact[]>}
 */
export async function searchMuhabereOperators(currentUid, searchText) {
  assertDb()
  const me = String(currentUid ?? '').trim()
  const needle = String(searchText ?? '').trim().toLowerCase()
  if (!me || needle.length < 2) return []

  const snap = await getDocs(
    query(collection(db, 'users'), where('role', 'in', ROSTER_ROLES)),
  )

  const seen = new Set()
  const rows = snap.docs
    .filter((d) => d.id !== me)
    .map((d) => mapUserDocToContact(d))
    .filter((row) => row != null)
    .filter((row) => {
      if (seen.has(row.uid)) return false
      seen.add(row.uid)
      const hay = `${row.callsign} ${row.username} ${row.uid}`.toLowerCase()
      return hay.includes(needle)
    })
    .sort((a, b) => a.callsign.localeCompare(b.callsign, 'tr'))

  return rows.slice(0, SEARCH_RESULT_LIMIT)
}

/**
 * @param {string} senderId
 * @param {string} receiverId
 */
export function buildContactRequestId(senderId, receiverId) {
  const s = String(senderId ?? '').trim()
  const r = String(receiverId ?? '').trim()
  if (!s || !r) return ''
  return `${s}_${r}`
}

/**
 * Karşılıklı tim — her iki users belgesine contacts arrayUnion.
 * @param {import('firebase/firestore').Transaction} tx
 * @param {string} uidA
 * @param {string} uidB
 */
async function mutualAddContactsInTransaction(tx, uidA, uidB) {
  const a = String(uidA ?? '').trim()
  const b = String(uidB ?? '').trim()
  if (!a || !b || a === b) return

  const aRef = doc(db, 'users', a)
  const bRef = doc(db, 'users', b)
  const [aSnap, bSnap] = await Promise.all([tx.get(aRef), tx.get(bRef)])

  if (!aSnap.exists() || !bSnap.exists()) {
    throwMuhabereError('PROFILE_NOT_FOUND', 'not-found')
  }

  const bRole = typeof bSnap.data().role === 'string' ? bSnap.data().role : ''
  const aRole = typeof aSnap.data().role === 'string' ? aSnap.data().role : ''
  if (!ROSTER_ROLES.includes(bRole) || !ROSTER_ROLES.includes(aRole)) {
    throwMuhabereError('NOT_IN_MUHABERE_NETWORK', 'permission-denied')
  }

  const aContacts = normalizeContactUids(aSnap.data().contacts)
  const bContacts = normalizeContactUids(bSnap.data().contacts)
  if (!aContacts.includes(b)) tx.update(aRef, { contacts: arrayUnion(b) })
  if (!bContacts.includes(a)) tx.update(bRef, { contacts: arrayUnion(a) })
}

/**
 * Karşılıklı tim koparma — contacts dizisinden arrayRemove.
 * @param {import('firebase/firestore').Transaction} tx
 * @param {string} uidA
 * @param {string} uidB
 */
async function mutualRemoveContactsInTransaction(tx, uidA, uidB) {
  const a = String(uidA ?? '').trim()
  const b = String(uidB ?? '').trim()
  if (!a || !b || a === b) return

  const aRef = doc(db, 'users', a)
  const bRef = doc(db, 'users', b)
  const [aSnap, bSnap] = await Promise.all([tx.get(aRef), tx.get(bRef)])

  if (!aSnap.exists() || !bSnap.exists()) {
    throwMuhabereError('PROFILE_NOT_FOUND', 'not-found')
  }

  const aContacts = normalizeContactUids(aSnap.data().contacts)
  const bContacts = normalizeContactUids(bSnap.data().contacts)
  if (aContacts.includes(b)) tx.update(aRef, { contacts: arrayRemove(b) })
  if (bContacts.includes(a)) tx.update(bRef, { contacts: arrayRemove(a) })
}

/**
 * Tim rehberinden çift taraflı bağlantı koparma.
 * @param {string} currentUid
 * @param {string} peerUid
 */
export async function removeMuhabereContact(currentUid, peerUid) {
  assertDb()
  const me = String(currentUid ?? '').trim()
  const peer = String(peerUid ?? '').trim()
  if (!me || !peer || me === peer) {
    throwMuhabereError('INVALID_CONNECTION_TARGET', 'invalid-argument')
  }

  await runTransaction(db, async (tx) => {
    await mutualRemoveContactsInTransaction(tx, me, peer)
  })

  await removePeerFromSharedMuhabereChannels(me, peer)
}

/**
 * @param {import('firebase/firestore').QueryDocumentSnapshot} docSnap
 */
function mapContactRequestDoc(docSnap) {
  const data = docSnap.data()
  return {
    id: docSnap.id,
    senderId: String(data.senderId ?? ''),
    receiverId: String(data.receiverId ?? ''),
    status: String(data.status ?? 'pending'),
    timestamp: data.timestamp,
  }
}

/**
 * @param {string} currentUid
 * @param {string} peerUid
 * @returns {Promise<void>}
 */
export async function sendMuhabereContactRequest(currentUid, peerUid) {
  assertDb()
  const me = String(currentUid ?? '').trim()
  const peer = String(peerUid ?? '').trim()
  if (!me || !peer || me === peer) {
    throwMuhabereError('INVALID_REQUEST_TARGET', 'invalid-argument')
  }

  const myContacts = await fetchUserContactUids(me)
  if (myContacts.includes(peer)) {
    throwMuhabereError('ALREADY_IN_ROSTER', 'already-exists')
  }

  const requestId = buildContactRequestId(me, peer)
  const requestRef = doc(db, 'contact_requests', requestId)
  const existing = await getDoc(requestRef)
  if (existing.exists()) {
    const data = existing.data()
    if (String(data?.senderId ?? '') === me && String(data?.status ?? '') === 'pending') {
      throwMuhabereError('REQUEST_ALREADY_SENT', 'already-exists')
    }
    if (String(data?.senderId ?? '') === me) {
      await deleteDoc(requestRef)
    }
  }

  const reverseId = buildContactRequestId(peer, me)
  const reverse = await getDoc(doc(db, 'contact_requests', reverseId))
  if (reverse.exists() && reverse.data()?.status === 'pending') {
    throwMuhabereError('PENDING_INBOUND_REQUEST', 'failed-precondition')
  }

  try {
    await setDoc(requestRef, {
      senderId: me,
      receiverId: peer,
      status: 'pending',
      timestamp: serverTimestamp(),
    })
  } catch (err) {
    const code =
      err && typeof err === 'object' && 'code' in err
        ? String(/** @type {{ code?: string }} */ (err).code)
        : ''
    if (code === 'permission-denied') {
      throwMuhabereError('REQUEST_SEND_DENIED', 'permission-denied')
    }
    throw err
  }

  await sendNotificationSafe({
    recipientId: peer,
    senderId: me,
    type: 'FRIEND_REQUEST',
    title: 'İrtibat isteği',
    message: 'Yeni tim katılım isteği aldınız.',
    link: buildMuhabereRequestsLink(),
  })
}

/**
 * @param {string} currentUid
 * @param {(requests: MuhabereContactRequest[]) => void} onData
 * @param {(err: unknown) => void} [onError]
 */
export function subscribeIncomingContactRequests(currentUid, onData, onError) {
  if (!isFirebaseConfigured() || !db) {
    onData([])
    return () => {}
  }
  const me = String(currentUid ?? '').trim()
  if (!me) {
    onData([])
    return () => {}
  }

  const q = query(
    collection(db, 'contact_requests'),
    where('receiverId', '==', me),
    where('status', '==', 'pending'),
  )

  return safeOnSnapshot(
    q,
    async (snap) => {
      try {
        const raw = snap.docs.map((d) => mapContactRequestDoc(d))
        const senderIds = raw.map((r) => r.senderId).filter(Boolean)
        const profiles = await fetchUsersByUids(senderIds)
        const byUid = new Map(profiles.map((p) => [p.uid, p]))
        const rows = raw
          .map((r) => {
            const sender = byUid.get(r.senderId)
            if (!sender) return null
            return /** @type {MuhabereContactRequest} */ ({ ...r, sender })
          })
          .filter((row) => row != null)
        onData(rows)
      } catch (err) {
        onError?.(err)
      }
    },
    (err) => onError?.(err),
  )
}

/**
 * @param {string} currentUid
 * @param {(receiverIds: string[]) => void} onData
 * @param {(err: unknown) => void} [onError]
 */
export function subscribeOutgoingPendingRequests(currentUid, onData, onError) {
  if (!isFirebaseConfigured() || !db) {
    onData([])
    return () => {}
  }
  const me = String(currentUid ?? '').trim()
  if (!me) {
    onData([])
    return () => {}
  }

  const q = query(
    collection(db, 'contact_requests'),
    where('senderId', '==', me),
    where('status', '==', 'pending'),
  )

  return safeOnSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => String(d.data().receiverId ?? '')).filter(Boolean))
    },
    (err) => onError?.(err),
  )
}

/**
 * @param {string} currentUid
 * @param {string} requestId
 * @returns {Promise<MuhabereContact>}
 */
export async function acceptMuhabereContactRequest(currentUid, requestId) {
  assertDb()
  const me = String(currentUid ?? '').trim()
  const rid = String(requestId ?? '').trim()
  if (!me || !rid) {
    throwMuhabereError('INVALID_REQUEST', 'invalid-argument')
  }

  const reqRef = doc(db, 'contact_requests', rid)
  let senderId = ''

  await runTransaction(db, async (tx) => {
    const reqSnap = await tx.get(reqRef)
    if (!reqSnap.exists()) {
      throwMuhabereError('REQUEST_NOT_FOUND', 'not-found')
    }
    const data = reqSnap.data()
    if (String(data.receiverId ?? '') !== me) {
      throwMuhabereError('REQUEST_ACCEPT_DENIED', 'permission-denied')
    }
    if (String(data.status ?? '') !== 'pending') {
      throwMuhabereError('REQUEST_NOT_PENDING', 'failed-precondition')
    }

    senderId = String(data.senderId ?? '').trim()
    if (!senderId) {
      throwMuhabereError('SENDER_UNKNOWN', 'invalid-argument')
    }

    await mutualAddContactsInTransaction(tx, me, senderId)
    tx.delete(reqRef)
  })

  const profiles = await fetchUsersByUids([senderId, me])
  const contact = profiles.find((p) => p.uid === senderId)
  const accepter = profiles.find((p) => p.uid === me)
  if (!contact) {
    throwMuhabereError('PROFILE_READ_AFTER_ACCEPT_FAILED', 'not-found')
  }

  await sendNotificationSafe({
    recipientId: senderId,
    senderId: me,
    type: 'FRIEND_REQUEST',
    title: 'İstek onaylandı',
    message: `${accepter?.callsign ?? 'Operatör'} irtibat isteğinizi kabul etti.`,
    link: buildMuhaberePeerLink(me),
    targetId: me,
  })

  return contact
}

/**
 * @param {string} currentUid
 * @param {string} requestId
 */
export async function rejectMuhabereContactRequest(currentUid, requestId) {
  assertDb()
  const me = String(currentUid ?? '').trim()
  const rid = String(requestId ?? '').trim()
  if (!me || !rid) {
    throwMuhabereError('INVALID_REQUEST', 'invalid-argument')
  }

  const reqRef = doc(db, 'contact_requests', rid)
  const snap = await getDoc(reqRef)
  if (!snap.exists()) return
  if (String(snap.data().receiverId ?? '') !== me) {
    throwMuhabereError('REQUEST_REJECT_DENIED', 'permission-denied')
  }
  await deleteDoc(reqRef)
}

/** @param {unknown} err */
export function muhabereRequestErrorMessage(err) {
  // Prefer localized display; kept for callers that still import from this module.
  return formatMuhabereErrorDisplay(err)
}

/**
 * İki UID için deterministik sohbet kimliği.
 * @param {string} uidA
 * @param {string} uidB
 */
export function buildChatId(uidA, uidB) {
  const a = String(uidA ?? '').trim()
  const b = String(uidB ?? '').trim()
  if (!a || !b || a === b) return ''
  return a < b ? `${a}_${b}` : `${b}_${a}`
}

/**
 * @param {unknown} ts
 */
export function formatMessageTime(ts) {
  const ms = timestampToMs(ts)
  if (!ms) return '—'
  const d = new Date(ms)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/**
 * Konuşma listesinde son mesaj zamanı.
 * @param {unknown} ts
 */
export function formatConversationPreviewTime(ts) {
  const ms = timestampToMs(ts)
  if (!ms) return ''
  const d = new Date(ms)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return formatMessageTime(ts)
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return 'Dün'
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`
}

/**
 * @param {import('firebase/firestore').DocumentSnapshot} docSnap
 * @param {string} [chatId]
 * @returns {MuhabereMessage}
 */
function mapMessageDoc(docSnap, threadId) {
  const data = docSnap.data() ?? {}
  const status =
    data.status === 'read' || data.read === true
      ? /** @type {MuhabereMessageStatus} */ ('read')
      : /** @type {MuhabereMessageStatus} */ ('sent')
  const rawType = data.type
  const type =
    rawType === 'image' || rawType === 'location'
      ? /** @type {MuhabereMessageType} */ (rawType)
      : /** @type {MuhabereMessageType} */ ('text')
  const parentId = docSnap.ref.parent.parent?.id ?? ''
  const readBy = Array.isArray(data.readBy)
    ? data.readBy.map((id) => String(id ?? '').trim()).filter(Boolean)
    : []
  return {
    id: docSnap.id,
    text: String(data.text ?? ''),
    senderId: String(data.senderId ?? ''),
    receiverId: String(data.receiverId ?? ''),
    timestamp: data.timestamp,
    read: status === 'read' || readBy.length > 0,
    status,
    readBy,
    chatId: threadId || parentId,
    channelId: typeof data.channelId === 'string' ? data.channelId : parentId,
    type,
    imageUrl: typeof data.imageUrl === 'string' ? data.imageUrl : undefined,
    lat: typeof data.lat === 'number' ? data.lat : undefined,
    lng: typeof data.lng === 'number' ? data.lng : undefined,
    isBurn: data.isBurn === true,
    burnTime: typeof data.burnTime === 'number' ? data.burnTime : 10,
    destroyed: false,
  }
}

/**
 * @param {string} chatId
 */
export async function ensureChatChannel(chatId) {
  assertDb()
  const cid = String(chatId ?? '').trim()
  if (!cid) return
  await setDoc(doc(db, 'chats', cid), { typingStatus: {} }, { merge: true })
}

/**
 * @param {string} chatId
 * @param {string} uid
 * @param {boolean} isTyping
 */
export async function setChatTypingStatus(chatId, uid, isTyping) {
  assertDb()
  const cid = String(chatId ?? '').trim()
  const me = String(uid ?? '').trim()
  if (!cid || !me) return

  await ensureChatChannel(cid)
  await updateDoc(doc(db, 'chats', cid), {
    [`typingStatus.${me}`]: isTyping,
  })
}

/**
 * Peer typing — yalnızca boolean değişince callback (gereksiz re-render önleme).
 * @param {string} chatId
 * @param {string} peerUid
 * @param {(typing: boolean) => void} onData
 * @param {(err: unknown) => void} [onError]
 */
export function subscribeChatTypingStatus(chatId, peerUid, onData, onError) {
  if (!isFirebaseConfigured() || !db) {
    onData(false)
    return () => {}
  }
  const cid = String(chatId ?? '').trim()
  const peer = String(peerUid ?? '').trim()
  if (!cid || !peer) {
    onData(false)
    return () => {}
  }

  let lastTyping = /** @type {boolean | null} */ (null)

  return safeOnSnapshot(
    doc(db, 'chats', cid),
    (snap) => {
      const map = snap.data()?.typingStatus
      const typing =
        map && typeof map === 'object' && !Array.isArray(map) ? Boolean(map[peer]) : false
      if (typing === lastTyping) return
      lastTyping = typing
      onData(typing)
    },
    (err) => onError?.(err),
  )
}

/**
 * @param {string} chatId
 * @param {string} messageId
 * @param {string} [readerUid]
 */
export async function markMessageAsRead(chatId, messageId, readerUid) {
  assertDb()
  const cid = String(chatId ?? '').trim()
  const mid = String(messageId ?? '').trim()
  const reader = String(readerUid ?? '').trim()
  if (!cid || !mid || !reader) return

  await updateDoc(doc(db, 'chats', cid, 'messages', mid), {
    status: 'read',
    read: true,
    readBy: arrayUnion(reader),
  })
}

/**
 * @param {string} chatId
 * @param {string} messageId
 */
export async function deleteBurnMessage(chatId, messageId) {
  assertDb()
  const cid = String(chatId ?? '').trim()
  const mid = String(messageId ?? '').trim()
  if (!cid || !mid) return
  await deleteDoc(doc(db, 'chats', cid, 'messages', mid))
}

/**
 * @param {string} uid
 * @returns {Promise<MuhabereOperatorProfile | null>}
 */
export async function fetchMuhabereOperatorProfile(uid) {
  assertDb()
  const id = String(uid ?? '').trim()
  if (!id) return null

  const snap = await getDoc(doc(db, 'users', id))
  if (!snap.exists()) return null

  const data = snap.data()
  const role =
    typeof data.role === 'string'
      ? data.role
      : typeof data.userRole === 'string'
        ? data.userRole
        : 'operator'

  return {
    uid: snap.id,
    callsign:
      typeof data.callsign === 'string' && data.callsign.trim()
        ? data.callsign.trim()
        : typeof data.displayName === 'string' && data.displayName.trim()
          ? data.displayName.trim()
          : typeof data.username === 'string' && data.username.trim()
            ? data.username.trim()
            : snap.id.slice(0, 8),
    username: typeof data.username === 'string' ? data.username : '',
    role,
    email: typeof data.email === 'string' ? data.email : '',
    status: typeof data.status === 'string' ? data.status : '',
    bloodType: typeof data.bloodType === 'string' ? data.bloodType : '',
    enrolledAt: data.enrolledAt ?? null,
    photoURL:
      typeof data.photoURL === 'string' && data.photoURL.trim()
        ? data.photoURL.trim()
        : typeof data.avatarUrl === 'string' && data.avatarUrl.trim()
          ? data.avatarUrl.trim()
          : null,
  }
}

/**
 * @param {string} chatId
 * @param {string} currentUid
 */
export async function markChatMessagesAsRead(chatId, currentUid) {
  assertDb()
  const cid = String(chatId ?? '').trim()
  const me = String(currentUid ?? '').trim()
  if (!cid || !me) return

  const snap = await getDocs(
    query(
      collection(db, 'chats', cid, 'messages'),
      where('receiverId', '==', me),
      where('status', '==', 'sent'),
    ),
  )
  if (snap.empty) return

  const batch = writeBatch(db)
  for (const d of snap.docs) {
    batch.update(d.ref, { status: 'read', read: true, readBy: arrayUnion(me) })
  }
  await batch.commit()
}

/**
 * Operatörü engeller — users/{uid}.blockedUsers
 * @param {string} userId
 * @param {string} targetUid
 */
export async function blockMuhabereUser(userId, targetUid) {
  assertDb()
  const me = String(userId ?? '').trim()
  const target = String(targetUid ?? '').trim()
  if (!me || !target || me === target) return

  await updateDoc(doc(db, 'users', me), {
    blockedUsers: arrayUnion(target),
  })
}

/**
 * Tim kanalı adını günceller (yalnızca kurucu).
 * @param {string} channelId
 * @param {string} userId
 * @param {string} name
 */
export async function updateMuhabereChannelName(channelId, userId, name) {
  assertDb()
  const cid = String(channelId ?? '').trim()
  const me = String(userId ?? '').trim()
  const label = String(name ?? '').trim()
  if (!cid || !me || !label) {
    throwMuhabereError('INVALID_CHANNEL_NAME', 'invalid-argument')
  }

  const ref = doc(db, 'channels', cid)
  const snap = await getDoc(ref)
  if (!snap.exists()) {
    throwMuhabereError('CHANNEL_NOT_FOUND', 'not-found')
  }
  if (String(snap.data()?.createdBy ?? '') !== me) {
    throwMuhabereError('CHANNEL_EDIT_OWNER_ONLY', 'permission-denied')
  }

  await updateDoc(ref, { name: label.slice(0, 48) })
}

/**
 * Tim kanalını kalıcı olarak siler (yalnızca kurucu).
 * @param {string} channelId
 * @param {string} userId
 */
export async function deleteMuhabereChannel(channelId, userId) {
  assertDb()
  const cid = String(channelId ?? '').trim()
  const me = String(userId ?? '').trim()
  if (!cid || !me) return

  const ref = doc(db, 'channels', cid)
  const snap = await getDoc(ref)
  if (!snap.exists()) return
  if (String(snap.data()?.createdBy ?? '') !== me) {
    throwMuhabereError('CHANNEL_DELETE_OWNER_ONLY', 'permission-denied')
  }

  await deleteDoc(ref)
}

/**
 * @param {string} currentUid
 * @param {(count: number) => void} onCount
 * @param {(err: unknown) => void} [onError]
 */
export function subscribeUnreadMessageCount(currentUid, onCount, onError) {
  if (!isFirebaseConfigured() || !db) {
    onCount(0)
    return () => {}
  }
  const me = String(currentUid ?? '').trim()
  if (!me) {
    onCount(0)
    return () => {}
  }

  let active = true
  /** @type {(() => void)[]} */
  const chatUnsubs = []
  /** @type {Record<string, number>} */
  const countsByChat = {}

  const recompute = () => {
    if (!active) return
    const total = Object.values(countsByChat).reduce((sum, n) => sum + n, 0)
    onCount(total)
  }

  const clearChatUnsubs = () => {
    chatUnsubs.forEach((fn) => fn())
    chatUnsubs.length = 0
    for (const key of Object.keys(countsByChat)) {
      delete countsByChat[key]
    }
  }

  const wireChats = async () => {
    clearChatUnsubs()
    if (!active) return

    try {
      const contacts = await fetchMuhabereContacts(me)
      if (!active) return

      if (contacts.length === 0) {
        onCount(0)
        return
      }

      for (const contact of contacts) {
        const chatId = buildChatId(me, contact.uid)
        if (!chatId) continue

        const q = query(
          collection(db, 'chats', chatId, 'messages'),
          where('receiverId', '==', me),
          where('status', '==', 'sent'),
        )

        const unsub = safeOnSnapshot(
          q,
          (snap) => {
            countsByChat[chatId] = snap.size
            recompute()
          },
          (err) => onError?.(err),
        )
        chatUnsubs.push(unsub)
      }

      recompute()
    } catch (err) {
      if (active) onError?.(err)
    }
  }

  void wireChats()

  const userUnsub = safeOnSnapshot(doc(db, 'users', me), () => {
    void wireChats()
  })

  return () => {
    active = false
    userUnsub()
    clearChatUnsubs()
  }
}

/**
 * @param {string} currentUid
 * @param {(count: number) => void} onCount
 * @param {(err: unknown) => void} [onError]
 */
export function subscribePendingContactRequestCount(currentUid, onCount, onError) {
  if (!isFirebaseConfigured() || !db) {
    onCount(0)
    return () => {}
  }
  const me = String(currentUid ?? '').trim()
  if (!me) {
    onCount(0)
    return () => {}
  }

  const q = query(
    collection(db, 'contact_requests'),
    where('receiverId', '==', me),
    where('status', '==', 'pending'),
  )

  return safeOnSnapshot(
    q,
    (snap) => onCount(snap.size),
    (err) => onError?.(err),
  )
}

/**
 * @param {string} chatId
 * @param {number} max
 * @returns {Promise<MuhabereMessage[]>}
 */
export async function fetchRecentChatMessages(chatId, max = 8) {
  assertDb()
  const cid = String(chatId ?? '').trim()
  if (!cid) return []

  const snap = await getDocs(
    query(
      collection(db, 'chats', cid, 'messages'),
      orderBy('timestamp', 'desc'),
      limit(max),
    ),
  )
  return snap.docs.map((d) => mapMessageDoc(d, cid)).reverse()
}

/**
 * @param {string} chatId
 * @param {(messages: MuhabereMessage[]) => void} onData
 * @param {(err: unknown) => void} [onError]
 * @param {{
 *   currentUid?: string
 *   onIncoming?: (message: MuhabereMessage) => void
 * }} [options]
 */
export function subscribeChatMessages(chatId, onData, onError, options) {
  if (!isFirebaseConfigured() || !db) {
    onData([])
    return () => {}
  }
  const cid = String(chatId ?? '').trim()
  if (!cid) {
    onData([])
    return () => {}
  }

  const currentUid = String(options?.currentUid ?? '').trim()
  const onIncoming = options?.onIncoming
  let isInitialSnapshot = true

  const q = query(collection(db, 'chats', cid, 'messages'), orderBy('timestamp', 'asc'))

  return safeOnSnapshot(
    q,
    (snap) => {
      const rows = snap.docs.map((d) => mapMessageDoc(d, cid))
      onData(rows)

      if (!onIncoming || !currentUid) return

      if (isInitialSnapshot) {
        isInitialSnapshot = false
        return
      }

      for (const change of snap.docChanges()) {
        if (change.type !== 'added') continue
        const msg = mapMessageDoc(change.doc, cid)
        if (msg.senderId !== currentUid) {
          onIncoming(msg)
        }
      }
    },
    (err) => onError?.(err),
  )
}

/**
 * Yalnızca yeni eklenen mesajlar (ilk snapshot hariç) — global bildirim dinleyicisi.
 * @param {string} chatId
 * @param {string} currentUid
 * @param {(message: MuhabereMessage) => void} onIncoming
 * @param {(err: unknown) => void} [onError]
 */
export function subscribeChatMessageEvents(chatId, currentUid, onIncoming, onError) {
  return subscribeChatMessages(
    chatId,
    () => {},
    onError,
    { currentUid, onIncoming },
  )
}

/**
 * @param {{
 *   chatId: string
 *   text?: string
 *   senderId: string
 *   receiverId: string
 *   isBurn?: boolean
 *   burnTime?: number
 *   type?: MuhabereMessageType
 *   imageUrl?: string
 *   lat?: number
 *   lng?: number
 * }} input
 */
export async function sendChatMessage({
  chatId,
  text = '',
  senderId,
  receiverId,
  isBurn = false,
  burnTime = 10,
  type = 'text',
  imageUrl,
  lat,
  lng,
}) {
  assertDb()
  const cid = String(chatId ?? '').trim()
  const from = String(senderId ?? '').trim()
  const to = String(receiverId ?? '').trim()
  const msgType = type === 'image' || type === 'location' ? type : 'text'
  let body = String(text ?? '').trim()

  if (!cid || !from || !to) {
    throwMuhabereError('INVALID_MESSAGE_OR_RECIPIENT', 'invalid-argument')
  }

  if (msgType === 'text' && !body) {
    throwMuhabereError('EMPTY_MESSAGE', 'invalid-argument')
  }

  if (msgType === 'image' && !imageUrl) {
    throwMuhabereError('MISSING_IMAGE_URL', 'invalid-argument')
  }

  if (msgType === 'location' && (typeof lat !== 'number' || typeof lng !== 'number')) {
    throwMuhabereError('INVALID_COORDINATES', 'invalid-argument')
  }

  if (msgType === 'image') body = body || MUHABERE_PREVIEW_IMAGE
  if (msgType === 'location') body = body || MUHABERE_PREVIEW_LOCATION

  if (msgType === 'text') assertMuhabereContentAllowed(body)

  await ensureChatChannel(cid)
  await setChatTypingStatus(cid, from, false)

  const payload = {
    text: body,
    senderId: from,
    receiverId: to,
    timestamp: serverTimestamp(),
    status: 'sent',
    read: false,
    type: msgType,
  }

  if (msgType === 'image') payload.imageUrl = imageUrl
  if (msgType === 'location') {
    payload.lat = lat
    payload.lng = lng
  }

  if (isBurn && msgType === 'text') {
    await addDoc(collection(db, 'chats', cid, 'messages'), {
      ...payload,
      isBurn: true,
      burnTime: Math.max(3, Math.min(60, Number(burnTime) || 10)),
    })
    queueMuhabereMessageNotifications(from, [to], body)
    return
  }

  await addDoc(collection(db, 'chats', cid, 'messages'), payload)
  queueMuhabereMessageNotifications(from, [to], body)
}

/**
 * @param {{
 *   name: string
 *   createdBy: string
 *   memberUids: string[]
 * }} input
 * @returns {Promise<string>} channelId
 */
export async function createMuhabereChannel({ name, createdBy, memberUids }) {
  assertDb()
  const creator = String(createdBy ?? '').trim()
  const label = String(name ?? '').trim()
  const members = [
    ...new Set([creator, ...memberUids.map((id) => String(id ?? '').trim()).filter(Boolean)]),
  ]

  const payload = { name: label, createdBy: creator, memberUids: members }
  console.log('[createMuhabereChannel] Kanal oluşturuluyor:', payload)

  if (!creator || !label) {
    console.error('[createMuhabereChannel] Validasyon hatası:', 'INVALID_CHANNEL_OR_CREATOR', payload)
    throwMuhabereError('INVALID_CHANNEL_OR_CREATOR', 'invalid-argument')
  }

  try {
    const ref = await addDoc(collection(db, 'channels'), {
      name: label,
      members,
      createdBy: creator,
      createdAt: serverTimestamp(),
    })
    console.log('[createMuhabereChannel] Kanal oluşturuldu:', ref.id)

    const conversationId = buildConversationId('channel', ref.id)
    if (conversationId) {
      await setDoc(doc(db, 'conversations', conversationId), {
        type: 'channel',
        refId: ref.id,
        name: label,
        members,
        lastMessage: '',
        lastSender: '',
        lastSenderId: '',
        lastMessageAt: serverTimestamp(),
        unreadByUser: {},
        updatedAt: serverTimestamp(),
      })
    }

    return ref.id
  } catch (err) {
    const code = /** @type {{ code?: string }} */ (err)?.code ?? 'unknown'
    if (err && typeof err === 'object' && '__audazCode' in err) throw err
    const audazCode = code === 'permission-denied' ? 'CHANNEL_CREATE_DENIED' : 'CHANNEL_CREATE_FAILED'
    console.error('[createMuhabereChannel] Firebase hatası:', { code, audazCode, err, payload })
    throwMuhabereError(audazCode, code)
  }
}

/**
 * @param {string} uid
 * @param {(channels: MuhabereChannel[]) => void} onData
 * @param {(err: unknown) => void} [onError]
 */
export function subscribeUserMuhabereChannels(uid, onData, onError) {
  if (!isFirebaseConfigured() || !db) {
    onData([])
    return () => {}
  }
  const me = String(uid ?? '').trim()
  if (!me) {
    onData([])
    return () => {}
  }

  const q = query(
    collection(db, 'channels'),
    where('members', 'array-contains', me),
    orderBy('createdAt', 'desc'),
  )

  return safeOnSnapshot(
    q,
    (snap) => {
      const rows = snap.docs.map((d) => {
        const data = d.data()
        return {
          id: d.id,
          name: String(data.name ?? 'KANAL'),
          members: Array.isArray(data.members)
            ? data.members.map((m) => String(m)).filter(Boolean)
            : [],
          createdBy: String(data.createdBy ?? ''),
          createdAt: data.createdAt,
        }
      })
      onData(rows)
    },
    (err) => onError?.(err),
  )
}

/**
 * @param {import('firebase/firestore').DocumentSnapshot} docSnap
 * @returns {MuhabereChannel | null}
 */
function mapMuhabereChannelDoc(docSnap) {
  if (!docSnap.exists()) return null
  const data = docSnap.data()
  return {
    id: docSnap.id,
    name: String(data.name ?? 'KANAL'),
    members: Array.isArray(data.members)
      ? data.members.map((m) => String(m)).filter(Boolean)
      : [],
    createdBy: String(data.createdBy ?? ''),
    createdAt: data.createdAt,
  }
}

/**
 * @param {string} channelId
 * @returns {Promise<MuhabereChannel | null>}
 */
export async function fetchMuhabereChannel(channelId) {
  assertDb()
  const cid = String(channelId ?? '').trim()
  if (!cid) return null
  const snap = await getDoc(doc(db, 'channels', cid))
  return mapMuhabereChannelDoc(snap)
}

/**
 * Ortak tim kanallarından peer'i çıkarır (rehber kopunca senkron).
 * @param {string} currentUid
 * @param {string} peerUid
 */
export async function removePeerFromSharedMuhabereChannels(currentUid, peerUid) {
  assertDb()
  const me = String(currentUid ?? '').trim()
  const peer = String(peerUid ?? '').trim()
  if (!me || !peer || me === peer) return

  const snap = await getDocs(
    query(collection(db, 'channels'), where('members', 'array-contains', me)),
  )
  if (snap.empty) return

  const batch = writeBatch(db)
  let pending = 0
  for (const d of snap.docs) {
    const members = Array.isArray(d.data().members)
      ? d.data().members.map((m) => String(m)).filter(Boolean)
      : []
    if (!members.includes(peer)) continue
    batch.update(d.ref, { members: arrayRemove(peer) })
    pending += 1
  }
  if (pending > 0) await batch.commit()
}

/**
 * @param {string} channelId
 * @param {(messages: MuhabereMessage[]) => void} onData
 * @param {(err: unknown) => void} [onError]
 */
export function subscribeChannelMessages(channelId, onData, onError) {
  if (!isFirebaseConfigured() || !db) {
    onData([])
    return () => {}
  }
  const cid = String(channelId ?? '').trim()
  if (!cid) {
    onData([])
    return () => {}
  }

  const q = query(
    collection(db, 'channels', cid, 'messages'),
    orderBy('timestamp', 'asc'),
  )

  return safeOnSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => mapMessageDoc(d, cid))),
    (err) => onError?.(err),
  )
}

/**
 * @param {{
 *   channelId: string
 *   senderId: string
 *   text?: string
 *   type?: MuhabereMessageType
 *   imageUrl?: string
 *   lat?: number
 *   lng?: number
 * }} input
 */
export async function sendChannelMessage({
  channelId,
  senderId,
  text = '',
  type = 'text',
  imageUrl,
  lat,
  lng,
}) {
  assertDb()
  const cid = String(channelId ?? '').trim()
  const from = String(senderId ?? '').trim()
  const msgType = type === 'image' || type === 'location' ? type : 'text'
  let body = String(text ?? '').trim()

  if (!cid || !from) {
    throwMuhabereError('INVALID_CHANNEL_OR_SENDER', 'invalid-argument')
  }

  if (msgType === 'text' && !body) {
    throwMuhabereError('EMPTY_MESSAGE', 'invalid-argument')
  }

  if (msgType === 'image' && !imageUrl) {
    throwMuhabereError('MISSING_IMAGE_URL', 'invalid-argument')
  }

  if (msgType === 'location' && (typeof lat !== 'number' || typeof lng !== 'number')) {
    throwMuhabereError('INVALID_COORDINATES', 'invalid-argument')
  }

  if (msgType === 'image') body = body || MUHABERE_PREVIEW_IMAGE
  if (msgType === 'location') body = body || MUHABERE_PREVIEW_LOCATION

  if (msgType === 'text') assertMuhabereContentAllowed(body)

  const payload = {
    channelId: cid,
    text: body,
    senderId: from,
    timestamp: serverTimestamp(),
    type: msgType,
  }

  if (msgType === 'image') payload.imageUrl = imageUrl
  if (msgType === 'location') {
    payload.lat = lat
    payload.lng = lng
  }

  await addDoc(collection(db, 'channels', cid, 'messages'), payload)
  await markMuhabereChannelAsRead(from, cid, Date.now())

  try {
    const channelSnap = await getDoc(doc(db, 'channels', cid))
    const members = Array.isArray(channelSnap.data()?.members)
      ? channelSnap.data().members.map((member) => String(member ?? '').trim()).filter(Boolean)
      : []
    queueMuhabereMessageNotifications(from, members, body)
  } catch {
    /* kanal üyeleri okunamazsa bildirim atlanır */
  }
}

/**
 * Tek mesajın kullanıcı için okunmamış olup olmadığını döner (kendi mesajları hariç).
 * @param {{ senderId?: string, timestamp?: unknown, createdAt?: unknown }} message
 * @param {unknown} lastReadAt
 * @param {string} currentUid
 */
export function isChannelMessageUnreadForUser(message, lastReadAt, currentUid) {
  const me = String(currentUid ?? '').trim()
  const senderId = String(message.senderId ?? '').trim()
  if (!me || !senderId || senderId === me) return false
  const cutoff = timestampToMs(lastReadAt) || 0
  const ts = timestampToMs(message.timestamp ?? message.createdAt)
  return ts > cutoff
}

/**
 * Kanal mesajlarında okunmamış sayısı — lastReadAt sonrası ve kendi mesajları hariç.
 * @param {MuhabereMessage[]} messages
 * @param {unknown} lastReadAt
 * @param {string} currentUid
 */
export function computeChannelUnreadCount(messages, lastReadAt, currentUid) {
  return messages.filter((m) => isChannelMessageUnreadForUser(m, lastReadAt, currentUid)).length
}

/**
 * Kullanıcının kanaldaki son okuma zamanını günceller (user_channels / lastReadAt).
 * @param {string} uid
 * @param {string} channelId
 * @param {number} [readAtMs] Kanala girildiğinde istemci zamanı (anında sıfırlama)
 */
export async function markMuhabereChannelAsRead(uid, channelId, readAtMs) {
  assertDb()
  const me = String(uid ?? '').trim()
  const cid = String(channelId ?? '').trim()
  if (!me || !cid) return

  const lastReadAt =
    typeof readAtMs === 'number' && Number.isFinite(readAtMs) && readAtMs > 0
      ? Timestamp.fromMillis(readAtMs)
      : serverTimestamp()

  await setDoc(
    doc(db, 'users', me, 'muhabere_channel_reads', cid),
    { userId: me, channelId: cid, lastReadAt },
    { merge: true },
  )

  await markConversationAsRead(me, 'channel', cid)
}

/**
 * conversations/{conversationId} özetinde kullanıcının okunmamış sayısını sıfırlar.
 * @param {string} uid
 * @param {'channel' | 'dm'} type
 * @param {string} refId
 */
export async function markConversationAsRead(uid, type, refId) {
  assertDb()
  const me = String(uid ?? '').trim()
  const conversationId = buildConversationId(type, refId)
  if (!me || !conversationId) return

  await updateDoc(doc(db, 'conversations', conversationId), {
    [`unreadByUser.${me}`]: 0,
  }).catch(() => {
    /* özet henüz oluşmamış olabilir */
  })
}

/**
 * Kullanıcının üye olduğu konuşma özetlerini dinler (conversations koleksiyonu).
 * @param {string} uid
 * @param {(summaries: import('./muhabereConversation').MuhabereConversationSummary[]) => void} onData
 * @param {(err: unknown) => void} [onError]
 */
export function subscribeConversationSummaries(uid, onData, onError) {
  if (!isFirebaseConfigured() || !db) {
    onData([])
    return () => {}
  }
  const me = String(uid ?? '').trim()
  if (!me) {
    onData([])
    return () => {}
  }

  const q = query(
    collection(db, 'conversations'),
    where('members', 'array-contains', me),
    orderBy('lastMessageAt', 'desc'),
  )

  return safeOnSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => mapConversationSummaryDoc(d, me)))
    },
    (err) => onError?.(err),
  )
}

/**
 * @param {'channel' | 'dm'} mode
 * @param {string} refId
 */
function messagesCollectionForConversation(mode, refId) {
  const id = String(refId ?? '').trim()
  if (!id) return null
  if (mode === 'channel') return collection(db, 'channels', id, 'messages')
  return collection(db, 'chats', id, 'messages')
}

/**
 * Aktif konuşmanın en yeni mesaj sayfasını dinler (limit 20, yalnızca odaklanılan oda).
 * @param {{
 *   mode: 'channel' | 'dm'
 *   refId: string
 *   pageSize?: number
 *   onData: (payload: {
 *     messages: MuhabereMessage[]
 *     oldestDoc: import('firebase/firestore').QueryDocumentSnapshot | null
 *     hasMore: boolean
 *   }) => void
 *   onError?: (err: unknown) => void
 * }} input
 */
export function subscribeActiveConversationMessages({
  mode,
  refId,
  pageSize = MUHABERE_MESSAGE_PAGE_SIZE,
  onData,
  onError,
}) {
  if (!isFirebaseConfigured() || !db) {
    onData({ messages: [], oldestDoc: null, hasMore: false })
    return () => {}
  }

  const col = messagesCollectionForConversation(mode, refId)
  if (!col) {
    onData({ messages: [], oldestDoc: null, hasMore: false })
    return () => {}
  }

  const q = query(col, orderBy('timestamp', 'desc'), limit(pageSize))

  return safeOnSnapshot(
    q,
    (snap) => {
      const threadId = String(refId)
      const rows = snap.docs.map((d) => mapMessageDoc(d, threadId)).reverse()
      onData({
        messages: rows,
        oldestDoc: snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null,
        hasMore: snap.docs.length === pageSize,
      })
    },
    (err) => onError?.(err),
  )
}

/**
 * startAfter ile daha eski mesaj sayfasını getirir (infinite scroll).
 * @param {{
 *   mode: 'channel' | 'dm'
 *   refId: string
 *   startAfterDoc: import('firebase/firestore').QueryDocumentSnapshot
 *   pageSize?: number
 * }} input
 */
export async function fetchOlderConversationMessages({
  mode,
  refId,
  startAfterDoc,
  pageSize = MUHABERE_MESSAGE_PAGE_SIZE,
}) {
  assertDb()
  const col = messagesCollectionForConversation(mode, refId)
  if (!col || !startAfterDoc) return { messages: [], oldestDoc: null, hasMore: false }

  const snap = await getDocs(
    query(col, orderBy('timestamp', 'desc'), startAfter(startAfterDoc), limit(pageSize)),
  )
  const threadId = String(refId)
  const rows = snap.docs.map((d) => mapMessageDoc(d, threadId)).reverse()
  return {
    messages: rows,
    oldestDoc: snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null,
    hasMore: snap.docs.length === pageSize,
  }
}

/**
 * @param {string} uid
 * @param {(readMap: Record<string, unknown>) => void} onData
 * @param {(err: unknown) => void} [onError]
 */
export function subscribeMuhabereChannelReads(uid, onData, onError) {
  if (!isFirebaseConfigured() || !db) {
    onData({})
    return () => {}
  }
  const me = String(uid ?? '').trim()
  if (!me) {
    onData({})
    return () => {}
  }

  return safeOnSnapshot(
    collection(db, 'users', me, 'muhabere_channel_reads'),
    (snap) => {
      /** @type {Record<string, unknown>} */
      const map = {}
      for (const d of snap.docs) {
        map[d.id] = d.data().lastReadAt
      }
      onData(map)
    },
    (err) => onError?.(err),
  )
}

/**
 * Üye olunan tüm kanallar için okunmamış mesaj sayıları (kanalId → count).
 * @param {string} uid
 * @param {(counts: Record<string, number>) => void} onCounts
 * @param {(err: unknown) => void} [onError]
 * @param {{ getExtraReadMs?: (channelId: string) => number }} [options]
 */
export function subscribeUserChannelUnreadCounts(uid, onCounts, onError, options) {
  if (!isFirebaseConfigured() || !db) {
    onCounts({})
    return () => {}
  }
  const me = String(uid ?? '').trim()
  if (!me) {
    onCounts({})
    return () => {}
  }

  const getExtraReadMs = options?.getExtraReadMs ?? (() => 0)

  const resolveLastReadMs = (/** @type {string} */ cid) => {
    const storedMs = timestampToMs(readMap[cid]) || 0
    const extraMs = getExtraReadMs(cid) || 0
    return Math.max(storedMs, extraMs)
  }

  let active = true
  /** @type {(() => void)[]} */
  const channelUnsubs = []
  /** @type {MuhabereChannel[]} */
  let channels = []
  /** @type {Record<string, unknown>} */
  let readMap = {}
  /** @type {Record<string, number>} */
  const countsByChannel = {}

  const clearChannelUnsubs = () => {
    channelUnsubs.forEach((fn) => fn())
    channelUnsubs.length = 0
    for (const key of Object.keys(countsByChannel)) {
      delete countsByChannel[key]
    }
  }

  const emitCounts = () => {
    if (!active) return
    /** @type {Record<string, number>} */
    const next = {}
    for (const ch of channels) {
      const count = countsByChannel[ch.id] ?? 0
      if (count > 0) next[ch.id] = count
    }
    onCounts(next)
  }

  const wireChannelListeners = () => {
    clearChannelUnsubs()
    if (!active) return

    if (channels.length === 0) {
      onCounts({})
      return
    }

    for (const ch of channels) {
      countsByChannel[ch.id] = 0
    }
    emitCounts()

    for (const ch of channels) {
      const cid = ch.id
      const lastMs = resolveLastReadMs(cid)
      const col = collection(db, 'channels', cid, 'messages')

      const q =
        lastMs > 0
          ? query(
              col,
              where('timestamp', '>', Timestamp.fromMillis(lastMs)),
              orderBy('timestamp', 'asc'),
            )
          : query(col, orderBy('timestamp', 'desc'), limit(80))

      const unsub = safeOnSnapshot(
        q,
        (snap) => {
          let count = 0
          for (const d of snap.docs) {
            const data = d.data()
            if (isChannelMessageUnreadForUser(data, lastMs, me)) count += 1
          }
          countsByChannel[cid] = count
          emitCounts()
        },
        (err) => onError?.(err),
      )
      channelUnsubs.push(unsub)
    }
  }

  const unsubChannels = subscribeUserMuhabereChannels(
    me,
    (rows) => {
      channels = rows
      wireChannelListeners()
    },
    onError,
  )

  const unsubReads = subscribeMuhabereChannelReads(
    me,
    (map) => {
      readMap = map
      wireChannelListeners()
    },
    onError,
  )

  return () => {
    active = false
    unsubChannels()
    unsubReads()
    clearChannelUnsubs()
  }
}

/**
 * @param {MuhabereMessage[]} messages
 * @param {Set<string> | string[]} hiddenIds
 */
export function filterVisibleMuhabereMessages(messages, hiddenIds) {
  const hidden = hiddenIds instanceof Set ? hiddenIds : new Set(hiddenIds)
  if (hidden.size === 0) return messages
  return messages.filter((msg) => !hidden.has(msg.id))
}

/**
 * Mesajı yalnızca kullanıcının ekranından gizler (Firebase'den silmez).
 * @param {string} userId
 * @param {string} messageId
 */
export async function hideMuhabereMessageForUser(userId, messageId) {
  assertDb()
  const me = String(userId ?? '').trim()
  const mid = String(messageId ?? '').trim()
  if (!me || !mid) return

  await setDoc(doc(db, 'users', me, 'hidden_messages', mid), {
    messageId: mid,
    hiddenAt: serverTimestamp(),
  })
}

/**
 * Kullanıcının gizlediği mesaj kimlikleri.
 * @param {string} userId
 * @param {(hiddenIds: Set<string>) => void} onIds
 * @param {(err: unknown) => void} [onError]
 */
export function subscribeHiddenMuhabereMessageIds(userId, onIds, onError) {
  if (!isFirebaseConfigured() || !db) {
    onIds(new Set())
    return () => {}
  }
  const me = String(userId ?? '').trim()
  if (!me) {
    onIds(new Set())
    return () => {}
  }

  return safeOnSnapshot(
    collection(db, 'users', me, 'hidden_messages'),
    (snap) => {
      const ids = new Set(
        snap.docs.map((d) => String(d.data().messageId ?? d.id).trim()).filter(Boolean),
      )
      onIds(ids)
    },
    (err) => onError?.(err),
  )
}

/**
 * @param {MuhabereChannel[]} channels
 * @param {Set<string> | string[]} archivedIds
 * @param {Set<string> | string[]} deletedIds
 */
export function splitMuhabereChannels(channels, archivedIds, deletedIds) {
  const archived = archivedIds instanceof Set ? archivedIds : new Set(archivedIds)
  const deleted = deletedIds instanceof Set ? deletedIds : new Set(deletedIds)
  /** @type {MuhabereChannel[]} */
  const active = []
  /** @type {MuhabereChannel[]} */
  const archivedList = []
  for (const ch of channels) {
    if (deleted.has(ch.id)) continue
    if (archived.has(ch.id)) archivedList.push(ch)
    else active.push(ch)
  }
  return { active, archived: archivedList }
}

/**
 * @param {MuhabereContact[]} contacts
 * @param {Set<string> | string[]} archivedIds
 * @param {Set<string> | string[]} deletedIds
 */
export function splitMuhabereContacts(contacts, archivedIds, deletedIds) {
  const archived = archivedIds instanceof Set ? archivedIds : new Set(archivedIds)
  const deleted = deletedIds instanceof Set ? deletedIds : new Set(deletedIds)
  /** @type {MuhabereContact[]} */
  const active = []
  /** @type {MuhabereContact[]} */
  const archivedList = []
  for (const c of contacts) {
    if (deleted.has(c.uid)) continue
    if (archived.has(c.uid)) archivedList.push(c)
    else active.push(c)
  }
  return { active, archived: archivedList }
}

/** @deprecated hidden_channels → archived_channels */
export function filterVisibleMuhabereChannels(channels, hiddenIds) {
  const hidden = hiddenIds instanceof Set ? hiddenIds : new Set(hiddenIds)
  if (hidden.size === 0) return channels
  return channels.filter((ch) => !hidden.has(ch.id))
}

/**
 * Kanalı arşive taşır (Firebase'den silmez).
 * @param {string} userId
 * @param {string} channelId
 */
export async function archiveMuhabereChannelForUser(userId, channelId) {
  assertDb()
  const me = String(userId ?? '').trim()
  const cid = String(channelId ?? '').trim()
  if (!me || !cid) return

  await setDoc(doc(db, 'users', me, 'archived_channels', cid), {
    userId: me,
    channelId: cid,
    archivedAt: serverTimestamp(),
  })
  try {
    await deleteDoc(doc(db, 'users', me, 'hidden_channels', cid))
  } catch {
    /* legacy */
  }
}

/**
 * Kanalı arşivden çıkarır.
 * @param {string} userId
 * @param {string} channelId
 */
export async function unarchiveMuhabereChannelForUser(userId, channelId) {
  assertDb()
  const me = String(userId ?? '').trim()
  const cid = String(channelId ?? '').trim()
  if (!me || !cid) return

  await deleteDoc(doc(db, 'users', me, 'archived_channels', cid))
  try {
    await deleteDoc(doc(db, 'users', me, 'hidden_channels', cid))
  } catch {
    /* legacy */
  }
}

/**
 * Kanalı kullanıcı listesinden tamamen kaldırır (kişisel silme).
 * @param {string} userId
 * @param {string} channelId
 */
export async function deleteMuhabereChannelForUser(userId, channelId) {
  assertDb()
  const me = String(userId ?? '').trim()
  const cid = String(channelId ?? '').trim()
  if (!me || !cid) return

  await setDoc(doc(db, 'users', me, 'deleted_channels', cid), {
    userId: me,
    channelId: cid,
    deletedAt: serverTimestamp(),
  })
  await unarchiveMuhabereChannelForUser(me, cid)
}

/**
 * Kullanıcıyı tim kanalından çıkarır (gruptan ayrılma).
 * @param {string} userId
 * @param {string} channelId
 */
export async function leaveMuhabereChannel(userId, channelId) {
  assertDb()
  const me = String(userId ?? '').trim()
  const cid = String(channelId ?? '').trim()
  if (!me || !cid) return

  const ref = doc(db, 'channels', cid)
  const snap = await getDoc(ref)
  if (!snap.exists()) return

  const members = Array.isArray(snap.data().members)
    ? snap.data().members.map((m) => String(m)).filter(Boolean)
    : []
  if (!members.includes(me)) return

  await updateDoc(ref, { members: arrayRemove(me) })
}

/**
 * Tim kanalından belirli üyeyi çıkarır.
 * @param {string} channelId
 * @param {string} memberUid
 */
export async function removeMuhabereChannelMember(channelId, memberUid) {
  assertDb()
  const cid = String(channelId ?? '').trim()
  const target = String(memberUid ?? '').trim()
  if (!cid || !target) return

  const ref = doc(db, 'channels', cid)
  const snap = await getDoc(ref)
  if (!snap.exists()) return

  const members = Array.isArray(snap.data().members)
    ? snap.data().members.map((m) => String(m)).filter(Boolean)
    : []
  if (!members.includes(target)) return

  await updateDoc(ref, { members: arrayRemove(target) })
}

/**
 * DM sohbetini arşive taşır.
 * @param {string} userId
 * @param {string} peerUid
 */
export async function archiveMuhabereDmForUser(userId, peerUid) {
  assertDb()
  const me = String(userId ?? '').trim()
  const peer = String(peerUid ?? '').trim()
  if (!me || !peer) return

  await setDoc(doc(db, 'users', me, 'archived_dms', peer), {
    userId: me,
    peerUid: peer,
    archivedAt: serverTimestamp(),
  })
}

/**
 * @param {string} userId
 * @param {string} peerUid
 */
export async function unarchiveMuhabereDmForUser(userId, peerUid) {
  assertDb()
  const me = String(userId ?? '').trim()
  const peer = String(peerUid ?? '').trim()
  if (!me || !peer) return

  await deleteDoc(doc(db, 'users', me, 'archived_dms', peer))
}

/**
 * DM sohbetini kullanıcı listesinden tamamen kaldırır.
 * @param {string} userId
 * @param {string} peerUid
 */
export async function deleteMuhabereDmForUser(userId, peerUid) {
  assertDb()
  const me = String(userId ?? '').trim()
  const peer = String(peerUid ?? '').trim()
  if (!me || !peer) return

  await setDoc(doc(db, 'users', me, 'deleted_dms', peer), {
    userId: me,
    peerUid: peer,
    deletedAt: serverTimestamp(),
  })
  await unarchiveMuhabereDmForUser(me, peer)
}

/**
 * @param {string} userId
 * @param {(ids: Set<string>) => void} onIds
 * @param {(err: unknown) => void} [onError]
 */
export function subscribeArchivedMuhabereChannelIds(userId, onIds, onError) {
  if (!isFirebaseConfigured() || !db) {
    onIds(new Set())
    return () => {}
  }
  const me = String(userId ?? '').trim()
  if (!me) {
    onIds(new Set())
    return () => {}
  }

  let active = true
  /** @type {Set<string>} */
  let archived = new Set()
  /** @type {Set<string>} */
  let legacy = new Set()

  const emit = () => {
    if (!active) return
    onIds(new Set([...archived, ...legacy]))
  }

  const unsubArchived = safeOnSnapshot(
    collection(db, 'users', me, 'archived_channels'),
    (snap) => {
      archived = new Set(
        snap.docs.map((d) => String(d.data().channelId ?? d.id).trim()).filter(Boolean),
      )
      emit()
    },
    (err) => onError?.(err),
  )

  const unsubLegacy = safeOnSnapshot(
    collection(db, 'users', me, 'hidden_channels'),
    (snap) => {
      legacy = new Set(
        snap.docs.map((d) => String(d.data().channelId ?? d.id).trim()).filter(Boolean),
      )
      emit()
    },
    (err) => onError?.(err),
  )

  return () => {
    active = false
    unsubArchived()
    unsubLegacy()
  }
}

/**
 * @param {string} userId
 * @param {(ids: Set<string>) => void} onIds
 * @param {(err: unknown) => void} [onError]
 */
export function subscribeDeletedMuhabereChannelIds(userId, onIds, onError) {
  return subscribeUserMuhaberePreferenceIds(userId, 'deleted_channels', 'channelId', onIds, onError)
}

/**
 * @param {string} userId
 * @param {(ids: Set<string>) => void} onIds
 * @param {(err: unknown) => void} [onError]
 */
export function subscribeArchivedMuhabereDmIds(userId, onIds, onError) {
  return subscribeUserMuhaberePreferenceIds(userId, 'archived_dms', 'peerUid', onIds, onError)
}

/**
 * @param {string} userId
 * @param {(ids: Set<string>) => void} onIds
 * @param {(err: unknown) => void} [onError]
 */
export function subscribeDeletedMuhabereDmIds(userId, onIds, onError) {
  return subscribeUserMuhaberePreferenceIds(userId, 'deleted_dms', 'peerUid', onIds, onError)
}

/**
 * @param {string} userId
 * @param {string} subcollection
 * @param {string} field
 * @param {(ids: Set<string>) => void} onIds
 * @param {(err: unknown) => void} [onError]
 */
function subscribeUserMuhaberePreferenceIds(userId, subcollection, field, onIds, onError) {
  if (!isFirebaseConfigured() || !db) {
    onIds(new Set())
    return () => {}
  }
  const me = String(userId ?? '').trim()
  if (!me) {
    onIds(new Set())
    return () => {}
  }

  return safeOnSnapshot(
    collection(db, 'users', me, subcollection),
    (snap) => {
      const ids = new Set(
        snap.docs.map((d) => String(d.data()[field] ?? d.id).trim()).filter(Boolean),
      )
      onIds(ids)
    },
    (err) => onError?.(err),
  )
}

/**
 * DM okunmamış sayıları — peerUid → count
 * @param {string} currentUid
 * @param {(counts: Record<string, number>) => void} onCounts
 * @param {(err: unknown) => void} [onError]
 */
export function subscribeDmUnreadByPeerId(currentUid, onCounts, onError) {
  if (!isFirebaseConfigured() || !db) {
    onCounts({})
    return () => {}
  }
  const me = String(currentUid ?? '').trim()
  if (!me) {
    onCounts({})
    return () => {}
  }

  let active = true
  /** @type {(() => void)[]} */
  const chatUnsubs = []
  /** @type {Record<string, number>} */
  const countsByPeer = {}

  const recompute = () => {
    if (!active) return
    onCounts({ ...countsByPeer })
  }

  const clearChatUnsubs = () => {
    chatUnsubs.forEach((fn) => fn())
    chatUnsubs.length = 0
    for (const key of Object.keys(countsByPeer)) {
      delete countsByPeer[key]
    }
  }

  const wireChats = async () => {
    clearChatUnsubs()
    if (!active) return

    try {
      const contacts = await fetchMuhabereContacts(me)
      if (!active) return

      if (contacts.length === 0) {
        onCounts({})
        return
      }

      for (const contact of contacts) {
        const peer = contact.uid
        const chatId = buildChatId(me, peer)
        if (!chatId) continue

        const q = query(
          collection(db, 'chats', chatId, 'messages'),
          where('receiverId', '==', me),
          where('status', '==', 'sent'),
        )

        const unsub = safeOnSnapshot(
          q,
          (snap) => {
            countsByPeer[peer] = snap.size
            recompute()
          },
          (err) => onError?.(err),
        )
        chatUnsubs.push(unsub)
      }

      recompute()
    } catch (err) {
      if (active) onError?.(err)
    }
  }

  void wireChats()

  const userUnsub = safeOnSnapshot(doc(db, 'users', me), () => {
    void wireChats()
  })

  return () => {
    active = false
    userUnsub()
    clearChatUnsubs()
  }
}

/** @deprecated use archiveMuhabereChannelForUser */
export async function hideMuhabereChannelForUser(userId, channelId) {
  return archiveMuhabereChannelForUser(userId, channelId)
}

/** @deprecated use unarchiveMuhabereChannelForUser */
export async function unhideMuhabereChannelForUser(userId, channelId) {
  return unarchiveMuhabereChannelForUser(userId, channelId)
}

/** @deprecated use subscribeArchivedMuhabereChannelIds */
export function subscribeHiddenMuhabereChannelIds(userId, onIds, onError) {
  return subscribeArchivedMuhabereChannelIds(userId, onIds, onError)
}
