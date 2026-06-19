import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import MuhabereMessageRow from './MuhabereMessageRow'
import { emitFirebaseError } from '../../lib/firebaseErrorBus'
import { timestampToMs } from '../../lib/firestoreSnapshot'
import {
  fetchOlderConversationMessages,
  filterVisibleMuhabereMessages,
  markChatMessagesAsRead,
  markConversationAsRead,
  markMuhabereChannelAsRead,
  subscribeActiveConversationMessages,
} from '../../lib/firestoreTaktikMuhabere'

/** @typedef {import('../../lib/firestoreTaktikMuhabere').MuhabereMessage} MuhabereMessage */

/**
 * Aktif konuşma penceresi — yalnızca odaklanılan oda için onSnapshot + sayfalı geçmiş.
 * @param {{
 *   uid: string
 *   mode: 'channel' | 'dm' | null
 *   refId: string
 *   chatId?: string
 *   channelId?: string
 *   peerTyping?: boolean
 *   peerCallsign?: string
 *   burnGhosts?: Record<string, MuhabereMessage>
 *   hiddenMessageIds?: Set<string>
 *   onBurnDestroyed?: (msg: MuhabereMessage) => void
 *   onHideMessage?: (messageId: string) => void
 *   hidingMessageId?: string | null
 *   header: import('react').ReactNode
 *   footer: import('react').ReactNode
 *   onMessagesError?: (message: string | null) => void
 * }} props
 */
