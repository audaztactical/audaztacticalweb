import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  deleteTacticalSessionFromFirestore,
  migrateLocalTacticalSessionsToFirestore,
  saveTacticalSessionToFirestore,
  subscribeTacticalSessions,
} from '../lib/firestoreTacticalSessions'

/**
 * Kullanıcıya özel Standart Atış seansları (Firestore real-time).
 */
export function useTacticalSessions() {
  const { user } = useAuth()
  const uid = user?.uid ?? null

  const [sessions, setSessions] = useState(
    /** @type {import('../lib/standardShotSessionStore').StandardShotSession[]} */ ([]),
  )
  const [loading, setLoading] = useState(Boolean(uid))
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(/** @type {string | null} */ (null))
  const [error, setError] = useState(/** @type {string | null} */ (null))
  const migratedRef = useRef(false)

  useEffect(() => {
    if (!uid) {
      setSessions([])
      setLoading(false)
      migratedRef.current = false
      return undefined
    }

    setLoading(true)
    setError(null)

    const unsub = subscribeTacticalSessions(
      uid,
      (rows) => {
        setSessions(rows)
        setLoading(false)
      },
      () => {
        setError('listen-failed')
        setLoading(false)
      },
    )

    return () => {
      try {
        unsub()
      } catch {
        /* teardown */
      }
    }
  }, [uid])

  // localStorage → Firestore (bir kez, oturum başına)
  useEffect(() => {
    if (!uid || migratedRef.current) return
    migratedRef.current = true
    void migrateLocalTacticalSessionsToFirestore(uid).catch(() => {
      /* sessiz — dinleyici zaten güncel kalır */
    })
  }, [uid])

  const saveSession = useCallback(
    async (/** @type {import('../lib/standardShotSessionStore').StandardShotSession} */ session) => {
      if (!uid) {
        const e = new Error('Oturum gerekli')
        e.code = 'unauthenticated'
        throw e
      }
      setSaving(true)
      setError(null)
      try {
        const saved = await saveTacticalSessionToFirestore(uid, session)
        return saved
      } catch (err) {
        setError('save-failed')
        throw err
      } finally {
        setSaving(false)
      }
    },
    [uid],
  )

  const deleteSession = useCallback(
    async (/** @type {string} */ sessionId) => {
      if (!uid || !sessionId) return
      setDeletingId(sessionId)
      setError(null)
      try {
        await deleteTacticalSessionFromFirestore(uid, sessionId)
      } catch (err) {
        setError('delete-failed')
        throw err
      } finally {
        setDeletingId(null)
      }
    },
    [uid],
  )

  return {
    uid,
    sessions,
    loading,
    saving,
    deletingId,
    error,
    saveSession,
    deleteSession,
  }
}
