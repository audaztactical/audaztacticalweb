/**
 * Standart Atış oturum kayıtları — şema yardımcıları.
 * Kalıcı depolama: Firestore `users/{uid}/tacticalSessions` (bkz. firestoreTacticalSessions.js).
 * localStorage yalnızca tek seferlik migrasyon için okunur.
 */

import { buildSplitRows, computeShotSummary } from './standardShotTimer'

export const STANDARD_SHOT_SESSIONS_KEY = 'audaz.tactical-timer.standard-shot.sessions.v1'
export const STANDARD_SHOT_SESSIONS_MAX = 80

/**
 * @typedef {Object} StandardShotCalibrationSnapshot
 * @property {number} soundThreshold
 * @property {string} mpuGForceRange
 * @property {number} mpuOffsetX
 * @property {number} mpuOffsetY
 * @property {number} [neopixelBrightness]
 */

/**
 * @typedef {Object} MpuSamplePoint
 * @property {number} t
 * @property {number} x
 * @property {number} y
 * @property {number} magnitude
 */

/**
 * @typedef {Object} StandardShotSession
 * @property {string} id
 * @property {number} createdAt
 * @property {'standard-shot'} mode
 * @property {number[]} shotTimesMs
 * @property {ReturnType<typeof computeShotSummary>} summary
 * @property {StandardShotCalibrationSnapshot} calibration
 * @property {MpuSamplePoint[]} mpuSamples
 * @property {number} delayMs
 * @property {number} shotCount
 * @property {{ callsign?: string, username?: string }} operator
 */

/**
 * @returns {StandardShotSession[]}
 */
export function loadStandardShotSessions() {
  try {
    if (typeof localStorage === 'undefined') return []
    const raw = localStorage.getItem(STANDARD_SHOT_SESSIONS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .map(normalizeSession)
      .filter(Boolean)
      .sort((a, b) => b.createdAt - a.createdAt)
  } catch {
    return []
  }
}

/**
 * @param {StandardShotSession[]} sessions
 */
function persistSessions(sessions) {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(
      STANDARD_SHOT_SESSIONS_KEY,
      JSON.stringify(sessions.slice(0, STANDARD_SHOT_SESSIONS_MAX)),
    )
  } catch {
    /* quota */
  }
}

/**
 * @param {unknown} raw
 * @returns {number}
 */
function coerceMillis(raw) {
  if (raw && typeof raw === 'object' && typeof /** @type {{ toMillis?: () => number }} */ (raw).toMillis === 'function') {
    return /** @type {{ toMillis: () => number }} */ (raw).toMillis()
  }
  const n = Number(raw)
  return Number.isFinite(n) ? n : Date.now()
}

/**
 * @param {unknown} raw
 * @returns {StandardShotSession | null}
 */
export function normalizeSession(raw) {
  if (!raw || typeof raw !== 'object') return null
  const s = /** @type {Record<string, unknown>} */ (raw)
  if (s.mode === 'dry-fire') return null
  const id = typeof s.id === 'string' ? s.id : ''
  const shotTimesMs = Array.isArray(s.shotTimesMs)
    ? s.shotTimesMs.map((n) => Number(n)).filter((n) => Number.isFinite(n) && n >= 0)
    : []
  if (!id || shotTimesMs.length === 0) return null
  const createdAt = coerceMillis(s.createdAt)
  const cal =
    s.calibration && typeof s.calibration === 'object'
      ? /** @type {Record<string, unknown>} */ (s.calibration)
      : {}
  const op =
    s.operator && typeof s.operator === 'object'
      ? /** @type {Record<string, unknown>} */ (s.operator)
      : {}

  return {
    id,
    createdAt,
    mode: 'standard-shot',
    shotTimesMs,
    summary: computeShotSummary(shotTimesMs),
    calibration: {
      soundThreshold: Number(cal.soundThreshold) || 0,
      mpuGForceRange: typeof cal.mpuGForceRange === 'string' ? cal.mpuGForceRange : '±8G',
      mpuOffsetX: Number(cal.mpuOffsetX) || 0,
      mpuOffsetY: Number(cal.mpuOffsetY) || 0,
      neopixelBrightness: Number(cal.neopixelBrightness) || 0,
    },
    mpuSamples: Array.isArray(s.mpuSamples)
      ? /** @type {MpuSamplePoint[]} */ (
          s.mpuSamples
            .map((p) => {
              if (!p || typeof p !== 'object') return null
              const o = /** @type {Record<string, unknown>} */ (p)
              const t = Number(o.t)
              const x = Number(o.x)
              const y = Number(o.y)
              if (![t, x, y].every(Number.isFinite)) return null
              return {
                t,
                x,
                y,
                magnitude: Number.isFinite(Number(o.magnitude))
                  ? Number(o.magnitude)
                  : Math.hypot(x, y),
              }
            })
            .filter(Boolean)
        )
      : [],
    delayMs: Number(s.delayMs) || 0,
    shotCount: shotTimesMs.length,
    operator: {
      callsign: typeof op.callsign === 'string' ? op.callsign : '',
      username: typeof op.username === 'string' ? op.username : '',
    },
  }
}

