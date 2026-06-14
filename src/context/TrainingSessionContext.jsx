/* eslint-disable react-refresh/only-export-components -- TrainingSessionProvider + useTrainingSession aynı modülde */
import { createContext, useCallback, useContext, useMemo } from 'react'
import {
  TRAINING_TYPE_INDIVIDUAL,
  buildGroupTrainingFields,
  injectGroupTrainingFields,
} from '../lib/trainingGroupFields'

/**
 * Bireysel antrenman oturumu — grup eğitimi (group_trainings) bu bağlamda yok.
 * @typedef {{
 *   wrapRangeLogPayload: (payload: Record<string, unknown>) => Record<string, unknown>
 *   wrapTrainingPayload: (payload: Record<string, unknown>) => Record<string, unknown>
 * }} TrainingSessionContextValue
 */

const TrainingSessionContext = createContext(/** @type {TrainingSessionContextValue | null} */ (null))

/**
 * @param {{
 *   children: import('react').ReactNode
 * }} props
 */
export function TrainingSessionProvider({ children }) {
  const groupFields = useMemo(
    () => buildGroupTrainingFields(TRAINING_TYPE_INDIVIDUAL, null),
    [],
  )

  const wrapPayload = useCallback(
    (payload) => injectGroupTrainingFields(payload, groupFields),
    [groupFields],
  )

  const value = useMemo(
    () => ({
      wrapRangeLogPayload: wrapPayload,
      wrapTrainingPayload: wrapPayload,
    }),
    [wrapPayload],
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
