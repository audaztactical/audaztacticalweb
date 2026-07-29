/**
 * Performance Scoring Engine (v1)
 *
 * Hold + Trace + Flinch + Follow Through (+ Shot Event süresi)
 * → tek atış PerformanceScore.
 * Üst analiz katmanı; alt motorlara / protokole / UI’ye dokunmaz.
 */

import { FlinchSeverity } from './flinchDetectionEngine'
import { FollowThroughStability } from './followThroughEngine'

// =============================================================================
// Weights & thresholds (const — magic number yok)
// =============================================================================

export const PERF_WEIGHT_HOLD = 0.3
export const PERF_WEIGHT_FLINCH = 0.25
export const PERF_WEIGHT_FOLLOW_THROUGH = 0.25
export const PERF_WEIGHT_TRACE = 0.1
export const PERF_WEIGHT_CONSISTENCY = 0.1

/** Son N overallScore — memory only */
export const PERF_CONSISTENCY_CAPACITY = 10

/** Grade eşikleri (overallScore) */
export const PERF_GRADE_A_PLUS_MIN = 95
export const PERF_GRADE_A_MIN = 90
export const PERF_GRADE_B_MIN = 80
export const PERF_GRADE_C_MIN = 70
export const PERF_GRADE_D_MIN = 60
/** F: < PERF_GRADE_D_MIN */

/** Trace skoru: sapma referansları (°) */
export const PERF_TRACE_PEAK_REF_DEG = 2.0
export const PERF_TRACE_AVG_REF_DEG = 1.2
export const PERF_TRACE_RADIUS_REF_DEG = 1.5
export const PERF_TRACE_PEAK_WEIGHT = 0.45
export const PERF_TRACE_AVG_WEIGHT = 0.3
export const PERF_TRACE_RADIUS_WEIGHT = 0.25

/** Flinch: severity → taban skor (yüksek = iyi tetik kontrolü) */
export const PERF_FLINCH_SEVERITY_NONE = 100
export const PERF_FLINCH_SEVERITY_LOW = 78
export const PERF_FLINCH_SEVERITY_MEDIUM = 48
export const PERF_FLINCH_SEVERITY_HIGH = 18
/** Flinch magnitude cezası ölçeği (°) */
export const PERF_FLINCH_MAG_REF_DEG = 1.5
export const PERF_FLINCH_SEVERITY_WEIGHT = 0.65
export const PERF_FLINCH_MAG_WEIGHT = 0.35

/** Hold: holdCombinedRms cezası (holdQuality ile harman) */
export const PERF_HOLD_RMS_REF_DEG = 1.5
export const PERF_HOLD_QUALITY_WEIGHT = 0.75
export const PERF_HOLD_RMS_WEIGHT = 0.25

/** Recommendation kuralları — skor / severity eşikleri */
export const PERF_REC_EXCELLENT_MIN = 90
export const PERF_REC_FOLLOW_POOR_MAX = 55
export const PERF_REC_HOLD_WEAK_MAX = 60
export const PERF_REC_TRACE_NOISY_MAX = 55
export const PERF_REC_CONSISTENCY_LOW_MAX = 65

/** Öneri anahtarları — UI `dryFire.feedback.shotRec.*` ile çevirir */
export const PERF_REC_EXCELLENT = 'excellent'
export const PERF_REC_FLINCH_HIGH = 'flinchHigh'
export const PERF_REC_FLINCH_MED = 'flinchMed'
export const PERF_REC_FOLLOW = 'follow'
export const PERF_REC_HOLD = 'hold'
export const PERF_REC_TRACE = 'trace'
export const PERF_REC_CONSISTENCY = 'consistency'
export const PERF_REC_DEFAULT = 'default'

// =============================================================================
// Types
// =============================================================================

/** @typedef {'A+'|'A'|'B'|'C'|'D'|'F'} PerformanceGrade */

