/** @typedef {'operator' | 'instructor' | 'admin' | 'command' | 'cmd' | string} AudazUserRole */

/**
 * @param {unknown} role
 */
export function normalizeUserRole(role) {
  return typeof role === 'string' ? role.trim().toLowerCase() : 'operator'
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
export function isOperatorRole(role) {
  const r = normalizeUserRole(role)
  return r === 'operator' || r === '' || r === 'operatör'
}
