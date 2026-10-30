import { useContext } from 'react'
import { NoroCtx } from '../components/neural/noro/noroContext'

export function useNoroData() {
  const ctx = useContext(NoroCtx)
  if (!ctx) {
    return {
      enabled: false,
      neuralState: { regions: {}, streak: 0, totalLevel: 0 },
      serverStored: null,
      hasActivity: false,
      loading: false,
      events: [],
    }
  }
  return ctx
}
