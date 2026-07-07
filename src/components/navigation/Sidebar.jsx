import { useMemo } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  BarChart3,
  BookOpen,
  CreditCard,
  Crosshair,
  HeartPulse,
  Home,
  KeyRound,
  Landmark,
  LogOut,
  MessageSquare,
  MessageSquarePlus,
  Globe,
  MessagesSquare,
  PlayCircle,
  Settings,
  Shield,
  ShieldAlert,
  Target,
  User,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useFeedbackPanelOptional } from '../../context/FeedbackPanelContext'
import { useMuhabereNotify } from '../../context/MuhabereNotifyContext'
import { auth } from '../../lib/firebase'
import { scheduleScrollAppToTop } from '../../lib/scrollAppToTop'

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

/**
 * @typedef {Object} NavGroupTheme
 * @property {string} titleClass
 * @property {string} iconIdleClass
 */

/** @type {Record<string, NavGroupTheme>} */
export const NAV_GROUP_THEMES = {
  personal: {
    titleClass: 'text-emerald-500/75 border-emerald-500/35',
    iconIdleClass: 'text-emerald-500/45 group-hover:text-emerald-400/75',
  },
  'audaz-network': {
    titleClass: 'text-violet-400/75 border-violet-500/35',
    iconIdleClass: 'text-violet-400/45 group-hover:text-violet-300/75',
  },
  operations: {
    titleClass: 'text-amber-500/80 border-amber-500/35',
    iconIdleClass: 'text-amber-500/45 group-hover:text-amber-400/75',
  },
  command: {
    titleClass: 'text-cyan-400/75 border-cyan-500/35',
    iconIdleClass: 'text-cyan-400/45 group-hover:text-cyan-300/75',
  },
  'usage-guide': {
    titleClass: 'text-amber-400/85 border-amber-400/40',
    iconIdleClass: 'text-amber-400/50 group-hover:text-amber-300/80',
  },
  system: {
    titleClass: 'text-rose-400/75 border-rose-500/35',
    iconIdleClass: 'text-rose-400/45 group-hover:text-rose-300/75',
  },
}

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
      { to: '/istihbarat', label: 'Küresel Haber Ağı', icon: Globe },
    ],
  },
  {
    id: 'operations',
    title: '[ OPERASYON VE LOJİSTİK ]',
    items: [
      { to: '/antrenman', label: 'Antrenman ve Operasyon', icon: Crosshair },
      { to: '/tccc', label: 'TCCC & Sağlık', icon: HeartPulse },
      { to: '/cephanelik', label: 'Cephanelik', icon: Shield },
      { to: '/balistik', label: 'Balistik Terminal', icon: Target },
    ],
  },
  {
    id: 'command',
    title: '[ KOMUTA VE ANALİTİK ]',
    items: [{ to: '/basarilar', label: 'Kişisel Başarı Takibi', icon: BarChart3 }],
  },
  {
    id: 'usage-guide',
    title: '[ KULLANIM KILAVUZU ]',
    items: [{ to: '/kilavuz', end: true, label: 'Kullanım Kılavuzu', icon: BookOpen }],
  },
]

const instructorNavItem = /** @type {NavItem} */ ({
  to: '/egitmen-komuta',
  label: 'Eğitmen Kontrol Paneli',
  icon: KeyRound,
})

const groupTitleBaseClass =
  'border-b px-3 pb-2 pt-5 font-mono text-[9px] font-bold uppercase tracking-[0.22em] first:pt-2'

const linkBaseClass =
  'group relative flex items-center gap-3 overflow-hidden rounded-lg px-3 py-3 text-sm font-medium transition-colors duration-200'

/**
 * @param {boolean} isActive
 * @param {boolean} collapsed
 */
