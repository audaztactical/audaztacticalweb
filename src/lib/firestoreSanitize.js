/**
 * Firestore undefined kabul etmez; null ve temel tipler kalır.
 * @param {unknown} value
 */
export function sanitizeForFirestore(value) {
  if (value === undefined) return undefined
  if (value === null) return null
  if (Array.isArray(value)) {
    return value.map((v) => sanitizeForFirestore(v)).filter((v) => v !== undefined)
  }
  if (typeof value === 'object' && value !== null) {
    /** @type {Record<string, unknown>} */
    const out = {}
    for (const [k, v] of Object.entries(value)) {
      const next = sanitizeForFirestore(v)
      if (next !== undefined) out[k] = next
    }
    return out
  }
  return value
}
