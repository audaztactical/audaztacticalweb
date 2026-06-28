import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  BookOpen,
  CheckCheck,
  Heart,
  Loader2,
  MessageSquare,
  Megaphone,
  Newspaper,
  Radio,
  Target,
  UserPlus,
} from 'lucide-react'
import { useNotifications } from '../../context/NotificationContext'
import {
  buildNotificationNavigationTarget,
  formatNotificationTime,
} from '../../services/notificationService'

/** @typedef {import('../../services/notificationService').NotificationType} NotificationType */

/** @type {Record<NotificationType, { icon: import('lucide-react').LucideIcon, accent: string }>} */
const TYPE_META = {
  LIKE: { icon: Heart, accent: 'text-amber-400 border-amber-500/40 bg-amber-950/30' },
  COMMENT: { icon: MessageSquare, accent: 'text-lime-400 border-lime-500/40 bg-lime-950/30' },
  FRIEND_REQUEST: { icon: UserPlus, accent: 'text-sky-400 border-sky-500/40 bg-sky-950/30' },
  MESSAGE: { icon: MessageSquare, accent: 'text-cyan-400 border-cyan-500/40 bg-cyan-950/30' },
  TRAINING: { icon: Target, accent: 'text-orange-400 border-orange-500/40 bg-orange-950/30' },
  INTEL: { icon: Radio, accent: 'text-rose-400 border-rose-500/40 bg-rose-950/30' },
  FORUM_POST: { icon: Newspaper, accent: 'text-indigo-400 border-indigo-500/40 bg-indigo-950/30' },
  ACADEMY: { icon: BookOpen, accent: 'text-violet-400 border-violet-500/40 bg-violet-950/30' },
  SYSTEM: { icon: Megaphone, accent: 'text-zinc-300 border-zinc-600/40 bg-zinc-900/50' },
}

/**
 * Üst menü bildirim çanı — gerçek zamanlı rozet ve taktik dropdown panel.
 */
