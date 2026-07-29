import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSessionDashboardState } from './session/useSessionDashboardState'
import SessionStatCards from './session/SessionStatCards'
import SessionTrendCharts from './session/SessionTrendCharts'
import SessionShotList from './session/SessionShotList'
import SessionShotDetailDrawer from './session/SessionShotDetailDrawer'
import SessionHeatmapPlaceholder from './session/SessionHeatmapPlaceholder'
import AnalysisFeedbackBox from './AnalysisFeedbackBox'
import { resolveSessionFeedback } from '../../lib/analysisFeedback'

/**
 * Live session dashboard — yalnızca analysisRef.session (motorlara yazmaz).
 */
export default function DryFireSessionDashboard() {
  const { t } = useTranslation('timer')
  const snap = useSessionDashboardState()
  const [selected, setSelected] = useState(
    /** @type {import('../../lib/sessionEngine').ShotRecord | null} */ (null),
  )

  const sessionFb = useMemo(
    () =>
      resolveSessionFeedback({
        shotCount: snap.shotCount,
        averageScore: snap.averageScore,
        consistency: snap.consistency,
        grade: snap.grade,
        lastRecommendation: snap.shots[snap.shots.length - 1]?.recommendation,
      }),
    [snap.averageScore, snap.consistency, snap.grade, snap.shotCount, snap.shots],
  )

  return (
    <section
      className="relative w-full min-w-0 overflow-hidden rounded-xl border border-slate-800 bg-slate-950 p-3 sm:p-5"
      aria-label={t('dryFire.sessionDash.aria')}
    >
      <span
        className="pointer-events-none absolute left-2 top-2 h-3 w-3 border-l border-t border-slate-600/70"
        aria-hidden
      />
      <span
        className="pointer-events-none absolute right-2 top-2 h-3 w-3 border-r border-t border-slate-600/70"
        aria-hidden
      />
      <span
        className="pointer-events-none absolute bottom-2 left-2 h-3 w-3 border-b border-l border-slate-600/70"
        aria-hidden
      />
      <span
        className="pointer-events-none absolute bottom-2 right-2 h-3 w-3 border-b border-r border-slate-600/70"
        aria-hidden
      />

      <div className="mb-3 flex flex-wrap items-end justify-between gap-2 sm:mb-4 sm:gap-3">
        <div className="min-w-0">
          <p className="font-mono text-sm font-bold uppercase leading-snug tracking-[0.14em] text-[#facc15] sm:text-base sm:tracking-[0.16em]">
            {t('dryFire.sessionDash.kicker')}
          </p>
          <h2 className="mt-1.5 break-words font-mono text-base font-bold tracking-wide text-white sm:text-lg">
            {t('dryFire.sessionDash.title')}
          </h2>
        </div>
        <div className="flex flex-wrap gap-2 font-mono text-[11px] uppercase tracking-widest text-zinc-300 sm:text-xs">
          <span className="rounded border border-slate-600 px-2.5 py-1">
            {t('dryFire.sessionDash.trend5', { n: snap.trends.last5.toFixed(0) })}
          </span>
          <span className="rounded border border-slate-600 px-2.5 py-1">
            {t('dryFire.sessionDash.trend10', { n: snap.trends.last10.toFixed(0) })}
          </span>
          <span className="rounded border border-slate-600 px-2.5 py-1">
            {t('dryFire.sessionDash.trend20', { n: snap.trends.last20.toFixed(0) })}
          </span>
          <span className="rounded border border-[#facc15]/40 bg-[rgba(250,204,21,0.1)] px-2.5 py-1 text-[#facc15]">
            {t('dryFire.sessionDash.pb', { n: snap.personalBest.toFixed(0) })}
          </span>
        </div>
      </div>

      <AnalysisFeedbackBox
        className="mb-4 px-0"
        statusKey={sessionFb.statusKey}
        tipKey={sessionFb.tipKey}
        severity={sessionFb.severity}
        params={sessionFb.params}
      />

      <SessionStatCards
        shotCount={snap.shotCount}
        averageScore={snap.averageScore}
        bestScore={snap.bestScore}
        worstScore={snap.worstScore}
        consistency={snap.consistency}
        grade={snap.grade}
      />

      <div className="mt-4">
        <p className="mb-2 font-mono text-xs font-bold uppercase tracking-[0.14em] text-[#facc15]/90 sm:text-sm">
          {t('dryFire.sessionDash.chartsTitle')}
        </p>
        <SessionTrendCharts shots={snap.shots} />
      </div>

      <div className="mt-4 grid w-full min-w-0 grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="min-w-0 lg:col-span-3">
          <SessionShotList
            shots={snap.shots}
            startedAt={snap.startedAt}
            selectedShotNumber={selected?.shotNumber ?? null}
            onSelect={setSelected}
          />
        </div>
        <div className="min-w-0 lg:col-span-2">
          <p className="mb-2 font-mono text-xs font-bold uppercase tracking-[0.14em] text-[#facc15]/90 sm:text-sm">
            {t('dryFire.sessionDash.heatmapTitle')}
          </p>
          <SessionHeatmapPlaceholder />
          <div className="mt-3 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2.5">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-zinc-300 sm:text-xs">
              {t('dryFire.sessionDash.gradeDist')}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(['A+', 'A', 'B', 'C', 'D', 'F']).map((g) => (
                <span
                  key={g}
                  className="rounded border border-slate-600 bg-slate-950 px-2.5 py-1 font-mono text-xs tabular-nums text-zinc-200"
                >
                  {g} · {snap.gradeDistribution[g] ?? 0}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <SessionShotDetailDrawer
        open={Boolean(selected)}
        shot={selected}
        onClose={() => setSelected(null)}
      />
    </section>
  )
}
