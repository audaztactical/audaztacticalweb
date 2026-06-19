import { useEffect, useMemo, useState } from 'react'
import {
  formatOperatorPresenceLabel,
  isOperatorOnline,
} from '../lib/operatorPresence'
import { subscribeOperatorPresence } from '../lib/operatorPresenceStore'

/**
 * Tek operatör çevrimiçi durumu.
 * @param {string | null | undefined} uid
 */
export function useOperatorPresence(uid) {
  const [snapshot, setSnapshot] = useState(
    /** @type {import('../lib/operatorPresence').OperatorPresenceSnapshot} */ ({
      lastSeenMs: 0,
      isOnlineFlag: false,
    }),
  )
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const id = String(uid ?? '').trim()
    if (!id) {
      setSnapshot({ lastSeenMs: 0, isOnlineFlag: false })
      return undefined
    }
    return subscribeOperatorPresence(id, setSnapshot)
  }, [uid])

  useEffect(() => {
    const intervalId = window.setInterval(() => setTick((n) => n + 1), 30_000)
    return () => window.clearInterval(intervalId)
  }, [])

  return useMemo(() => {
    void tick
    const now = Date.now()
    return {
      online: isOperatorOnline(snapshot, now),
      label: formatOperatorPresenceLabel(snapshot, now),
      snapshot,
    }
  }, [snapshot, tick])
}
