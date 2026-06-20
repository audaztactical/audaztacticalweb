const STORAGE_KEY = 'audaz_pending_profile'
const MAX_AGE_MS = 30 * 60 * 1000

/**
 * @param {{
 *   email?: string
 *   username: string
 *   callsign?: string
 *   bloodType?: string
 *   status?: string
 *   role?: string
 *   accountStatus?: string
 * }} payload
 */
export function savePendingOperatorProfile(payload) {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...payload,
        savedAt: Date.now(),
      }),
    )
  } catch {
    /* ignore */
  }
}

export function clearPendingOperatorProfile() {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

/**
 * @returns {{
 *   email?: string
 *   username: string
 *   callsign?: string
 *   bloodType?: string
 *   status?: string
 *   role?: string
 *   accountStatus?: string
 * } | null}
 */
export function readPendingOperatorProfile() {
  if (typeof sessionStorage === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (!data || typeof data.username !== 'string' || !data.username.trim()) return null
    if (typeof data.savedAt === 'number' && Date.now() - data.savedAt > MAX_AGE_MS) {
      clearPendingOperatorProfile()
      return null
    }
    return data
  } catch {
    return null
  }
}
