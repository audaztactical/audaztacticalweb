import { Children, cloneElement, isValidElement, useEffect, useRef, useState } from 'react'

/** Recharts uyarısı: width/height ≤ 0 veya −1 */
const MIN_W = 8
const MIN_H = 150

/**
 * Recharts güvenli çerçeve — ResponsiveContainer KULLANMAZ.
 * Layout boyutunu (clientWidth/Height) ölçer; hazır değilse chart mount edilmez.
 * Fullscreen / CSS zoom geçişlerinde çökük boyutta (−1) render engellenir.
 *
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
  const fallbackH = Math.max(MIN_H, Math.round(Number(height) || 200))
  const [box, setBox] = useState({ w: 0, h: 0 })
  const debounceRef = useRef(0)

  useEffect(() => {
    const el = hostRef.current
    if (!el) return undefined

    const applySafe = (rawW, rawH) => {
      const nw = Math.floor(Number(rawW) || 0)
      const nh = Math.floor(Number(rawH) || 0)
      if (!Number.isFinite(nw) || !Number.isFinite(nh) || nw < MIN_W || nh < MIN_H) {
        // Geçişte çökmüş kutu → chart'ı unmount et (Recharts −1 uyarısı yok)
        setBox((prev) => (prev.w === 0 && prev.h === 0 ? prev : { w: 0, h: 0 }))
        return
      }
      setBox((prev) => (prev.w === nw && prev.h === nh ? prev : { w: nw, h: nh }))
    }

    const measure = () => {
      // Transform/scale'den etkilenmeyen layout boyutu
      const w = el.clientWidth || el.offsetWidth || 0
      const rawH = el.clientHeight || el.offsetHeight || 0
      const h = Math.max(fallbackH, rawH || 0)
      applySafe(w, h)
    }

    const schedule = () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current)
      debounceRef.current = window.setTimeout(measure, 32)
    }

    measure()
    const t1 = window.setTimeout(measure, 60)
    const t2 = window.setTimeout(measure, 220)

    const onFs = () => {
      // Fullscreen geçişi — birkaç frame sonra yeniden ölç
      measure()
      window.setTimeout(measure, 50)
      window.setTimeout(measure, 180)
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
      if (debounceRef.current) window.clearTimeout(debounceRef.current)
      document.removeEventListener('fullscreenchange', onFs)
      if (ro) ro.disconnect()
      else window.removeEventListener('resize', schedule)
    }
  }, [fill, fallbackH])

  const ready = box.w >= MIN_W && box.h >= MIN_H
  const child =
    ready && isValidElement(children)
      ? cloneElement(/** @type {import('react').ReactElement} */ (Children.only(children)), {
          width: box.w,
          height: box.h,
        })
      : null

  return (
    <div
      ref={hostRef}
      className={[
        'flex w-full min-h-[150px] min-w-0 flex-1 flex-col overflow-hidden',
        fill ? 'h-full' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={
        fill
          ? { minHeight: fallbackH, minWidth: 0, width: '100%' }
          : { height: fallbackH, minHeight: fallbackH, minWidth: 0, width: '100%' }
      }
    >
      {ready ? child : <div className="h-full min-h-[150px] w-full min-w-0" aria-hidden />}
    </div>
  )
}
