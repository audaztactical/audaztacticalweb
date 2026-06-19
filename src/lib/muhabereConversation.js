/** @typedef {'channel' | 'dm'} MuhabereConversationType */

/** @typedef {{
 *   id: string
 *   type: MuhabereConversationType
 *   refId: string
 *   name: string
 *   members: string[]
 *   peerUid?: string
 *   lastMessage: string
 *   lastSender: string
 *   lastSenderId: string
 *   lastMessageAt: unknown
 *   unreadCount: number
 * }} MuhabereConversationSummary */

/**
 * @param {MuhabereConversationType} type
 * @param {string} refId
 */
export function buildConversationId(type, refId) {
  const ref = String(refId ?? '').trim()
  if (!ref) return ''
  return type === 'channel' ? `channel_${ref}` : `dm_${ref}`
}

/**
 * @param {string} conversationId
 * @returns {{ type: MuhabereConversationType, refId: string } | null}
 */
export function parseConversationId(conversationId) {
  const id = String(conversationId ?? '').trim()
  if (id.startsWith('channel_')) {
    return { type: 'channel', refId: id.slice('channel_'.length) }
  }
  if (id.startsWith('dm_')) {
    return { type: 'dm', refId: id.slice('dm_'.length) }
  }
  return null
}

/**
 * @param {import('firebase/firestore').DocumentSnapshot} docSnap
 * @param {string} currentUid
 * @returns {MuhabereConversationSummary}
 */
export function mapConversationSummaryDoc(docSnap, currentUid) {
  const data = docSnap.data() ?? {}
  const members = Array.isArray(data.members)
    ? data.members.map((m) => String(m ?? '').trim()).filter(Boolean)
    : []
  const type = data.type === 'dm' ? 'dm' : 'channel'
  const refId = String(data.refId ?? '').trim()
  const me = String(currentUid ?? '').trim()

  /** @type {Record<string, number>} */
  const unreadByUser =
    data.unreadByUser && typeof data.unreadByUser === 'object' && !Array.isArray(data.unreadByUser)
      ? /** @type {Record<string, number>} */ (data.unreadByUser)
      : {}

  let peerUid = String(data.peerUid ?? '').trim()
  if (!peerUid && type === 'dm' && me) {
    peerUid = members.find((m) => m !== me) ?? ''
  }

  return {
    id: docSnap.id,
    type,
    refId,
    name: String(data.name ?? '').trim() || (type === 'channel' ? 'KANAL' : 'OPERATÖR'),
    members,
    peerUid: peerUid || undefined,
    lastMessage: String(data.lastMessage ?? ''),
    lastSender: String(data.lastSender ?? ''),
    lastSenderId: String(data.lastSenderId ?? ''),
    lastMessageAt: data.lastMessageAt ?? null,
    unreadCount: me ? Number(unreadByUser[me]) || 0 : 0,
  }
}

/**
 * @param {MuhabereConversationSummary[]} summaries
 * @param {string} currentUid
 */
export function indexConversationSummaries(summaries, currentUid) {
  /** @type {Record<string, MuhabereConversationSummary>} */
  const byChannelId = {}
  /** @type {Record<string, MuhabereConversationSummary>} */
  const byPeerUid = {}
  /** @type {Record<string, number>} */
  const channelUnreadById = {}
  /** @type {Record<string, number>} */
  const dmUnreadByPeerId = {}

  for (const row of summaries) {
    if (row.type === 'channel') {
      byChannelId[row.refId] = row
      if (row.unreadCount > 0) channelUnreadById[row.refId] = row.unreadCount
    } else if (row.peerUid) {
      byPeerUid[row.peerUid] = row
      if (row.unreadCount > 0) dmUnreadByPeerId[row.peerUid] = row.unreadCount
    }
  }

  const totalUnread = summaries.reduce((sum, row) => sum + (row.unreadCount || 0), 0)

  const latest = [...summaries]
    .filter((row) => row.lastMessage)
    .sort((a, b) => {
      const ta = typeof a.lastMessageAt?.toMillis === 'function' ? a.lastMessageAt.toMillis() : 0
      const tb = typeof b.lastMessageAt?.toMillis === 'function' ? b.lastMessageAt.toMillis() : 0
      return tb - ta
    })[0]

  return {
    byChannelId,
    byPeerUid,
    channelUnreadById,
    dmUnreadByPeerId,
    totalUnread,
    latest,
    currentUid,
  }
}
