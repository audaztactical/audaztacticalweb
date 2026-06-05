import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  documentId,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from './firebase'
import { safeOnSnapshot, timestampToMs } from './firestoreSnapshot'

/** @typedef {{
 *   uid: string
 *   callsign: string
 *   username: string
 *   role: string
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

const ROSTER_ROLES = ['operator', 'instructor']
const SEARCH_RESULT_LIMIT = 24
const CONTACTS_IN_CHUNK = 30

function assertDb() {
  if (!isFirebaseConfigured() || !db) {
    const e = new Error('Firebase yapılandırılmadı')
    e.code = 'failed-precondition'
    throw e
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
    const e = new Error('Profil bulunamadı.')
    e.code = 'not-found'
    throw e
  }

  const bRole = typeof bSnap.data().role === 'string' ? bSnap.data().role : ''
  const aRole = typeof aSnap.data().role === 'string' ? aSnap.data().role : ''
  if (!ROSTER_ROLES.includes(bRole) || !ROSTER_ROLES.includes(aRole)) {
    const e = new Error('Kullanıcı muhabere ağına dahil değil.')
    e.code = 'permission-denied'
    throw e
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
    const e = new Error('Profil bulunamadı.')
    e.code = 'not-found'
    throw e
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
    const e = new Error('Bağlantı hedefi geçersiz.')
    e.code = 'invalid-argument'
    throw e
  }

  await runTransaction(db, async (tx) => {
    await mutualRemoveContactsInTransaction(tx, me, peer)
  })
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
    const e = new Error('İstek hedefi geçersiz.')
    e.code = 'invalid-argument'
    throw e
  }

  const myContacts = await fetchUserContactUids(me)
  if (myContacts.includes(peer)) {
    const e = new Error('Bu operatör zaten tim rehberinizde.')
    e.code = 'already-exists'
    throw e
  }

  const requestId = buildContactRequestId(me, peer)
  const requestRef = doc(db, 'contact_requests', requestId)
  const existing = await getDoc(requestRef)
  if (existing.exists()) {
    const data = existing.data()
    if (String(data?.senderId ?? '') === me && String(data?.status ?? '') === 'pending') {
      const e = new Error('İstek zaten iletildi.')
      e.code = 'already-exists'
      throw e
    }
    if (String(data?.senderId ?? '') === me) {
      await deleteDoc(requestRef)
    }
  }

  const reverseId = buildContactRequestId(peer, me)
  const reverse = await getDoc(doc(db, 'contact_requests', reverseId))
  if (reverse.exists() && reverse.data()?.status === 'pending') {
    const e = new Error('Bu operatörden zaten katılım isteği var — Ağ Katılım İstekleri bölümünden onaylayın.')
    e.code = 'failed-precondition'
    throw e
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
      const e = new Error(
        'İstek gönderilemedi. Firestore kuralları güncel olmayabilir — npm run deploy-backend çalıştırın.',
      )
      e.code = 'permission-denied'
      throw e
    }
    throw err
  }
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
    const e = new Error('İstek geçersiz.')
    e.code = 'invalid-argument'
    throw e
  }

  const reqRef = doc(db, 'contact_requests', rid)
  let senderId = ''

  await runTransaction(db, async (tx) => {
    const reqSnap = await tx.get(reqRef)
    if (!reqSnap.exists()) {
      const e = new Error('İstek bulunamadı.')
      e.code = 'not-found'
      throw e
    }
    const data = reqSnap.data()
    if (String(data.receiverId ?? '') !== me) {
      const e = new Error('Bu isteği onaylama yetkiniz yok.')
      e.code = 'permission-denied'
      throw e
    }
    if (String(data.status ?? '') !== 'pending') {
      const e = new Error('İstek artık beklemede değil.')
      e.code = 'failed-precondition'
      throw e
    }

    senderId = String(data.senderId ?? '').trim()
    if (!senderId) {
      const e = new Error('Gönderen bilinmiyor.')
      e.code = 'invalid-argument'
      throw e
    }

    await mutualAddContactsInTransaction(tx, me, senderId)
    tx.delete(reqRef)
  })

  const profiles = await fetchUsersByUids([senderId])
  const contact = profiles[0]
  if (!contact) {
    const e = new Error('Onay sonrası profil okunamadı.')
    e.code = 'not-found'
    throw e
  }
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
    const e = new Error('İstek geçersiz.')
    e.code = 'invalid-argument'
    throw e
  }

  const reqRef = doc(db, 'contact_requests', rid)
  const snap = await getDoc(reqRef)
  if (!snap.exists()) return
  if (String(snap.data().receiverId ?? '') !== me) {
    const e = new Error('Bu isteği reddetme yetkiniz yok.')
    e.code = 'permission-denied'
    throw e
  }
  await deleteDoc(reqRef)
}

/** @param {unknown} err */
export function muhabereRequestErrorMessage(err) {
  const code =
    err && typeof err === 'object' && 'code' in err ? String(/** @type {{ code?: string }} */ (err).code) : ''
  if (code === 'permission-denied') {
    return 'İşlem reddedildi. Firestore kuralları güncel değil — npm run deploy-backend çalıştırın.'
  }
  if (code === 'already-exists') {
    return err instanceof Error ? err.message : 'İstek zaten mevcut.'
  }
  return err instanceof Error ? err.message : 'İstek işlenemedi.'
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
  return {
    id: docSnap.id,
    text: String(data.text ?? ''),
    senderId: String(data.senderId ?? ''),
    receiverId: String(data.receiverId ?? ''),
    timestamp: data.timestamp,
    read: status === 'read',
    status,
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

  return safeOnSnapshot(
    doc(db, 'chats', cid),
    (snap) => {
      const map = snap.data()?.typingStatus
      const typing =
        map && typeof map === 'object' && !Array.isArray(map) ? Boolean(map[peer]) : false
      onData(typing)
    },
    (err) => onError?.(err),
  )
}

/**
 * @param {string} chatId
 * @param {string} messageId
 */
export async function markMessageAsRead(chatId, messageId) {
  assertDb()
  const cid = String(chatId ?? '').trim()
  const mid = String(messageId ?? '').trim()
  if (!cid || !mid) return

  await updateDoc(doc(db, 'chats', cid, 'messages', mid), {
    status: 'read',
    read: true,
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
    batch.update(d.ref, { status: 'read', read: true })
  }
  await batch.commit()
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

  const q = query(
    collectionGroup(db, 'messages'),
    where('receiverId', '==', me),
    where('status', '==', 'sent'),
  )

  return safeOnSnapshot(
    q,
    (snap) => onCount(snap.size),
    (err) => onError?.(err),
  )
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
    const e = new Error('Mesaj veya alıcı geçersiz.')
    e.code = 'invalid-argument'
    throw e
  }

  if (msgType === 'text' && !body) {
    const e = new Error('Mesaj metni boş olamaz.')
    e.code = 'invalid-argument'
    throw e
  }

  if (msgType === 'image' && !imageUrl) {
    const e = new Error('Görsel URL eksik.')
    e.code = 'invalid-argument'
    throw e
  }

  if (msgType === 'location' && (typeof lat !== 'number' || typeof lng !== 'number')) {
    const e = new Error('Koordinat geçersiz.')
    e.code = 'invalid-argument'
    throw e
  }

  if (msgType === 'image') body = body || '[ GÖRSEL ]'
  if (msgType === 'location') body = body || '[ STRATEJİK KOORDİNAT ]'

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
    return
  }

  await addDoc(collection(db, 'chats', cid, 'messages'), payload)
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
  if (!creator || !label) {
    const e = new Error('Kanal adı veya oluşturucu geçersiz.')
    e.code = 'invalid-argument'
    throw e
  }

  const members = [
    ...new Set([creator, ...memberUids.map((id) => String(id ?? '').trim()).filter(Boolean)]),
  ]

  const ref = await addDoc(collection(db, 'channels'), {
    name: label,
    members,
    createdBy: creator,
    createdAt: serverTimestamp(),
  })

  return ref.id
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
    const e = new Error('Kanal veya gönderici geçersiz.')
    e.code = 'invalid-argument'
    throw e
  }

  if (msgType === 'text' && !body) {
    const e = new Error('Mesaj metni boş olamaz.')
    e.code = 'invalid-argument'
    throw e
  }

  if (msgType === 'image' && !imageUrl) {
    const e = new Error('Görsel URL eksik.')
    e.code = 'invalid-argument'
    throw e
  }

  if (msgType === 'location' && (typeof lat !== 'number' || typeof lng !== 'number')) {
    const e = new Error('Koordinat geçersiz.')
    e.code = 'invalid-argument'
    throw e
  }

  if (msgType === 'image') body = body || '[ GÖRSEL ]'
  if (msgType === 'location') body = body || '[ STRATEJİK KOORDİNAT ]'

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
}
