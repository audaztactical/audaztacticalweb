import useTacticalClock, {
  formatTacticalLocalTime,
  formatTacticalOperationalDate,
} from '../../hooks/useTacticalClock'

/**
 * @param {{ className?: string, showCoords?: boolean }} props
 */
export default function TacticalClockReadout({ className = '', showCoords = false }) {
  const currentTime = useTacticalClock()
  const localHms = formatTacticalLocalTime(currentTime)
  const opDate = formatTacticalOperationalDate(currentTime)

  const sec = currentTime.getSeconds()
  const min = currentTime.getMinutes()
  const coordTick = sec + min * 60
  const lat = (34.8 + (coordTick % 17) * 0.0012).toFixed(4)
  const lon = (32.4 + (coordTick % 23) * 0.0009).toFixed(4)

  return (
    <div
      className={`font-mono-technical text-[10px] tabular-nums tracking-tight ${className}`.trim()}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <span className="text-emerald-500/55">YEREL</span>{' '}
      <span className="text-[#00FF41]/80">SAAT:</span>{' '}
      <span className="font-semibold text-white/90">{localHms}</span>
      <span className="mx-2 text-white/20" aria-hidden>
        │
      </span>
      <span className="text-[#ffb400]/65">TARİH:</span>{' '}
      <span className="text-white/80">{opDate}</span>
      {showCoords ? (
        <>
          <span className="mx-2 text-white/20" aria-hidden>
            │
          </span>
          <span className="text-red-400/45">KONUM</span>{' '}
          <span className="text-slate-500">
            {lat}°N {lon}°E
          </span>
        </>
      ) : null}
    </div>
  )
}
