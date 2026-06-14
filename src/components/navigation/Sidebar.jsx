import { useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import {
  BarChart3,
  Crosshair,
  HeartPulse,
  Home,
  KeyRound,
  Landmark,
  LogOut,
  MessageSquare,
  Globe,
  MessagesSquare,
  PlayCircle,
  Settings,
  Shield,
  ShieldAlert,
  Target,
  User,
} from 'lucide-react'
import { isAdminUser } from '../../config/admin'
import { useAuth } from '../../context/AuthContext'
import { useMuhabereNotify } from '../../context/MuhabereNotifyContext'
import { auth } from '../../lib/firebase'

/**
 * @typedef {Object} NavItem
 * @property {string} to
 * @property {string} label
 * @property {import('lucide-react').LucideIcon} icon
 * @property {boolean} [end]
 * @property {Record<string, unknown>} [state]
 */

/**
 * @typedef {Object} NavGroup
 * @property {string} id
 * @property {string} title
 * @property {NavItem[]} items
 */

/** @type {NavGroup[]} */
export const NAV_GROUPS = [
  {
    id: 'personal',
    title: '[ KİŞİSEL / MERKEZ ]',
    items: [
      { to: '/', end: true, label: "Karargâh'a Dön", icon: Landmark, state: { skipIntro: true } },
      { to: '/dashboard', end: true, label: 'Ana Sayfa', icon: Home },
      { to: '/profil', label: 'Profilim', icon: User },
      { to: '/mesajlar', label: 'Taktik Muhabere', icon: MessageSquare },
    ],
  },
  {
    id: 'audaz-network',
    title: '[ AUDAZ AĞI ]',
    items: [
      { to: '/akademi', label: 'Audaz Akademi', icon: PlayCircle },
      { to: '/forum', label: 'Brifing Odası (Forum)', icon: MessagesSquare },
      { to: '/istihbarat', label: 'Küresel İstihbarat Ağı', icon: Globe },
    ],
  },
  {
    id: 'operations',
    title: '[ OPERASYON VE LOJİSTİK ]',
    items: [
      { to: '/gorevler', label: 'Görevlerim', icon: Target },
      { to: '/antrenman', label: 'Antrenman ve Operasyon', icon: Crosshair },
      { to: '/tccc', label: 'TCCC & Sağlık', icon: HeartPulse },
      { to: '/cephanelik', label: 'Cephanelik', icon: Shield },
    ],
  },
  {
    id: 'command',
    title: '[ KOMUTA VE ANALİTİK ]',
    items: [{ to: '/basarilar', label: 'Kişisel Başarı Takibi', icon: BarChart3 }],
  },
]

const instructorNavItem = /** @type {NavItem} */ ({
  to: '/egitmen-komuta',
  label: 'Eğitmen Kontrol Paneli',
  icon: KeyRound,
})

const groupTitleClass =
  'px-3 pb-2 pt-5 font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-zinc-500 first:pt-2'

const linkBaseClass =
  'group flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-all duration-200'

/**
 * @param {{
 *   to: string
 *   end?: boolean
 *   label: string
 *   icon: import('lucide-react').LucideIcon
 *   onNavigate?: () => void
 *   badgeCount?: number
 *   blinkIcon?: boolean
 *   state?: Record<string, unknown>
 * }} props
 */
export function SidebarLink({ to, end, label, icon, onNavigate, badgeCount = 0, blinkIcon = false, state }) {
  const Icon = icon
  const showBadge = badgeCount > 0

  return (
    <NavLink
      to={to}
      end={end}
      state={state}
      onClick={onNavigate}
      className={({ isActive }) =>
        [
          linkBaseClass,
          isActive
            ? 'bg-zinc-800/60 text-lime-400'
            : 'text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200',
        ].join(' ')
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            className={[
              'size-[20px] shrink-0 transition-colors duration-200',
              isActive ? 'text-lime-400' : 'text-zinc-500 group-hover:text-zinc-300',
              blinkIcon ? 'blink text-lime-400' : '',
            ].join(' ')}
            strokeWidth={1.75}
            aria-hidden
          />
          <span className="min-w-0 flex-1 truncate font-mono text-[12px] tracking-wide">{label}</span>
          {showBadge ? (
            <span className="animate-pulse rounded-sm bg-lime-500 px-2 py-0.5 font-mono text-xs font-bold text-black">
              {badgeCount > 99 ? '99+' : badgeCount}
            </span>
          ) : null}
        </>
      )}
    </NavLink>
  )
}

