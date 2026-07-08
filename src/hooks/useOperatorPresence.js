import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatOperatorPresenceLabelDisplay } from '../lib/messagesDisplayText'
import { isOperatorOnline } from '../lib/operatorPresence'
import { subscribeOperatorPresence } from '../lib/operatorPresenceStore'

/**
 * Tek operatör çevrimiçi durumu.
 * @param {string | null | undefined} uid
 */
export function useOperatorPresence(uid) {
  const { i18n } = useTranslation('messages')
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
      label: formatOperatorPresenceLabelDisplay(snapshot, now),
      snapshot,
    }
  }, [snapshot, tick, i18n.language])
}
