import { useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import {
  clearUserFcmToken,
  syncPushTopicSubscriptions,
  syncUserFcmTokenIfPermitted,
} from '../lib/fcm'

/**
 * Giriş sonrası FCM token senkronu (izin verilmişse).
 * Push izni yalnızca Ayarlar toggle'ından istenir.
 */
export function useFcmPush() {
  const { user } = useAuth()
  const { settings, ready } = useTheme()
  const pushEnabled = settings.notifications.push === true
  const intelEnabled = settings.notifications.intel !== false
  const uid = user?.uid ?? ''
  const prevPushEnabledRef = useRef(pushEnabled)

  useEffect(() => {
    if (!uid || !ready) return undefined

    const wasEnabled = prevPushEnabledRef.current
    prevPushEnabledRef.current = pushEnabled

    if (!pushEnabled) {
      if (wasEnabled) {
        void clearUserFcmToken(uid).catch(() => {})
      }
      return undefined
    }

    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      void syncUserFcmTokenIfPermitted(uid).then((result) => {
        if (result.ok && result.token) {
          void syncPushTopicSubscriptions(result.token, { intel: intelEnabled })
        }
      })
    }

    return undefined
  }, [uid, ready, pushEnabled, intelEnabled])

}
