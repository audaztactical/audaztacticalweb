import { Timestamp } from 'firebase/firestore'
import { timestampToMs } from './firestoreSnapshot'

/**
 * @param {unknown} raw
 * @returns {string[]}
 */
export function normalizeAllowedGroups(raw) {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((g) => typeof g === 'string' && g.trim())
    .map((g) => g.trim())
}

/**
 * @param {{ groupId?: string, allowedGroups?: string[] }} training
 * @param {string | null | undefined} userGroupId
 */
export function isGroupAllowedForTraining(training, userGroupId) {
  const gid = String(userGroupId ?? '').trim()
  if (!gid) return false

  const allowed = normalizeAllowedGroups(training.allowedGroups)
  if (allowed.length > 0) return allowed.includes(gid)

  return String(training.groupId ?? '').trim() === gid
}

/**
 * @param {{ expiresAt?: unknown }} training
 * @param {number} [nowMs]
 */
export function isTrainingSessionExpired(training, nowMs = Date.now()) {
  const expiresMs = timestampToMs(training.expiresAt)
  if (!expiresMs) return false
  return expiresMs < nowMs
}

/**
 * Operatör arayüzünde görünür oturumlar (grup + süre).
 * @param {Array<{ groupId?: string, allowedGroups?: string[], expiresAt?: unknown, status?: string }>} trainings
 * @param {string | null | undefined} userGroupId
 * @param {{ includeExpired?: boolean, includeCompleted?: boolean }} [opts]
 */
export function filterOperatorVisibleTrainings(trainings, userGroupId, opts = {}) {
  const { includeExpired = false, includeCompleted = true } = opts

  return trainings.filter((training) => {
    if (!isGroupAllowedForTraining(training, userGroupId)) return false
    if (!includeExpired && isTrainingSessionExpired(training)) return false
    if (!includeCompleted && training.status === 'completed') return false
    return true
  })
}

/**
 * @param {number} hours
 * @param {number} minutes
 * @returns {number}
 */
export function sessionDurationToMs(hours, minutes) {
  const h = Math.max(0, Math.min(168, Number(hours) || 0))
  const m = Math.max(0, Math.min(59, Number(minutes) || 0))
  return (h * 60 + m) * 60 * 1000
}

/**
 * Oturum bitiş zamanını hesaplar (süre veya sabit tarih).
 * @param {{
 *   sessionDurationHours?: number
 *   sessionDurationMinutes?: number
 *   expiryDate?: string | Date | null
 * }} input
 * @returns {Timestamp}
 */
export function resolveSessionExpiresAt(input) {
  const expiryRaw = input.expiryDate
  if (expiryRaw != null && String(expiryRaw).trim() !== '') {
    const date = expiryRaw instanceof Date ? expiryRaw : new Date(String(expiryRaw))
    const ms = date.getTime()
    if (!Number.isFinite(ms) || ms <= Date.now()) {
      const e = new Error('Son giriş tarihi gelecekte olmalı.')
      e.code = 'failed-precondition'
      throw e
    }
    return Timestamp.fromMillis(ms)
  }

  const durationMs = sessionDurationToMs(
    input.sessionDurationHours ?? 0,
    input.sessionDurationMinutes ?? 0,
  )
  if (durationMs < 1) {
    const e = new Error('Oturum süresi en az 1 dakika olmalı.')
    e.code = 'failed-precondition'
    throw e
  }
  return Timestamp.fromMillis(Date.now() + durationMs)
}

/** Firestore sorguları için: yalnızca süresi geçmemiş kayıtlar. */
export function activeExpiresAtThreshold() {
  return Timestamp.now()
}

/**
 * Operatör erişimi: grup + süre (+ isteğe bağlı aktif durum).
 * @param {Parameters<typeof isGroupAllowedForTraining>[0]} training
 * @param {string | null | undefined} userGroupId
 * @param {{ requireActive?: boolean }} [opts]
 */
export function isOperatorSessionAccessible(training, userGroupId, opts = {}) {
  const { requireActive = false } = opts
  if (!isGroupAllowedForTraining(training, userGroupId)) return false
  if (isTrainingSessionExpired(training)) return false
  if (requireActive && training.status !== 'active') return false
  return true
}
