/** Admin panel — paylaşılan tablo / kart / rozet sınıfları (HUD token'ları). */

export const ADMIN_TABLE_WRAP =
  'overflow-x-auto rounded-lg border border-white/10 bg-black/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'

export const ADMIN_TABLE = 'min-w-full border-collapse text-left text-sm'

export const ADMIN_TABLE_HEAD =
  'border-b border-accent/25 bg-gradient-to-b from-black/60 to-black/40 font-mono-technical text-[10px] uppercase tracking-wider text-accent/90'

export const ADMIN_TABLE_TH = 'px-4 py-3 font-bold border-r border-white/[0.06] last:border-r-0'

export const ADMIN_TABLE_ROW =
  'border-b border-white/[0.06] transition-colors hover:bg-accent/[0.05] even:bg-white/[0.015]'

export const ADMIN_TABLE_TD =
  'px-4 py-3 align-top border-r border-white/[0.03] last:border-r-0 text-app-text/90'

export const ADMIN_EMPTY_STATE =
  'flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-white/10 bg-black/20 px-6 py-10 text-center'

export const ADMIN_SUMMARY_BAR =
  'mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-accent/20 bg-black/40 px-4 py-3 font-mono-technical text-[11px]'

export const ADMIN_FORM_CARD =
  'rounded-lg border border-white/10 bg-black/30 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]'

export const ADMIN_FORM_CARD_HEADER =
  'mb-3 flex items-center gap-2.5 border-b border-white/[0.06] pb-2.5'

export const ADMIN_PANEL_LIST_HEADER =
  'border-b border-white/10 bg-gradient-to-r from-black/50 to-black/30 px-4 py-2.5 font-mono-technical text-[10px] font-bold uppercase tracking-widest text-accent/80'

export const ADMIN_BADGE =
  'inline-block rounded border px-2 py-0.5 font-mono-technical text-[10px] font-bold uppercase tracking-wider'

export const ADMIN_BTN_PRIMARY =
  'inline-flex items-center gap-2 rounded-lg border border-accent/50 bg-accent/15 px-4 py-2.5 font-display text-sm font-bold uppercase tracking-wider text-accent transition hover:bg-accent/25 disabled:opacity-50'

export const ADMIN_BTN_GHOST =
  'inline-flex items-center gap-1.5 rounded border border-white/10 px-2 py-1 font-mono-technical text-[10px] uppercase tracking-wider text-app-text/70 transition hover:border-white/20 hover:bg-white/5 disabled:opacity-50'

export const ADMIN_BTN_DANGER =
  'inline-flex items-center gap-1.5 rounded border border-orange-500/30 px-2 py-1 font-mono-technical text-[10px] uppercase tracking-wider text-orange-400 transition hover:border-orange-400/50 hover:bg-orange-950/30 disabled:opacity-50'

export const ADMIN_BTN_PREVIEW =
  'inline-flex items-center gap-2 rounded-lg border border-sky-500/35 bg-sky-950/25 px-3 py-1.5 font-mono-technical text-[10px] font-bold uppercase tracking-wider text-sky-300 transition hover:border-sky-400/50 hover:bg-sky-950/40'

/** @type {Record<string, string>} */
export const PUBLISH_TONE = {
  public: 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300',
  private: 'border-zinc-600/50 bg-zinc-900/50 text-zinc-400',
}

/** @type {Record<string, string>} */
export const ENABLED_TONE = {
  on: 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300',
  off: 'border-zinc-600/50 bg-zinc-900/50 text-zinc-400',
}

/** @type {Record<string, string>} */
export const VIDEO_SOURCE_TONE = {
  youtube: 'border-red-500/35 bg-red-950/25 text-red-300',
  vimeo: 'border-sky-500/35 bg-sky-950/25 text-sky-300',
  other: 'border-accent/35 bg-accent/10 text-accent/90',
}
