import { VBSS_SCORE_OPTIONS } from '../../lib/vbssEvaluationPayload'
import { TCCC_SCORE_OPTIONS } from '../../lib/tcccEvaluationPayload'

/** @typedef {import('../../lib/evaluationPhaseCriteria').EvaluationSubCriterion} EvaluationSubCriterion */

const selectClass =
  'dossier-blood-select w-full rounded border border-accent/35 bg-app-bg py-2 pl-2 pr-8 font-mono-technical text-[11px] uppercase text-app-text outline-none focus:border-accent/60'

const labelClass = 'font-mono-technical text-[8px] font-bold uppercase tracking-[0.18em] text-app-text/55'

/**
 * @param {{
 *   criteria: EvaluationSubCriterion[]
 *   subScores: Record<string, string>
 *   onSubScoreChange: (criterionId: string, value: string) => void
 *   min: number
 *   max: number
 *   disabled?: boolean
 *   variant?: 'select' | 'segmented'
 *   selectClassName?: string
 *   labelClassName?: string
 *   segmentedBarClassName?: string
 *   segmentedButtonClassName?: string
 * }} props
 */
export default function PhaseSubCriteriaFields({
  criteria,
  subScores,
  onSubScoreChange,
  min,
  max,
  disabled = false,
  variant = 'select',
  selectClassName = selectClass,
  labelClassName = labelClass,
  segmentedBarClassName = 'gap-1',
  segmentedButtonClassName = 'h-8',
}) {
  const options =
    min === 0
      ? VBSS_SCORE_OPTIONS
      : TCCC_SCORE_OPTIONS.filter((n) => n >= min && n <= max)

  if (!criteria.length) return null

  return (
    <div className="space-y-3">
      {criteria.map((criterion) => (
        <div key={criterion.id} className="space-y-1.5">
          {variant === 'select' ? (
            <label className="block space-y-1.5">
              <span className={labelClassName}>
                {criterion.label} ({min}–{max}) *
              </span>
              <select
                className={selectClassName}
                value={subScores[criterion.id] ?? ''}
                onChange={(e) => onSubScoreChange(criterion.id, e.target.value)}
                disabled={disabled}
                required={!disabled}
              >
                <option value="">— SEÇİN —</option>
                {options.map((n) => (
                  <option key={n} value={String(n)}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <SegmentedCriterionBar
              label={criterion.label}
              value={subScores[criterion.id] ?? ''}
              onChange={(v) => onSubScoreChange(criterion.id, v)}
              min={min}
              max={max}
              disabled={disabled}
              labelClassName={labelClassName}
              barClassName={segmentedBarClassName}
              buttonClassName={segmentedButtonClassName}
            />
          )}
        </div>
      ))}
    </div>
  )
}

/**
 * @param {{
 *   label: string
 *   value: string
 *   onChange: (v: string) => void
 *   min: number
 *   max: number
 *   disabled?: boolean
 *   labelClassName?: string
 *   barClassName?: string
 *   buttonClassName?: string
 * }} props
 */
function SegmentedCriterionBar({
  label,
  value,
  onChange,
  min,
  max,
  disabled = false,
  labelClassName = labelClass,
  barClassName = 'gap-1',
  buttonClassName = 'h-8',
}) {
  const selected = disabled ? 0 : Number(value) || 0
  const values = Array.from({ length: max - min + 1 }, (_, i) => min + i)

  return (
    <div className="space-y-1.5" role="group" aria-label={`${label} skoru`}>
      <p className={labelClassName}>{label}</p>
      <div className={`flex ${barClassName}`}>
        {values.map((n) => {
          const filled = selected >= n
          return (
            <button
              key={n}
              type="button"
              disabled={disabled}
              aria-pressed={selected === n}
              aria-label={`${label} skor ${n}`}
              onClick={() => onChange(String(n))}
              className={[
                `${buttonClassName} min-w-0 flex-1 rounded-sm border font-mono text-[10px] font-bold tabular-nums transition`,
                filled
                  ? 'border-lime-400 bg-lime-500 text-zinc-950 shadow-[0_0_12px_rgba(132,204,22,0.35)]'
                  : 'border-zinc-700 bg-zinc-800 text-zinc-600 hover:border-zinc-600',
                disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer',
              ].join(' ')}
            >
              {n}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/**
 * HUD / registry: alt kriter satırları veya legacy tek skor.
 * @param {{
 *   phaseData: { score?: number; subScores?: Record<string, number> } | null | undefined
 *   criteria: EvaluationSubCriterion[]
 *   maxScore?: number
 *   compact?: boolean
 * }} props
 */
export function PhaseSubScoresDisplay({ phaseData, criteria, maxScore = 10, compact = false }) {
  if (!phaseData) return <span className="text-zinc-500">—</span>

  const subScores = phaseData.subScores
  const hasSub =
    subScores &&
    typeof subScores === 'object' &&
    criteria.some((c) => typeof subScores[c.id] === 'number')

  if (hasSub) {
    return (
      <ul className={compact ? 'space-y-1' : 'space-y-2'}>
        {criteria.map((c) => {
          const v = subScores?.[c.id]
          return (
            <li
              key={c.id}
              className={
                compact
                  ? 'flex items-center justify-between gap-2 font-mono text-[10px]'
                  : 'flex items-center justify-between gap-3 rounded border border-zinc-800/80 bg-zinc-950/40 px-2 py-1.5'
              }
            >
              <span className={compact ? 'text-zinc-500' : 'text-xs text-zinc-500'}>{c.label}</span>
              <span className="font-bold tabular-nums text-zinc-100">
                {typeof v === 'number' ? v : '—'}
                <span className="text-zinc-600">/{maxScore}</span>
              </span>
            </li>
          )
        })}
      </ul>
    )
  }

  if (typeof phaseData.score === 'number') {
    return (
      <span className="font-mono font-bold tabular-nums text-zinc-100">
        {phaseData.score}
        <span className="text-lg font-medium text-zinc-500">/{maxScore}</span>
      </span>
    )
  }

  return <span className="text-zinc-500">—</span>
}
