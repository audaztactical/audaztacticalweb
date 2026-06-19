import TacticalClockReadout from './TacticalClockReadout'

/** Üst şerit taktik saat + isteğe bağlı simüle koordinat. */
export default function HudTicker({ className = '' }) {
  return (
    <TacticalClockReadout
      showCoords
      className={`pointer-events-none select-none text-app-text/55 ${className}`.trim()}
    />
  )
}
