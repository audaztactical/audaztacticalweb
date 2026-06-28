import { useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import {
  clearUserFcmToken,
  setupForegroundMessageHandler,
  syncUserFcmTokenIfPermitted,
} from '../lib/fcm'
import { playNotificationSound } from '../lib/notificationSound'

/**
 * Giriş sonrası FCM token senkronu (izin verilmişse) + foreground push handler.
 * Push izni yalnızca Ayarlar toggle'ından istenir.
 */
export function useFcmPush() {
  const { user } = useAuth()
  const { settings, ready } = useTheme()
  const pushEnabled = settings.notifications.push === true
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
      void syncUserFcmTokenIfPermitted(uid)
    }

    return undefined
  }, [uid, ready, pushEnabled])

  useEffect(() => {
    if (!uid) return undefined
    return setupForegroundMessageHandler(() => {
      playNotificationSound()
    })
  }, [uid])
}
