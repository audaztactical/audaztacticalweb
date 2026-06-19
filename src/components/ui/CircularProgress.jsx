/**
 * Gold ring progress. percent 0–100.
 * dashed: kesikli halka (operasyonel süre görünümü)
 */
export default function CircularProgress({
  percent = 0,
  size = 96,
  stroke = 5,
  dashed = false,
  className = '',
}) {
  const cx = size / 2
  const cy = size / 2
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const clamped = Math.min(100, Math.max(0, percent))

  const solidDash = `${(clamped / 100) * c} ${c}`

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={`-rotate-90 ${className}`}
      aria-hidden
    >
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.08)"
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
        strokeDasharray={dashed ? '3 7' : solidDash}
        strokeDashoffset={dashed ? c * (1 - clamped / 100) : 0}
        style={{
          filter: 'drop-shadow(0 0 5px rgba(255,180,0,0.45))',
        }}
      />
    </svg>
  )
}
