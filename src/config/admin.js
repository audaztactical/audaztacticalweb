/**
 * Ana anahtar: .env.local içinde VITE_ADMIN_EMAIL
 * Firestore admin kuralları deploy sırasında aynı değerle eşlenir (inject-firestore-admin.mjs).
 */
export function getAdminEmail() {
  const raw = import.meta.env.VITE_ADMIN_EMAIL || 'senin_email@adresin.com'
  return String(raw).trim().toLowerCase()
}

export function isAdminUser(user) {
  if (!user?.email) return false
  return user.email.trim().toLowerCase() === getAdminEmail()
}

/**
 * Doktrin, eğitim videosu vb. yalnızca VITE_ADMIN_EMAIL hesabına bağlı yazımlar.
 * @param {import('firebase/auth').User | null} user
 */
export function assertCanManageAdminContent(user) {
  if (!isAdminUser(user)) {
    const e = new Error('Bu işlem yalnızca sistem yöneticisi içindir.')
    e.code = 'permission-denied'
    e.__audazCode = 'ERR_ADMIN_CONTENT_REQUIRED'
    throw e
  }
}