export default function NotificationDropdown() {
  const navigate = useNavigate()
  const { notifications, unreadCount, loading, markNotificationRead, markAllNotificationsRead } =
    useNotifications()

  const [open, setOpen] = useState(false)
  const [markingAll, setMarkingAll] = useState(false)
  const [panelStyle, setPanelStyle] = useState(
    /** @type {{ top: number, right: number, width: number } | null} */ (null),
  )
  const rootRef = useRef(/** @type {HTMLDivElement | null} */ (null))
  const panelRef = useRef(/** @type {HTMLDivElement | null} */ (null))

  const updatePanelPosition = () => {
    const anchor = rootRef.current
    if (!anchor) return

    const rect = anchor.getBoundingClientRect()
    const width = Math.min(352, Math.max(280, window.innerWidth - 16))
    const right = Math.max(8, window.innerWidth - rect.right)

    setPanelStyle({
      top: rect.bottom + 8,
      right,
      width,
    })
  }

  useLayoutEffect(() => {
    if (!open) {
      setPanelStyle(null)
      return undefined
    }

    updatePanelPosition()

    const onLayoutChange = () => updatePanelPosition()
    window.addEventListener('resize', onLayoutChange)
    window.addEventListener('scroll', onLayoutChange, true)

    return () => {
      window.removeEventListener('resize', onLayoutChange)
      window.removeEventListener('scroll', onLayoutChange, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return undefined

    const onPointerDown = (e) => {
      const target = e.target
      if (!(target instanceof Node)) return
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return
      setOpen(false)
    }

    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const handleItemClick = (/** @type {import('../../services/notificationService').AppNotification} */ item) => {
    const target = buildNotificationNavigationTarget(item)
    const path = `${target.pathname}${target.search}${target.hash}`
    setOpen(false)

    navigate(
      path,
      Object.keys(target.state).length > 0 ? { state: target.state } : undefined,
    )

    if (!item.isRead) {
      void markNotificationRead(item.id)
    }
  }

  const handleMarkAll = async () => {
    if (unreadCount === 0 || markingAll) return
    setMarkingAll(true)
    try {
      await markAllNotificationsRead()
    } finally {
      setMarkingAll(false)
    }
  }

  const panel =
    open && panelStyle ? (
      <div
        ref={panelRef}
        role="menu"
        style={{
          position: 'fixed',
          top: panelStyle.top,
          right: panelStyle.right,
          width: panelStyle.width,
          zIndex: 500,
        }}
        className="overflow-hidden rounded-lg border border-zinc-800 bg-app-bg/95 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.8)] backdrop-blur-md"
      >
        <div className="flex items-center justify-between gap-2 border-b border-zinc-800 px-3 py-2.5">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-amber-500/90">
            [ BİLDİRİMLER ]
          </p>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleMarkAll}
              disabled={unreadCount === 0 || markingAll}
              className="inline-flex items-center gap-1 rounded border border-zinc-700 px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-zinc-400 transition hover:border-lime-500/40 hover:text-lime-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {markingAll ? (
                <Loader2 className="size-3 animate-spin" aria-hidden />
              ) : (
                <CheckCheck className="size-3" strokeWidth={2} aria-hidden />
              )}
              Tümünü oku
            </button>
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {loading ? (
            <p className="flex items-center justify-center gap-2 px-4 py-8 font-mono text-xs text-zinc-500">
              <Loader2 className="size-4 animate-spin text-amber-500/60" aria-hidden />
              Senkronize ediliyor…
            </p>
          ) : notifications.length === 0 ? (
            <p className="px-4 py-8 text-center font-mono text-xs text-zinc-500">Aktif bildirim yok.</p>
          ) : (
            <ul className="divide-y divide-zinc-800/80">
              {notifications.map((item) => {
                const meta = TYPE_META[item.type] ?? TYPE_META.SYSTEM
                const Icon = meta.icon

                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => handleItemClick(item)}
                      className={[
                        'flex w-full items-start gap-3 px-3 py-3 text-left transition hover:bg-zinc-900/70',
                        item.isRead ? 'opacity-75' : 'bg-zinc-900/40',
                      ].join(' ')}
                    >
                      <span
                        className={[
                          'mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded border',
                          meta.accent,
                        ].join(' ')}
                      >
                        <Icon className="size-3.5" strokeWidth={1.75} aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-2">
                          <span
                            className={[
                              'font-mono text-[11px] font-bold uppercase tracking-wide',
                              item.isRead ? 'text-zinc-400' : 'text-zinc-100',
                            ].join(' ')}
                          >
                            {item.title}
                          </span>
                          {!item.isRead ? (
                            <span className="mt-1 size-1.5 shrink-0 rounded-full bg-lime-400" aria-hidden />
                          ) : null}
                        </span>
                        <span className="mt-1 block font-mono text-[10px] leading-relaxed text-zinc-500">
                          {item.message}
                        </span>
                        <span className="mt-1 block font-mono text-[9px] uppercase tracking-wider text-zinc-600">
                          {formatNotificationTime(item.createdAt)}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    ) : null

  return (
    <div ref={rootRef} className="relative z-[120]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={[
          'relative inline-flex h-9 w-9 items-center justify-center rounded-lg border transition',
          open
            ? 'border-amber-500/50 bg-amber-950/30 text-amber-400'
            : 'border-white/10 bg-zinc-900/60 text-zinc-400 hover:border-amber-500/30 hover:text-amber-400',
        ].join(' ')}
        aria-label="Bildirimler"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Bell className="size-4" strokeWidth={1.75} aria-hidden />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex min-w-[1.1rem] items-center justify-center rounded-sm bg-lime-500 px-1 py-0.5 font-mono text-[9px] font-bold leading-none text-black">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </button>

      {typeof document !== 'undefined' && panel ? createPortal(panel, document.body) : null}
    </div>
  )
}
