import { useMemo } from 'react'
import { useNeuralState } from '../../../hooks/useNeuralState'
import { useNeuralEvents } from '../../../hooks/useNeuralEvents'
import { NoroCtx } from './noroContext'

/**
 * Oturum başına tek neural dinleyici (NÖRO herkese açık).
 * @param {{ children: import('react').ReactNode }} props
 */
export function NoroProvider({ children }) {
  const neural = useNeuralState()
  const { events } = useNeuralEvents()

  const value = useMemo(
    () => ({
      enabled: true,
      neuralState: neural.state,
      serverStored: neural.serverStored,
      hasActivity: neural.hasActivity,
      loading: neural.loading,
      events,
    }),
    [neural.state, neural.serverStored, neural.hasActivity, neural.loading, events],
  )

  return <NoroCtx.Provider value={value}>{children}</NoroCtx.Provider>
}
