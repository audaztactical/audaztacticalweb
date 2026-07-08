import { useMemo } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  CreditCard,
  LogOut,
  MessageSquarePlus,
  Settings,
  ShieldAlert,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useFeedbackPanelOptional } from '../../context/FeedbackPanelContext'
import { useMuhabereNotify } from '../../context/MuhabereNotifyContext'
import { useSidebarGroupState } from '../../hooks/useSidebarGroupState'
import { useInstructorNavItem, useNavGroups, useNavItemLabels, useNavUi, useSystemGroupTitle } from '../../hooks/useNavLabels'
import { getNavGroupTheme, NAV_GROUP_THEMES } from '../../lib/sidebarGroupColors'
import { isSidebarGroupOpen } from '../../lib/sidebarGroupState'
import { auth } from '../../lib/firebase'
import { scheduleScrollAppToTop } from '../../lib/scrollAppToTop'
import { SidebarGroupAccordion } from './SidebarNavParts'

export { NAV_GROUP_DEFS } from '../../lib/navStructure'
export { NAV_GROUP_THEMES } from '../../lib/sidebarGroupColors'

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

export function SidebarActionButton({
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
  const { groupState, toggleGroup } = useSidebarGroupState()
  const navGroups = useNavGroups()
  const instructorNavItem = useInstructorNavItem()
  const systemGroupTitle = useSystemGroupTitle()
  const navItems = useNavItemLabels()
  const navUi = useNavUi()

  const groups = useMemo(() => {
    const isInstructorUser = role === 'instructor' || isInstructor
    const next = navGroups.map((g) => ({ ...g, items: [...g.items] }))
    if (isInstructorUser) {
      const command = next.find((g) => g.id === 'command')
      if (command) command.items.push(instructorNavItem)
    }
    return next
  }, [navGroups, instructorNavItem, role, isInstructor])

  return (
    <>
      <nav
        className={['flex flex-1 flex-col overflow-y-auto py-4', collapsed ? 'px-1.5' : 'px-3'].join(' ')}
        aria-label={navUi.modulesNavAria}
      >
        {groups.map((group) => {
          const theme = getNavGroupTheme(group.id)
          const groupOpen = isSidebarGroupOpen(groupState, group.id)
          const itemList = (
            <ul className="flex flex-col gap-1 pb-2 pt-1">
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
          )

          if (collapsed) {
            return (
              <section key={group.id} aria-label={group.title}>
                <div className="my-2 border-b border-white/5" aria-hidden />
                {itemList}
              </section>
            )
          }

          return (
            <SidebarGroupAccordion
              key={group.id}
              groupId={group.id}
              title={group.title}
              theme={theme}
              open={groupOpen}
              onToggle={() => toggleGroup(group.id)}
            >
              {itemList}
            </SidebarGroupAccordion>
          )
        })}
      </nav>

      <div className={['border-t border-zinc-800/80 py-4', collapsed ? 'px-1.5' : 'px-3'].join(' ')}>
        {collapsed ? (
          <>
            <div className="mb-2 border-b border-white/5" aria-hidden />
            <ul className="flex flex-col gap-1">
              {showAdminLink ? (
                <li>
                  <SidebarLink
                    to="/admin"
                    label={navItems.admin}
                    icon={ShieldAlert}
                    onNavigate={onNavigate}
                    collapsed={collapsed}
                    iconIdleClass={systemTheme.iconIdleClass}
                  />
                </li>
              ) : null}
              <li>
                <SidebarActionButton
                  label={navItems.feedback}
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
                    label={navItems.pricing}
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
                  label={navItems.settings}
                  icon={Settings}
                  onNavigate={onNavigate}
                  collapsed={collapsed}
                  iconIdleClass={systemTheme.iconIdleClass}
                />
              </li>
              <li>
                <SidebarActionButton
                  label={navItems.signOut}
                  icon={LogOut}
                  collapsed={collapsed}
                  disabled={!auth || signingOut}
                  iconIdleClass="text-zinc-500 transition-colors group-hover:text-red-400/80"
                  idleClass="sidebar-nav-link-idle text-zinc-400 hover:bg-zinc-800/40 hover:text-red-400/90"
                  onClick={() => onSignOut?.()}
                />
              </li>
            </ul>
          </>
        ) : (
          <SidebarGroupAccordion
            groupId="system"
            title={systemGroupTitle}
            theme={systemTheme}
            open={isSidebarGroupOpen(groupState, 'system')}
            onToggle={() => toggleGroup('system')}
          >
            <ul className="flex flex-col gap-1 pb-1 pt-1">
              {showAdminLink ? (
                <li>
                  <SidebarLink
                    to="/admin"
                    label={navItems.admin}
                    icon={ShieldAlert}
                    onNavigate={onNavigate}
                    collapsed={collapsed}
                    iconIdleClass={systemTheme.iconIdleClass}
                  />
                </li>
              ) : null}
              <li>
                <SidebarActionButton
                  label={navItems.feedback}
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
                    label={navItems.pricing}
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
                  label={navItems.settings}
                  icon={Settings}
                  onNavigate={onNavigate}
                  collapsed={collapsed}
                  iconIdleClass={systemTheme.iconIdleClass}
                />
              </li>
              <li>
                <SidebarActionButton
                  label={navItems.signOut}
                  icon={LogOut}
                  collapsed={collapsed}
                  disabled={!auth || signingOut}
                  iconIdleClass="text-zinc-500 transition-colors group-hover:text-red-400/80"
                  idleClass="sidebar-nav-link-idle text-zinc-400 hover:bg-zinc-800/40 hover:text-red-400/90"
                  onClick={() => onSignOut?.()}
                />
              </li>
            </ul>
          </SidebarGroupAccordion>
        )}
        {!collapsed ? (
          <p className="mt-4 truncate px-3 font-mono text-[10px] text-zinc-600" title={userEmail}>
            {loading ? '…' : userEmail || navUi.noSession}
          </p>
        ) : null}
      </div>
    </>
  )
}

/** @deprecated NAV_GROUP_DEFS + useNavGroups kullanın */
export { NAV_GROUP_DEFS as NAV_GROUPS } from '../../lib/navStructure'
