/**
 * Session Engine (v1)
 *
 * PerformanceScore (+ flinch / follow / hold / trace özetleri)
 * → oturum kaydı, trend, grade dağılımı.
 * Memory-only; LocalStorage / cloud / PDF yok.
 * Alt motorlara ve Performance Engine dosyasına dokunmaz.
 */

import { PerformanceGrade } from './performanceScoringEngine'

// =============================================================================
// Constants
// =============================================================================

/** Oturumda tutulacak maksimum atış (sabit havuz) */
export const SESSION_MAX_SHOTS = 200

/** Trend pencereleri (son N atış ortalaması) */
export const SESSION_TREND_5 = 5
export const SESSION_TREND_10 = 10
export const SESSION_TREND_20 = 20

// =============================================================================
// Models
// =============================================================================

/**
 * @typedef {Object} ShotRecord
 * @property {number} shotNumber
 * @property {number} timestamp
 * @property {number} overallScore
 * @property {string} grade
 * @property {number} holdScore
 * @property {number} traceScore
 * @property {number} flinchScore
 * @property {number} followThroughScore
 * @property {number} consistencyScore
 * @property {string} recommendation
 * @property {string} flinchDirection
 * @property {string} flinchSeverity
 * @property {string} followThroughState
 * @property {number} holdQuality
 * @property {number} tracePeak
 * @property {number} traceAverage
 */

/**
 * @typedef {Object} GradeDistribution
 * @property {number} 'A+'
 * @property {number} A
 * @property {number} B
 * @property {number} C
 * @property {number} D
 * @property {number} F
 */

/**
 * @typedef {Object} SessionTrends
 * @property {number} last5
 * @property {number} last10
 * @property {number} last20
 */

/**
 * @typedef {Object} Session
 * @property {ShotRecord[]} shots  sabit uzunluklu havuz (SESSION_MAX_SHOTS)
 * @property {number} shotCount  geçerli kayıt (≤ MAX); head ile halka
 * @property {number} writeHead  bir sonraki yazım indeksi
 * @property {number} averageScore
 * @property {number} bestScore
 * @property {number} worstScore
 * @property {number} averageHold
 * @property {number} averageFollowThrough
 * @property {number} averageFlinch
 * @property {number} averageTrace
 * @property {number} consistency  son skorların std-benzeri sapması (0…100 ölçekli)
 * @property {GradeDistribution} gradeDistribution
 * @property {SessionTrends} trends
 * @property {number} personalBest
 * @property {number} personalBestTimestamp
 * @property {number} startedAt
 * @property {number} updatedAt
 * @property {number} totalAdded  oturum boyunca eklenen toplam (halka taşsa bile artar)
 */

/**
 * @returns {ShotRecord}
 */
function createEmptyShotRecord() {
  return {
    shotNumber: 0,
    timestamp: 0,
    overallScore: 0,
    grade: PerformanceGrade.F,
    holdScore: 0,
    traceScore: 0,
    flinchScore: 0,
    followThroughScore: 0,
    consistencyScore: 0,
    recommendation: '',
    flinchDirection: '',
    flinchSeverity: '',
    followThroughState: '',
    holdQuality: 0,
    tracePeak: 0,
    traceAverage: 0,
  }
}

/**
 * @returns {GradeDistribution}
 */
export function createEmptyGradeDistribution() {
  return {
    'A+': 0,
    A: 0,
    B: 0,
    C: 0,
    D: 0,
    F: 0,
  }
}

/**
 * @returns {Session}
 */
export function createSession() {
  /** @type {ShotRecord[]} */
  const shots = new Array(SESSION_MAX_SHOTS)
  for (let i = 0; i < SESSION_MAX_SHOTS; i++) {
    shots[i] = createEmptyShotRecord()
  }
  return {
    shots,
    shotCount: 0,
    writeHead: 0,
    averageScore: 0,
    bestScore: 0,
    worstScore: 0,
    averageHold: 0,
    averageFollowThrough: 0,
    averageFlinch: 0,
    averageTrace: 0,
    consistency: 0,
    gradeDistribution: createEmptyGradeDistribution(),
    trends: { last5: 0, last10: 0, last20: 0 },
    personalBest: 0,
    personalBestTimestamp: 0,
    startedAt: 0,
    updatedAt: 0,
    totalAdded: 0,
  }
}

