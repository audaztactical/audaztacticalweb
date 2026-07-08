import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatOperatorPresenceLabelDisplay } from '../lib/messagesDisplayText'
import { isOperatorOnline } from '../lib/operatorPresence'
import { subscribeOperatorPresence } from '../lib/operatorPresenceStore'

/**
 * @typedef {{ online: boolean; label: string }} OperatorPresenceView
 */

/**
 * Birden fazla operatör için çevrimiçi durumu.
 * @param {string[]} uids
 */
export function useOperatorsPresenceMap(uids) {
  const { i18n } = useTranslation('messages')
  const [snapshots, setSnapshots] = useState(
    /** @type {Record<string, import('../lib/operatorPresence').OperatorPresenceSnapshot>} */ ({}),
  )
  const [tick, setTick] = useState(0)

  const normalizedUids = useMemo(() => {
    const seen = new Set()
    const out = []
    for (const raw of uids) {
      const id = String(raw ?? '').trim()
      if (!id || seen.has(id)) continue
      seen.add(id)
      out.push(id)
    }
    return out
  }, [uids])

  const uidKey = normalizedUids.join('|')

  useEffect(() => {
    if (!uidKey) {
      setSnapshots({})
      return undefined
    }

    const unsubscribers = normalizedUids.map((id) =>
      subscribeOperatorPresence(id, (snapshot) => {
        setSnapshots((prev) => ({ ...prev, [id]: snapshot }))
      }),
    )

    return () => unsubscribers.forEach((unsub) => unsub())
  }, [uidKey, normalizedUids])

  useEffect(() => {
    const intervalId = window.setInterval(() => setTick((n) => n + 1), 30_000)
    return () => window.clearInterval(intervalId)
  }, [])

  return useMemo(() => {
    void tick
    const now = Date.now()
    /** @type {Record<string, OperatorPresenceView>} */
    const out = {}
    for (const id of normalizedUids) {
      const snapshot = snapshots[id] ?? { lastSeenMs: 0, isOnlineFlag: false }
      out[id] = {
        online: isOperatorOnline(snapshot, now),
        label: formatOperatorPresenceLabelDisplay(snapshot, now),
      }
    }
    return out
  }, [normalizedUids, snapshots, tick, i18n.language])
}
