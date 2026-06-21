import { VBSS_EVALUATION_PHASES, TCCC_MARCH_EVALUATION_PHASES } from './evaluationPhaseDefinitions'

/** @typedef {{ id: string; label: string }} EvaluationSubCriterion */

/**
 * Rubrik metninden (virgülle ayrılmış) alt kriter listesi çıkarır.
 * VBSS: "Boarding — yöntem, hız, …" → em-dash sonrası
 * TCCC: doğrudan subtitle virgül ayrımı
 * @param {string} subtitle
 */
export function parseRubrikSubCriteria(subtitle) {
  const dashIdx = subtitle.indexOf(' — ')
  const rubric = (dashIdx >= 0 ? subtitle.slice(dashIdx + 3) : subtitle).trim()
  if (!rubric) return []
  return rubric
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((label) => titleCaseTr(label))
}

/**
 * @param {string} label
 * @param {number} index
 */
export function criterionIdFromLabel(label, index) {
  const base = label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
  return base || `criterion_${index}`
}

/**
 * @param {string} s
 */
function titleCaseTr(s) {
  return s
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toLocaleUpperCase('tr-TR') + word.slice(1))
    .join(' ')
}

/**
 * @param {readonly { id: string; subtitle: string }[]} phases
 * @returns {Record<string, EvaluationSubCriterion[]>}
 */
function buildCriteriaByPhase(phases) {
  /** @type {Record<string, EvaluationSubCriterion[]>} */
  const map = {}
  for (const phase of phases) {
    const labels = parseRubrikSubCriteria(phase.subtitle)
    map[phase.id] = labels.map((label, index) => ({
      id: criterionIdFromLabel(label, index),
      label,
    }))
  }
  return map
}

/** @type {Record<import('./vbssEvaluationPayload').VbssPhaseId, EvaluationSubCriterion[]>} */
export const VBSS_PHASE_SUB_CRITERIA = buildCriteriaByPhase(VBSS_EVALUATION_PHASES)

/** @type {Record<import('./tcccEvaluationPayload').TcccMarchPhaseId, EvaluationSubCriterion[]>} */
export const TCCC_PHASE_SUB_CRITERIA = buildCriteriaByPhase(TCCC_MARCH_EVALUATION_PHASES)

/**
 * @param {'vbss' | 'tccc'} discipline
 * @param {string} phaseId
 * @returns {EvaluationSubCriterion[]}
 */
export function getPhaseSubCriteria(discipline, phaseId) {
  if (discipline === 'vbss') return VBSS_PHASE_SUB_CRITERIA[/** @type {keyof typeof VBSS_PHASE_SUB_CRITERIA} */ (phaseId)] ?? []
  return TCCC_PHASE_SUB_CRITERIA[/** @type {keyof typeof TCCC_PHASE_SUB_CRITERIA} */ (phaseId)] ?? []
}

/**
 * Rapor / debug: tüm safhaların alt kriter listesi.
 */
export function exportSubCriteriaCatalog() {
  /** @type {Record<string, { vbss?: string[]; tccc?: string[] }>} */
  const catalog = {}
  for (const meta of VBSS_EVALUATION_PHASES) {
    catalog[meta.id] = { vbss: (VBSS_PHASE_SUB_CRITERIA[meta.id] ?? []).map((c) => c.label) }
  }
  for (const meta of TCCC_MARCH_EVALUATION_PHASES) {
    if (!catalog[meta.id]) catalog[meta.id] = {}
    catalog[meta.id].tccc = (TCCC_PHASE_SUB_CRITERIA[meta.id] ?? []).map((c) => c.label)
  }
  return catalog
}
