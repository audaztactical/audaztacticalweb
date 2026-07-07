import { useEffect, useState } from 'react'
import {
  DEFAULT_AUTH_APP_SETTINGS,
  subscribeAuthAppSettings,
} from '../lib/firestoreAppSettings'

/**
 * Küresel kimlik doğrulama ayarları — app_settings/auth (Firestore).
 * Okuma hatasında veya belge yokken emailVerificationRequired varsayılan true kalır.
 */
export function useAuthAppSettings() {
  const [settings, setSettings] = useState(DEFAULT_AUTH_APP_SETTINGS)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(/** @type {unknown} */ (null))

  useEffect(() => {
    let cancelled = false

    const unsub = subscribeAuthAppSettings(
      (data) => {
        if (cancelled) return
        setSettings(data)
        setReady(true)
        setError(null)
      },
      (err) => {
        if (cancelled) return
        setSettings(DEFAULT_AUTH_APP_SETTINGS)
        setReady(true)
        setError(err)
      },
    )

    return () => {
      cancelled = true
      unsub()
    }
  }, [])

  return {
    emailVerificationRequired: settings.emailVerificationRequired,
    ready,
    error,
  }
}
