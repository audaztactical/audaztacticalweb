/**
 * Follow Through Engine (v1)
 *
 * Shot Event post-buffer (100 ms) + trigger frame üzerinden
 * tetik sonrası namlu stabilitesini skorlar.
 * Firmware / BLE / USB / protokol / UI dokunulmaz.
 */

// =============================================================================
// Constants
// =============================================================================

/** Post analiz pencereleri — trigger’dan ileri (ms) */
export const FT_WINDOW_20_MS = 20
export const FT_WINDOW_50_MS = 50
export const FT_WINDOW_100_MS = 100

/** Shot Event post üst sınırı ile uyumlu */
export const FT_POST_WINDOW_MS = 100

/** Pencere ağırlıkları — erken sarsıntı daha kritik */
export const FT_WEIGHT_20_MS = 0.45
export const FT_WEIGHT_50_MS = 0.35
export const FT_WEIGHT_100_MS = 0.2

/**
 * Skor: score = 100 * clamp(0,1, 1 − combinedPenalty)
 * combinedPenalty = weightedRms / FT_SCORE_RMS_REF_DEG  (+ peak bonus)
 */
export const FT_SCORE_RMS_REF_DEG = 1.8
/** Peak sapma cezası ölçeği (°) */
export const FT_SCORE_PEAK_REF_DEG = 2.5
/** Peak’in skor cezasına katkısı (0…1) */
export const FT_SCORE_PEAK_WEIGHT = 0.35
/** RMS’in skor cezasına katkısı */
export const FT_SCORE_RMS_WEIGHT = 0.65

/** Stability eşikleri (score 0…100) */
export const FT_STABILITY_EXCELLENT_MIN = 85
export const FT_STABILITY_GOOD_MIN = 70
export const FT_STABILITY_FAIR_MIN = 50
/** POOR: < FT_STABILITY_FAIR_MIN */

/** Ani hareket: 20 ms pencere magnitude üstü ekstra ceza eşiği (°) */
export const FT_SNAP_MAG_REF_DEG = 0.8
export const FT_SNAP_PENALTY_WEIGHT = 0.15

// =============================================================================
// Types / enums
// =============================================================================

/** @typedef {'EXCELLENT'|'GOOD'|'FAIR'|'POOR'} FollowThroughStability */

/** @type {Record<string, FollowThroughStability>} */
export const FollowThroughStability = Object.freeze({
  EXCELLENT: 'EXCELLENT',
  GOOD: 'GOOD',
  FAIR: 'FAIR',
  POOR: 'POOR',
})

/**
 * @typedef {Object} FollowThroughWindowMetrics
 * @property {number} windowMs
 * @property {number} deltaPitch
 * @property {number} deltaRoll
 * @property {number} deltaYaw
 * @property {number} magnitude
 * @property {number} sampleCount
 */

/**
 * @typedef {Object} FollowThroughResult
 * @property {number} score  0…100
 * @property {FollowThroughStability} stability
 * @property {number} movementMagnitude
 * @property {number} movementAngle
 * @property {number} peakMovement
 * @property {number} averageMovement
 * @property {number} rmsMovement
 * @property {number} duration  ms
 * @property {number} analyzedTriggerTimestamp  hangi shot için üretildi (0 = yok)
 * @property {FollowThroughWindowMetrics[]} windows
 */

/**
 * @returns {FollowThroughResult}
 */
export function createEmptyFollowThroughResult() {
  return {
    score: 0,
    stability: FollowThroughStability.POOR,
    movementMagnitude: 0,
    movementAngle: 0,
    peakMovement: 0,
    averageMovement: 0,
    rmsMovement: 0,
    duration: 0,
    analyzedTriggerTimestamp: 0,
    windows: [],
  }
}

/**
 * @param {FollowThroughResult} result
 */
export function resetFollowThrough(result) {
  const empty = createEmptyFollowThroughResult()
  result.score = empty.score
  result.stability = empty.stability
  result.movementMagnitude = empty.movementMagnitude
  result.movementAngle = empty.movementAngle
  result.peakMovement = empty.peakMovement
  result.averageMovement = empty.averageMovement
  result.rmsMovement = empty.rmsMovement
  result.duration = empty.duration
  result.analyzedTriggerTimestamp = 0
  result.windows.length = 0
}

