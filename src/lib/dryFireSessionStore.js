/**
 * Kuru Tetik seans şeması.
 * Kalıcı depolama: Firestore `users/{uid}/tacticalSessions` (mode: dry-fire).
 */

import { computeShotSummary } from './standardShotTimer'
import { summarizeDryFireHits } from './dryFireHits'

export const DRY_FIRE_SESSIONS_KEY = 'audaz.tactical-timer.dry-fire.sessions.v1'
export const DRY_FIRE_SESSIONS_MAX = 80

/**
 * @typedef {Object} DryFireHitSnapshot
 * @property {string} id
 * @property {number} index
 * @property {number} x
 * @property {number} y
 * @property {number} flinchScore
 * @property {number} triggerPressMs
 * @property {number} [reactionMs]
 * @property {number} [distanceM]
 */

/**
 * @typedef {Object} DryFireSession
 * @property {string} id
 * @property {number} createdAt
 * @property {'dry-fire'} mode
 * @property {number[]} shotTimesMs — go sonrası mutlak süreler (kurallar / reaksiyon)
 * @property {number[]} reactionTimesMs
 * @property {DryFireHitSnapshot[]} hits
 * @property {ReturnType<typeof computeShotSummary>} timingSummary
 * @property {ReturnType<typeof summarizeDryFireHits>} hitSummary
 * @property {number} delayMs
 * @property {number | null} parTimeMs
 * @property {'random' | 'fixed' | 'none'} delayMode
 * @property {number} distanceM
 * @property {number} shotCount
 * @property {{ callsign?: string, username?: string }} operator
 */

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
 * @returns {DryFireHitSnapshot | null}
 */
function normalizeHit(raw) {
  if (!raw || typeof raw !== 'object') return null
  const h = /** @type {Record<string, unknown>} */ (raw)
  const id = typeof h.id === 'string' ? h.id : ''
  const index = Number(h.index)
  const x = Number(h.x)
  const y = Number(h.y)
  if (!id || !Number.isFinite(index) || !Number.isFinite(x) || !Number.isFinite(y)) return null
  return {
    id,
    index,
    x,
    y,
    flinchScore: Math.round(Number(h.flinchScore) || 0),
    triggerPressMs: Math.round(Number(h.triggerPressMs) || 0),
    reactionMs: Number.isFinite(Number(h.reactionMs)) ? Math.round(Number(h.reactionMs)) : undefined,
    distanceM: Number.isFinite(Number(h.distanceM)) ? Number(h.distanceM) : undefined,
  }
}

/**
 * @param {unknown} raw
 * @returns {DryFireSession | null}
 */
export function normalizeDryFireSession(raw) {
  if (!raw || typeof raw !== 'object') return null
  const s = /** @type {Record<string, unknown>} */ (raw)
  // Standart Atış kayıtlarını ayır; yerel/eski kayıtlar hits ile de kabul edilir
  if (s.mode === 'standard-shot') return null
  if (s.mode != null && s.mode !== 'dry-fire') return null
  if (s.mode !== 'dry-fire' && !Array.isArray(s.hits)) return null

  const id = typeof s.id === 'string' ? s.id : ''
  const hits = Array.isArray(s.hits)
    ? s.hits.map(normalizeHit).filter(Boolean)
    : []
  const reactionTimesMs = Array.isArray(s.reactionTimesMs)
    ? s.reactionTimesMs.map((n) => Number(n)).filter((n) => Number.isFinite(n) && n >= 0)
    : []

  const shotTimesMs =
    reactionTimesMs.length > 0
      ? reactionTimesMs
      : Array.isArray(s.shotTimesMs)
        ? s.shotTimesMs.map((n) => Number(n)).filter((n) => Number.isFinite(n) && n >= 0)
        : []

  if (!id || hits.length === 0) return null

  const op =
    s.operator && typeof s.operator === 'object'
      ? /** @type {Record<string, unknown>} */ (s.operator)
      : {}

  const delayModeRaw = s.delayMode
  /** @type {DryFireSession['delayMode']} */
  const delayMode =
    delayModeRaw === 'fixed' || delayModeRaw === 'none' || delayModeRaw === 'random'
      ? delayModeRaw
      : 'random'

  const hitSummary =
    s.hitSummary && typeof s.hitSummary === 'object'
      ? /** @type {ReturnType<typeof summarizeDryFireHits>} */ (s.hitSummary)
      : summarizeDryFireHits(/** @type {import('./dryFireHits').DryFireHit[]} */ (hits))

  return {
    id,
    createdAt: coerceMillis(s.createdAt),
    mode: 'dry-fire',
    shotTimesMs,
    reactionTimesMs: shotTimesMs,
    hits: /** @type {DryFireHitSnapshot[]} */ (hits),
    timingSummary: computeShotSummary(shotTimesMs),
    hitSummary,
    delayMs: Math.max(0, Math.round(Number(s.delayMs) || 0)),
    parTimeMs:
      s.parTimeMs == null || s.parTimeMs === ''
        ? null
        : Math.max(0, Math.round(Number(s.parTimeMs) || 0)) || null,
    delayMode,
    distanceM: Number.isFinite(Number(s.distanceM)) ? Number(s.distanceM) : 7,
    shotCount: hits.length || shotTimesMs.length,
    operator: {
      callsign: typeof op.callsign === 'string' ? op.callsign : '',
      username: typeof op.username === 'string' ? op.username : '',
    },
  }
}

