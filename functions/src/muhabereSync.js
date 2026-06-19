const { getFirestore, FieldValue } = require('firebase-admin/firestore')
const { onDocumentCreated } = require('firebase-functions/v2/firestore')
const { logger } = require('firebase-functions')

const SUMMARY_DOC_ID = 'latest'

/** @type {readonly string[]} */
const BLACKLIST_TERMS = [
  'pkk',
  'ypg',
  'pyd',
  'dhkp-c',
  'fetö',
  'feto',
  'isid',
  'deaş',
  'el kaide',
  'teror orgutu',
  'orospu',
  'siktir',
  'amk',
  'nefret soylemi',
]

/**
 * @param {string} text
 */
function normalizeForFilter(text) {
  return String(text ?? '')
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * @param {string} text
 * @returns {boolean}
 */
function isMuhabereContentViolation(text) {
  const normalized = normalizeForFilter(text)
  if (!normalized) return false
  return BLACKLIST_TERMS.some((term) => normalized.includes(normalizeForFilter(term)))
}

/**
 * @param {unknown} value
 * @returns {number}
 */
function timestampToMs(value) {
  if (!value) return 0
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value.toMillis === 'function') return value.toMillis()
  if (typeof value.seconds === 'number') return value.seconds * 1000
  if (typeof value._seconds === 'number') return value._seconds * 1000
  return 0
}

/**
 * @param {Record<string, unknown>} data
 * @returns {string}
 */
function resolveMessagePreview(data) {
  const type = String(data.type ?? 'text')
  const text = String(data.text ?? '').trim()
  if (type === 'image') return text || '[ GÖRSEL ]'
  if (type === 'location') return text || '[ STRATEJİK KOORDİNAT ]'
  return text || '—'
}

/**
 * @param {Record<string, unknown> | undefined} userData
 * @returns {string}
 */
function resolveSenderName(userData) {
  if (!userData || typeof userData !== 'object') return 'OPERATÖR'
  const callsign = String(userData.callsign ?? '').trim()
  const displayName = String(userData.displayName ?? '').trim()
  const username = String(userData.username ?? '').trim()
  return callsign || displayName || username || 'OPERATÖR'
}

/**
 * @param {'channel' | 'dm'} type
 * @param {string} refId
 */
function buildConversationId(type, refId) {
  const ref = String(refId ?? '').trim()
  if (!ref) return ''
  return type === 'channel' ? `channel_${ref}` : `dm_${ref}`
}

/**
 * @param {{
 *   memberUid: string
 *   senderId: string
 *   messageTsMs: number
 *   lastReadMs: number
 *   existingUnread: number
 * }} input
 * @returns {number}
 */
function computeUnreadForMember({ memberUid, senderId, messageTsMs, lastReadMs, existingUnread }) {
  if (memberUid === senderId) return 0
  if (messageTsMs <= lastReadMs) return existingUnread
  return existingUnread + 1
}

/**
 * @param {Record<string, { unreadCount?: number }>} channels
 * @param {string} channelId
 * @param {number} channelUnread
 * @returns {number}
 */
function sumChannelUnread(channels, channelId, channelUnread) {
  let total = 0
  for (const [id, entry] of Object.entries(channels)) {
    const count = id === channelId ? channelUnread : Number(entry?.unreadCount) || 0
    total += count
  }
  if (!(channelId in channels)) total += channelUnread
  return total
}

/**
 * conversations/{conversationId} özet belgesini günceller.
 * @param {import('firebase-admin/firestore').Firestore} db
 * @param {import('firebase-admin/firestore').WriteBatch} batch
 * @param {{
 *   conversationId: string
 *   type: 'channel' | 'dm'
 *   refId: string
 *   name: string
 *   members: string[]
 *   peerUid?: string
 *   memberUid: string
 *   senderId: string
 *   senderName: string
 *   lastMessage: string
 *   messageTimestamp: unknown
 *   messageId: string
 *   lastReadMs: number
 *   messageTsMs: number
 *   existingUnread: number
 * }} input
 */
function queueConversationSummaryUpdate(db, batch, input) {
  const {
    conversationId,
    type,
    refId,
    name,
    members,
    peerUid,
    memberUid,
    senderId,
    senderName,
    lastMessage,
    messageTimestamp,
    messageId,
    lastReadMs,
    messageTsMs,
    existingUnread,
  } = input

  const unreadCount = computeUnreadForMember({
    memberUid,
    senderId,
    messageTsMs,
    lastReadMs,
    existingUnread,
  })

  const conversationRef = db.collection('conversations').doc(conversationId)
  batch.set(
    conversationRef,
    {
      type,
      refId,
      name,
      members,
      ...(peerUid ? { peerUid } : {}),
      lastMessage,
      lastSender: senderName,
      lastSenderId: senderId,
      lastMessageAt: messageTimestamp,
      lastMessageId: messageId,
      updatedAt: FieldValue.serverTimestamp(),
      [`unreadByUser.${memberUid}`]: unreadCount,
    },
    { merge: true },
  )
}

