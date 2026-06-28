import { initializeApp, getApps } from 'firebase/app'
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { getAnalytics, isSupported } from 'firebase/analytics'

/** Tek kaynak: tüm Firebase modülleri buradan okur. */
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

export function isFirebaseConfigured() {
  const { apiKey, projectId, appId } = firebaseConfig
  return Boolean(
    apiKey &&
      String(apiKey).trim() !== '' &&
      projectId &&
      String(projectId).trim() !== '' &&
      appId &&
      String(appId).trim() !== ''
  )
}

let app = null
let auth = null
let db = null
/** @type {import('firebase/storage').FirebaseStorage | null} */
let storage = null
/** @type {import('firebase/analytics').Analytics | null} */
let analytics = null

/**
 * Tam yapılandırmalı Firebase app — getApp() stale/HMR instance döndürmesin.
 * @returns {import('firebase/app').FirebaseApp | null}
 */
export function getAudazApp() {
  if (!isFirebaseConfigured()) return null

  const projectId = String(firebaseConfig.projectId).trim()
  const appId = String(firebaseConfig.appId).trim()

  for (const candidate of getApps()) {
    const opts = candidate.options
    if (opts?.projectId === projectId && opts?.appId === appId) {
      return candidate
    }
  }

  if (getApps().length === 0) {
    return initializeApp(firebaseConfig)
  }

  return initializeApp(firebaseConfig, `audaz-${projectId}`)
}

if (isFirebaseConfigured()) {
  app = getAudazApp()
  auth = getAuth(app)

  if (typeof window !== 'undefined') {
    setPersistence(auth, browserLocalPersistence).catch((err) => {
      if (import.meta.env.DEV) {
        console.warn('[firebase] setPersistence', err?.code ?? err)
      }
    })
  }

  db = getFirestore(app)
  try {
    storage = getStorage(app)
  } catch {
    storage = null
  }

  const enableAnalytics =
    typeof window !== 'undefined' &&
    (import.meta.env.PROD || import.meta.env.VITE_ENABLE_ANALYTICS === 'true')

  if (enableAnalytics) {
    isSupported()
      .then((supported) => {
        if (supported && app) {
          try {
            analytics = getAnalytics(app)
          } catch {
            analytics = null
          }
        }
      })
      .catch(() => {
        analytics = null
      })
  }
}

export { app, auth, db, storage, analytics }
