import { useMemo } from 'react'
import { useNeuralState } from '../../../hooks/useNeuralState'
import { useNeuralEvents } from '../../../hooks/useNeuralEvents'
import { isNeuralPreviewEnabled } from '../../../lib/neural/neuralPreview'
import { NoroCtx } from './noroContext'

/**
 * Oturum başına tek neural dinleyici + önizleme kapısı.
 * @param {{ children: import('react').ReactNode }} props
 */
export function NoroProvider({ children }) {
  const enabled = isNeuralPreviewEnabled()
  const neural = useNeuralState()
  const { events } = useNeuralEvents()

  const value = useMemo(
    () => ({
      enabled,
      neuralState: neural.state,
      serverStored: neural.serverStored,
      hasActivity: neural.hasActivity,
      loading: neural.loading,
      events: enabled ? events : [],
    }),
    [enabled, neural.state, neural.serverStored, neural.hasActivity, neural.loading, events],
  )

  return <NoroCtx.Provider value={value}>{children}</NoroCtx.Provider>
}
