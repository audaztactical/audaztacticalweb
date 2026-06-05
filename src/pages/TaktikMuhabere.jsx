import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ChevronRight, Flame, Loader2, Plus, Radio, Search, Shield, User, UserMinus, UserPlus } from 'lucide-react'
import CreateChannelModal from '../components/muhabere/CreateChannelModal'
import MuhabereAttachMenu from '../components/muhabere/MuhabereAttachMenu'
import MuhabereMessageRow from '../components/muhabere/MuhabereMessageRow'
import { useAuth } from '../context/AuthContext'
import OperatorSicilModal from '../components/muhabere/OperatorSicilModal'
import { useMuhabereNotify } from '../context/MuhabereNotifyContext'
import { emitFirebaseError } from '../lib/firebaseErrorBus'
import { timestampToMs } from '../lib/firestoreSnapshot'
import {
  acceptMuhabereContactRequest,
  buildChatId,
  fetchMuhabereContacts,
  markChatMessagesAsRead,
  setChatTypingStatus,
  muhabereRequestErrorMessage,
  rejectMuhabereContactRequest,
  removeMuhabereContact,
  searchMuhabereOperators,
  sendChannelMessage,
  sendChatMessage,
  sendMuhabereContactRequest,
  subscribeChannelMessages,
  subscribeChatMessages,
  subscribeChatTypingStatus,
  subscribeIncomingContactRequests,
  subscribeOutgoingPendingRequests,
  subscribeUserMuhabereChannels,
} from '../lib/firestoreTaktikMuhabere'

/** @typedef {import('../lib/firestoreTaktikMuhabere').MuhabereContact} MuhabereContact */
/** @typedef {import('../lib/firestoreTaktikMuhabere').MuhabereMessage} MuhabereMessage */
/** @typedef {import('../lib/firestoreTaktikMuhabere').MuhabereContactRequest} MuhabereContactRequest */
/** @typedef {import('../lib/firestoreTaktikMuhabere').MuhabereChannel} MuhabereChannel */

const SEARCH_DEBOUNCE_MS = 320

/**
 * @param {{
 *   callsign: string
 *   operatorUid: string
 *   onOpenProfile: (uid: string) => void
 *   className?: string
 * }} props
 */
function CallsignProfileTrigger({ callsign, operatorUid, onOpenProfile, className = '' }) {
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation()
        onOpenProfile(operatorUid)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          e.stopPropagation()
          onOpenProfile(operatorUid)
        }
      }}
      className={[
        'cursor-pointer truncate text-left text-sm font-semibold tracking-wide transition hover:text-lime-400 hover:underline',
        className,
      ].join(' ')}
    >
      {callsign}
    </span>
  )
}

/**
 * @param {{ registered?: boolean; signal?: boolean }} props
 */
function StatusDot({ registered = true, signal = false }) {
  return (
    <span className="relative mt-1.5 flex size-2.5 shrink-0 items-center justify-center" aria-hidden>
      {signal ? (
        <span className="absolute inline-flex size-3 animate-ping rounded-full bg-lime-400/40" />
      ) : null}
      <span
        className={[
          'relative size-2 rounded-full',
          registered ? 'bg-lime-500 shadow-[0_0_8px_rgba(132,204,22,0.75)]' : 'bg-zinc-600',
          signal ? 'ring-1 ring-lime-400/60' : '',
        ].join(' ')}
      />
    </span>
  )
}

