import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging'
import {
  arrayRemove,
  arrayUnion,
  deleteField,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import { getAudazFunctions } from './cloudFunctions'
import { httpsCallable } from 'firebase/functions'
import { getAudazApp, db, firebaseConfig, isFirebaseConfigured } from './firebase'

export const EARLY_WARNINGS_STORAGE_KEY = 'audaz_early_warnings_active'
export const GLOBAL_INTEL_STORAGE_KEY = 'audaz_global_intel_active'

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY

/** @type {string | null} */
let cachedDeviceFcmToken = null

/**
 * projectId eksik stale app instance'larını önler.
 * @returns {import('firebase/messaging').Messaging | null}
 */
function getAudazMessaging() {
  const firebaseApp = getAudazApp()
  if (!firebaseApp?.options?.projectId) return null
  return getMessaging(firebaseApp)
}

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
    appInstanceProjectId: getAudazApp()?.options?.projectId ?? '(yok)',
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
 * @returns {Promise<string | null>}
 */
async function readLocalFcmToken() {
  if (!VAPID_KEY || !(await isSupported())) return null
  try {
    const registration = await ensureMessagingServiceWorker()
    const messaging = getAudazMessaging()
    if (!messaging) return null
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    })
    if (token) cachedDeviceFcmToken = token
    return token || null
  } catch {
    return cachedDeviceFcmToken
  }
}

/**
 * @param {string} uid
 * @param {string} token
 */
export async function saveUserFcmToken(uid, token) {
  if (!uid || !token || !isFirebaseConfigured() || !db) return false

  cachedDeviceFcmToken = token
  const userRef = doc(db, 'users', uid)
  const snap = await getDoc(userRef)
  const legacyToken =
    typeof snap.data()?.fcmToken === 'string' ? snap.data().fcmToken.trim() : ''

  /** @type {Record<string, unknown>} */
  const updates = {
    fcmTokens: legacyToken && legacyToken !== token ? arrayUnion(token, legacyToken) : arrayUnion(token),
    fcmTokenUpdatedAt: serverTimestamp(),
    fcmToken: deleteField(),
  }

  await updateDoc(userRef, updates)
  return true
}

/**
 * Mevcut cihazın FCM token'ını fcmTokens dizisinden kaldırır.
 * @param {string} uid
 */
export async function clearUserFcmToken(uid) {
  if (!uid || !isFirebaseConfigured() || !db) return false

  const token = cachedDeviceFcmToken || (await readLocalFcmToken())
  const userRef = doc(db, 'users', uid)

  /** @type {Record<string, unknown>} */
  const updates = {
    fcmToken: deleteField(),
    fcmTokenUpdatedAt: serverTimestamp(),
  }

  if (token) {
    updates.fcmTokens = arrayRemove(token)
  }

  await updateDoc(userRef, updates)
  return true
}

/**
 * İzin verilmişse token al ve Firestore'a kaydet (izin istemez).
 * @param {string} uid
 */
export async function syncUserFcmTokenIfPermitted(uid) {
  if (!uid || !isFirebaseConfigured() || !getAudazApp() || !VAPID_KEY) {
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
    const token = await readLocalFcmToken()
    if (!token) return { ok: false, reason: 'no_token' }
    await saveUserFcmToken(uid, token)
    return { ok: true, token }
  } catch {
    return { ok: false, reason: 'error' }
  }
}

/**
 * Kullanıcı etkileşimi sonrası izin iste, token al ve users/{uid}.fcmTokens'a kaydet.
 * @param {string} uid
 */
