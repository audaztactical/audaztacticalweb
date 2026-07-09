import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { motion as Motion } from 'framer-motion'

/**
 * Sonuç setine göre basitleştirilmiş yörünge HUD animasyonu (dekoratif).
 * @param {{ results: import('../../lib/ballisticsEngine.js').BallisticsPointResult[], activeDistance: number }} props
 */
export default function BallisticTrajectoryHud({ results, activeDistance }) {
  const { t } = useTranslation('ballistics')
  const { pathD, bulletX, bulletY, maxRange } = useMemo(() => {
    if (!results?.length) {
      return { pathD: 'M 8 52 L 292 52', bulletX: 8, bulletY: 52, maxRange: 1 }
    }
    const w = 284
    const h = 44
    const baseY = 12
    const maxR = Math.max(...results.map((r) => r.distance), 1)
    const maxDrop = Math.max(...results.map((r) => Math.abs(r.dropCm)), 1)

    const pts = results.map((r) => {
      const x = 8 + (r.distance / maxR) * w
      const dropNorm = Math.abs(r.dropCm) / maxDrop
      const y = baseY + dropNorm * h
      return { x, y }
    })

    let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`
    for (let i = 1; i < pts.length; i += 1) {
      d += ` L ${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)}`
    }

    const active = results.reduce((best, r) =>
      Math.abs(r.distance - activeDistance) < Math.abs(best.distance - activeDistance) ? r : best,
    )
    const ax = 8 + (active.distance / maxR) * w
    const ay = baseY + (Math.abs(active.dropCm) / maxDrop) * h

    return { pathD: d, bulletX: ax, bulletY: ay, maxRange: maxR }
  }, [results, activeDistance])

  return (
    <div className="relative shrink-0 overflow-hidden rounded-lg border border-emerald-500/20 bg-black/60 p-1.5 sm:p-2">
      <p className="mb-0.5 font-mono-technical text-[8px] font-bold uppercase tracking-[0.22em] text-emerald-500/80">
        {t('trajectory.label', {
          active: Math.round(activeDistance),
          max: Math.round(maxRange),
        })}
      </p>
      <svg viewBox="0 0 300 64" className="h-12 w-full sm:h-14" aria-hidden>
        <defs>
          <linearGradient id="trajGlow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.9" />
            <stop offset="55%" stopColor="#eab308" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.9" />
          </linearGradient>
          <filter id="bulletGlow">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <line x1="8" y1="58" x2="292" y2="58" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
        <path
          d={pathD}
          fill="none"
          stroke="url(#trajGlow)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="4 3"
          opacity="0.85"
        />
        <Motion.circle
          r="4"
          fill="#22c55e"
          filter="url(#bulletGlow)"
          animate={{ cx: bulletX, cy: bulletY }}
          transition={{ type: 'spring', stiffness: 280, damping: 28 }}
        />
        <Motion.circle
          r="8"
          fill="none"
          stroke="rgba(34,197,94,0.35)"
          strokeWidth="1"
          animate={{ cx: bulletX, cy: bulletY }}
          transition={{ type: 'spring', stiffness: 280, damping: 28 }}
        />
      </svg>
    </div>
  )
}
