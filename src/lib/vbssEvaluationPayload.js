import { VBSS_EVALUATION_PHASES } from './evaluationPhaseDefinitions'
import { VBSS_PHASE_SUB_CRITERIA } from './evaluationPhaseCriteria'
import {
  buildSubScoresPayload,
  computePhaseScoreFromForm,
  emptySubScoreForm,
  validatePhaseSubScoresForm,
} from './evaluationSubScores'

export { VBSS_EVALUATION_PHASES }

/** @typedef {'boarding' | 'clearing' | 'control'} VbssPhaseId */

/** @typedef {{ subScores: Record<string, string>; observation: string }} VbssPhaseFormState */

/**
 * @typedef {{
 *   operatorId: string
 *   isTimed: boolean
 *   targetOperationSec: string
 *   boarding: VbssPhaseFormState
 *   clearing: VbssPhaseFormState
 *   control: VbssPhaseFormState
 * }} VbssEvaluationFormState
 */

export const VBSS_SCORE_OPTIONS = Array.from({ length: 11 }, (_, i) => i)

/** @param {VbssPhaseId} phaseId */
function emptyPhase(phaseId) {
  return { subScores: emptySubScoreForm(VBSS_PHASE_SUB_CRITERIA[phaseId]), observation: '' }
}

export const VBSS_EVALUATION_INITIAL_FORM = /** @type {VbssEvaluationFormState} */ ({
  operatorId: '',
  isTimed: false,
  targetOperationSec: '',
  boarding: emptyPhase('boarding'),
  clearing: emptyPhase('clearing'),
  control: emptyPhase('control'),
})

/**
 * @deprecated Geriye dönük — form artık subScores kullanır.
 * @param {VbssPhaseFormState} phase
 * @param {VbssPhaseId} [phaseId]
 */
export function parsePhaseScore(phase, phaseId) {
  if (!phaseId) return null
  return computePhaseScoreFromForm(phase.subScores, VBSS_PHASE_SUB_CRITERIA[phaseId], { min: 0, max: 10 })
}

/**
 * @param {VbssEvaluationFormState} form
 * @returns {string | null}
 */
export function validateVbssEvaluationForm(form) {
  if (!form.operatorId.trim()) return 'Değerlendirilecek operatör seçin.'
  for (const meta of VBSS_EVALUATION_PHASES) {
    const phase = form[meta.id]
    const err = validatePhaseSubScoresForm(phase.subScores, VBSS_PHASE_SUB_CRITERIA[meta.id], {
      min: 0,
      max: 10,
      phaseTitle: meta.title,
    })
    if (err) return err
  }
  if (form.isTimed) {
    const sec = Number(form.targetOperationSec)
    if (!Number.isFinite(sec) || sec <= 0) return 'Hedef operasyon süresi geçersiz.'
  }
  return null
}

/**
 * @param {VbssPhaseFormState} phase
 * @param {VbssPhaseId} phaseId
 */
export function buildVbssPhasePayload(phase, phaseId) {
  const criteria = VBSS_PHASE_SUB_CRITERIA[phaseId]
  const { subScores, score } = buildSubScoresPayload(phase.subScores, criteria, { min: 0, max: 10 })
  return {
    score,
    subScores,
    observation: String(phase.observation ?? '').trim(),
  }
}

/**
 * @param {{
 *   form: VbssEvaluationFormState
 *   groupId: string
 *   instructorId: string
 *   operatorName?: string
 * }} input
 */
export function buildVbssEvaluationPayload({ form, groupId, instructorId, operatorName = '' }) {
  /** @type {Record<VbssPhaseId, { score: number; subScores: Record<string, number>; observation: string }>} */
  const operationalScores = {}
  const operationalNotes = {}

  let sum = 0
  for (const meta of VBSS_EVALUATION_PHASES) {
    const phasePayload = buildVbssPhasePayload(form[meta.id], meta.id)
    sum += phasePayload.score
    operationalScores[meta.id] = phasePayload
    operationalNotes[meta.id] = phasePayload.observation
  }

  const overallScore = Math.round((sum / VBSS_EVALUATION_PHASES.length) * 10) / 10

  return {
    groupId,
    instructorId,
    operatorId: form.operatorId.trim(),
    operatorName: String(operatorName).trim(),
    discipline: 'vbss',
    type: 'vbss_evaluation',
    isTimed: form.isTimed,
    targetOperationSec: form.isTimed ? Math.max(0.01, Number(form.targetOperationSec) || 0) : null,
    phases: operationalScores,
    operationalScores,
    operationalNotes,
    overallScore,
  }
}

export { VBSS_PHASE_SUB_CRITERIA }
