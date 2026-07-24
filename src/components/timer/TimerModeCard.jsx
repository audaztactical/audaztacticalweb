/**
 * Timer mod kartı — TCCC CategoryCard dilinde (ikon + durum pill + başlık + alt önizleme kutusu).
 * @param {{
 *   title: string
 *   description: string
 *   opsCode: string
 *   icon: import('lucide-react').LucideIcon
 *   available?: boolean
 *   stubLabel?: string
 *   activeLabel?: string
 *   onSelect: () => void
 * }} props
 */
export default function TimerModeCard({
  title,
  description,
  opsCode,
  icon,
  available = true,
  stubLabel = '',
  activeLabel = '',
  onSelect,
}) {
  const ModeIcon = icon
  const isStub = !available

  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        'group relative flex w-full flex-col rounded-xl border border-slate-800 bg-slate-950 p-5 text-left',
        'transition-all duration-200 hover:-translate-y-1',
        'focus:outline-none focus-visible:ring-1 focus-visible:ring-[#facc15]/55',
        isStub
          ? 'opacity-80 hover:border-slate-600 hover:shadow-[0_8px_32px_-12px_rgba(148,163,184,0.12)]'
          : 'hover:border-[#facc15]/45 hover:shadow-[0_8px_32px_-12px_rgba(250,204,21,0.28)]',
      ].join(' ')}
    >
      <span
        className="pointer-events-none absolute left-2 top-2 h-3 w-3 border-l border-t border-slate-600/70 transition-colors group-hover:border-[#facc15]/55"
        aria-hidden
      />
      <span
        className="pointer-events-none absolute right-2 top-2 h-3 w-3 border-r border-t border-slate-600/70 transition-colors group-hover:border-[#facc15]/55"
        aria-hidden
      />
      <span
        className="pointer-events-none absolute bottom-2 left-2 h-3 w-3 border-b border-l border-slate-600/70 transition-colors group-hover:border-[#facc15]/55"
        aria-hidden
      />
      <span
        className="pointer-events-none absolute bottom-2 right-2 h-3 w-3 border-b border-r border-slate-600/70 transition-colors group-hover:border-[#facc15]/55"
        aria-hidden
      />

      <div className="mb-4 flex items-start justify-between gap-3">
        <span
          className={[
            'flex size-10 shrink-0 items-center justify-center rounded-lg border',
            isStub
              ? 'border-slate-800 bg-slate-900 text-app-text/45'
              : 'border-[#facc15]/30 bg-[#facc15]/10 text-[#facc15]',
          ].join(' ')}
          aria-hidden
        >
          <ModeIcon className="size-5" strokeWidth={1.5} />
        </span>
        <span
          className={[
            'rounded border px-2 py-0.5 font-mono text-[8px] font-bold uppercase tracking-widest',
            isStub
              ? 'border-slate-800 bg-slate-900 text-app-text/45 group-hover:border-slate-700'
              : 'border-slate-800 bg-slate-900 text-app-text/55 group-hover:border-[#facc15]/35 group-hover:text-[#facc15]',
          ].join(' ')}
        >
          {isStub ? stubLabel : activeLabel}
        </span>
      </div>

      <h3 className="font-mono text-sm font-bold uppercase leading-snug tracking-wide text-slate-100">
        {title}
      </h3>
      <p className="mt-2 font-mono text-[11px] leading-relaxed text-app-text/55">{description}</p>

      <div className="mt-5">
        <div
          className={[
            'rounded-lg px-4 py-3',
            isStub
              ? 'border border-slate-700/50 bg-slate-900/40'
              : 'border border-[#facc15]/35 bg-[rgba(250,204,21,0.08)]',
          ].join(' ')}
        >
          <p
            className={[
              'font-mono text-[9px] font-bold uppercase tracking-[0.2em]',
              isStub ? 'text-app-text/40' : 'text-[#facc15]/80',
            ].join(' ')}
          >
            {opsCode}
          </p>
          <p
            className={[
              'mt-1 font-mono text-[10px] uppercase tracking-wide',
              isStub ? 'text-app-text/40' : 'text-app-text/60',
            ].join(' ')}
          >
            {isStub ? stubLabel : activeLabel}
          </p>
        </div>
      </div>
    </button>
  )
}
