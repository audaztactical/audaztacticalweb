/**
 * Flinch Detection Engine (v1)
 *
 * Shot Event pre-buffer (250 ms) + trigger frame üzerinden,
 * tetik öncesi istemsiz namlu hareketini sınıflandırır.
 * Firmware / BLE / USB / protokol dokunulmaz — yalnızca web analizi.
 */

// =============================================================================
// Constants (magic number yok)
// =============================================================================

/** Analiz pencereleri — trigger anından geriye (ms) */
export const FLINCH_WINDOW_100_MS = 100
export const FLINCH_WINDOW_50_MS = 50
export const FLINCH_WINDOW_20_MS = 20

/** Pre-buffer üst sınırı (Shot Event ile uyumlu) */
export const FLINCH_PRE_WINDOW_MS = 250

/**
 * Yön sınıflandırması — açı sektörleri (derece).
 * 0° = sağ (+roll), 90° = yukarı (+pitch), atan2(dPitch, dRoll).
 */
export const FLINCH_DIR_SECTOR_HALF_DEG = 22.5

/** Magnitude eşikleri (°) — severity / confidence */
export const FLINCH_MAG_NONE_MAX_DEG = 0.15
export const FLINCH_MAG_LOW_MAX_DEG = 0.45
export const FLINCH_MAG_MEDIUM_MAX_DEG = 1.2
/** HIGH: > FLINCH_MAG_MEDIUM_MAX_DEG */

/** Pencere ağırlıkları — yakın pencere daha etkili */
export const FLINCH_WEIGHT_20_MS = 0.5
export const FLINCH_WEIGHT_50_MS = 0.3
export const FLINCH_WEIGHT_100_MS = 0.2

/** Confidence: tutarlılık (pencereler arası yön uyumu) payı */
export const FLINCH_CONF_CONSISTENCY_WEIGHT = 0.55
/** Confidence: büyüklük payı */
export const FLINCH_CONF_MAGNITUDE_WEIGHT = 0.25
/** Confidence: holdQuality katkısı (yüksek hold → flinch daha ayırt edilebilir) */
export const FLINCH_CONF_HOLD_WEIGHT = 0.12
/** Confidence: tracePeak katkısı (yüksek peak → hareket kanıtı) */
export const FLINCH_CONF_TRACE_WEIGHT = 0.08

/** Magnitude → confidence ölçeği: bu değerde (°) magnitude skoru ≈ 1 */
export const FLINCH_CONF_MAG_REF_DEG = 1.5

/** Minimum örnek sayısı (tek nokta → UNKNOWN / düşük güven) */
export const FLINCH_MIN_SAMPLES_FOR_DIR = 2

// =============================================================================
// Enums
// =============================================================================

/** @typedef {'CENTER'|'LEFT'|'RIGHT'|'UP'|'DOWN'|'UP_LEFT'|'UP_RIGHT'|'DOWN_LEFT'|'DOWN_RIGHT'|'UNKNOWN'} FlinchDirection */

/** @type {Record<string, FlinchDirection>} */
export const FlinchDirection = Object.freeze({
  CENTER: 'CENTER',
  LEFT: 'LEFT',
  RIGHT: 'RIGHT',
  UP: 'UP',
  DOWN: 'DOWN',
  UP_LEFT: 'UP_LEFT',
  UP_RIGHT: 'UP_RIGHT',
  DOWN_LEFT: 'DOWN_LEFT',
  DOWN_RIGHT: 'DOWN_RIGHT',
  UNKNOWN: 'UNKNOWN',
})

/** @typedef {'NONE'|'LOW'|'MEDIUM'|'HIGH'} FlinchSeverity */

/** @type {Record<string, FlinchSeverity>} */
export const FlinchSeverity = Object.freeze({
  NONE: 'NONE',
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
})

/**
 * @typedef {Object} FlinchWindowMetrics
 * @property {number} windowMs
 * @property {number} pitchRate  °/s
 * @property {number} rollRate   °/s
 * @property {number} yawRate    °/s
 * @property {number} deltaPitch °
 * @property {number} deltaRoll  °
 * @property {number} deltaYaw   °
 * @property {number} magnitude  °
 * @property {number} angleDeg   atan2(dPitch, dRoll)
 * @property {number} sampleCount
 */

