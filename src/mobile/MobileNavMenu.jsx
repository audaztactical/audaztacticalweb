import { useMemo } from 'react'
import { CreditCard, KeyRound, LogOut, MessageSquarePlus, Settings, ShieldAlert, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useFeedbackPanelOptional } from '../context/FeedbackPanelContext'
import { useMuhabereNotify } from '../context/MuhabereNotifyContext'
import { useSidebarGroupState } from '../hooks/useSidebarGroupState'
import { getNavGroupTheme, NAV_GROUP_THEMES } from '../lib/sidebarGroupColors'
import { isSidebarGroupOpen } from '../lib/sidebarGroupState'
import { auth } from '../lib/firebase'
import { scheduleScrollAppToTop } from '../lib/scrollAppToTop'
import { NAV_GROUPS, SidebarActionButton, SidebarLink } from '../components/navigation/Sidebar'
import { SidebarGroupAccordion } from '../components/navigation/SidebarNavParts'
import { BOTTOM_TAB_ITEMS } from './BottomTabBar'

const TAB_ROUTES = new Set(BOTTOM_TAB_ITEMS.map((t) => t.to))

const instructorNavItem = {
  to: '/egitmen-komuta',
  label: 'Eğitmen Kontrol Paneli',
  icon: KeyRound,
}

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
  const { isInstructor, role, showAdminPanel, isAdmin } = useAuth()
  const { sidebarMuhabereBadgeCount } = useMuhabereNotify()
  const feedbackPanel = useFeedbackPanelOptional()
  const { groupState, toggleGroup } = useSidebarGroupState()
  const showAdminLink = showAdminPanel || isAdmin
  const systemTheme = NAV_GROUP_THEMES.system

  const extraGroups = useMemo(() => {
    const isInstructorUser = role === 'instructor' || isInstructor
    const next = NAV_GROUPS.map((g) => ({
      ...g,
      items: g.items.filter((item) => !TAB_ROUTES.has(item.to)),
    })).map((g) => ({ ...g, items: [...g.items] }))

    if (isInstructorUser) {
      let command = next.find((g) => g.id === 'command')
      if (!command) {
        const commandTemplate = NAV_GROUPS.find((g) => g.id === 'command')
        if (commandTemplate) {
          command = { ...commandTemplate, items: [] }
          next.push(command)
        }
      }
      if (command && !command.items.some((item) => item.to === instructorNavItem.to)) {
        command.items.push(instructorNavItem)
      }
    }

    return next.filter((g) => g.items.length > 0)
  }, [role, isInstructor])

  if (!open) return null

  const handleNavigate = () => {
    scheduleScrollAppToTop()
    onClose()
  }

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
          {extraGroups.map((group) => {
            const theme = getNavGroupTheme(group.id)
            const groupOpen = isSidebarGroupOpen(groupState, group.id)

            return (
              <SidebarGroupAccordion
                key={group.id}
                groupId={group.id}
                title={group.title}
                theme={theme}
                open={groupOpen}
                onToggle={() => toggleGroup(group.id)}
              >
                <ul className="flex flex-col gap-1 pb-2 pt-1">
                  {group.items.map((item) => (
                    <li key={item.to}>
                      <SidebarLink
                        to={item.to}
                        end={item.end}
                        label={item.label}
                        icon={item.icon}
                        state={item.state}
                        onNavigate={handleNavigate}
                        iconIdleClass={theme.iconIdleClass}
                        badgeCount={item.to === '/mesajlar' ? sidebarMuhabereBadgeCount : 0}
                        blinkIcon={item.to === '/mesajlar' && sidebarMuhabereBadgeCount > 0}
                      />
                    </li>
                  ))}
                </ul>
              </SidebarGroupAccordion>
            )
          })}
        </nav>

        <div className="border-t border-zinc-800/80 px-3 py-4">
          <SidebarGroupAccordion
            groupId="system"
            title="[ SİSTEM ]"
            theme={systemTheme}
            open={isSidebarGroupOpen(groupState, 'system')}
            onToggle={() => toggleGroup('system')}
          >
            <ul className="flex flex-col gap-1 pb-1 pt-1">
              {showAdminLink ? (
                <li>
                  <SidebarLink
                    to="/admin"
                    label="Admin Paneli"
                    icon={ShieldAlert}
                    onNavigate={handleNavigate}
                    iconIdleClass={systemTheme.iconIdleClass}
                  />
                </li>
              ) : null}
              <li>
                <SidebarActionButton
                  label="Şikayet & Öneri"
                  icon={MessageSquarePlus}
                  iconIdleClass="text-zinc-500 transition-colors group-hover:text-lime-400"
                  onClick={() => {
                    feedbackPanel?.openPanel()
                    handleNavigate()
                  }}
                />
              </li>
              {showAdminLink ? (
                <li>
                  <SidebarLink
                    to="/fiyatlandirma"
                    label="Fiyatlandırma"
                    icon={CreditCard}
                    onNavigate={handleNavigate}
                    iconIdleClass={systemTheme.iconIdleClass}
                  />
                </li>
              ) : null}
              <li>
                <SidebarLink
                  to="/ayarlar"
                  label="Ayarlar"
                  icon={Settings}
                  onNavigate={handleNavigate}
                  iconIdleClass={systemTheme.iconIdleClass}
                />
              </li>
              <li>
                <SidebarActionButton
                  label="Çıkış"
                  icon={LogOut}
                  disabled={!auth || signingOut}
                  iconIdleClass="text-zinc-500 transition-colors group-hover:text-red-400/80"
                  idleClass="sidebar-nav-link-idle text-zinc-400 hover:bg-zinc-800/40 hover:text-red-400/90"
                  onClick={() => onSignOut?.()}
                />
              </li>
            </ul>
          </SidebarGroupAccordion>
          <p className="mt-3 truncate px-2 font-mono text-[10px] text-zinc-600" title={userEmail}>
            {userEmail || 'Oturum yok'}
          </p>
        </div>
      </aside>
    </>
  )
}
