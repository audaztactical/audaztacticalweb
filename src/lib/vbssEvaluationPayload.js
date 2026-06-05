/** @typedef {'boarding' | 'clearing' | 'control'} VbssPhaseId */

/** @typedef {{ score: string; observation: string }} VbssPhaseFormState */

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

/** @type {{ id: VbssPhaseId; title: string; subtitle: string }[]} */
export const VBSS_EVALUATION_PHASES = [
  {
    id: 'boarding',
    title: 'Safha 1: Sızma ve Biniş',
    subtitle: 'Boarding — yöntem, hız, kancalama emniyeti',
  },
  {
    id: 'clearing',
    title: 'Safha 2: Gemi İçi İlerleme',
    subtitle: 'Clearing — iletişim, köşe kontrolü, merdiven disiplini',
  },
  {
    id: 'control',
    title: 'Safha 3: Kontrol ve Güvenlik',
    subtitle: 'Control — mürettebat yönetimi, köprü kontrolü, 360° emniyet',
  },
]

/** @returns {VbssPhaseFormState} */
function emptyPhase() {
  return { score: '', observation: '' }
}

export const VBSS_EVALUATION_INITIAL_FORM = /** @type {VbssEvaluationFormState} */ ({
  operatorId: '',
  isTimed: false,
  targetOperationSec: '',
  boarding: emptyPhase(),
  clearing: emptyPhase(),
  control: emptyPhase(),
})

/**
 * @param {VbssPhaseFormState} phase
 */
export function parsePhaseScore(phase) {
  if (phase.score === '') return null
  const n = Number(phase.score)
  if (!Number.isFinite(n) || n < 0 || n > 10) return null
  return Math.round(n)
}

/**
 * @param {VbssEvaluationFormState} form
 * @returns {string | null}
 */
export function validateVbssEvaluationForm(form) {
  if (!form.operatorId.trim()) return 'Değerlendirilecek operatör seçin.'
  for (const meta of VBSS_EVALUATION_PHASES) {
    const phase = form[meta.id]
    if (phase.score === '') return `${meta.title} için skor seçin.`
    if (parsePhaseScore(phase) === null) return `${meta.title} skoru 0–10 arasında olmalı.`
  }
  if (form.isTimed) {
    const sec = Number(form.targetOperationSec)
    if (!Number.isFinite(sec) || sec <= 0) return 'Hedef operasyon süresi geçersiz.'
  }
  return null
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
  /** @type {Record<VbssPhaseId, { score: number; observation: string }>} */
  const operationalScores = {}
  const operationalNotes = {}

  let sum = 0
  for (const meta of VBSS_EVALUATION_PHASES) {
    const phase = form[meta.id]
    const score = parsePhaseScore(phase) ?? 0
    sum += score
    operationalScores[meta.id] = { score, observation: String(phase.observation ?? '').trim() }
    operationalNotes[meta.id] = String(phase.observation ?? '').trim()
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
