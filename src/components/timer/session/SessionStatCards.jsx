import { useTranslation } from 'react-i18next'

/**
 * @param {{
 *   shotCount: number
 *   averageScore: number
 *   bestScore: number
 *   worstScore: number
 *   consistency: number
 *   grade: string
 * }} props
 */
export default function SessionStatCards({
  shotCount,
  averageScore,
  bestScore,
  worstScore,
  consistency,
  grade,
}) {
  const { t } = useTranslation('timer')
  const fmt = (n) => (Number.isFinite(n) ? n.toFixed(1) : '—')

  const cards = [
    { key: 'shots', label: t('dryFire.sessionDash.totalShots'), value: String(shotCount) },
    { key: 'avg', label: t('dryFire.sessionDash.avgScore'), value: fmt(averageScore), accent: true },
    { key: 'best', label: t('dryFire.sessionDash.bestScore'), value: fmt(bestScore) },
    { key: 'worst', label: t('dryFire.sessionDash.worstScore'), value: shotCount ? fmt(worstScore) : '—' },
    { key: 'cons', label: t('dryFire.sessionDash.consistency'), value: fmt(consistency) },
    { key: 'grade', label: t('dryFire.sessionDash.grade'), value: grade || '—', accent: true },
  ]

  return (
    <div className="grid w-full min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
      {cards.map((c) => (
        <div
          key={c.key}
          className={[
            'rounded-lg border px-3 py-2.5',
            c.accent
              ? 'border-[#facc15]/35 bg-[rgba(250,204,21,0.08)]'
              : 'border-slate-800 bg-slate-900/70',
          ].join(' ')}
        >
          <p className="font-mono text-[7px] uppercase tracking-[0.18em] text-zinc-500">{c.label}</p>
          <p
            className={[
              'mt-1 font-mono text-lg font-bold tabular-nums tracking-tight',
              c.accent ? 'text-[#facc15]' : 'text-app-text',
            ].join(' ')}
          >
            {c.value}
          </p>
        </div>
      ))}
    </div>
  )
}
