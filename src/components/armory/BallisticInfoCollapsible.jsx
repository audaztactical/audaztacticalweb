import { useEffect, useState } from 'react'
import { ChevronDown } from 'lucide-react'

const labelClass =
  'block font-mono-technical text-xs font-bold uppercase tracking-[0.2em] text-app-text/55 sm:text-[8px]'
const inputClass =
  'w-full border-0 border-b border-white/20 bg-transparent py-1.5 px-2 font-mono-technical text-xs text-slate-100 outline-none ring-0 placeholder:text-app-text/45 focus:border-accent/55 sm:py-2 sm:px-3 sm:text-sm'
const selectClass =
  'dossier-blood-select w-full rounded border border-accent/30 bg-app-bg py-1.5 px-2 font-mono-technical text-xs text-app-text outline-none sm:py-2 sm:px-3 sm:text-sm'

/**
 * @param {{
 *   kind: 'weapon' | 'optic' | 'ammo'
 *   values: Record<string, string>
 *   onChange: (patch: Record<string, string>) => void
 *   autoExpand?: boolean
 *   className?: string
 * }} props
 */
export default function BallisticInfoCollapsible({
  kind,
  values,
  onChange,
  autoExpand = false,
  className = '',
}) {
  const [open, setOpen] = useState(autoExpand)

  useEffect(() => {
    if (autoExpand) setOpen(true)
  }, [autoExpand])

  const patch = (key, value) => onChange({ [key]: value })

  return (
    <div className={`rounded-lg border border-white/10 bg-black/25 ${className}`.trim()}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition hover:bg-white/[0.03]"
      >
        <span className="font-mono-technical text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-500/85">
          Balistik Bilgileri (Opsiyonel)
        </span>
        <ChevronDown
          className={`size-4 shrink-0 text-app-text/45 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>

      {open ? (
        <div className="space-y-2 border-t border-white/10 px-3 py-3">
          {kind === 'weapon' ? (
            <>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="block space-y-1">
                  <span className={labelClass}>NAMLU UZUNLUĞU (inç)</span>
                  <input
                    type="number"
                    min={0}
                    step="0.1"
                    className={inputClass}
                    value={values.barrelLength ?? ''}
                    onChange={(e) => patch('barrelLength', e.target.value)}
                    placeholder="16"
                  />
                </label>
                <label className="block space-y-1">
                  <span className={labelClass}>BURULMA (twist)</span>
                  <input
                    className={inputClass}
                    value={values.twistRate ?? ''}
                    onChange={(e) => patch('twistRate', e.target.value)}
                    placeholder="1:8"
                  />
                </label>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="block space-y-1">
                  <span className={labelClass}>NAMLU HIZI (fps)</span>
                  <input
                    type="number"
                    min={0}
                    className={inputClass}
                    value={values.muzzleVelocity ?? ''}
                    onChange={(e) => patch('muzzleVelocity', e.target.value)}
                    placeholder="2600"
                  />
                </label>
                <label className="block space-y-1">
                  <span className={labelClass}>SIGHT HEIGHT (cm)</span>
                  <input
                    type="number"
                    min={0}
                    step="0.1"
                    className={inputClass}
                    value={values.sightHeightDefault ?? ''}
                    onChange={(e) => patch('sightHeightDefault', e.target.value)}
                    placeholder="5"
                  />
                </label>
              </div>
            </>
          ) : null}

          {kind === 'optic' ? (
            <>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="block space-y-1">
                  <span className={labelClass}>BÜYÜTME</span>
                  <input
                    className={inputClass}
                    value={values.magnification ?? ''}
                    onChange={(e) => patch('magnification', e.target.value)}
                    placeholder="1-6x"
                  />
                </label>
                <label className="block space-y-1">
                  <span className={labelClass}>RETİKÜL TİPİ</span>
                  <input
                    className={inputClass}
                    value={values.reticleType ?? ''}
                    onChange={(e) => patch('reticleType', e.target.value)}
                    placeholder="MRAD"
                  />
                </label>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="block space-y-1">
                  <span className={labelClass}>TIK DEĞERİ (MOA)</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    className={inputClass}
                    value={values.clickValueMoa ?? ''}
                    onChange={(e) => patch('clickValueMoa', e.target.value)}
                    placeholder="0.25"
                  />
                </label>
                <label className="block space-y-1">
                  <span className={labelClass}>TIK DEĞERİ (MRAD)</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    className={inputClass}
                    value={values.clickValueMrad ?? ''}
                    onChange={(e) => patch('clickValueMrad', e.target.value)}
                    placeholder="0.1"
                  />
                </label>
              </div>
              <label className="block space-y-1">
                <span className={labelClass}>FFP / SFP</span>
                <select
                  className={selectClass}
                  value={values.ffpSfp ?? ''}
                  onChange={(e) => patch('ffpSfp', e.target.value)}
                >
                  <option value="">— Seçilmedi —</option>
                  <option value="FFP">FFP</option>
                  <option value="SFP">SFP</option>
                </select>
              </label>
            </>
          ) : null}

          {kind === 'ammo' ? (
            <>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="block space-y-1">
                  <span className={labelClass}>MERMİ AĞIRLIĞI (gr)</span>
                  <input
                    type="number"
                    min={0}
                    className={inputClass}
                    value={values.bulletWeight ?? ''}
                    onChange={(e) => patch('bulletWeight', e.target.value)}
                    placeholder="175"
                  />
                </label>
                <label className="block space-y-1">
                  <span className={labelClass}>ÇAP (inç)</span>
                  <input
                    type="number"
                    min={0}
                    step="0.001"
                    className={inputClass}
                    value={values.bulletDiameter ?? ''}
                    onChange={(e) => patch('bulletDiameter', e.target.value)}
                    placeholder="0.308"
                  />
                </label>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="block space-y-1">
                  <span className={labelClass}>BALİSTİK KATSAYI (BC)</span>
                  <input
                    type="number"
                    min={0}
                    step="0.001"
                    className={inputClass}
                    value={values.ballisticCoefficient ?? ''}
                    onChange={(e) => patch('ballisticCoefficient', e.target.value)}
                    placeholder="0.243"
                  />
                </label>
                <label className="block space-y-1">
                  <span className={labelClass}>BC MODELİ</span>
                  <select
                    className={selectClass}
                    value={values.bcModel ?? ''}
                    onChange={(e) => patch('bcModel', e.target.value)}
                  >
                    <option value="">— Seçilmedi —</option>
                    <option value="G1">G1</option>
                    <option value="G7">G7</option>
                  </select>
                </label>
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
