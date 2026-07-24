import { useEffect, useRef, useState } from 'react'
import { ResponsiveContainer } from 'recharts'

/**
 * Recharts ResponsiveContainer — sabit yükseklik veya ebeveyni dolduran ölçü.
 * @param {{
 *   height?: number
 *   fill?: boolean
 *   className?: string
 *   children: import('react').ReactElement
 * }} props
 */
export default function ChartSafeFrame({
  height = 200,
  fill = false,
  className = '',
  children,
}) {
  const hostRef = useRef(/** @type {HTMLDivElement | null} */ (null))
  const [box, setBox] = useState({
    w: 320,
    h: Math.max(120, Math.round(Number(height) || 200)),
  })

  useEffect(() => {
    if (!fill) {
      setBox((prev) => ({
        ...prev,
        h: Math.max(120, Math.round(Number(height) || 200)),
      }))
      return undefined
    }
    const el = hostRef.current
    if (!el || typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const w = Math.floor(entry.contentRect.width)
      const h = Math.floor(entry.contentRect.height)
      if (w < 8 || h < 8) return
      setBox((prev) => (prev.w === w && prev.h === h ? prev : { w, h }))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [fill, height])

  const h = Math.max(120, box.h)

  return (
    <div
      ref={hostRef}
      className={['w-full min-w-0 overflow-hidden', fill ? 'h-full min-h-0' : '', className]
        .filter(Boolean)
        .join(' ')}
      style={fill ? undefined : { height: h, minHeight: h }}
    >
      <ResponsiveContainer
        width="100%"
        height="100%"
        minWidth={0}
        minHeight={h}
        debounce={50}
        initialDimension={{ width: Math.max(160, box.w), height: h }}
      >
        {children}
      </ResponsiveContainer>
    </div>
  )
}