/**
 * Kronolojik indeks: 0 = en eski, shotCount-1 = en yeni.
 * @param {Session} session
 * @param {number} chronologicalIndex
 * @returns {ShotRecord}
 */
function recordAt(session, chronologicalIndex) {
  const n = session.shotCount
  const start =
    n < SESSION_MAX_SHOTS ? 0 : session.writeHead
  const idx = (start + chronologicalIndex) % SESSION_MAX_SHOTS
  return session.shots[idx]
}

/**
 * @param {Session} session
 */
export function resetSession(session) {
  session.shotCount = 0
  session.writeHead = 0
  session.averageScore = 0
  session.bestScore = 0
  session.worstScore = 0
  session.averageHold = 0
  session.averageFollowThrough = 0
  session.averageFlinch = 0
  session.averageTrace = 0
  session.consistency = 0
  const g = session.gradeDistribution
  g['A+'] = 0
  g.A = 0
  g.B = 0
  g.C = 0
  g.D = 0
  g.F = 0
  session.trends.last5 = 0
  session.trends.last10 = 0
  session.trends.last20 = 0
  session.personalBest = 0
  session.personalBestTimestamp = 0
  session.startedAt = 0
  session.updatedAt = 0
  session.totalAdded = 0
  for (let i = 0; i < SESSION_MAX_SHOTS; i++) {
    const r = session.shots[i]
    r.shotNumber = 0
    r.timestamp = 0
    r.overallScore = 0
    r.grade = PerformanceGrade.F
    r.holdScore = 0
    r.traceScore = 0
    r.flinchScore = 0
    r.followThroughScore = 0
    r.consistencyScore = 0
    r.recommendation = ''
    r.flinchDirection = ''
    r.flinchSeverity = ''
    r.followThroughState = ''
    r.holdQuality = 0
    r.tracePeak = 0
    r.traceAverage = 0
  }
}

/**
 * Son N atış overallScore ortalaması.
 * @param {Session} session
 * @param {number} windowSize
 * @returns {number}
 */
export function calculateTrend(session, windowSize) {
  const n = session.shotCount
  if (n <= 0 || windowSize <= 0) return 0
  const take = windowSize < n ? windowSize : n
  let sum = 0
  for (let i = 0; i < take; i++) {
    const rec = recordAt(session, n - take + i)
    sum += rec.overallScore
  }
  return sum / take
}

/**
 * @param {Session} session
 * @returns {GradeDistribution}
 */
export function calculateGradeDistribution(session) {
  const dist = createEmptyGradeDistribution()
  const n = session.shotCount
  for (let i = 0; i < n; i++) {
    const grade = recordAt(session, i).grade
    if (grade === 'A+') dist['A+'] += 1
    else if (grade === 'A') dist.A += 1
    else if (grade === 'B') dist.B += 1
    else if (grade === 'C') dist.C += 1
    else if (grade === 'D') dist.D += 1
    else dist.F += 1
  }
  return dist
}

/**
 * Session özet alanlarını yeniden hesapla.
 * @param {Session} session
 */
