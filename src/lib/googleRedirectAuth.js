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
            ? 'Tarayıcı popup engelliyor — izin verin veya npm run deploy:hosting ile Hosting deploy edin'
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

async function completePopupSignIn(auth, provider) {
  const credential = await signInWithPopup(auth, provider)
  try {
    sessionStorage.removeItem('audaz_google_auth_redirect')
  } catch {
    /* ignore */
  }
  await ensureGoogleOperatorProfile(credential)
  return credential
}

/**
 * Google OAuth — redirect (popup COOP uyarıları üretir; yalnızca redirect başarısız olursa popup).
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

  try {
    await signInWithRedirect(auth, provider)
    return { mode: 'redirect' }
  } catch (err) {
    logGoogleAuthHud('signInWithRedirect', err)

    if (shouldUseGooglePopupFallback(err)) {
      try {
        const credential = await completePopupSignIn(auth, provider)
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
