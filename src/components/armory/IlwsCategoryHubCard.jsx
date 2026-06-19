import MatrixWireVisualizer from './MatrixWireVisualizer'

/**
 * @param {{
 *   title: string
 *   onEnter: () => void
 *   modelVariant: 'pistol' | 'reddot' | 'cartridge'
 *   imageSrc: string
 *   imageAlt?: string
 * }} props
 */
export default function IlwsCategoryHubCard({ title, onEnter, modelVariant, imageSrc, imageAlt }) {
  return (
    <button
      type="button"
      onClick={onEnter}
      className="group flex w-full flex-col overflow-hidden rounded-lg border border-white/10 bg-black/40 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-[border-color,box-shadow] duration-300 hover:border-accent/35 hover:shadow-[0_0_24px_-8px_color-mix(in_srgb,var(--accent-color)_35%,transparent)]] focus:outline-none focus-visible:ring-1 focus-visible:ring-accent/50"
    >
      <h2 className="shrink-0 border-b border-white/10 bg-app-bg px-4 py-4 text-center font-display text-base font-bold uppercase tracking-[0.18em] text-app-text sm:text-lg">
        {title}
      </h2>
      <div className="cursor-pointer transition-transform duration-300 ease-out group-hover:scale-[1.02]">
        <MatrixWireVisualizer
          hubMode
          variant={modelVariant}
          imageSrc={imageSrc}
          imageAlt={imageAlt}
          label=""
        />
      </div>
    </button>
  )
}
