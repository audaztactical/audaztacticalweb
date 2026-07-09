import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import TacticalPanel from '../ui/TacticalPanel'
import { TCCC_MARCH_ACTION_CHIPS, TCCC_MARCH_EVALUATION_PHASES, TCCC_PHASE_SUB_CRITERIA } from '../../lib/tcccEvaluationPayload'
import { PhaseSubScoresDisplay } from './PhaseSubCriteriaFields'
import {
  filterObservedEvalLogs,
  getObservedEvalOverallScore,
  getObservedEvalSuccessPercent,
  isTcccObservedEval,
  sortObservedEvalLogsDesc,
} from '../../lib/observedEvalRegistry'
import {
  formatObservedEvalPhaseTitle,
  formatTcccMarchActionChipLabel,
  formatTcccObservedEvalDateDisplay,
  formatTcccObservedEvalTypeLabel,
} from '../../lib/trainingDisplayText'

/**
 * @param {{
 *   logs: Record<string, unknown>[]
 *   loading?: boolean
 * }} props
 */
export default function TcccObservedEvalRegistry({ logs, loading = false }) {
  const { t } = useTranslation('training')
  const rows = useMemo(
    () => sortObservedEvalLogsDesc(filterObservedEvalLogs(logs).filter(isTcccObservedEval)),
    [logs],
  )

  if (loading) {
    return (
      <p className="font-mono-technical text-[10px] uppercase text-app-text/55">
        {t('sectors.tccc.observedEval.registry.syncing')}
      </p>
    )
  }

  if (rows.length === 0) {
    return (
      <TacticalPanel className="border-accent/15 p-6 text-center">
        <p className="font-mono-technical text-[10px] uppercase tracking-wider text-app-text/45">
          {t('sectors.tccc.observedEval.registry.empty')}
        </p>
      </TacticalPanel>
    )
  }

  return (
    <div className="w-full min-w-0 space-y-3">
      {rows.map((row) => {
        const phases = /** @type {Record<string, { score?: number; criticalFail?: boolean; actionChips?: string[] }>} */ (
          row.phases ?? row.marchScores ?? {}
        )
        const overall = getObservedEvalOverallScore(row)
        const success = getObservedEvalSuccessPercent(row)
        const badge = formatTcccObservedEvalTypeLabel(row)
        const unstable = row.casualtyStatus === 'EKS_KIA'

        return (
          <TacticalPanel
            key={String(row.id)}
            className="border-accent/15 bg-app-bg/80 p-4 opacity-85 transition hover:opacity-100"
          >
            <div className="flex flex-wrap items-start justify-between gap-2 border-b border-accent/10 pb-3">
              <div>
                <p className="font-mono-technical text-xs font-bold uppercase tracking-wider text-app-text">
                  {t('sectors.tccc.observedEval.registry.observerPrefix', {
                    name: String(row.observerName ?? '—'),
                  })}
                </p>
                <p className="mt-0.5 font-mono-technical text-[9px] text-app-text/50">
                  {formatTcccObservedEvalDateDisplay(row)}
                </p>
              </div>
              <span className="rounded border border-amber-500/40 bg-amber-950/30 px-2 py-0.5 font-mono-technical text-[8px] font-bold uppercase tracking-wider text-amber-400/90">
                {badge}
              </span>
            </div>

            {unstable ? (
              <p className="mt-2 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-red-400">
                {t('sectors.tccc.observedEval.registry.casualtyUnstable')}
              </p>
            ) : null}

            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {TCCC_MARCH_EVALUATION_PHASES.map((meta) => {
                const p = phases[meta.id]
                const chips = p?.actionChips ?? []
                const chipLabels = TCCC_MARCH_ACTION_CHIPS[meta.id]
                  .filter((c) => chips.includes(c.id))
                  .map((c) => formatTcccMarchActionChipLabel(meta.id, c.id, c.label))
                return (
                  <div
                    key={meta.id}
                    className={`rounded border px-2 py-2 ${p?.criticalFail ? 'border-red-500/30 bg-red-950/20' : 'border-white/10 bg-black/30'}`}
                  >
                    <p className="font-mono-technical text-[8px] uppercase text-app-text/45">
                      {formatObservedEvalPhaseTitle('tccc', meta.id, meta.title)}
                    </p>
                    <div className="mt-1">
                      <PhaseSubScoresDisplay
                        phaseData={p}
                        criteria={TCCC_PHASE_SUB_CRITERIA[meta.id]}
                        maxScore={10}
                        compact
                        discipline="tccc"
                        phaseId={meta.id}
                      />
                    </div>
                    {chipLabels.length > 0 ? (
                      <p className="mt-1 line-clamp-2 font-mono-technical text-[7px] text-app-text/45">
                        {chipLabels.join(' · ')}
                      </p>
                    ) : null}
                  </div>
                )
              })}
            </div>

            <div className="mt-3 flex flex-wrap gap-4 font-mono-technical text-[9px] uppercase text-app-text/55">
              {overall != null ? (
                <span>{t('sectors.tccc.observedEval.registry.overall', { score: overall })}</span>
              ) : null}
              {success != null ? (
                <span>{t('sectors.tccc.observedEval.registry.success', { percent: success })}</span>
              ) : null}
              {row.isTimed ? (
                <span>
                  {t('sectors.tccc.observedEval.registry.target', {
                    seconds: String(row.targetInterventionSec ?? '—'),
                  })}
                </span>
              ) : null}
            </div>
          </TacticalPanel>
        )
      })}
    </div>
  )
}
