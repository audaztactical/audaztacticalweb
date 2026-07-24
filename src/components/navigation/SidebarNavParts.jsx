import { ChevronDown } from 'lucide-react'
import { SIDEBAR_GROUP_TITLE_BASE_CLASS } from '../../lib/sidebarGroupColors'

/**
 * @typedef {import('../../lib/sidebarGroupColors.js').NavGroupTheme} NavGroupTheme
 */

/**
 * @param {{
 *   groupId: import('../../lib/sidebarGroupState.js').SidebarNavGroupId | string
 *   title: string
 *   theme: NavGroupTheme
 *   open: boolean
 *   onToggle: () => void
 *   children: import('react').ReactNode
 *   headingClassName?: string
 * }} props
 */
export function SidebarGroupAccordion({
  groupId,
  title,
  theme,
  open,
  onToggle,
  children,
  headingClassName = '',
}) {
  return (
    <section
      aria-labelledby={`nav-group-${groupId}`}
      className={['mb-1 overflow-hidden rounded-sm', open ? theme.panelTintClass : ''].join(' ')}
    >
      <button
        type="button"
        id={`nav-group-${groupId}`}
        aria-expanded={open}
        aria-controls={`nav-group-panel-${groupId}`}
        onClick={onToggle}
        className={[
          SIDEBAR_GROUP_TITLE_BASE_CLASS,
          theme.titleClass,
          'sidebar-nav-group-heading flex w-full min-h-[44px] items-center justify-between gap-2 text-left',
          headingClassName,
        ].join(' ')}
      >
        <span
          className={['absolute bottom-2 left-0 top-2 w-[3px] rounded-full', theme.accentBarClass].join(
            ' ',
          )}
          aria-hidden
        />
        <span className="min-w-0 truncate pl-1.5">{title}</span>
        <ChevronDown
          className={[
            'size-3.5 shrink-0 opacity-70 transition-transform duration-200',
            open ? 'rotate-0' : '-rotate-90',
          ].join(' ')}
          strokeWidth={2}
          aria-hidden
        />
      </button>
      <div
        id={`nav-group-panel-${groupId}`}
        className={['sidebar-nav-group-panel', open ? 'sidebar-nav-group-panel-open' : ''].join(' ')}
      >
        <div className="sidebar-nav-group-panel-inner">{children}</div>
      </div>
    </section>
  )
}