export function updateSession(session) {
  const n = session.shotCount
  session.updatedAt = performance.now()

  if (n <= 0) {
    session.averageScore = 0
    session.bestScore = 0
    session.worstScore = 0
    session.averageHold = 0
    session.averageFollowThrough = 0
    session.averageFlinch = 0
    session.averageTrace = 0
    session.consistency = 0
    const g = session.gradeDistribution
    g['A+'] = 0
    g.A = 0
    g.B = 0
    g.C = 0
    g.D = 0
    g.F = 0
    session.trends.last5 = 0
    session.trends.last10 = 0
    session.trends.last20 = 0
    return
  }

  let sumOverall = 0
  let sumHold = 0
  let sumFt = 0
  let sumFlinch = 0
  let sumTrace = 0
  let best = -Infinity
  let worst = Infinity

  const g = session.gradeDistribution
  g['A+'] = 0
  g.A = 0
  g.B = 0
  g.C = 0
  g.D = 0
  g.F = 0

  for (let i = 0; i < n; i++) {
    const r = recordAt(session, i)
    sumOverall += r.overallScore
    sumHold += r.holdScore
    sumFt += r.followThroughScore
    sumFlinch += r.flinchScore
    sumTrace += r.traceScore
    if (r.overallScore > best) best = r.overallScore
    if (r.overallScore < worst) worst = r.overallScore

    if (r.grade === 'A+') g['A+'] += 1
    else if (r.grade === 'A') g.A += 1
    else if (r.grade === 'B') g.B += 1
    else if (r.grade === 'C') g.C += 1
    else if (r.grade === 'D') g.D += 1
    else g.F += 1
  }

  const inv = 1 / n
  session.averageScore = sumOverall * inv
  session.bestScore = best
  session.worstScore = worst
  session.averageHold = sumHold * inv
  session.averageFollowThrough = sumFt * inv
  session.averageFlinch = sumFlinch * inv
  session.averageTrace = sumTrace * inv

  // Consistency: 100 − clamp(population std of overall, 0…50)*2
  let varSum = 0
  const mean = session.averageScore
  for (let i = 0; i < n; i++) {
    const d = recordAt(session, i).overallScore - mean
    varSum += d * d
  }
  const std = Math.sqrt(varSum * inv)
  let consistency = 100 - Math.min(50, std) * 2
  if (consistency < 0) consistency = 0
  if (consistency > 100) consistency = 100
  session.consistency = consistency

  session.trends.last5 = calculateTrend(session, SESSION_TREND_5)
  session.trends.last10 = calculateTrend(session, SESSION_TREND_10)
  session.trends.last20 = calculateTrend(session, SESSION_TREND_20)
}

/**
 * Yeni atış kaydı + özet güncelleme.
 *
 * @param {Session} session
 * @param {{
 *   performance: {
 *     overallScore?: number
 *     grade?: string
 *     holdScore?: number
 *     traceScore?: number
 *     flinchScore?: number
 *     followThroughScore?: number
 *     consistencyScore?: number
 *     recommendation?: string
 *     timestamp?: number
 *   }
 *   flinchDirection?: string
 *   flinchSeverity?: string
 *   followThroughState?: string
 *   holdQuality?: number
 *   tracePeak?: number
 *   traceAverage?: number
 * }} input
 * @returns {ShotRecord}
 */
export function addShot(session, input) {
  const perf = input.performance || {}
  const slot = session.shots[session.writeHead]

  session.totalAdded += 1

  slot.shotNumber = session.totalAdded
  slot.timestamp = Number(perf.timestamp) || performance.now()
  slot.overallScore = Number(perf.overallScore) || 0
  slot.grade = perf.grade || PerformanceGrade.F
  slot.holdScore = Number(perf.holdScore) || 0
  slot.traceScore = Number(perf.traceScore) || 0
  slot.flinchScore = Number(perf.flinchScore) || 0
  slot.followThroughScore = Number(perf.followThroughScore) || 0
  slot.consistencyScore = Number(perf.consistencyScore) || 0
  slot.recommendation = String(perf.recommendation || '')
  slot.flinchDirection = String(input.flinchDirection || '')
  slot.flinchSeverity = String(input.flinchSeverity || '')
  slot.followThroughState = String(input.followThroughState || '')
  slot.holdQuality = Number(input.holdQuality) || 0
  slot.tracePeak = Number(input.tracePeak) || 0
  slot.traceAverage = Number(input.traceAverage) || 0

  session.writeHead = (session.writeHead + 1) % SESSION_MAX_SHOTS
  if (session.shotCount < SESSION_MAX_SHOTS) {
    session.shotCount += 1
  }

  if (session.startedAt <= 0) {
    session.startedAt = slot.timestamp
  }

  if (slot.overallScore >= session.personalBest) {
    session.personalBest = slot.overallScore
    session.personalBestTimestamp = slot.timestamp
  }

  updateSession(session)
  return slot
}

/**
 * UI / dış okuma: kronolojik kopya (en eskiden yeniye), max `limit`.
 * Not: geçici dizi — motor içi halkaya yazmaz.
 * @param {Session} session
 * @param {number} [limit]
 * @returns {ShotRecord[]}
 */
export function listSessionShots(session, limit = SESSION_MAX_SHOTS) {
  const n = session.shotCount
  const take = limit < n ? limit : n
  /** @type {ShotRecord[]} */
  const out = []
  const start = n - take
  for (let i = 0; i < take; i++) {
    const r = recordAt(session, start + i)
    out.push({ ...r })
  }
  return out
}