/**
 * Deterministik namlu sapma örnekleri (MPU simülasyonu) — oturum id + offset ile.
 * @param {string} seed
 * @param {number} shotCount
 * @param {{ mpuOffsetX?: number, mpuOffsetY?: number, mpuGForceRange?: string }} cal
 * @returns {MpuSamplePoint[]}
 */
export function synthesizeMpuSamples(seed, shotCount, cal = {}) {
  const n = Math.max(6, Math.min(48, shotCount * 4 + 8))
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  const rand = () => {
    h ^= h << 13
    h ^= h >>> 17
    h ^= h << 5
    return (h >>> 0) / 4294967295
  }
  const scale =
    String(cal.mpuGForceRange ?? '').includes('16')
      ? 1.35
      : String(cal.mpuGForceRange ?? '').includes('2')
        ? 0.55
        : 0.9
  const ox = Number(cal.mpuOffsetX) || 0
  const oy = Number(cal.mpuOffsetY) || 0
  /** @type {MpuSamplePoint[]} */
  const out = []
  for (let i = 0; i < n; i++) {
    const t = i
    const x = (rand() - 0.5) * scale + ox * 0.35 + Math.sin(i * 0.7) * 0.08
    const y = (rand() - 0.5) * scale + oy * 0.35 + Math.cos(i * 0.55) * 0.08
    out.push({ t, x, y, magnitude: Math.hypot(x, y) })
  }
  return out
}

/**
 * @param {{
 *   shotTimesMs: number[]
 *   calibration: StandardShotCalibrationSnapshot
 *   delayMs?: number
 *   operator?: { callsign?: string, username?: string }
 * }} input
 * @returns {StandardShotSession}
 */
export function createStandardShotSession(input) {
  const shotTimesMs = [...input.shotTimesMs].filter((n) => Number.isFinite(n) && n >= 0)
  const id =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `ss-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  const createdAt = Date.now()
  return {
    id,
    createdAt,
    mode: 'standard-shot',
    shotTimesMs,
    summary: computeShotSummary(shotTimesMs),
    calibration: { ...input.calibration },
    mpuSamples: synthesizeMpuSamples(id, shotTimesMs.length, input.calibration),
    delayMs: Number(input.delayMs) || 0,
    shotCount: shotTimesMs.length,
    operator: {
      callsign: input.operator?.callsign ?? '',
      username: input.operator?.username ?? '',
    },
  }
}

/**
 * @param {StandardShotSession} session
 * @returns {StandardShotSession[]}
 */
export function saveStandardShotSession(session) {
  const normalized = normalizeSession(session)
  if (!normalized) return loadStandardShotSessions()
  const next = [normalized, ...loadStandardShotSessions().filter((s) => s.id !== normalized.id)]
  persistSessions(next)
  return next
}

/**
 * @param {string} id
 * @returns {StandardShotSession[]}
 */
export function deleteStandardShotSession(id) {
  const next = loadStandardShotSessions().filter((s) => s.id !== id)
  persistSessions(next)
  return next
}

/**
 * Chart: split trend — reaction + splits.
 * @param {number[]} shotTimesMs
 * @param {number[] | null} [selectedShotIndices] — 1-based shot indices to include (absolute shots)
 */
export function buildSplitTrendSeries(shotTimesMs, selectedShotIndices = null) {
  /** @type {{ name: string, shot: number, ms: number, sec: number }[]} */
  const points = []
  if (!shotTimesMs.length) return points

  const include = (shotNum) =>
    !selectedShotIndices || selectedShotIndices.length === 0
      ? true
      : selectedShotIndices.includes(shotNum)

  if (include(1)) {
    points.push({
      name: 'R',
      shot: 1,
      ms: shotTimesMs[0],
      sec: shotTimesMs[0] / 1000,
    })
  }
  const splits = buildSplitRows(shotTimesMs)
  for (const row of splits) {
    const shotNum = row.index + 1
    if (!include(shotNum)) continue
    points.push({
      name: `S${row.index}`,
      shot: shotNum,
      ms: row.splitMs,
      sec: row.splitMs / 1000,
    })
  }
  return points
}

/**
 * @param {MpuSamplePoint[]} samples
 */
export function buildMpuScatterSeries(samples) {
  return (samples ?? []).map((p, i) => ({
    i,
    x: Math.round(p.x * 1000) / 1000,
    y: Math.round(p.y * 1000) / 1000,
    magnitude: Math.round(p.magnitude * 1000) / 1000,
  }))
}

/**
 * @param {StandardShotSession[]} sessions
 */
export function buildCompareSeries(sessions) {
  const maxLen = Math.max(0, ...sessions.map((s) => s.shotTimesMs.length))
  /** @type {Record<string, string | number>[]} */
  const rows = []
  for (let i = 0; i < maxLen; i++) {
    /** @type {Record<string, string | number>} */
    const row = { index: i + 1, name: i === 0 ? 'R' : `S${i}` }
    sessions.forEach((s, si) => {
      const key = `s${si}`
      if (i === 0) {
        row[key] = s.shotTimesMs[0] != null ? s.shotTimesMs[0] / 1000 : null
      } else if (s.shotTimesMs[i] != null && s.shotTimesMs[i - 1] != null) {
        row[key] = (s.shotTimesMs[i] - s.shotTimesMs[i - 1]) / 1000
      } else {
        row[key] = null
      }
    })
    rows.push(row)
  }
  return rows
}
