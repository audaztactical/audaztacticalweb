import { useMemo, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { ATIS_DRILL_CUSTOM, ATIS_DRILL_LEVELS } from '../../lib/atisDrills'
import { useCompactShell } from '../../hooks/useCompactShell'

const selectClass =
  'dossier-blood-select w-full rounded border border-accent/35 bg-app-bg py-2 pl-2 pr-8 font-mono-technical text-sm uppercase text-app-text outline-none focus:border-accent/60 sm:text-[11px]'

/**
 * @param {{
 *   value: string
 *   onChange: (drillKey: string) => void
 *   required?: boolean
 * }} props
 */
export default function AtisDrillPicker({ value, onChange, required = false }) {
  const compact = useCompactShell()
  const [open, setOpen] = useState(false)

  const selectedLabel = useMemo(() => {
    if (!value) return ''
    if (value === ATIS_DRILL_CUSTOM) return '[+] YENİ ATIŞ TÜRÜ EKLE'
    for (const tier of ATIS_DRILL_LEVELS) {
      const hit = tier.drills.find((d) => d.id === value)
      if (hit) return hit.name
    }
    return ''
  }, [value])

  if (!compact) {
    return (
      <select
        className={selectClass}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      >
        <option value="">— DRILL SEÇİN —</option>
        {ATIS_DRILL_LEVELS.map((tier) => (
          <optgroup key={tier.level} label={tier.title}>
            {tier.drills.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </optgroup>
        ))}
        <option value={ATIS_DRILL_CUSTOM}>[+] YENİ ATIŞ TÜRÜ EKLE</option>
      </select>
    )
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded border border-accent/35 bg-app-bg px-3 py-2 font-mono-technical text-sm uppercase text-app-text outline-none focus:border-accent/60"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className={`min-w-0 truncate text-left ${value ? 'text-app-text' : 'text-app-text/45'}`}>
          {selectedLabel || '— DRILL SEÇİN —'}
        </span>
        <ChevronDown
          className={['size-4 shrink-0 text-app-text/45 transition-transform', open ? 'rotate-180' : ''].join(' ')}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          className="absolute left-0 right-0 z-30 mt-1 max-h-[min(52vh,17.5rem)] overflow-y-auto rounded border border-accent/35 bg-app-bg shadow-[0_12px_40px_-12px_rgba(0,0,0,0.85)]"
          role="listbox"
        >
          {ATIS_DRILL_LEVELS.map((tier) => (
            <div key={tier.level} className="border-b border-accent/10 last:border-b-0">
              <p className="sticky top-0 z-[1] bg-app-bg/95 px-3 py-1.5 font-mono-technical text-xs uppercase tracking-wider text-app-text/50 backdrop-blur-sm">
                {tier.title}
              </p>
              <ul className="list-none p-0">
                {tier.drills.map((d) => {
                  const active = value === d.id
                  return (
                    <li key={d.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={active}
                        className={[
                          'flex w-full items-center justify-between gap-3 px-3 py-2 text-left font-mono-technical text-sm uppercase transition-colors',
                          active
                            ? 'bg-accent/12 text-accent'
                            : 'text-app-text/85 hover:bg-white/[0.04]',
                        ].join(' ')}
                        onClick={() => {
                          onChange(d.id)
                          setOpen(false)
                        }}
                      >
                        <span className="min-w-0 flex-1 leading-snug">{d.name}</span>
                        <span
                          className={[
                            'flex size-4 shrink-0 items-center justify-center rounded-full border',
                            active ? 'border-accent bg-accent/20 text-accent' : 'border-app-text/25',
                          ].join(' ')}
                          aria-hidden
                        >
                          {active ? <Check className="size-2.5" strokeWidth={3} /> : null}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
          <button
            type="button"
            className={[
              'flex w-full items-center justify-between gap-3 border-t border-accent/15 px-3 py-2 text-left font-mono-technical text-sm uppercase transition-colors',
              value === ATIS_DRILL_CUSTOM ? 'bg-accent/12 text-accent' : 'text-app-text/70 hover:bg-white/[0.04]',
            ].join(' ')}
            onClick={() => {
              onChange(ATIS_DRILL_CUSTOM)
              setOpen(false)
            }}
          >
            [+] YENİ ATIŞ TÜRÜ EKLE
          </button>
        </div>
      ) : null}

      {required && !value ? (
        <input tabIndex={-1} className="sr-only" value="" required readOnly aria-hidden />
      ) : null}
    </div>
  )
}
