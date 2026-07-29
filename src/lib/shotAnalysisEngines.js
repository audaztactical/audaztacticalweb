/**
 * Shot analysis engines (v1) — firmware 1.6.x Hold / Muzzle Trace / Shot Event
 * ile aynı mantık, tarayıcıda mevcut T: + trigger akışından üretilir.
 * Protokol / JSON değişmez.
 * Flinch Detection (v1) — Shot Event pre-buffer üzerinden (ayrı motor).
 * Follow Through (v1) — Shot Event post-buffer üzerinden (ayrı motor).
 * Performance Scoring (v1) — tüm motor sonuçlarından tek Shot Score.
 * Session Engine (v1) — PerformanceScore oturum kaydı (memory).
 */

import {
  analyzeFlinch,
  createEmptyFlinchResult,
  resetFlinch,
} from './flinchDetectionEngine'
import {
  analyzeFollowThrough,
  createEmptyFollowThroughResult,
  resetFollowThrough,
} from './followThroughEngine'
import {
  calculateShotScore,
  createPerformanceEngineState,
  resetPerformanceEngine,
} from './performanceScoringEngine'
import { addShot, createSession, resetSession } from './sessionEngine'

/** @typedef {{ pitch: number, roll: number, yaw: number }} AimReference */

/** @typedef {{
 *   holdPitchRms: number
 *   holdRollRms: number
 *   holdCombinedRms: number
 *   holdStdDev: number
 *   holdQuality: number
 *   holdMaxDev: number
 *   holdAvgDev: number
 *   holdSamples: number
 * }} HoldSnapshot */

/** @typedef {{
 *   id: number
 *   triggerT: number
 *   points: Array<{ x: number, y: number, t: number }>
 *   triggerIndex: number
 * }} TracePlaybackClip */

/** @typedef {{
 *   traceRadius: number
 *   tracePeak: number
 *   traceAverage: number
 *   pathLength: number
 *   points: Array<{ x: number, y: number, t: number }>
 *   samples: number
 *   playback: TracePlaybackClip | null
 * }} TraceSnapshot */

/** @typedef {{
 *   prePitch: number[]
 *   preRoll: number[]
 *   preYaw: number[]
 *   triggerPitch: number
 *   triggerRoll: number
 *   triggerYaw: number
 *   triggerTimestamp: number
 *   postPitch: number[]
 *   postRoll: number[]
 *   postYaw: number[]
 *   preCount: number
 *   postCount: number
 *   complete: boolean
 *   capturingPost: boolean
 * }} ShotEventSnapshot */

export const HOLD_BUFFER_CAPACITY = 50
export const HOLD_WINDOW_MS = 2000
export const HOLD_QUALITY_RMS_REF_DEG = 2.0

export const TRACE_BUFFER_CAPACITY = 96
/** Canlı namlu izi penceresi — playback için ≥3 sn pre-trigger */
export const TRACE_WINDOW_MS = 3000
/** Tetik anında saklanan geriye dönük iz süresi */
export const TRACE_PLAYBACK_PRE_MS = 3000
/** Tetik sonrası kısa flinch uzantısı (playback) */
export const TRACE_PLAYBACK_POST_MS = 150

export const SHOT_PRE_WINDOW_MS = 250
export const SHOT_POST_WINDOW_MS = 100
export const SHOT_PRE_CAPACITY = 25
export const SHOT_POST_CAPACITY = 10

/**
 * @returns {AimReference}
 */
export function createEmptyAimReference() {
  return { pitch: 0, roll: 0, yaw: 0 }
}

/**
 * @returns {HoldSnapshot}
 */
export function createEmptyHoldSnapshot() {
  return {
    holdPitchRms: 0,
    holdRollRms: 0,
    holdCombinedRms: 0,
    holdStdDev: 0,
    holdQuality: 0,
    holdMaxDev: 0,
    holdAvgDev: 0,
    holdSamples: 0,
  }
}

/**
 * @returns {TraceSnapshot}
 */
export function createEmptyTraceSnapshot() {
  return {
    traceRadius: 0,
    tracePeak: 0,
    traceAverage: 0,
    pathLength: 0,
    points: [],
    samples: 0,
    playback: null,
  }
}