/** @type {Record<string, PerformanceGrade>} */
export const PerformanceGrade = Object.freeze({
  A_PLUS: 'A+',
  A: 'A',
  B: 'B',
  C: 'C',
  D: 'D',
  F: 'F',
})

/**
 * @typedef {Object} PerformanceScore
 * @property {number} overallScore
 * @property {number} holdScore
 * @property {number} flinchScore
 * @property {number} followThroughScore
 * @property {number} traceScore
 * @property {number} consistencyScore
 * @property {PerformanceGrade} grade
 * @property {string} recommendation
 * @property {number} timestamp
 * @property {number} movementDuration  Shot Event / FT post süresi (ms)
 * @property {number} analyzedTriggerTimestamp
 */

/**
 * @typedef {Object} PerformanceEngineState
 * @property {PerformanceScore} last
 * @property {Float64Array} recentOverall  sabit halka (capacity)
 * @property {number} recentCount
 * @property {number} recentHead
 */

/**
 * @returns {PerformanceScore}
 */
export function createEmptyPerformanceScore() {
  return {
    overallScore: 0,
    holdScore: 0,
    flinchScore: 0,
    followThroughScore: 0,
    traceScore: 0,
    consistencyScore: 0,
    grade: PerformanceGrade.F,
    recommendation: '',
    timestamp: 0,
    movementDuration: 0,
    analyzedTriggerTimestamp: 0,
  }
}

/**
 * @returns {PerformanceEngineState}
 */
export function createPerformanceEngineState() {
  return {
    last: createEmptyPerformanceScore(),
    recentOverall: new Float64Array(PERF_CONSISTENCY_CAPACITY),
    recentCount: 0,
    recentHead: 0,
  }
}

/**
 * @param {PerformanceEngineState} engine
 */
export function resetPerformanceEngine(engine) {
  const empty = createEmptyPerformanceScore()
  engine.last.overallScore = empty.overallScore
  engine.last.holdScore = empty.holdScore
  engine.last.flinchScore = empty.flinchScore
  engine.last.followThroughScore = empty.followThroughScore
  engine.last.traceScore = empty.traceScore
  engine.last.consistencyScore = empty.consistencyScore
  engine.last.grade = empty.grade
  engine.last.recommendation = empty.recommendation
  engine.last.timestamp = 0
  engine.last.movementDuration = 0
  engine.last.analyzedTriggerTimestamp = 0
  engine.recentCount = 0
  engine.recentHead = 0
  engine.recentOverall.fill(0)
}

/**
 * @param {number} score
 * @returns {PerformanceGrade}
 */
export function calculateGrade(score) {
  const s = Number(score) || 0
  if (s >= PERF_GRADE_A_PLUS_MIN) return PerformanceGrade.A_PLUS
  if (s >= PERF_GRADE_A_MIN) return PerformanceGrade.A
  if (s >= PERF_GRADE_B_MIN) return PerformanceGrade.B
  if (s >= PERF_GRADE_C_MIN) return PerformanceGrade.C
  if (s >= PERF_GRADE_D_MIN) return PerformanceGrade.D
  return PerformanceGrade.F
}

/**
 * @param {number} x
 * @param {number} lo
 * @param {number} hi
 */
function clamp(x, lo, hi) {
  if (x < lo) return lo
  if (x > hi) return hi
  return x
}

/**
 * @param {PerformanceEngineState} engine
 * @returns {number} 0…100 — son N overall ortalaması (boşsa -1)
 */
function readConsistencyAverage(engine) {
  const n = engine.recentCount
  if (n <= 0) return -1
  let sum = 0
  const cap = PERF_CONSISTENCY_CAPACITY
  const start = n < cap ? 0 : engine.recentHead
  for (let i = 0; i < n; i++) {
    const idx = (start + i) % cap
    sum += engine.recentOverall[idx]
  }
  return sum / n
}

/**
 * overallScore’u sabit halkaya yaz.
 * @param {PerformanceEngineState} engine
 * @param {number} overallScore
 */