/**
 * score → EXCELLENT / GOOD / FAIR / POOR
 * @param {number} score
 * @returns {FollowThroughStability}
 */
export function calculateFollowThroughState(score) {
  const s = Number(score) || 0
  if (s >= FT_STABILITY_EXCELLENT_MIN) return FollowThroughStability.EXCELLENT
  if (s >= FT_STABILITY_GOOD_MIN) return FollowThroughStability.GOOD
  if (s >= FT_STABILITY_FAIR_MIN) return FollowThroughStability.FAIR
  return FollowThroughStability.POOR
}

/**
 * Daha az hareket → yüksek skor. Ani (20 ms) hareket → ceza.
 *
 * @param {{
 *   rmsMovement: number
 *   peakMovement: number
 *   snapMagnitude: number  20 ms pencere büyüklüğü
 * }} input
 * @returns {number} 0…100
 */
export function calculateFollowThroughScore(input) {
  const rms = Math.max(0, Number(input.rmsMovement) || 0)
  const peak = Math.max(0, Number(input.peakMovement) || 0)
  const snap = Math.max(0, Number(input.snapMagnitude) || 0)

  let rmsPen = rms / FT_SCORE_RMS_REF_DEG
  if (rmsPen > 1) rmsPen = 1

  let peakPen = peak / FT_SCORE_PEAK_REF_DEG
  if (peakPen > 1) peakPen = 1

  let snapPen = snap / FT_SNAP_MAG_REF_DEG
  if (snapPen > 1) snapPen = 1

  const penalty =
    FT_SCORE_RMS_WEIGHT * rmsPen +
    FT_SCORE_PEAK_WEIGHT * peakPen +
    FT_SNAP_PENALTY_WEIGHT * snapPen

  // Toplam ağırlık > 1 olabilir; normalize et
  const weightSum = FT_SCORE_RMS_WEIGHT + FT_SCORE_PEAK_WEIGHT + FT_SNAP_PENALTY_WEIGHT
  const normPen = penalty / weightSum

  let score = 100 * (1 - normPen)
  if (score < 0) score = 0
  if (score > 100) score = 100
  return Math.round(score)
}

/**
 * Post dizilerinden zamanlı örnekler (eşit aralık varsayımı).
 *
 * @param {{
 *   postPitch: number[]
 *   postRoll: number[]
 *   postYaw: number[]
 *   triggerPitch: number
 *   triggerRoll: number
 *   triggerYaw: number
 *   triggerTimestamp: number
 * }} shot
 * @returns {Array<{ t: number, pitch: number, roll: number, yaw: number }>}
 */
function buildPostTimeline(shot) {
  const t0 = shot.triggerTimestamp
  /** @type {Array<{ t: number, pitch: number, roll: number, yaw: number }>} */
  const out = [
    {
      t: t0,
      pitch: shot.triggerPitch,
      roll: shot.triggerRoll,
      yaw: shot.triggerYaw,
    },
  ]

  const n = Math.min(
    shot.postPitch?.length || 0,
    shot.postRoll?.length || 0,
    shot.postYaw?.length || 0,
  )
  if (n === 0) return out

  for (let i = 0; i < n; i++) {
    const frac = (i + 1) / n
    out.push({
      t: t0 + FT_POST_WINDOW_MS * frac,
      pitch: shot.postPitch[i],
      roll: shot.postRoll[i],
      yaw: shot.postYaw[i],
    })
  }
  return out
}

/**
 * Trigger → windowMs sonundaki (veya en yakın) örnek vs trigger.
 *
 * @param {Array<{ t: number, pitch: number, roll: number, yaw: number }>} timeline
 * @param {number} tTrigger
 * @param {number} windowMs
 * @returns {FollowThroughWindowMetrics}
 */
