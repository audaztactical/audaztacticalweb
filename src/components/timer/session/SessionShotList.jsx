import { useTranslation } from 'react-i18next'
import { translateShotRecommendation } from '../../../lib/analysisFeedback'

/**
 * @param {{
 *   shots: import('../../../lib/sessionEngine').ShotRecord[]
 *   startedAt: number
 *   selectedShotNumber: number | null
 *   onSelect: (shot: import('../../../lib/sessionEngine').ShotRecord) => void
 * }} props
 */
export default function SessionShotList({
  shots,
  startedAt,
  selectedShotNumber,
  onSelect,
}) {
  const { t } = useTranslation('timer')

  const formatTime = (ts) => {
    if (!startedAt || !ts) return t('dryFire.feedback.empty')
    const sec = Math.max(0, (ts - startedAt) / 1000)
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    return `${m}:${String(s).padStart(2, '0')}`
  }

  if (shots.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-700/80 bg-slate-950/50 px-4 py-8 text-center">
        <p className="font-mono text-sm uppercase tracking-[0.14em] text-zinc-400">
          {t('dryFire.sessionDash.listEmpty')}
        </p>
      </div>
    )
  }

  const rows = [...shots].reverse()

  return (
    <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900/60">
      <div className="border-b border-slate-800 px-3 py-2.5">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[#facc15]/90 sm:text-sm">
          {t('dryFire.sessionDash.shotList')}
        </p>
      </div>
      <div className="max-h-[22rem] overflow-auto">
        <table className="w-full min-w-[28rem] border-collapse text-left">
          <thead className="sticky top-0 z-[1] bg-slate-950">
            <tr className="font-mono text-[11px] uppercase tracking-[0.12em] text-zinc-300 sm:text-xs">
              <th className="px-3 py-2.5 font-bold">{t('dryFire.sessionDash.shotNumber')}</th>
              <th className="px-3 py-2.5 font-bold">{t('dryFire.sessionDash.colScore')}</th>
              <th className="px-3 py-2.5 font-bold">{t('dryFire.sessionDash.colGrade')}</th>
              <th className="px-3 py-2.5 font-bold">{t('dryFire.sessionDash.colTime')}</th>
              <th className="px-3 py-2.5 font-bold">{t('dryFire.sessionDash.colRec')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((shot) => {
              const selected = selectedShotNumber === shot.shotNumber
              return (
                <tr
                  key={shot.shotNumber}
                  className={[
                    'cursor-pointer border-t border-slate-800/80 font-mono text-sm transition',
                    selected
                      ? 'bg-[rgba(250,204,21,0.1)]'
                      : 'hover:bg-slate-800/50',
                  ].join(' ')}
                  onClick={() => onSelect(shot)}
                >
                  <td className="px-3 py-2.5 tabular-nums text-zinc-300">{shot.shotNumber}</td>
                  <td className="px-3 py-2.5 font-bold tabular-nums text-app-text">
                    {shot.overallScore.toFixed(0)}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="rounded border border-[#facc15]/40 bg-[rgba(250,204,21,0.1)] px-2 py-0.5 text-xs font-bold text-[#facc15]">
                      {shot.grade}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-zinc-300">
                    {formatTime(shot.timestamp)}
                  </td>
                  <td
                    className="max-w-[14rem] truncate px-3 py-2.5 text-zinc-300"
                    title={translateShotRecommendation(t, shot.recommendation)}
                  >
                    {translateShotRecommendation(t, shot.recommendation)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
