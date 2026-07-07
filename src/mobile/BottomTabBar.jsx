import { useMemo } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Crosshair, Home, MessageSquare, Shield, Target, User } from 'lucide-react'
import { NAV_GROUPS } from '../components/navigation/Sidebar'
import { useMuhabereNotify } from '../context/MuhabereNotifyContext'
import { getNavGroupTheme } from '../lib/sidebarGroupColors'
import { scheduleScrollAppToTop } from '../lib/scrollAppToTop'

/** @param {number} count */
function formatMesajlarBadgeCount(count) {
  if (!count || count <= 0) return null
  return count > 9 ? '9+' : String(count)
}

/** @type {{ to: string; label: string; icon: import('lucide-react').LucideIcon; end?: boolean }[]} */
export const BOTTOM_TAB_ITEMS = [
  { to: '/dashboard', label: 'Ana Sayfa', icon: Home, end: true },
  { to: '/antrenman', label: 'Antrenman', icon: Crosshair },
  { to: '/mesajlar', label: 'Mesajlar', icon: MessageSquare },
  { to: '/cephanelik', label: 'Cephanelik', icon: Shield },
  { to: '/balistik', label: 'Balistik', icon: Target },
  { to: '/profil', label: 'Profil', icon: User },
]

/** @type {Map<string, string>} */
const ROUTE_GROUP_MAP = new Map(
  NAV_GROUPS.flatMap((group) => group.items.map((item) => [item.to, group.id])),
)

/**
 * @param {string} route
 * @returns {string}
 */
function getGroupIdForRoute(route) {
  return ROUTE_GROUP_MAP.get(route) ?? 'personal'
}

/**
 * Paylaşılan NAV_GROUP_THEMES tonlarından tab bar sınıfları türetir (yeni palet yok).
 * @param {string} groupId
 */
function getTabThemeClasses(groupId) {
  const theme = getNavGroupTheme(groupId)
  const titleParts = theme.titleClass.split(' ')
  const titleText = titleParts.find((c) => c.startsWith('text-')) ?? 'text-zinc-400'
  const borderTone = titleParts.find((c) => c.startsWith('border-')) ?? 'border-zinc-500/35'

  const idleIcon = theme.iconIdleClass
    .split(' ')
    .filter((c) => !c.startsWith('group-hover:'))
    .join(' ')

  const activeIcon = titleText.replace('/75', '/85').replace('/80', '/88').replace('/85', '/90')
  const activeLabel = titleText.replace('/75', '/80').replace('/80', '/85').replace('/85', '/88')
  const indicator = borderTone
    .replace(/^border-/, 'bg-')
    .replace('/35', '/55')
    .replace('/40', '/58')

  return {
    idleIcon,
    idleLabel: 'text-zinc-500',
    activeIcon,
    activeLabel,
    indicator,
  }
}

export default function BottomTabBar() {
  const { unreadMuhabereMessagesTotal, unreadChannelMessageCount, unreadMessageCount } =
    useMuhabereNotify()
  const location = useLocation()

  const totalUnreadCount =
    unreadMuhabereMessagesTotal > 0
      ? unreadMuhabereMessagesTotal
      : unreadChannelMessageCount + unreadMessageCount

  const onMesajlarRoute =
    location.pathname === '/mesajlar' || location.pathname.startsWith('/mesajlar/')

  const tabThemes = useMemo(() => {
    const map = new Map()
    for (const { to } of BOTTOM_TAB_ITEMS) {
      map.set(to, getTabThemeClasses(getGroupIdForRoute(to)))
    }
    return map
  }, [])

  return (
    <nav
      className="mobile-tab-bar fixed inset-x-0 bottom-0 z-50 border-t border-accent/20 bg-app-bg/95 backdrop-blur-md"
      aria-label="Alt navigasyon"
    >
      <ul className="mx-auto flex h-14 max-w-lg items-stretch justify-around px-1">
        {BOTTOM_TAB_ITEMS.map(({ to, label, icon: TabIcon, end }) => {
          const mesajlarBadgeLabel =
            to === '/mesajlar' && !onMesajlarRoute
              ? formatMesajlarBadgeCount(totalUnreadCount)
              : null
          const theme = tabThemes.get(to) ?? getTabThemeClasses('personal')
          const groupId = getGroupIdForRoute(to)

          return (
            <li key={to} className="flex min-w-0 flex-1">
              <NavLink
                to={to}
                end={end}
                data-nav-group={groupId}
                onClick={() => {
                  scheduleScrollAppToTop()
                  if (
                    location.pathname === to ||
                    (!end && location.pathname.startsWith(`${to}/`))
                  ) {
                    window.dispatchEvent(new CustomEvent('audaz:route-reenter', { detail: { to } }))
                  }
                }}
                className={({ isActive }) =>
                  [
                    'mobile-tab-link relative flex min-h-[44px] min-w-[44px] flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1 transition-colors duration-200',
                    isActive ? 'mobile-tab-link-active' : '',
                  ].join(' ')
                }
              >
                {({ isActive }) => (
                  <>
                    <span className="relative inline-flex">
                      <TabIcon
                        className={[
                          'size-5 shrink-0 transition-[color,filter] duration-200',
                          isActive ? [theme.activeIcon, 'drop-shadow-[0_0_5px_currentColor]'].join(' ') : theme.idleIcon,
                        ].join(' ')}
                        strokeWidth={isActive ? 2 : 1.75}
                        aria-hidden
                      />
                      {mesajlarBadgeLabel ? (
                        <span
                          className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-center font-mono text-[9px] font-bold leading-none text-black shadow-[0_0_10px_rgba(245,158,11,0.55)]"
                          aria-label={`${totalUnreadCount} okunmamış mesaj`}
                        >
                          {mesajlarBadgeLabel}
                        </span>
                      ) : null}
                    </span>
                    <span
                      className={[
                        'max-w-full truncate font-mono text-[9px] font-semibold uppercase tracking-wide transition-colors duration-200',
                        isActive ? theme.activeLabel : theme.idleLabel,
                      ].join(' ')}
                    >
                      {label}
                    </span>
                    {isActive ? (
                      <span
                        className={['absolute inset-x-2 bottom-0 h-0.5 rounded-full', theme.indicator].join(' ')}
                        aria-hidden
                      />
                    ) : null}
                  </>
                )}
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
