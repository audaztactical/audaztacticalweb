/* eslint-disable react-refresh/only-export-components -- provider + hook */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import TaktikMuhabereFloatingWidget from '../components/muhabere/TaktikMuhabereFloatingWidget'
import TaktikMuhabereToastStack from '../components/muhabere/TaktikMuhabereToast'
import { emitFirebaseError } from '../lib/firebaseErrorBus'
import { indexConversationSummaries } from '../lib/muhabereConversation'
import {
  buildChatId,
  markChatMessagesAsRead,
  markConversationAsRead,
  markMuhabereChannelAsRead,
  subscribeConversationSummaries,
  subscribePendingContactRequestCount,
  subscribeUnreadMessageCount,
} from '../lib/firestoreTaktikMuhabere'
import { playMuhabereTacticalPing } from '../lib/muhabereTacticalPing'

/** @typedef {import('../lib/muhabereConversation').MuhabereConversationSummary} MuhabereConversationSummary */

/** @typedef {{
 *   id: string
 *   senderCallsign: string
 *   preview: string
 *   senderId: string
 *   channelId?: string
 *   kind?: 'message' | 'system'
 * }} MuhabereToastItem */

/** @typedef {{
 *   open: boolean
 *   peerUid: string
 *   chatId: string
 *   callsign: string
 *   messages: never[]
 * }} FloatingChatState */

/** @type {React.Context<{
 *   totalNotifications: number
 *   unreadMessageCount: number
 *   unreadMuhabereMessagesTotal: number
 *   sidebarMuhabereBadgeCount: number
 *   unreadChannelMessageCount: number
 *   channelUnreadById: Record<string, number>
 *   channelPreviewsById: Record<string, {
 *     channelId: string
 *     channelName: string
 *     lastMessage: string
 *     senderName: string
 *     senderId: string
 *     messageId: string
 *     timestamp: unknown
 *     unreadCount: number
 *   }>
 *   latestChannelPreview: {
 *     lastMessage: string
 *     senderName: string
 *     channelId: string
 *     channelName: string
 *   } | null
 *   hasAnyChannelUnread: boolean
 *   summaryLoading: boolean
 *   markChannelAsRead: (channelId: string) => void
 *   markDmPeerAsRead: (peerUid: string) => void
 *   pendingRequestCount: number
 *   setActivePeerUid: (uid: string | null) => void
 *   setActiveChannelId: (channelId: string | null) => void
 *   pushSystemToast: (message: string) => void
 *   floatingChat: FloatingChatState
 *   closeFloatingChat: () => void
 * } | null>} */
const MuhabereNotifyContext = createContext(null)

const MAX_TOASTS = 4

const EMPTY_FLOATING = /** @type {FloatingChatState} */ ({
  open: false,
  peerUid: '',
  chatId: '',
  callsign: '',
  messages: [],
})

/**
 * @param {string} text
 * @param {number} maxLen
 */
function previewText(text, maxLen = 20) {
  const t = String(text ?? '').trim()
  if (t.length <= maxLen) return t
  return `${t.slice(0, maxLen)}…`
}

/**
 * @param {string} uid
 */
function notifyStorageKey(uid) {
  return `audaz_muhabere_last_notify_${uid}`
}

/**
 * @param {MuhabereConversationSummary} latest
 */
function buildLatestMessageKey(latest) {
  const atMs =
    latest.lastMessageAt && typeof latest.lastMessageAt.toMillis === 'function'
      ? latest.lastMessageAt.toMillis()
      : 0
  return `${latest.type}:${latest.refId}:${atMs || latest.lastMessage}`
}

/**
 * @param {string} uid
 * @param {string} key
 */
function persistLastNotified(uid, key) {
  try {
    sessionStorage.setItem(notifyStorageKey(uid), key)
  } catch {
    /* ignore */
  }
}

/**
 * @param {string} uid
 */
function readPersistedLastNotified(uid) {
  try {
    return sessionStorage.getItem(notifyStorageKey(uid)) ?? ''
  } catch {
    return ''
  }
}

/**
 * @param {MuhabereConversationSummary} summary
 */
function toChannelPreview(summary) {
  return {
    channelId: summary.refId,
    channelName: summary.name,
    lastMessage: summary.lastMessage,
    senderName: summary.lastSender,
    senderId: summary.lastSenderId,
    messageId: summary.id,
    timestamp: summary.lastMessageAt,
    unreadCount: summary.unreadCount,
  }
}

