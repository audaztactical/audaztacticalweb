import { NavLink } from 'react-router-dom'
import { KeyRound, LogOut, Settings, ShieldAlert, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { emailMatchesConfiguredAdmin, userEmailMatchesConfiguredAdmin } from '../config/admin'
import { useMuhabereNotify } from '../context/MuhabereNotifyContext'
import { auth } from '../lib/firebase'
import { scheduleScrollAppToTop } from '../lib/scrollAppToTop'
import { NAV_GROUPS, SidebarLink } from '../components/navigation/Sidebar'
import { BOTTOM_TAB_ITEMS } from './BottomTabBar'

const TAB_ROUTES = new Set(BOTTOM_TAB_ITEMS.map((t) => t.to))

/**
 * @param {{
 *   open: boolean
 *   onClose: () => void
 *   signingOut?: boolean
 *   onSignOut?: () => void
 *   userEmail?: string
 * }} props
 */
export default function MobileNavMenu({
  open,
  onClose,
  signingOut = false,
  onSignOut,
  userEmail = '',
}) {
  const { user, isInstructor, role, showAdminPanel } = useAuth()
  const { sidebarMuhabereBadgeCount } = useMuhabereNotify()
  const showAdminLink =
    showAdminPanel || userEmailMatchesConfiguredAdmin(user) || emailMatchesConfiguredAdmin(userEmail)
  const isInstructorUser = role === 'instructor' || isInstructor

  if (!open) return null

  const extraGroups = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((item) => !TAB_ROUTES.has(item.to)),
  })).filter((g) => g.items.length > 0)

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-sm"
        aria-label="Menüyü kapat"
        onClick={onClose}
      />
      <aside
        className="mobile-nav-sheet fixed inset-y-0 left-0 z-[70] flex w-[min(18rem,85vw)] flex-col border-r border-accent/15 bg-app-bg/98 shadow-2xl"
        aria-label="Ek modüller"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
          <p className="font-mono-technical text-[10px] font-bold uppercase tracking-[0.28em] text-accent">
            MODÜLLER
          </p>
          <button
            type="button"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-zinc-400 hover:bg-white/10 hover:text-app-text"
            aria-label="Kapat"
            onClick={onClose}
          >
            <X className="size-5" strokeWidth={1.75} aria-hidden />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-3">
          {extraGroups.map((group) => (
            <section key={group.id} className="mb-4">
              <h2 className="px-2 pb-2 font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-zinc-500">
                {group.title}
              </h2>
              <ul className="flex flex-col gap-1">
                {group.items.map((item) => (
                  <li key={item.to}>
                    <SidebarLink
                      to={item.to}
                      end={item.end}
                      label={item.label}
                      icon={item.icon}
                      state={item.state}
                      onNavigate={onClose}
                      badgeCount={item.to === '/mesajlar' ? sidebarMuhabereBadgeCount : 0}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}

          {isInstructorUser ? (
            <section className="mb-4">
              <h2 className="px-2 pb-2 font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-zinc-500">
                [ KOMUTA ]
              </h2>
              <SidebarLink
                to="/egitmen-komuta"
                label="Eğitmen Kontrol Paneli"
                icon={KeyRound}
                onNavigate={onClose}
              />
            </section>
          ) : null}
        </nav>

        <div className="border-t border-zinc-800/80 px-3 py-4">
          <ul className="flex flex-col gap-1">
            {showAdminLink ? (
              <li>
                <NavLink
                  to="/admin"
                  onClick={() => {
                    scheduleScrollAppToTop()
                    onClose()
                  }}
                  className={({ isActive }) =>
                    [
                      'flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
                      isActive ? 'bg-zinc-800/60 text-lime-400' : 'text-zinc-400 hover:bg-zinc-800/40',
                    ].join(' ')
                  }
                >
                  <ShieldAlert className="size-5 shrink-0" strokeWidth={1.75} aria-hidden />
                  <span className="font-mono text-[12px]">Admin Paneli</span>
                </NavLink>
              </li>
            ) : null}
            <li>
              <NavLink
                to="/ayarlar"
                onClick={() => {
                  scheduleScrollAppToTop()
                  onClose()
                }}
                className={({ isActive }) =>
                  [
                    'flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
                    isActive ? 'bg-zinc-800/60 text-lime-400' : 'text-zinc-400 hover:bg-zinc-800/40',
                  ].join(' ')
                }
              >
                <Settings className="size-5 shrink-0" strokeWidth={1.75} aria-hidden />
                <span className="font-mono text-[12px]">Ayarlar</span>
              </NavLink>
            </li>
            <li>
              <button
                type="button"
                disabled={!auth || signingOut}
                onClick={onSignOut}
                className="flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 transition hover:bg-zinc-800/40 hover:text-red-400/90 disabled:opacity-50"
              >
                <LogOut className="size-5 shrink-0" strokeWidth={1.75} aria-hidden />
                <span className="font-mono text-[12px]">Çıkış</span>
              </button>
            </li>
          </ul>
          <p className="mt-3 truncate px-2 font-mono text-[10px] text-zinc-600" title={userEmail}>
            {userEmail || 'Oturum yok'}
          </p>
        </div>
      </aside>
    </>
  )
}