/**
 * @returns {ShotEventSnapshot}
 */
export function createEmptyShotEventSnapshot() {
  return {
    prePitch: [],
    preRoll: [],
    preYaw: [],
    triggerPitch: 0,
    triggerRoll: 0,
    triggerYaw: 0,
    triggerTimestamp: 0,
    postPitch: [],
    postRoll: [],
    postYaw: [],
    preCount: 0,
    postCount: 0,
    complete: false,
    capturingPost: false,
  }
}

/**
 * Mutable analiz durumu — HardwareContext analysisRef.
 * @typedef {Object} ShotAnalysisState
 * @property {AimReference} reference
 * @property {Array<{ t: number, deltaPitch: number, deltaRoll: number }>} holdRing
 * @property {Array<{ t: number, x: number, y: number }>} traceRing
 * @property {Array<{ t: number, pitch: number, roll: number, yaw: number }>} shotPreRing
 * @property {HoldSnapshot} hold
 * @property {TraceSnapshot} trace
 * @property {ShotEventSnapshot} shot
 * @property {import('./flinchDetectionEngine').FlinchResult} flinch
 * @property {import('./followThroughEngine').FollowThroughResult} followThrough
 * @property {import('./performanceScoringEngine').PerformanceEngineState} performance
 * @property {import('./sessionEngine').Session} session
 * @property {number} seq
 */

/**
 * @returns {ShotAnalysisState}
 */
export function createShotAnalysisState() {
  return {
    reference: createEmptyAimReference(),
    holdRing: [],
    traceRing: [],
    shotPreRing: [],
    hold: createEmptyHoldSnapshot(),
    trace: createEmptyTraceSnapshot(),
    shot: createEmptyShotEventSnapshot(),
    flinch: createEmptyFlinchResult(),
    followThrough: createEmptyFollowThroughResult(),
    performance: createPerformanceEngineState(),
    session: createSession(),
    seq: 0,
  }
}

/**
 * @param {number} combinedRms
 * @returns {number}
 */
export function calculateHoldQuality(combinedRms) {
  let q = 1 - combinedRms / HOLD_QUALITY_RMS_REF_DEG
  if (q < 0) q = 0
  if (q > 1) q = 1
  return q * 100
}

/**
 * @param {number} quality
 * @returns {'elite' | 'stable' | 'fair' | 'loose'}
 */
export function holdQualityBand(quality) {
  if (quality >= 92) return 'elite'
  if (quality >= 70) return 'stable'
  if (quality >= 50) return 'fair'
  return 'loose'
}

/**
 * @param {ShotAnalysisState} state
 * @param {Partial<AimReference>} ref
 */
export function setAnalysisReference(state, ref) {
  if (ref.pitch != null && Number.isFinite(ref.pitch)) state.reference.pitch = ref.pitch
  if (ref.roll != null && Number.isFinite(ref.roll)) state.reference.roll = ref.roll
  if (ref.yaw != null && Number.isFinite(ref.yaw)) state.reference.yaw = ref.yaw
  state.seq += 1
}

/**
 * @param {ShotAnalysisState} state
 */
export function resetShotAnalysis(state) {
  state.holdRing.length = 0
  state.traceRing.length = 0
  state.shotPreRing.length = 0
  Object.assign(state.hold, createEmptyHoldSnapshot())
  Object.assign(state.trace, createEmptyTraceSnapshot())
  Object.assign(state.shot, createEmptyShotEventSnapshot())
  resetFlinch(state.flinch)
  resetFollowThrough(state.followThrough)
  resetPerformanceEngine(state.performance)
  resetSession(state.session)
  state.seq += 1
}

/**
 * @template {{ t: number }} T
 * @param {T[]} ring
 * @param {T} sample
 * @param {number} windowMs
 * @param {number} capacity
 */
function pushWindowed(ring, sample, windowMs, capacity) {
  ring.push(sample)
  const cutoff = sample.t - windowMs
  let start = 0
  while (start < ring.length && ring[start].t < cutoff) start += 1
  if (start > 0) ring.splice(0, start)
  while (ring.length > capacity) ring.shift()
}

/**
 * @param {ShotAnalysisState} state
 */
