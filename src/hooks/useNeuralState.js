import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { useAuth } from '../context/AuthContext'
import { getAudazFunctions } from '../lib/cloudFunctions'
import { db, isFirebaseConfigured } from '../lib/firebase'
import { NEURAL_SOURCES } from '../lib/neural/neuralConfig'
import {
  applyDecay,
  computeNeuralState,
  normalizeEventBatches,
} from '../lib/neural/neuralEngine'
import { useAudazData } from './useAudazData'

export const NEURAL_READ_LIMIT = 2000

/**
 * @param {import('firebase/firestore').CollectionReference} colRef
 * @param {string} orderField
 * @param {number} max
 */
async function fetchLimitedCollection(colRef, orderField, max) {
  try {
    const q = query(colRef, orderBy(orderField, 'desc'), limit(max))
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  } catch {
    try {
      const snap = await getDocs(query(colRef, limit(max)))
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    } catch {
      return []
    }
  }
}

/**
 * Operatör Beyni — önce sunucu neural/state; yoksa istemci hesabı.
 * medevac_logs okunmaz.
 *
 * @param {{ nowMs?: number }} [opts]
 */
export function useNeuralState(opts = {}) {
  const { user } = useAuth()
  const uid = user?.uid ?? null
  const optsNow = opts.nowMs

  const range = useAudazData('range_logs')
  const vbss = useAudazData('vbss_logs')
  const tccc = useAudazData('tccc_logs')
  const trainings = useAudazData('trainings')
  const ballistic = useAudazData('ballistic_profiles')

  const [sessions, setSessions] = useState(/** @type {Record<string, unknown>[]} */ ([]))
  const [forumPosts, setForumPosts] = useState(/** @type {Record<string, unknown>[]} */ ([]))
  const [forumReplies, setForumReplies] = useState(/** @type {Record<string, unknown>[]} */ ([]))
  const [extraLoading, setExtraLoading] = useState(false)
  const [extraError, setExtraError] = useState(/** @type {string|null} */ (null))
  const [refreshTick, setRefreshTick] = useState(0)

  const [serverStored, setServerStored] = useState(/** @type {object|null|undefined} */ (undefined))
  const [serverLoading, setServerLoading] = useState(true)
  const [clockMs, setClockMs] = useState(() => Date.now())
  const ensureOnceRef = useRef(false)

  const nowMs = optsNow ?? clockMs

  // Dakikada bir now yenile (sönme okuma-anında)
  useEffect(() => {
    if (optsNow != null) return undefined
    const id = window.setInterval(() => setClockMs(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [optsNow])

  // uid değişince ensure tekrar denenebilir
  useEffect(() => {
    ensureOnceRef.current = false
  }, [uid])

  // Sunucu state dinle
  useEffect(() => {
    if (!uid || !isFirebaseConfigured() || !db) {
      setServerStored(null)
      setServerLoading(false)
      return undefined
    }
    setServerLoading(true)
    const ref = doc(db, 'users', uid, 'neural', 'state')
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setServerStored(snap.exists() ? snap.data() : null)
        setServerLoading(false)
      },
      () => {
        setServerStored(null)
        setServerLoading(false)
      },
    )
    return () => unsub()
  }, [uid])

  // State yok veya fullBuild değil → bir kez neuralEnsureState (sessiz)
  useEffect(() => {
    if (!uid || serverLoading || serverStored === undefined) return
    const needs =
      serverStored == null || /** @type {{ fullBuild?: boolean }} */ (serverStored).fullBuild !== true
    if (!needs || ensureOnceRef.current) return
    ensureOnceRef.current = true
    const functions = getAudazFunctions()
    if (!functions) return
    const fn = httpsCallable(functions, 'neuralEnsureState')
    void fn({}).catch(() => {
      /* network / permission — client-fallback sürer */
    })
  }, [uid, serverLoading, serverStored])

  const loadExtras = useCallback(async () => {
    if (!uid || !isFirebaseConfigured() || !db) {
      setSessions([])
      setForumPosts([])
      setForumReplies([])
      return
    }
    setExtraLoading(true)
    setExtraError(null)
    try {
      const sessCol = collection(db, 'users', uid, 'tacticalSessions')
      const sessDocs = await fetchLimitedCollection(sessCol, 'createdAt', NEURAL_READ_LIMIT)
      setSessions(sessDocs)

      let posts = []
      try {
        const postsQ = query(
          collection(db, 'forum_posts'),
          where('authorId', '==', uid),
          orderBy('timestamp', 'desc'),
          limit(Math.min(500, NEURAL_READ_LIMIT)),
        )
        const snap = await getDocs(postsQ)
        posts = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      } catch {
        const snap = await getDocs(
          query(collection(db, 'forum_posts'), orderBy('timestamp', 'desc'), limit(500)),
        )
        posts = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((p) => String(p.authorId ?? '') === uid)
      }
      setForumPosts(posts)

      let replies = []
      try {
        const rq = query(collection(db, 'forum_posts'), where('authorId', '==', uid), limit(50))
        const ownSnap = await getDocs(rq).catch(() => null)
        const postIds = ownSnap
          ? ownSnap.docs.map((d) => d.id)
          : posts.slice(0, 50).map((p) => String(p.id))
        for (const pid of postIds.slice(0, 40)) {
          const rSnap = await getDocs(
            query(
              collection(db, 'forum_posts', pid, 'replies'),
              orderBy('timestamp', 'desc'),
              limit(100),
            ),
          )
          for (const d of rSnap.docs) {
            const data = d.data()
            if (String(data.authorId ?? '') === uid) {
              replies.push({ id: d.id, ...data, createdAt: data.timestamp ?? data.createdAt })
            }
          }
        }
      } catch {
        /* replies opsiyonel */
      }
      setForumReplies(replies)
    } catch (err) {
      setExtraError(err instanceof Error ? err.message : String(err))
    } finally {
      setExtraLoading(false)
    }
  }, [uid])

  useEffect(() => {
    void loadExtras()
  }, [loadExtras, refreshTick])

  const domainError =
    range.listenError ||
    vbss.listenError ||
    tccc.listenError ||
    trainings.listenError ||
    ballistic.listenError ||
    extraError

  const { events, ignored, stats } = useMemo(() => {
    void refreshTick
    return normalizeEventBatches([
      { source: NEURAL_SOURCES.RANGE_LOGS, docs: range.items.slice(0, NEURAL_READ_LIMIT) },
      { source: NEURAL_SOURCES.VBSS_LOGS, docs: vbss.items.slice(0, NEURAL_READ_LIMIT) },
      { source: NEURAL_SOURCES.TCCC_LOGS, docs: tccc.items.slice(0, NEURAL_READ_LIMIT) },
      { source: NEURAL_SOURCES.TACTICAL_SESSIONS, docs: sessions.slice(0, NEURAL_READ_LIMIT) },
      { source: NEURAL_SOURCES.TRAININGS, docs: trainings.items.slice(0, NEURAL_READ_LIMIT) },
      {
        source: NEURAL_SOURCES.BALLISTIC_PROFILES,
        docs: ballistic.items.slice(0, NEURAL_READ_LIMIT),
      },
      { source: NEURAL_SOURCES.FORUM_POSTS, docs: forumPosts },
      { source: NEURAL_SOURCES.FORUM_REPLIES, docs: forumReplies },
    ])
  }, [
    range.items,
    vbss.items,
    tccc.items,
    sessions,
    trainings.items,
    ballistic.items,
    forumPosts,
    forumReplies,
    refreshTick,
  ])

  const clientState = useMemo(() => computeNeuralState(events, nowMs), [events, nowMs])

  const serverState = useMemo(() => {
    if (!serverStored) return null
    return applyDecay(serverStored, nowMs)
  }, [serverStored, nowMs])

  const source = serverStored ? 'server' : 'client-fallback'
  const state = serverState
    ? {
        regions: serverState.regions,
        streak: serverState.streak,
        lastActiveDay: serverState.lastActiveDay,
        totalLevel: serverState.totalLevel,
        eventLog: clientState.eventLog,
        nowMs,
      }
    : clientState

  const truncateWarn = useMemo(() => {
    const hits = []
    if (range.items.length >= NEURAL_READ_LIMIT) hits.push('range_logs')
    if (vbss.items.length >= NEURAL_READ_LIMIT) hits.push('vbss_logs')
    if (tccc.items.length >= NEURAL_READ_LIMIT) hits.push('tccc_logs')
    if (sessions.length >= NEURAL_READ_LIMIT) hits.push('tacticalSessions')
    return hits
  }, [range.items.length, vbss.items.length, tccc.items.length, sessions.length])

  const loading =
    serverLoading ||
    range.loading ||
    vbss.loading ||
    tccc.loading ||
    trainings.loading ||
    ballistic.loading ||
    extraLoading

  const refresh = useCallback(() => {
    setRefreshTick((n) => n + 1)
    void loadExtras()
  }, [loadExtras])

  return {
    state,
    clientState,
    serverState,
    serverStored: serverStored ?? null,
    source,
    events,
    ignored,
    stats,
    loading,
    error: domainError ? String(domainError) : null,
    refresh,
    truncateWarn,
    hasActivity: events.length > 0 || (serverStored?.eventCount ?? 0) > 0,
    /** Debug / ORS yan okumaları için ham koleksiyonlar */
    sources: {
      range: range.items,
      vbss: vbss.items,
      tccc: tccc.items,
      trainings: trainings.items,
      ballistic: ballistic.items,
      sessions,
      forumPosts,
      forumReplies,
    },
  }
}
