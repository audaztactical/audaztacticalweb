import { useMemo } from 'react'

/** Tek kaynaklı kısa eğri — seed görsel olarak sabit kalır (yeniden yüklemede değişir). */
function pointsFromSeed(seed, len = 10) {
  let s = Math.abs(Number(seed)) || 1
  const out = []
  for (let i = 0; i < len; i++) {
    s = ((s * 1103515245 + 12345) >>> 0) % 2147483647
    out.push(s / 2147483647)
  }
  return out
}

/**
 * @param {{ seed: number, trend?: 'up'|'down'|'neutral', accentClass?: string }} props
 */
export default function MiniTrendSpark({ seed, trend = 'neutral', accentClass = 'stroke-accent/90' }) {
  const pts = useMemo(() => pointsFromSeed(seed), [seed])
  const bias = trend === 'up' ? -0.14 : trend === 'down' ? 0.14 : 0
  const xs = pts.length
  const w = 84
  const h = 30
  const pad = 3
  const d = pts
    .map((p, i) => {
      const x = pad + (i / (xs - 1)) * (w - pad * 2)
      let yNorm = Math.min(1, Math.max(0, p + bias * (i / (xs - 1 || 1))))
      yNorm += ((i * 7 + seed) % 5) * 0.02 * (trend === 'down' ? 1 : trend === 'up' ? -1 : 0.5)
      yNorm = Math.min(1, Math.max(0, yNorm))
      const y = pad + yNorm * (h - pad * 2)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible opacity-95" aria-hidden>
      <polyline
        fill="none"
        className={`${accentClass} drop-shadow-[0_0_8px_color-mix(in_srgb,var(--accent-color)_40%,transparent)]`}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={d}
      />
      <line
        x1={pad}
        y1={h - pad}
        x2={w - pad}
        y2={h - pad}
        className="stroke-white/10"
        strokeWidth="0.75"
        strokeDasharray="2 3"
      />
    </svg>
  )
}
