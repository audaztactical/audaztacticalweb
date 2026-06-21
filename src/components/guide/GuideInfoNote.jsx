/**
 * Tek paragraflık bilgi notu — durum veya önemli uyarılar için.
 *
 * @param {{ children: import('react').ReactNode, className?: string }} props
 */
export default function GuideInfoNote({ children, className = '' }) {
  return (
    <div
      className={[
        'rounded-lg border border-amber-500/30 bg-amber-950/20 px-4 py-3 font-mono-technical text-xs leading-relaxed text-app-text/85',
        className,
      ].join(' ')}
      role="note"
    >
      <p className="mb-1.5 font-mono-technical text-[9px] font-bold uppercase tracking-[0.24em] text-amber-400/90">
        Bilgi
      </p>
      {children}
    </div>
  )
}

/**
 * @param {{ children: import('react').ReactNode, label?: string, className?: string }} props
 */
export function GuidePrerequisiteCallout({ children, label = 'Ön koşul', className = '' }) {
  return (
    <div
      className={[
        'rounded-lg border border-amber-500/35 bg-amber-950/25 px-3 py-2.5 font-mono-technical text-xs leading-relaxed text-amber-100/90',
        className,
      ].join(' ')}
    >
      <span className="font-bold text-amber-400/95">{label}: </span>
      {children}
    </div>
  )
}
