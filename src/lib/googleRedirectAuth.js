import { getRedirectResult, signInWithPopup, signInWithRedirect, GoogleAuthProvider } from 'firebase/auth'
import {
  clearGoogleAuthRedirectPath,
  ensureGoogleOperatorProfile,
  stashGoogleAuthRedirectPath,
} from './googleAuth'

/** @type {Promise<import('firebase/auth').UserCredential | null> | null} */
let redirectResultPromise = null

/** Yeni redirect denemesi öncesi önbelleği temizler. */
export function resetGoogleRedirectResultCache() {
  redirectResultPromise = null
}

function isLocalDevHost() {
  if (typeof window === 'undefined') return false
  const host = window.location.hostname
  return import.meta.env.DEV && (host === 'localhost' || host === '127.0.0.1')
}

/** Redirect sonucu yalnızca bir kez tüketilir (React StrictMode çift mount uyumu). */
const BENIGN_REDIRECT_CODES = new Set([
  'auth/no-auth-event',
  'auth/redirect-cancelled-by-user',
])

/**
 * @param {unknown} err
 */
export function isBenignGoogleRedirectError(err) {
  const code = err && typeof err === 'object' && 'code' in err ? String(err.code) : ''
  return BENIGN_REDIRECT_CODES.has(code)
}

/**
 * HUD konsol — Google Auth hata teşhisi.
 * @param {string} context
 * @param {unknown} err
 */
export function logGoogleAuthHud(context, err) {
  const code = err && typeof err === 'object' && 'code' in err ? String(err.code) : 'unknown'
  const message =
    err && typeof err === 'object' && 'message' in err && typeof err.message === 'string'
      ? err.message
      : String(err ?? '')

  console.error(`[AUDAZ HUD · GOOGLE_AUTH · ${context}]`, {
    firebaseAuthErrorCode: code,
    message,
    hint:
      code === 'auth/unauthorized-domain'
        ? 'Firebase Console → Authentication → Settings → Authorized domains → localhost ekleyin'
        : code === 'auth/operation-not-allowed'
          ? 'Firebase Console → Authentication → Sign-in method → Google etkinleştirin'
          : code === 'auth/popup-blocked'
            ? 'Tarayıcı popup engelliyor — redirect veya izin gerekli'
            : undefined,
    raw: err,
  })

  return { code, message }
}

/**
 * @param {import('firebase/auth').Auth} auth
 * @returns {Promise<import('firebase/auth').UserCredential | null>}
 */
export function getGoogleRedirectResultOnce(auth) {
  if (!auth) return Promise.resolve(null)

  if (!redirectResultPromise) {
    redirectResultPromise = getRedirectResult(auth)
      .then((result) => result ?? null)
      .catch((err) => {
        if (isBenignGoogleRedirectError(err)) {
          return null
        }
        logGoogleAuthHud('getRedirectResult', err)
        redirectResultPromise = null
        throw err
      })
  }

  return redirectResultPromise
}

/**
 * Redirect başarısız / desteklenmiyor ise popup fallback.
 * @param {unknown} err
 */
export function shouldUseGooglePopupFallback(err) {
  const code = err && typeof err === 'object' && 'code' in err ? String(err.code) : ''
  return [
    'auth/operation-not-supported-in-this-environment',
    'auth/web-storage-unsupported',
    'auth/popup-blocked',
    'auth/redirect-operation-pending',
  ].includes(code)
}

/**
 * @param {import('firebase/auth').Auth} auth
 */
function buildGoogleProvider() {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  return provider
}

/**
 * @param {import('firebase/auth').Auth} auth
 * @param {string} [redirectPath='/dashboard']
 * @returns {Promise<{ mode: 'redirect' } | { mode: 'popup', credential: import('firebase/auth').UserCredential }>}
 */
export async function startGoogleSignIn(auth, redirectPath = '/dashboard') {
  if (!auth) {
    const e = new Error('Firebase Auth başlatılamadı')
    e.code = 'failed-precondition'
    throw e
  }

  resetGoogleRedirectResultCache()
  stashGoogleAuthRedirectPath(redirectPath)
  const provider = buildGoogleProvider()

  // localhost: popup daha güvenilir (redirect → getRedirectResult yarışı ve üçüncü taraf çerez sorunları)
  if (isLocalDevHost()) {
    try {
      const credential = await signInWithPopup(auth, provider)
      clearGoogleAuthRedirectPath()
      await ensureGoogleOperatorProfile(credential)
      return { mode: 'popup', credential }
    } catch (popupErr) {
      logGoogleAuthHud('signInWithPopup(dev)', popupErr)
      const popupCode =
        popupErr && typeof popupErr === 'object' && 'code' in popupErr ? String(popupErr.code) : ''
      if (
        popupCode === 'auth/popup-closed-by-user' ||
        popupCode === 'auth/cancelled-popup-request' ||
        popupCode === 'auth/redirect-cancelled-by-user'
      ) {
        throw popupErr
      }
      if (!shouldUseGooglePopupFallback(popupErr)) {
        throw popupErr
      }
    }
  }

  try {
    await signInWithRedirect(auth, provider)
    return { mode: 'redirect' }
  } catch (err) {
    logGoogleAuthHud('signInWithRedirect', err)

    if (shouldUseGooglePopupFallback(err)) {
      try {
        const credential = await signInWithPopup(auth, provider)
        try {
          sessionStorage.removeItem('audaz_google_auth_redirect')
        } catch {
          /* ignore */
        }
        await ensureGoogleOperatorProfile(credential)
        return { mode: 'popup', credential }
      } catch (popupErr) {
        logGoogleAuthHud('signInWithPopup(fallback)', popupErr)
        throw popupErr
      }
    }

    throw err
  }
}

/**
 * Redirect dönüşü — profil + sonuç (AuthContext / handler ortak).
 * @param {import('firebase/auth').Auth} auth
 */
export async function resolveGoogleRedirectReturn(auth) {
  const result = await getGoogleRedirectResultOnce(auth)
  if (!result?.user) return null
  try {
    await ensureGoogleOperatorProfile(result)
  } catch (err) {
    // Auth başarılı; profil yazımı başarısız olsa bile oturumu düşürme
    logGoogleAuthHud('ensureGoogleOperatorProfile', err)
  }
  return result
}
