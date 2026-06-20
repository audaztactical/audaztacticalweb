import { useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { useCompactShell } from './useCompactShell'

/** Mobil kabuk header — MobileLayout h-14 */
const MOBILE_HEADER_PX = 56

/**
 * @param {string} raw
 * @param {number} [rootFontSize]
 */
function parseLengthToPx(raw, rootFontSize = 16) {
  const v = String(raw ?? '').trim()
  if (!v) return 0
  const n = parseFloat(v)
  if (Number.isNaN(n)) return 0
  if (v.endsWith('rem')) return n * rootFontSize
  if (v.endsWith('px')) return n
  return n
}

/**
 * @returns {{ top: number; right: number; bottom: number; left: number }}
 */
function readSafeInsetsPx() {
  if (typeof document === 'undefined') {
    return { top: 0, right: 0, bottom: 0, left: 0 }
  }
  const root = document.documentElement
  const styles = getComputedStyle(root)
  const rootFontSize = parseFloat(styles.fontSize) || 16
  return {
    top: parseLengthToPx(styles.getPropertyValue('--safe-top'), rootFontSize),
    right: parseLengthToPx(styles.getPropertyValue('--safe-right'), rootFontSize),
    bottom: parseLengthToPx(styles.getPropertyValue('--safe-bottom'), rootFontSize),
    left: parseLengthToPx(styles.getPropertyValue('--safe-left'), rootFontSize),
  }
}

/**
 * @param {boolean} compact
 */
function computeAvailableHeightPx(compact) {
  if (typeof window === 'undefined') return 0
  const dvhPx = window.visualViewport?.height ?? window.innerHeight
  const safe = readSafeInsetsPx()
  const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
  const tabBarRaw = getComputedStyle(document.documentElement).getPropertyValue('--mobile-tab-bar-h')
  const tabBarPx = compact ? parseLengthToPx(tabBarRaw, rootFontSize) || 56 : 0
  const headerPx = compact ? MOBILE_HEADER_PX : 0
  return Math.max(0, Math.round(dvhPx - headerPx - tabBarPx - safe.top - safe.bottom))
}

/**
 * Klavye / visualViewport alt boşluğu (px).
 * @param {boolean} [enabled=true]
 */
function useVisualViewportBottomInset(enabled = true) {
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

/**
 * Klavye açıldığında alt inset (px) — geriye dönük API.
 * @param {boolean} enabled
 */
export function useVisualViewportInset(enabled) {
  return useVisualViewportBottomInset(enabled)
}

/**
 * Uygulama viewport özeti — compact kabuk, safe-area, klavye ve kullanılabilir yükseklik.
 * @returns {{
 *   compact: boolean
 *   native: boolean
 *   safeInsets: { top: number; right: number; bottom: number; left: number }
 *   visualViewportBottomInset: number
 *   availableHeightPx: number
 *   availableHeightCss: string
 * }}
 */
export function useAppViewport() {
  const compact = useCompactShell()
  const native = Capacitor.isNativePlatform()
  const visualViewportBottomInset = useVisualViewportBottomInset(compact || native)

  const [safeInsets, setSafeInsets] = useState(readSafeInsetsPx)
  const [availableHeightPx, setAvailableHeightPx] = useState(() => computeAvailableHeightPx(compact))

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const sync = () => {
      setSafeInsets(readSafeInsetsPx())
      setAvailableHeightPx(computeAvailableHeightPx(compact))
    }

    sync()
    window.addEventListener('resize', sync)
    window.visualViewport?.addEventListener('resize', sync)
    window.visualViewport?.addEventListener('scroll', sync)
    return () => {
      window.removeEventListener('resize', sync)
      window.visualViewport?.removeEventListener('resize', sync)
      window.visualViewport?.removeEventListener('scroll', sync)
    }
  }, [compact])

  const availableHeightCss =
    compact
      ? 'calc(100dvh - 3.5rem - var(--mobile-tab-bar-h) - var(--safe-top) - var(--safe-bottom))'
      : 'calc(100dvh - var(--safe-top) - var(--safe-bottom))'

  return {
    compact,
    native,
    safeInsets,
    visualViewportBottomInset,
    availableHeightPx,
    availableHeightCss,
  }
}
