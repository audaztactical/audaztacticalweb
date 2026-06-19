/**
 * Callable admin gate — mirrors client VITE_ADMIN_EMAIL / Firestore isContentAdmin().
 * Set ADMIN_EMAIL in Firebase Functions environment (same value as .env.local).
 */
function getAdminEmailLower() {
  const raw =
    process.env.ADMIN_EMAIL ||
    process.env.VITE_ADMIN_EMAIL ||
    'senin_email@adresin.com'
  return String(raw).trim().toLowerCase()
}

/**
 * @param {import('firebase-functions/v2/https').CallableRequest} request
 */
function assertContentAdmin(request) {
  const { HttpsError } = require('firebase-functions/v2/https')

  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Bu işlem için giriş gerekli.')
  }

  const token = request.auth.token
  if (token.admin === true) {
    return
  }

  const email = String(token.email ?? '')
    .trim()
    .toLowerCase()

  if (email && email === getAdminEmailLower()) {
    return
  }

  throw new HttpsError('permission-denied', 'Yalnızca sistem yöneticisi bu işlemi yapabilir.')
}

module.exports = {
  getAdminEmailLower,
  assertContentAdmin,
}
