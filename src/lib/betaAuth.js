import { getPlatformLaunchMs } from './registrationPolicy'
import { normalizeUsername } from './firestoreUsers'

/** Beta kayıtlarında Firebase Auth e-posta alan adı */
export const BETA_AUTH_EMAIL_DOMAIN =
  import.meta.env.VITE_BETA_AUTH_EMAIL_DOMAIN || 'beta.audaztactical.local'

const BETA_AUTH_SALT = import.meta.env.VITE_BETA_AUTH_SALT || 'audaz-beta-2026'

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

/**
 * Beta oturumu için deterministik şifre (min. 6 karakter — Firebase kuralı).
 * @param {string} rawUsername
 */
export function betaPasswordFromUsername(rawUsername) {
  const key = normalizeUsername(rawUsername)
  if (!key) return ''
  return `${key}.${BETA_AUTH_SALT}.beta`
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
