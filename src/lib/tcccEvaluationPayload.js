/** @typedef {'m' | 'a' | 'r' | 'c' | 'h'} TcccMarchPhaseId */

/** Segmented bar dışındaki tüketiciler / HMR uyumluluğu (1–10 skor). */
export const TCCC_SCORE_OPTIONS = Array.from({ length: 10 }, (_, i) => i + 1)

/** @typedef {{ id: string; label: string }} TcccActionChipDef */

/** @typedef {Record<string, boolean>} TcccActionChipState */

/** @typedef {{ score: string; observation: string; criticalFail: boolean; actions: TcccActionChipState }} TcccMarchPhaseFormState */

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

/** @type {{ id: TcccMarchPhaseId; letter: string; title: string; subtitle: string }[]} */
export const TCCC_MARCH_EVALUATION_PHASES = [
  {
    id: 'm',
    letter: 'M',
    title: 'M — Massive Hemorrhage',
    subtitle: 'Büyük kanama kontrolü, turnike uygulaması',
  },
  {
    id: 'a',
    letter: 'A',
    title: 'A — Airway',
    subtitle: 'Havayolu açıklığı, NPA yerleşimi',
  },
  {
    id: 'r',
    letter: 'R',
    title: 'R — Respiration',
    subtitle: 'Solunum yönetimi, Chest Seal, Needle Decompression',
  },
  {
    id: 'c',
    letter: 'C',
    title: 'C — Circulation',
    subtitle: 'Dolaşım kontrolü, nabız takibi, IV/IO erişim',
  },
  {
    id: 'h',
    letter: 'H',
    title: 'H — Hypothermia / Head',
    subtitle: 'Hipotermi önleme, kafa travması kontrolü',
  },
]

/** @param {TcccMarchPhaseId} phaseId */
function emptyActionsForPhase(phaseId) {
  /** @type {TcccActionChipState} */
  const actions = {}
  for (const chip of TCCC_MARCH_ACTION_CHIPS[phaseId]) {
    actions[chip.id] = false
  }
  return actions
}

/** @returns {TcccMarchPhaseFormState} */
function emptyMarchPhase(/** @type {TcccMarchPhaseId} */ phaseId) {
  return { score: '', observation: '', criticalFail: false, actions: emptyActionsForPhase(phaseId) }
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
 */
export function parseMarchPhaseScore(phase) {
  if (phase.score === '') return null
  const n = Number(phase.score)
  if (!Number.isFinite(n) || n < 0 || n > 10) return null
  return Math.round(n)
}

/**
 * @param {TcccMarchPhaseFormState} phase
 */
export function resolveMarchPhaseScore(phase) {
  if (phase.criticalFail) return 0
  return parseMarchPhaseScore(phase) ?? 0
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
  if (!form.operatorId.trim()) return 'Değerlendirilecek operatör seçin.'
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
 *   form: TcccEvaluationFormState
 *   groupId: string
 *   instructorId: string
 *   operatorName?: string
 * }} input
 */
export function buildTcccEvaluationPayload({ form, groupId, instructorId, operatorName = '' }) {
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
