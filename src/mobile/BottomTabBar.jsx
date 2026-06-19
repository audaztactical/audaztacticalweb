import { NavLink, useLocation } from 'react-router-dom'
import { Crosshair, Home, MessageSquare, Shield, User } from 'lucide-react'
import { useMuhabereNotify } from '../context/MuhabereNotifyContext'
import { scheduleScrollAppToTop } from '../lib/scrollAppToTop'

/** @type {{ to: string; label: string; icon: import('lucide-react').LucideIcon; end?: boolean }[]} */
export const BOTTOM_TAB_ITEMS = [
  { to: '/dashboard', label: 'Ana Sayfa', icon: Home, end: true },
  { to: '/antrenman', label: 'Antrenman', icon: Crosshair },
  { to: '/mesajlar', label: 'Mesajlar', icon: MessageSquare },
  { to: '/cephanelik', label: 'Cephanelik', icon: Shield },
  { to: '/profil', label: 'Profil', icon: User },
]

export default function BottomTabBar() {
  const { sidebarMuhabereBadgeCount } = useMuhabereNotify()
  const location = useLocation()

  return (
    <nav
      className="mobile-tab-bar fixed inset-x-0 bottom-0 z-50 border-t border-accent/20 bg-app-bg/95 backdrop-blur-md"
      aria-label="Alt navigasyon"
    >
      <ul className="mx-auto flex h-14 max-w-lg items-stretch justify-around px-1">
        {BOTTOM_TAB_ITEMS.map(({ to, label, icon: Icon, end }) => {
          const badge = to === '/mesajlar' ? sidebarMuhabereBadgeCount : 0

          return (
            <li key={to} className="flex min-w-0 flex-1">
              <NavLink
                to={to}
                end={end}
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
                    'mobile-tab-link relative flex min-h-[44px] min-w-[44px] flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1 transition-colors',
                    isActive ? 'text-accent' : 'text-zinc-500 hover:text-zinc-300',
                  ].join(' ')
                }
              >
                {({ isActive }) => (
                  <>
                    <span className="relative inline-flex">
                      <Icon
                        className={['size-5 shrink-0', isActive ? 'text-accent' : ''].join(' ')}
                        strokeWidth={isActive ? 2 : 1.75}
                        aria-hidden
                      />
                      {badge > 0 ? (
                        <span className="absolute -right-2 -top-1.5 min-w-[1rem] rounded-full bg-accent px-1 text-center font-mono text-[9px] font-bold leading-4 text-black">
                          {badge > 99 ? '99+' : badge}
                        </span>
                      ) : null}
                    </span>
                    <span className="max-w-full truncate font-mono text-[9px] font-semibold uppercase tracking-wide">
                      {label}
                    </span>
                    {isActive ? (
                      <span
                        className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-accent/80"
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
