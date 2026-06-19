import { useEffect } from 'react'
import { setUserPresenceOffline, touchUserPresence } from '../lib/firestorePresence'

/**
 * Oturum açıkken periyodik lastSeenAt güncellemesi.
 * @param {string | null | undefined} uid
 */
export function usePresenceHeartbeat(uid) {
  useEffect(() => {
    const id = String(uid ?? '').trim()
    if (!id) return undefined

    let active = true

    const beat = () => {
      if (!active || document.visibilityState === 'hidden') return
      void touchUserPresence(id)
    }

    beat()

    const intervalId = window.setInterval(beat, 30_000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') beat()
    }
    const onFocus = () => beat()

    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onFocus)

    const onPageHide = () => {
      void setUserPresenceOffline(id)
    }
    window.addEventListener('pagehide', onPageHide)

    return () => {
      active = false
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('pagehide', onPageHide)
      void setUserPresenceOffline(id)
    }
  }, [uid])
}