export default function TaktikMuhabere() {
  const { user } = useAuth()
  const uid = user?.uid ?? ''
  const { setActivePeerUid, registerIncomingListener, pushSystemToast } = useMuhabereNotify()
  const location = useLocation()
  const navigate = useNavigate()
  const peerFromNav = /** @type {{ peerId?: string } | null} */ (location.state)

  const [roster, setRoster] = useState(/** @type {MuhabereContact[]} */ ([]))
  const [rosterLoading, setRosterLoading] = useState(true)
  const [rosterError, setRosterError] = useState(/** @type {string | null} */ (null))

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState(/** @type {MuhabereContact[]} */ ([]))
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState(/** @type {string | null} */ (null))

  const [channels, setChannels] = useState(/** @type {MuhabereChannel[]} */ ([]))
  const [channelsLoading, setChannelsLoading] = useState(true)
  const [channelsError, setChannelsError] = useState(/** @type {string | null} */ (null))
  const [selectedChannelId, setSelectedChannelId] = useState(/** @type {string | null} */ (null))
  const [showCreateChannel, setShowCreateChannel] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(/** @type {number | null} */ (null))

  const [selectedUid, setSelectedUid] = useState(/** @type {string | null} */ (null))
  const [messages, setMessages] = useState(/** @type {MuhabereMessage[]} */ ([]))
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [messagesError, setMessagesError] = useState(/** @type {string | null} */ (null))

  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [incomingRequests, setIncomingRequests] = useState(/** @type {MuhabereContactRequest[]} */ ([]))
  const [pendingSentUids, setPendingSentUids] = useState(/** @type {Set<string>} */ (() => new Set()))
  const [sendingRequestUid, setSendingRequestUid] = useState(/** @type {string | null} */ (null))
  const [requestBusyId, setRequestBusyId] = useState(/** @type {string | null} */ (null))
  const [removingUid, setRemovingUid] = useState(/** @type {string | null} */ (null))
  const [profileUid, setProfileUid] = useState(/** @type {string | null} */ (null))
  const [burnMode, setBurnMode] = useState(false)
  const [peerTyping, setPeerTyping] = useState(false)
  const [burnGhosts, setBurnGhosts] = useState(/** @type {Record<string, MuhabereMessage>} */ ({}))
  const [unreadSignals, setUnreadSignals] = useState(/** @type {Record<string, boolean>} */ ({}))

  const scrollRef = useRef(/** @type {HTMLDivElement | null} */ (null))
  const messageInputRef = useRef(/** @type {HTMLInputElement | null} */ (null))
  const typingStopRef = useRef(/** @type {ReturnType<typeof setTimeout> | null} */ (null))
  const selectedUidRef = useRef(/** @type {string | null} */ (null))
  selectedUidRef.current = selectedUid

  const searchTrimmed = searchQuery.trim()
  const isSearchMode = searchTrimmed.length >= 2

  const rosterUidSet = useMemo(() => new Set(roster.map((c) => c.uid)), [roster])

  const chatId = useMemo(() => {
    if (!uid || !selectedUid) return ''
    return buildChatId(uid, selectedUid)
  }, [uid, selectedUid])

  const selected = useMemo(
    () => roster.find((c) => c.uid === selectedUid) ?? null,
    [roster, selectedUid],
  )

  const selectedChannel = useMemo(
    () => channels.find((c) => c.id === selectedChannelId) ?? null,
    [channels, selectedChannelId],
  )

  const conversationMode = selectedChannelId ? 'channel' : selectedUid ? 'dm' : null
  const threadId = selectedChannelId ?? chatId
  const hasConversation = Boolean(conversationMode && threadId)

  const displayMessages = useMemo(() => {
    const merged = new Map(messages.map((m) => [m.id, m]))
    for (const ghost of Object.values(burnGhosts)) {
      if (!merged.has(ghost.id)) merged.set(ghost.id, ghost)
    }
    return [...merged.values()].sort(
      (a, b) => timestampToMs(a.timestamp) - timestampToMs(b.timestamp),
    )
  }, [messages, burnGhosts])

  const handleBurnDestroyed = useCallback((/** @type {MuhabereMessage} */ msg) => {
    setBurnGhosts((prev) => ({
      ...prev,
      [msg.id]: { ...msg, destroyed: true, text: '' },
    }))
  }, [])

  const handleDraftChange = useCallback(
    (/** @type {string} */ value) => {
      setDraft(value)
      if (!chatId || !uid) return
      void setChatTypingStatus(chatId, uid, true)
      if (typingStopRef.current) window.clearTimeout(typingStopRef.current)
      typingStopRef.current = window.setTimeout(() => {
        void setChatTypingStatus(chatId, uid, false)
      }, 2000)
    },
    [chatId, uid],
  )

  const loadRoster = useCallback(async () => {
    if (!uid) {
      setRoster([])
      setRosterLoading(false)
      return []
    }
    setRosterLoading(true)
    setRosterError(null)
    try {
      const rows = await fetchMuhabereContacts(uid)
      setRoster(rows)
      return rows
    } catch (err) {
      emitFirebaseError(err)
      setRosterError(err instanceof Error ? err.message : 'Rehber yüklenemedi.')
      setRoster([])
      return []
    } finally {
      setRosterLoading(false)
    }
  }, [uid])

  useEffect(() => {
    if (!uid) {
      setRoster([])
      setRosterLoading(false)
      return undefined
    }

    let active = true

    loadRoster().then((rows) => {
      if (!active) return
      const fromToast = peerFromNav?.peerId
      setSelectedUid((prev) => {
        if (fromToast && rows.some((c) => c.uid === fromToast)) return fromToast
        if (prev && rows.some((c) => c.uid === prev)) return prev
        return rows[0]?.uid ?? null
      })
      if (fromToast && rows.some((c) => c.uid === fromToast)) {
        setUnreadSignals((prev) => {
          if (!prev[fromToast]) return prev
          const next = { ...prev }
          delete next[fromToast]
          return next
        })
      }
      if (fromToast) {
        navigate('/mesajlar', { replace: true, state: {} })
      }
    })

    return () => {
      active = false
    }
  }, [uid, peerFromNav?.peerId, navigate, loadRoster])

  useEffect(() => {
    if (!uid) {
      setIncomingRequests([])
      setPendingSentUids(new Set())
      return undefined
    }

    const unsubIn = subscribeIncomingContactRequests(
      uid,
      (rows) => setIncomingRequests(rows),
      (err) => emitFirebaseError(err),
    )
    const unsubOut = subscribeOutgoingPendingRequests(
      uid,
      (receiverIds) => setPendingSentUids(new Set(receiverIds)),
      (err) => emitFirebaseError(err),
    )

    return () => {
      unsubIn()
      unsubOut()
    }
  }, [uid])

  useEffect(() => {
    if (!isSearchMode) {
      setSearchResults([])
      setSearchLoading(false)
      setSearchError(null)
      return undefined
    }

    let active = true
    const timer = window.setTimeout(() => {
      setSearchLoading(true)
      setSearchError(null)
      searchMuhabereOperators(uid, searchTrimmed)
        .then((rows) => {
          if (!active) return
          setSearchResults(rows)
        })
        .catch((err) => {
          if (!active) return
          emitFirebaseError(err)
          setSearchError(err instanceof Error ? err.message : 'Arama başarısız.')
          setSearchResults([])
        })
        .finally(() => {
          if (active) setSearchLoading(false)
        })
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [uid, searchTrimmed, isSearchMode])

  useEffect(() => {
    setActivePeerUid(selectedUid)
    return () => setActivePeerUid(null)
  }, [selectedUid, setActivePeerUid])

  useEffect(() => {
    return registerIncomingListener((msg) => {
      if (msg.senderId === uid) return
      if (msg.senderId === selectedUidRef.current) return
      if (!rosterUidSet.has(msg.senderId)) return
      setUnreadSignals((prev) => ({ ...prev, [msg.senderId]: true }))
    })
  }, [registerIncomingListener, uid, rosterUidSet])

  const selectOperator = useCallback((/** @type {string} */ contactUid) => {
    if (!rosterUidSet.has(contactUid)) return
    setSearchQuery('')
    setSelectedChannelId(null)
    setSelectedUid(contactUid)
    setUnreadSignals((prev) => {
      if (!prev[contactUid]) return prev
      const next = { ...prev }
      delete next[contactUid]
      return next
    })
  }, [rosterUidSet])

  const selectChannel = useCallback((/** @type {string} */ channelId) => {
    setSearchQuery('')
    setSelectedUid(null)
    setSelectedChannelId(channelId)
  }, [])

  useEffect(() => {
    if (!uid) {
      setChannels([])
      setChannelsLoading(false)
      return undefined
    }

    setChannelsLoading(true)
    const unsub = subscribeUserMuhabereChannels(
      uid,
      (rows) => {
        setChannels(rows)
        setChannelsLoading(false)
        setChannelsError(null)
      },
      (err) => {
        emitFirebaseError(err)
        setChannelsError(err instanceof Error ? err.message : 'Kanallar yüklenemedi.')
        setChannelsLoading(false)
      },
    )

    return unsub
  }, [uid])

  const handleSendRequest = async (/** @type {MuhabereContact} */ contact) => {
    if (!uid || sendingRequestUid || pendingSentUids.has(contact.uid)) return
    setSendingRequestUid(contact.uid)
    try {
      await sendMuhabereContactRequest(uid, contact.uid)
      setPendingSentUids((prev) => new Set([...prev, contact.uid]))
      pushSystemToast(`İSTEK İLETİLDİ — ${contact.callsign.toUpperCase()}`)
    } catch (err) {
      emitFirebaseError(err)
      pushSystemToast(muhabereRequestErrorMessage(err).toUpperCase())
    } finally {
      setSendingRequestUid(null)
    }
  }

  const handleAcceptRequest = async (/** @type {MuhabereContactRequest} */ req) => {
    if (!uid || requestBusyId) return
    setRequestBusyId(req.id)
    try {
      const contact = await acceptMuhabereContactRequest(uid, req.id)
      await loadRoster()
      setSelectedChannelId(null)
      setSelectedUid(contact.uid)
      pushSystemToast(`BAĞLANTI ONAYLANDI — ${contact.callsign.toUpperCase()}`)
    } catch (err) {
      emitFirebaseError(err)
      pushSystemToast(muhabereRequestErrorMessage(err).toUpperCase())
    } finally {
      setRequestBusyId(null)
    }
  }

  const handleDisconnect = async (/** @type {MuhabereContact} */ contact) => {
    if (!uid || removingUid) return

    const confirmed = window.confirm(
      `[${contact.callsign}] ile olan taktiksel ağ bağlantısı koparılacak. Onaylıyor musunuz?`,
    )
    if (!confirmed) return

    setRemovingUid(contact.uid)
    try {
      await removeMuhabereContact(uid, contact.uid)
      if (selectedUid === contact.uid) {
        setSelectedUid(null)
      }
      setUnreadSignals((prev) => {
        if (!prev[contact.uid]) return prev
        const next = { ...prev }
        delete next[contact.uid]
        return next
      })
      setRoster((prev) => prev.filter((c) => c.uid !== contact.uid))
      pushSystemToast(`BAĞLANTI KESİLDİ — ${contact.callsign.toUpperCase()} ağdan çıkarıldı.`)
    } catch (err) {
      emitFirebaseError(err)
      pushSystemToast(muhabereRequestErrorMessage(err).toUpperCase())
    } finally {
      setRemovingUid(null)
    }
  }

  const handleRejectRequest = async (/** @type {MuhabereContactRequest} */ req) => {
    if (!uid || requestBusyId) return
    setRequestBusyId(req.id)
    try {
      await rejectMuhabereContactRequest(uid, req.id)
      pushSystemToast('İSTEK REDDEDİLDİ')
    } catch (err) {
      emitFirebaseError(err)
      pushSystemToast(muhabereRequestErrorMessage(err).toUpperCase())
    } finally {
      setRequestBusyId(null)
    }
  }

  useEffect(() => {
    if (!chatId || !uid || conversationMode !== 'dm') return
    void markChatMessagesAsRead(chatId, uid)
  }, [chatId, uid, conversationMode])

  useEffect(() => {
    if (conversationMode !== 'dm' || !chatId || !selectedUid) {
      setPeerTyping(false)
      return undefined
    }
    return subscribeChatTypingStatus(chatId, selectedUid, setPeerTyping, (err) =>
      emitFirebaseError(err),
    )
  }, [chatId, selectedUid, conversationMode])

  useEffect(() => {
    setBurnGhosts({})
    setBurnMode(false)
    return () => {
      if (typingStopRef.current) window.clearTimeout(typingStopRef.current)
      if (chatId && uid && conversationMode === 'dm') void setChatTypingStatus(chatId, uid, false)
    }
  }, [chatId, selectedUid, uid, conversationMode])

  useEffect(() => {
    if (!selectedChannelId && !chatId) {
      setMessages([])
      setMessagesLoading(false)
      setMessagesError(null)
      return undefined
    }

    let active = true
    setMessagesLoading(true)
    setMessagesError(null)

    const unsub =
      conversationMode === 'channel' && selectedChannelId
        ? subscribeChannelMessages(
            selectedChannelId,
            (rows) => {
              if (!active) return
              setMessages(rows)
              setMessagesLoading(false)
            },
            (err) => {
              if (!active) return
              emitFirebaseError(err)
              setMessagesError(err instanceof Error ? err.message : 'Kanal mesajları kesildi.')
              setMessagesLoading(false)
            },
          )
        : chatId
          ? subscribeChatMessages(
              chatId,
              (rows) => {
                if (!active) return
                setMessages(rows)
                setMessagesLoading(false)
              },
              (err) => {
                if (!active) return
                emitFirebaseError(err)
                setMessagesError(err instanceof Error ? err.message : 'Mesaj kanalı kesildi.')
                setMessagesLoading(false)
              },
            )
          : () => {}

    return () => {
      active = false
      unsub()
    }
  }, [chatId, selectedChannelId, conversationMode])

  const scrollToBottom = useCallback((/** @type {ScrollBehavior} */ behavior = 'smooth') => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior })
  }, [])

  useEffect(() => {
    if (displayMessages.length === 0) return
    scrollToBottom(displayMessages.length === 1 ? 'auto' : 'smooth')
  }, [displayMessages, scrollToBottom])

  useEffect(() => {
    if (!selectedUid && !selectedChannelId) return
    const id = window.requestAnimationFrame(() => {
      messageInputRef.current?.focus()
    })
    return () => window.cancelAnimationFrame(id)
  }, [selectedUid, selectedChannelId])

  const focusMessageInput = () => {
    window.requestAnimationFrame(() => {
      messageInputRef.current?.focus()
    })
  }

  const handleSend = async (e) => {
    e.preventDefault()
    const text = draft.trim()
    if (!text || !uid || !threadId || sending || uploadProgress != null) return

    setSending(true)
    setMessagesError(null)
    let sentOk = false
    try {
      if (conversationMode === 'channel' && selectedChannelId) {
        await sendChannelMessage({
          channelId: selectedChannelId,
          text,
          senderId: uid,
        })
      } else if (selectedUid && chatId) {
        await sendChatMessage({
          chatId,
          text,
          senderId: uid,
          receiverId: selectedUid,
          isBurn: burnMode,
          burnTime: 10,
        })
        if (burnMode) setBurnMode(false)
      } else {
        return
      }
      setDraft('')
      sentOk = true
    } catch (err) {
      emitFirebaseError(err)
      setMessagesError(err instanceof Error ? err.message : 'Gönderim başarısız.')
    } finally {
      setSending(false)
      if (sentOk) focusMessageInput()
    }
  }

  const listLoading = isSearchMode ? searchLoading : rosterLoading
  const listError = isSearchMode ? searchError : rosterError
  const listItems = isSearchMode ? searchResults : roster

  const emptyMessage = isSearchMode
    ? searchTrimmed.length < 2
      ? 'Arama için en az 2 karakter girin.'
      : 'Ağda operatör bulunamadı — çağrı adını kontrol edin.'
    : 'Tim rehberi boş — üstten operatör arayıp katılım isteği gönderin.'

  return (
    <div className="mx-auto flex h-[calc(100dvh-8rem)] min-h-[520px] max-w-[1200px] flex-col font-mono">
      <header className="shrink-0 border-b border-zinc-800 pb-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-zinc-500">COM-01 · SECURE</p>
        <h1 className="mt-1 text-2xl font-semibold uppercase tracking-wide text-zinc-100">Taktik Muhabere</h1>
        <p className="mt-1 text-xs text-zinc-500">Kriptolu uçtan uca operatör ağı · Tim rehberi</p>
      </header>

      <div className="mt-4 flex min-h-0 flex-1 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
        <aside className="flex w-80 shrink-0 flex-col border-r border-zinc-800 bg-zinc-900/50">
          <div className="border-b border-zinc-800 bg-zinc-900 px-3 py-3">
            <label className="relative block">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-zinc-500"
                strokeWidth={2}
                aria-hidden
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Çağrı Adı Ara..."
                className="w-full rounded-md border border-zinc-700 bg-zinc-950 py-2 pl-9 pr-3 font-mono text-sm text-zinc-300 outline-none transition placeholder:text-zinc-600 focus:border-zinc-600 focus:ring-1 focus:ring-lime-500/20"
                autoComplete="off"
                spellCheck={false}
              />
            </label>
          </div>

          {incomingRequests.length > 0 ? (
            <div className="shrink-0 border-b border-zinc-800 px-4 py-3">
              <h3 className="mb-2 border-b border-zinc-800 pb-1 font-mono text-xs tracking-widest text-zinc-500">
                AĞ KATILIM İSTEKLERİ
              </h3>
              <ul className="space-y-2">
                {incomingRequests.map((req) => {
                  const busy = requestBusyId === req.id
                  return (
                    <li
                      key={req.id}
                      className="rounded-md border border-zinc-800/80 bg-zinc-950/60 px-2 py-2"
                    >
                      <CallsignProfileTrigger
                        callsign={req.sender.callsign}
                        operatorUid={req.sender.uid}
                        onOpenProfile={setProfileUid}
                        className="text-zinc-200"
                      />
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleAcceptRequest(req)}
                          className="flex-1 rounded border border-transparent px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-lime-500 transition hover:bg-lime-900/30 disabled:opacity-40"
                        >
                          {busy ? (
                            <Loader2 className="mx-auto size-3 animate-spin" aria-hidden />
                          ) : (
                            'Onayla'
                          )}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleRejectRequest(req)}
                          className="flex-1 rounded border border-transparent px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-red-500 transition hover:bg-red-900/30 disabled:opacity-40"
                        >
                          Reddet
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          ) : null}

          {!isSearchMode ? (
            <div className="shrink-0 border-b border-zinc-800 px-3 py-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-lime-500/90">
                  Tim kanalları
                </h2>
                <button
                  type="button"
                  onClick={() => setShowCreateChannel(true)}
                  className="inline-flex items-center gap-1 rounded border border-lime-500/30 bg-lime-950/30 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-lime-400 transition hover:bg-lime-900/50"
                >
                  <Plus className="size-3" strokeWidth={2.5} aria-hidden />
                  Yeni kanal
                </button>
              </div>
              {channelsLoading ? (
                <p className="text-[10px] text-zinc-600">Kanallar yükleniyor…</p>
              ) : channelsError ? (
                <p className="text-[10px] text-red-400/90">{channelsError}</p>
              ) : channels.length === 0 ? (
                <p className="text-[10px] leading-relaxed text-zinc-600">
                  Henüz kanal yok — tim üyeleriyle grup açın.
                </p>
              ) : (
                <ul className="max-h-36 space-y-1 overflow-y-auto" role="listbox" aria-label="Tim kanalları">
                  {channels.map((ch) => {
                    const active = ch.id === selectedChannelId
                    return (
                      <li key={ch.id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={active}
                          onClick={() => selectChannel(ch.id)}
                          className={[
                            'flex w-full items-center gap-2 rounded-md border-l-4 px-2 py-2 text-left transition',
                            active
                              ? 'border-lime-500 bg-zinc-800 text-lime-400'
                              : 'border-l-transparent text-zinc-400 hover:bg-zinc-800/70',
                          ].join(' ')}
                        >
                          <Radio className="size-3 shrink-0 text-lime-500/70" aria-hidden />
                          <span className="truncate text-xs font-semibold uppercase tracking-wide">
                            {ch.name}
                          </span>
                          <span className="ml-auto text-[9px] text-zinc-600">{ch.members.length}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          ) : null}

          <div className="border-b border-zinc-800 px-4 py-2">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
              {isSearchMode ? 'Arama sonuçları' : 'Tim rehberi'}
            </h2>
          </div>

          {listLoading ? (
            <div className="flex flex-1 items-center justify-center gap-2 text-zinc-500">
              <Loader2 className="size-4 animate-spin text-lime-400/80" aria-hidden />
              <span className="text-xs">{isSearchMode ? 'Tarama…' : 'Rehber yükleniyor…'}</span>
            </div>
          ) : listError ? (
            <p className="flex-1 px-4 py-6 text-xs text-red-400/90">{listError}</p>
          ) : listItems.length === 0 ? (
            <p className="flex-1 px-4 py-6 text-xs leading-relaxed text-zinc-600">{emptyMessage}</p>
          ) : (
            <ul
              className="min-h-0 flex-1 overflow-y-auto p-2"
              role="listbox"
              aria-label={isSearchMode ? 'Arama sonuçları' : 'Tim rehberi'}
            >
              {listItems.map((contact) => {
                const active = !isSearchMode && contact.uid === selectedUid
                const hasSignal = Boolean(unreadSignals[contact.uid])
                const inRoster = rosterUidSet.has(contact.uid)
                const showRequest = isSearchMode && !inRoster
                const requestSent = pendingSentUids.has(contact.uid)
                const isSending = sendingRequestUid === contact.uid

                const isRemoving = removingUid === contact.uid

                return (
                  <li key={contact.uid} className={!isSearchMode ? 'group' : undefined}>
                    <div
                      className={[
                        'flex w-full items-start gap-2 rounded-md border-l-4 py-3 pl-2 pr-2 transition-colors duration-200',
                        hasSignal && !isSearchMode
                          ? 'animate-pulse border-lime-500 bg-lime-900/20'
                          : 'border-l-transparent',
                        active ? 'bg-zinc-800 text-lime-400' : 'text-zinc-300',
                      ].join(' ')}
                    >
                      {showRequest ? (
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          <StatusDot />
                          <div className="min-w-0 flex-1">
                            <CallsignProfileTrigger
                              callsign={contact.callsign}
                              operatorUid={contact.uid}
                              onOpenProfile={setProfileUid}
                            />
                            <p className="mt-0.5 text-[10px] uppercase tracking-wider text-zinc-500">
                              {contact.role === 'instructor' ? 'Eğitmen' : 'Operatör'}
                              {contact.username ? ` · @${contact.username}` : ''}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          role="option"
                          aria-selected={active}
                          onClick={() => selectOperator(contact.uid)}
                          className="flex min-w-0 flex-1 items-start gap-3 text-left hover:bg-zinc-800/80"
                        >
                          <StatusDot signal={hasSignal} />
                          <div className="min-w-0 flex-1">
                            <CallsignProfileTrigger
                              callsign={contact.callsign}
                              operatorUid={contact.uid}
                              onOpenProfile={setProfileUid}
                            />
                            <p className="mt-0.5 text-[10px] uppercase tracking-wider text-zinc-500">
                              {contact.role === 'instructor' ? 'Eğitmen' : 'Operatör'}
                            </p>
                          </div>
                        </button>
                      )}

                      {showRequest ? (
                        requestSent ? (
                          <span className="shrink-0 px-1 py-1 text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                            [ İSTEK İLETİLDİ ]
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={isSending}
                            onClick={() => handleSendRequest(contact)}
                            className="inline-flex shrink-0 items-center gap-1 rounded border border-transparent px-1.5 py-1 text-[10px] font-bold uppercase tracking-wider text-lime-500 transition hover:border-lime-500/30 hover:bg-lime-950/40 hover:text-lime-400 disabled:opacity-40"
                            aria-label={`${contact.callsign} — istek gönder`}
                          >
                            {isSending ? (
                              <Loader2 className="size-3.5 animate-spin" aria-hidden />
                            ) : (
                              <>
                                <UserPlus className="size-3.5" strokeWidth={2.25} aria-hidden />
                                <span className="hidden sm:inline">İstek gönder</span>
                              </>
                            )}
                          </button>
                        )
                      ) : null}

                      {!isSearchMode ? (
                        <button
                          type="button"
                          disabled={isRemoving}
                          onClick={(e) => {
                            e.stopPropagation()
                            void handleDisconnect(contact)
                          }}
                          className="mt-0.5 shrink-0 rounded p-1 text-zinc-600 opacity-0 transition-all duration-200 hover:bg-red-950/30 hover:text-red-500 group-hover:opacity-100 disabled:opacity-40"
                          aria-label={`${contact.callsign} — bağlantıyı kes`}
                          title="Bağlantıyı kes"
                        >
                          {isRemoving ? (
                            <Loader2 className="size-3.5 animate-spin" aria-hidden />
                          ) : (
                            <UserMinus className="size-3.5" strokeWidth={2} aria-hidden />
                          )}
                        </button>
                      ) : null}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </aside>

        <section className="flex min-w-0 flex-1 flex-col bg-zinc-950">
          {!hasConversation ? (
            <p className="flex flex-1 items-center justify-center px-6 text-center text-xs leading-relaxed text-zinc-600">
              {roster.length === 0 && channels.length === 0
                ? 'Aktif kanal yok — tim rehberine operatör ekleyin veya yeni tim kanalı oluşturun.'
                : 'Sohbet için tim kanalı veya rehberden operatör seçin.'}
            </p>
          ) : (
            <>
              <header className="flex shrink-0 items-center gap-3 border-b border-zinc-800 px-4 py-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-zinc-700 bg-zinc-900">
                  {conversationMode === 'channel' ? (
                    <Radio className="size-5 text-lime-400" strokeWidth={1.75} aria-hidden />
                  ) : (
                    <User className="size-5 text-zinc-400" strokeWidth={1.75} aria-hidden />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold uppercase tracking-wide text-zinc-100">
                    {conversationMode === 'channel'
                      ? selectedChannel?.name ?? 'KANAL'
                      : selected?.callsign}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                    {conversationMode === 'channel'
                      ? `Tim kanalı · ${selectedChannel?.members.length ?? 0} üye`
                      : 'Aktif kanal · DM'}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-md border border-lime-500/30 bg-lime-950/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-lime-400">
                  <Shield className="size-3 shrink-0" strokeWidth={2} aria-hidden />
                  Bağlantı güvenli
                </span>
              </header>

              <div
                ref={scrollRef}
                className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4"
              >
                {messagesLoading && messages.length === 0 ? (
                  <div className="flex items-center justify-center gap-2 py-12 text-zinc-500">
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    <span className="text-xs">Mesajlar yükleniyor…</span>
                  </div>
                ) : messages.length === 0 ? (
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
                      onBurnDestroyed={handleBurnDestroyed}
                    />
                  ))
                )}
                {conversationMode === 'dm' && peerTyping ? (
                  <p className="animate-pulse font-mono text-xs text-lime-500">
                    [ {selected?.callsign?.toUpperCase() ?? 'OPERATÖR'} VERİ GİRİYOR... ]
                  </p>
                ) : null}
                {messagesError ? (
                  <p className="text-center text-xs text-red-400/90">{messagesError}</p>
                ) : null}
              </div>

              <footer className="shrink-0 border-t border-zinc-800 p-4">
                {uploadProgress != null ? (
                  <div className="mb-3 rounded-md border border-lime-500/30 bg-lime-950/30 px-3 py-2">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-lime-400">
                      [ VERİ YÜKLENİYOR... %{uploadProgress} ]
                    </p>
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-zinc-800">
                      <div
                        className="h-full bg-lime-500 transition-all duration-200"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                ) : null}
                <form onSubmit={handleSend} className="flex gap-2">
                  <MuhabereAttachMenu
                    threadId={threadId}
                    mode={conversationMode === 'channel' ? 'channel' : 'dm'}
                    uid={uid}
                    receiverId={selectedUid ?? ''}
                    disabled={sending || uploadProgress != null}
                    onUploadProgress={setUploadProgress}
                    onMessageSent={focusMessageInput}
                  />
                  {conversationMode === 'dm' ? (
                    <button
                      type="button"
                      onClick={() => setBurnMode((v) => !v)}
                      className={[
                        'inline-flex shrink-0 items-center justify-center rounded-md border px-2.5 py-2.5 transition',
                        burnMode
                          ? 'border-red-600/60 bg-red-950/40 text-red-400'
                          : 'border-zinc-700 bg-zinc-900 text-zinc-500 hover:text-red-500',
                      ].join(' ')}
                      aria-label={burnMode ? 'Burn modu aktif' : 'Burn modu'}
                      aria-pressed={burnMode}
                      title="Burn protokolü — 10 sn sonra imha"
                    >
                      <Flame className="size-4" strokeWidth={2} aria-hidden />
                    </button>
                  ) : null}
                  <input
                    ref={messageInputRef}
                    type="text"
                    value={draft}
                    onChange={(e) =>
                      conversationMode === 'dm'
                        ? handleDraftChange(e.target.value)
                        : setDraft(e.target.value)
                    }
                    placeholder={
                      burnMode && conversationMode === 'dm'
                        ? '// Burn ileti — 10 sn imha…'
                        : '// Mesajınızı yazın…'
                    }
                    disabled={sending || uploadProgress != null}
                    autoFocus
                    className={[
                      'min-w-0 flex-1 rounded-md border bg-zinc-900 px-3 py-2.5 font-mono text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:ring-1 disabled:opacity-50',
                      burnMode
                        ? 'border-red-600/70 focus:border-red-500 focus:ring-red-500/25'
                        : 'border-zinc-700 focus:border-zinc-600 focus:ring-lime-500/20',
                    ].join(' ')}
                    autoComplete="off"
                  />
                  <button
                    type="submit"
                    disabled={!draft.trim() || sending || uploadProgress != null}
                    className="inline-flex shrink-0 items-center justify-center gap-1 rounded-md border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-bold uppercase tracking-wider text-zinc-400 transition duration-200 hover:border-lime-500/40 hover:bg-lime-900/50 hover:text-lime-400 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Gönder"
                  >
                    {sending ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : (
                      <>
                        <span className="hidden sm:inline">Gönder</span>
                        <ChevronRight className="size-4" strokeWidth={2.5} aria-hidden />
                      </>
                    )}
                  </button>
                </form>
              </footer>
            </>
          )}
        </section>
      </div>

      <OperatorSicilModal
        open={Boolean(profileUid)}
        operatorUid={profileUid}
        onClose={() => setProfileUid(null)}
      />

      <CreateChannelModal
        open={showCreateChannel}
        uid={uid}
        contacts={roster}
        onClose={() => setShowCreateChannel(false)}
        onCreated={(channelId) => {
          selectChannel(channelId)
          pushSystemToast('TİM KANALI AÇILDI')
        }}
      />
    </div>
  )
}
