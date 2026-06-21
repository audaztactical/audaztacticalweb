import {
  TCCC_MARCH_EVALUATION_PHASES,
  buildTcccPhasePayload,
  formHasAnyCriticalFail,
} from './tcccEvaluationPayload'
import { validateTcccObservedEvalForm } from './tcccObservedEvalPayload'

/**
 * @param {import('./tcccObservedEvalPayload').TcccObservedEvalFormState} form
 */
export function computeTcccEntryPreview(form) {
  const validationError = validateTcccObservedEvalForm(form)
  const criticalFail = formHasAnyCriticalFail(form)

  /** @type {Record<string, number>} */
  const phaseScores = {}
  let sum = 0
  for (const meta of TCCC_MARCH_EVALUATION_PHASES) {
    const payload = buildTcccPhasePayload(form[meta.id], meta.id)
    phaseScores[meta.id] = payload.score
    sum += payload.score
  }

  const overallScore = Math.round((sum / TCCC_MARCH_EVALUATION_PHASES.length) * 10) / 10
  const successPercent = criticalFail ? 0 : Math.round(overallScore * 10)

  return { validationError, overallScore, successPercent, phaseScores, criticalFail }
}
