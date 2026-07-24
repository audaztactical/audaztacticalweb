import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  deleteTacticalSessionFromFirestore,
  migrateLocalDryFireSessionsToFirestore,
  saveDryFireSessionToFirestore,
  subscribeDryFireSessions,
} from '../lib/firestoreTacticalSessions'
import {
  createDryFireSession,
  loadLocalDryFireSessions,
  persistLocalDryFireSessions,
} from '../lib/dryFireSessionStore'
import { isFirebaseConfigured } from '../lib/firebase'

/**
 * Kuru Tetik seansları — Firestore (girişli) veya localStorage (misafir / yapılandırılmamış).
 */
export function useDryFireSessions() {
  const { user } = useAuth()
  const uid = user?.uid ?? null
  const cloud = Boolean(uid && isFirebaseConfigured())

  const [sessions, setSessions] = useState(
    /** @type {import('../lib/dryFireSessionStore').DryFireSession[]} */ ([]),
  )
  const [loading, setLoading] = useState(Boolean(cloud))
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(/** @type {string | null} */ (null))
  const [error, setError] = useState(/** @type {string | null} */ (null))
  const migratedRef = useRef(false)

  useEffect(() => {
    if (!cloud || !uid) {
      setSessions(loadLocalDryFireSessions())
      setLoading(false)
      migratedRef.current = false
      return undefined
    }

    setLoading(true)
    setError(null)

    const unsub = subscribeDryFireSessions(
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
  }, [cloud, uid])

  useEffect(() => {
    if (!uid || !cloud || migratedRef.current) return
    migratedRef.current = true
    void migrateLocalDryFireSessionsToFirestore(uid).catch(() => {})
  }, [cloud, uid])

  const saveSession = useCallback(
    async (/** @type {Parameters<typeof createDryFireSession>[0] | import('../lib/dryFireSessionStore').DryFireSession} */ input) => {
      setSaving(true)
      setError(null)
      try {
        const session =
          input && typeof input === 'object' && 'mode' in input && input.mode === 'dry-fire'
            ? /** @type {import('../lib/dryFireSessionStore').DryFireSession} */ (input)
            : createDryFireSession(/** @type {Parameters<typeof createDryFireSession>[0]} */ (input))

        if (cloud && uid) {
          const saved = await saveDryFireSessionToFirestore(uid, session)
          return saved
        }

        const next = [session, ...loadLocalDryFireSessions().filter((s) => s.id !== session.id)]
        persistLocalDryFireSessions(next)
        setSessions(next)
        return session
      } catch (err) {
        setError('save-failed')
        throw err
      } finally {
        setSaving(false)
      }
    },
    [cloud, uid],
  )

  const deleteSession = useCallback(
    async (/** @type {string} */ sessionId) => {
      if (!sessionId) return
      setDeletingId(sessionId)
      setError(null)
      try {
        if (cloud && uid) {
          await deleteTacticalSessionFromFirestore(uid, sessionId)
          return
        }
        const next = loadLocalDryFireSessions().filter((s) => s.id !== sessionId)
        persistLocalDryFireSessions(next)
        setSessions(next)
      } catch (err) {
        setError('delete-failed')
        throw err
      } finally {
        setDeletingId(null)
      }
    },
    [cloud, uid],
  )

  return {
    uid,
    cloud,
    sessions,
    loading,
    saving,
    deletingId,
    error,
    saveSession,
    deleteSession,
  }
}
