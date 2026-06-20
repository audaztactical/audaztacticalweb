import { useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'

/** Tablet ve telefon — lg (1024px) altı veya Capacitor native */
export const COMPACT_SHELL_MQ = '(max-width: 1023px)'

/**
 * @returns {boolean}
 */
export function useCompactShell() {
  const [compact, setCompact] = useState(() => {
    if (typeof window === 'undefined') return false
    return Capacitor.isNativePlatform() || window.matchMedia(COMPACT_SHELL_MQ).matches
  })

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      setCompact(true)
      return undefined
    }
    const mq = window.matchMedia(COMPACT_SHELL_MQ)
    const sync = () => setCompact(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  return compact
}
