/* eslint-disable react-refresh/only-export-components -- TrainingSessionProvider + useTrainingSession aynı modülde */
import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { useAuth } from './AuthContext'
import {
  TRAINING_TYPE_INDIVIDUAL,
  buildGroupTrainingFields,
  injectGroupTrainingFields,
} from '../lib/trainingGroupFields'
import { writeOperatorGroupActivityFeed } from '../lib/submitOperatorGroupFeed'
import { useOperatorGroup } from '../hooks/useOperatorGroup'

/** @typedef {import('../lib/trainingGroupFields').TrainingTypeKey} TrainingTypeKey */

/**
 * @typedef {{
 *   trainingType: TrainingTypeKey
 *   setTrainingType: (type: TrainingTypeKey) => void
 *   membership: import('../lib/trainingGroupFields').OperatorGroupMembership | null
 *   isMember: boolean
 *   groupLoading: boolean
 *   wrapRangeLogPayload: (payload: Record<string, unknown>) => Record<string, unknown>
 *   wrapTrainingPayload: (payload: Record<string, unknown>) => Record<string, unknown>
 *   afterRangeLogSaved: (args: { logId: string, payload: Record<string, unknown> }) => Promise<void>
 *   afterTrainingSaved: (args: { logId: string, payload: Record<string, unknown> }) => Promise<void>
 * }} TrainingSessionContextValue
 */

const TrainingSessionContext = createContext(/** @type {TrainingSessionContextValue | null} */ (null))

/**
 * @param {{
 *   children: import('react').ReactNode
 * }} props
 */
export function TrainingSessionProvider({ children }) {
  const { user } = useAuth()
  const uid = user?.uid ?? null
  const { membership, isMember, loading: groupLoading } = useOperatorGroup()
  const [trainingType, setTrainingTypeRaw] = useState(/** @type {TrainingTypeKey} */ (TRAINING_TYPE_INDIVIDUAL))

  const setTrainingType = useCallback(
    (/** @type {TrainingTypeKey} */ type) => {
      if (type === 'GROUP' && !isMember) return
      setTrainingTypeRaw(type)
    },
    [isMember],
  )

  const groupFields = useMemo(
    () => buildGroupTrainingFields(trainingType, membership),
    [trainingType, membership],
  )

  const wrapPayload = useCallback(
    (payload) => injectGroupTrainingFields(payload, groupFields),
    [groupFields],
  )

  const afterRangeLogSaved = useCallback(
    async ({ logId, payload }) => {
      if (groupFields.trainingType !== 'GROUP' || !groupFields.groupId || !groupFields.instructorId || !uid) {
        return
      }
      await writeOperatorGroupActivityFeed({
        groupId: groupFields.groupId,
        instructorId: groupFields.instructorId,
        operatorId: uid,
        groupName: groupFields.groupName,
        sourceDomain: 'range_logs',
        sourceLogId: logId,
        payload,
      })
    },
    [groupFields, uid],
  )

  const afterTrainingSaved = useCallback(
    async ({ logId, payload }) => {
      if (groupFields.trainingType !== 'GROUP' || !groupFields.groupId || !groupFields.instructorId || !uid) {
        return
      }
      await writeOperatorGroupActivityFeed({
        groupId: groupFields.groupId,
        instructorId: groupFields.instructorId,
        operatorId: uid,
        groupName: groupFields.groupName,
        sourceDomain: 'trainings',
        sourceLogId: logId,
        payload,
      })
    },
    [groupFields, uid],
  )

  const value = useMemo(
    () => ({
      trainingType,
      setTrainingType,
      membership,
      isMember,
      groupLoading,
      wrapRangeLogPayload: wrapPayload,
      wrapTrainingPayload: wrapPayload,
      afterRangeLogSaved,
      afterTrainingSaved,
    }),
    [
      trainingType,
      setTrainingType,
      membership,
      isMember,
      groupLoading,
      wrapPayload,
      afterRangeLogSaved,
      afterTrainingSaved,
    ],
  )

  return <TrainingSessionContext.Provider value={value}>{children}</TrainingSessionContext.Provider>
}

export function useTrainingSession() {
  const ctx = useContext(TrainingSessionContext)
  if (!ctx) {
    throw new Error('useTrainingSession must be used within TrainingSessionProvider')
  }
  return ctx
}
