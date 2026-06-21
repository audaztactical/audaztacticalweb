import TacticalPanel from '../../ui/TacticalPanel'

/**
 * @param {{
 *   title: string
 *   titleClassName?: string
 *   corners?: 'top' | 'bottom' | null
 *   panelClassName?: string
 *   bodyClassName?: string
 *   children: import('react').ReactNode
 * }} props
 */
export default function TrainingTerminalPanel({
  title,
  titleClassName = 'text-accent/90',
  corners = 'top',
  panelClassName = 'relative flex flex-col overflow-hidden border-accent/20 bg-app-bg/95 p-0',
  bodyClassName = 'flex flex-1 flex-col space-y-4 p-4 sm:p-5',
  children,
}) {
  return (
    <TacticalPanel className={panelClassName}>
      {corners === 'top' ? (
        <>
          <span className="pointer-events-none absolute left-2 top-2 z-10 h-4 w-4 border-l border-t border-accent/40" />
          <span className="pointer-events-none absolute right-2 top-2 z-10 h-4 w-4 border-r border-t border-accent/40" />
        </>
      ) : null}
      {corners === 'bottom' ? (
        <>
          <span className="pointer-events-none absolute bottom-2 left-2 z-10 h-4 w-4 border-b border-l border-accent/40" />
          <span className="pointer-events-none absolute bottom-2 right-2 z-10 h-4 w-4 border-b border-r border-accent/40" />
        </>
      ) : null}
      <p
        className={`border-b border-accent/15 bg-app-bg px-4 py-2 font-mono-technical text-[9px] font-bold uppercase tracking-[0.28em] ${titleClassName}`}
      >
        {title}
      </p>
      <div className={bodyClassName}>{children}</div>
    </TacticalPanel>
  )
}
