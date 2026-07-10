import { TCCC_MARCH_EVALUATION_PHASES } from './evaluationPhaseDefinitions'
import { TCCC_PHASE_SUB_CRITERIA } from './evaluationPhaseCriteria'
import {
  buildSubScoresPayload,
  computePhaseScoreFromForm,
  emptySubScoreForm,
  validatePhaseSubScoresForm,
} from './evaluationSubScores'

/** @typedef {'m' | 'a' | 'r' | 'c' | 'h'} TcccMarchPhaseId */

/** Segmented bar dışındaki tüketiciler / HMR uyumluluğu (1–10 skor). */
export const TCCC_SCORE_OPTIONS = Array.from({ length: 10 }, (_, i) => i + 1)

/** @typedef {{ id: string; label: string }} TcccActionChipDef */

/** @typedef {Record<string, boolean>} TcccActionChipState */

/** @typedef {{ subScores: Record<string, string>; observation: string; criticalFail: boolean; actions: TcccActionChipState }} TcccMarchPhaseFormState */

/**
 * @typedef {{
 *   operatorId: string
 *   isTimed: boolean
 *   targetInterventionSec: string
 *   m: TcccMarchPhaseFormState
 *   a: TcccMarchPhaseFormState
 *   r: TcccMarchPhaseFormState
 *   c: TcccMarchPhaseFormState
 *   h: TcccMarchPhaseFormState
 * }} TcccEvaluationFormState
 */

export { TCCC_MARCH_EVALUATION_PHASES }

/** @type {Record<TcccMarchPhaseId, TcccActionChipDef[]>} */
export const TCCC_MARCH_ACTION_CHIPS = {
  m: [
    { id: 'tourniquet_ht', label: 'Turnike (High & Tight)' },
    { id: 'wound_pack', label: 'Yara Paketleme' },
    { id: 'hemostatic', label: 'Hemostatik Ajan' },
  ],
  a: [
    { id: 'head_chin', label: 'Baş-Çene Poz.' },
    { id: 'npa', label: 'NPA Yerleşimi' },
  ],
  r: [
    { id: 'chest_seal', label: 'Chest Seal' },
    { id: 'needle_decomp', label: 'İğne Dekompresyonu' },
  ],
  c: [
    { id: 'pulse_check', label: 'Nabız Kontrolü' },
    { id: 'iv_io', label: 'Damar Yolu (IV/IO)' },
  ],
  h: [
    { id: 'thermal_blanket', label: 'Termal Örtü' },
    { id: 'head_trauma', label: 'Kafa Travması Kontrolü' },
  ],
}

/** @param {TcccMarchPhaseId} phaseId */
function emptyActionsForPhase(phaseId) {
  /** @type {TcccActionChipState} */
  const actions = {}
  for (const chip of TCCC_MARCH_ACTION_CHIPS[phaseId]) {
    actions[chip.id] = false
  }
  return actions
}

/** @param {TcccMarchPhaseId} phaseId */
function emptyMarchPhase(phaseId) {
  return {
    subScores: emptySubScoreForm(TCCC_PHASE_SUB_CRITERIA[phaseId]),
    observation: '',
    criticalFail: false,
    actions: emptyActionsForPhase(phaseId),
  }
}

export const TCCC_EVALUATION_INITIAL_FORM = /** @type {TcccEvaluationFormState} */ ({
  operatorId: '',
  isTimed: false,
  targetInterventionSec: '',
  m: emptyMarchPhase('m'),
  a: emptyMarchPhase('a'),
  r: emptyMarchPhase('r'),
  c: emptyMarchPhase('c'),
  h: emptyMarchPhase('h'),
})

/**
 * @param {TcccMarchPhaseFormState} phase
 * @param {TcccMarchPhaseId} [phaseId]
 */
export function parseMarchPhaseScore(phase, phaseId) {
  if (!phaseId) return null
  if (phase.criticalFail) return 0
  return computePhaseScoreFromForm(phase.subScores, TCCC_PHASE_SUB_CRITERIA[phaseId], { min: 1, max: 10 })
}

/**
 * @param {TcccMarchPhaseFormState} phase
 * @param {TcccMarchPhaseId} phaseId
 */
export function resolveMarchPhaseScore(phase, phaseId) {
  if (phase.criticalFail) return 0
  return parseMarchPhaseScore(phase, phaseId) ?? 0
}

/**
 * @param {TcccActionChipState} actions
 * @returns {string[]}
 */
export function activeActionChipIds(actions) {
  return Object.entries(actions)
    .filter(([, on]) => on)
    .map(([id]) => id)
}

/**
 * @param {TcccEvaluationFormState} form
 */
export function formHasAnyCriticalFail(form) {
  return TCCC_MARCH_EVALUATION_PHASES.some((meta) => form[meta.id].criticalFail)
}

/**
 * @param {TcccEvaluationFormState} form
 * @returns {string | null}
 */
export function validateTcccEvaluationForm(form) {
  if (!form.operatorId.trim()) return 'EVAL:operatorRequired'
  for (const meta of TCCC_MARCH_EVALUATION_PHASES) {
    const phase = form[meta.id]
    if (phase.criticalFail) continue
    const err = validatePhaseSubScoresForm(phase.subScores, TCCC_PHASE_SUB_CRITERIA[meta.id], {
      min: 1,
      max: 10,
      phaseTitle: meta.title,
      phaseId: meta.id,
    })
    if (err) return err
  }
  if (form.isTimed) {
    const sec = Number(form.targetInterventionSec)
    if (!Number.isFinite(sec) || sec <= 0) return 'EVAL:targetInterventionInvalid'
  }
  return null
}

/**
 * @param {TcccMarchPhaseFormState} phase
 * @param {TcccMarchPhaseId} phaseId
 */
export function buildTcccPhasePayload(phase, phaseId) {
  const criteria = TCCC_PHASE_SUB_CRITERIA[phaseId]
  const criticalFail = Boolean(phase.criticalFail)
  const actionChips = activeActionChipIds(phase.actions)
  const { subScores, score } = buildSubScoresPayload(phase.subScores, criteria, {
    min: 1,
    max: 10,
    criticalFail,
  })
  return {
    score,
    subScores,
    observation: String(phase.observation ?? '').trim(),
    criticalFail,
    actionChips,
  }
}

/**
 * @param {{
 *   form: TcccEvaluationFormState
 *   groupId: string
 *   instructorId: string
 *   operatorName?: string
 * }} input
 */
export function buildTcccEvaluationPayload({ form, groupId, instructorId, operatorName = '' }) {
  /** @type {Record<TcccMarchPhaseId, { score: number; subScores: Record<string, number>; observation: string; criticalFail: boolean; actionChips: string[] }>} */
  const marchScores = {}
  const operationalNotes = {}
  /** @type {Record<TcccMarchPhaseId, boolean>} */
  const criticalFails = {}
  /** @type {Record<TcccMarchPhaseId, string[]>} */
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
  const casualtyStatus = formHasAnyCriticalFail(form) ? 'EKS_KIA' : 'STABLE'

  return {
    groupId,
    instructorId,
    operatorId: form.operatorId.trim(),
    operatorName: String(operatorName).trim(),
    discipline: 'tccc',
    type: 'tccc_evaluation',
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
  }
}

export { TCCC_PHASE_SUB_CRITERIA }
