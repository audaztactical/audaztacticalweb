import { useEffect, useMemo, useState } from 'react'
import i18n from '../i18n'
import { formatOperatorPresenceLabelDisplay } from '../lib/messagesDisplayText'
import { isOperatorOnline } from '../lib/operatorPresence'
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
  const [language, setLanguage] = useState(i18n.language)

  useEffect(() => {
    const onLanguageChanged = (/** @type {string} */ lng) => setLanguage(lng)
    i18n.on('languageChanged', onLanguageChanged)
    return () => i18n.off('languageChanged', onLanguageChanged)
  }, [])

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
    void language
    const now = Date.now()
    return {
      online: isOperatorOnline(snapshot, now),
      label: formatOperatorPresenceLabelDisplay(snapshot, now),
      snapshot,
    }
  }, [snapshot, tick, language])
}
