/** Küçük sağ taraftaki halka (eğitim modül satırları) */
export default function MiniRing({ percent = 0, size = 36, stroke = 3 }) {
  const cx = size / 2
  const cy = size / 2
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const p = Math.min(100, Math.max(0, percent))
  const dash = `${(p / 100) * c} ${c}`

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90 shrink-0" aria-hidden>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth={stroke}
      />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="var(--accent-color)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={dash}
        style={{ filter: 'drop-shadow(0 0 3px rgba(255,180,0,0.4))' }}
      />
    </svg>
  )
}
