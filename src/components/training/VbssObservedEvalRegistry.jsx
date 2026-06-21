import { useMemo } from 'react'
import TacticalPanel from '../ui/TacticalPanel'
import { VBSS_EVALUATION_PHASES, VBSS_PHASE_SUB_CRITERIA } from '../../lib/vbssEvaluationPayload'
import { PhaseSubScoresDisplay } from './PhaseSubCriteriaFields'
import {
  filterObservedEvalLogs,
  formatObservedEvalDate,
  getObservedEvalOverallScore,
  getObservedEvalSuccessPercent,
  isVbssObservedEval,
  observedEvalTypeLabel,
  sortObservedEvalLogsDesc,
} from '../../lib/observedEvalRegistry'

/**
 * @param {{
 *   logs: Record<string, unknown>[]
 *   loading?: boolean
 * }} props
 */
export default function VbssObservedEvalRegistry({ logs, loading = false }) {
  const rows = useMemo(
    () => sortObservedEvalLogsDesc(filterObservedEvalLogs(logs).filter(isVbssObservedEval)),
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
          Henüz gözlemli VBSS kaydı yok — PDF formu indirip kayıt girin.
        </p>
      </TacticalPanel>
    )
  }

  return (
    <div className="w-full min-w-0 space-y-3">
      {rows.map((row) => {
        const phases = /** @type {Record<string, { score?: number; observation?: string }>} */ (row.phases ?? row.operationalScores ?? {})
        const overall = getObservedEvalOverallScore(row)
        const success = getObservedEvalSuccessPercent(row)
        const badge = observedEvalTypeLabel(row)

        return (
          <TacticalPanel
            key={String(row.id)}
            className="border-accent/15 bg-app-bg/80 p-4 opacity-85 transition hover:opacity-100"
          >
            <div className="flex flex-wrap items-start justify-between gap-2 border-b border-accent/10 pb-3">
              <div>
                <p className="font-mono-technical text-xs font-bold uppercase tracking-wider text-app-text">
                  Gözlem · {String(row.observerName ?? '—')}
                </p>
                <p className="mt-0.5 font-mono-technical text-[9px] text-app-text/50">{formatObservedEvalDate(row)}</p>
              </div>
              <span className="rounded border border-amber-500/40 bg-amber-950/30 px-2 py-0.5 font-mono-technical text-[8px] font-bold uppercase tracking-wider text-amber-400/90">
                {badge}
              </span>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {VBSS_EVALUATION_PHASES.map((meta) => (
                <div key={meta.id} className="rounded border border-white/10 bg-black/30 px-2 py-2">
                  <p className="font-mono-technical text-[8px] uppercase text-app-text/45">{meta.id}</p>
                  <div className="mt-1">
                    <PhaseSubScoresDisplay
                      phaseData={phases[meta.id]}
                      criteria={VBSS_PHASE_SUB_CRITERIA[meta.id]}
                      maxScore={10}
                      compact
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap gap-4 font-mono-technical text-[9px] uppercase text-app-text/55">
              {overall != null ? <span>Genel: {overall}/10</span> : null}
              {success != null ? <span>Başarı: %{success}</span> : null}
              {row.isTimed ? <span>Hedef: {String(row.targetOperationSec ?? '—')}s</span> : null}
            </div>
          </TacticalPanel>
        )
      })}
    </div>
  )
}
