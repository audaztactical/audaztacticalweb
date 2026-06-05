import { TCCC_CATEGORY_TABS } from '../../lib/tcccHealthConstants'

/** @typedef {import('../../lib/tcccHealthConstants').TcccCategory} TcccCategory */

/**
 * @param {{
 *   active: TcccCategory
 *   onChange: (id: TcccCategory) => void
 *   disabled?: boolean
 * }} props
 */
export default function TcccCategoryTabs({ active, onChange, disabled = false }) {
  return (
    <nav
      aria-label="TCCC kategori sekmeleri"
      className="flex gap-1 overflow-x-auto rounded-xl border border-[#00FF41]/20 bg-black/60 p-1 shadow-[inset_0_0_24px_rgba(0,255,65,0.04)]"
    >
      {TCCC_CATEGORY_TABS.map((tab) => {
        const on = active === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(tab.id)}
            className={[
              'shrink-0 rounded-lg px-3 py-2.5 font-mono-technical text-[9px] font-bold uppercase tracking-[0.14em] transition sm:px-4 sm:text-[10px]',
              on
                ? 'border border-[#00FF41]/45 bg-[#00FF41]/12 text-[#00FF41] shadow-[0_0_16px_rgba(0,255,65,0.2)]'
                : 'border border-transparent text-slate-500 hover:border-white/10 hover:text-slate-300',
            ].join(' ')}
            aria-current={on ? 'page' : undefined}
          >
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.short}</span>
          </button>
        )
      })}
    </nav>
  )
}
