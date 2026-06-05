import { getAdditionalUserInfo } from 'firebase/auth'
import { createGoogleOperatorProfile, fetchUserProfile } from './firestoreUsers'

const REDIRECT_PATH_KEY = 'audaz_google_auth_redirect'

/**
 * @param {string} path
 */
export function stashGoogleAuthRedirectPath(path) {
  const normalized = path?.startsWith('/') ? path : `/${path || 'dashboard'}`
  try {
    sessionStorage.setItem(REDIRECT_PATH_KEY, normalized)
  } catch {
    /* private mode / quota */
  }
}

/**
 * @returns {string}
 */
export function consumeGoogleAuthRedirectPath() {
  try {
    const path = sessionStorage.getItem(REDIRECT_PATH_KEY)
    sessionStorage.removeItem(REDIRECT_PATH_KEY)
    return path?.startsWith('/') ? path : '/dashboard'
  } catch {
    return '/dashboard'
  }
}

/**
 * @returns {boolean}
 */
export function hasPendingGoogleAuthRedirectPath() {
  try {
    return Boolean(sessionStorage.getItem(REDIRECT_PATH_KEY))
  } catch {
    return false
  }
}

export function clearGoogleAuthRedirectPath() {
  try {
    sessionStorage.removeItem(REDIRECT_PATH_KEY)
  } catch {
    /* ignore */
  }
}

/**
 * Google redirect / popup sonrası Firestore operatör profili.
 * @param {import('firebase/auth').UserCredential} result
 */
export async function ensureGoogleOperatorProfile(result) {
  const u = result.user
  const info = getAdditionalUserInfo(result)
  const isNew = info?.isNewUser === true

  let existing = null
  try {
    existing = await fetchUserProfile(u.uid)
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[AUDAZ HUD · GOOGLE_AUTH · ensureGoogleOperatorProfile.fetch]', err)
    }
    if (!isNew) return
  }

  if (existing) return
  await createGoogleOperatorProfile(u)
}
