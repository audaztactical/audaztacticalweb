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
  TCCC_MARCH_ACTION_CHIPS,
  TCCC_MARCH_EVALUATION_PHASES,
  activeActionChipIds,
  formHasAnyCriticalFail,
  parseMarchPhaseScore,
  resolveMarchPhaseScore,
} from './tcccEvaluationPayload'
import { TRAINING_TYPE_INDIVIDUAL } from './trainingGroupFields'

/** @typedef {import('./tcccEvaluationPayload').TcccMarchPhaseFormState} TcccMarchPhaseFormState */
/** @typedef {import('./tcccEvaluationPayload').TcccMarchPhaseId} TcccMarchPhaseId */

/**
 * @typedef {Omit<import('./tcccEvaluationPayload').TcccEvaluationFormState, 'operatorId'> & {
 *   observerName: string
 *   observerCallsign: string
 *   observedAt: string
 *   operationNote: string
 * }} TcccObservedEvalFormState
 */

/** @param {TcccMarchPhaseId} phaseId */
function emptyMarchPhase(phaseId) {
  /** @type {Record<string, boolean>} */
  const actions = {}
  for (const chip of TCCC_MARCH_ACTION_CHIPS[phaseId]) {
    actions[chip.id] = false
  }
  return { score: '', observation: '', criticalFail: false, actions }
}

export const TCCC_OBSERVED_EVAL_INITIAL_FORM = /** @type {TcccObservedEvalFormState} */ ({
  observerName: '',
  observerCallsign: '',
  observedAt: '',
  isTimed: false,
  targetInterventionSec: '',
  m: emptyMarchPhase('m'),
  a: emptyMarchPhase('a'),
  r: emptyMarchPhase('r'),
  c: emptyMarchPhase('c'),
  h: emptyMarchPhase('h'),
  operationNote: '',
})

/**
 * @param {TcccObservedEvalFormState} form
 * @returns {string | null}
 */
export function validateTcccObservedEvalForm(form) {
  if (!invStr(form.observerName).trim()) return 'Gözlemci adı zorunludur.'
  if (!invStr(form.observedAt).trim()) return 'Saha tarihi zorunludur.'
  for (const meta of TCCC_MARCH_EVALUATION_PHASES) {
    const phase = form[meta.id]
    if (phase.criticalFail) continue
    if (phase.score === '') return `${meta.title} için skor seçin (1–10).`
    const n = parseMarchPhaseScore(phase)
    if (n === null || n < 1 || n > 10) return `${meta.title} skoru 1–10 arasında olmalı.`
  }
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
  /** @type {Record<TcccMarchPhaseId, { score: number; observation: string; criticalFail: boolean; actionChips: string[] }>} */
  const marchScores = {}
  const operationalNotes = {}
  /** @type {Record<TcccMarchPhaseId, boolean>} */
  const criticalFails = {}
  /** @type {Record<TcccMarchPhaseId, string[]>} */
  const marchActionChips = {}

  let sum = 0
  for (const meta of TCCC_MARCH_EVALUATION_PHASES) {
    const phase = form[meta.id]
    const criticalFail = Boolean(phase.criticalFail)
    const score = resolveMarchPhaseScore(phase)
    const actionChips = activeActionChipIds(phase.actions)
    sum += score
    criticalFails[meta.id] = criticalFail
    marchActionChips[meta.id] = actionChips
    marchScores[meta.id] = {
      score,
      observation: String(phase.observation ?? '').trim(),
      criticalFail,
      actionChips,
    }
    operationalNotes[meta.id] = String(phase.observation ?? '').trim()
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
