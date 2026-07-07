import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import { assertCanManageAdminContent } from '../config/admin'
import { db, isFirebaseConfigured } from './firebase'

/** @typedef {{ emailVerificationRequired: boolean, updatedAt?: import('firebase/firestore').Timestamp | null, updatedBy?: string | null }} AuthAppSettings */

export const DEFAULT_AUTH_APP_SETTINGS = /** @type {AuthAppSettings} */ ({
  emailVerificationRequired: true,
})

function assertDb() {
  if (!isFirebaseConfigured() || !db) {
    const e = new Error('Firebase yapılandırılmadı')
    e.code = 'failed-precondition'
    throw e
  }
}

function authSettingsRef() {
  assertDb()
  return doc(db, 'app_settings', 'auth')
}

/**
 * @param {Record<string, unknown> | null | undefined} raw
 * @returns {AuthAppSettings}
 */
export function parseAuthAppSettings(raw) {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_AUTH_APP_SETTINGS }
  }
  return {
    emailVerificationRequired: raw.emailVerificationRequired !== false,
    updatedAt: raw.updatedAt ?? null,
    updatedBy: typeof raw.updatedBy === 'string' ? raw.updatedBy : null,
  }
}

/**
 * @param {(settings: AuthAppSettings) => void} onData
 * @param {(err: unknown) => void} [onError]
 */
export function subscribeAuthAppSettings(onData, onError) {
  if (!isFirebaseConfigured() || !db) {
    onData({ ...DEFAULT_AUTH_APP_SETTINGS })
    return () => {}
  }

  return onSnapshot(
    authSettingsRef(),
    (snap) => {
      onData(parseAuthAppSettings(snap.exists() ? snap.data() : null))
    },
    (err) => {
      onError?.(err)
    },
  )
}

/**
 * @param {boolean} required
 * @param {import('firebase/auth').User | null | undefined} user
 */
export async function setEmailVerificationRequired(required, user) {
  await assertCanManageAdminContent(user)
  await setDoc(
    authSettingsRef(),
    {
      emailVerificationRequired: required === true,
      updatedAt: serverTimestamp(),
      updatedBy: user?.uid ?? '',
    },
    { merge: true },
  )
}
