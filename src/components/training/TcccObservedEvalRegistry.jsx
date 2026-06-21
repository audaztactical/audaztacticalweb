import { useMemo } from 'react'
import TacticalPanel from '../ui/TacticalPanel'
import { TCCC_MARCH_ACTION_CHIPS, TCCC_MARCH_EVALUATION_PHASES, TCCC_PHASE_SUB_CRITERIA } from '../../lib/tcccEvaluationPayload'
import { PhaseSubScoresDisplay } from './PhaseSubCriteriaFields'
import {
  filterObservedEvalLogs,
  formatObservedEvalDate,
  getObservedEvalOverallScore,
  getObservedEvalSuccessPercent,
  isTcccObservedEval,
  observedEvalTypeLabel,
  sortObservedEvalLogsDesc,
} from '../../lib/observedEvalRegistry'

/**
 * @param {{
 *   logs: Record<string, unknown>[]
 *   loading?: boolean
 * }} props
 */
export default function TcccObservedEvalRegistry({ logs, loading = false }) {
  const rows = useMemo(
    () => sortObservedEvalLogsDesc(filterObservedEvalLogs(logs).filter(isTcccObservedEval)),
    [logs],
  )

  if (loading) {
    return (
      <p className="font-mono-technical text-[10px] uppercase text-app-text/55">Kayıtlar senkronize ediliyor…</p>
    )
  }

  if (rows.length === 0) {
    return (
      <TacticalPanel className="border-accent/15 p-6 text-center">
        <p className="font-mono-technical text-[10px] uppercase tracking-wider text-app-text/45">
          Henüz gözlemli TCCC kaydı yok — PDF formu indirip kayıt girin.
        </p>
      </TacticalPanel>
    )
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const phases = /** @type {Record<string, { score?: number; criticalFail?: boolean; actionChips?: string[] }>} */ (
          row.phases ?? row.marchScores ?? {}
        )
        const overall = getObservedEvalOverallScore(row)
        const success = getObservedEvalSuccessPercent(row)
        const badge = observedEvalTypeLabel(row)
        const unstable = row.casualtyStatus === 'EKS_KIA'

        return (
          <TacticalPanel
            key={String(row.id)}
            className="border-accent/15 bg-app-bg/80 p-4 opacity-85 transition hover:opacity-100"
          >
            <div className="flex flex-wrap items-start justify-between gap-2 border-b border-accent/10 pb-3">
              <div>
                <p className="font-mono-technical text-xs font-bold uppercase tracking-wider text-app-text">
                  MARCH Gözlem · {String(row.observerName ?? '—')}
                </p>
                <p className="mt-0.5 font-mono-technical text-[9px] text-app-text/50">{formatObservedEvalDate(row)}</p>
              </div>
              <span className="rounded border border-amber-500/40 bg-amber-950/30 px-2 py-0.5 font-mono-technical text-[8px] font-bold uppercase tracking-wider text-amber-400/90">
                {badge}
              </span>
            </div>

            {unstable ? (
              <p className="mt-2 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-red-400">
                Yaralı durumu: EKS / K.İ.A
              </p>
            ) : null}

            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {TCCC_MARCH_EVALUATION_PHASES.map((meta) => {
                const p = phases[meta.id]
                const chips = p?.actionChips ?? []
                const chipLabels = TCCC_MARCH_ACTION_CHIPS[meta.id]
                  .filter((c) => chips.includes(c.id))
                  .map((c) => c.label)
                return (
                  <div
                    key={meta.id}
                    className={`rounded border px-2 py-2 ${p?.criticalFail ? 'border-red-500/30 bg-red-950/20' : 'border-white/10 bg-black/30'}`}
                  >
                    <p className="font-mono-technical text-[8px] uppercase text-app-text/45">{meta.letter}</p>
                    <div className="mt-1">
                      <PhaseSubScoresDisplay
                        phaseData={p}
                        criteria={TCCC_PHASE_SUB_CRITERIA[meta.id]}
                        maxScore={10}
                        compact
                      />
                    </div>
                    {chipLabels.length > 0 ? (
                      <p className="mt-1 line-clamp-2 font-mono-technical text-[7px] text-app-text/45">{chipLabels.join(' · ')}</p>
                    ) : null}
                  </div>
                )
              })}
            </div>

            <div className="mt-3 flex flex-wrap gap-4 font-mono-technical text-[9px] uppercase text-app-text/55">
              {overall != null ? <span>Genel: {overall}/10</span> : null}
              {success != null ? <span>Başarı: %{success}</span> : null}
              {row.isTimed ? <span>Hedef: {String(row.targetInterventionSec ?? '—')}s</span> : null}
            </div>
          </TacticalPanel>
        )
      })}
    </div>
  )
}