/**
 * @typedef {Object} FlinchResult
 * @property {FlinchDirection} direction
 * @property {FlinchSeverity} severity
 * @property {number} confidence  0…100
 * @property {number} movementMagnitude  °
 * @property {number} movementAngle  derece (−180…180)
 * @property {number} preTriggerDuration  ms (kullanılan pre span)
 * @property {number} pitchRate  birleşik °/s (ağırlıklı)
 * @property {number} rollRate
 * @property {number} yawRate
 * @property {FlinchWindowMetrics[]} windows
 */

/**
 * @returns {FlinchResult}
 */
export function createEmptyFlinchResult() {
  return {
    direction: FlinchDirection.UNKNOWN,
    severity: FlinchSeverity.NONE,
    confidence: 0,
    movementMagnitude: 0,
    movementAngle: 0,
    preTriggerDuration: 0,
    pitchRate: 0,
    rollRate: 0,
    yawRate: 0,
    windows: [],
  }
}

/**
 * @param {FlinchResult} result
 */
export function resetFlinch(result) {
  Object.assign(result, createEmptyFlinchResult())
  result.windows = []
}

/**
 * @param {number} magnitudeDeg
 * @returns {FlinchSeverity}
 */
export function calculateFlinchSeverity(magnitudeDeg) {
  const m = Math.abs(magnitudeDeg)
  if (m <= FLINCH_MAG_NONE_MAX_DEG) return FlinchSeverity.NONE
  if (m <= FLINCH_MAG_LOW_MAX_DEG) return FlinchSeverity.LOW
  if (m <= FLINCH_MAG_MEDIUM_MAX_DEG) return FlinchSeverity.MEDIUM
  return FlinchSeverity.HIGH
}

/**
 * Hareket vektörü (dRoll, dPitch) → 8 yön + CENTER / UNKNOWN.
 * Roll: sağ (+), sol (−). Pitch: yukarı (+), aşağı (−) — IMU convention ile uyumlu varsayım.
 *
 * @param {number} deltaPitch
 * @param {number} deltaRoll
 * @param {number} magnitude
 * @returns {FlinchDirection}
 */
export function calculateFlinchDirection(deltaPitch, deltaRoll, magnitude) {
  if (!Number.isFinite(magnitude) || magnitude <= FLINCH_MAG_NONE_MAX_DEG) {
    return FlinchDirection.CENTER
  }
  if (!Number.isFinite(deltaPitch) || !Number.isFinite(deltaRoll)) {
    return FlinchDirection.UNKNOWN
  }

  // atan2(y, x) → pitch = Y, roll = X
  const angle = (Math.atan2(deltaPitch, deltaRoll) * 180) / Math.PI
  const a = angle < 0 ? angle + 360 : angle
  const half = FLINCH_DIR_SECTOR_HALF_DEG

  // 0° RIGHT, 45° UP_RIGHT, 90° UP, …
  if (a >= 360 - half || a < half) return FlinchDirection.RIGHT
  if (a >= 45 - half && a < 45 + half) return FlinchDirection.UP_RIGHT
  if (a >= 90 - half && a < 90 + half) return FlinchDirection.UP
  if (a >= 135 - half && a < 135 + half) return FlinchDirection.UP_LEFT
  if (a >= 180 - half && a < 180 + half) return FlinchDirection.LEFT
  if (a >= 225 - half && a < 225 + half) return FlinchDirection.DOWN_LEFT
  if (a >= 270 - half && a < 270 + half) return FlinchDirection.DOWN
  if (a >= 315 - half && a < 315 + half) return FlinchDirection.DOWN_RIGHT
  return FlinchDirection.UNKNOWN
}

/**
 * Confidence 0…100:
 *   consistency (pencere yön uyumu) + magnitude + holdQuality + tracePeak
 *
 * @param {{
 *   windowDirections: FlinchDirection[]
 *   magnitude: number
 *   holdQuality: number
 *   tracePeak: number
 *   severity: FlinchSeverity
 * }} input
 * @returns {number}
 */
