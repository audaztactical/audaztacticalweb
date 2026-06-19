/** @typedef {'member' | 'instructor' | 'premium_member' | 'admin' | 'command' | 'cmd' | string} AudazUserRole */
/** @typedef {'active' | 'locked'} AudazAccountStatus */

/** @readonly */
export const AUDAZ_ROLES = /** @type {const} */ (['member', 'instructor', 'premium_member'])

/** @readonly */
export const AUDAZ_ACCOUNT_STATUSES = /** @type {const} */ (['active', 'locked'])

/** Eski kayıtlar — member ile eşdeğer */
const LEGACY_MEMBER_ROLES = new Set(['operator', 'operatör', ''])

/**
 * @param {unknown} role
 * @returns {string}
 */
export function normalizeUserRole(role) {
  const r = typeof role === 'string' ? role.trim().toLowerCase() : 'member'
  if (LEGACY_MEMBER_ROLES.has(r)) return 'member'
  if (r === 'premium' || r === 'premium_member') return 'premium_member'
  if (r === 'instructor') return 'instructor'
  return r || 'member'
}

/**
 * @param {unknown} status
 * @returns {AudazAccountStatus}
 */
export function normalizeAccountStatus(status) {
  const s = typeof status === 'string' ? status.trim().toLowerCase() : 'active'
  return s === 'locked' ? 'locked' : 'active'
}

/**
 * @param {unknown} role
 */
export function isInstructorRole(role) {
  return normalizeUserRole(role) === 'instructor'
}

/**
 * @param {unknown} role
 */
export function isMemberRole(role) {
  return normalizeUserRole(role) === 'member'
}

/**
 * @param {unknown} role
 */
export function isPremiumMemberRole(role) {
  return normalizeUserRole(role) === 'premium_member'
}

/**
 * Standart operatör erişimi (ücretsiz veya premium üye).
 * @param {unknown} role
 */
export function hasMemberAreaAccess(role) {
  const r = normalizeUserRole(role)
  return r === 'member' || r === 'premium_member'
}

/** @deprecated isOperatorRole — member alias */
export function isOperatorRole(role) {
  return hasMemberAreaAccess(role) || isMemberRole(role)
}

/**
 * @param {unknown} status
 */
export function isAccountLocked(status) {
  return normalizeAccountStatus(status) === 'locked'
}