/**
 * @param {import('firebase-functions/v2/firestore').FirestoreEvent<
 *   import('firebase-functions/v2/firestore').QueryDocumentSnapshot | undefined,
 *   { channelId: string; messageId: string }
 * >} event
 */
async function handleChannelMessageCreated(event) {
  const snap = event.data
  if (!snap) {
    logger.warn('muhabereSync: mesaj snapshot yok', { eventId: event.id })
    return
  }

  const channelId = String(event.params.channelId ?? '').trim()
  const messageId = String(event.params.messageId ?? '').trim()
  const messageData = snap.data() ?? {}

  const senderId = String(messageData.senderId ?? '').trim()
  if (!channelId || !senderId) {
    logger.warn('muhabereSync: channelId veya senderId eksik', { channelId, messageId })
    return
  }

  const previewText = resolveMessagePreview(messageData)
  if (isMuhabereContentViolation(previewText)) {
    await snap.ref.delete()
    logger.warn('muhabereSync: içerik filtresi — kanal mesajı silindi', { channelId, messageId })
    return
  }

  const db = getFirestore()
  const channelRef = db.collection('channels').doc(channelId)
  const channelSnap = await channelRef.get()

  if (!channelSnap.exists) {
    logger.warn('muhabereSync: kanal bulunamadı', { channelId, messageId })
    return
  }

  const channelData = channelSnap.data() ?? {}
  const channelName = String(channelData.name ?? 'KANAL').trim() || 'KANAL'
  const members = Array.isArray(channelData.members)
    ? [...new Set(channelData.members.map((m) => String(m ?? '').trim()).filter(Boolean))]
    : []

  if (members.length === 0) {
    logger.info('muhabereSync: kanal üyesi yok', { channelId })
    return
  }

  const senderSnap = await db.collection('users').doc(senderId).get()
  const senderName = resolveSenderName(senderSnap.exists ? senderSnap.data() : undefined)

  const messageTimestamp = messageData.timestamp ?? FieldValue.serverTimestamp()
  const messageTsMs = timestampToMs(messageData.timestamp)
  const lastMessage = previewText
  const conversationId = buildConversationId('channel', channelId)

  /** @type {Promise<{ memberUid: string; lastReadMs: number; existingSummary: Record<string, unknown>; existingConversationUnread: number }>[]} */
  const memberContexts = members.map(async (memberUid) => {
    const [readSnap, summarySnap, conversationSnap] = await Promise.all([
      db.collection('users').doc(memberUid).collection('muhabere_channel_reads').doc(channelId).get(),
      db.collection('users').doc(memberUid).collection('muhabere_summary').doc(SUMMARY_DOC_ID).get(),
      db.collection('conversations').doc(conversationId).get(),
    ])

    const lastReadMs = readSnap.exists ? timestampToMs(readSnap.data()?.lastReadAt) : 0
    const conversationData = conversationSnap.exists ? conversationSnap.data() ?? {} : {}
    const unreadByUser =
      conversationData.unreadByUser && typeof conversationData.unreadByUser === 'object'
        ? /** @type {Record<string, number>} */ (conversationData.unreadByUser)
        : {}

    return {
      memberUid,
      lastReadMs,
      existingSummary: summarySnap.exists ? summarySnap.data() ?? {} : {},
      existingConversationUnread: Number(unreadByUser[memberUid]) || 0,
    }
  })

  const contexts = await Promise.all(memberContexts)
  const batch = db.batch()
  let writeCount = 0

  for (const ctx of contexts) {
    const { memberUid, lastReadMs, existingSummary, existingConversationUnread } = ctx
    /** @type {Record<string, { unreadCount?: number }>} */
    const existingChannels =
      existingSummary.channels && typeof existingSummary.channels === 'object'
        ? /** @type {Record<string, { unreadCount?: number }>} */ (existingSummary.channels)
        : {}

    const existingUnread = Number(existingChannels[channelId]?.unreadCount) || 0
    const unreadCount = computeUnreadForMember({
      memberUid,
      senderId,
      messageTsMs,
      lastReadMs,
      existingUnread,
    })

    const totalChannelUnread = sumChannelUnread(existingChannels, channelId, unreadCount)
    const summaryRef = db
      .collection('users')
      .doc(memberUid)
      .collection('muhabere_summary')
      .doc(SUMMARY_DOC_ID)

    const channelPrefix = `channels.${channelId}`

    batch.set(
      summaryRef,
      {
        updatedAt: FieldValue.serverTimestamp(),
        lastMessage,
        senderName,
        senderId,
        timestamp: messageTimestamp,
        latestChannelId: channelId,
        latestChannelName: channelName,
        latestMessageId: messageId,
        totalChannelUnread,
        [`${channelPrefix}.channelId`]: channelId,
        [`${channelPrefix}.channelName`]: channelName,
        [`${channelPrefix}.lastMessage`]: lastMessage,
        [`${channelPrefix}.senderName`]: senderName,
        [`${channelPrefix}.senderId`]: senderId,
        [`${channelPrefix}.timestamp`]: messageTimestamp,
        [`${channelPrefix}.messageId`]: messageId,
        [`${channelPrefix}.unreadCount`]: unreadCount,
      },
      { merge: true },
    )

    queueConversationSummaryUpdate(db, batch, {
      conversationId,
      type: 'channel',
      refId: channelId,
      name: channelName,
      members,
      memberUid,
      senderId,
      senderName,
      lastMessage,
      messageTimestamp,
      messageId,
      lastReadMs,
      messageTsMs,
      existingUnread: existingConversationUnread,
    })

    writeCount += 1
  }

  await batch.commit()
  logger.info('muhabereSync: özet güncellendi', {
    channelId,
    messageId,
    memberCount: writeCount,
    senderId,
  })
}

