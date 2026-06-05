import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { isFirebaseConfigured } from '../lib/firebase'
import { findGroupForOperator } from '../lib/operatorGroupMembership'

/** @typedef {import('../lib/trainingGroupFields').OperatorGroupMembership} OperatorGroupMembership */

/**
 * Operatörün aktif taktik grubunu çözer (users.groupId veya groups.members fallback).
 */
export function useOperatorGroup() {
  const { user, userData } = useAuth()
  const uid = user?.uid ?? null

  const [membership, setMembership] = useState(/** @type {OperatorGroupMembership | null} */ (null))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(/** @type {Error | null} */ (null))

  const refresh = useCallback(async () => {
    if (!uid || !isFirebaseConfigured()) {
      setMembership(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const profileGroupId =
        typeof userData?.groupId === 'string' && userData.groupId.trim() ? userData.groupId.trim() : null

      const resolved = await findGroupForOperator(uid)
      if (resolved) {
        setMembership(resolved)
      } else if (profileGroupId) {
        setMembership(null)
      } else {
        setMembership(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Grup bilgisi alınamadı'))
      setMembership(null)
    } finally {
      setLoading(false)
    }
  }, [uid, userData?.groupId])

  useEffect(() => {
    refresh()
  }, [refresh])

  return {
    membership,
    isMember: Boolean(membership?.groupId),
    loading,
    error,
    refresh,
  }
}
