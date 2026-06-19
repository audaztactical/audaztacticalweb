/** Sunucu tarafı syncMuhabereChannelSummary ile yazılan özet belgesi. */
export const MUHABERE_SUMMARY_DOC_ID = 'latest'

/** @typedef {{
 *   channelId: string
 *   channelName: string
 *   lastMessage: string
 *   senderName: string
 *   senderId: string
 *   messageId: string
 *   timestamp: unknown
 *   unreadCount: number
 * }} MuhabereChannelSummaryEntry */

/** @typedef {{
 *   lastMessage: string
 *   senderName: string
 *   senderId: string
 *   latestChannelId: string
 *   latestChannelName: string
 *   latestMessageId: string
 *   timestamp: unknown
 *   totalChannelUnread: number
 *   channelUnreadById: Record<string, number>
 *   channelPreviewsById: Record<string, MuhabereChannelSummaryEntry>
 * }} ParsedMuhabereSummary */

const EMPTY_SUMMARY = /** @type {ParsedMuhabereSummary} */ ({
  lastMessage: '',
  senderName: '',
  senderId: '',
  latestChannelId: '',
  latestChannelName: '',
  latestMessageId: '',
  timestamp: null,
  totalChannelUnread: 0,
  channelUnreadById: {},
  channelPreviewsById: {},
})

/**
 * @param {unknown} raw
 * @param {{ optimisticReadChannelIds?: Set<string> }} [options]
 * @returns {ParsedMuhabereSummary}
 */
export function parseMuhabereSummary(raw, options = {}) {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_SUMMARY }

  const data = /** @type {Record<string, unknown>} */ (raw)
  const optimisticRead = options.optimisticReadChannelIds ?? new Set()

  /** @type {Record<string, number>} */
  const channelUnreadById = {}
  /** @type {Record<string, MuhabereChannelSummaryEntry>} */
  const channelPreviewsById = {}

  const channelsRaw = data.channels
  if (channelsRaw && typeof channelsRaw === 'object' && !Array.isArray(channelsRaw)) {
    for (const [channelId, entryRaw] of Object.entries(
      /** @type {Record<string, unknown>} */ (channelsRaw),
    )) {
      if (!entryRaw || typeof entryRaw !== 'object') continue
      const entry = /** @type {Record<string, unknown>} */ (entryRaw)
      const unreadCount = optimisticRead.has(channelId)
        ? 0
        : Number(entry.unreadCount) || 0

      const preview = {
        channelId,
        channelName: String(entry.channelName ?? 'KANAL'),
        lastMessage: String(entry.lastMessage ?? ''),
        senderName: String(entry.senderName ?? ''),
        senderId: String(entry.senderId ?? ''),
        messageId: String(entry.messageId ?? ''),
        timestamp: entry.timestamp ?? null,
        unreadCount,
      }

      channelPreviewsById[channelId] = preview
      if (unreadCount > 0) channelUnreadById[channelId] = unreadCount
    }
  }

  const totalFromChannels = Object.values(channelUnreadById).reduce((sum, n) => sum + n, 0)
  const totalChannelUnread =
    totalFromChannels > 0 ? totalFromChannels : Number(data.totalChannelUnread) || 0

  return {
    lastMessage: String(data.lastMessage ?? ''),
    senderName: String(data.senderName ?? ''),
    senderId: String(data.senderId ?? ''),
    latestChannelId: String(data.latestChannelId ?? ''),
    latestChannelName: String(data.latestChannelName ?? ''),
    latestMessageId: String(data.latestMessageId ?? ''),
    timestamp: data.timestamp ?? null,
    totalChannelUnread,
    channelUnreadById,
    channelPreviewsById,
  }
}
