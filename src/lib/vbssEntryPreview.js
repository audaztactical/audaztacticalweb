import { VBSS_EVALUATION_PHASES, buildVbssPhasePayload } from './vbssEvaluationPayload'
import { validateVbssObservedEvalForm } from './vbssObservedEvalPayload'

/**
 * @param {import('./vbssObservedEvalPayload').VbssObservedEvalFormState} form
 */
export function computeVbssEntryPreview(form) {
  const validationError = validateVbssObservedEvalForm(form)

  /** @type {Record<string, number>} */
  const phaseScores = {}
  let sum = 0
  for (const meta of VBSS_EVALUATION_PHASES) {
    const payload = buildVbssPhasePayload(form[meta.id], meta.id)
    phaseScores[meta.id] = payload.score
    sum += payload.score
  }

  const overallScore = Math.round((sum / VBSS_EVALUATION_PHASES.length) * 10) / 10
  const successPercent = Math.round(overallScore * 10)

  return { validationError, overallScore, successPercent, phaseScores }
}
