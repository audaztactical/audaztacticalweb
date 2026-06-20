import { useEffect, useState } from 'react'

/**
 * Klavye açıldığında alt inset (px) — mobil sohbet girişi için.
 * @param {boolean} enabled
 */
export function useVisualViewportInset(enabled) {
  const [inset, setInset] = useState(0)

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      setInset(0)
      return undefined
    }

    const vv = window.visualViewport
    if (!vv) return undefined

    const sync = () => {
      const gap = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
      setInset(Math.round(gap))
    }

    sync()
    vv.addEventListener('resize', sync)
    vv.addEventListener('scroll', sync)
    return () => {
      vv.removeEventListener('resize', sync)
      vv.removeEventListener('scroll', sync)
    }
  }, [enabled])

  return inset
}