function recomputeHold(state) {
  const ring = state.holdRing
  const n = ring.length
  const out = state.hold
  if (n === 0) {
    Object.assign(out, createEmptyHoldSnapshot())
    return
  }

  let sumDp2 = 0
  let sumDr2 = 0
  let sumMag = 0
  let sumMag2 = 0
  let maxMag = 0

  for (let i = 0; i < n; i++) {
    const dp = ring[i].deltaPitch
    const dr = ring[i].deltaRoll
    sumDp2 += dp * dp
    sumDr2 += dr * dr
    const mag = Math.hypot(dp, dr)
    sumMag += mag
    sumMag2 += mag * mag
    if (mag > maxMag) maxMag = mag
  }

  const invN = 1 / n
  const pitchRms = Math.sqrt(sumDp2 * invN)
  const rollRms = Math.sqrt(sumDr2 * invN)
  const combinedRms = Math.sqrt(0.5 * (pitchRms * pitchRms + rollRms * rollRms))
  const avgMag = sumMag * invN
  let varMag = sumMag2 * invN - avgMag * avgMag
  if (varMag < 0) varMag = 0

  out.holdPitchRms = pitchRms
  out.holdRollRms = rollRms
  out.holdCombinedRms = combinedRms
  out.holdStdDev = Math.sqrt(varMag)
  out.holdQuality = calculateHoldQuality(combinedRms)
  out.holdMaxDev = maxMag
  out.holdAvgDev = avgMag
  out.holdSamples = n
}

/**
 * @param {ShotAnalysisState} state
 */
function recomputeTrace(state) {
  const ring = state.traceRing
  const n = ring.length
  const out = state.trace
  const prevPlayback = out.playback
  if (n === 0) {
    Object.assign(out, createEmptyTraceSnapshot())
    out.playback = prevPlayback
    return
  }

  let sumDist = 0
  let sumDist2 = 0
  let peak = 0
  let pathLen = 0

  for (let i = 0; i < n; i++) {
    const d = Math.hypot(ring[i].x, ring[i].y)
    sumDist += d
    sumDist2 += d * d
    if (d > peak) peak = d
    if (i > 0) {
      pathLen += Math.hypot(ring[i].x - ring[i - 1].x, ring[i].y - ring[i - 1].y)
    }
  }

  const invN = 1 / n
  out.traceAverage = sumDist * invN
  out.tracePeak = peak
  out.traceRadius = Math.sqrt(sumDist2 * invN)
  out.pathLength = pathLen
  out.samples = n
  out.points = ring.map((p) => ({ x: p.x, y: p.y, t: p.t }))
  out.playback = prevPlayback
}

/**
 * Telemetri paketi — Hold + Trace + Shot pre/post.
 * @param {ShotAnalysisState} state
 * @param {{ pitch?: number, roll?: number, yaw?: number, timestamp?: number }} orient
 * @param {number} [nowMs]
 */
