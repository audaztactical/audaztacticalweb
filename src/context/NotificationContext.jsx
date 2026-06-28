/* eslint-disable react-refresh/only-export-components -- provider + hook */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from './AuthContext'
import {
  markAllAsRead,
  markAsRead,
  subscribeNotifications,
} from '../services/notificationService'
import { playNotificationSound } from '../lib/notificationSound'

/** @typedef {import('../services/notificationService').AppNotification} AppNotification */

/** @type {React.Context<{
 *   notifications: AppNotification[]
 *   unreadCount: number
 *   loading: boolean
 *   markNotificationRead: (id: string) => Promise<void>
 *   markAllNotificationsRead: () => Promise<void>
 * } | null>} */
const NotificationContext = createContext(null)

/**
 * Platform genelinde merkezi bildirim akışı — onSnapshot ile gerçek zamanlı.
 *
 * @param {{ children: import('react').ReactNode }} props
 */
export function NotificationProvider({ children }) {
  const { user } = useAuth()
  const uid = user?.uid ?? ''

  const [notifications, setNotifications] = useState(/** @type {AppNotification[]} */ ([]))
  const [loading, setLoading] = useState(true)

  const knownIdsRef = useRef(/** @type {Set<string>} */ (new Set()))
  const initialSnapshotRef = useRef(true)

  useEffect(() => {
    knownIdsRef.current = new Set()
    initialSnapshotRef.current = true
  }, [uid])

  useEffect(() => {
    if (!uid) {
      setNotifications([])
      setLoading(false)
      return undefined
    }

    setLoading(true)
    const unsub = subscribeNotifications(
      uid,
      (rows, snap) => {
        if (initialSnapshotRef.current) {
          knownIdsRef.current = new Set(rows.map((row) => row.id))
          setNotifications(rows)
          setLoading(false)

          // Cache boş → sunucu dolu geçişinde false positive ses önleme
          if (!snap.metadata.fromCache) {
            initialSnapshotRef.current = false
          }
          return
        }

        const hasNewUnread = snap
          .docChanges()
          .some((change) => change.type === 'added' && change.doc.data().isRead !== true)

        if (hasNewUnread) {
          playNotificationSound()
        }

        knownIdsRef.current = new Set(rows.map((row) => row.id))
        setNotifications(rows)
        setLoading(false)
      },
      (err) => {
        console.error('[NotificationContext] Bildirim akışı kesildi:', err)
        setLoading(false)
      },
    )

    return unsub
  }, [uid])

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications],
  )

  const markNotificationRead = useCallback(async (id) => {
    const nid = String(id ?? '').trim()
    if (!nid) return

    setNotifications((prev) => prev.map((n) => (n.id === nid ? { ...n, isRead: true } : n)))

    try {
      await markAsRead(nid)
    } catch (err) {
      console.error('[NotificationContext] Okundu işaretlenemedi:', err)
    }
  }, [])

  const markAllNotificationsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))

    try {
      await markAllAsRead(notifications)
    } catch (err) {
      console.error('[NotificationContext] Tümü okundu işaretlenemedi:', err)
    }
  }, [notifications])

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      loading,
      markNotificationRead,
      markAllNotificationsRead,
    }),
    [notifications, unreadCount, loading, markNotificationRead, markAllNotificationsRead],
  )

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) {
    throw new Error('useNotifications yalnızca NotificationProvider içinde kullanılabilir.')
  }
  return ctx
}
