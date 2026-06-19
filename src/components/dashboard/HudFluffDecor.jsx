import useTacticalClock, {
  formatTacticalLocalTime,
  formatTacticalOperationalDate,
} from '../../hooks/useTacticalClock'

/**
 * Köşeler + mini göstergeler (estetik; gerçek sistem ölçümü değil).
 * @param {{ className?: string }} [props] — örn. Profil: üst üste binmeyi önlemek için `className="-z-10"`
 */
export default function HudFluffDecor({ className = '' }) {
  const currentTime = useTacticalClock()

  const sec = currentTime.getSeconds()
  const min = currentTime.getMinutes()
  const coordTick = sec + min * 60

  const jitter = (base, amplitude) =>
    Math.min(99, Math.max(1, Math.round(base + amplitude * Math.sin(coordTick / 7))))

  const lat = (39 + (coordTick % 17) * 0.031 + Math.sin(coordTick / 13) * 0.015).toFixed(4)
  const lon = (32 + (coordTick % 23) * 0.021 + Math.cos(coordTick / 11) * 0.012).toFixed(4)

  const cpu = jitter(22 + ((coordTick * 7) % 41), 8)
  const ram = jitter(41 + ((coordTick * 5) % 31), 9)
  const bus = jitter(54 + ((coordTick * 3) % 29), 6)

  const box =
    'pointer-events-none font-mono-technical tabular-nums text-[9px] leading-snug tracking-tight text-app-text/55'

  return (
    <div className={`pointer-events-none absolute inset-0 z-0 ${className}`.trim()}>
      <div className={`${box} absolute left-0 top-0 z-0 max-w-[11rem]`} aria-hidden>
        <p className="text-accent/65">IZGARA_A</p>
        <p>
          KONUM {lat}°N {lon}°E
        </p>
        <p>
          <span className="text-accent/70">SAAT:</span> {formatTacticalLocalTime(currentTime)}
        </p>
        <p>
          <span className="text-accent/60">TARİH:</span> {formatTacticalOperationalDate(currentTime)}
        </p>
      </div>
      <div className={`${box} absolute right-0 top-0 z-0 max-w-[10rem] text-right`} aria-hidden>
        <p className="text-emerald-500/55">SİSTEM_YÜKÜ (SIM)</p>
        <p>CPU {cpu}%</p>
        <p>MEM {ram}%</p>
        <p>I/O {bus}%</p>
      </div>
      <div className={`${box} absolute bottom-0 left-0 z-0`} aria-hidden>
        <p className="text-app-text/45">
          LAT_ms ~{(((coordTick % 17) + 8) * 3)
            .toString()
            .padStart(2, '0')}
        </p>
      </div>
      <div className={`${box} absolute bottom-0 right-0 z-0 text-right`} aria-hidden>
        <p>FREQ_LNK ●</p>
        <p className="text-amber-500/55">RNG_OK</p>
      </div>
    </div>
  )
}
