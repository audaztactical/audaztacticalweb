import { createPortal } from 'react-dom'

/** Shared tactical HUD tooltip surface — used by matrix/radar/wave and Recharts trend chart. */
export const TACTICAL_TOOLTIP_CLASS =
  'pointer-events-none min-w-[280px] w-auto max-w-[min(24rem,92vw)] md:min-w-[320px] rounded border border-emerald-500/40 bg-slate-950/95 p-4 font-mono text-left text-xs uppercase leading-relaxed text-emerald-400 shadow-2xl backdrop-blur-md'

const LINE_CLASS = 'block whitespace-normal break-words leading-relaxed tracking-wide'

/** @param {{ lines: string[] }} props */
export function TacticalTooltipBox({ lines }) {
  if (!lines.length) return null
  return (
    <div
      className={TACTICAL_TOOLTIP_CLASS}
      role="tooltip"
      style={{ width: 'max-content', minWidth: 280 }}
    >
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
 * @param {{
 *   active: boolean
 *   x: number
 *   y: number
 *   lines: string[]
 * }} props
 */
export function CursorFollowTooltip({ active, x, y, lines }) {
  if (!active || !lines.length) return null
  const pad = 14
  const tooltipMinW = 320
  const maxX = typeof window !== 'undefined' ? window.innerWidth - tooltipMinW - pad : x + pad
  const maxY = typeof window !== 'undefined' ? window.innerHeight - 220 : y + pad
  const left = Math.min(x + pad, Math.max(pad, maxX))
  const top = Math.min(y + pad, Math.max(pad, maxY))

  return createPortal(
    <div
      className="pointer-events-none z-[220]"
      style={{ position: 'fixed', left, top, minWidth: 280, width: 'max-content' }}
    >
      <TacticalTooltipBox lines={lines} />
    </div>,
    document.body
  )
}
