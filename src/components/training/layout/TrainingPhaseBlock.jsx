/**
 * @param {{
 *   title: string
 *   subtitle?: string
 *   headerExtra?: import('react').ReactNode
 *   children: import('react').ReactNode
 *   className?: string
 * }} props
 */
export default function TrainingPhaseBlock({
  title,
  subtitle,
  headerExtra,
  children,
  className = 'rounded border border-white/8 bg-app-bg/80 p-3',
}) {
  return (
    <div className={className}>
      {subtitle || headerExtra ? (
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2 border-b border-amber-500/20 pb-2">
          <div>
            <p className="font-mono-technical text-xs font-bold uppercase tracking-widest text-amber-500">
              {title}
            </p>
            {subtitle ? (
              <p className="mt-0.5 font-mono-technical text-[9px] text-app-text/50">{subtitle}</p>
            ) : null}
          </div>
          {headerExtra}
        </div>
      ) : (
        <p className="mb-3 border-b border-amber-500/20 pb-2 font-mono-technical text-xs font-bold uppercase tracking-widest text-amber-500">
          {title}
        </p>
      )}
      <div className="space-y-3">{children}</div>
    </div>
  )
}