/**
 * @param {import('firebase-functions/v2/firestore').FirestoreEvent<
 *   import('firebase-functions/v2/firestore').QueryDocumentSnapshot | undefined,
 *   { chatId: string; messageId: string }
 * >} event
 */
async function handleDmMessageCreated(event) {
  const snap = event.data
  if (!snap) return

  const chatId = String(event.params.chatId ?? '').trim()
  const messageId = String(event.params.messageId ?? '').trim()
  const messageData = snap.data() ?? {}

  const senderId = String(messageData.senderId ?? '').trim()
  const receiverId = String(messageData.receiverId ?? '').trim()
  if (!chatId || !senderId || !receiverId) return

  const previewText = resolveMessagePreview(messageData)
  if (isMuhabereContentViolation(previewText)) {
    await snap.ref.delete()
    logger.warn('muhabereSync: içerik filtresi — DM mesajı silindi', { chatId, messageId })
    return
  }

  const parts = chatId.split('_').filter(Boolean)
  if (parts.length !== 2) return
  const members = [...new Set(parts)]
  const conversationId = buildConversationId('dm', chatId)

  const db = getFirestore()
  const senderSnap = await db.collection('users').doc(senderId).get()
  const senderName = resolveSenderName(senderSnap.exists ? senderSnap.data() : undefined)
  const messageTimestamp = messageData.timestamp ?? FieldValue.serverTimestamp()
  const messageTsMs = timestampToMs(messageData.timestamp)

  const batch = db.batch()

  for (const memberUid of members) {
    const peerUid = members.find((m) => m !== memberUid) ?? ''
    const conversationSnap = await db.collection('conversations').doc(conversationId).get()
    const conversationData = conversationSnap.exists ? conversationSnap.data() ?? {} : {}
    const unreadByUser =
      conversationData.unreadByUser && typeof conversationData.unreadByUser === 'object'
        ? /** @type {Record<string, number>} */ (conversationData.unreadByUser)
        : {}

    const peerSnap = peerUid ? await db.collection('users').doc(peerUid).get() : null
    const peerName = resolveSenderName(peerSnap?.exists ? peerSnap.data() : undefined)

    queueConversationSummaryUpdate(db, batch, {
      conversationId,
      type: 'dm',
      refId: chatId,
      name: peerName,
      members,
      peerUid,
      memberUid,
      senderId,
      senderName,
      lastMessage: previewText,
      messageTimestamp,
      messageId,
      lastReadMs: 0,
      messageTsMs,
      existingUnread: Number(unreadByUser[memberUid]) || 0,
    })
  }

  await batch.commit()
  logger.info('muhabereSync: DM özeti güncellendi', { chatId, messageId, senderId })
}

/** Firestore onDocumentCreated — kanal mesajı → muhabere_summary/latest + conversations */
const syncMuhabereChannelSummary = onDocumentCreated(
  {
    document: 'channels/{channelId}/messages/{messageId}',
    memory: '256MiB',
    timeoutSeconds: 60,
  },
  handleChannelMessageCreated,
)

/** Firestore onDocumentCreated — DM mesajı → conversations */
const syncMuhabereDmSummary = onDocumentCreated(
  {
    document: 'chats/{chatId}/messages/{messageId}',
    memory: '256MiB',
    timeoutSeconds: 60,
  },
  handleDmMessageCreated,
)

module.exports = {
  handleChannelMessageCreated,
  handleDmMessageCreated,
  syncMuhabereChannelSummary,
  syncMuhabereDmSummary,
}