export function updateConsistency(engine, overallScore) {
  const score = clamp(Number(overallScore) || 0, 0, 100)
  engine.recentOverall[engine.recentHead] = score
  engine.recentHead = (engine.recentHead + 1) % PERF_CONSISTENCY_CAPACITY
  if (engine.recentCount < PERF_CONSISTENCY_CAPACITY) {
    engine.recentCount += 1
  }
}

/**
 * @param {number} holdQuality
 * @param {number} holdCombinedRms
 * @returns {number}
 */
function scoreHold(holdQuality, holdCombinedRms) {
  const q = clamp(Number(holdQuality) || 0, 0, 100)
  let rmsPen = (Number(holdCombinedRms) || 0) / PERF_HOLD_RMS_REF_DEG
  rmsPen = clamp(rmsPen, 0, 1)
  const rmsScore = 100 * (1 - rmsPen)
  return Math.round(
    PERF_HOLD_QUALITY_WEIGHT * q + PERF_HOLD_RMS_WEIGHT * rmsScore,
  )
}

/**
 * @param {{ severity?: string, confidence?: number, movementMagnitude?: number }} flinch
 * @returns {number}
 */
function scoreFlinch(flinch) {
  const sev = flinch?.severity
  let base = PERF_FLINCH_SEVERITY_MEDIUM
  if (sev === FlinchSeverity.NONE) base = PERF_FLINCH_SEVERITY_NONE
  else if (sev === FlinchSeverity.LOW) base = PERF_FLINCH_SEVERITY_LOW
  else if (sev === FlinchSeverity.MEDIUM) base = PERF_FLINCH_SEVERITY_MEDIUM
  else if (sev === FlinchSeverity.HIGH) base = PERF_FLINCH_SEVERITY_HIGH

  let magPen = (Number(flinch?.movementMagnitude) || 0) / PERF_FLINCH_MAG_REF_DEG
  magPen = clamp(magPen, 0, 1)
  const magScore = 100 * (1 - magPen)

  // confidence yüksekse severity+mag’e güven; düşükse nötre (70) çek
  const conf = clamp((Number(flinch?.confidence) || 0) / 100, 0, 1)
  const raw = PERF_FLINCH_SEVERITY_WEIGHT * base + PERF_FLINCH_MAG_WEIGHT * magScore
  const blended = conf * raw + (1 - conf) * 70
  return Math.round(clamp(blended, 0, 100))
}

/**
 * @param {{ tracePeak?: number, traceAverage?: number, traceRadius?: number }} trace
 * @returns {number}
 */
function scoreTrace(trace) {
  let peakPen = (Number(trace?.tracePeak) || 0) / PERF_TRACE_PEAK_REF_DEG
  let avgPen = (Number(trace?.traceAverage) || 0) / PERF_TRACE_AVG_REF_DEG
  let radPen = (Number(trace?.traceRadius) || 0) / PERF_TRACE_RADIUS_REF_DEG
  peakPen = clamp(peakPen, 0, 1)
  avgPen = clamp(avgPen, 0, 1)
  radPen = clamp(radPen, 0, 1)
  const pen =
    PERF_TRACE_PEAK_WEIGHT * peakPen +
    PERF_TRACE_AVG_WEIGHT * avgPen +
    PERF_TRACE_RADIUS_WEIGHT * radPen
  return Math.round(100 * (1 - pen))
}

/**
 * Kural tabanlı kısa öneri (öncelik sırası sabit).
 *
 * @param {{
 *   overallScore: number
 *   holdScore: number
 *   flinchScore: number
 *   followThroughScore: number
 *   traceScore: number
 *   consistencyScore: number
 *   flinchSeverity?: string
 *   followStability?: string
 * }} input
 * @returns {string} i18n anahtarı (`dryFire.feedback.shotRec.*`)
 */
