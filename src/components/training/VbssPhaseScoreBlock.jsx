import PhaseSubCriteriaFields from './PhaseSubCriteriaFields'
import TrainingPhaseBlock from './layout/TrainingPhaseBlock'
import { textareaClass, labelClass } from './layout/trainingTerminalTokens'
import {
  formatObservedEvalObservationNoteLabel,
  formatObservedEvalPhaseSubtitle,
  formatObservedEvalPhaseTitle,
} from '../../lib/trainingDisplayText'

/**
 * @param {{
 *   phaseId: import('../../lib/vbssEvaluationPayload').VbssPhaseId
 *   criteria: import('../../lib/evaluationPhaseCriteria').EvaluationSubCriterion[]
 *   subScores: Record<string, string>
 *   observation: string
 *   onSubScoreChange: (criterionId: string, value: string) => void
 *   onObservationChange: (value: string) => void
 * }} props
 */
export default function VbssPhaseScoreBlock({
  phaseId,
  criteria,
  subScores,
  observation,
  onSubScoreChange,
  onObservationChange,
}) {
  const title = formatObservedEvalPhaseTitle('vbss', phaseId)
  const subtitle = formatObservedEvalPhaseSubtitle('vbss', phaseId)

  return (
    <TrainingPhaseBlock title={title} subtitle={subtitle}>
      <PhaseSubCriteriaFields
        criteria={criteria}
        subScores={subScores}
        onSubScoreChange={onSubScoreChange}
        discipline="vbss"
        phaseId={phaseId}
        min={0}
        max={10}
        variant="segmented"
        labelClassName={labelClass}
        segmentedBarClassName="gap-1.5 lg:gap-2"
        segmentedButtonClassName="h-9 lg:h-10"
      />
      <label className="block space-y-1.5">
        <span className={labelClass}>{formatObservedEvalObservationNoteLabel()}</span>
        <textarea
          className={`${textareaClass} min-h-[4.5rem]`}
          value={observation}
          onChange={(e) => onObservationChange(e.target.value)}
        />
      </label>
    </TrainingPhaseBlock>
  )
}
