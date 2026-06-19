const { getAuth } = require('firebase-admin/auth')
const { HttpsError } = require('firebase-functions/v2/https')
const { getAdminEmailLower } = require('./adminAuth')

/**
 * Callable — oturum açmış admin hesabına custom claim yazar (client bundle'da e-posta gerekmez).
 * @param {import('firebase-functions/v2/https').CallableRequest} request
 */
async function ensureAdminClaimHandler(request) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Giriş gerekli.')
  }

  const email = String(request.auth.token.email ?? '')
    .trim()
    .toLowerCase()

  if (!email || email !== getAdminEmailLower()) {
    throw new HttpsError('permission-denied', 'Yalnızca sistem yöneticisi bu işlemi yapabilir.')
  }

  const auth = getAuth()
  const user = await auth.getUser(request.auth.uid)
  await auth.setCustomUserClaims(request.auth.uid, {
    ...(user.customClaims || {}),
    admin: true,
  })

  return { ok: true, admin: true }
}

module.exports = { ensureAdminClaimHandler }
