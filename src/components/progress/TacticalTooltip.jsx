import { createPortal } from 'react-dom'
import { useLayoutEffect, useRef, useState } from 'react'

/** Shared tactical HUD tooltip surface — used by matrix/radar/wave and Recharts trend chart. */
export const TACTICAL_TOOLTIP_CLASS =
  'pointer-events-none w-[min(22rem,calc(100vw-1.5rem))] max-w-[calc(100vw-1.5rem)] rounded border border-emerald-500/40 bg-slate-950/95 p-3 font-mono text-left text-[11px] uppercase leading-relaxed text-emerald-400 shadow-2xl backdrop-blur-md sm:p-4 sm:text-xs'

const LINE_CLASS = 'block whitespace-normal break-words leading-relaxed tracking-wide'

/** @param {{ lines: string[] }} props */
export function TacticalTooltipBox({ lines }) {
  if (!lines.length) return null
  return (
    <div className={TACTICAL_TOOLTIP_CLASS} role="tooltip">
      <ul className="m-0 list-none space-y-1.5 p-0">
        {lines.map((line, index) => (
          <li key={`${index}-${line}`} className={LINE_CLASS}>
            {line}
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * Recharts Tooltip `coordinate` is chart-local (SVG). Convert to viewport for position:fixed portals.
 * @param {{ x?: number; y?: number } | null | undefined} coordinate
 * @param {Element | null | undefined} chartEl — wrapper that matches the chart SVG box
 */
export function rechartsCoordinateToViewport(coordinate, chartEl) {
  const cx = Number(coordinate?.x)
  const cy = Number(coordinate?.y)
  if (!Number.isFinite(cx) || !Number.isFinite(cy)) {
    return { x: 0, y: 0 }
  }
  const rect = chartEl?.getBoundingClientRect?.()
  if (!rect) {
    // Fallback: treat as already-viewport (CursorFollow) — do not assume 0,0
    return { x: cx, y: cy }
  }
  return { x: rect.left + cx, y: rect.top + cy }
}

/**
 * Place tooltip near anchor (prefer right+below), then clamp into viewport without jumping to a corner.
 * @param {number} x viewport anchor x
 * @param {number} y viewport anchor y
 * @param {number} width measured tooltip width
 * @param {number} height measured tooltip height
 * @param {number} [pad]
 */
export function clampTooltipToViewport(x, y, width, height, pad = 12) {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1024
  const vh = typeof window !== 'undefined' ? window.innerHeight : 768
  const w = Math.min(Math.max(width || 280, 160), vw - pad * 2)
  const h = Math.min(Math.max(height || 120, 80), vh - pad * 2)
  const gap = 10

  // Prefer: to the right and slightly below the point
  let left = x + gap
  let top = y + gap

  if (left + w > vw - pad) left = x - w - gap
  if (left < pad) left = pad
  if (left + w > vw - pad) left = Math.max(pad, vw - pad - w)

  if (top + h > vh - pad) top = y - h - gap
  if (top < pad) top = pad
  if (top + h > vh - pad) top = Math.max(pad, vh - pad - h)

  return { left, top, maxWidth: vw - pad * 2 }
}

/**
 * @param {{
 *   active: boolean
 *   x: number
 *   y: number
 *   lines: string[]
 * }} props
 */
export function CursorFollowTooltip({ active, x, y, lines }) {
  const ref = useRef(/** @type {HTMLDivElement | null} */ (null))
  const [box, setBox] = useState(() => clampTooltipToViewport(x, y, 300, 160))

  useLayoutEffect(() => {
    if (!active || !lines.length) return
    const el = ref.current
    const rect = el?.getBoundingClientRect()
    setBox(clampTooltipToViewport(x, y, rect?.width ?? 300, rect?.height ?? 160))
  }, [active, x, y, lines])

  if (!active || !lines.length) return null

  return createPortal(
    <div
      ref={ref}
      className="pointer-events-none z-[220]"
      style={{
        position: 'fixed',
        left: box.left,
        top: box.top,
        maxWidth: box.maxWidth,
        width: 'max-content',
      }}
    >
      <TacticalTooltipBox lines={lines} />
    </div>,
    document.body,
  )
}
