/**
 * Group / group-training lib errors — stable `__audazCode` for i18n display.
 * `Error.message` is the code (not a localized string).
 */

/** @type {ReadonlySet<string>} */
export const GROUP_ERROR_CODES = new Set([
  'FIREBASE_NOT_CONFIGURED',
  'INSTRUCTOR_SESSION_REQUIRED',
  'GROUP_NAME_REQUIRED',
  'GROUP_PASSWORD_TOO_SHORT',
  'SESSION_REQUIRED',
  'GROUP_NOT_FOUND',
  'GROUP_ID_REQUIRED',
  'GROUP_AND_INSTRUCTOR_REQUIRED',
  'DRILL_NAME_REQUIRED',
  'PASS_HITS_EXCEED_AMMO',
  'PASS_HITS_MIN',
  'GROUP_OPERATOR_TEMPLATE_REQUIRED',
  'HITS_MAX',
  'GROUP_OPERATOR_DRILL_REQUIRED',
  'TIMED_DURATION_REQUIRED',
  'GROUP_OPERATOR_REQUIRED',
  'TIMED_CQB_DURATION_REQUIRED',
  'GROUP_OPERATOR_INSTRUCTOR_REQUIRED',
  'GROUP_INSTRUCTOR_NAME_REQUIRED',
  'TRAINING_OPERATOR_REQUIRED',
  'SESSION_NOT_ACTIVE',
  'SESSION_EXPIRED',
  'TIMED_TIME_REQUIRED',
])

/**
 * @param {string} audazCode
 * @param {string} [firebaseCode]
 * @param {Record<string, unknown>} [params]
 * @returns {never}
 */
export function throwGroupError(audazCode, firebaseCode = 'failed-precondition', params) {
  const e = new Error(audazCode)
  e.code = firebaseCode
  e.__audazCode = audazCode
  if (params && typeof params === 'object') {
    e.__audazParams = params
  }
  throw e
}
