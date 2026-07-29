import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { translateShotRecommendation } from '../../../lib/analysisFeedback'

/**
 * @param {{
 *   shot: import('../../../lib/sessionEngine').ShotRecord | null
 *   open: boolean
 *   onClose: () => void
 * }} props
 */
export default function SessionShotDetailDrawer({ shot, open, onClose }) {
  const { t } = useTranslation('timer')

  if (!open || !shot) return null

  const empty = t('dryFire.feedback.empty')
  const rows = [
    { label: t('dryFire.sessionDash.detail.overall'), value: shot.overallScore.toFixed(1) },
    { label: t('dryFire.sessionDash.detail.grade'), value: shot.grade },
    { label: t('dryFire.sessionDash.detail.hold'), value: shot.holdScore.toFixed(1) },
    { label: t('dryFire.sessionDash.detail.holdQuality'), value: shot.holdQuality.toFixed(1) },
    { label: t('dryFire.sessionDash.detail.flinch'), value: shot.flinchScore.toFixed(1) },
    { label: t('dryFire.sessionDash.detail.flinchDir'), value: shot.flinchDirection || empty },
    { label: t('dryFire.sessionDash.detail.flinchSev'), value: shot.flinchSeverity || empty },
    { label: t('dryFire.sessionDash.detail.follow'), value: shot.followThroughScore.toFixed(1) },
    { label: t('dryFire.sessionDash.detail.followState'), value: shot.followThroughState || empty },
    { label: t('dryFire.sessionDash.detail.trace'), value: shot.traceScore.toFixed(1) },
    { label: t('dryFire.sessionDash.detail.tracePeak'), value: shot.tracePeak.toFixed(2) },
    { label: t('dryFire.sessionDash.detail.traceAvg'), value: shot.traceAverage.toFixed(2) },
    { label: t('dryFire.sessionDash.detail.consistency'), value: shot.consistencyScore.toFixed(1) },
  ]

  return (
    <div className="fixed inset-0 z-[60] flex justify-end" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 bg-black/60"
        aria-label={t('dryFire.sessionDash.detail.close')}
        onClick={onClose}
      />
      <aside className="relative flex h-full w-full max-w-md flex-col border-l border-slate-800 bg-slate-950 shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 px-4 py-3">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[#facc15] sm:text-sm">
              {t('dryFire.sessionDash.detail.kicker')}
            </p>
            <p className="mt-1.5 font-mono text-base font-bold text-white sm:text-lg">
              {t('dryFire.sessionDash.detail.title', { n: shot.shotNumber })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-8 items-center justify-center rounded-sm border border-slate-700 text-zinc-400 transition hover:border-[#facc15]/40 hover:text-[#facc15]"
            aria-label={t('dryFire.sessionDash.detail.close')}
          >
            <X className="size-4" strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="grid grid-cols-2 gap-2.5">
            {rows.map((r) => (
              <div
                key={r.label}
                className="rounded-sm border border-slate-700 bg-slate-900/70 px-2.5 py-2.5"
              >
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-300 sm:text-[11px]">
                  {r.label}
                </p>
                <p className="mt-1 font-mono text-sm font-bold tabular-nums text-app-text sm:text-base">
                  {r.value}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-lg border border-[#facc15]/35 bg-[rgba(250,204,21,0.08)] px-3 py-3">
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#facc15] sm:text-sm">
              {t('dryFire.sessionDash.detail.recommendation')}
            </p>
            <p className="mt-1.5 font-mono text-sm leading-relaxed text-app-text sm:text-[15px]">
              {translateShotRecommendation(t, shot.recommendation)}
            </p>
          </div>
        </div>
      </aside>
    </div>
  )
}
