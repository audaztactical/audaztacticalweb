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
 *   updatedAt?: unknown
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
    updatedAt: data.updatedAt ?? null,
    unreadCount: me ? Number(unreadByUser[me]) || 0 : 0,
  }
}

/**
 * @param {unknown} value
 * @returns {number}
 */
export function resolveMuhabereTimestampMs(value) {
  if (value == null) return 0
  if (typeof value === 'object' && value !== null) {
    const obj = /** @type {{ toMillis?: () => number; seconds?: number; _seconds?: number }} */ (value)
    if (typeof obj.toMillis === 'function') return obj.toMillis()
    const sec = Number(obj.seconds ?? obj._seconds)
    if (Number.isFinite(sec)) return sec * 1000
  }
  if (value instanceof Date) return value.getTime()
  const n = Number(value)
  if (Number.isFinite(n)) return (n > 1e12 ? n : n * 1000)
  return 0
}

/**
 * @param {MuhabereConversationSummary | null | undefined} summary
 * @returns {number}
 */
export function getConversationSortMs(summary) {
  if (!summary) return 0

  const fromLastMessageAt = resolveMuhabereTimestampMs(summary.lastMessageAt)
  if (fromLastMessageAt > 0) return fromLastMessageAt

  const fromUpdatedAt = resolveMuhabereTimestampMs(summary.updatedAt)
  if (fromUpdatedAt > 0) return fromUpdatedAt

  const nested = summary.lastMessage
  if (nested && typeof nested === 'object') {
    return resolveMuhabereTimestampMs(/** @type {{ timestamp?: unknown }} */ (nested).timestamp)
  }

  return 0
}

/**
 * @param {string} uidA
 * @param {string} uidB
 */
export function buildDmChatId(uidA, uidB) {
  const a = String(uidA ?? '').trim()
  const b = String(uidB ?? '').trim()
  if (!a || !b || a === b) return ''
  return a < b ? `${a}_${b}` : `${b}_${a}`
}

/**
 * @param {ReturnType<typeof indexConversationSummaries> | null | undefined} index
 * @param {string} currentUid
 * @param {string} contactUid
 * @returns {MuhabereConversationSummary | null}
 */
export function resolveContactConversationSummary(index, currentUid, contactUid) {
  if (!index) return null
  const peer = String(contactUid ?? '').trim()
  if (!peer) return null

  const fromPeer = index.byPeerUid?.[peer]
  if (fromPeer) return fromPeer

  const chatId = buildDmChatId(currentUid, peer)
  if (chatId && index.byDmChatId?.[chatId]) return index.byDmChatId[chatId]

  return null
}

/**
 * @param {ReturnType<typeof indexConversationSummaries> | null | undefined} index
 * @param {string} channelId
 * @param {Record<string, number>} [contextChannelUnreadById]
 * @param {Record<string, number>} [liveChannelUnreadById]
 * @returns {number}
 */
export function resolveChannelUnreadCount(
  index,
  channelId,
  contextChannelUnreadById = {},
  liveChannelUnreadById = {},
) {
  const id = String(channelId ?? '').trim()
  if (!id) return 0

  const summary = index?.byChannelId?.[id]
  return Math.max(
    summary?.unreadCount ?? 0,
    index?.channelUnreadById?.[id] ?? 0,
    contextChannelUnreadById[id] ?? 0,
    liveChannelUnreadById[id] ?? 0,
  )
}

/**
 * @param {string | null | undefined} activeChannelId
 * @param {string} channelId
 */
export function isActiveChannelRow(activeChannelId, channelId) {
  const active = String(activeChannelId ?? '').trim()
  const id = String(channelId ?? '').trim()
  return active !== '' && active === id
}

/**
 * @param {{ id: string; name: string }}[] channels
 * @param {ReturnType<typeof indexConversationSummaries> | null | undefined} index
 */
export function sortMuhabereChannelsByRecency(channels, index) {
  const byChannelId = index?.byChannelId ?? {}
  return [...channels].sort((a, b) => {
    const msA = getConversationSortMs(byChannelId[a.id])
    const msB = getConversationSortMs(byChannelId[b.id])
    if (msB !== msA) return msB - msA
    return a.name.localeCompare(b.name, 'tr')
  })
}

/**
 * @param {{ uid: string; callsign: string }}[] contacts
 * @param {ReturnType<typeof indexConversationSummaries> | null | undefined} index
 * @param {string} currentUid
 */
export function sortMuhabereContactsByRecency(contacts, index, currentUid) {
  return [...contacts].sort((a, b) => {
    const msA = getConversationSortMs(resolveContactConversationSummary(index, currentUid, a.uid))
    const msB = getConversationSortMs(resolveContactConversationSummary(index, currentUid, b.uid))
    if (msB !== msA) return msB - msA
    return a.callsign.localeCompare(b.callsign, 'tr')
  })
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
  /** @type {Record<string, MuhabereConversationSummary>} */
  const byDmChatId = {}
  /** @type {Record<string, number>} */
  const channelUnreadById = {}
  /** @type {Record<string, number>} */
  const dmUnreadByPeerId = {}

  for (const row of summaries) {
    if (row.type === 'channel') {
      byChannelId[row.refId] = row
      if (row.unreadCount > 0) channelUnreadById[row.refId] = row.unreadCount
      continue
    }

    if (row.refId) byDmChatId[row.refId] = row

    const peerUid =
      row.peerUid ||
      row.members.find((memberUid) => memberUid && memberUid !== currentUid) ||
      ''

    if (peerUid) {
      byPeerUid[peerUid] = row
      if (row.unreadCount > 0) dmUnreadByPeerId[peerUid] = row.unreadCount
    }
  }

  const totalUnread = summaries.reduce((sum, row) => sum + (row.unreadCount || 0), 0)

  const latest = [...summaries]
    .filter((row) => row.lastMessage)
    .sort((a, b) => {
      const diff = getConversationSortMs(b) - getConversationSortMs(a)
      if (diff !== 0) return diff
      const ta = typeof a.lastMessageAt?.toMillis === 'function' ? a.lastMessageAt.toMillis() : 0
      const tb = typeof b.lastMessageAt?.toMillis === 'function' ? b.lastMessageAt.toMillis() : 0
      return tb - ta
    })[0]

  return {
    byChannelId,
    byPeerUid,
    byDmChatId,
    channelUnreadById,
    dmUnreadByPeerId,
    totalUnread,
    latest,
    currentUid,
  }
}