/**
 * @param {{
 *   hits: import('./dryFireHits').DryFireHit[]
 *   reactionTimesMs?: number[]
 *   delayMs?: number
 *   parTimeMs?: number | null
 *   delayMode?: DryFireSession['delayMode']
 *   distanceM?: number
 *   operator?: { callsign?: string, username?: string }
 * }} input
 * @returns {DryFireSession}
 */
export function createDryFireSession(input) {
  const hits = (input.hits || []).map((h) => ({
    id: h.id,
    index: h.index,
    x: h.x,
    y: h.y,
    flinchScore: h.flinchScore,
    triggerPressMs: h.triggerPressMs,
    reactionMs: h.reactionMs,
    distanceM: h.distanceM,
  }))
  const reactionTimesMs =
    Array.isArray(input.reactionTimesMs) && input.reactionTimesMs.length > 0
      ? input.reactionTimesMs.map((n) => Math.max(0, Math.round(Number(n) || 0)))
      : hits
          .map((h) => h.reactionMs)
          .filter((n) => n != null && Number.isFinite(n))
          .map((n) => Math.round(/** @type {number} */ (n)))

  const id =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `df-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

  return {
    id,
    createdAt: Date.now(),
    mode: 'dry-fire',
    shotTimesMs: reactionTimesMs,
    reactionTimesMs,
    hits,
    timingSummary: computeShotSummary(reactionTimesMs),
    hitSummary: summarizeDryFireHits(input.hits || []),
    delayMs: Math.max(0, Math.round(Number(input.delayMs) || 0)),
    parTimeMs:
      input.parTimeMs == null || input.parTimeMs === 0
        ? null
        : Math.max(0, Math.round(Number(input.parTimeMs) || 0)) || null,
    delayMode: input.delayMode || 'random',
    distanceM: Number(input.distanceM) || 7,
    shotCount: hits.length,
    operator: {
      callsign: input.operator?.callsign || '',
      username: input.operator?.username || '',
    },
  }
}

/**
 * @returns {DryFireSession[]}
 */
export function loadLocalDryFireSessions() {
  try {
    if (typeof localStorage === 'undefined') return []
    const raw = localStorage.getItem(DRY_FIRE_SESSIONS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .map(normalizeDryFireSession)
      .filter(Boolean)
      .sort((a, b) => b.createdAt - a.createdAt)
  } catch {
    return []
  }
}

/**
 * @param {DryFireSession[]} sessions
 */
export function persistLocalDryFireSessions(sessions) {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(
      DRY_FIRE_SESSIONS_KEY,
      JSON.stringify(sessions.slice(0, DRY_FIRE_SESSIONS_MAX)),
    )
  } catch {
    /* quota */
  }
}
