/**
 * Admin yetkilendirme — Firebase custom claim (admin: true) veya Firestore role === 'admin'.
 * E-posta eşleşmesi istemci bundle'ında kullanılmaz (ensureAdminClaim sunucuda doğrular).
 */

import { normalizeUserRole } from '../lib/authRoles'

/**
 * @param {{ role?: string, userRole?: string } | null | undefined} userData
 */
export function userDataHasAdminRole(userData) {
  if (!userData) return false
  const role = userData.role ?? userData.userRole
  return normalizeUserRole(role) === 'admin'
}

/**
 * @param {import('firebase/auth').User | null | undefined} user
 * @returns {Promise<boolean>}
 */
export async function userHasAdminClaim(user) {
  if (!user) return false
  try {
    const result = await user.getIdTokenResult()
    return result.claims.admin === true
  } catch {
    return false
  }
}

/**
 * @param {import('firebase/auth').User | null | undefined} user
 * @param {{ role?: string, userRole?: string } | null | undefined} [userData]
 * @returns {Promise<boolean>}
 */
export async function resolveUserIsAdmin(user, userData) {
  if (!user) return false
  if (userDataHasAdminRole(userData)) return true
  return userHasAdminClaim(user)
}

/**
 * Doktrin, eğitim videosu vb. — admin claim veya Firestore admin rolü.
 * @param {import('firebase/auth').User | null | undefined} user
 * @param {{ role?: string, userRole?: string } | null | undefined} [userData]
 */
export async function assertCanManageAdminContent(user, userData) {
  if (!(await resolveUserIsAdmin(user, userData))) {
    const e = new Error('Bu işlem yalnızca sistem yöneticisi içindir.')
    e.code = 'permission-denied'
    e.__audazCode = 'ERR_ADMIN_CONTENT_REQUIRED'
    throw e
  }
}
