/** @typedef {{ id: string, color: string, nameKey: string, funcKey: string, modulesKey: string, shortKey: string }} LandingRegion */
/** @typedef {{ icon: string, titleKey: string, descKey: string, regionId: string, soon?: boolean }} LandingModule */
/** @typedef {{ me: boolean, htmlKey: string }} LandingChatLine */

export const REGIONS = /** @type {LandingRegion[]} */ ([
  { id: 'frontal', color: '#5b8def', nameKey: 'brain.regions.frontal.name', funcKey: 'brain.regions.frontal.func', modulesKey: 'brain.regions.frontal.modules', shortKey: 'brain.regions.frontal.short' },
  { id: 'motor', color: '#3fbf6f', nameKey: 'brain.regions.motor.name', funcKey: 'brain.regions.motor.func', modulesKey: 'brain.regions.motor.modules', shortKey: 'brain.regions.motor.short' },
  { id: 'parietal', color: '#c9b52c', nameKey: 'brain.regions.parietal.name', funcKey: 'brain.regions.parietal.func', modulesKey: 'brain.regions.parietal.modules', shortKey: 'brain.regions.parietal.short' },
  { id: 'occipital', color: '#e8862a', nameKey: 'brain.regions.occipital.name', funcKey: 'brain.regions.occipital.func', modulesKey: 'brain.regions.occipital.modules', shortKey: 'brain.regions.occipital.short' },
  { id: 'temporal', color: '#36b9c9', nameKey: 'brain.regions.temporal.name', funcKey: 'brain.regions.temporal.func', modulesKey: 'brain.regions.temporal.modules', shortKey: 'brain.regions.temporal.short' },
  { id: 'hippocampus', color: '#e0609a', nameKey: 'brain.regions.hippocampus.name', funcKey: 'brain.regions.hippocampus.func', modulesKey: 'brain.regions.hippocampus.modules', shortKey: 'brain.regions.hippocampus.short' },
  { id: 'cerebellum', color: '#f0a53a', nameKey: 'brain.regions.cerebellum.name', funcKey: 'brain.regions.cerebellum.func', modulesKey: 'brain.regions.cerebellum.modules', shortKey: 'brain.regions.cerebellum.short' },
  { id: 'stem', color: '#e5534b', nameKey: 'brain.regions.stem.name', funcKey: 'brain.regions.stem.func', modulesKey: 'brain.regions.stem.modules', shortKey: 'brain.regions.stem.short' },
])

export const MARQUEE_KEYS = [
  'marquee.items.shooting',
  'marquee.items.cqb',
  'marquee.items.fof',
  'marquee.items.vbss',
  'marquee.items.tccc',
  'marquee.items.ballistics',
  'marquee.items.dryFire',
  'marquee.items.timer',
  'marquee.items.aar',
  'marquee.items.armory',
]

export const MODULE_ICONS = {
  t: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M1 12h4M19 12h4"/>',
  c: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/>',
  b: '<path d="M3 20 20 3M14 3h6v6"/><circle cx="7" cy="17" r="2"/>',
  a: '<path d="M12 3 3 7v6c0 5 4 8 9 9 5-1 9-4 9-9V7z"/>',
  m: '<path d="M12 21s-7-4.5-7-11a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 6.5-7 11-7 11z"/><path d="M12 9v5M9.5 11.5h5"/>',
  n: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
  r: '<path d="M4 5h16v10H8l-4 4z"/>',
  d: '<path d="M5 3h11l3 3v15H5z"/><path d="M8 9h8M8 13h8M8 17h5"/>',
}

export const MODULES = /** @type {LandingModule[]} */ ([
  { icon: 't', titleKey: 'modules.items.training.title', descKey: 'modules.items.training.desc', regionId: 'motor' },
  { icon: 'c', titleKey: 'modules.items.timer.title', descKey: 'modules.items.timer.desc', regionId: 'cerebellum' },
  { icon: 'b', titleKey: 'modules.items.ballistics.title', descKey: 'modules.items.ballistics.desc', regionId: 'parietal' },
  { icon: 'a', titleKey: 'modules.items.armory.title', descKey: 'modules.items.armory.desc', regionId: 'parietal' },
  { icon: 'm', titleKey: 'modules.items.tccc.title', descKey: 'modules.items.tccc.desc', regionId: 'stem' },
  { icon: 'n', titleKey: 'modules.items.news.title', descKey: 'modules.items.news.desc', regionId: 'occipital' },
  { icon: 'r', titleKey: 'modules.items.comms.title', descKey: 'modules.items.comms.desc', regionId: 'temporal' },
  { icon: 'd', titleKey: 'modules.items.aar.title', descKey: 'modules.items.aar.desc', regionId: 'frontal', soon: true },
])

export const CHAT_LINES = /** @type {LandingChatLine[]} */ ([
  { me: false, htmlKey: 'noro.chat.lines.0' },
  { me: false, htmlKey: 'noro.chat.lines.1' },
  { me: true, htmlKey: 'noro.chat.lines.2' },
  { me: false, htmlKey: 'noro.chat.lines.3' },
])

export const FOCUS_CHIPS = [
  { key: 'auth.register.focus.shooting', color: '#3fbf6f' },
  { key: 'auth.register.focus.cqb', color: '#3fbf6f' },
  { key: 'auth.register.focus.tccc', color: '#e5534b' },
  { key: 'auth.register.focus.ballistics', color: '#c9b52c' },
  { key: 'auth.register.focus.dryFire', color: '#f0a53a' },
  { key: 'auth.register.focus.fof', color: '#5b8def' },
]

export const REGIONS_BY_ID = Object.fromEntries(REGIONS.map((r) => [r.id, r]))
