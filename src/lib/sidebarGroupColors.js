/** @typedef {import('./sidebarGroupState.js').SidebarNavGroupId} SidebarNavGroupId */

/**
 * @typedef {Object} NavGroupTheme
 * @property {string} titleClass
 * @property {string} iconIdleClass
 */

/** Grup başlığı — masaüstü + mobil hamburger menü ortak stil */
export const SIDEBAR_GROUP_TITLE_BASE_CLASS =
  'border-b px-3 pb-2 pt-5 font-mono text-[9px] font-bold uppercase tracking-[0.22em] first:pt-2'

/** @type {Record<SidebarNavGroupId, NavGroupTheme>} */
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

/**
 * @param {string} groupId
 * @returns {NavGroupTheme}
 */
export function getNavGroupTheme(groupId) {
  return NAV_GROUP_THEMES[/** @type {SidebarNavGroupId} */ (groupId)] ?? NAV_GROUP_THEMES.personal
}
