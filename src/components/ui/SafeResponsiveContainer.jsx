import { useEffect, useRef, useState } from 'react'
import { ResponsiveContainer } from 'recharts'

/**
 * ResponsiveContainer sarmalayıcı — boyut ≤0 iken chart mount edilmez (−1 uyarısı yok).
 *
 * @param {{
 *   children: import('react').ReactNode
 *   width?: string | number
 *   height?: string | number
 *   minWidth?: number
 *   minHeight?: number
 *   debounce?: number
 *   className?: string
 *   initialWidth?: number
 *   initialHeight?: number
 * }} props
 */
export default function SafeResponsiveContainer({
  children,
  width = '100%',
  height = '100%',
  minWidth = 0,
  minHeight = 150,
  debounce = 50,
  className = '',
  initialWidth = 320,
  initialHeight = 180,
}) {
  const hostRef = useRef(/** @type {HTMLDivElement | null} */ (null))
  const [ready, setReady] = useState(false)
  const timerRef = useRef(0)

  useEffect(() => {
    const el = hostRef.current
    if (!el) return undefined

    const check = () => {
      const w = el.clientWidth || el.offsetWidth || 0
      const h = el.clientHeight || el.offsetHeight || 0
      const ok = w >= 8 && h >= 8
      setReady(ok)
    }

    const schedule = () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(check, 32)
    }

    check()
    const t1 = window.setTimeout(check, 60)
    const t2 = window.setTimeout(check, 200)

    const onFs = () => {
      setReady(false)
      window.setTimeout(check, 40)
      window.setTimeout(check, 160)
    }
    document.addEventListener('fullscreenchange', onFs)

    let ro = /** @type {ResizeObserver | null} */ (null)
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => schedule())
      ro.observe(el)
    } else {
      window.addEventListener('resize', schedule)
    }

    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      if (timerRef.current) window.clearTimeout(timerRef.current)
      document.removeEventListener('fullscreenchange', onFs)
      if (ro) ro.disconnect()
      else window.removeEventListener('resize', schedule)
    }
  }, [minHeight])

  return (
    <div
      ref={hostRef}
      className={['h-full w-full min-h-[150px] min-w-0', className].filter(Boolean).join(' ')}
      style={{ minWidth: 0, minHeight: Math.max(150, minHeight || 150) }}
    >
      {ready ? (
        <ResponsiveContainer
          width={width}
          height={height}
          minWidth={minWidth}
          minHeight={minHeight}
          debounce={debounce}
          initialDimension={{ width: initialWidth, height: Math.max(150, initialHeight) }}
        >
          {children}
        </ResponsiveContainer>
      ) : null}
    </div>
  )
}