export async function registerUserPushNotifications(uid) {
  if (!uid) return { ok: false, reason: 'not_configured' }
  if (!isFirebaseConfigured() || !getAudazApp()) return { ok: false, reason: 'not_configured' }
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { ok: false, reason: 'not_supported' }
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    return { ok: false, reason: permission === 'denied' ? 'denied' : 'dismissed' }
  }

  const tokenResult = await acquireFcmTokenAfterPermission()
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
  if (!isFirebaseConfigured() || !getAudazApp() || typeof window === 'undefined') return undefined

  let unsubscribe = () => {}

  void isSupported().then((supported) => {
    if (!supported) return
    try {
      const messaging = getAudazMessaging()
      if (!messaging) return
      unsubscribe = onMessage(messaging, (payload) => {
        onPayload(payload)
      })
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn('[FCM · onMessage]', err)
      }
    }
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

/** @returns {boolean} */
export function isPushVapidConfigured() {
  return Boolean(VAPID_KEY && String(VAPID_KEY).trim())
}

/**
 * @param {string | undefined} reason
 * @returns {string}
 */
export function getPushRegistrationErrorMessage(reason) {
  switch (reason) {
    case 'vapid_missing':
      return 'VAPID anahtarı tanımlı değil. Proje kökündeki .env.local dosyasına VITE_FIREBASE_VAPID_KEY ekleyin (Firebase Console → Project Settings → Cloud Messaging → Web Push certificates → Key pair). Ardından npm run dev yeniden başlatın.'
    case 'vapid_invalid':
      return 'VAPID anahtarı geçersiz. Firebase Console’daki Web Push sertifika anahtarını kontrol edin.'
    case 'denied':
      return 'Tarayıcı bildirim izni reddedildi. Adres çubuğundaki site izinlerinden bildirimleri açabilirsiniz.'
    case 'dismissed':
      return 'Bildirim izni verilmedi. Push bildirimleri için izin gerekli.'
    case 'not_supported':
      return 'Bu tarayıcı push bildirimlerini desteklemiyor.'
    case 'installations_denied':
      return 'FCM kurulum hatası (Installations). Sayfayı yenileyip tekrar deneyin; sorun sürerse tarayıcı önbelleğini temizleyin.'
    case 'not_configured':
      return 'Firebase yapılandırması eksik.'
    case 'config_invalid':
      return 'FCM yapılandırması hatalı. .env.local ile firebase-messaging-sw.js eşleşmesini kontrol edin (npm run dev veya npm run build).'
    case 'save_failed':
      return 'FCM token Firestore’a kaydedilemedi. Oturumunuzun açık olduğundan emin olun.'
    case 'no_token':
      return 'FCM cihaz token’ı alınamadı. Sayfayı yenileyip tekrar deneyin.'
    default:
      return 'Push bildirimleri etkinleştirilemedi. Lütfen tekrar deneyin.'
  }
}

/**
 * İzin verildikten sonra service worker + FCM token alır.
 * @returns {Promise<{ ok: boolean, reason?: string, token?: string, issues?: string[] }>}
 */
async function acquireFcmTokenAfterPermission() {
  if (!VAPID_KEY) return { ok: false, reason: 'vapid_missing' }

  const validation = await validateFcmConfig()
  if (!validation.ok) {
    const swOnly =
      validation.issues.length === 1 &&
      validation.issues[0]?.includes('firebase-messaging-sw.js')
    if (!swOnly) {
      return { ok: false, reason: 'config_invalid', issues: validation.issues }
    }
  }

  if (!(await isSupported())) return { ok: false, reason: 'not_supported' }

  try {
    const token = await readLocalFcmToken()
    if (!token) return { ok: false, reason: 'no_token' }
    if (import.meta.env.DEV) console.info('[FCM · token]', fingerprint(token))
    return { ok: true, token }
  } catch (err) {
    return { ok: false, reason: classifyFcmError(err) }
  }
}

/**
 * İzin iste → service worker kaydet → FCM token al.
 * @returns {Promise<{ ok: boolean, reason?: string, token?: string }>}
 */
export async function requestPushPermissionAndToken() {
  if (!isFirebaseConfigured() || !getAudazApp()) return { ok: false, reason: 'not_configured' }
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { ok: false, reason: 'not_supported' }
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    return { ok: false, reason: permission === 'denied' ? 'denied' : 'dismissed' }
  }

  return acquireFcmTokenAfterPermission()
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

/**
 * Mevcut FCM token ile intel_updates / forum_updates topic aboneliklerini günceller.
 * @param {string} token
 * @param {{ intel?: boolean }} [options]
 */
export async function syncPushTopicSubscriptions(token, options = {}) {
  const fcmToken = String(token ?? '').trim()
  const functions = getAudazFunctions()
  if (!fcmToken || !functions) return { ok: false, reason: 'not_configured' }

  /** @type {Array<'subscribeToIntelUpdates' | 'subscribeToForumUpdates'>} */
  const callables = ['subscribeToForumUpdates']
  if (options.intel !== false) {
    callables.push('subscribeToIntelUpdates')
  }

  try {
    await Promise.all(
      callables.map(async (callableName) => {
        const subscribe = httpsCallable(functions, callableName)
        const result = await subscribe({ token: fcmToken })
        if (!result.data || result.data.success !== true) {
          throw new Error(`${callableName}_failed`)
        }
      }),
    )
    return { ok: true }
  } catch {
    return { ok: false, reason: 'subscribe_failed' }
  }
}
