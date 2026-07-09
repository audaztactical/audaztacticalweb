import { AlertTriangle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import PhaseSubCriteriaFields from './PhaseSubCriteriaFields'
import TrainingPhaseBlock from './layout/TrainingPhaseBlock'
import { textareaClass, labelClass } from './layout/trainingTerminalTokens'
import { TCCC_MARCH_ACTION_CHIPS } from '../../lib/tcccEvaluationPayload'
import {
  formatObservedEvalObservationNoteLabel,
  formatObservedEvalPhaseSubtitle,
  formatObservedEvalPhaseTitle,
  formatTcccCriticalFailLabel,
  formatTcccMarchActionChipLabel,
} from '../../lib/trainingDisplayText'

const chipClass = (active) =>
  `rounded border px-2.5 py-1.5 font-mono-technical text-[10px] transition ${
    active
      ? 'border-accent/50 bg-accent/10 text-accent'
      : 'border-white/10 text-app-text/60 hover:border-accent/30'
  }`

/**
 * @param {{
 *   letter: string
 *   phaseId: import('../../lib/tcccEvaluationPayload').TcccMarchPhaseId
 *   phase: import('../../lib/tcccEvaluationPayload').TcccMarchPhaseFormState
 *   criteria: import('../../lib/evaluationPhaseCriteria').EvaluationSubCriterion[]
 *   onPatch: (next: Partial<import('../../lib/tcccEvaluationPayload').TcccMarchPhaseFormState>) => void
 *   onToggleChip: (chipId: string) => void
 * }} props
 */
export default function TcccMarchPhaseBlock({
  letter,
  phaseId,
  phase,
  criteria,
  onPatch,
  onToggleChip,
}) {
  const { t } = useTranslation('training')
  const title = formatObservedEvalPhaseTitle('tccc', phaseId)
  const subtitle = formatObservedEvalPhaseSubtitle('tccc', phaseId)

  const headerExtra = (
    <button
      type="button"
      onClick={() => onPatch({ criticalFail: !phase.criticalFail })}
      className={[
        'inline-flex items-center gap-1 rounded border px-2 py-1 font-mono-technical text-[8px] font-bold uppercase tracking-wider',
        phase.criticalFail
          ? 'border-red-500/50 bg-red-950/40 text-red-400'
          : 'border-white/15 text-app-text/50 hover:border-red-500/40',
      ].join(' ')}
    >
      <AlertTriangle className="size-3" aria-hidden />
      {formatTcccCriticalFailLabel(phase.criticalFail)}
    </button>
  )

  return (
    <TrainingPhaseBlock title={`${letter} — ${title}`} subtitle={subtitle} headerExtra={headerExtra}>
      <PhaseSubCriteriaFields
        criteria={criteria}
        subScores={phase.subScores}
        onSubScoreChange={(criterionId, value) =>
          onPatch({ subScores: { [criterionId]: value } })
        }
        discipline="tccc"
        phaseId={phaseId}
        min={1}
        max={10}
        disabled={phase.criticalFail}
        variant="segmented"
        labelClassName={labelClass}
        segmentedBarClassName="gap-1.5 lg:gap-2"
        segmentedButtonClassName="h-9 lg:h-10"
      />

      <div className="space-y-1.5">
        <span className={labelClass}>{t('sectors.tccc.observedEval.form.tacticalIntervention')}</span>
        <div className="flex flex-wrap gap-2">
          {TCCC_MARCH_ACTION_CHIPS[phaseId].map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => onToggleChip(chip.id)}
              className={chipClass(Boolean(phase.actions[chip.id]))}
            >
              {formatTcccMarchActionChipLabel(phaseId, chip.id, chip.label)}
            </button>
          ))}
        </div>
      </div>

      <label className="block space-y-1.5">
        <span className={labelClass}>{formatObservedEvalObservationNoteLabel()}</span>
        <textarea
          className={`${textareaClass} min-h-[4.5rem]`}
          value={phase.observation}
          onChange={(e) => onPatch({ observation: e.target.value })}
        />
      </label>
    </TrainingPhaseBlock>
  )
}
