import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { getAnalytics, isSupported } from 'firebase/analytics'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

function isFirebaseConfigured() {
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

if (isFirebaseConfigured()) {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
  auth = getAuth(app)

  // Redirect OAuth oturumunun sayfa yenilemesinde korunması (varsayılan local; açıkça set edilir).
  if (typeof window !== 'undefined') {
    setPersistence(auth, browserLocalPersistence).catch((err) => {
      if (import.meta.env.DEV) {
        console.warn('[AUDAZ HUD · GOOGLE_AUTH · setPersistence]', err?.code ?? err)
      }
    })
  }
  /** @type {import('firebase/firestore').Firestore} */
  db = getFirestore(app)
  try {
    storage = getStorage(app)
  } catch {
    storage = null
  }

  // Geliştirmede getAnalytics → Installations + GA config istekleri 403 üretebilir (API key referrer
  // kısıtı vb.). Prod’da veya VITE_ENABLE_ANALYTICS=true iken başlat.
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

export { app, auth, db, storage, analytics, isFirebaseConfigured }
