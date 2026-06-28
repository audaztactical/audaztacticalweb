import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging'
import { deleteField, doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { getAudazFunctions } from './cloudFunctions'
import { httpsCallable } from 'firebase/functions'
import { app, db, firebaseConfig, isFirebaseConfigured } from './firebase'

export const EARLY_WARNINGS_STORAGE_KEY = 'audaz_early_warnings_active'
export const GLOBAL_INTEL_STORAGE_KEY = 'audaz_global_intel_active'

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY

/** @param {string | undefined} key */
function fingerprint(key) {
  if (!key || key.length < 12) return '(eksik)'
  return `${key.slice(0, 8)}…${key.slice(-4)}`
}

/** @returns {Promise<string | null>} */
async function readServiceWorkerApiKey() {
  try {
    const res = await fetch('/firebase-messaging-sw.js', { cache: 'no-store' })
    const text = await res.text()
    return text.match(/"apiKey":\s*"([^"]+)"/)?.[1] ?? null
  } catch {
    return null
  }
}

/**
 * GCP / .env.local / service worker yapılandırmasını doğrular.
 * Konsola özet yazar; sorun varsa ok:false döner.
 * @returns {Promise<{ ok: boolean, issues: string[], report: Record<string, unknown> }>}
 */
export async function validateFcmConfig() {
  const issues = []
  const envKey = firebaseConfig.apiKey
  const swKey = typeof window !== 'undefined' ? await readServiceWorkerApiKey() : null

  if (!isFirebaseConfigured()) issues.push('Firebase config eksik (apiKey, projectId veya appId yok).')
  if (!VAPID_KEY) issues.push('VITE_FIREBASE_VAPID_KEY .env.local içinde tanımlı değil.')
  if (!firebaseConfig.messagingSenderId) issues.push('VITE_FIREBASE_MESSAGING_SENDER_ID eksik.')
  if (envKey && swKey && envKey !== swKey) {
    issues.push('.env.local apiKey ≠ firebase-messaging-sw.js apiKey → node scripts/inject-fcm-sw.mjs çalıştır.')
  }

  const report = {
    projectId: firebaseConfig.projectId,
    appId: firebaseConfig.appId,
    messagingSenderId: firebaseConfig.messagingSenderId,
    envApiKey: fingerprint(envKey),
    swApiKey: fingerprint(swKey ?? undefined),
    keysMatch: Boolean(envKey && swKey && envKey === swKey),
    vapidKey: VAPID_KEY ? fingerprint(VAPID_KEY) : '(eksik)',
    issues,
  }

  console.info('[FCM · validate]', report)
  return { ok: issues.length === 0, issues, report }
}

/**
 * @returns {Promise<ServiceWorkerRegistration>}
 */
async function ensureMessagingServiceWorker() {
  let registration = await navigator.serviceWorker.getRegistration('/')
  if (!registration) {
    registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/',
    })
  }
  await registration.update()
  await navigator.serviceWorker.ready
  return registration
}

/**
 * @returns {Promise<ServiceWorkerRegistration>}
 */
async function registerMessagingServiceWorker() {
  const existing = await navigator.serviceWorker.getRegistration('/')
  if (existing) await existing.unregister()

  return ensureMessagingServiceWorker()
}

/**
 * @param {string} uid
 * @param {string} token
 */
export async function saveUserFcmToken(uid, token) {
  if (!uid || !token || !isFirebaseConfigured() || !db) return false
  await updateDoc(doc(db, 'users', uid), {
    fcmToken: token,
    fcmTokenUpdatedAt: serverTimestamp(),
  })
  return true
}

/**
 * @param {string} uid
 */
export async function clearUserFcmToken(uid) {
  if (!uid || !isFirebaseConfigured() || !db) return false
  await updateDoc(doc(db, 'users', uid), {
    fcmToken: deleteField(),
    fcmTokenUpdatedAt: serverTimestamp(),
  })
  return true
}

/**
 * İzin verilmişse token al ve Firestore'a kaydet (izin istemez).
 * @param {string} uid
 */
export async function syncUserFcmTokenIfPermitted(uid) {
  if (!uid || !isFirebaseConfigured() || !app || !VAPID_KEY) {
    return { ok: false, reason: 'not_configured' }
  }
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { ok: false, reason: 'not_supported' }
  }
  if (Notification.permission !== 'granted') {
    return { ok: false, reason: 'not_granted' }
  }
  if (!(await isSupported())) return { ok: false, reason: 'not_supported' }

  try {
    const registration = await ensureMessagingServiceWorker()
    const messaging = getMessaging(app)
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    })
    if (!token) return { ok: false, reason: 'no_token' }
    await saveUserFcmToken(uid, token)
    return { ok: true, token }
  } catch {
    return { ok: false, reason: 'error' }
  }
}

/**
 * Kullanıcı etkileşimi sonrası izin iste, token al ve users/{uid}.fcmToken'a kaydet.
 * @param {string} uid
 */
export async function registerUserPushNotifications(uid) {
  const tokenResult = await requestPushPermissionAndToken()
  if (!tokenResult.ok || !tokenResult.token) {
    return { ok: false, reason: tokenResult.reason ?? 'no_token' }
  }
  try {
    await saveUserFcmToken(uid, tokenResult.token)
    return { ok: true, token: tokenResult.token }
  } catch {
    return { ok: false, reason: 'save_failed' }
  }
}

