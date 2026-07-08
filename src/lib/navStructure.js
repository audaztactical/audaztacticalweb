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

/**
 * @typedef {Object} NavItemDef
 * @property {string} to
 * @property {string} labelKey
 * @property {import('lucide-react').LucideIcon} icon
 * @property {boolean} [end]
 * @property {Record<string, unknown>} [state]
 */

/**
 * @typedef {Object} NavGroupDef
 * @property {string} id
 * @property {string} titleKey
 * @property {NavItemDef[]} items
 */

/** @type {NavGroupDef[]} */
export const NAV_GROUP_DEFS = [
  {
    id: 'personal',
    titleKey: 'groups.personal',
    items: [
      { to: '/', end: true, labelKey: 'items.hqReturn', icon: Landmark, state: { skipIntro: true } },
      { to: '/dashboard', end: true, labelKey: 'items.home', icon: Home },
      { to: '/profil', labelKey: 'items.profile', icon: User },
      { to: '/mesajlar', labelKey: 'items.tacticalComms', icon: MessageSquare },
    ],
  },
  {
    id: 'audaz-network',
    titleKey: 'groups.audazNetwork',
    items: [
      { to: '/akademi', labelKey: 'items.audazAcademy', icon: PlayCircle },
      { to: '/forum', labelKey: 'items.briefingRoom', icon: MessagesSquare },
      { to: '/istihbarat', labelKey: 'items.globalIntel', icon: Globe },
    ],
  },
  {
    id: 'operations',
    titleKey: 'groups.operations',
    items: [
      { to: '/antrenman', labelKey: 'items.trainingOps', icon: Crosshair },
      { to: '/tccc', labelKey: 'items.tccc', icon: HeartPulse },
      { to: '/cephanelik', labelKey: 'items.armory', icon: Shield },
      { to: '/balistik', labelKey: 'items.ballistics', icon: Target },
    ],
  },
  {
    id: 'command',
    titleKey: 'groups.command',
    items: [{ to: '/basarilar', labelKey: 'items.achievements', icon: BarChart3 }],
  },
  {
    id: 'usage-guide',
    titleKey: 'groups.usageGuide',
    items: [{ to: '/kilavuz', end: true, labelKey: 'items.usageGuide', icon: BookOpen }],
  },
]

/** @type {NavItemDef} */
export const INSTRUCTOR_NAV_DEF = {
  to: '/egitmen-komuta',
  labelKey: 'items.instructorPanel',
  icon: KeyRound,
}

/** @type {{ to: string; labelKey: string; icon: import('lucide-react').LucideIcon; end?: boolean }[]} */
export const BOTTOM_TAB_DEFS = [
  { to: '/dashboard', labelKey: 'tabs.home', icon: Home, end: true },
  { to: '/antrenman', labelKey: 'tabs.training', icon: Crosshair },
  { to: '/mesajlar', labelKey: 'tabs.messages', icon: MessageSquare },
  { to: '/cephanelik', labelKey: 'tabs.armory', icon: Shield },
  { to: '/balistik', labelKey: 'tabs.ballistics', icon: Target },
  { to: '/profil', labelKey: 'tabs.profile', icon: User },
]

export const BOTTOM_TAB_ROUTES = new Set(BOTTOM_TAB_DEFS.map((t) => t.to))

/** @type {Map<string, string>} */
export const ROUTE_GROUP_MAP = new Map(
  NAV_GROUP_DEFS.flatMap((group) => group.items.map((item) => [item.to, group.id])),
)

/**
 * @param {import('i18next').TFunction} t
 */
export function buildNavGroups(t) {
  return NAV_GROUP_DEFS.map((group) => ({
    id: group.id,
    title: t(group.titleKey),
    items: group.items.map((item) => ({
      to: item.to,
      end: item.end,
      state: item.state,
      icon: item.icon,
      label: t(item.labelKey),
    })),
  }))
}

/**
 * @param {import('i18next').TFunction} t
 */
export function buildInstructorNavItem(t) {
  return {
    to: INSTRUCTOR_NAV_DEF.to,
    icon: INSTRUCTOR_NAV_DEF.icon,
    label: t(INSTRUCTOR_NAV_DEF.labelKey),
  }
}

/**
 * @param {import('i18next').TFunction} t
 */
export function buildBottomTabItems(t) {
  return BOTTOM_TAB_DEFS.map((item) => ({
    to: item.to,
    end: item.end,
    icon: item.icon,
    label: t(item.labelKey),
  }))
}

/**
 * @param {import('i18next').TFunction} t
 */
export function getSystemGroupTitle(t) {
  return t('groups.system')
}
