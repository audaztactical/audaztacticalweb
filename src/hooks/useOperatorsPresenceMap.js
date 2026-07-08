import { useEffect, useMemo, useState } from 'react'
import i18n from '../i18n'
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
  const [snapshots, setSnapshots] = useState(
    /** @type {Record<string, import('../lib/operatorPresence').OperatorPresenceSnapshot>} */ ({}),
  )
  const [tick, setTick] = useState(0)
  const [language, setLanguage] = useState(i18n.language)

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
    const onLanguageChanged = (/** @type {string} */ lng) => setLanguage(lng)
    i18n.on('languageChanged', onLanguageChanged)
    return () => i18n.off('languageChanged', onLanguageChanged)
  }, [])

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
    void language
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
  }, [normalizedUids, snapshots, tick, language])
}
