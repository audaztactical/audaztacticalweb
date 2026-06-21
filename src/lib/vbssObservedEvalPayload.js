import { invStr } from './inventoryIlws'
import {
  OBSERVATION_METHOD_PEER,
  OBSERVED_EVAL_TYPE,
  RECORD_SOURCE_SELF_ENTRY,
  VBSS_OBSERVED_EVAL_KIND,
  VBSS_OBSERVED_PDF_FORM_VERSION,
  VERIFICATION_STATUS_UNVERIFIED,
} from './observedEvalConstants'
import {
  VBSS_EVALUATION_INITIAL_FORM,
  VBSS_EVALUATION_PHASES,
  buildVbssPhasePayload,
  validateVbssEvaluationForm,
} from './vbssEvaluationPayload'
import { TRAINING_TYPE_INDIVIDUAL } from './trainingGroupFields'

/**
 * @typedef {Omit<import('./vbssEvaluationPayload').VbssEvaluationFormState, 'operatorId'> & {
 *   observerName: string
 *   observerCallsign: string
 *   observedAt: string
 *   operationNote: string
 * }} VbssObservedEvalFormState
 */

export const VBSS_OBSERVED_EVAL_INITIAL_FORM = /** @type {VbssObservedEvalFormState} */ ({
  observerName: '',
  observerCallsign: '',
  observedAt: '',
  isTimed: false,
  targetOperationSec: '',
  boarding: { ...VBSS_EVALUATION_INITIAL_FORM.boarding },
  clearing: { ...VBSS_EVALUATION_INITIAL_FORM.clearing },
  control: { ...VBSS_EVALUATION_INITIAL_FORM.control },
  operationNote: '',
})

/**
 * @param {VbssObservedEvalFormState} form
 * @returns {string | null}
 */
export function validateVbssObservedEvalForm(form) {
  if (!invStr(form.observerName).trim()) return 'Gözlemci adı zorunludur.'
  if (!invStr(form.observedAt).trim()) return 'Saha tarihi zorunludur.'
  const coreErr = validateVbssEvaluationForm({ ...form, operatorId: 'self' })
  if (coreErr && coreErr !== 'Değerlendirilecek operatör seçin.') return coreErr
  if (form.isTimed) {
    const sec = Number(form.targetOperationSec)
    if (!Number.isFinite(sec) || sec <= 0) return 'Hedef operasyon süresi geçersiz.'
  }
  return null
}

/**
 * @param {{
 *   form: VbssObservedEvalFormState
 *   userId: string
 *   operatorName?: string
 * }} input
 */
export function buildVbssObservedEvalPayload({ form, userId, operatorName = '' }) {
  /** @type {Record<string, { score: number; subScores: Record<string, number>; observation: string }>} */
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
  const successPercent = Math.round(overallScore * 10)
  const observedAt = invStr(form.observedAt).trim()
  const timestamp = observedAt ? new Date(observedAt).toISOString() : new Date().toISOString()

  return {
    userId,
    operatorName: String(operatorName).trim(),
    kind: VBSS_OBSERVED_EVAL_KIND,
    operationCategory: 'vbss',
    type: OBSERVED_EVAL_TYPE,
    discipline: 'vbss',
    recordSource: RECORD_SOURCE_SELF_ENTRY,
    verificationStatus: VERIFICATION_STATUS_UNVERIFIED,
    observationMethod: OBSERVATION_METHOD_PEER,
    observerName: invStr(form.observerName).trim(),
    observerCallsign: invStr(form.observerCallsign).trim() || null,
    observedAt,
    pdfFormVersion: VBSS_OBSERVED_PDF_FORM_VERSION,
    trainingType: TRAINING_TYPE_INDIVIDUAL,
    groupId: null,
    instructorId: null,
    verifiedByInstructorId: null,
    verifiedAt: null,
    linkedInstructorEvaluationId: null,
    isTimed: form.isTimed,
    targetOperationSec: form.isTimed ? Math.max(0.01, Number(form.targetOperationSec) || 0) : null,
    phases: operationalScores,
    operationalScores,
    operationalNotes,
    overallScore,
    successPercent,
    operationNote: invStr(form.operationNote).trim(),
    drillName: `VBSS Gözlem · ${invStr(form.observerName).trim()}`,
    shootType: 'VBSS Gözlemli Değerlendirme',
    timestamp,
    status: 'active',
  }
}

export { VBSS_EVALUATION_PHASES, VBSS_EVALUATION_INITIAL_FORM }