/**
 * @param {{ children: import('react').ReactNode }} props
 */
export function MuhabereNotifyProvider({ children }) {
  const { user } = useAuth()
  const uid = user?.uid ?? ''
  const location = useLocation()

  const [summaries, setSummaries] = useState(/** @type {MuhabereConversationSummary[]} */ ([]))
  const [summaryLoading, setSummaryLoading] = useState(true)

  const [toasts, setToasts] = useState(/** @type {MuhabereToastItem[]} */ ([]))
  const [pendingRequestCount, setPendingRequestCount] = useState(0)
  const [directDmUnreadCount, setDirectDmUnreadCount] = useState(0)
  const [floatingChat] = useState(EMPTY_FLOATING)
  const [optimisticReadTick, setOptimisticReadTick] = useState(0)

  const activePeerRef = useRef(/** @type {string | null} */ (null))
  const activeChannelRef = useRef(/** @type {string | null} */ (null))
  const pathnameRef = useRef(location.pathname)
  const optimisticReadChannelsRef = useRef(/** @type {Set<string>} */ (new Set()))
  const optimisticReadPeersRef = useRef(/** @type {Set<string>} */ (new Set()))
  const lastNotifiedMessageIdRef = useRef('')
  const summariesBootstrappedRef = useRef(false)

  pathnameRef.current = location.pathname

  useEffect(() => {
    if (!uid) {
      lastNotifiedMessageIdRef.current = ''
      summariesBootstrappedRef.current = false
      optimisticReadChannelsRef.current.clear()
      optimisticReadPeersRef.current.clear()
      return
    }
    lastNotifiedMessageIdRef.current = readPersistedLastNotified(uid)
    summariesBootstrappedRef.current = false
  }, [uid])

  const parsedSummary = useMemo(() => {
    const indexed = indexConversationSummaries(summaries, uid)
    /** @type {Record<string, ReturnType<typeof toChannelPreview>>} */
    const channelPreviewsById = {}
    /** @type {Record<string, number>} */
    const channelUnreadById = { ...indexed.channelUnreadById }

    /** @type {Record<string, number>} */
    const dmUnreadByPeerId = { ...indexed.dmUnreadByPeerId }

    for (const [channelId, row] of Object.entries(indexed.byChannelId)) {
      if (optimisticReadChannelsRef.current.has(channelId)) {
        channelUnreadById[channelId] = 0
      }
      channelPreviewsById[channelId] = {
        ...toChannelPreview(row),
        unreadCount: optimisticReadChannelsRef.current.has(channelId) ? 0 : row.unreadCount,
      }
    }

    for (const peerUid of optimisticReadPeersRef.current) {
      dmUnreadByPeerId[peerUid] = 0
    }

    const channelUnreadTotal = Object.values(channelUnreadById).reduce((sum, n) => sum + n, 0)
    const dmUnreadTotal = Object.values(dmUnreadByPeerId).reduce((sum, n) => sum + n, 0)
    const latest = indexed.latest

    return {
      channelPreviewsById,
      channelUnreadById,
      dmUnreadByPeerId,
      unreadChannelMessageCount: channelUnreadTotal,
      unreadDmMessageCount: dmUnreadTotal,
      latest,
    }
  }, [summaries, uid, optimisticReadTick])

  const {
    channelUnreadById,
    channelPreviewsById,
    dmUnreadByPeerId,
    unreadChannelMessageCount,
    unreadDmMessageCount,
    latest,
  } = parsedSummary

  const unreadMessageCount =
    unreadDmMessageCount > 0
      ? unreadDmMessageCount
      : optimisticReadPeersRef.current.size > 0
        ? 0
        : directDmUnreadCount
  const unreadMuhabereMessagesTotal = unreadChannelMessageCount + unreadMessageCount
  const onMesajlarPage = location.pathname === '/mesajlar'
  const sidebarMuhabereBadgeCount = onMesajlarPage ? 0 : unreadMuhabereMessagesTotal
  const hasAnyChannelUnread = unreadChannelMessageCount > 0
  const totalNotifications = unreadMuhabereMessagesTotal + pendingRequestCount

  const latestChannelPreview = useMemo(() => {
    if (!latest || latest.type !== 'channel' || !latest.lastMessage) return null
    return {
      channelId: latest.refId,
      channelName: latest.name || 'KANAL',
      lastMessage: latest.lastMessage,
      senderName: latest.lastSender,
    }
  }, [latest])

  const setActivePeerUid = useCallback((/** @type {string | null} */ peerUid) => {
    activePeerRef.current = peerUid ? String(peerUid) : null
  }, [])

  const setActiveChannelId = useCallback((/** @type {string | null} */ channelId) => {
    activeChannelRef.current = channelId ? String(channelId) : null
  }, [])

  const markChannelAsRead = useCallback(
    (/** @type {string} */ channelId) => {
      const cid = String(channelId ?? '').trim()
      if (!uid || !cid) return

      optimisticReadChannelsRef.current.add(cid)
      setOptimisticReadTick((n) => n + 1)
      void markMuhabereChannelAsRead(uid, cid, Date.now())
    },
    [uid],
  )

  const markDmPeerAsRead = useCallback(
    (/** @type {string} */ peerUid) => {
      const peer = String(peerUid ?? '').trim()
      if (!uid || !peer) return

      const chatId = buildChatId(uid, peer)
      if (!chatId) return

      optimisticReadPeersRef.current.add(peer)
      setOptimisticReadTick((n) => n + 1)
      void markChatMessagesAsRead(chatId, uid)
      void markConversationAsRead(uid, 'dm', chatId)
    },
    [uid],
  )

  const dismissToast = useCallback((/** @type {string} */ id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const pushToast = useCallback(
    (/** @type {{ senderId: string; senderName?: string; text: string; channelId?: string }} */ {
      senderId,
      senderName: senderLabel,
      text,
      channelId,
    }) => {
      const callsign = String(senderLabel ?? senderId.slice(0, 8)).trim() || senderId.slice(0, 8)
      const item = /** @type {MuhabereToastItem} */ ({
        id: `toast-${Date.now()}-${senderId}-${channelId ?? 'dm'}`,
        senderCallsign: callsign.toUpperCase(),
        preview: previewText(text),
        senderId,
        channelId,
        kind: 'message',
      })
      setToasts((prev) => [item, ...prev].slice(0, MAX_TOASTS))
      playMuhabereTacticalPing()
    },
    [],
  )

  const pushSystemToast = useCallback((/** @type {string} */ message) => {
    const item = /** @type {MuhabereToastItem} */ ({
      id: `sys-${Date.now()}`,
      senderCallsign: '',
      preview: String(message ?? '').trim(),
      senderId: '',
      kind: 'system',
    })
    setToasts((prev) => [item, ...prev].slice(0, MAX_TOASTS))
  }, [])

  const closeFloatingChat = useCallback(() => {
    /* DM floating widget — gelecekte tekil özet ile yeniden açılabilir */
  }, [])

  useEffect(() => {
    if (!uid) {
      setSummaries([])
      setSummaryLoading(false)
      return undefined
    }

    setSummaryLoading(true)
    return subscribeConversationSummaries(
      uid,
      (rows) => {
        setSummaries(rows)
        setSummaryLoading(false)
      },
      (err) => {
        emitFirebaseError(err)
        setSummaryLoading(false)
      },
    )
  }, [uid])

  useEffect(() => {
    if (!uid) {
      setPendingRequestCount(0)
      return undefined
    }

    const unsubPending = subscribePendingContactRequestCount(uid, setPendingRequestCount, (err) =>
      emitFirebaseError(err),
    )

    return () => unsubPending()
  }, [uid])

  useEffect(() => {
    if (!uid) {
      setDirectDmUnreadCount(0)
      return undefined
    }

    return subscribeUnreadMessageCount(uid, setDirectDmUnreadCount, (err) => emitFirebaseError(err))
  }, [uid])

  useEffect(() => {
    if (!uid || summaryLoading) return

    if (!summariesBootstrappedRef.current) {
      summariesBootstrappedRef.current = true
      if (latest?.lastMessage && latest.lastSenderId && latest.lastSenderId !== uid) {
        const unreadForLatest =
          latest.type === 'channel'
            ? optimisticReadChannelsRef.current.has(latest.refId)
              ? 0
              : (channelUnreadById[latest.refId] ?? latest.unreadCount ?? 0)
            : latest.peerUid && optimisticReadPeersRef.current.has(latest.peerUid)
              ? 0
              : (dmUnreadByPeerId[latest.peerUid ?? ''] ?? latest.unreadCount ?? 0)

        if (unreadForLatest <= 0) {
          const messageKey = buildLatestMessageKey(latest)
          lastNotifiedMessageIdRef.current = messageKey
          persistLastNotified(uid, messageKey)
        }
      }
      return
    }

    if (!latest?.lastMessage || !latest.lastSenderId || latest.lastSenderId === uid) return

    const messageKey = buildLatestMessageKey(latest)
    if (lastNotifiedMessageIdRef.current === messageKey) return
    if (readPersistedLastNotified(uid) === messageKey) {
      lastNotifiedMessageIdRef.current = messageKey
      return
    }

    const unreadForLatest =
      latest.type === 'channel'
        ? optimisticReadChannelsRef.current.has(latest.refId)
          ? 0
          : (channelUnreadById[latest.refId] ?? latest.unreadCount ?? 0)
        : latest.peerUid && optimisticReadPeersRef.current.has(latest.peerUid)
          ? 0
          : (dmUnreadByPeerId[latest.peerUid ?? ''] ?? latest.unreadCount ?? 0)

    if (unreadForLatest <= 0) {
      lastNotifiedMessageIdRef.current = messageKey
      persistLastNotified(uid, messageKey)
      return
    }

    const onMesajlar = pathnameRef.current === '/mesajlar'
    const viewingChannel =
      onMesajlar &&
      latest.type === 'channel' &&
      activeChannelRef.current &&
      activeChannelRef.current === latest.refId
    const viewingDmPeer =
      onMesajlar &&
      latest.type === 'dm' &&
      activePeerRef.current &&
      latest.peerUid &&
      activePeerRef.current === latest.peerUid

    lastNotifiedMessageIdRef.current = messageKey
    persistLastNotified(uid, messageKey)

    if (viewingChannel || viewingDmPeer) return

    pushToast({
      senderId: latest.lastSenderId,
      senderName: latest.lastSender,
      text: latest.lastMessage,
      channelId: latest.type === 'channel' ? latest.refId : undefined,
    })
  }, [
    uid,
    summaryLoading,
    latest,
    pushToast,
    channelUnreadById,
    dmUnreadByPeerId,
  ])

  useEffect(() => {
    for (const channelId of [...optimisticReadChannelsRef.current]) {
      const unread = channelUnreadById[channelId] ?? 0
      if (unread === 0) optimisticReadChannelsRef.current.delete(channelId)
    }
    for (const peerUid of [...optimisticReadPeersRef.current]) {
      const unread = dmUnreadByPeerId[peerUid] ?? 0
      if (unread === 0) optimisticReadPeersRef.current.delete(peerUid)
    }
  }, [channelUnreadById, dmUnreadByPeerId])

  const contextValue = useMemo(
    () => ({
      totalNotifications,
      unreadMessageCount,
      unreadMuhabereMessagesTotal,
      sidebarMuhabereBadgeCount,
      unreadChannelMessageCount,
      channelUnreadById,
      channelPreviewsById,
      latestChannelPreview,
      hasAnyChannelUnread,
      summaryLoading,
      markChannelAsRead,
      markDmPeerAsRead,
      pendingRequestCount,
      setActivePeerUid,
      setActiveChannelId,
      pushSystemToast,
      floatingChat,
      closeFloatingChat,
    }),
    [
      totalNotifications,
      unreadMessageCount,
      unreadMuhabereMessagesTotal,
      sidebarMuhabereBadgeCount,
      unreadChannelMessageCount,
      channelUnreadById,
      channelPreviewsById,
      latestChannelPreview,
      hasAnyChannelUnread,
      summaryLoading,
      markChannelAsRead,
      markDmPeerAsRead,
      pendingRequestCount,
      setActivePeerUid,
      setActiveChannelId,
      pushSystemToast,
      floatingChat,
      closeFloatingChat,
    ],
  )

  return (
    <MuhabereNotifyContext.Provider value={contextValue}>
      {children}
      <TaktikMuhabereToastStack toasts={toasts} onDismiss={dismissToast} />
      {uid ? <TaktikMuhabereFloatingWidget uid={uid} /> : null}
    </MuhabereNotifyContext.Provider>
  )
}

export function useMuhabereNotify() {
  const ctx = useContext(MuhabereNotifyContext)
  if (!ctx) {
    throw new Error('useMuhabereNotify must be used within MuhabereNotifyProvider')
  }
  return ctx
}
