import { useEffect, useMemo, useState } from 'react'
import { subscribeActiveGroupTrainings } from '../lib/firestoreGroupTrainings'
import { filterOperatorVisibleTrainings } from '../lib/groupTrainingSessionAccess'
import { resolveUserGroup } from '../components/training/trainingCategories'
import { useAuth } from '../context/AuthContext'
import { useOperatorGroup } from './useOperatorGroup'

/**
 * Aktif grup eğitimleri — Grup Eğitimi sektörü ve hub banner'ı.
 * @returns {{
 *   activeGroupTrainings: import('../lib/firestoreGroupTrainings').GroupTraining[]
 *   hasLiveGroupTraining: boolean
 *   loading: boolean
 * }}
 */
export function useActiveGroupTrainings() {
  const { userData } = useAuth()
  const { membership } = useOperatorGroup()
  const profileGroup = resolveUserGroup(userData)
  const groupId = membership?.groupId ?? profileGroup ?? ''

  const [activeGroupTrainings, setActiveGroupTrainings] = useState(
    /** @type {import('../lib/firestoreGroupTrainings').GroupTraining[]} */ ([]),
  )
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!groupId) {
      setActiveGroupTrainings([])
      setLoading(false)
      return undefined
    }

    setLoading(true)
    const unsub = subscribeActiveGroupTrainings(
      groupId,
      (rows) => {
        const visible = filterOperatorVisibleTrainings(rows, groupId, { includeCompleted: false })
        setActiveGroupTrainings(visible)
        setLoading(false)
      },
      () => {
        setLoading(false)
      },
    )

    return unsub
  }, [groupId])

  const hasLiveGroupTraining = activeGroupTrainings.length > 0

  return useMemo(
    () => ({
      activeGroupTrainings,
      hasLiveGroupTraining,
      loading,
    }),
    [activeGroupTrainings, hasLiveGroupTraining, loading],
  )
}