/**
 * Uygulama açıkken gelen FCM mesajları.
 * @param {(payload: import('firebase/messaging').MessagePayload) => void} onPayload
 * @returns {(() => void) | undefined}
 */
export function setupForegroundMessageHandler(onPayload) {
  if (!isFirebaseConfigured() || !app || typeof window === 'undefined') return undefined

  let unsubscribe = () => {}

  void isSupported().then((supported) => {
    if (!supported) return
    const messaging = getMessaging(app)
    unsubscribe = onMessage(messaging, (payload) => {
      onPayload(payload)
    })
  })

  return () => {
    unsubscribe()
  }
}

export function isEarlyWarningsActive() {
  return typeof window !== 'undefined' && localStorage.getItem(EARLY_WARNINGS_STORAGE_KEY) === '1'
}

export function isGlobalIntelActive() {
  return typeof window !== 'undefined' && localStorage.getItem(GLOBAL_INTEL_STORAGE_KEY) === '1'
}

function setEarlyWarningsActive(active) {
  if (typeof window === 'undefined') return
  if (active) localStorage.setItem(EARLY_WARNINGS_STORAGE_KEY, '1')
  else localStorage.removeItem(EARLY_WARNINGS_STORAGE_KEY)
}

function setGlobalIntelActive(active) {
  if (typeof window === 'undefined') return
  if (active) localStorage.setItem(GLOBAL_INTEL_STORAGE_KEY, '1')
  else localStorage.removeItem(GLOBAL_INTEL_STORAGE_KEY)
}

/** @param {unknown} err @returns {string} */
function classifyFcmError(err) {
  const code = String(/** @type {{ code?: string }} */ (err)?.code ?? '')
  const message = String(err instanceof Error ? err.message : err ?? '')
  const serverResponse = String(
    /** @type {{ customData?: { serverResponse?: string } }} */ (err)?.customData
      ?.serverResponse ?? message
  )

  if (serverResponse.includes('API_KEY_HTTP_REFERRER_BLOCKED')) return 'api_key_referrer_blocked'
  if (serverResponse.includes('API_KEY_SERVICE_BLOCKED') || serverResponse.includes('are blocked')) {
    return 'api_key_service_blocked'
  }
  if (code.includes('installations') || message.includes('installations')) return 'installations_denied'
  if (code.includes('messaging/permission') || message.includes('permission')) return 'denied'
  if (code.includes('messaging/unsupported') || message.includes('unsupported')) return 'not_supported'
  if (message.includes('vapid') || code.includes('messaging/token-subscribe')) return 'vapid_invalid'
  return 'error'
}

/**
 * İzin iste → service worker kaydet → FCM token al.
 * @returns {Promise<{ ok: boolean, reason?: string, token?: string }>}
 */
export async function requestPushPermissionAndToken() {
  if (!isFirebaseConfigured() || !app) return { ok: false, reason: 'not_configured' }
  if (!VAPID_KEY) return { ok: false, reason: 'vapid_missing' }
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { ok: false, reason: 'not_supported' }
  }

  const validation = await validateFcmConfig()
  if (!validation.ok) return { ok: false, reason: 'config_invalid' }

  if (!(await isSupported())) return { ok: false, reason: 'not_supported' }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return { ok: false, reason: 'denied' }

  const registration = await registerMessagingServiceWorker()
  const messaging = getMessaging(app)
  const token = await getToken(messaging, {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: registration,
  })

  if (!token) return { ok: false, reason: 'no_token' }
  if (import.meta.env.DEV) console.info('[FCM · token]', fingerprint(token))
  return { ok: true, token }
}

/** @param {'subscribeToAlerts' | 'subscribeToGlobalIntel'} callableName @param {(active: boolean) => void} setActive */
async function subscribeFcmTopic(callableName, setActive) {
  try {
    const tokenResult = await requestPushPermissionAndToken()
    if (!tokenResult.ok || !tokenResult.token) {
      return { ok: false, reason: tokenResult.reason ?? 'no_token' }
    }

    const functions = getAudazFunctions()
    if (!functions) return { ok: false, reason: 'firebase_not_configured' }
    const subscribe = httpsCallable(functions, callableName)
    const result = await subscribe({ token: tokenResult.token })

    if (!result.data || result.data.success !== true) {
      return { ok: false, reason: 'subscribe_failed' }
    }

    setActive(true)
    return { ok: true, token: tokenResult.token }
  } catch (err) {
    if (import.meta.env.DEV) {
      const serverResponse = /** @type {{ customData?: { serverResponse?: string } }} */ (
        err
      )?.customData?.serverResponse
      console.error(`[FCM · ${callableName}]`, err, serverResponse ? { serverResponse } : '')
    }
    return { ok: false, reason: classifyFcmError(err) }
  }
}

export function enableEarlyWarnings() {
  return subscribeFcmTopic('subscribeToAlerts', setEarlyWarningsActive)
}

export function enableGlobalIntel() {
  return subscribeFcmTopic('subscribeToGlobalIntel', setGlobalIntelActive)
}