export function tickShotAnalysis(state, orient, nowMs = performance.now()) {
  const pitch = Number(orient.pitch) || 0
  const roll = Number(orient.roll) || 0
  const yaw = Number(orient.yaw) || 0
  const t = Number.isFinite(orient.timestamp) && orient.timestamp > 0 ? orient.timestamp : nowMs

  const deltaPitch = pitch - state.reference.pitch
  const deltaRoll = roll - state.reference.roll

  pushWindowed(
    state.holdRing,
    { t, deltaPitch, deltaRoll },
    HOLD_WINDOW_MS,
    HOLD_BUFFER_CAPACITY,
  )
  recomputeHold(state)

  pushWindowed(
    state.traceRing,
    { t, x: deltaPitch, y: deltaRoll },
    TRACE_WINDOW_MS,
    TRACE_BUFFER_CAPACITY,
  )
  recomputeTrace(state)

  const shot = state.shot
  if (shot.capturingPost) {
    const elapsed = t - shot.triggerTimestamp
    if (shot.postCount < SHOT_POST_CAPACITY) {
      shot.postPitch.push(pitch)
      shot.postRoll.push(roll)
      shot.postYaw.push(yaw)
      shot.postCount = shot.postPitch.length
    }
    if (elapsed >= SHOT_POST_WINDOW_MS || shot.postCount >= SHOT_POST_CAPACITY) {
      shot.capturingPost = false
      shot.complete = true

      // Playback clip'e kısa post (flinch) uzatması
      const pb = state.trace.playback
      if (pb && pb.id === shot.triggerTimestamp && shot.postCount > 0) {
        const nPost = shot.postCount
        for (let i = 0; i < nPost; i++) {
          const ti =
            shot.triggerTimestamp + ((i + 1) / nPost) * TRACE_PLAYBACK_POST_MS
          pb.points.push({
            x: shot.postPitch[i] - state.reference.pitch,
            y: shot.postRoll[i] - state.reference.roll,
            t: ti,
          })
        }
      }

      // Follow Through: post-buffer dolunca (Shot Event / Flinch mantığı değişmez)
      if (state.followThrough.analyzedTriggerTimestamp !== shot.triggerTimestamp) {
        const ft = analyzeFollowThrough({ shot })
        state.followThrough.score = ft.score
        state.followThrough.stability = ft.stability
        state.followThrough.movementMagnitude = ft.movementMagnitude
        state.followThrough.movementAngle = ft.movementAngle
        state.followThrough.peakMovement = ft.peakMovement
        state.followThrough.averageMovement = ft.averageMovement
        state.followThrough.rmsMovement = ft.rmsMovement
        state.followThrough.duration = ft.duration
        state.followThrough.analyzedTriggerTimestamp = ft.analyzedTriggerTimestamp
        state.followThrough.windows.length = 0
        for (let i = 0; i < ft.windows.length; i++) {
          state.followThrough.windows.push(ft.windows[i])
        }

        // Performance Score: tüm motorlar hazır (post tamam)
        if (state.performance.last.analyzedTriggerTimestamp !== shot.triggerTimestamp) {
          calculateShotScore(state.performance, {
            hold: state.hold,
            trace: state.trace,
            flinch: state.flinch,
            followThrough: state.followThrough,
            movementDuration: state.followThrough.duration,
            triggerTimestamp: shot.triggerTimestamp,
            nowMs: t,
          })
          // Session: PerformanceScore kaydı (Performance Engine dosyasına dokunulmaz)
          addShot(state.session, {
            performance: state.performance.last,
            flinchDirection: state.flinch.direction,
            flinchSeverity: state.flinch.severity,
            followThroughState: state.followThrough.stability,
            holdQuality: state.hold.holdQuality,
            tracePeak: state.trace.tracePeak,
            traceAverage: state.trace.traceAverage,
          })
        }
      }
    }
  } else {
    pushWindowed(
      state.shotPreRing,
      { t, pitch, roll, yaw },
      SHOT_PRE_WINDOW_MS,
      SHOT_PRE_CAPACITY,
    )
  }

  state.seq += 1
}

/**
 * Trigger — ShotEvent pre + frame + post yakalama.
 * @param {ShotAnalysisState} state
 * @param {{ pitch?: number, roll?: number, yaw?: number, timestamp?: number }} orient
 * @param {number} [nowMs]
 */
