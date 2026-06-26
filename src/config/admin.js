/**
 * Admin yetkilendirme — yalnızca Firebase custom claim (admin: true).
 * E-posta eşleşmesi istemci bundle'ında kullanılmaz (ensureAdminClaim sunucuda doğrular).
 */

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
  return userHasAdminClaim(user)
}

/**
 * Doktrin, eğitim videosu vb. — admin custom claim gerekli.
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
