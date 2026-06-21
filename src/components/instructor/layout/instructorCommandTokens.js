/** Eğitmen Komuta Paneli — CQB terminal dili token'ları */

/** @typedef {'atis' | 'cqb' | 'fof' | 'vbss' | 'tccc'} InstructorSectorId */

/** @type {Record<InstructorSectorId, { panelBorder: string; title: string; corner: string; icon: string; badge: string }>} */
export const SECTOR_ACCENT = {
  atis: {
    panelBorder: 'border-amber-500/30',
    title: 'text-amber-400',
    corner: 'border-amber-400/45',
    icon: 'text-amber-400/90',
    badge: 'border-amber-500/40 bg-amber-950/30 text-amber-300',
  },
  cqb: {
    panelBorder: 'border-accent/30',
    title: 'text-accent/90',
    corner: 'border-accent/40',
    icon: 'text-accent/85',
    badge: 'border-accent/45 bg-accent/10 text-accent',
  },
  fof: {
    panelBorder: 'border-red-500/30',
    title: 'text-red-400',
    corner: 'border-red-400/45',
    icon: 'text-red-400/90',
    badge: 'border-red-500/40 bg-red-950/35 text-red-300',
  },
  vbss: {
    panelBorder: 'border-sky-500/30',
    title: 'text-sky-400',
    corner: 'border-sky-400/45',
    icon: 'text-sky-400/90',
    badge: 'border-sky-500/40 bg-sky-950/35 text-sky-300',
  },
  tccc: {
    panelBorder: 'border-lime-500/30',
    title: 'text-lime-400',
    corner: 'border-lime-400/45',
    icon: 'text-lime-400/90',
    badge: 'border-lime-500/40 bg-lime-950/35 text-lime-300',
  },
}

/**
 * @param {InstructorSectorId | undefined} sector
 * @returns {typeof SECTOR_ACCENT.atis}
 */
export function resolveSectorAccent(sector) {
  if (sector && SECTOR_ACCENT[sector]) return SECTOR_ACCENT[sector]
  return SECTOR_ACCENT.cqb
}

/* —— Sayfa kabuğu —— */

export const icPage = 'relative mx-auto w-full min-w-0 max-w-[min(96rem,100%)]'

export const icHeaderEyebrow =
  'font-mono-technical text-[9px] font-bold uppercase tracking-[0.28em] text-accent/80'

export const icHeaderTitle =
  'font-mono-technical text-2xl font-bold uppercase tracking-tight text-app-text sm:text-3xl'

export const icHeaderSubtitle = 'mt-2 max-w-2xl text-sm leading-relaxed text-app-text/55'

export const icNav =
  'flex w-full max-w-full shrink-0 flex-row gap-1.5 overflow-x-auto overscroll-x-contain rounded-xl border border-accent/25 bg-black/60 p-1.5 [-webkit-overflow-scrolling:touch] lg:w-56 lg:flex-col lg:overflow-visible'

/** @param {boolean} active */
export const icNavBtn = (active) =>
  [
    'instructor-nav-link flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-lg border px-3 py-2.5 text-left font-mono-technical text-[10px] font-bold uppercase tracking-wider transition duration-200',
    active
      ? 'instructor-nav-link-active border-accent/60 bg-accent/15 text-accent shadow-[0_0_24px_-8px_color-mix(in_srgb,var(--accent-color)_35%,transparent)]'
      : 'border-transparent text-app-text/55 hover:border-accent/25 hover:bg-accent/8 hover:text-app-text/85',
  ].join(' ')

export const icMainPanel =
  'min-w-0 flex-1 rounded-xl border border-accent/20 bg-app-bg/90 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-md sm:p-6'

/* —— Tablo —— */

export const icTableWrap = 'overflow-x-auto rounded-lg border border-accent/20 bg-black/40'

export const icTable = 'w-full min-w-[480px] border-collapse text-sm'

export const icTh =
  'border-b border-accent/15 px-3 py-2 text-left font-mono-technical text-[8px] font-bold uppercase tracking-[0.18em] text-app-text/55'

export const icTd = 'border-b border-white/5 px-3 py-2.5 text-app-text/80'

export const icTrHover = 'transition-colors hover:bg-accent/5'

/* —— Durum rozetleri —— */

export const icStatusOk =
  'rounded border border-emerald-500/35 bg-emerald-500/15 px-2 py-0.5 font-mono-technical text-[9px] font-bold uppercase text-emerald-400 shadow-[0_0_12px_-4px_rgba(52,211,153,0.35)]'

export const icStatusWarn =
  'rounded border border-amber-500/35 bg-amber-500/15 px-2 py-0.5 font-mono-technical text-[9px] font-bold uppercase text-amber-400'

export const icStatusFail =
  'rounded border border-red-500/35 bg-red-500/15 px-2 py-0.5 font-mono-technical text-[9px] font-bold uppercase text-red-400'

/* —— Boş durum —— */

export const icEmptyCell =
  'border border-dashed border-accent/20 bg-black/25 px-4 py-10 text-center'

export const icEmptyTitle = 'font-mono-technical text-[10px] font-bold uppercase tracking-wider text-app-text/70'

export const icEmptyDesc = 'mt-1 font-mono-technical text-[9px] uppercase text-app-text/45'

/* —— Canlı şerit —— */

export const icLiveStrip =
  'mb-3 flex items-center gap-2 rounded border border-emerald-500/35 bg-emerald-950/25 px-3 py-1.5 font-mono-technical text-[9px] font-bold uppercase tracking-[0.22em] text-emerald-400'

export const icLiveDot = 'size-2 shrink-0 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'

/* —— Form / buton (kademeli geçiş) —— */

export const icLabel = 'font-mono-technical text-[8px] font-bold uppercase tracking-[0.22em] text-app-text/55'

export const icHelperText = 'mt-1 font-mono-technical text-[9px] italic leading-snug text-app-text/45'

export const icBtnPrimary =
  'inline-flex w-full items-center justify-center gap-2 rounded border border-accent/55 bg-accent/12 px-4 py-2.5 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-accent shadow-[0_0_24px_-8px_color-mix(in_srgb,var(--accent-color)_35%,transparent)] transition hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-40'

export const icBtnGhost =
  'inline-flex items-center gap-1.5 rounded border border-accent/25 px-2 py-1 font-mono-technical text-[8px] font-bold uppercase text-app-text/55 transition hover:border-accent/45 hover:bg-accent/8 hover:text-accent'

export const icMsgOk =
  'font-mono-technical text-[9px] font-bold uppercase text-emerald-400'

export const icMsgErr =
  'font-mono-technical text-[9px] font-bold uppercase text-red-400'

export const icCriteriaBox =
  'rounded border border-accent/15 bg-black/35 px-3 py-2.5 font-mono-technical text-[10px] text-app-text/70'