export function calculateRecommendation(input) {
  if (input.overallScore >= PERF_REC_EXCELLENT_MIN) {
    return PERF_REC_EXCELLENT
  }

  const sev = input.flinchSeverity
  if (sev === FlinchSeverity.HIGH || input.flinchScore < 40) {
    return PERF_REC_FLINCH_HIGH
  }
  if (sev === FlinchSeverity.MEDIUM || input.flinchScore < 60) {
    return PERF_REC_FLINCH_MED
  }

  if (
    input.followThroughScore <= PERF_REC_FOLLOW_POOR_MAX ||
    input.followStability === FollowThroughStability.POOR
  ) {
    return PERF_REC_FOLLOW
  }

  if (input.holdScore <= PERF_REC_HOLD_WEAK_MAX) {
    return PERF_REC_HOLD
  }

  if (input.traceScore <= PERF_REC_TRACE_NOISY_MAX) {
    return PERF_REC_TRACE
  }

  if (input.consistencyScore <= PERF_REC_CONSISTENCY_LOW_MAX && input.consistencyScore > 0) {
    return PERF_REC_CONSISTENCY
  }

  return PERF_REC_DEFAULT
}

/**
 * Tek atış skoru — consistency geçmişe bakarak, sonra updateConsistency ile güncellenir.
 *
 * @param {PerformanceEngineState} engine
 * @param {{
 *   hold: { holdQuality?: number, holdCombinedRms?: number }
 *   trace: { tracePeak?: number, traceAverage?: number, traceRadius?: number }
 *   flinch: { direction?: string, severity?: string, confidence?: number, movementMagnitude?: number }
 *   followThrough: { score?: number, stability?: string, movementMagnitude?: number, duration?: number }
 *   movementDuration?: number
 *   triggerTimestamp?: number
 *   nowMs?: number
 * }} input
 * @returns {PerformanceScore}
 */
export function calculateShotScore(engine, input) {
  const holdScore = scoreHold(input.hold?.holdQuality, input.hold?.holdCombinedRms)
  const flinchScore = scoreFlinch(input.flinch || {})
  const followThroughScore = Math.round(
    clamp(Number(input.followThrough?.score) || 0, 0, 100),
  )
  const traceScore = scoreTrace(input.trace || {})

  let consistencyScore = readConsistencyAverage(engine)
  if (consistencyScore < 0) {
    // İlk atışlar: dört bileşen ortalaması (nötr tutarlılık)
    consistencyScore =
      (holdScore + flinchScore + followThroughScore + traceScore) / 4
  }
  consistencyScore = Math.round(clamp(consistencyScore, 0, 100))

  const overallScore = Math.round(
    PERF_WEIGHT_HOLD * holdScore +
      PERF_WEIGHT_FLINCH * flinchScore +
      PERF_WEIGHT_FOLLOW_THROUGH * followThroughScore +
      PERF_WEIGHT_TRACE * traceScore +
      PERF_WEIGHT_CONSISTENCY * consistencyScore,
  )

  const grade = calculateGrade(overallScore)
  const movementDuration =
    Number(input.movementDuration) ||
    Number(input.followThrough?.duration) ||
    0

  const recommendation = calculateRecommendation({
    overallScore,
    holdScore,
    flinchScore,
    followThroughScore,
    traceScore,
    consistencyScore,
    flinchSeverity: input.flinch?.severity,
    followStability: input.followThrough?.stability,
  })

  const score = engine.last
  score.overallScore = overallScore
  score.holdScore = holdScore
  score.flinchScore = flinchScore
  score.followThroughScore = followThroughScore
  score.traceScore = traceScore
  score.consistencyScore = consistencyScore
  score.grade = grade
  score.recommendation = recommendation
  score.timestamp = Number(input.nowMs) || performance.now()
  score.movementDuration = movementDuration
  score.analyzedTriggerTimestamp = Number(input.triggerTimestamp) || 0

  updateConsistency(engine, overallScore)

  return score
}
