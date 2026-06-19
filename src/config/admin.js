/**
 * Admin yetkilendirme — VITE_ADMIN_EMAIL + Firebase custom claim (admin: true).
 * Firestore kuralları aynı e-postayı isContentAdmin() ile tanır (deploy: inject-firestore-admin).
 */

/**
 * @returns {string}
 */
export function getConfiguredAdminEmailLower() {
  return String(import.meta.env.VITE_ADMIN_EMAIL ?? '')
    .trim()
    .toLowerCase()
}

/**
 * @param {string | null | undefined} email
 */
export function emailMatchesConfiguredAdmin(email) {
  const configured = getConfiguredAdminEmailLower()
  if (!configured || !email) return false
  return String(email).trim().toLowerCase() === configured
}

/**
 * @param {import('firebase/auth').User | null | undefined} user
 */
export function userEmailMatchesConfiguredAdmin(user) {
  return emailMatchesConfiguredAdmin(user?.email)
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
 * @returns {Promise<boolean>}
 */
export async function resolveUserIsAdmin(user) {
  if (!user) return false
  if (userEmailMatchesConfiguredAdmin(user)) return true
  return userHasAdminClaim(user)
}

/**
 * Doktrin, eğitim videosu vb. — yapılandırılmış admin e-postası veya admin claim.
 * @param {import('firebase/auth').User | null | undefined} user
 */
export async function assertCanManageAdminContent(user) {
  if (!(await resolveUserIsAdmin(user))) {
    const e = new Error('Bu işlem yalnızca sistem yöneticisi içindir.')
    e.code = 'permission-denied'
    e.__audazCode = 'ERR_ADMIN_CONTENT_REQUIRED'
    throw e
  }
}
