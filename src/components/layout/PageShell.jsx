import HudTicker from '../ui/HudTicker'
import TacticalPanel from '../ui/TacticalPanel'

export default function PageShell({ title, subtitle, headerAction, children }) {
  return (
    <div className="relative mx-auto max-w-5xl space-y-6">
      <header className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <p className="font-mono-technical text-[10px] font-semibold uppercase tracking-[0.35em] text-accent">
              <span className="text-app-text/35">[ </span>
              SECTOR
              <span className="text-app-text/35"> ]</span>
            </p>
            <HudTicker className="hidden sm:block" />
          </div>
          <h1 className="font-display mt-1 text-2xl font-bold tracking-[0.12em] text-app-text sm:text-3xl md:text-4xl">{title}</h1>
          {subtitle ? <p className="max-w-2xl font-mono-technical text-xs leading-relaxed text-app-text/55">{subtitle}</p> : null}
        </div>
        {headerAction ? <div className="shrink-0">{headerAction}</div> : null}
      </header>
      <HudTicker className="sm:hidden" />
      <TacticalPanel className="min-h-[min(50vh,280px)] p-6" scanning={false}>
        {children}
      </TacticalPanel>
    </div>
  )
}
