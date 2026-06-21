import { connectFunctionsEmulator, getFunctions, httpsCallable } from 'firebase/functions'
import { getAuth } from 'firebase/auth'
import { app, firebaseConfig, isFirebaseConfigured } from './firebase'

/** @type {import('firebase/functions').Functions | null} */
let functionsInstance = null
/** @type {boolean} */
let emulatorConnected = false

/**
 * Paylaşımlı Functions instance — bölge + isteğe bağlı emulator.
 * @returns {import('firebase/functions').Functions | null}
 */
export function getAudazFunctions() {
  if (!isFirebaseConfigured() || !app) return null

  if (!functionsInstance) {
    const region = String(import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION ?? 'us-central1').trim()
    functionsInstance = getFunctions(app, region || 'us-central1')

    if (import.meta.env.DEV && import.meta.env.VITE_FUNCTIONS_EMULATOR === 'true') {
      const host = String(import.meta.env.VITE_FUNCTIONS_EMULATOR_HOST ?? '127.0.0.1')
      const port = Number(import.meta.env.VITE_FUNCTIONS_EMULATOR_PORT ?? 5001)
      if (!emulatorConnected) {
        connectFunctionsEmulator(functionsInstance, host, port)
        emulatorConnected = true
      }
    }
  }

  return functionsInstance
}

/**
 * @param {unknown} err
 */
export function isCloudFunctionUnavailableError(err) {
  const code = String(/** @type {{ code?: string }} */ (err)?.code ?? '')
  const message = String(/** @type {{ message?: string }} */ (err)?.message ?? err ?? '')

  if (
    code === 'functions/already-exists' ||
    code === 'functions/invalid-argument' ||
    code === 'functions/unauthenticated' ||
    code === 'functions/permission-denied' ||
    code === 'functions/failed-precondition'
  ) {
    return false
  }

  return (
    code === 'functions/unavailable' ||
    code === 'functions/internal' ||
    code === 'functions/not-found' ||
    message.includes('CORS') ||
    message.includes('Failed to fetch') ||
    message.includes('NetworkError') ||
    message.includes('sistem yöneticisi')
  )
}

/** ensureAdminClaim — sunucu ADMIN_EMAIL doğrular; istemci yalnızca admin claim / role kullanır. */
export function isEnsureAdminClaimDenied(err) {
  const code = String(/** @type {{ code?: string }} */ (err)?.code ?? '')
  const message = String(/** @type {{ message?: string }} */ (err)?.message ?? err ?? '')
  return code === 'functions/permission-denied' || message.includes('sistem yöneticisi')
}

/**
 * Callable HTTP — FCM/Installations SDK zincirini atlar (403 konsol gürültüsü önlenir).
 * @param {string} name
 * @param {Record<string, unknown>} [data]
 */
async function callFunctionViaHttp(name, data = {}) {
  const auth = getAuth()
  const user = auth.currentUser
  if (!user) {
    const err = new Error('Oturum gerekli.')
    /** @type {Error & { code?: string }} */ (err).code = 'functions/unauthenticated'
    throw err
  }

  const idToken = await user.getIdToken()
  const region = String(import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION ?? 'us-central1').trim()
  const projectId = String(firebaseConfig.projectId ?? '').trim()
  if (!projectId) {
    throw new Error('Firebase projectId eksik.')
  }

  let url
  if (import.meta.env.DEV && import.meta.env.VITE_FUNCTIONS_EMULATOR === 'true') {
    const host = String(import.meta.env.VITE_FUNCTIONS_EMULATOR_HOST ?? '127.0.0.1')
    const port = Number(import.meta.env.VITE_FUNCTIONS_EMULATOR_PORT ?? 5001)
    url = `http://${host}:${port}/${projectId}/${region}/${name}`
  } else {
    url = `https://${region}-${projectId}.cloudfunctions.net/${name}`
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ data }),
  })

  const json = await res.json().catch(() => ({}))
  if (json.error) {
    const status = String(json.error.status ?? 'INTERNAL').toLowerCase().replace(/_/g, '-')
    const err = new Error(String(json.error.message ?? 'Cloud Function hatası.'))
    /** @type {Error & { code?: string }} */ (err).code = `functions/${status}`
    throw err
  }

  if (!res.ok) {
    const err = new Error(`Cloud Function HTTP ${res.status}`)
    /** @type {Error & { code?: string }} */ (err).code = 'functions/internal'
    throw err
  }

  return json.result
}

/**
 * @param {string} name
 * @param {Record<string, unknown>} [data]
 */
async function callFunction(name, data = {}) {
  if (typeof window !== 'undefined' && typeof fetch === 'function') {
    try {
      return await callFunctionViaHttp(name, data)
    } catch (httpErr) {
      if (!isCloudFunctionUnavailableError(httpErr)) {
        throw httpErr
      }
      if (import.meta.env.DEV) {
        console.warn('[cloudFunctions] HTTP callable başarısız, SDK deneniyor:', httpErr)
      }
    }
  }

  const functions = getAudazFunctions()
  if (!functions) {
    throw new Error('Firebase yapılandırılmadı')
  }

  const fn = httpsCallable(functions, name)
  const result = await fn(data)
  return result.data
}

/** Admin custom claim senkronizasyonu (sunucu ADMIN_EMAIL doğrular). */
export function callEnsureAdminClaim() {
  return callFunction('ensureAdminClaim')
}

/**
 * @param {string} tokenId instructor_tokens belge kimliği
 */
export function callClaimInstructorRole(tokenId) {
  return callFunction('claimInstructorRole', { tokenId })
}

/**
 * @param {string} password
 */
export function callJoinGroupByPassword(password) {
  return callFunction('joinGroupByPassword', { password })
}

/**
 * Kayıt profili — yalnızca HTTP callable (çift istek / SDK tekrarı önlenir).
 * @param {Record<string, unknown>} payload
 */
export function callRegisterOperatorProfile(payload) {
  return callFunctionViaHttp('registerOperatorProfile', payload)
}

/**
 * @param {string} paymentIntentId
 */
export function callCompletePremiumUpgrade(paymentIntentId) {
  return callFunction('completePremiumUpgrade', { paymentIntentId })
}

/**
 * @param {string} input Kanal ID, @handle veya YouTube URL
 * @returns {Promise<{ channelId: string; feedUrl: string; handle?: string; source?: string }>}
 */
export function callResolveYoutubeChannel(input) {
  return callFunction('resolveYoutubeChannel', { input })
}

/** Admin: YouTube RSS → video_news ingest (manuel). */
export function callTriggerVideoNewsIngest() {
  return callFunction('triggerVideoNewsIngest')
}

/**
 * Admin — kullanıcı hesabını kalıcı sil (Auth + Firestore).
 * @param {string} uid
 */
export function callAdminDeleteUser(uid) {
  return callFunction('adminDeleteUser', { uid: String(uid ?? '').trim() })
}

export { callFunctionViaHttp }
