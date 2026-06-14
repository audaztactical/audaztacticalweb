/* eslint-disable react-refresh/only-export-components -- provider + hook */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import TaktikMuhabereFloatingWidget from '../components/muhabere/TaktikMuhabereFloatingWidget'
import TaktikMuhabereToastStack from '../components/muhabere/TaktikMuhabereToast'
import { emitFirebaseError } from '../lib/firebaseErrorBus'
import { doc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import {
  buildChatId,
  fetchMuhabereContacts,
  fetchRecentChatMessages,
  subscribeChatMessageEvents,
  subscribeChatMessages,
  subscribePendingContactRequestCount,
  subscribeUnreadMessageCount,
  subscribeUserChannelUnreadCounts,
  markMuhabereChannelAsRead,
} from '../lib/firestoreTaktikMuhabere'
import { safeOnSnapshot } from '../lib/firestoreSnapshot'
import { playMuhabereTacticalPing } from '../lib/muhabereTacticalPing'

/** @typedef {import('../lib/firestoreTaktikMuhabere').MuhabereMessage} MuhabereMessage */

/** @typedef {{
 *   id: string
 *   senderCallsign: string
 *   preview: string
 *   senderId: string
 *   kind?: 'message' | 'system'
 * }} MuhabereToastItem */

/** @typedef {{
 *   open: boolean
 *   peerUid: string
 *   chatId: string
 *   callsign: string
 *   messages: MuhabereMessage[]
 * }} FloatingChatState */

/** @typedef {(message: MuhabereMessage) => void} MuhabereIncomingListener */

/** @type {React.Context<{
 *   totalNotifications: number
 *   unreadMessageCount: number
 *   unreadChannelMessageCount: number
 *   channelUnreadById: Record<string, number>
 *   hasAnyChannelUnread: boolean
 *   markChannelAsRead: (channelId: string) => void
 *   pendingRequestCount: number
 *   setActivePeerUid: (uid: string | null) => void
 *   registerIncomingListener: (fn: MuhabereIncomingListener) => () => void
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
 * @param {{ children: import('react').ReactNode }} props
 */
export function MuhabereNotifyProvider({ children }) {
  const { user } = useAuth()
  const uid = user?.uid ?? ''
  const location = useLocation()

  const [toasts, setToasts] = useState(/** @type {MuhabereToastItem[]} */ ([]))
  const [unreadMessageCount, setUnreadMessageCount] = useState(0)
  const [channelUnreadById, setChannelUnreadById] = useState(/** @type {Record<string, number>} */ ({}))
  const [pendingRequestCount, setPendingRequestCount] = useState(0)
  const [floatingChat, setFloatingChat] = useState(EMPTY_FLOATING)

  const activePeerRef = useRef(/** @type {string | null} */ (null))
  const pathnameRef = useRef(location.pathname)
  const callsignByUidRef = useRef(/** @type {Record<string, string>} */ ({}))
  const incomingListenersRef = useRef(/** @type {Set<MuhabereIncomingListener>} */ (new Set()))
  const optimisticChannelReadMsRef = useRef(/** @type {Record<string, number>} */ ({}))

  pathnameRef.current = location.pathname

  const unreadChannelMessageCount = useMemo(
    () => Object.values(channelUnreadById).reduce((sum, n) => sum + n, 0),
    [channelUnreadById],
  )
  const hasAnyChannelUnread = unreadChannelMessageCount > 0
  const totalNotifications = unreadMessageCount + pendingRequestCount + unreadChannelMessageCount

  const registerIncomingListener = useCallback((/** @type {MuhabereIncomingListener} */ fn) => {
    incomingListenersRef.current.add(fn)
    return () => {
      incomingListenersRef.current.delete(fn)
    }
  }, [])

  const setActivePeerUid = useCallback((/** @type {string | null} */ peerUid) => {
    activePeerRef.current = peerUid ? String(peerUid) : null
  }, [])

  const markChannelAsRead = useCallback(
    (/** @type {string} */ channelId) => {
      const cid = String(channelId ?? '').trim()
      if (!uid || !cid) return

      const readAtMs = Date.now()
      optimisticChannelReadMsRef.current[cid] = readAtMs

      setChannelUnreadById((prev) => {
        if (!prev[cid]) return prev
        const next = { ...prev }
        delete next[cid]
        return next
      })

      void markMuhabereChannelAsRead(uid, cid, readAtMs)
    },
    [uid],
  )

  const dismissToast = useCallback((/** @type {string} */ id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const pushToast = useCallback(
    (/** @type {{ senderId: string; text: string }} */ { senderId, text }) => {
      const callsign = callsignByUidRef.current[senderId] ?? senderId.slice(0, 8)
      const item = /** @type {MuhabereToastItem} */ ({
        id: `toast-${Date.now()}-${senderId}`,
        senderCallsign: callsign.toUpperCase(),
        preview: previewText(text),
        senderId,
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
    setFloatingChat(EMPTY_FLOATING)
  }, [])

  const openFloatingFromMessage = useCallback(
    async (/** @type {MuhabereMessage} */ message) => {
      if (!uid) return
      const peerUid = message.senderId
      const chatId = message.chatId || buildChatId(uid, peerUid)
      if (!chatId) return

      const callsign = callsignByUidRef.current[peerUid] ?? peerUid.slice(0, 8)
      let messages = /** @type {MuhabereMessage[]} */ ([])
      try {
        messages = await fetchRecentChatMessages(chatId, 8)
      } catch {
        messages = [message]
      }

      setFloatingChat({
        open: true,
        peerUid,
        chatId,
        callsign,
        messages,
      })
    },
    [uid],
  )

  const handleIncoming = useCallback(
    (/** @type {MuhabereMessage} */ message) => {
      if (!uid || message.senderId === uid) return

      for (const fn of incomingListenersRef.current) {
        try {
          fn(message)
        } catch {
          /* listener hatası UI'ı kesmesin */
        }
      }

      const onMesajlar = pathnameRef.current === '/mesajlar'
      const viewingSender = activePeerRef.current === message.senderId
      if (onMesajlar && viewingSender) return

      if (!onMesajlar) {
        void openFloatingFromMessage(message)
        playMuhabereTacticalPing()
        return
      }

      pushToast({ senderId: message.senderId, text: message.text })
    },
    [uid, pushToast, openFloatingFromMessage],
  )

  useEffect(() => {
    if (!uid || !db) {
      setUnreadMessageCount(0)
      setPendingRequestCount(0)
      setChannelUnreadById({})
      return undefined
    }

    const unsubUnread = subscribeUnreadMessageCount(uid, setUnreadMessageCount, (err) =>
      emitFirebaseError(err),
    )
    const unsubPending = subscribePendingContactRequestCount(uid, setPendingRequestCount, (err) =>
      emitFirebaseError(err),
    )
    const unsubChannels = subscribeUserChannelUnreadCounts(
      uid,
      setChannelUnreadById,
      (err) => emitFirebaseError(err),
      {
        getExtraReadMs: (channelId) => optimisticChannelReadMsRef.current[channelId] ?? 0,
      },
    )

    return () => {
      unsubUnread()
      unsubPending()
      unsubChannels()
    }
  }, [uid])

  useEffect(() => {
    if (!floatingChat.open || !floatingChat.chatId || !uid) return undefined

    const unsub = subscribeChatMessages(
      floatingChat.chatId,
      (rows) => {
        setFloatingChat((prev) => (prev.open ? { ...prev, messages: rows } : prev))
      },
      (err) => emitFirebaseError(err),
      { currentUid: uid },
    )

    return () => unsub()
  }, [floatingChat.open, floatingChat.chatId, uid])

  useEffect(() => {
    if (!uid || !db) {
      callsignByUidRef.current = {}
      return undefined
    }

    let active = true
    /** @type {(() => void)[]} */
    const chatUnsubs = []

    const wireChats = async () => {
      chatUnsubs.forEach((fn) => fn())
      chatUnsubs.length = 0
      if (!active) return

      try {
        const contacts = await fetchMuhabereContacts(uid)
        if (!active) return

        const map = /** @type {Record<string, string>} */ ({})
        for (const c of contacts) {
          map[c.uid] = c.callsign
        }
        callsignByUidRef.current = map

        for (const contact of contacts) {
          const chatId = buildChatId(uid, contact.uid)
          if (!chatId) continue

          const unsub = subscribeChatMessageEvents(
            chatId,
            uid,
            (msg) => handleIncoming(msg),
            (err) => emitFirebaseError(err),
          )
          chatUnsubs.push(unsub)
        }
      } catch (err) {
        if (active) emitFirebaseError(err)
      }
    }

    void wireChats()

    const userUnsub = safeOnSnapshot(doc(db, 'users', uid), () => {
      void wireChats()
    })

    return () => {
      active = false
      userUnsub()
      chatUnsubs.forEach((fn) => fn())
    }
  }, [uid, handleIncoming])

  const contextValue = useMemo(
    () => ({
      totalNotifications,
      unreadMessageCount,
      unreadChannelMessageCount,
      channelUnreadById,
      hasAnyChannelUnread,
      markChannelAsRead,
      pendingRequestCount,
      setActivePeerUid,
      registerIncomingListener,
      pushSystemToast,
      floatingChat,
      closeFloatingChat,
    }),
    [
      totalNotifications,
      unreadMessageCount,
      unreadChannelMessageCount,
      channelUnreadById,
      hasAnyChannelUnread,
      markChannelAsRead,
      pendingRequestCount,
      setActivePeerUid,
      registerIncomingListener,
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
