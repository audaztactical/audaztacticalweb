/** @typedef {'TEMİZ' | 'YARALI' | 'KRİTİK'} FofHitStatus */

/**
 * @typedef {{
 *   scenarioType: string
 *   oodaCycle: number
 *   tacticalCommunication: number
 *   coverManagement: number
 *   hitStatus: FofHitStatus
 *   penalties: {
 *     muzzleAwarenessViolation: boolean
 *     collateralDamage: boolean
 *     panicFreeze: boolean
 *   }
 *   aarNotes?: string
 * }} FofEvaluationInput
 */

export const FOF_SCENARIO_TYPES = [
  'CQB Sızma',
  'Rehine Kurtarma',
  'Milsim Temas',
]

export const FOF_HIT_STATUS_OPTIONS = [
  { id: 'TEMİZ', label: 'TEMİZ', hint: 'Hiç vurulmadı' },
  { id: 'YARALI', label: 'YARALI', hint: 'Ekstremite isabeti — TCCC gerekir' },
  { id: 'KRİTİK', label: 'KRİTİK', hint: 'Gövde / kafa isabeti — görev dışı' },
]

export const FOF_PENALTY_OPTIONS = [
  {
    id: 'muzzleAwarenessViolation',
    label: 'Muzzle Awareness Violation',
    sublabel: 'Namlu disiplini / silahı dost unsura doğrultma',
    deduction: 20,
  },
  {
    id: 'collateralDamage',
    label: 'Collateral Damage',
    sublabel: 'Sivil / rehine zayiatı',
    instantFail: true,
  },
  {
    id: 'panicFreeze',
    label: 'Panic / Freeze',
    sublabel: 'Stres altında kilitlenme',
    deduction: 20,
  },
]

/** @param {unknown} value */
function clampMetric(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 3
  return Math.min(5, Math.max(1, Math.round(n)))
}

/**
 * ORS uyumlu FoF eğitmen skoru.
 * Collateral Damage veya KRİTİK vuruluş → anında 0 (FAIL).
 *
 * @param {FofEvaluationInput} input
 * @returns {{ finalScore: number; passed: boolean; instantFail: boolean; failReason: string | null }}
 */
export function computeFofInstructorScore(input) {
  const hitStatus = String(input.hitStatus ?? 'TEMİZ').trim()
  const penalties = input.penalties ?? {}

  if (penalties.collateralDamage === true) {
    return {
      finalScore: 0,
      passed: false,
      instantFail: true,
      failReason: 'COLLATERAL_DAMAGE · SİVİL/REHİNE ZAYİATI',
    }
  }

  if (hitStatus === 'KRİTİK') {
    return {
      finalScore: 0,
      passed: false,
      instantFail: true,
      failReason: 'KRİTİK_VURULUŞ · GÖREV_DIŞI',
    }
  }

  let score = 100

  if (hitStatus === 'YARALI') score -= 30
  if (penalties.muzzleAwarenessViolation === true) score -= 20
  if (penalties.panicFreeze === true) score -= 20

  const ooda = clampMetric(input.oodaCycle)
  const comm = clampMetric(input.tacticalCommunication)
  const cover = clampMetric(input.coverManagement)

  score -= (5 - ooda) * 10
  score -= (5 - comm) * 8
  score -= (5 - cover) * 8

  const finalScore = Math.max(0, Math.min(100, Math.round(score)))

  return {
    finalScore,
    passed: finalScore >= 50,
    instantFail: false,
    failReason: null,
  }
}

/**
 * @param {number} score
 * @param {boolean} instantFail
 * @returns {'green' | 'amber' | 'red'}
 */
export function fofScoreHudTone(score, instantFail = false) {
  if (instantFail || score <= 0) return 'red'
  if (score >= 70) return 'green'
  if (score >= 40) return 'amber'
  return 'red'
}
