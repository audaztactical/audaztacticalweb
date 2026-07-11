import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { GUIDE_NAV_TREE } from '../../data/guideNavTree'

/**
 * @param {{
 *   activeId: string
 *   onSelect: (id: string) => void
 *   className?: string
 * }} props
 */
export default function GuideNav({ activeId, onSelect, className = '' }) {
  const { t } = useTranslation('guide')
  const [expandedGroups, setExpandedGroups] = useState(
    /** @type {Record<string, boolean>} */ ({}),
  )

  const toggleGroup = useCallback((groupId) => {
    setExpandedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }))
  }, [])

  return (
    <nav className={['space-y-1', className].join(' ')} aria-label={t('ui.navAria')}>
      {GUIDE_NAV_TREE.map((group) => {
        const open = expandedGroups[group.id] === true
        return (
          <div key={group.id} className="rounded-lg border border-amber-500/15 bg-black/30">
            <button
              type="button"
              onClick={() => toggleGroup(group.id)}
              className="flex w-full items-center justify-between px-3 py-2.5 text-left font-mono-technical text-[9px] font-bold uppercase tracking-[0.18em] text-amber-500/85 transition hover:bg-amber-950/20"
              aria-expanded={open}
            >
              {t(`nav.groups.${group.id}`)}
              <span className="text-amber-500/50">{open ? '−' : '+'}</span>
            </button>
            {open && group.children ? (
              <ul className="border-t border-amber-500/10 pb-2 pt-1">
                {group.children.map((item) => {
                  const active = item.id === activeId
                  return (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        onClick={(e) => {
                          e.preventDefault()
                          onSelect(item.id)
                        }}
                        className={[
                          'block border-l-2 py-2 pl-3 pr-2 font-mono text-[11px] tracking-wide transition',
                          active
                            ? 'border-amber-500 bg-amber-950/35 text-amber-300'
                            : 'border-transparent text-zinc-400 hover:border-amber-500/40 hover:bg-amber-950/15 hover:text-zinc-200',
                        ].join(' ')}
                        aria-current={active ? 'location' : undefined}
                      >
                        {t(`nav.items.${item.id}`)}
                      </a>
                    </li>
                  )
                })}
              </ul>
            ) : null}
          </div>
        )
      })}
    </nav>
  )
}
