/** @typedef {import('./evaluationPhaseCriteria').EvaluationSubCriterion} EvaluationSubCriterion */

/**
 * @param {EvaluationSubCriterion[]} criteria
 */
export function emptySubScoreForm(criteria) {
  /** @type {Record<string, string>} */
  const subScores = {}
  for (const c of criteria) subScores[c.id] = ''
  return subScores
}

/**
 * @param {unknown} raw
 * @param {number} min
 * @param {number} max
 */
export function parseCriterionScore(raw, min, max) {
  if (raw === '' || raw == null) return null
  const n = Number(raw)
  if (!Number.isFinite(n) || n < min || n > max) return null
  return Math.round(n)
}

/**
 * @param {number[]} values
 */
export function averageRoundedScores(values) {
  if (!values.length) return 0
  const sum = values.reduce((a, b) => a + b, 0)
  return Math.round((sum / values.length) * 10) / 10
}

/**
 * Form alt skorlarından safha skoru hesapla.
 * @param {Record<string, string>} subScoresForm
 * @param {EvaluationSubCriterion[]} criteria
 * @param {{ min: number; max: number; criticalFail?: boolean }} opts
 */
export function computePhaseScoreFromForm(subScoresForm, criteria, opts) {
  if (opts.criticalFail) return 0
  const numeric = []
  for (const c of criteria) {
    const v = parseCriterionScore(subScoresForm[c.id], opts.min, opts.max)
    if (v == null) return null
    numeric.push(v)
  }
  return averageRoundedScores(numeric)
}

/**
 * @param {Record<string, string>} subScoresForm
 * @param {EvaluationSubCriterion[]} criteria
 * @param {{ min: number; max: number; criticalFail?: boolean; phaseTitle: string }} opts
 * @returns {string | null}
 */
export function validatePhaseSubScoresForm(subScoresForm, criteria, opts) {
  if (opts.criticalFail) return null
  for (const c of criteria) {
    const v = parseCriterionScore(subScoresForm[c.id], opts.min, opts.max)
    if (v == null) return `${opts.phaseTitle} · ${c.label} için geçerli skor seçin (${opts.min}–${opts.max}).`
  }
  return null
}

/**
 * Form → Firestore alt skor objesi + ortalama safha skoru.
 * @param {Record<string, string>} subScoresForm
 * @param {EvaluationSubCriterion[]} criteria
 * @param {{ min: number; max: number; criticalFail?: boolean }} opts
 */
export function buildSubScoresPayload(subScoresForm, criteria, opts) {
  if (opts.criticalFail) {
    return { subScores: {}, score: 0 }
  }
  /** @type {Record<string, number>} */
  const subScores = {}
  const numeric = []
  for (const c of criteria) {
    const v = parseCriterionScore(subScoresForm[c.id], opts.min, opts.max) ?? 0
    subScores[c.id] = v
    numeric.push(v)
  }
  return { subScores, score: averageRoundedScores(numeric) }
}

/**
 * Kayıtlı safha verisinden safha skoru (geriye dönük: yalnızca score).
 * @param {{ score?: number; subScores?: Record<string, number> } | null | undefined} phaseData
 */
export function readStoredPhaseScore(phaseData) {
  if (!phaseData) return null
  if (typeof phaseData.score === 'number' && Number.isFinite(phaseData.score)) return phaseData.score
  if (phaseData.subScores && typeof phaseData.subScores === 'object') {
    const vals = Object.values(phaseData.subScores).filter((v) => typeof v === 'number')
    if (vals.length) return averageRoundedScores(/** @type {number[]} */ (vals))
  }
  return null
}

/**
 * @param {{ score?: number; subScores?: Record<string, number> } | null | undefined} phaseData
 * @param {EvaluationSubCriterion[]} criteria
 * @returns {Record<string, number> | null}
 */
export function readStoredSubScores(phaseData, criteria) {
  if (!phaseData?.subScores || typeof phaseData.subScores !== 'object') return null
  /** @type {Record<string, number>} */
  const out = {}
  for (const c of criteria) {
    const v = phaseData.subScores[c.id]
    if (typeof v === 'number' && Number.isFinite(v)) out[c.id] = v
  }
  return Object.keys(out).length ? out : null
}

/**
 * HUD: alt kriter yoksa null döner (legacy tek skor gösterimi için).
 * @param {{ score?: number; subScores?: Record<string, number> } | null | undefined} phaseData
 * @param {EvaluationSubCriterion[]} criteria
 */
export function readStoredSubScoresForDisplay(phaseData, criteria) {
  const sub = readStoredSubScores(phaseData, criteria)
  if (sub) return sub
  return null
}