export default function ChatWindow({
  uid,
  mode,
  refId,
  chatId = '',
  channelId = '',
  peerTyping = false,
  peerCallsign = 'OPERATÖR',
  burnGhosts = {},
  hiddenMessageIds = new Set(),
  onBurnDestroyed,
  onHideMessage,
  hidingMessageId = null,
  header,
  footer,
  onMessagesError,
}) {
  const scrollRef = useRef(/** @type {HTMLDivElement | null} */ (null))
  const contentRef = useRef(/** @type {HTMLDivElement | null} */ (null))
  const loadMoreRef = useRef(/** @type {HTMLDivElement | null} */ (null))
  const oldestDocRef = useRef(/** @type {import('firebase/firestore').QueryDocumentSnapshot | null} */ (null))
  const hasMoreRef = useRef(false)
  const loadingOlderRef = useRef(false)
  const prependAnchorRef = useRef(/** @type {{ height: number; top: number } | null} */ (null))
  const initialScrollDoneRef = useRef(false)
  const stickToBottomRef = useRef(true)

  const [liveMessages, setLiveMessages] = useState(/** @type {MuhabereMessage[]} */ ([]))
  const [olderMessages, setOlderMessages] = useState(/** @type {MuhabereMessage[]} */ ([]))
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [messagesError, setMessagesError] = useState(/** @type {string | null} */ (null))
  const [hasMoreOlder, setHasMoreOlder] = useState(false)

  const threadId = refId

  const displayMessages = useMemo(() => {
    const merged = new Map(olderMessages.map((m) => [m.id, m]))
    for (const msg of liveMessages) merged.set(msg.id, msg)
    for (const ghost of Object.values(burnGhosts)) {
      if (!ghost?.id) continue
      if (!merged.has(ghost.id)) merged.set(ghost.id, ghost)
    }
    const sorted = [...merged.values()].sort(
      (a, b) => timestampToMs(a.timestamp) - timestampToMs(b.timestamp),
    )
    return filterVisibleMuhabereMessages(sorted, hiddenMessageIds)
  }, [liveMessages, olderMessages, burnGhosts, hiddenMessageIds])

  const setError = useCallback(
    (/** @type {string | null} */ message) => {
      setMessagesError(message)
      onMessagesError?.(message)
    },
    [onMessagesError],
  )

  const isNearBottom = useCallback(() => {
    const el = scrollRef.current
    if (!el) return true
    return el.scrollHeight - el.scrollTop - el.clientHeight < 280
  }, [])

  const scrollToBottom = useCallback((/** @type {ScrollBehavior} */ behavior = 'auto') => {
    const el = scrollRef.current
    if (!el) return
    const top = el.scrollHeight
    if (behavior === 'smooth') {
      el.scrollTo({ top, behavior: 'smooth' })
    } else {
      el.scrollTop = top
    }
  }, [])

  const scheduleScrollToBottom = useCallback(
    (/** @type {ScrollBehavior} */ behavior = 'auto') => {
      scrollToBottom(behavior)
      requestAnimationFrame(() => scrollToBottom('auto'))
      window.setTimeout(() => scrollToBottom('auto'), 60)
      window.setTimeout(() => scrollToBottom('auto'), 180)
      window.setTimeout(() => scrollToBottom('auto'), 450)
      window.setTimeout(() => scrollToBottom('auto'), 900)
    },
    [scrollToBottom],
  )

  const handleMessageMediaLoaded = useCallback(() => {
    if (stickToBottomRef.current) scheduleScrollToBottom('auto')
  }, [scheduleScrollToBottom])

  const loadOlderPage = useCallback(async () => {
    if (!mode || !refId || !oldestDocRef.current || !hasMoreRef.current || loadingOlderRef.current) {
      return
    }

    loadingOlderRef.current = true
    setLoadingOlder(true)

    const el = scrollRef.current
    if (el) {
      prependAnchorRef.current = { height: el.scrollHeight, top: el.scrollTop }
    }

    try {
      const page = await fetchOlderConversationMessages({
        mode,
        refId,
        startAfterDoc: oldestDocRef.current,
      })

      oldestDocRef.current = page.oldestDoc
      hasMoreRef.current = page.hasMore
      setHasMoreOlder(page.hasMore)

      if (page.messages.length > 0) {
        setOlderMessages((prev) => {
          const ids = new Set(prev.map((m) => m.id))
          return [...page.messages.filter((m) => !ids.has(m.id)), ...prev]
        })
      }
    } catch (err) {
      emitFirebaseError(err)
      setError(err instanceof Error ? err.message : 'Eski mesajlar yüklenemedi.')
    } finally {
      loadingOlderRef.current = false
      setLoadingOlder(false)
    }
  }, [mode, refId, setError])

  useEffect(() => {
    if (!uid || !mode || !refId) {
      setLiveMessages([])
      setOlderMessages([])
      setMessagesLoading(false)
      setHasMoreOlder(false)
      oldestDocRef.current = null
      hasMoreRef.current = false
      initialScrollDoneRef.current = false
      stickToBottomRef.current = true
      setError(null)
      return undefined
    }

    let active = true
    setLiveMessages([])
    setOlderMessages([])
    setMessagesLoading(true)
    setHasMoreOlder(false)
    oldestDocRef.current = null
    hasMoreRef.current = false
    initialScrollDoneRef.current = false
    stickToBottomRef.current = true
    setError(null)

    if (mode === 'channel' && channelId) {
      markMuhabereChannelAsRead(uid, channelId, Date.now())
    } else if (mode === 'dm' && chatId) {
      void markChatMessagesAsRead(chatId, uid)
      void markConversationAsRead(uid, 'dm', chatId)
    }

    const unsub = subscribeActiveConversationMessages({
      mode,
      refId,
      onData: (payload) => {
        if (!active) return
        setLiveMessages(payload.messages)
        oldestDocRef.current = payload.oldestDoc
        hasMoreRef.current = payload.hasMore
        setHasMoreOlder(payload.hasMore)
        setMessagesLoading(false)
      },
      onError: (err) => {
        if (!active) return
        emitFirebaseError(err)
        setError(err instanceof Error ? err.message : 'Mesaj kanalı kesildi.')
        setMessagesLoading(false)
      },
    })

    return () => {
      active = false
      unsub()
    }
  }, [uid, mode, refId, channelId, chatId, setError])

  useEffect(() => {
    if (!uid || mode !== 'dm' || !chatId || liveMessages.length === 0) return

    const hasIncomingUnread = liveMessages.some(
      (m) => m.receiverId === uid && m.status !== 'read',
    )
    if (!hasIncomingUnread) return

    void markChatMessagesAsRead(chatId, uid)
    void markConversationAsRead(uid, 'dm', chatId)
  }, [liveMessages, uid, mode, chatId])

  useEffect(() => {
    const anchor = prependAnchorRef.current
    const el = scrollRef.current
    if (anchor && el) {
      const delta = el.scrollHeight - anchor.height
      el.scrollTop = anchor.top + delta
      prependAnchorRef.current = null
      return
    }

    if (displayMessages.length === 0) return

    if (!initialScrollDoneRef.current) {
      initialScrollDoneRef.current = true
      scheduleScrollToBottom('auto')
      return
    }

    const lastMsg = displayMessages[displayMessages.length - 1]
    const ownOutgoing = lastMsg?.senderId === uid

    if (ownOutgoing) {
      stickToBottomRef.current = true
      scheduleScrollToBottom('auto')
      return
    }

    if (stickToBottomRef.current || isNearBottom()) {
      stickToBottomRef.current = true
      scheduleScrollToBottom('smooth')
    }
  }, [displayMessages, uid, isNearBottom, scheduleScrollToBottom])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return undefined

    const onScroll = () => {
      stickToBottomRef.current = isNearBottom()
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [threadId, isNearBottom])

  useEffect(() => {
    const content = contentRef.current
    if (!content) return undefined

    const observer = new ResizeObserver(() => {
      if (stickToBottomRef.current) scrollToBottom('auto')
    })
    observer.observe(content)
    return () => observer.disconnect()
  }, [threadId, scrollToBottom])

  useEffect(() => {
    const sentinel = loadMoreRef.current
    const root = scrollRef.current
    if (!sentinel || !root || !mode || !refId) return undefined

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void loadOlderPage()
        }
      },
      { root, rootMargin: '80px', threshold: 0 },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [loadOlderPage, mode, refId])

  return (
    <>
      {header}

      <div
        ref={scrollRef}
        className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4"
      >
        <div ref={contentRef} className="flex flex-col gap-3">
        <div ref={loadMoreRef} className="flex min-h-[1px] shrink-0 items-center justify-center py-1">
          {loadingOlder ? (
            <span className="inline-flex items-center gap-2 text-[10px] text-zinc-500">
              <Loader2 className="size-3 animate-spin" aria-hidden />
              Eski mesajlar yükleniyor…
            </span>
          ) : hasMoreOlder ? (
            <span className="text-[10px] text-zinc-600">↑ Daha eski iletiler</span>
          ) : null}
        </div>

        {messagesLoading && displayMessages.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-12 text-zinc-500">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            <span className="text-xs">Mesajlar yükleniyor…</span>
          </div>
        ) : displayMessages.length === 0 ? (
          <p className="py-12 text-center text-xs text-zinc-600">
            Henüz mesaj yok — ilk iletimi gönderin.
          </p>
        ) : (
          displayMessages.map((msg) => (
            <MuhabereMessageRow
              key={msg.id}
              msg={msg}
              uid={uid}
              chatId={threadId}
              onBurnDestroyed={onBurnDestroyed}
              onHideMessage={onHideMessage}
              hideBusy={hidingMessageId === msg.id}
              onMediaLoaded={handleMessageMediaLoaded}
            />
          ))
        )}

        {mode === 'dm' && peerTyping ? (
          <p className="animate-pulse font-mono text-xs text-lime-500">
            [ {peerCallsign.toUpperCase()} VERİ GİRİYOR... ]
          </p>
        ) : null}

        {messagesError ? (
          <p className="text-center text-xs text-red-400/90">{messagesError}</p>
        ) : null}
        </div>
      </div>

      {footer}
    </>
  )
}