export function captureShotEventAnalysis(state, orient, nowMs = performance.now()) {
  const pitch = Number(orient.pitch) || 0
  const roll = Number(orient.roll) || 0
  const yaw = Number(orient.yaw) || 0
  const t = Number.isFinite(orient.timestamp) && orient.timestamp > 0 ? orient.timestamp : nowMs

  const pre = state.shotPreRing
  const shot = state.shot
  shot.prePitch = pre.map((s) => s.pitch)
  shot.preRoll = pre.map((s) => s.roll)
  shot.preYaw = pre.map((s) => s.yaw)
  shot.preCount = pre.length
  shot.triggerPitch = pitch
  shot.triggerRoll = roll
  shot.triggerYaw = yaw
  shot.triggerTimestamp = t
  shot.postPitch = []
  shot.postRoll = []
  shot.postYaw = []
  shot.postCount = 0
  shot.complete = false
  shot.capturingPost = true

  // Namlu izi playback: tetikten geriye ≥3 sn + tetik noktası
  const cutoff = t - TRACE_PLAYBACK_PRE_MS
  /** @type {Array<{ x: number, y: number, t: number }>} */
  const clipPts = []
  for (let i = 0; i < state.traceRing.length; i++) {
    const p = state.traceRing[i]
    if (p.t >= cutoff) clipPts.push({ x: p.x, y: p.y, t: p.t })
  }
  // Trace seyrekse hold halkasından doldur (aynı Δpitch/Δroll uzayı)
  if (clipPts.length < 2) {
    for (let i = 0; i < state.holdRing.length; i++) {
      const p = state.holdRing[i]
      if (p.t < cutoff) continue
      clipPts.push({ x: p.deltaPitch, y: p.deltaRoll, t: p.t })
    }
    clipPts.sort((a, b) => a.t - b.t)
  }
  const trigX = pitch - state.reference.pitch
  const trigY = roll - state.reference.roll
  const last = clipPts[clipPts.length - 1]
  if (!last || Math.abs(last.t - t) > 8) {
    clipPts.push({ x: trigX, y: trigY, t })
  } else {
    last.x = trigX
    last.y = trigY
    last.t = t
  }
  // En az 2 nokta — tek noktalı clip oynatılamaz
  if (clipPts.length === 1) {
    clipPts.unshift({
      x: clipPts[0].x,
      y: clipPts[0].y,
      t: t - Math.min(TRACE_PLAYBACK_PRE_MS, 400),
    })
  }
  state.trace.playback = {
    id: t,
    triggerT: t,
    points: clipPts,
    triggerIndex: Math.max(0, clipPts.length - 1),
  }
  // UI anında görsün
  state.trace.points = state.traceRing.map((p) => ({ x: p.x, y: p.y, t: p.t }))
  state.trace.samples = state.traceRing.length

  // Flinch: pre-buffer + trigger anı (Shot Event motoruna dokunmadan sonuç üret)
  const flinchResult = analyzeFlinch({
    shot,
    holdQuality: state.hold.holdQuality,
    tracePeak: state.trace.tracePeak,
    traceAverage: state.trace.traceAverage,
    preRing: pre.slice(),
  })
  Object.assign(state.flinch, flinchResult)
  state.flinch.windows = flinchResult.windows

  // Yeni atış — follow-through post bitene kadar bekler
  resetFollowThrough(state.followThrough)

  state.seq += 1
}

/**
 * UI için düz kopya (rAF).
 * @param {ShotAnalysisState} state
 */
export function cloneAnalysisView(state) {
  return {
    seq: state.seq,
    reference: { ...state.reference },
    hold: { ...state.hold },
    trace: {
      ...state.trace,
      points: state.trace.points.slice(),
      playback: state.trace.playback
        ? {
            id: state.trace.playback.id,
            triggerT: state.trace.playback.triggerT,
            triggerIndex: state.trace.playback.triggerIndex,
            points: state.trace.playback.points.map((p) => ({ ...p })),
          }
        : null,
    },
    shot: {
      ...state.shot,
      prePitch: state.shot.prePitch.slice(),
      preRoll: state.shot.preRoll.slice(),
      preYaw: state.shot.preYaw.slice(),
      postPitch: state.shot.postPitch.slice(),
      postRoll: state.shot.postRoll.slice(),
      postYaw: state.shot.postYaw.slice(),
    },
    flinch: {
      ...state.flinch,
      windows: state.flinch.windows.map((w) => ({ ...w })),
    },
    followThrough: {
      ...state.followThrough,
      windows: state.followThrough.windows.map((w) => ({ ...w })),
    },
    performance: {
      ...state.performance.last,
    },
    session: {
      shotCount: state.session.shotCount,
      averageScore: state.session.averageScore,
      bestScore: state.session.bestScore,
      worstScore: state.session.worstScore,
      averageHold: state.session.averageHold,
      averageFollowThrough: state.session.averageFollowThrough,
      averageFlinch: state.session.averageFlinch,
      averageTrace: state.session.averageTrace,
      consistency: state.session.consistency,
      gradeDistribution: { ...state.session.gradeDistribution },
      trends: { ...state.session.trends },
      personalBest: state.session.personalBest,
      personalBestTimestamp: state.session.personalBestTimestamp,
      totalAdded: state.session.totalAdded,
    },
  }
}
