import { getPlatformLaunchMs } from './registrationPolicy'
import { normalizeUsername } from './firestoreUsers'

/** Beta kayıtlarında Firebase Auth e-posta alan adı */
export const BETA_AUTH_EMAIL_DOMAIN =
  import.meta.env.VITE_BETA_AUTH_EMAIL_DOMAIN || 'beta.audaztactical.local'

/** Lansman tarihine kadar beta test dönemi */
export function isPlatformInBetaPeriod() {
  const launch = getPlatformLaunchMs()
  if (!Number.isFinite(launch)) return true
  return Date.now() < launch
}

/**
 * @param {string} email
 */
export function isBetaAuthEmail(email) {
  const domain = BETA_AUTH_EMAIL_DOMAIN.toLowerCase()
  return String(email ?? '')
    .trim()
    .toLowerCase()
    .endsWith(`@${domain}`)
}

/**
 * @param {string} rawUsername
 */
export function betaEmailFromUsername(rawUsername) {
  const key = normalizeUsername(rawUsername)
  if (!key) return ''
  return `${key}@${BETA_AUTH_EMAIL_DOMAIN}`
}

/** Firebase Auth minimum şifre uzunluğu */
export const BETA_MIN_PASSWORD_LENGTH = 6

/**
 * @param {string} password
 * @returns {{ ok: boolean, message?: string }}
 */
export function validateBetaPassword(password) {
  const value = String(password ?? '')
  if (value.length < BETA_MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      minLength: BETA_MIN_PASSWORD_LENGTH,
      message: `Şifre en az ${BETA_MIN_PASSWORD_LENGTH} karakter olmalı.`,
    }
  }
  return { ok: true }
}

/**
 * Giriş alanı kullanıcı adı veya e-posta olabilir.
 * @param {string} input
 */
export function resolveAuthEmailInput(input) {
  const trimmed = String(input ?? '').trim()
  if (!trimmed) return ''
  if (trimmed.includes('@')) return trimmed
  return betaEmailFromUsername(trimmed)
}