/**
 * @param {{
 *   onNavigate?: () => void
 *   signingOut?: boolean
 *   onSignOut?: () => void
 *   userEmail?: string
 *   loading?: boolean
 * }} props
 */
export default function Sidebar({
  onNavigate,
  signingOut = false,
  onSignOut,
  userEmail = '',
  loading = false,
}) {
  const { user, isInstructor, role } = useAuth()
  const { totalNotifications, unreadChannelMessageCount } = useMuhabereNotify()
  const showAdminPanel = isAdminUser(user)

  const groups = useMemo(() => {
    const isInstructorUser = role === 'instructor' || isInstructor
    const next = NAV_GROUPS.map((g) => ({ ...g, items: [...g.items] }))
    if (isInstructorUser) {
      const command = next.find((g) => g.id === 'command')
      if (command) command.items.push(instructorNavItem)
    }
    return next
  }, [role, isInstructor])

  return (
    <>
      <nav className="flex flex-1 flex-col overflow-y-auto px-3 py-4" aria-label="Modüller">
        {groups.map((group) => (
          <section key={group.id} aria-labelledby={`nav-group-${group.id}`}>
            <h2 id={`nav-group-${group.id}`} className={groupTitleClass}>
              {group.title}
            </h2>
            <ul className="flex flex-col gap-1 pb-2">
              {group.items.map((item) => (
                <li key={item.to}>
                  <SidebarLink
                    to={item.to}
                    end={item.end}
                    label={item.label}
                    icon={item.icon}
                    state={item.state}
                    onNavigate={onNavigate}
                    badgeCount={item.to === '/mesajlar' ? totalNotifications : 0}
                    blinkIcon={item.to === '/mesajlar' && unreadChannelMessageCount > 0}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </nav>

      <div className="border-t border-zinc-800/80 px-3 py-4">
        <p className={groupTitleClass}>[ SİSTEM ]</p>
        <ul className="flex flex-col gap-1">
          {showAdminPanel ? (
            <li>
              <NavLink
                to="/admin"
                onClick={onNavigate}
                className={({ isActive }) =>
                  [
                    linkBaseClass,
                    isActive
                      ? 'bg-zinc-800/60 text-lime-400'
                      : 'text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200',
                  ].join(' ')
                }
              >
                {({ isActive }) => (
                  <>
                    <ShieldAlert
                      className={[
                        'size-[20px] shrink-0 transition-colors duration-200',
                        isActive ? 'text-lime-400' : 'text-zinc-500 group-hover:text-zinc-300',
                      ].join(' ')}
                      strokeWidth={1.75}
                      aria-hidden
                    />
                    <span className="font-mono text-[12px] tracking-wide">Admin Paneli</span>
                  </>
                )}
              </NavLink>
            </li>
          ) : null}
          <li>
            <NavLink
              to="/ayarlar"
              onClick={onNavigate}
              className={({ isActive }) =>
                [
                  linkBaseClass,
                  isActive
                    ? 'bg-zinc-800/60 text-lime-400'
                    : 'text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  <Settings
                    className={[
                      'size-[20px] shrink-0 transition-colors duration-200',
                      isActive ? 'text-lime-400' : 'text-zinc-500 group-hover:text-zinc-300',
                    ].join(' ')}
                    strokeWidth={1.75}
                    aria-hidden
                  />
                  <span className="font-mono text-[12px] tracking-wide">Ayarlar</span>
                </>
              )}
            </NavLink>
          </li>
          <li>
            <button
              type="button"
              disabled={!auth || signingOut}
              onClick={onSignOut}
              className={[
                linkBaseClass,
                auth
                  ? 'text-zinc-400 hover:bg-zinc-800/40 hover:text-red-400/90'
                  : 'cursor-not-allowed text-zinc-600 opacity-50',
              ].join(' ')}
            >
              <LogOut
                className="size-[20px] shrink-0 text-zinc-500 transition-colors group-hover:text-red-400/80"
                strokeWidth={1.75}
                aria-hidden
              />
              <span className="font-mono text-[12px] tracking-wide">Çıkış</span>
            </button>
          </li>
        </ul>
        <p className="mt-4 truncate px-3 font-mono text-[10px] text-zinc-600" title={userEmail}>
          {loading ? '…' : userEmail || 'Oturum yok'}
        </p>
      </div>
    </>
  )
}

/** @deprecated Gruplu NAV_GROUPS kullanın */
export const mainNav = NAV_GROUPS.flatMap((g) => g.items)
