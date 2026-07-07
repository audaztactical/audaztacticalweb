import { useCallback, useEffect, useRef, useState } from 'react'
import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'
import { prepareAudazPatchPayload } from '../lib/audazFirestoreWrite'
import { db, isFirebaseConfigured } from '../lib/firebase'
import { emitFirebaseError } from '../lib/firebaseErrorBus'
import { safeOnSnapshot } from '../lib/firestoreSnapshot'
import {
  defaultSidebarGroupState,
  isSidebarGroupOpen,
  parseSidebarGroupState,
  toggleSidebarGroupState,
} from '../lib/sidebarGroupState'

const SAVE_DEBOUNCE_MS = 750

/**
 * Firestore users/{uid}.sidebarGroupState — debounced kalıcı sidebar grup accordion tercihi.
 */
export function useSidebarGroupState() {
  const { user } = useAuth()
  const uid = user?.uid ?? null

  const [groupState, setGroupState] = useState(defaultSidebarGroupState)
  const [loading, setLoading] = useState(true)
  const groupStateRef = useRef(groupState)
  const saveTimerRef = useRef(/** @type {ReturnType<typeof setTimeout> | null} */ (null))
  const uidRef = useRef(uid)

  groupStateRef.current = groupState
  uidRef.current = uid

  useEffect(() => {
    if (!uid || !isFirebaseConfigured() || !db) {
      setGroupState(defaultSidebarGroupState())
      setLoading(false)
      return undefined
    }

    setLoading(true)
    const ref = doc(db, 'users', uid)

    const unsub = safeOnSnapshot(
      ref,
      (snap) => {
        const raw = snap.exists() ? snap.data()?.sidebarGroupState : null
        setGroupState(parseSidebarGroupState(raw))
        setLoading(false)
      },
      (err) => {
        emitFirebaseError(err)
        setGroupState(defaultSidebarGroupState())
        setLoading(false)
      },
    )

    return unsub
  }, [uid])

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [])

  const flushSave = useCallback(async (/** @type {ReturnType<typeof defaultSidebarGroupState>} */ next) => {
    const activeUid = uidRef.current
    if (!activeUid || !isFirebaseConfigured() || !db) return

    try {
      const payload = prepareAudazPatchPayload({
        sidebarGroupState: next,
        updatedAt: serverTimestamp(),
      })
      await setDoc(doc(db, 'users', activeUid), payload, { merge: true })
    } catch (err) {
      emitFirebaseError(err)
    }
  }, [])

  const scheduleSave = useCallback(
    (/** @type {ReturnType<typeof defaultSidebarGroupState>} */ next) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        saveTimerRef.current = null
        void flushSave(next)
      }, SAVE_DEBOUNCE_MS)
    },
    [flushSave],
  )

  const toggleGroup = useCallback(
    (/** @type {import('../lib/sidebarGroupState.js').SidebarNavGroupId} */ groupId) => {
      setGroupState((prev) => {
        const next = toggleSidebarGroupState(prev, groupId)
        scheduleSave(next)
        return next
      })
    },
    [scheduleSave],
  )

  const isGroupOpen = useCallback(
    (/** @type {import('../lib/sidebarGroupState.js').SidebarNavGroupId} */ groupId) => {
      return isSidebarGroupOpen(groupStateRef.current, groupId)
    },
    [],
  )

  return {
    groupState,
    loading,
    toggleGroup,
    isGroupOpen,
  }
}
