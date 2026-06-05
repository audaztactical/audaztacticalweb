/**
 * Firebase / Firestore hata kodlarını operatör arayüzünde gösterilecek sabit kodlara çevirir.
 */

const MAP = {
  'permission-denied': '[ ERR_FIRESTORE_DENIED ]',
  'unauthenticated': '[ ERR_AUTH_REQUIRED ]',
  'auth/invalid-credential': '[ ERR_AUTH_CREDENTIALS ]',
  'auth/user-not-found': '[ ERR_AUTH_USER_MISSING ]',
  'auth/wrong-password': '[ ERR_AUTH_CREDENTIALS ]',
  'auth/invalid-email': '[ ERR_AUTH_EMAIL_INVALID ]',
  'auth/email-already-in-use': '[ ERR_AUTH_EMAIL_IN_USE ]',
  'auth/weak-password': '[ ERR_AUTH_WEAK_PASSWORD ]',
  'auth/too-many-requests': '[ ERR_AUTH_RATE_LIMIT ]',
  'auth/network-request-failed': '[ ERR_AUTH_NETWORK ]',
  'auth/unauthorized-domain': '[ ERR_AUTH_UNAUTHORIZED_DOMAIN ]',
  'auth/operation-not-allowed': '[ ERR_AUTH_PROVIDER_DISABLED ]',
  'auth/popup-blocked': '[ ERR_AUTH_POPUP_BLOCKED ]',
  'auth/popup-closed-by-user': '[ ERR_GOOGLE_AUTH_CANCELLED ]',
  'auth/cancelled-popup-request': '[ ERR_GOOGLE_AUTH_CANCELLED ]',
  'auth/redirect-cancelled-by-user': '[ ERR_GOOGLE_AUTH_CANCELLED ]',
  'auth/redirect-operation-pending': '[ ERR_AUTH_REDIRECT_PENDING ]',
  'auth/web-storage-unsupported': '[ ERR_AUTH_STORAGE ]',
  'auth/operation-not-supported-in-this-environment': '[ ERR_AUTH_ENV_UNSUPPORTED ]',
  'auth/account-exists-with-different-credential': '[ ERR_AUTH_ACCOUNT_EXISTS ]',
  'auth/provider-already-linked': '[ ERR_AUTH_PROVIDER_LINKED ]',
  'auth/credential-already-in-use': '[ ERR_AUTH_CREDENTIAL_IN_USE ]',
  'auth/requires-recent-login': '[ ERR_AUTH_RECENT_LOGIN ]',
  'username-already-in-use': '[ ERR_USERNAME_TAKEN ]',
  'username-invalid': '[ ERR_USERNAME_INVALID ]',
  'failed-precondition': '[ ERR_FIRESTORE_PRECONDITION ]',
  'not-found': '[ ERR_FIRESTORE_NOT_FOUND ]',
  'already-exists': '[ ERR_FIRESTORE_EXISTS ]',
  'resource-exhausted': '[ ERR_FIRESTORE_QUOTA ]',
  'unavailable': '[ ERR_FIRESTORE_UNAVAILABLE ]',
  'deadline-exceeded': '[ ERR_FIRESTORE_TIMEOUT ]',
  'cancelled': '[ ERR_FIRESTORE_CANCELLED ]',
}

/**
 * @param {unknown} error
 * @returns {{ code: string, technical: string, message: string }}
 */
export function mapFirebaseError(error) {
  const audaz = error && typeof error === 'object' && '__audazCode' in error ? String(error.__audazCode) : null
  if (audaz) {
    return {
      code: audaz.startsWith('[') ? audaz : `[ ${audaz} ]`,
      technical: audaz.startsWith('[') ? audaz : `[ ${audaz} ]`,
      message: typeof error?.message === 'string' ? error.message : '',
    }
  }

  const rawCode = typeof error?.code === 'string' ? error.code : ''
  const technical = MAP[rawCode] || '[ ERR_FIREBASE_UNKNOWN ]'
  const message = typeof error?.message === 'string' ? error.message : String(error ?? '')

  return { code: rawCode || 'unknown', technical, message }
}
