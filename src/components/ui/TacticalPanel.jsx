/**
 * Cam panel + HUD L-köşe detayları, isteğe bağlı tarama animasyonu.
 * `...rest` ile role, tabIndex, onClick vb. aktarılabilir.
 */
export default function TacticalPanel({ children, className = '', scanning = false, ...rest }) {
  const base = `relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-shadow ${scanning ? 'hud-scanning ring-1 ring-accent/25' : ''}`
  return (
    <div {...rest} className={`${base} ${className}`.trim()}>
      <span className="pointer-events-none absolute left-2 top-2 z-0 size-4 border-l-2 border-t-2 border-accent/55" aria-hidden />
      <span className="pointer-events-none absolute right-2 top-2 z-0 size-4 border-r-2 border-t-2 border-accent/55" aria-hidden />
      <span className="pointer-events-none absolute bottom-2 left-2 z-0 size-4 border-b-2 border-l-2 border-accent/40" aria-hidden />
      <span className="pointer-events-none absolute bottom-2 right-2 z-0 size-4 border-b-2 border-r-2 border-accent/40" aria-hidden />
      <div className="relative z-10 flex h-full min-h-0 flex-1 flex-col">{children}</div>
    </div>
  )
}
