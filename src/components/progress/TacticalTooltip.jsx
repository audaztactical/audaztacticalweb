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
 * Clamp a fixed-position tooltip so it stays fully inside the viewport.
 * @param {number} x cursor/anchor x
 * @param {number} y cursor/anchor y
 * @param {number} width measured tooltip width
 * @param {number} height measured tooltip height
 * @param {number} [pad]
 */
export function clampTooltipToViewport(x, y, width, height, pad = 12) {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1024
  const vh = typeof window !== 'undefined' ? window.innerHeight : 768
  const w = Math.min(width || 280, vw - pad * 2)
  const h = Math.min(height || 160, vh - pad * 2)
  let left = x + pad
  let top = y + pad
  if (left + w > vw - pad) left = x - w - pad
  if (left < pad) left = pad
  if (top + h > vh - pad) top = y - h - pad
  if (top < pad) top = pad
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
  const [box, setBox] = useState({ left: x, top: y, maxWidth: 360 })

  useLayoutEffect(() => {
    if (!active || !lines.length) return
    const el = ref.current
    const rect = el?.getBoundingClientRect()
    setBox(
      clampTooltipToViewport(
        x,
        y,
        rect?.width ?? 300,
        rect?.height ?? 180,
      ),
    )
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
