import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

/**
 * @param {{
 *   id: string
 *   title: string
 *   color: string
 *   icon: import('lucide-react').LucideIcon
 *   defaultOpen?: boolean
 *   children: import('react').ReactNode
 * }} props
 */
export default function SettingsAccordionSection({
  id,
  title,
  color,
  icon: SectionIcon,
  defaultOpen = false,
  children,
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section className="w-full border-b border-white/10 last:border-b-0">
      <button
        type="button"
        id={`settings-section-${id}`}
        aria-expanded={open}
        aria-controls={`settings-panel-${id}`}
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center gap-3 border-l-[3px] bg-black/20 px-4 py-4 text-left transition hover:bg-white/[0.03]"
        style={{ borderLeftColor: color }}
      >
        <SectionIcon className="size-5 shrink-0" strokeWidth={1.75} style={{ color }} aria-hidden />
        <span
          className="font-mono-technical text-xs font-bold uppercase tracking-[0.28em]"
          style={{ color }}
        >
          [ {title} ]
        </span>
        <ChevronDown
          className={['ml-auto size-5 shrink-0 transition-transform duration-200', open ? 'rotate-180' : ''].join(
            ' ',
          )}
          strokeWidth={1.75}
          style={{ color }}
          aria-hidden
        />
      </button>
      {open ? (
        <div id={`settings-panel-${id}`} className="w-full px-4 pb-5 pt-1" role="region" aria-labelledby={`settings-section-${id}`}>
          {children}
        </div>
      ) : null}
    </section>
  )
}
