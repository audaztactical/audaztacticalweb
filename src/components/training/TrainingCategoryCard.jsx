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
          ? 'cursor-not-allowed border-white/10 bg-app-bg/60 opacity-45'
          : 'border-accent/18 bg-app-bg hover:border-accent/55 hover:shadow-[0_0_24px_-8px_color-mix(in_srgb,var(--accent-color)_35%,transparent)]] focus-visible:ring-accent/60 active:scale-[0.99]',
      ].join(' ')}
    >
      {highlightLabel ? (
        <span className="absolute right-3 top-3 z-30 rounded border border-accent/50 bg-accent/15 px-2 py-0.5 font-mono-technical text-[7px] font-bold uppercase tracking-[0.2em] text-accent shadow-[0_0_24px_-8px_color-mix(in_srgb,var(--accent-color)_35%,transparent)]]">
          {highlightLabel}
        </span>
      ) : null}

      <span className="pointer-events-none absolute left-2 top-2 z-20 h-3 w-3 border-l border-t border-accent/35 transition-colors group-hover:border-accent/80" />
      <span className="pointer-events-none absolute right-2 top-2 z-20 h-3 w-3 border-r border-t border-accent/35 transition-colors group-hover:border-accent/80" />
      <span className="pointer-events-none absolute bottom-2 left-2 z-20 h-3 w-3 border-b border-l border-accent/35 transition-colors group-hover:border-accent/80" />
      <span className="pointer-events-none absolute bottom-2 right-2 z-20 h-3 w-3 border-b border-r border-accent/35 transition-colors group-hover:border-accent/80" />

      <span className="pointer-events-none absolute left-1/2 top-[42%] z-[4] size-4 -translate-x-1/2 -translate-y-1/2 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <Crosshair className="size-4 text-accent/50" strokeWidth={1.25} aria-hidden />
      </span>

      <div className="relative shrink-0 border-b border-accent/12 bg-app-bg px-4 py-3.5">
        <p className="text-center font-display text-sm font-bold uppercase tracking-[0.28em] text-app-text sm:text-base">{title}</p>
        <p className="mt-1 text-center font-mono-technical text-[7px] uppercase tracking-[0.35em] text-accent/45 opacity-70 transition-opacity group-hover:opacity-100">
          {sectorLabel ?? `${opsCode} · OPS_SEKTÖR`}
        </p>
      </div>

      <div className="relative transition-transform duration-300 ease-out group-hover:scale-[1.02]">
        <div className="pointer-events-none absolute inset-0 z-[3] bg-[radial-gradient(ellipse_at_center,rgba(0,255,65,0.12)_0%,transparent_68%)] opacity-60 group-hover:opacity-100" />
        <div className="pointer-events-none absolute inset-0 z-[3] bg-accent/[0.04] mix-blend-screen opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <MatrixWireVisualizer hubMode variant={vizVariant} imageSrc={imageSrc} imageAlt={title} label="" />
      </div>

      <div className="flex items-center justify-between border-t border-accent/10 bg-app-bg px-3 py-2 font-mono-technical text-[7px] uppercase tracking-wider text-accent/40 transition-colors group-hover:border-accent/25 group-hover:text-accent/70">
        <span className="opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          LAT 41.02<span className="text-app-text/20"> · </span>LON 29.01
        </span>
        <span className="tabular-nums opacity-70 group-hover:opacity-100">
          BIT<span className="text-accent/60">_</span>9600
        </span>
        <span className="hidden opacity-0 transition-opacity duration-300 group-hover:inline group-hover:opacity-100 sm:inline">
          HD_LINK
        </span>
      </div>
    </button>
  )
}
