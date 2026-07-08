import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, Flame, Loader2, Radio, Search, UserPlus, Users } from 'lucide-react'
import CreateChannelModal from '../components/muhabere/CreateChannelModal'
import EditChannelModal from '../components/muhabere/EditChannelModal'
import ChatList from '../components/muhabere/ChatList'
import ChatWindow from '../components/muhabere/ChatWindow'
import MuhabereChannelMembersModal from '../components/muhabere/MuhabereChannelMembersModal'
import MuhabereArchiveSection from '../components/muhabere/MuhabereArchiveSection'
import MuhabereAttachMenu from '../components/muhabere/MuhabereAttachMenu'
import MuhabereEmptyState from '../components/muhabere/MuhabereEmptyState'
import MuhabereConversationMenu from '../components/muhabere/MuhabereConversationMenu'
import MuhabereUnreadBadge from '../components/muhabere/MuhabereUnreadBadge'
import TacticalAlert from '../components/muhabere/TacticalAlert'
import OperatorAvatar from '../components/ui/OperatorAvatar'
import PresenceIndicator from '../components/ui/PresenceIndicator'
import { useAuth } from '../context/AuthContext'
import OperatorSicilModal from '../components/muhabere/OperatorSicilModal'
import { useMuhabereNotify } from '../context/MuhabereNotifyContext'
import { emitFirebaseError } from '../lib/firebaseErrorBus'
import {
  acceptMuhabereContactRequest,
  buildChatId,
  fetchMuhabereContacts,
  archiveMuhabereChannelForUser,
  archiveMuhabereDmForUser,
  blockMuhabereUser,
  deleteMuhabereChannel,
  deleteMuhabereChannelForUser,
  deleteMuhabereDmForUser,
  formatConversationPreviewTime,
  leaveMuhabereChannel,
  removeMuhabereChannelMember,
  unarchiveMuhabereChannelForUser,
  unarchiveMuhabereDmForUser,
  hideMuhabereMessageForUser,
  setChatTypingStatus,
  rejectMuhabereContactRequest,
  searchMuhabereOperators,
  sendChannelMessage,
  sendChatMessage,
  sendMuhabereContactRequest,
  splitMuhabereChannels,
  splitMuhabereContacts,
  subscribeArchivedMuhabereChannelIds,
  subscribeArchivedMuhabereDmIds,
  subscribeChatTypingStatus,
  subscribeDeletedMuhabereChannelIds,
  subscribeDeletedMuhabereDmIds,
  subscribeDmUnreadByPeerId,
  subscribeIncomingContactRequests,
  subscribeOutgoingPendingRequests,
  subscribeHiddenMuhabereMessageIds,
  subscribeConversationSummaries,
  subscribeUserChannelUnreadCounts,
  subscribeUserMuhabereChannels,
} from '../lib/firestoreTaktikMuhabere'
import {
  indexConversationSummaries,
  isActiveChannelRow,
  resolveChannelUnreadCount,
  resolveContactConversationSummary,
  sortMuhabereContactsByRecency,
} from '../lib/muhabereConversation'
import {
  formatMuhabereMessagePreviewDisplay,
  isMuhabereContentViolationMessage,
  messagesRoleLabel,
  muhabereContentViolationMessage,
  muhabereRequestErrorMessageDisplay,
} from '../lib/messagesDisplayText'
import { useOperatorsPresenceMap } from '../hooks/useOperatorsPresenceMap'
import { useCompactShell } from '../hooks/useCompactShell'

/** @typedef {import('../lib/firestoreTaktikMuhabere').MuhabereContact} MuhabereContact */
/** @typedef {import('../lib/firestoreTaktikMuhabere').MuhabereMessage} MuhabereMessage */
/** @typedef {import('../lib/firestoreTaktikMuhabere').MuhabereContactRequest} MuhabereContactRequest */
/** @typedef {import('../lib/firestoreTaktikMuhabere').MuhabereChannel} MuhabereChannel */

const SEARCH_DEBOUNCE_MS = 320

/** Tim rehberi rozeti — OperatorBadge (StatusDot kaldırıldı) */

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