export function calculateFlinchConfidence(input) {
  const dirs = input.windowDirections.filter((d) => d !== FlinchDirection.UNKNOWN)
  let consistency = 0
  if (dirs.length >= 2) {
    const primary = dirs[dirs.length - 1]
    let agree = 0
    for (let i = 0; i < dirs.length; i++) {
      if (dirs[i] === primary || dirs[i] === FlinchDirection.CENTER) agree += 1
    }
    consistency = agree / dirs.length
  } else if (dirs.length === 1) {
    consistency = 0.45
  }

  // Düşük hareket → düşük güven
  let magNorm = input.magnitude / FLINCH_CONF_MAG_REF_DEG
  if (magNorm < 0) magNorm = 0
  if (magNorm > 1) magNorm = 1
  if (input.severity === FlinchSeverity.NONE) magNorm *= 0.25

  const holdNorm = Math.max(0, Math.min(1, (Number(input.holdQuality) || 0) / 100))
  let traceNorm = (Number(input.tracePeak) || 0) / FLINCH_CONF_MAG_REF_DEG
  if (traceNorm < 0) traceNorm = 0
  if (traceNorm > 1) traceNorm = 1

  const score =
    FLINCH_CONF_CONSISTENCY_WEIGHT * consistency +
    FLINCH_CONF_MAGNITUDE_WEIGHT * magNorm +
    FLINCH_CONF_HOLD_WEIGHT * holdNorm +
    FLINCH_CONF_TRACE_WEIGHT * traceNorm

  return Math.round(Math.max(0, Math.min(100, score * 100)))
}

/**
 * Tek pencere: [tTrigger − windowMs, tTrigger] içindeki ilk ve son örnek → delta / rate.
 *
 * @param {Array<{ t: number, pitch: number, roll: number, yaw: number }>} samples
 * @param {number} tTrigger
 * @param {number} windowMs
 * @param {{ pitch: number, roll: number, yaw: number }} trigger
 * @returns {FlinchWindowMetrics}
 */
function computeWindowMetrics(samples, tTrigger, windowMs, trigger) {
  const t0 = tTrigger - windowMs
  /** @type {Array<{ t: number, pitch: number, roll: number, yaw: number }>} */
  const inWin = []
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i]
    if (s.t >= t0 && s.t <= tTrigger) inWin.push(s)
  }

  // Pencere boşsa: trigger’a en yakın pre örnek
  if (inWin.length === 0 && samples.length > 0) {
    let best = samples[0]
    let bestDt = Math.abs(samples[0].t - tTrigger)
    for (let i = 1; i < samples.length; i++) {
      const dt = Math.abs(samples[i].t - tTrigger)
      if (dt < bestDt) {
        best = samples[i]
        bestDt = dt
      }
    }
    inWin.push(best)
  }

  const start = inWin.length > 0 ? inWin[0] : trigger
  const end = trigger
  const dtMs = Math.max(1, (end.t ?? tTrigger) - (start.t ?? t0))
  const dtSec = dtMs / 1000

  const deltaPitch = end.pitch - start.pitch
  const deltaRoll = end.roll - start.roll
  const deltaYaw = end.yaw - start.yaw
  const magnitude = Math.hypot(deltaPitch, deltaRoll)
  const angleDeg = (Math.atan2(deltaPitch, deltaRoll) * 180) / Math.PI

  return {
    windowMs,
    pitchRate: deltaPitch / dtSec,
    rollRate: deltaRoll / dtSec,
    yawRate: deltaYaw / dtSec,
    deltaPitch,
    deltaRoll,
    deltaYaw,
    magnitude,
    angleDeg,
    sampleCount: inWin.length,
  }
}

/**
 * Pre dizilerinden zaman damgalı örnek üret (ring’den geldiyse t kullan).
 *
 * @param {{
 *   prePitch: number[]
 *   preRoll: number[]
 *   preYaw: number[]
 *   preTimestamps?: number[]
 *   triggerPitch: number
 *   triggerRoll: number
 *   triggerYaw: number
 *   triggerTimestamp: number
 * }} shot
 * @param {Array<{ t: number, pitch: number, roll: number, yaw: number }>} [preRing]
 */
function buildPreSamples(shot, preRing) {
  if (preRing && preRing.length > 0) {
    return preRing.map((s) => ({
      t: s.t,
      pitch: s.pitch,
      roll: s.roll,
      yaw: s.yaw,
    }))
  }

  const n = Math.min(
    shot.prePitch?.length || 0,
    shot.preRoll?.length || 0,
    shot.preYaw?.length || 0,
  )
  const tTrig = shot.triggerTimestamp
  /** @type {Array<{ t: number, pitch: number, roll: number, yaw: number }>} */
  const out = []
  if (n === 0) return out

  // Eşit aralıklı geriye yayılım (≈ 250 ms pre)
  const span = FLINCH_PRE_WINDOW_MS
  for (let i = 0; i < n; i++) {
    const frac = n === 1 ? 1 : i / (n - 1)
    out.push({
      t: tTrig - span * (1 - frac),
      pitch: shot.prePitch[i],
      roll: shot.preRoll[i],
      yaw: shot.preYaw[i],
    })
  }
  return out
}