function navLinkStateClass(isActive, collapsed) {
  if (isActive) {
    return ['sidebar-nav-link-active bg-zinc-800/60 text-lime-400', collapsed ? 'justify-center px-2' : ''].join(' ')
  }
  return [
    'sidebar-nav-link-idle text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200',
    collapsed ? 'justify-center px-2' : '',
  ].join(' ')
}

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
 *   collapsed?: boolean
 *   iconIdleClass?: string
 * }} props
 */
export function SidebarLink({
  to,
  end,
  label,
  icon,
  onNavigate,
  badgeCount = 0,
  blinkIcon = false,
  state,
  collapsed = false,
  iconIdleClass = 'text-zinc-500 group-hover:text-zinc-300',
}) {
  const Icon = icon
  const showBadge = badgeCount > 0
  const location = useLocation()

  const handleClick = () => {
    scheduleScrollAppToTop()
    onNavigate?.()
    const isSameRoute = end
      ? location.pathname === to
      : location.pathname === to || location.pathname.startsWith(`${to}/`)
    if (isSameRoute) {
      window.dispatchEvent(new CustomEvent('audaz:route-reenter', { detail: { to } }))
    }
  }

  return (
    <NavLink
      to={to}
      end={end}
      state={state}
      onClick={handleClick}
      title={collapsed ? label : undefined}
      className={({ isActive }) => [linkBaseClass, navLinkStateClass(isActive, collapsed)].join(' ')}
    >
      {({ isActive }) => (
        <>
          <span className="relative shrink-0">
            <Icon
              className={[
                'sidebar-nav-icon size-[20px] transition-[transform,color] duration-150',
                isActive ? 'text-lime-400' : iconIdleClass,
                blinkIcon ? 'blink text-lime-400' : '',
              ].join(' ')}
              strokeWidth={1.75}
              aria-hidden
            />
            {collapsed && showBadge ? (
              <span
                className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-lime-400 shadow-[0_0_6px_rgba(132,204,22,0.65)]"
                aria-hidden
              />
            ) : null}
          </span>
          {!collapsed ? (
            <span className="min-w-0 flex-1 truncate font-mono text-[12px] tracking-wide">{label}</span>
          ) : (
            <span className="sidebar-collapsed-tooltip" role="tooltip">
              {label}
            </span>
          )}
          {!collapsed && showBadge ? (
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
 *   label: string
 *   icon: import('lucide-react').LucideIcon
 *   onClick: () => void
 *   collapsed?: boolean
 *   iconIdleClass?: string
 *   idleClass?: string
 *   disabled?: boolean
 * }} props
 */
function SidebarActionButton({
  label,
  icon,
  onClick,
  collapsed = false,
  iconIdleClass = 'text-zinc-500 group-hover:text-zinc-300',
  idleClass = 'sidebar-nav-link-idle text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200',
  disabled = false,
}) {
  const Icon = icon
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={[
        linkBaseClass,
        'w-full',
        collapsed ? 'justify-center px-2' : '',
        disabled ? 'cursor-not-allowed opacity-50' : idleClass,
      ].join(' ')}
    >
      <Icon
        className={['sidebar-nav-icon size-[20px] shrink-0 transition-[transform,color] duration-150', iconIdleClass].join(
          ' ',
        )}
        strokeWidth={1.75}
        aria-hidden
      />
      {!collapsed ? <span className="font-mono text-[12px] tracking-wide">{label}</span> : null}
      {collapsed ? (
        <span className="sidebar-collapsed-tooltip" role="tooltip">
          {label}
        </span>
      ) : null}
    </button>
  )
}

/**
 * @param {{
 *   onNavigate?: () => void
 *   signingOut?: boolean
 *   onSignOut?: () => void
 *   userEmail?: string
 *   loading?: boolean
 *   collapsed?: boolean
 * }} props
 */
export default function Sidebar({
  onNavigate,
  signingOut = false,
  onSignOut,
  userEmail = '',
  loading = false,
  collapsed = false,
}) {
  const { isInstructor, role, showAdminPanel, isAdmin } = useAuth()
  const { sidebarMuhabereBadgeCount } = useMuhabereNotify()
  const feedbackPanel = useFeedbackPanelOptional()
  const showAdminLink = showAdminPanel || isAdmin
  const systemTheme = NAV_GROUP_THEMES.system

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
      <nav
        className={['flex flex-1 flex-col overflow-y-auto py-4', collapsed ? 'px-1.5' : 'px-3'].join(' ')}
        aria-label="Modüller"
      >
        {groups.map((group) => {
          const theme = NAV_GROUP_THEMES[group.id] ?? NAV_GROUP_THEMES.personal
          return (
            <section key={group.id} aria-labelledby={`nav-group-${group.id}`}>
              {!collapsed ? (
                <h2
                  id={`nav-group-${group.id}`}
                  className={[groupTitleBaseClass, theme.titleClass].join(' ')}
                >
                  {group.title}
                </h2>
              ) : (
                <div className="my-2 border-b border-white/5" aria-hidden />
              )}
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
                      collapsed={collapsed}
                      iconIdleClass={theme.iconIdleClass}
                      badgeCount={item.to === '/mesajlar' ? sidebarMuhabereBadgeCount : 0}
                      blinkIcon={item.to === '/mesajlar' && sidebarMuhabereBadgeCount > 0}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
      </nav>

      <div className={['border-t border-zinc-800/80 py-4', collapsed ? 'px-1.5' : 'px-3'].join(' ')}>
        {!collapsed ? (
          <p className={[groupTitleBaseClass, systemTheme.titleClass, 'pt-2'].join(' ')}>[ SİSTEM ]</p>
        ) : (
          <div className="mb-2 border-b border-white/5" aria-hidden />
        )}
        <ul className="flex flex-col gap-1">
          {showAdminLink ? (
            <li>
              <SidebarLink
                to="/admin"
                label="Admin Paneli"
                icon={ShieldAlert}
                onNavigate={onNavigate}
                collapsed={collapsed}
                iconIdleClass={systemTheme.iconIdleClass}
              />
            </li>
          ) : null}
          <li>
            <SidebarActionButton
              label="Şikayet & Öneri"
              icon={MessageSquarePlus}
              collapsed={collapsed}
              iconIdleClass="text-zinc-500 transition-colors group-hover:text-lime-400"
              onClick={() => {
                feedbackPanel?.openPanel()
                onNavigate?.()
              }}
            />
          </li>
          {showAdminLink ? (
            <li>
              <SidebarLink
                to="/fiyatlandirma"
                label="Fiyatlandırma"
                icon={CreditCard}
                onNavigate={onNavigate}
                collapsed={collapsed}
                iconIdleClass={systemTheme.iconIdleClass}
              />
            </li>
          ) : null}
          <li>
            <SidebarLink
              to="/ayarlar"
              label="Ayarlar"
              icon={Settings}
              onNavigate={onNavigate}
              collapsed={collapsed}
              iconIdleClass={systemTheme.iconIdleClass}
            />
          </li>
          <li>
            <SidebarActionButton
              label="Çıkış"
              icon={LogOut}
              collapsed={collapsed}
              disabled={!auth || signingOut}
              iconIdleClass="text-zinc-500 transition-colors group-hover:text-red-400/80"
              idleClass="sidebar-nav-link-idle text-zinc-400 hover:bg-zinc-800/40 hover:text-red-400/90"
              onClick={() => onSignOut?.()}
            />
          </li>
        </ul>
        {!collapsed ? (
          <p className="mt-4 truncate px-3 font-mono text-[10px] text-zinc-600" title={userEmail}>
            {loading ? '…' : userEmail || 'Oturum yok'}
          </p>
        ) : null}
      </div>
    </>
  )
}

/** @deprecated Gruplu NAV_GROUPS kullanın */
export const mainNav = NAV_GROUPS.flatMap((g) => g.items)