export default function TaktikMuhabere() {
  const { t } = useTranslation('messages')
  const { user, userData } = useAuth()
  const uid = user?.uid ?? ''
  const {
    setActivePeerUid,
    setActiveChannelId,
    pushSystemToast,
    channelUnreadById,
    channelPreviewsById,
    markChannelAsRead,
    markDmPeerAsRead,
  } = useMuhabereNotify()
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const peerFromNav = /** @type {{ peerId?: string } | null} */ (location.state)
  const peerFromQuery = searchParams.get('peer')?.trim() ?? ''
  const peerTarget = peerFromNav?.peerId?.trim() || peerFromQuery
  const compact = useCompactShell()

  const [roster, setRoster] = useState(/** @type {MuhabereContact[]} */ ([]))
  const [rosterLoading, setRosterLoading] = useState(true)
  const [rosterError, setRosterError] = useState(/** @type {string | null} */ (null))

  const [searchQuery, setSearchQuery] = useState('')
  const [sidebarTab, setSidebarTab] = useState(/** @type {'channels' | 'operators'} */ ('channels'))
  const [searchResults, setSearchResults] = useState(/** @type {MuhabereContact[]} */ ([]))
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState(/** @type {string | null} */ (null))

  const [channels, setChannels] = useState(/** @type {MuhabereChannel[]} */ ([]))
  const [channelsLoading, setChannelsLoading] = useState(true)
  const [channelsError, setChannelsError] = useState(/** @type {string | null} */ (null))
  const [selectedChannelId, setSelectedChannelId] = useState(/** @type {string | null} */ (null))
  const [showCreateChannel, setShowCreateChannel] = useState(false)
  const [showChannelMembers, setShowChannelMembers] = useState(false)
  const [removingChannelMemberUid, setRemovingChannelMemberUid] = useState(
    /** @type {string | null} */ (null),
  )
  const [uploadProgress, setUploadProgress] = useState(/** @type {number | null} */ (null))

  const [selectedUid, setSelectedUid] = useState(/** @type {string | null} */ (null))

  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [incomingRequests, setIncomingRequests] = useState(/** @type {MuhabereContactRequest[]} */ ([]))
  const [pendingSentUids, setPendingSentUids] = useState(/** @type {Set<string>} */ (() => new Set()))
  const [sendingRequestUid, setSendingRequestUid] = useState(/** @type {string | null} */ (null))
  const [requestBusyId, setRequestBusyId] = useState(/** @type {string | null} */ (null))
  const [profileUid, setProfileUid] = useState(/** @type {string | null} */ (null))
  const [burnMode, setBurnMode] = useState(false)
  const [peerTyping, setPeerTyping] = useState(false)
  const [burnGhosts, setBurnGhosts] = useState(/** @type {Record<string, MuhabereMessage>} */ ({}))
  const [conversationIndex, setConversationIndex] = useState(/** @type {ReturnType<typeof indexConversationSummaries> | null} */ (null))
  const [summariesError, setSummariesError] = useState(/** @type {string | null} */ (null))
  const [liveDmUnreadByPeerId, setLiveDmUnreadByPeerId] = useState(/** @type {Record<string, number>} */ ({}))
  const [liveChannelUnreadById, setLiveChannelUnreadById] = useState(/** @type {Record<string, number>} */ ({}))
  const [hiddenMessageIds, setHiddenMessageIds] = useState(/** @type {Set<string>} */ (() => new Set()))
  const [archivedChannelIds, setArchivedChannelIds] = useState(/** @type {Set<string>} */ (() => new Set()))
  const [deletedChannelIds, setDeletedChannelIds] = useState(/** @type {Set<string>} */ (() => new Set()))
  const [archivedDmIds, setArchivedDmIds] = useState(/** @type {Set<string>} */ (() => new Set()))
  const [deletedDmIds, setDeletedDmIds] = useState(/** @type {Set<string>} */ (() => new Set()))
  const [hidingMessageId, setHidingMessageId] = useState(/** @type {string | null} */ (null))
  const [archivingChannelId, setArchivingChannelId] = useState(/** @type {string | null} */ (null))
  const [unarchivingChannelId, setUnarchivingChannelId] = useState(/** @type {string | null} */ (null))
  const [deletingChannelId, setDeletingChannelId] = useState(/** @type {string | null} */ (null))
  const [archivingDmUid, setArchivingDmUid] = useState(/** @type {string | null} */ (null))
  const [unarchivingDmUid, setUnarchivingDmUid] = useState(/** @type {string | null} */ (null))
  const [deletingDmUid, setDeletingDmUid] = useState(/** @type {string | null} */ (null))
  const [dmArchiveTarget, setDmArchiveTarget] = useState(/** @type {MuhabereContact | null} */ (null))
  const [dmDeleteTarget, setDmDeleteTarget] = useState(/** @type {MuhabereContact | null} */ (null))
  const [dmBlockTarget, setDmBlockTarget] = useState(/** @type {MuhabereContact | null} */ (null))
  const [editChannelTarget, setEditChannelTarget] = useState(/** @type {MuhabereChannel | null} */ (null))
  const [destroyingChannelId, setDestroyingChannelId] = useState(/** @type {string | null} */ (null))
  const [blockingUid, setBlockingUid] = useState(/** @type {string | null} */ (null))

  const typingStopRef = useRef(/** @type {ReturnType<typeof setTimeout> | null} */ (null))
  const typingActiveRef = useRef(false)
  const peerTypingHideRef = useRef(/** @type {ReturnType<typeof setTimeout> | null} */ (null))
  const messageInputRef = useRef(/** @type {HTMLInputElement | null} */ (null))
  const [sendError, setSendError] = useState(/** @type {string | null} */ (null))

  const searchTrimmed = searchQuery.trim()
  const isSearchMode = searchTrimmed.length >= 2

  useEffect(() => {
    if (isSearchMode) setSidebarTab('operators')
  }, [isSearchMode])

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

  const { active: activeChannels, archived: archivedChannels } = useMemo(
    () => splitMuhabereChannels(channels, archivedChannelIds, deletedChannelIds),
    [channels, archivedChannelIds, deletedChannelIds],
  )

  const { active: activeRoster, archived: archivedContacts } = useMemo(
    () => splitMuhabereContacts(roster, archivedDmIds, deletedDmIds),
    [roster, archivedDmIds, deletedDmIds],
  )

  const presenceUids = useMemo(() => {
    const ids = [...roster.map((c) => c.uid)]
    if (selectedUid) ids.push(selectedUid)
    return ids
  }, [roster, selectedUid])

  const presenceMap = useOperatorsPresenceMap(presenceUids)

  const conversationMode = selectedChannelId ? 'channel' : selectedUid ? 'dm' : null
  const threadId = selectedChannelId ?? chatId
  const hasConversation = Boolean(conversationMode && threadId)
  const showMobileRoster = !compact || !hasConversation
  const showMobileChat = !compact || hasConversation

  const clearMobileConversation = useCallback(() => {
    setSelectedChannelId(null)
    setSelectedUid(null)
  }, [])

  const dmUnreadByPeerId = conversationIndex?.dmUnreadByPeerId ?? {}

  useEffect(() => {
    if (!uid) {
      setLiveDmUnreadByPeerId({})
      return undefined
    }

    return subscribeDmUnreadByPeerId(
      uid,
      (counts) => setLiveDmUnreadByPeerId(counts),
      (err) => emitFirebaseError(err),
    )
  }, [uid])

  useEffect(() => {
    if (!uid) {
      setLiveChannelUnreadById({})
      return undefined
    }

    return subscribeUserChannelUnreadCounts(
      uid,
      (counts) => setLiveChannelUnreadById(counts),
      (err) => emitFirebaseError(err),
    )
  }, [uid])

  const openChannelId = conversationMode === 'channel' ? selectedChannelId : null

  const resolveChannelUnread = useCallback(
    (/** @type {string} */ channelId, /** @type {boolean} */ isActiveRow) => {
      if (isActiveRow) return 0
      if (openChannelId != null && openChannelId !== '' && openChannelId === channelId) return 0
      return resolveChannelUnreadCount(
        conversationIndex,
        channelId,
        channelUnreadById,
        liveChannelUnreadById,
      )
    },
    [conversationIndex, channelUnreadById, liveChannelUnreadById, openChannelId],
  )

  const resolveDmUnread = useCallback(
    (/** @type {string} */ peerUid, /** @type {boolean} */ isActiveRow) => {
      if (isActiveRow) return 0
      if (selectedUid != null && selectedUid !== '' && selectedUid === peerUid && selectedChannelId == null) {
        return 0
      }
      return Math.max(dmUnreadByPeerId[peerUid] ?? 0, liveDmUnreadByPeerId[peerUid] ?? 0)
    },
    [dmUnreadByPeerId, liveDmUnreadByPeerId, selectedUid, selectedChannelId],
  )

  const senderNames = useMemo(() => {
    /** @type {Record<string, string>} */
    const map = {}
    for (const contact of roster) {
      map[contact.uid] = contact.callsign
    }
    if (uid && userData?.callsign) map[uid] = userData.callsign
    else if (uid && user?.displayName) map[uid] = user.displayName
    return map
  }, [roster, uid, userData?.callsign, user?.displayName])

  useEffect(() => {
    if (!uid) {
      setConversationIndex(null)
      setSummariesError(null)
      return undefined
    }

    return subscribeConversationSummaries(
      uid,
      (rows) => {
        setConversationIndex(indexConversationSummaries(rows, uid))
        setSummariesError(null)
      },
      (err) => {
        emitFirebaseError(err)
        setSummariesError(err instanceof Error ? err.message : t('errors.summaryDisconnected'))
      },
    )
  }, [uid, t])

  const handleBurnDestroyed = useCallback((/** @type {MuhabereMessage} */ msg) => {
    setBurnGhosts((prev) => ({
      ...prev,
      [msg.id]: { ...msg, destroyed: true, text: '' },
    }))
  }, [])

  useEffect(() => {
    if (!uid) {
      setHiddenMessageIds(new Set())
      return undefined
    }

    return subscribeHiddenMuhabereMessageIds(
      uid,
      (ids) => setHiddenMessageIds(ids),
      (err) => emitFirebaseError(err),
    )
  }, [uid])

  useEffect(() => {
    if (!uid) {
      setArchivedChannelIds(new Set())
      return undefined
    }

    return subscribeArchivedMuhabereChannelIds(
      uid,
      (ids) => setArchivedChannelIds(ids),
      (err) => emitFirebaseError(err),
    )
  }, [uid])

  useEffect(() => {
    if (!uid) {
      setDeletedChannelIds(new Set())
      return undefined
    }

    return subscribeDeletedMuhabereChannelIds(
      uid,
      (ids) => setDeletedChannelIds(ids),
      (err) => emitFirebaseError(err),
    )
  }, [uid])

  useEffect(() => {
    if (!uid) {
      setArchivedDmIds(new Set())
      return undefined
    }

    return subscribeArchivedMuhabereDmIds(
      uid,
      (ids) => setArchivedDmIds(ids),
      (err) => emitFirebaseError(err),
    )
  }, [uid])

  useEffect(() => {
    if (!uid) {
      setDeletedDmIds(new Set())
      return undefined
    }

    return subscribeDeletedMuhabereDmIds(
      uid,
      (ids) => setDeletedDmIds(ids),
      (err) => emitFirebaseError(err),
    )
  }, [uid])

  const handleHideMessage = useCallback(
    async (/** @type {string} */ messageId) => {
      if (!uid || hidingMessageId) return
      const mid = String(messageId ?? '').trim()
      if (!mid) return

      setHidingMessageId(mid)
      setHiddenMessageIds((prev) => new Set([...prev, mid]))
      try {
        await hideMuhabereMessageForUser(uid, mid)
      } catch (err) {
        setHiddenMessageIds((prev) => {
          const next = new Set(prev)
          next.delete(mid)
          return next
        })
        emitFirebaseError(err)
      } finally {
        setHidingMessageId(null)
      }
    },
    [uid, hidingMessageId],
  )

  const stopTyping = useCallback(() => {
    if (typingStopRef.current) {
      window.clearTimeout(typingStopRef.current)
      typingStopRef.current = null
    }
    if (!typingActiveRef.current || !chatId || !uid) return
    typingActiveRef.current = false
    void setChatTypingStatus(chatId, uid, false)
  }, [chatId, uid])

  const extendTyping = useCallback(() => {
    if (!chatId || !uid) return
    if (typingStopRef.current) window.clearTimeout(typingStopRef.current)
    if (!typingActiveRef.current) {
      typingActiveRef.current = true
      void setChatTypingStatus(chatId, uid, true)
    }
    typingStopRef.current = window.setTimeout(() => {
      stopTyping()
    }, 2000)
  }, [chatId, uid, stopTyping])

  const handleDraftChange = useCallback(
    (/** @type {string} */ value) => {
      setDraft(value)
      if (!chatId || !uid) return
      if (!value.trim()) {
        stopTyping()
        return
      }
      extendTyping()
    },
    [chatId, uid, stopTyping, extendTyping],
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
      setRosterError(err instanceof Error ? err.message : t('errors.rosterLoadFailed'))
      setRoster([])
      return []
    } finally {
      setRosterLoading(false)
    }
  }, [uid, t])

  useEffect(() => {
    if (!uid) {
      setRoster([])
      setRosterLoading(false)
      return undefined
    }

    let active = true

    loadRoster().then((rows) => {
      if (!active) return
      setSelectedUid((prev) => {
        if (peerTarget && rows.some((c) => c.uid === peerTarget)) return peerTarget
        if (prev && rows.some((c) => c.uid === prev)) return prev
        return null
      })
      if (peerFromNav?.peerId) {
        navigate('/mesajlar', { replace: true, state: {} })
      }
      if (peerFromQuery) {
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev)
            next.delete('peer')
            return next
          },
          { replace: true },
        )
      }
    })

    return () => {
      active = false
    }
  }, [uid, peerTarget, peerFromNav?.peerId, peerFromQuery, navigate, loadRoster, setSearchParams])

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
          setSearchError(err instanceof Error ? err.message : t('errors.searchFailed'))
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
  }, [uid, searchTrimmed, isSearchMode, t])

  useEffect(() => {
    if (selectedUid) {
      markDmPeerAsRead(selectedUid)
    }
  }, [selectedUid, markDmPeerAsRead])

  useEffect(() => {
    setActivePeerUid(selectedUid)
    return () => setActivePeerUid(null)
  }, [selectedUid, setActivePeerUid])

  useEffect(() => {
    setActiveChannelId(selectedChannelId)
    return () => setActiveChannelId(null)
  }, [selectedChannelId, setActiveChannelId])

  const selectOperator = useCallback((/** @type {string} */ contactUid) => {
    if (!rosterUidSet.has(contactUid)) return
    setSearchQuery('')
    setSelectedChannelId(null)
    setSelectedUid(contactUid)
    markDmPeerAsRead(contactUid)
  }, [rosterUidSet, markDmPeerAsRead])

  const selectChannel = useCallback(
    (/** @type {string} */ channelId) => {
      const cid = String(channelId ?? '').trim()
      if (!cid) return

      setSearchQuery('')
      setSelectedUid(null)
      setSelectedChannelId(cid)
      markChannelAsRead(cid)
    },
    [markChannelAsRead],
  )

  const clearChannelSelection = useCallback(
    (/** @type {string} */ channelId) => {
      if (selectedChannelId !== channelId) return
      setSelectedChannelId(null)
    },
    [selectedChannelId],
  )

  const clearDmSelection = useCallback(
    (/** @type {string} */ peerUid) => {
      if (selectedUid !== peerUid) return
      setSelectedUid(null)
    },
    [selectedUid],
  )

  const handleArchiveChannel = useCallback(
    async (/** @type {MuhabereChannel} */ channel) => {
      if (!uid || archivingChannelId) return
      const cid = String(channel.id ?? '').trim()
      if (!cid) return

      setArchivingChannelId(cid)
      setArchivedChannelIds((prev) => new Set([...prev, cid]))
      try {
        await archiveMuhabereChannelForUser(uid, cid)
        clearChannelSelection(cid)
      } catch (err) {
        setArchivedChannelIds((prev) => {
          const next = new Set(prev)
          next.delete(cid)
          return next
        })
        emitFirebaseError(err)
      } finally {
        setArchivingChannelId(null)
      }
    },
    [uid, archivingChannelId, clearChannelSelection],
  )

  const handleUnarchiveChannel = useCallback(
    async (/** @type {MuhabereChannel} */ channel) => {
      if (!uid || unarchivingChannelId) return
      const cid = String(channel.id ?? '').trim()
      if (!cid) return

      setUnarchivingChannelId(cid)
      setArchivedChannelIds((prev) => {
        const next = new Set(prev)
        next.delete(cid)
        return next
      })
      try {
        await unarchiveMuhabereChannelForUser(uid, cid)
      } catch (err) {
        setArchivedChannelIds((prev) => new Set([...prev, cid]))
        emitFirebaseError(err)
      } finally {
        setUnarchivingChannelId(null)
      }
    },
    [uid, unarchivingChannelId],
  )

  const handleDeleteChannel = useCallback(
    async (/** @type {MuhabereChannel} */ channel) => {
      if (!uid || deletingChannelId) return
      const cid = String(channel.id ?? '').trim()
      if (!cid) return

      setDeletingChannelId(cid)
      setDeletedChannelIds((prev) => new Set([...prev, cid]))
      setArchivedChannelIds((prev) => {
        const next = new Set(prev)
        next.delete(cid)
        return next
      })
      try {
        await leaveMuhabereChannel(uid, cid)
        await deleteMuhabereChannelForUser(uid, cid)
        clearChannelSelection(cid)
        pushSystemToast(t('toast.leftGroup', { name: channel.name.toUpperCase() }))
      } catch (err) {
        setDeletedChannelIds((prev) => {
          const next = new Set(prev)
          next.delete(cid)
          return next
        })
        emitFirebaseError(err)
      } finally {
        setDeletingChannelId(null)
      }
    },
    [uid, deletingChannelId, clearChannelSelection, pushSystemToast],
  )

  const handleDestroyChannel = useCallback(
    async (/** @type {MuhabereChannel} */ channel) => {
      if (!uid || destroyingChannelId) return
      const cid = String(channel.id ?? '').trim()
      if (!cid) return

      setDestroyingChannelId(cid)
      setDeletedChannelIds((prev) => new Set([...prev, cid]))
      try {
        await deleteMuhabereChannel(cid, uid)
        await deleteMuhabereChannelForUser(uid, cid)
        clearChannelSelection(cid)
        setChannels((prev) => prev.filter((c) => c.id !== cid))
        pushSystemToast(t('toast.channelDeleted', { name: channel.name.toUpperCase() }))
      } catch (err) {
        setDeletedChannelIds((prev) => {
          const next = new Set(prev)
          next.delete(cid)
          return next
        })
        emitFirebaseError(err)
      } finally {
        setDestroyingChannelId(null)
      }
    },
    [uid, destroyingChannelId, clearChannelSelection, pushSystemToast],
  )

  const handleRemoveChannelMember = useCallback(
    async (/** @type {string} */ memberUid) => {
      if (!uid || !selectedChannelId || removingChannelMemberUid) return
      const target = String(memberUid ?? '').trim()
      const cid = String(selectedChannelId ?? '').trim()
      if (!target || !cid) return
      if (selectedChannel?.createdBy !== uid) return

      setRemovingChannelMemberUid(target)
      try {
        await removeMuhabereChannelMember(cid, target)
        pushSystemToast(t('toast.memberRemoved'))
      } catch (err) {
        emitFirebaseError(err)
      } finally {
        setRemovingChannelMemberUid(null)
      }
    },
    [uid, selectedChannelId, selectedChannel?.createdBy, removingChannelMemberUid, pushSystemToast],
  )

  const handleArchiveDm = useCallback(
    async (/** @type {MuhabereContact} */ contact) => {
      if (!uid || archivingDmUid) return
      const peer = String(contact.uid ?? '').trim()
      if (!peer) return

      setArchivingDmUid(peer)
      setArchivedDmIds((prev) => new Set([...prev, peer]))
      try {
        await archiveMuhabereDmForUser(uid, peer)
        clearDmSelection(peer)
      } catch (err) {
        setArchivedDmIds((prev) => {
          const next = new Set(prev)
          next.delete(peer)
          return next
        })
        emitFirebaseError(err)
      } finally {
        setArchivingDmUid(null)
      }
    },
    [uid, archivingDmUid, clearDmSelection],
  )

  const handleUnarchiveDm = useCallback(
    async (/** @type {MuhabereContact} */ contact) => {
      if (!uid || unarchivingDmUid) return
      const peer = String(contact.uid ?? '').trim()
      if (!peer) return

      setUnarchivingDmUid(peer)
      setArchivedDmIds((prev) => {
        const next = new Set(prev)
        next.delete(peer)
        return next
      })
      try {
        await unarchiveMuhabereDmForUser(uid, peer)
      } catch (err) {
        setArchivedDmIds((prev) => new Set([...prev, peer]))
        emitFirebaseError(err)
      } finally {
        setUnarchivingDmUid(null)
      }
    },
    [uid, unarchivingDmUid],
  )

  const handleDeleteDm = useCallback(
    async (/** @type {MuhabereContact} */ contact) => {
      if (!uid || deletingDmUid) return
      const peer = String(contact.uid ?? '').trim()
      if (!peer) return

      setDeletingDmUid(peer)
      setDeletedDmIds((prev) => new Set([...prev, peer]))
      setArchivedDmIds((prev) => {
        const next = new Set(prev)
        next.delete(peer)
        return next
      })
      try {
        await deleteMuhabereDmForUser(uid, peer)
        clearDmSelection(peer)
      } catch (err) {
        setDeletedDmIds((prev) => {
          const next = new Set(prev)
          next.delete(peer)
          return next
        })
        emitFirebaseError(err)
      } finally {
        setDeletingDmUid(null)
      }
    },
    [uid, deletingDmUid, clearDmSelection],
  )

  const handleBlockUser = useCallback(
    async (/** @type {MuhabereContact} */ contact) => {
      if (!uid || blockingUid) return
      const peer = String(contact.uid ?? '').trim()
      if (!peer) return

      setBlockingUid(peer)
      try {
        await blockMuhabereUser(uid, peer)
        await deleteMuhabereDmForUser(uid, peer)
        clearDmSelection(peer)
        setRoster((prev) => prev.filter((c) => c.uid !== peer))
        pushSystemToast(t('toast.blocked', { callsign: contact.callsign.toUpperCase() }))
      } catch (err) {
        emitFirebaseError(err)
      } finally {
        setBlockingUid(null)
      }
    },
    [uid, blockingUid, clearDmSelection, pushSystemToast],
  )

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
        setChannelsError(err instanceof Error ? err.message : t('errors.channelsLoadFailed'))
        setChannelsLoading(false)
      },
    )

    return unsub
  }, [uid, t])

  const handleSendRequest = async (/** @type {MuhabereContact} */ contact) => {
    if (!uid || sendingRequestUid || pendingSentUids.has(contact.uid)) return
    setSendingRequestUid(contact.uid)
    try {
      await sendMuhabereContactRequest(uid, contact.uid)
      setPendingSentUids((prev) => new Set([...prev, contact.uid]))
      pushSystemToast(t('toast.requestSent', { callsign: contact.callsign.toUpperCase() }))
    } catch (err) {
      emitFirebaseError(err)
      pushSystemToast(muhabereRequestErrorMessageDisplay(err).toUpperCase())
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
      pushSystemToast(t('toast.connectionApproved', { callsign: contact.callsign.toUpperCase() }))
    } catch (err) {
      emitFirebaseError(err)
      pushSystemToast(muhabereRequestErrorMessageDisplay(err).toUpperCase())
    } finally {
      setRequestBusyId(null)
    }
  }

  const handleRejectRequest = async (/** @type {MuhabereContactRequest} */ req) => {
    if (!uid || requestBusyId) return
    setRequestBusyId(req.id)
    try {
      await rejectMuhabereContactRequest(uid, req.id)
      pushSystemToast(t('toast.requestRejected'))
    } catch (err) {
      emitFirebaseError(err)
      pushSystemToast(muhabereRequestErrorMessageDisplay(err).toUpperCase())
    } finally {
      setRequestBusyId(null)
    }
  }

  useEffect(() => {
    if (conversationMode !== 'dm' || !chatId || !selectedUid) {
      setPeerTyping(false)
      return undefined
    }
    return subscribeChatTypingStatus(
      chatId,
      selectedUid,
      (typing) => {
        if (peerTypingHideRef.current) {
          window.clearTimeout(peerTypingHideRef.current)
          peerTypingHideRef.current = null
        }
        if (typing) {
          setPeerTyping(true)
          return
        }
        peerTypingHideRef.current = window.setTimeout(() => {
          setPeerTyping(false)
          peerTypingHideRef.current = null
        }, 400)
      },
      (err) => emitFirebaseError(err),
    )
  }, [chatId, selectedUid, conversationMode])

  useEffect(() => {
    setBurnGhosts({})
    setBurnMode(false)
    typingActiveRef.current = false
    return () => {
      if (typingStopRef.current) window.clearTimeout(typingStopRef.current)
      if (peerTypingHideRef.current) window.clearTimeout(peerTypingHideRef.current)
      if (chatId && uid && conversationMode === 'dm') void setChatTypingStatus(chatId, uid, false)
    }
  }, [chatId, selectedUid, uid, conversationMode])

  useEffect(() => {
    if (compact) return undefined
    if (!selectedUid && !selectedChannelId) return undefined
    const id = window.requestAnimationFrame(() => {
      messageInputRef.current?.focus()
    })
    return () => window.cancelAnimationFrame(id)
  }, [compact, selectedUid, selectedChannelId])

  const focusMessageInput = () => {
    window.requestAnimationFrame(() => {
      messageInputRef.current?.focus()
    })
  }

  const handleMessageSent = useCallback(() => {
    focusMessageInput()
    if (conversationMode === 'channel' && selectedChannelId) {
      markChannelAsRead(selectedChannelId)
    }
  }, [conversationMode, selectedChannelId, markChannelAsRead])

  const handleSend = async (e) => {
    e.preventDefault()
    const text = draft.trim()
    if (!text || !uid || !threadId || sending || uploadProgress != null) return

    setSending(true)
    setSendError(null)
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
      if (conversationMode === 'dm' && chatId) stopTyping()
      sentOk = true
    } catch (err) {
      const message = err instanceof Error ? err.message : t('errors.sendFailed')
      if (isMuhabereContentViolationMessage(message)) {
        pushSystemToast(muhabereContentViolationMessage())
      } else {
        emitFirebaseError(err)
      }
      setSendError(isMuhabereContentViolationMessage(message) ? muhabereContentViolationMessage() : message)
    } finally {
      setSending(false)
      if (sentOk) focusMessageInput()
    }
  }

  const sortedActiveRoster = useMemo(
    () => sortMuhabereContactsByRecency(activeRoster, conversationIndex, uid),
    [activeRoster, conversationIndex, uid],
  )

  const listLoading = isSearchMode ? searchLoading : rosterLoading
  const listError = isSearchMode ? searchError : rosterError
  const listItems = isSearchMode ? searchResults : sortedActiveRoster

  const dmAlertsBusy = Boolean(archivingDmUid || deletingDmUid || blockingUid)
  const closeDmAlerts = () => {
    if (dmAlertsBusy) return
    setDmArchiveTarget(null)
    setDmDeleteTarget(null)
    setDmBlockTarget(null)
  }

  const emptyMessage = isSearchMode
    ? searchTrimmed.length < 2
      ? t('search.minChars')
      : t('search.noResults')
    : t('chat.rosterEmpty')

  const showChannelsPanel = sidebarTab === 'channels'
  const showOperatorsPanel = sidebarTab === 'operators'

  const totalActiveChannelUnread = useMemo(() => {
    return activeChannels.reduce((sum, ch) => {
      const isActiveRow = isActiveChannelRow(openChannelId, ch.id)
      if (isActiveRow) return sum
      return sum + resolveChannelUnread(ch.id, false)
    }, 0)
  }, [activeChannels, openChannelId, resolveChannelUnread])

  const totalActiveDmUnread = useMemo(() => {
    return activeRoster.reduce((sum, contact) => {
      const isActiveRow =
        selectedUid != null &&
        selectedUid !== '' &&
        contact.uid === selectedUid &&
        selectedChannelId == null
      if (isActiveRow) return sum
      return sum + resolveDmUnread(contact.uid, false)
    }, 0)
  }, [activeRoster, selectedUid, selectedChannelId, resolveDmUnread])

  const showChannelsTabUnread = sidebarTab === 'operators' && totalActiveChannelUnread > 0
  const showOperatorsTabUnread = sidebarTab === 'channels' && totalActiveDmUnread > 0

  return (
    <div
      className={[
        'muhabere-page mx-auto flex w-full max-w-[1200px] flex-col font-mono',
        compact
          ? hasConversation
            ? 'muhabere-page--chat min-h-0 flex-1 overflow-hidden'
            : 'muhabere-page--roster min-h-0 flex-1 overflow-hidden'
          : 'h-full min-h-0 flex-1 overflow-hidden',
      ].join(' ')}
    >
      {!compact || !hasConversation ? (
        <header className="shrink-0 border-b border-zinc-800 pb-2 sm:pb-4">
          <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-zinc-500 sm:text-[10px] sm:tracking-[0.32em]">
            {t('header.badge')}
          </p>
          <h1 className="mt-0.5 text-base font-semibold uppercase tracking-wide text-zinc-100 sm:mt-1 sm:text-xl lg:text-2xl">
            {t('header.title')}
          </h1>
          <p className="mt-0.5 text-[11px] text-zinc-500 sm:mt-1 sm:text-xs">{t('header.subtitle')}</p>
        </header>
      ) : null}

      <div
        className={[
          'flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-zinc-800/90 bg-[#0a0b0d] lg:flex-row',
          compact ? (hasConversation ? 'mt-0' : 'mt-2') : 'mt-3 sm:mt-4',
        ].join(' ')}
      >
        <aside
          className={[
            'flex h-full min-h-0 shrink-0 flex-col overflow-hidden border-r border-zinc-800/90 bg-[#0a0b0d]',
            compact ? (showMobileRoster ? 'w-full min-w-0' : 'hidden') : 'w-72',
          ].join(' ')}
        >
          <div
            className="flex shrink-0 border-b border-zinc-800/80"
            role="tablist"
            aria-label={t('header.tabsAria')}
          >
            <button
              type="button"
              role="tab"
              id="muhabere-tab-channels"
              aria-selected={sidebarTab === 'channels'}
              aria-controls="muhabere-panel-channels"
              onClick={() => setSidebarTab('channels')}
              className={[
                'flex flex-1 items-center justify-center gap-1.5 border-b-2 px-3 py-2.5 font-mono-technical text-[10px] font-bold uppercase tracking-[0.18em] transition',
                showChannelsTabUnread ? 'muhabere-unread-pulse' : '',
                sidebarTab === 'channels'
                  ? 'border-amber-500 text-zinc-100'
                  : 'border-transparent text-zinc-500 hover:text-zinc-400',
              ].join(' ')}
            >
              <span className="truncate">{t('tabs.channels')}</span>
              {showChannelsTabUnread ? <MuhabereUnreadBadge count={totalActiveChannelUnread} /> : null}
            </button>
            <button
              type="button"
              role="tab"
              id="muhabere-tab-operators"
              aria-selected={sidebarTab === 'operators'}
              aria-controls="muhabere-panel-operators"
              onClick={() => setSidebarTab('operators')}
              className={[
                'flex flex-1 items-center justify-center gap-1.5 border-b-2 px-3 py-2.5 font-mono-technical text-[10px] font-bold uppercase tracking-[0.18em] transition',
                showOperatorsTabUnread ? 'muhabere-unread-pulse' : '',
                sidebarTab === 'operators'
                  ? 'border-amber-500 text-zinc-100'
                  : 'border-transparent text-zinc-500 hover:text-zinc-400',
              ].join(' ')}
            >
              <span className="truncate">{t('tabs.operators')}</span>
              {showOperatorsTabUnread ? <MuhabereUnreadBadge count={totalActiveDmUnread} /> : null}
            </button>
          </div>

          <div
            id="muhabere-panel-channels"
            role="tabpanel"
            aria-labelledby="muhabere-tab-channels"
            hidden={!showChannelsPanel}
            className={[
              'min-h-0 flex-col overflow-hidden',
              showChannelsPanel ? 'flex flex-1' : 'hidden',
            ].join(' ')}
          >
            <ChatList
              uid={uid}
              channels={activeChannels}
              totalChannelCount={channels.length}
              channelsLoading={channelsLoading}
              channelsError={channelsError}
              selectedChannelId={selectedChannelId}
              archivingChannelId={archivingChannelId}
              deletingChannelId={deletingChannelId}
              destroyingChannelId={destroyingChannelId}
              editingChannelId={editChannelTarget?.id ?? null}
              channelUnreadById={channelUnreadById}
              openChannelId={openChannelId}
              resolveChannelUnread={resolveChannelUnread}
              onSelectChannel={selectChannel}
              onArchiveChannel={handleArchiveChannel}
              onDeleteChannel={handleDeleteChannel}
              onLeaveChannel={handleDeleteChannel}
              onEditChannel={(channel) => setEditChannelTarget(channel)}
              onDestroyChannel={handleDestroyChannel}
              onCreateChannel={() => setShowCreateChannel(true)}
              conversationIndex={conversationIndex}
              summariesError={summariesError}
              fillHeight
            />
          </div>

          <div
            id="muhabere-panel-operators"
            role="tabpanel"
            aria-labelledby="muhabere-tab-operators"
            hidden={!showOperatorsPanel}
            className={[
              'min-h-0 flex-col overflow-hidden',
              showOperatorsPanel ? 'flex flex-1' : 'hidden',
            ].join(' ')}
          >
            <div className="shrink-0 border-b border-zinc-800/80 px-3 py-2.5">
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
                  placeholder={t('search.placeholder')}
                  className="w-full rounded-md border border-zinc-700/90 bg-zinc-950 py-2 pl-9 pr-3 font-mono text-sm text-zinc-300 outline-none transition placeholder:text-zinc-600 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20"
                  autoComplete="off"
                  spellCheck={false}
                />
              </label>
            </div>

          {incomingRequests.length > 0 ? (
            <div className="shrink-0 border-b border-zinc-800 px-4 py-3">
              <h3 className="mb-2 border-b border-zinc-800 pb-1 font-mono text-xs tracking-widest text-zinc-500">
                {t('requests.title')}
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
                            t('requests.accept')
                          )}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleRejectRequest(req)}
                          className="flex-1 rounded border border-transparent px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-red-500 transition hover:bg-red-900/30 disabled:opacity-40"
                        >
                          {t('requests.reject')}
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          ) : null}

          {listLoading ? (
            <div className="flex flex-1 items-center justify-center gap-2 text-zinc-500">
              <Loader2 className="size-4 animate-spin text-lime-400/80" aria-hidden />
              <span className="text-xs">{isSearchMode ? t('search.scanning') : t('chat.rosterLoading')}</span>
            </div>
          ) : listError ? (
            <p className="flex-1 px-4 py-6 text-xs text-red-400/90">{listError}</p>
          ) : listItems.length === 0 ? (
            <p className="flex-1 px-4 py-6 text-xs leading-relaxed text-zinc-600">{emptyMessage}</p>
          ) : (
            <ul
              className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2"
              role="listbox"
              aria-label={isSearchMode ? t('search.resultsAria') : t('chat.rosterAria')}
            >
              {listItems.map((contact) => {
                const isActiveRow =
                  !isSearchMode &&
                  selectedUid != null &&
                  selectedUid !== '' &&
                  contact.uid === selectedUid &&
                  selectedChannelId == null
                const dmUnread = isActiveRow ? 0 : resolveDmUnread(contact.uid, isActiveRow)
                const dmSummary = resolveContactConversationSummary(conversationIndex, uid, contact.uid)
                const hasUnread = !isActiveRow && dmUnread > 0
                const presence = presenceMap[contact.uid]
                const inRoster = rosterUidSet.has(contact.uid)
                const showRequest = isSearchMode && !inRoster
                const requestSent = pendingSentUids.has(contact.uid)
                const isSending = sendingRequestUid === contact.uid

                return (
                  <li key={contact.uid}>
                    <div
                      className={[
                        'flex w-full items-stretch gap-1 rounded-md border-l-2',
                        hasUnread && !isSearchMode
                          ? 'muhabere-unread-pulse border-l-transparent'
                          : 'border-l-transparent',
                        isActiveRow ? 'bg-zinc-800/80' : 'hover:bg-amber-500/[0.06]',
                      ].join(' ')}
                    >
                      {showRequest ? (
                        <div className="flex min-w-0 flex-1 items-start gap-3 px-2.5 py-3">
                          <OperatorAvatar
                            uid={contact.uid}
                            size="sm"
                            callsign={contact.callsign}
                            username={contact.username}
                            photoUrl={contact.photoURL ?? undefined}
                            className="mt-0.5"
                          />
                          <div className="min-w-0 flex-1">
                            <CallsignProfileTrigger
                              callsign={contact.callsign}
                              operatorUid={contact.uid}
                              onOpenProfile={setProfileUid}
                            />
                            <p className="mt-0.5 text-[10px] uppercase tracking-wider text-zinc-500">
                              {messagesRoleLabel(contact.role)}
                              {contact.username ? ` · @${contact.username}` : ''}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          role="option"
                          aria-selected={isActiveRow}
                          onClick={() => selectOperator(contact.uid)}
                          className="flex min-w-0 flex-1 items-center gap-3 px-2.5 py-3 text-left"
                        >
                          <OperatorAvatar
                            uid={contact.uid}
                            size="sm"
                            callsign={contact.callsign}
                            username={contact.username}
                            photoUrl={contact.photoURL ?? undefined}
                            signal={hasUnread}
                            online={inRoster ? presence?.online : null}
                          />
                          <div className="min-w-0 flex-1">
                            <span className="flex items-center justify-between gap-2">
                              <CallsignProfileTrigger
                                callsign={contact.callsign}
                                operatorUid={contact.uid}
                                onOpenProfile={setProfileUid}
                                className={isActiveRow ? 'text-amber-300' : hasUnread ? 'text-amber-100' : 'text-zinc-200'}
                              />
                              {dmSummary?.lastMessageAt ? (
                                <span className="shrink-0 text-[9px] text-zinc-600">
                                  {formatConversationPreviewTime(dmSummary.lastMessageAt)}
                                </span>
                              ) : null}
                            </span>
                            <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[10px] uppercase tracking-wider text-zinc-500">
                              {inRoster ? (
                                <PresenceIndicator
                                  online={presence?.online ?? false}
                                  label={presence?.label}
                                />
                              ) : null}
                              {inRoster ? <span aria-hidden>·</span> : null}
                          <span className="truncate">{messagesRoleLabel(contact.role)}</span>
                            </p>
                            {dmSummary?.lastMessage ? (
                              <p className="mt-0.5 truncate text-[9px] normal-case tracking-normal text-zinc-500">
                                {dmSummary.lastSender ? `${dmSummary.lastSender}: ` : ''}
                                {formatMuhabereMessagePreviewDisplay(dmSummary.lastMessage)}
                              </p>
                            ) : null}
                          </div>
                          {hasUnread ? <MuhabereUnreadBadge count={dmUnread} /> : null}
                        </button>
                      )}

                      {showRequest ? (
                        requestSent ? (
                          <span className="shrink-0 self-center px-1 py-1 text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                            {t('requests.sent')}
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={isSending}
                            onClick={() => handleSendRequest(contact)}
                            className="inline-flex shrink-0 self-center items-center gap-1 rounded border border-transparent px-1.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-400 transition hover:border-amber-500/30 hover:bg-amber-950/40 disabled:opacity-40"
                            aria-label={t('requests.sendAria', { callsign: contact.callsign })}
                          >
                            {isSending ? (
                              <Loader2 className="size-3.5 animate-spin" aria-hidden />
                            ) : (
                              <>
                                <UserPlus className="size-3.5" strokeWidth={2.25} aria-hidden />
                                <span className="hidden truncate sm:inline">{t('requests.send')}</span>
                              </>
                            )}
                          </button>
                        )
                      ) : null}

                      {!isSearchMode ? (
                        <MuhabereConversationMenu
                          variant="dm"
                          archiveBusy={archivingDmUid === contact.uid}
                          deleteBusy={deletingDmUid === contact.uid}
                          blockBusy={blockingUid === contact.uid}
                          onArchive={() => setDmArchiveTarget(contact)}
                          onDelete={() => setDmDeleteTarget(contact)}
                          onBlock={() => setDmBlockTarget(contact)}
                          menuLabel={t('menu.dmMenuLabel', { callsign: contact.callsign })}
                        />
                      ) : null}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}

          {!isSearchMode ? (
            <MuhabereArchiveSection
              archivedChannels={archivedChannels}
              archivedContacts={archivedContacts}
              selectedChannelId={selectedChannelId}
              selectedUid={selectedUid}
              channelUnreadById={channelUnreadById}
              dmUnreadByPeerId={dmUnreadByPeerId}
              presenceMap={presenceMap}
              onSelectChannel={selectChannel}
              onSelectContact={selectOperator}
              onUnarchiveChannel={handleUnarchiveChannel}
              onUnarchiveContact={handleUnarchiveDm}
              unarchivingChannelId={unarchivingChannelId}
              unarchivingDmUid={unarchivingDmUid}
            />
          ) : null}
          </div>
        </aside>

        <section
          className={[
            'flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#0a0b0d]',
            compact && !showMobileChat ? 'hidden' : '',
          ].join(' ')}
        >
          {!hasConversation ? (
            <MuhabereEmptyState hasContacts={roster.length > 0 || channels.length > 0} />
          ) : (
            <ChatWindow
              uid={uid}
              mode={conversationMode}
              refId={threadId}
              channelId={conversationMode === 'channel' ? (selectedChannelId ?? '') : ''}
              chatId={conversationMode === 'dm' ? chatId : ''}
              peerUid={conversationMode === 'dm' ? (selectedUid ?? '') : ''}
              peerTyping={peerTyping}
              peerCallsign={selected?.callsign ?? t('chat.defaultPeer')}
              senderNames={senderNames}
              burnGhosts={burnGhosts}
              hiddenMessageIds={hiddenMessageIds}
              onBurnDestroyed={handleBurnDestroyed}
              onHideMessage={handleHideMessage}
              hidingMessageId={hidingMessageId}
              header={
              <header className="flex shrink-0 items-center gap-2 border-b border-zinc-800/90 bg-[#0a0b0d] px-2 py-2 sm:gap-3 sm:px-4 sm:py-3">
                {compact && hasConversation ? (
                  <button
                    type="button"
                    onClick={clearMobileConversation}
                    className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-zinc-700 bg-zinc-900 text-zinc-300 transition hover:border-amber-500/40 hover:text-amber-300"
                    aria-label={t('chat.backToList')}
                  >
                    <ChevronLeft className="size-4" strokeWidth={2} aria-hidden />
                  </button>
                ) : null}
                {conversationMode === 'channel' ? (
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-zinc-700 bg-zinc-900 sm:size-10">
                    <Radio className="size-4 text-amber-400 sm:size-5" strokeWidth={1.75} aria-hidden />
                  </div>
                ) : (
                  <OperatorAvatar
                    uid={selected?.uid}
                    size={compact ? 'sm' : 'md'}
                    callsign={selected?.callsign}
                    username={selected?.username}
                    photoUrl={selected?.photoURL ?? undefined}
                    online={selectedUid ? presenceMap[selectedUid]?.online : null}
                    className="rounded-md"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold uppercase tracking-wide text-zinc-100 sm:text-sm">
                    {conversationMode === 'channel'
                      ? selectedChannel?.name ?? t('channels.defaultName')
                      : selected?.callsign}
                  </p>
                  <p className="flex flex-wrap items-center gap-x-1.5 text-[10px] uppercase tracking-wider text-zinc-500">
                    {conversationMode === 'channel' ? (
                      <span className="truncate">{t('chat.teamChannel', { count: selectedChannel?.members.length ?? 0 })}</span>
                    ) : (
                      <PresenceIndicator
                        online={presenceMap[selectedUid]?.online ?? false}
                        label={presenceMap[selectedUid]?.label}
                      />
                    )}
                  </p>
                </div>
                {conversationMode === 'channel' ? (
                  <button
                    type="button"
                    onClick={() => setShowChannelMembers(true)}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 transition hover:border-amber-500/40 hover:text-amber-300"
                    aria-label={t('chat.showMembersAria')}
                    title={t('chat.showMembersTitle')}
                  >
                    <Users className="size-3.5" strokeWidth={2} aria-hidden />
                    <span className="hidden truncate sm:inline">{t('chat.showMembers')}</span>
                  </button>
                ) : null}
              </header>
              }
              footer={
              <footer className="shrink-0 border-t border-zinc-800/90 bg-[#0a0b0d] p-2 sm:p-4">
                {uploadProgress != null ? (
                  <div className="mb-3 rounded-md border border-lime-500/30 bg-lime-950/30 px-3 py-2">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-lime-400">
                      {t('chat.uploadProgress', { progress: uploadProgress })}
                    </p>
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-zinc-800">
                      <div
                        className="h-full bg-lime-500 transition-all duration-200"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                ) : null}
                <form onSubmit={handleSend} className="flex gap-1.5 sm:gap-2">
                  <MuhabereAttachMenu
                    threadId={threadId}
                    mode={conversationMode === 'channel' ? 'channel' : 'dm'}
                    uid={uid}
                    receiverId={selectedUid ?? ''}
                    disabled={sending || uploadProgress != null}
                    onUploadProgress={setUploadProgress}
                    onMessageSent={handleMessageSent}
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
                      aria-label={burnMode ? t('burn.modeActive') : t('burn.modeInactive')}
                      aria-pressed={burnMode}
                      title={t('burn.protocolTitle')}
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
                        ? t('burn.placeholder')
                        : t('chat.placeholder')
                    }
                    disabled={sending || uploadProgress != null}
                    autoFocus={!compact}
                    className={[
                      'min-w-0 flex-1 rounded-md border bg-zinc-900 px-2 py-1.5 font-mono text-xs text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:ring-1 disabled:opacity-50 sm:px-3 sm:py-2.5 sm:text-sm',
                      burnMode
                        ? 'border-red-600/70 focus:border-red-500 focus:ring-red-500/25'
                        : 'border-zinc-700 focus:border-amber-500/60 focus:ring-amber-500/25',
                    ].join(' ')}
                    autoComplete="off"
                  />
                  <button
                    type="submit"
                    disabled={!draft.trim() || sending || uploadProgress != null}
                    className="inline-flex shrink-0 items-center justify-center rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400 transition duration-200 hover:border-amber-500/40 hover:bg-amber-950/40 hover:text-amber-300 disabled:cursor-not-allowed disabled:opacity-40 sm:px-4 sm:py-2.5 sm:text-sm"
                    aria-label={t('chat.sendAria')}
                  >
                    {sending ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : (
                      <>
                        <span className="hidden truncate sm:inline">{t('chat.send')}</span>
                        <ChevronRight className="size-4" strokeWidth={2.5} aria-hidden />
                      </>
                    )}
                  </button>
                </form>
                {sendError ? (
                  <p className="mt-2 text-center text-xs text-red-400/90">{sendError}</p>
                ) : null}
              </footer>
              }
            />
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
          pushSystemToast(t('toast.teamChannelOpened'))
        }}
      />

      <EditChannelModal
        open={Boolean(editChannelTarget)}
        channelId={editChannelTarget?.id ?? ''}
        channelName={editChannelTarget?.name ?? ''}
        uid={uid}
        onClose={() => setEditChannelTarget(null)}
        onUpdated={(name) => {
          const cid = editChannelTarget?.id
          if (!cid) return
          setChannels((prev) => prev.map((c) => (c.id === cid ? { ...c, name } : c)))
          pushSystemToast(t('toast.channelUpdated'))
        }}
      />

      <MuhabereChannelMembersModal
        open={showChannelMembers}
        channel={selectedChannel}
        uid={uid}
        selfCallsign={userData?.callsign ?? user?.displayName ?? ''}
        contacts={roster}
        isCreator={selectedChannel?.createdBy === uid}
        removingMemberUid={removingChannelMemberUid}
        onClose={() => setShowChannelMembers(false)}
        onOpenProfile={(operatorUid) => {
          setShowChannelMembers(false)
          setProfileUid(operatorUid)
        }}
        onRemoveMember={handleRemoveChannelMember}
      />

      <TacticalAlert
        open={Boolean(dmArchiveTarget)}
        title={t('alerts.archiveDm.title')}
        message={t('alerts.archiveDm.message')}
        confirmLabel={t('alerts.archiveDm.confirm')}
        cancelLabel={t('alerts.cancel')}
        busy={Boolean(archivingDmUid)}
        onConfirm={() => {
          if (!dmArchiveTarget) return
          void handleArchiveDm(dmArchiveTarget).then(() => setDmArchiveTarget(null))
        }}
        onCancel={closeDmAlerts}
      />

      <TacticalAlert
        open={Boolean(dmDeleteTarget)}
        title={t('alerts.deleteDm.title')}
        message={t('alerts.deleteDm.message')}
        confirmLabel={t('alerts.deleteDm.confirm')}
        cancelLabel={t('alerts.cancel')}
        busy={Boolean(deletingDmUid)}
        onConfirm={() => {
          if (!dmDeleteTarget) return
          void handleDeleteDm(dmDeleteTarget).then(() => setDmDeleteTarget(null))
        }}
        onCancel={closeDmAlerts}
      />

      <TacticalAlert
        open={Boolean(dmBlockTarget)}
        title={t('alerts.blockUser.title')}
        message={t('alerts.blockUser.message')}
        confirmLabel={t('alerts.blockUser.confirm')}
        cancelLabel={t('alerts.cancel')}
        busy={Boolean(blockingUid)}
        onConfirm={() => {
          if (!dmBlockTarget) return
          void handleBlockUser(dmBlockTarget).then(() => setDmBlockTarget(null))
        }}
        onCancel={closeDmAlerts}
      />
    </div>
  )
}
