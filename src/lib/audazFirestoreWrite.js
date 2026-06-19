import { sanitizeForFirestore } from './firestoreSanitize'

/**
 * Tüm Audaz Firestore yazımları bu katmandan geçmeli (undefined → omit, nested temizlik).
 * @param {Record<string, unknown>} data
 * @returns {Record<string, unknown>}
 */
export function prepareAudazWritePayload(data) {
  const sanitized = sanitizeForFirestore(data)
  if (!sanitized || typeof sanitized !== 'object' || Array.isArray(sanitized)) {
    const err = new Error('Geçersiz Firestore yazım yükü')
    err.code = 'invalid-payload'
    throw err
  }
  return /** @type {Record<string, unknown>} */ (sanitized)
}

/**
 * @param {Record<string, unknown>} patch
 * @returns {Record<string, unknown>}
 */
export function prepareAudazPatchPayload(patch) {
  return prepareAudazWritePayload(patch)
}
