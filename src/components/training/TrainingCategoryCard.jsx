import { Crosshair } from 'lucide-react'
import MatrixWireVisualizer from '../armory/MatrixWireVisualizer'

/**
 * @param {{
 *   title: string
 *   imageSrc: string
 *   opsCode: string
 *   sectorLabel?: string
 *   vizVariant: 'pistol' | 'reddot' | 'cartridge'
 *   onSelect: () => void
 *   disabled?: boolean
 *   disabledHint?: string
 *   highlightLabel?: string
 * }} props
 */
export default function TrainingCategoryCard({
  title,
  imageSrc,
  opsCode,
  sectorLabel,
  vizVariant,
  onSelect,
  disabled = false,
  disabledHint,
  highlightLabel,
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onSelect}
      disabled={disabled}
      title={disabled ? disabledHint : undefined}
      className={[
        'training-op-card group relative flex w-full flex-col overflow-hidden rounded-lg border text-left shadow-[inset_0_1px_0_rgba(0,255,65,0.06)] transition-[border-color,box-shadow,transform] duration-300 focus:outline-none focus-visible:ring-1',
        disabled
          ? 'cursor-not-allowed border-white/10 bg-[#0a0a0a]/60 opacity-45'
          : 'border-[#00FF41]/18 bg-[#0a0a0a] hover:border-[#00FF41]/55 hover:shadow-[0_0_36px_-10px_rgba(0,255,65,0.45)] focus-visible:ring-[#00FF41]/60 active:scale-[0.99]',
      ].join(' ')}
    >
      {highlightLabel ? (
        <span className="absolute right-3 top-3 z-30 rounded border border-[#00FF41]/50 bg-[#00FF41]/15 px-2 py-0.5 font-mono-technical text-[7px] font-bold uppercase tracking-[0.2em] text-[#00FF41] shadow-[0_0_18px_-6px_rgba(0,255,65,0.55)]">
          {highlightLabel}
        </span>
      ) : null}

      <span className="pointer-events-none absolute left-2 top-2 z-20 h-3 w-3 border-l border-t border-[#00FF41]/35 transition-colors group-hover:border-[#00FF41]/80" />
      <span className="pointer-events-none absolute right-2 top-2 z-20 h-3 w-3 border-r border-t border-[#00FF41]/35 transition-colors group-hover:border-[#00FF41]/80" />
      <span className="pointer-events-none absolute bottom-2 left-2 z-20 h-3 w-3 border-b border-l border-[#00FF41]/35 transition-colors group-hover:border-[#00FF41]/80" />
      <span className="pointer-events-none absolute bottom-2 right-2 z-20 h-3 w-3 border-b border-r border-[#00FF41]/35 transition-colors group-hover:border-[#00FF41]/80" />

      <span className="pointer-events-none absolute left-1/2 top-[42%] z-[4] size-4 -translate-x-1/2 -translate-y-1/2 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <Crosshair className="size-4 text-[#00FF41]/50" strokeWidth={1.25} aria-hidden />
      </span>

      <div className="relative shrink-0 border-b border-[#00FF41]/12 bg-[#080808] px-4 py-3.5">
        <p className="text-center font-display text-sm font-bold uppercase tracking-[0.28em] text-white sm:text-base">{title}</p>
        <p className="mt-1 text-center font-mono-technical text-[7px] uppercase tracking-[0.35em] text-[#00FF41]/45 opacity-70 transition-opacity group-hover:opacity-100">
          {sectorLabel ?? `${opsCode} · OPS_SEKTÖR`}
        </p>
      </div>

      <div className="relative transition-transform duration-300 ease-out group-hover:scale-[1.02]">
        <div className="pointer-events-none absolute inset-0 z-[3] bg-[radial-gradient(ellipse_at_center,rgba(0,255,65,0.12)_0%,transparent_68%)] opacity-60 group-hover:opacity-100" />
        <div className="pointer-events-none absolute inset-0 z-[3] bg-[#00FF41]/[0.04] mix-blend-screen opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <MatrixWireVisualizer hubMode variant={vizVariant} imageSrc={imageSrc} imageAlt={title} label="" />
      </div>

      <div className="flex items-center justify-between border-t border-[#00FF41]/10 bg-[#050805] px-3 py-2 font-mono-technical text-[7px] uppercase tracking-wider text-[#00FF41]/40 transition-colors group-hover:border-[#00FF41]/25 group-hover:text-[#00FF41]/70">
        <span className="opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          LAT 41.02<span className="text-white/20"> · </span>LON 29.01
        </span>
        <span className="tabular-nums opacity-70 group-hover:opacity-100">
          BIT<span className="text-[#00FF41]/60">_</span>9600
        </span>
        <span className="hidden opacity-0 transition-opacity duration-300 group-hover:inline group-hover:opacity-100 sm:inline">
          HD_LINK
        </span>
      </div>
    </button>
  )
}
