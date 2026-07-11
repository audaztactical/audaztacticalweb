import i18n from '../i18n'
import { BETA_MIN_PASSWORD_LENGTH } from './betaAuth'

/**
 * Firebase Auth (+ username) codes → auth.errors.* keys (Batch F storage pattern).
 * @type {Record<string, string>}
 */
const FIREBASE_AUTH_CODE_MAP = {
  'auth/email-already-in-use': 'emailInUse',
  'auth/weak-password': 'weakPassword',
  'auth/invalid-email': 'invalidEmail',
  'auth/invalid-credential': 'invalidCredential',
  'auth/user-not-found': 'userNotFound',
  'auth/wrong-password': 'wrongPassword',
  'auth/too-many-requests': 'tooManyRequests',
  'auth/network-request-failed': 'network',
  'auth/unauthorized-domain': 'unauthorizedDomain',
  'auth/operation-not-allowed': 'providerDisabled',
  'auth/popup-blocked': 'popupBlocked',
  'auth/popup-closed-by-user': 'popupCancelled',
  'auth/cancelled-popup-request': 'popupCancelled',
  'auth/redirect-cancelled-by-user': 'popupCancelled',
  'auth/redirect-operation-pending': 'redirectPending',
  'auth/web-storage-unsupported': 'storageUnsupported',
  'auth/operation-not-supported-in-this-environment': 'envUnsupported',
  'auth/account-exists-with-different-credential': 'accountExists',
  'auth/provider-already-linked': 'providerLinked',
  'auth/credential-already-in-use': 'credentialInUse',
  'auth/requires-recent-login': 'recentLogin',
  'username-already-in-use': 'usernameTaken',
  'username-invalid': 'usernameInvalid',
}

/**
 * @param {unknown} err
 * @returns {string}
 */
export function resolveAuthErrorKey(err) {
  const audaz =
    err && typeof err === 'object' && '__audazCode' in err
      ? String(/** @type {{ __audazCode?: string }} */ (err).__audazCode ?? '')
      : ''
  if (audaz && FIREBASE_AUTH_CODE_MAP[audaz]) return FIREBASE_AUTH_CODE_MAP[audaz]

  const code =
    err && typeof err === 'object' && 'code' in err
      ? String(/** @type {{ code?: string }} */ (err).code ?? '')
      : ''

  if (FIREBASE_AUTH_CODE_MAP[code]) return FIREBASE_AUTH_CODE_MAP[code]
  if (code.includes('permission')) return 'permissionDenied'
  return 'generic'
}

/**
 * @param {unknown} err
 * @param {{ emailOrUsername?: boolean, coded?: boolean } } [opts]
 * @returns {string}
 */
export function formatAuthErrorDisplay(err, opts = {}) {
  let key = resolveAuthErrorKey(err)

  if (opts.emailOrUsername && key === 'emailInUse') {
    key = 'emailOrUsernameInUse'
  }
  if (opts.coded) {
    if (key === 'invalidCredential') key = 'authFailCredential'
    else if (key === 'emailInUse') key = 'authFailEmailInUse'
    else if (key === 'invalidEmail') key = 'errInvalidEmail'
    else if (key === 'weakPassword') key = 'errWeakPassword'
    else if (key === 'usernameTaken') key = 'errUsernameTakenCoded'
    else if (key === 'usernameInvalid') key = 'errUsernameInvalidCoded'
  }

  return i18n.t(`errors.${key}`, {
    ns: 'auth',
    min: BETA_MIN_PASSWORD_LENGTH,
    defaultValue: i18n.t('errors.generic', { ns: 'auth' }),
  })
}

export { FIREBASE_AUTH_CODE_MAP }
