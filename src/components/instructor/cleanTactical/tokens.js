/** Clean Tactical — paylaşılan Tailwind sınıfları */

export const ctPage = 'relative mx-auto max-w-[min(96rem,100%)]'

export const ctHeaderEyebrow = 'text-xs font-medium uppercase tracking-widest text-zinc-500'
export const ctHeaderTitle = 'text-2xl font-semibold tracking-tight text-zinc-100 sm:text-3xl'
export const ctHeaderSubtitle = 'mt-2 max-w-2xl text-sm leading-relaxed text-zinc-500'

export const ctNav =
  'flex w-full max-w-full shrink-0 flex-row gap-1 overflow-x-auto overscroll-x-contain rounded-xl border border-zinc-800 bg-zinc-900/50 p-1.5 [-webkit-overflow-scrolling:touch] lg:w-56 lg:flex-col lg:overflow-visible'

export const ctNavBtn = (active) =>
  [
    'flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors duration-200',
    active
      ? 'bg-zinc-800 text-zinc-100'
      : 'text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-300',
  ].join(' ')

export const ctMainPanel = 'min-w-0 flex-1 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-6'

export const ctBentoGrid = 'grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5'
export const ctBentoSpan7 = 'lg:col-span-7'
export const ctBentoSpan5 = 'lg:col-span-5'
export const ctBentoSpan12 = 'lg:col-span-12'
export const ctBentoSpan6 = 'lg:col-span-6'
export const ctBentoSpan4 = 'lg:col-span-4'

export const ctCard =
  'rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-5'

export const ctCardHeader =
  'mb-4 flex items-center gap-2 border-b border-zinc-800 pb-3'

export const ctCardTitle = 'text-sm font-semibold text-zinc-100'
export const ctCardDesc = 'text-xs text-zinc-500'

export const ctLabel = 'text-xs font-medium text-zinc-500'
export const ctHelperText = 'mt-1 text-xs italic leading-snug text-zinc-500'
export const ctInput =
  'w-full rounded-lg border border-zinc-700 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-600/40'

export const ctSelect =
  'w-full rounded-lg border border-zinc-700 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors focus:border-zinc-500 focus:ring-1 focus:ring-zinc-600/40'

export const ctBtnPrimary =
  'inline-flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-100 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-45'

export const ctBtnSecondary =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-sm font-medium text-zinc-300 transition hover:border-zinc-600 hover:bg-zinc-800 disabled:opacity-45'

export const ctBtnGhost =
  'inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-300'

export const ctStatusOk = 'rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-400'
export const ctStatusWarn = 'rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-400'
export const ctStatusFail = 'rounded-md bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-400'

export const ctMsgOk = 'text-xs font-medium text-emerald-400'
export const ctMsgErr = 'text-xs font-medium text-red-400'

export const ctCriteriaBox =
  'rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2.5 text-xs text-zinc-400'

export const ctBackBtn =
  'inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-1.5 text-xs font-medium text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-200'

export const ctTableWrap = 'overflow-x-auto rounded-lg border border-zinc-800'
export const ctTable = 'w-full min-w-[480px] border-collapse text-sm'
export const ctTh =
  'border-b border-zinc-800 px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-zinc-500'
export const ctTd = 'border-b border-zinc-800/80 px-3 py-2.5 text-zinc-300'
export const ctTrHover = 'transition-colors hover:bg-zinc-800/40'

/**
 * Köprü — Eğitmen Komuta kabuğu token'ları (kademeli geçiş).
 * Mevcut ct* tanımları korunur; yeni ekranlar ic* alias'larını tercih eder.
 */
export {
  SECTOR_ACCENT,
  resolveSectorAccent,
  icPage,
  icHeaderEyebrow,
  icHeaderTitle,
  icHeaderSubtitle,
  icNav,
  icNavBtn,
  icMainPanel,
  icTableWrap,
  icTable,
  icTh,
  icTd,
  icTrHover,
  icStatusOk,
  icStatusWarn,
  icStatusFail,
  icEmptyCell,
  icEmptyTitle,
  icEmptyDesc,
  icLiveStrip,
  icLiveDot,
  icLabel,
  icHelperText,
  icBtnPrimary,
  icBtnGhost,
  icMsgOk,
  icMsgErr,
  icCriteriaBox,
} from '../layout/instructorCommandTokens'