/**
 * Ana giriş: Shot Event + Hold + Trace → FlinchResult.
 *
 * @param {{
 *   shot: {
 *     prePitch: number[]
 *     preRoll: number[]
 *     preYaw: number[]
 *     triggerPitch: number
 *     triggerRoll: number
 *     triggerYaw: number
 *     triggerTimestamp: number
 *     preCount?: number
 *   }
 *   holdQuality?: number
 *   tracePeak?: number
 *   traceAverage?: number
 *   preRing?: Array<{ t: number, pitch: number, roll: number, yaw: number }>
 * }} input
 * @returns {FlinchResult}
 */
export function analyzeFlinch(input) {
  const result = createEmptyFlinchResult()
  const shot = input.shot
  if (!shot || !Number.isFinite(shot.triggerTimestamp)) {
    return result
  }

  const samples = buildPreSamples(shot, input.preRing)
  const trigger = {
    t: shot.triggerTimestamp,
    pitch: shot.triggerPitch,
    roll: shot.triggerRoll,
    yaw: shot.triggerYaw,
  }

  if (samples.length + 1 < FLINCH_MIN_SAMPLES_FOR_DIR && samples.length === 0) {
    result.direction = FlinchDirection.UNKNOWN
    result.severity = FlinchSeverity.NONE
    result.confidence = 0
    return result
  }

  const tTrigger = shot.triggerTimestamp
  const preStart = samples.length > 0 ? samples[0].t : tTrigger
  result.preTriggerDuration = Math.max(0, tTrigger - preStart)

  const w100 = computeWindowMetrics(samples, tTrigger, FLINCH_WINDOW_100_MS, trigger)
  const w50 = computeWindowMetrics(samples, tTrigger, FLINCH_WINDOW_50_MS, trigger)
  const w20 = computeWindowMetrics(samples, tTrigger, FLINCH_WINDOW_20_MS, trigger)
  result.windows = [w100, w50, w20]

  // Ağırlıklı birleşik delta / rate (20 ms baskın)
  const dPitch =
    w20.deltaPitch * FLINCH_WEIGHT_20_MS +
    w50.deltaPitch * FLINCH_WEIGHT_50_MS +
    w100.deltaPitch * FLINCH_WEIGHT_100_MS
  const dRoll =
    w20.deltaRoll * FLINCH_WEIGHT_20_MS +
    w50.deltaRoll * FLINCH_WEIGHT_50_MS +
    w100.deltaRoll * FLINCH_WEIGHT_100_MS
  const dYaw =
    w20.deltaYaw * FLINCH_WEIGHT_20_MS +
    w50.deltaYaw * FLINCH_WEIGHT_50_MS +
    w100.deltaYaw * FLINCH_WEIGHT_100_MS

  result.pitchRate =
    w20.pitchRate * FLINCH_WEIGHT_20_MS +
    w50.pitchRate * FLINCH_WEIGHT_50_MS +
    w100.pitchRate * FLINCH_WEIGHT_100_MS
  result.rollRate =
    w20.rollRate * FLINCH_WEIGHT_20_MS +
    w50.rollRate * FLINCH_WEIGHT_50_MS +
    w100.rollRate * FLINCH_WEIGHT_100_MS
  result.yawRate =
    w20.yawRate * FLINCH_WEIGHT_20_MS +
    w50.yawRate * FLINCH_WEIGHT_50_MS +
    w100.yawRate * FLINCH_WEIGHT_100_MS

  const magnitude = Math.hypot(dPitch, dRoll)
  result.movementMagnitude = magnitude
  result.movementAngle = (Math.atan2(dPitch, dRoll) * 180) / Math.PI

  result.direction = calculateFlinchDirection(dPitch, dRoll, magnitude)
  result.severity = calculateFlinchSeverity(magnitude)

  const windowDirections = [
    calculateFlinchDirection(w100.deltaPitch, w100.deltaRoll, w100.magnitude),
    calculateFlinchDirection(w50.deltaPitch, w50.deltaRoll, w50.magnitude),
    calculateFlinchDirection(w20.deltaPitch, w20.deltaRoll, w20.magnitude),
  ]

  result.confidence = calculateFlinchConfidence({
    windowDirections,
    magnitude,
    holdQuality: input.holdQuality ?? 0,
    tracePeak: input.tracePeak ?? input.traceAverage ?? 0,
    severity: result.severity,
  })

  // NONE ise yönü CENTER’a sabitle (gürültü etiketi üretme)
  if (result.severity === FlinchSeverity.NONE) {
    result.direction = FlinchDirection.CENTER
  }

  return result
}
