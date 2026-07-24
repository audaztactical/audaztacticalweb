import { ChevronDown } from 'lucide-react'

/**
 * Sol panel akordiyon bölümü — varsayılan kapalı.
 *
 * @param {{
 *   id: string
 *   title: string
 *   theme: import('../lib/dryFireToolbarThemes').ToolbarAccentTheme
 *   open: boolean
 *   onToggle: () => void
 *   icon?: import('react').ReactNode
 *   badge?: import('react').ReactNode
 *   children: import('react').ReactNode
 * }} props
 */
export default function DryFireToolbarAccordion({
  id,
  title,
  theme,
  open,
  onToggle,
  icon,
  badge,
  children,
}) {
  const panelId = `df-acc-panel-${id}`
  const btnId = `df-acc-btn-${id}`

  return (
    <section
      className={['overflow-hidden rounded-sm border', theme.border].join(' ')}
      data-accordion={id}
    >
      <button
        id={btnId}
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className={[
          'flex w-full min-h-10 items-center gap-2 px-2.5 py-2 text-left transition',
          theme.headerBg,
          theme.headerText,
          'hover:brightness-110',
        ].join(' ')}
      >
        {icon ? <span className="shrink-0 opacity-90">{icon}</span> : null}
        <span className="min-w-0 flex-1 truncate font-mono-technical text-[8px] font-bold uppercase tracking-[0.2em]">
          {title}
        </span>
        {badge ? <span className="shrink-0">{badge}</span> : null}
        <ChevronDown
          className={[
            'size-3.5 shrink-0 opacity-80 transition-transform duration-200',
            open ? 'rotate-180' : 'rotate-0',
          ].join(' ')}
          strokeWidth={1.75}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          id={panelId}
          role="region"
          aria-labelledby={btnId}
          className={['border-t px-2.5 py-2.5', theme.bodyBorder, theme.bodyBg].join(' ')}
        >
          {children}
        </div>
      ) : null}
    </section>
  )
}
