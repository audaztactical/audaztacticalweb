const btnSecondary =
  'rounded border border-white/15 px-2.5 py-1.5 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-app-text/75 hover:bg-white/5'
const btnAccent =
  'rounded border border-emerald-500/45 bg-emerald-500/10 px-2.5 py-1.5 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-emerald-400 hover:bg-emerald-500/15'

/**
 * @param {{
 *   value: string | null | undefined
 *   onChange: (unit: 'MOA' | 'MRAD' | null) => void
 *   labelClass?: string
 *   className?: string
 * }} props
 */
export default function ClickUnitSystemToggle({ value, onChange, labelClass, className = '' }) {
  const active = value === 'MOA' || value === 'MRAD' ? value : null

  return (
    <div className={`space-y-1 ${className}`.trim()}>
      <span
        className={
          labelClass ??
          'block font-mono-technical text-[9px] font-bold uppercase tracking-[0.18em] text-app-text/55'
        }
      >
        Birim Sistemi
      </span>
      <div className="flex gap-2">
        {/** @type {const} */ (['MOA', 'MRAD']).map((unit) => (
          <button
            key={unit}
            type="button"
            className={active === unit ? btnAccent : btnSecondary}
            aria-pressed={active === unit}
            onClick={() => onChange(active === unit ? null : unit)}
          >
            {unit}
          </button>
        ))}
      </div>
    </div>
  )
}
