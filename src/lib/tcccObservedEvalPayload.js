import { invStr } from './inventoryIlws'
import {
  OBSERVATION_METHOD_PEER,
  OBSERVED_EVAL_TYPE,
  RECORD_SOURCE_SELF_ENTRY,
  TCCC_OBSERVED_EVAL_KIND,
  TCCC_OBSERVED_PDF_FORM_VERSION,
  VERIFICATION_STATUS_UNVERIFIED,
} from './observedEvalConstants'
import {
  TCCC_EVALUATION_INITIAL_FORM,
  TCCC_MARCH_EVALUATION_PHASES,
  buildTcccPhasePayload,
  formHasAnyCriticalFail,
  validateTcccEvaluationForm,
} from './tcccEvaluationPayload'
import { TRAINING_TYPE_INDIVIDUAL } from './trainingGroupFields'

/**
 * @typedef {Omit<import('./tcccEvaluationPayload').TcccEvaluationFormState, 'operatorId'> & {
 *   observerName: string
 *   observerCallsign: string
 *   observedAt: string
 *   operationNote: string
 * }} TcccObservedEvalFormState
 */

export const TCCC_OBSERVED_EVAL_INITIAL_FORM = /** @type {TcccObservedEvalFormState} */ ({
  observerName: '',
  observerCallsign: '',
  observedAt: '',
  isTimed: false,
  targetInterventionSec: '',
  m: { ...TCCC_EVALUATION_INITIAL_FORM.m },
  a: { ...TCCC_EVALUATION_INITIAL_FORM.a },
  r: { ...TCCC_EVALUATION_INITIAL_FORM.r },
  c: { ...TCCC_EVALUATION_INITIAL_FORM.c },
  h: { ...TCCC_EVALUATION_INITIAL_FORM.h },
  operationNote: '',
})

/**
 * @param {TcccObservedEvalFormState} form
 * @returns {string | null}
 */
export function validateTcccObservedEvalForm(form) {
  if (!invStr(form.observerName).trim()) return 'Gözlemci adı zorunludur.'
  if (!invStr(form.observedAt).trim()) return 'Saha tarihi zorunludur.'
  const coreErr = validateTcccEvaluationForm({ ...form, operatorId: 'self' })
  if (coreErr && coreErr !== 'Değerlendirilecek operatör seçin.') return coreErr
  if (form.isTimed) {
    const sec = Number(form.targetInterventionSec)
    if (!Number.isFinite(sec) || sec <= 0) return 'Müdahale hedef süresi geçersiz.'
  }
  return null
}

/**
 * @param {{
 *   form: TcccObservedEvalFormState
 *   userId: string
 *   operatorName?: string
 * }} input
 */
export function buildTcccObservedEvalPayload({ form, userId, operatorName = '' }) {
  /** @type {Record<string, ReturnType<typeof buildTcccPhasePayload>>} */
  const marchScores = {}
  const operationalNotes = {}
  /** @type {Record<string, boolean>} */
  const criticalFails = {}
  /** @type {Record<string, string[]>} */
  const marchActionChips = {}

  let sum = 0
  for (const meta of TCCC_MARCH_EVALUATION_PHASES) {
    const phasePayload = buildTcccPhasePayload(form[meta.id], meta.id)
    sum += phasePayload.score
    criticalFails[meta.id] = phasePayload.criticalFail
    marchActionChips[meta.id] = phasePayload.actionChips
    marchScores[meta.id] = phasePayload
    operationalNotes[meta.id] = phasePayload.observation
  }

  const overallScore = Math.round((sum / TCCC_MARCH_EVALUATION_PHASES.length) * 10) / 10
  const successPercent = Math.round(overallScore * 10)
  const casualtyStatus = formHasAnyCriticalFail(form) ? 'EKS_KIA' : 'STABLE'
  const observedAt = invStr(form.observedAt).trim()
  const timestamp = observedAt ? new Date(observedAt).toISOString() : new Date().toISOString()

  return {
    userId,
    operatorName: String(operatorName).trim(),
    kind: TCCC_OBSERVED_EVAL_KIND,
    operationCategory: 'tccc',
    type: OBSERVED_EVAL_TYPE,
    discipline: 'tccc',
    recordSource: RECORD_SOURCE_SELF_ENTRY,
    verificationStatus: VERIFICATION_STATUS_UNVERIFIED,
    observationMethod: OBSERVATION_METHOD_PEER,
    observerName: invStr(form.observerName).trim(),
    observerCallsign: invStr(form.observerCallsign).trim() || null,
    observedAt,
    pdfFormVersion: TCCC_OBSERVED_PDF_FORM_VERSION,
    trainingType: TRAINING_TYPE_INDIVIDUAL,
    groupId: null,
    instructorId: null,
    verifiedByInstructorId: null,
    verifiedAt: null,
    linkedInstructorEvaluationId: null,
    isTimed: form.isTimed,
    targetInterventionSec: form.isTimed
      ? Math.max(0.01, Number(form.targetInterventionSec) || 0)
      : null,
    phases: marchScores,
    marchScores,
    marchActionChips,
    operationalNotes,
    criticalFails,
    casualtyStatus,
    overallScore,
    successPercent,
    operationNote: invStr(form.operationNote).trim(),
    drillName: `TCCC Gözlem · ${invStr(form.observerName).trim()}`,
    shootType: 'TCCC Gözlemli MARCH Değerlendirme',
    timestamp,
    status: 'active',
  }
}

export { TCCC_MARCH_EVALUATION_PHASES, TCCC_EVALUATION_INITIAL_FORM }
