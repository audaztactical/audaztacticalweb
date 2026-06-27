import { initializeApp, getApps, getApp } from 'firebase/app'
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
/** @type {import('firebase/firestore').Firestore | null} */
let firestoreInstance = null
/** @type {import('firebase/storage').FirebaseStorage | null} */
let storageInstance = null
/** @type {import('firebase/analytics').Analytics | null} */
let analytics = null

function ensureFirestore() {
  if (!app) return null
  if (!firestoreInstance) {
    firestoreInstance = getFirestore(app)
  }
  return firestoreInstance
}

function ensureStorage() {
  if (!app) return null
  if (storageInstance === null && app) {
    try {
      storageInstance = getStorage(app)
    } catch {
      storageInstance = null
    }
  }
  return storageInstance
}

/** Mevcut import'larla uyumlu — ilk Firestore erişiminde başlatılır. */
function createLazyFirestoreProxy() {
  return new Proxy(
    {},
    {
      get(_target, prop) {
        const instance = ensureFirestore()
        if (!instance) return undefined
        const value = instance[prop]
        return typeof value === 'function' ? value.bind(instance) : value
      },
    },
  )
}

/** Mevcut import'larla uyumlu — ilk Storage erişiminde başlatılır. */
function createLazyStorageProxy() {
  return new Proxy(
    {},
    {
      get(_target, prop) {
        const instance = ensureStorage()
        if (!instance) return undefined
        const value = instance[prop]
        return typeof value === 'function' ? value.bind(instance) : value
      },
    },
  )
}

/** @type {import('firebase/firestore').Firestore | null} */
let db = null
/** @type {import('firebase/storage').FirebaseStorage | null} */
let storage = null

if (isFirebaseConfigured()) {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
  auth = getAuth(app)

  if (typeof window !== 'undefined') {
    setPersistence(auth, browserLocalPersistence).catch((err) => {
      if (import.meta.env.DEV) {
        console.warn('[firebase] setPersistence', err?.code ?? err)
      }
    })

    db = createLazyFirestoreProxy()
    storage = createLazyStorageProxy()
  } else {
    db = getFirestore(app)
    try {
      storage = getStorage(app)
    } catch {
      storage = null
    }
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

export { app, auth, db, storage, analytics, ensureFirestore, ensureStorage }
