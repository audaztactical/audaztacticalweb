/**
 * @typedef {Object} ToolbarAccentTheme
 * @property {string} hex
 * @property {string} border
 * @property {string} headerBg
 * @property {string} headerText
 * @property {string} bodyBg
 * @property {string} bodyBorder
 * @property {string} field
 * @property {string} chip
 * @property {string} chipActive
 * @property {string} muted
 * @property {string} accentSoft
 * @property {string} rangeAccent
 */

/** @type {Record<string, ToolbarAccentTheme>} */
export const TOOLBAR_ACCENT = {
  timer: {
    hex: '#facc15',
    border: 'border-amber-400/40',
    headerBg: 'bg-amber-500/10',
    headerText: 'text-amber-300',
    bodyBg: 'bg-amber-950/25',
    bodyBorder: 'border-amber-400/25',
    field:
      'w-full rounded-sm border border-amber-400/40 bg-[#0a0a0b] px-2 py-1.5 font-mono-technical text-sm font-bold tabular-nums text-amber-300 outline-none focus:border-amber-300/80',
    chip: 'border-amber-400/30 text-amber-200/70 hover:border-amber-400/50 hover:text-amber-200',
    chipActive: 'border-amber-400/60 bg-amber-500/15 text-amber-300',
    muted: 'text-amber-200/45',
    accentSoft: 'bg-amber-500/10 border-amber-400/35 text-amber-300',
    rangeAccent: 'accent-amber-400',
  },
  distance: {
    hex: '#34d399',
    border: 'border-emerald-400/40',
    headerBg: 'bg-emerald-500/10',
    headerText: 'text-emerald-300',
    bodyBg: 'bg-emerald-950/25',
    bodyBorder: 'border-emerald-400/25',
    field:
      'w-full rounded-sm border border-emerald-400/40 bg-[#0a0a0b] px-2 py-1.5 font-mono-technical text-sm font-bold tabular-nums text-emerald-300 outline-none focus:border-emerald-300/80',
    chip: 'border-emerald-400/30 text-emerald-200/70 hover:border-emerald-400/50 hover:text-emerald-200',
    chipActive: 'border-emerald-400/60 bg-emerald-500/15 text-emerald-300',
    muted: 'text-emerald-200/45',
    accentSoft: 'bg-emerald-500/10 border-emerald-400/35 text-emerald-300',
    rangeAccent: 'accent-emerald-400',
  },
  orientation: {
    hex: '#60a5fa',
    border: 'border-sky-400/40',
    headerBg: 'bg-sky-500/10',
    headerText: 'text-sky-300',
    bodyBg: 'bg-sky-950/30',
    bodyBorder: 'border-sky-400/25',
    field:
      'w-full rounded-sm border border-sky-400/40 bg-[#0a0a0b] px-2 py-1.5 font-mono-technical text-sm font-bold tabular-nums text-sky-300 outline-none focus:border-sky-300/80',
    chip: 'border-sky-400/30 text-sky-200/70 hover:border-sky-400/50 hover:text-sky-200',
    chipActive: 'border-sky-400/60 bg-sky-500/15 text-sky-300',
    muted: 'text-sky-200/45',
    accentSoft: 'bg-sky-500/10 border-sky-400/35 text-sky-300',
    rangeAccent: 'accent-sky-400',
  },
  diagonal: {
    hex: '#fb923c',
    border: 'border-orange-400/40',
    headerBg: 'bg-orange-500/10',
    headerText: 'text-orange-300',
    bodyBg: 'bg-orange-950/30',
    bodyBorder: 'border-orange-400/25',
    field:
      'w-full rounded-sm border border-orange-400/40 bg-[#0a0a0b] px-2 py-1.5 font-mono-technical text-sm font-bold tabular-nums text-orange-300 outline-none focus:border-orange-300/80',
    chip: 'border-orange-400/30 text-orange-200/70 hover:border-orange-400/50 hover:text-orange-200',
    chipActive: 'border-orange-400/60 bg-orange-500/15 text-orange-300',
    muted: 'text-orange-200/45',
    accentSoft: 'bg-orange-500/10 border-orange-400/35 text-orange-300',
    rangeAccent: 'accent-orange-400',
  },
  eye: {
    hex: '#2dd4bf',
    border: 'border-teal-400/40',
    headerBg: 'bg-teal-500/10',
    headerText: 'text-teal-300',
    bodyBg: 'bg-teal-950/30',
    bodyBorder: 'border-teal-400/25',
    field:
      'w-full rounded-sm border border-teal-400/40 bg-[#0a0a0b] px-2 py-1.5 font-mono-technical text-sm font-bold tabular-nums text-teal-300 outline-none focus:border-teal-300/80',
    chip: 'border-teal-400/30 text-teal-200/70 hover:border-teal-400/50 hover:text-teal-200',
    chipActive: 'border-teal-400/60 bg-teal-500/15 text-teal-300',
    muted: 'text-teal-200/45',
    accentSoft: 'bg-teal-500/10 border-teal-400/35 text-teal-300',
    rangeAccent: 'accent-teal-400',
  },
  rings: {
    hex: '#a78bfa',
    border: 'border-violet-400/40',
    headerBg: 'bg-violet-500/10',
    headerText: 'text-violet-300',
    bodyBg: 'bg-violet-950/30',
    bodyBorder: 'border-violet-400/25',
    field:
      'w-full rounded-sm border border-violet-400/40 bg-[#0a0a0b] px-2 py-1.5 font-mono-technical text-sm font-bold tabular-nums text-violet-300 outline-none focus:border-violet-300/80',
    chip: 'border-violet-400/30 text-violet-200/70 hover:border-violet-400/50 hover:text-violet-200',
    chipActive: 'border-violet-400/60 bg-violet-500/15 text-violet-300',
    muted: 'text-violet-200/45',
    accentSoft: 'bg-violet-500/10 border-violet-400/35 text-violet-300',
    rangeAccent: 'accent-violet-400',
  },
  graphs: {
    hex: '#f472b6',
    border: 'border-pink-400/40',
    headerBg: 'bg-pink-500/10',
    headerText: 'text-pink-300',
    bodyBg: 'bg-pink-950/30',
    bodyBorder: 'border-pink-400/25',
    field:
      'w-full rounded-sm border border-pink-400/40 bg-[#0a0a0b] px-2 py-1.5 font-mono-technical text-sm font-bold tabular-nums text-pink-300 outline-none focus:border-pink-300/80',
    chip: 'border-pink-400/30 text-pink-200/70 hover:border-pink-400/50 hover:text-pink-200',
    chipActive: 'border-pink-400/60 bg-pink-500/15 text-pink-300',
    muted: 'text-pink-200/45',
    accentSoft: 'bg-pink-500/10 border-pink-400/35 text-pink-300',
    rangeAccent: 'accent-pink-400',
  },
}
