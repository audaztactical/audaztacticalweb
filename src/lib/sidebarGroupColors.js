/** @typedef {import('./sidebarGroupState.js').SidebarNavGroupId} SidebarNavGroupId */

/**
 * @typedef {Object} NavGroupTheme
 * @property {string} titleClass
 * @property {string} iconIdleClass
 * @property {string} accentBarClass  sol renk şeridi
 * @property {string} panelTintClass  açık panel hafif ton
 */

/** Grup başlığı — masaüstü + mobil hamburger menü ortak stil */
export const SIDEBAR_GROUP_TITLE_BASE_CLASS =
  'relative border-b px-3 pb-2 pt-5 font-mono text-[9px] font-bold uppercase tracking-[0.22em] first:pt-2'

/**
 * Taktiksel renk kodları — kategoriler birbirine karışmaz.
 * personal=yeşil · network=neon turuncu · ops=amber · komuta=cyan · kılavuz=sky · sistem=rose
 * @type {Record<SidebarNavGroupId, NavGroupTheme>}
 */
export const NAV_GROUP_THEMES = {
  personal: {
    titleClass: 'text-emerald-400 border-emerald-500/45',
    iconIdleClass: 'text-emerald-500/55 group-hover:text-emerald-400',
    accentBarClass: 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.55)]',
    panelTintClass: 'border-l border-emerald-500/25 bg-emerald-950/20',
  },
  'audaz-network': {
    titleClass: 'text-orange-400 border-orange-500/45',
    iconIdleClass: 'text-orange-500/55 group-hover:text-orange-300',
    accentBarClass: 'bg-orange-400 shadow-[0_0_10px_rgba(251,146,60,0.55)]',
    panelTintClass: 'border-l border-orange-500/25 bg-orange-950/20',
  },
  operations: {
    titleClass: 'text-amber-300 border-amber-400/50',
    iconIdleClass: 'text-amber-500/55 group-hover:text-amber-300',
    accentBarClass: 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.55)]',
    panelTintClass: 'border-l border-amber-500/25 bg-amber-950/15',
  },
  command: {
    titleClass: 'text-cyan-300 border-cyan-400/50',
    iconIdleClass: 'text-cyan-500/55 group-hover:text-cyan-300',
    accentBarClass: 'bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.55)]',
    panelTintClass: 'border-l border-cyan-500/25 bg-cyan-950/20',
  },
  'usage-guide': {
    titleClass: 'text-sky-300 border-sky-400/45',
    iconIdleClass: 'text-sky-500/55 group-hover:text-sky-300',
    accentBarClass: 'bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.5)]',
    panelTintClass: 'border-l border-sky-500/25 bg-sky-950/20',
  },
  system: {
    titleClass: 'text-rose-300 border-rose-400/45',
    iconIdleClass: 'text-rose-500/55 group-hover:text-rose-300',
    accentBarClass: 'bg-rose-400 shadow-[0_0_10px_rgba(251,113,133,0.5)]',
    panelTintClass: 'border-l border-rose-500/25 bg-rose-950/15',
  },
}

/**
 * @param {string} groupId
 * @returns {NavGroupTheme}
 */
export function getNavGroupTheme(groupId) {
  return NAV_GROUP_THEMES[/** @type {SidebarNavGroupId} */ (groupId)] ?? NAV_GROUP_THEMES.personal
}
