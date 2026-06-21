import PhaseSubCriteriaFields from './PhaseSubCriteriaFields'
import TrainingPhaseBlock from './layout/TrainingPhaseBlock'
import { textareaClass, labelClass } from './layout/trainingTerminalTokens'

/**
 * @param {{
 *   title: string
 *   subtitle: string
 *   criteria: import('../../lib/evaluationPhaseCriteria').EvaluationSubCriterion[]
 *   subScores: Record<string, string>
 *   observation: string
 *   onSubScoreChange: (criterionId: string, value: string) => void
 *   onObservationChange: (value: string) => void
 * }} props
 */
export default function VbssPhaseScoreBlock({
  title,
  subtitle,
  criteria,
  subScores,
  observation,
  onSubScoreChange,
  onObservationChange,
}) {
  return (
    <TrainingPhaseBlock title={title} subtitle={subtitle}>
      <PhaseSubCriteriaFields
        criteria={criteria}
        subScores={subScores}
        onSubScoreChange={onSubScoreChange}
        min={0}
        max={10}
        variant="segmented"
        labelClassName={labelClass}
      />
      <label className="block space-y-1.5">
        <span className={labelClass}>Gözlem notu</span>
        <textarea
          className={`${textareaClass} min-h-[4rem]`}
          value={observation}
          onChange={(e) => onObservationChange(e.target.value)}
        />
      </label>
    </TrainingPhaseBlock>
  )
}