function computePostWindow(timeline, tTrigger, windowMs) {
  const tEnd = tTrigger + windowMs
  let best = timeline[0]
  let bestDt = Math.abs(timeline[0].t - tEnd)
  let count = 0
  for (let i = 0; i < timeline.length; i++) {
    const s = timeline[i]
    if (s.t >= tTrigger && s.t <= tEnd + 0.5) count += 1
    const dt = Math.abs(s.t - tEnd)
    if (dt < bestDt) {
      best = s
      bestDt = dt
    }
  }

  const start = timeline[0]
  const deltaPitch = best.pitch - start.pitch
  const deltaRoll = best.roll - start.roll
  const deltaYaw = best.yaw - start.yaw
  return {
    windowMs,
    deltaPitch,
    deltaRoll,
    deltaYaw,
    magnitude: Math.hypot(deltaPitch, deltaRoll),
    sampleCount: count,
  }
}

/**
 * Ana giriş: Shot Event post-buffer → FollowThroughResult.
 *
 * @param {{
 *   shot: {
 *     postPitch: number[]
 *     postRoll: number[]
 *     postYaw: number[]
 *     triggerPitch: number
 *     triggerRoll: number
 *     triggerYaw: number
 *     triggerTimestamp: number
 *     postCount?: number
 *     complete?: boolean
 *   }
 * }} input
 * @returns {FollowThroughResult}
 */
export function analyzeFollowThrough(input) {
  const result = createEmptyFollowThroughResult()
  const shot = input.shot
  if (!shot || !Number.isFinite(shot.triggerTimestamp) || shot.triggerTimestamp <= 0) {
    return result
  }

  const timeline = buildPostTimeline(shot)
  if (timeline.length < 2) {
    result.analyzedTriggerTimestamp = shot.triggerTimestamp
    result.score = 100
    result.stability = FollowThroughStability.EXCELLENT
    result.duration = 0
    return result
  }

  const tTrigger = shot.triggerTimestamp
  const w20 = computePostWindow(timeline, tTrigger, FT_WINDOW_20_MS)
  const w50 = computePostWindow(timeline, tTrigger, FT_WINDOW_50_MS)
  const w100 = computePostWindow(timeline, tTrigger, FT_WINDOW_100_MS)
  result.windows = [w20, w50, w100]

  // Segment sapmaları (ardışık noktalar) → peak / avg / RMS
  let sumMag = 0
  let sumMag2 = 0
  let peak = 0
  let segCount = 0
  for (let i = 1; i < timeline.length; i++) {
    const dp = timeline[i].pitch - timeline[i - 1].pitch
    const dr = timeline[i].roll - timeline[i - 1].roll
    const mag = Math.hypot(dp, dr)
    sumMag += mag
    sumMag2 += mag * mag
    if (mag > peak) peak = mag
    segCount += 1
  }

  const inv = segCount > 0 ? 1 / segCount : 0
  const averageMovement = sumMag * inv
  const rmsMovement = Math.sqrt(sumMag2 * inv)

  // Ağırlıklı net yer değiştirme (trigger → pencereler)
  const dPitch =
    w20.deltaPitch * FT_WEIGHT_20_MS +
    w50.deltaPitch * FT_WEIGHT_50_MS +
    w100.deltaPitch * FT_WEIGHT_100_MS
  const dRoll =
    w20.deltaRoll * FT_WEIGHT_20_MS +
    w50.deltaRoll * FT_WEIGHT_50_MS +
    w100.deltaRoll * FT_WEIGHT_100_MS

  result.movementMagnitude = Math.hypot(dPitch, dRoll)
  result.movementAngle = (Math.atan2(dPitch, dRoll) * 180) / Math.PI
  result.peakMovement = peak
  result.averageMovement = averageMovement
  result.rmsMovement = rmsMovement
  result.duration = Math.max(0, timeline[timeline.length - 1].t - tTrigger)
  result.analyzedTriggerTimestamp = tTrigger

  result.score = calculateFollowThroughScore({
    rmsMovement,
    peakMovement: peak,
    snapMagnitude: w20.magnitude,
  })
  result.stability = calculateFollowThroughState(result.score)

  return result
}
