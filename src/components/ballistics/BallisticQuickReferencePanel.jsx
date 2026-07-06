import { useMemo, useState } from 'react'
import { Crosshair, Target } from 'lucide-react'
import { pickNearestResult } from './BallisticChartPanel.jsx'
import { isDualClickUnitDisplay, parseClickUnitSystem } from '../../lib/clickUnitSystem.js'

/** @typedef {'tik' | 'nisangah'} QuickRefMode */

const QUICK_REF_TARGETS = [100, 300, 500, 700, 900, 1200]

/**
 * @param {number} dropCm — pozitif = mermi LOS altında → dürbünü yukarı
 * @returns {{ arrow: string, label: string }}
 */
function elevationCue(dropCm) {
  const dialUp = dropCm >= 0
  return {
    arrow: dialUp ? '↑' : '↓',
    label: dialUp ? 'YUKARI' : 'AŞAĞI',
  }
}

/**
 * @param {number} windageCm — pozitif = sağ sapma → nişanı sola al
 * @returns {{ arrow: string, label: string }}
 */
function windCue(windageCm) {
  if (Math.abs(windageCm) < 0.05) {
    return { arrow: '·', label: '—' }
  }
  const aimLeft = windageCm > 0
  return {
    arrow: aimLeft ? '←' : '→',
    label: aimLeft ? 'SOLA' : 'SAĞA',
  }
}

/**
 * @param {import('../../lib/ballisticsEngine.js').BallisticsPointResult} result
 * @param {unknown} clickUnitSystem
 * @param {unknown} clickValueMoa
 * @param {unknown} clickValueMrad
 */
function resolveElevationWind(result, clickUnitSystem, clickValueMoa, clickValueMrad) {
  const unit = parseClickUnitSystem(clickUnitSystem)
  const moaClick = Number(clickValueMoa) > 0 ? Number(clickValueMoa) : null
  const mradClick = Number(clickValueMrad) > 0 ? Number(clickValueMrad) : null

  /** @type {'MOA' | 'MRAD'} */
  let angleUnit = 'MOA'
  if (unit === 'MRAD') angleUnit = 'MRAD'
  else if (unit === 'MOA') angleUnit = 'MOA'
  else if (mradClick && !moaClick) angleUnit = 'MRAD'
  else if (moaClick) angleUnit = 'MOA'

  const hasClickValue = angleUnit === 'MOA' ? Boolean(moaClick) : Boolean(mradClick)

  if (angleUnit === 'MOA') {
    return {
      angleUnit,
      hasClickValue,
      elevationValue: hasClickValue ? result.dropClicksMoa : result.dropMOA,
      windValue: hasClickValue ? result.windageClicksMoa : result.windageMOA,
    }
  }

  return {
    angleUnit,
    hasClickValue,
    elevationValue: hasClickValue ? result.dropClicksMrad : result.dropMRAD,
    windValue: hasClickValue ? result.windageClicksMrad : result.windageMRAD,
  }
}

/**
 * @param {number | null | undefined} value
 */
function formatClickCount(value) {
  if (value == null || !Number.isFinite(value)) return '—'
  const abs = Math.abs(value)
  return abs >= 10 ? abs.toFixed(0) : abs.toFixed(1)
}

/**
 * @param {number} cm
 */
function bodySizeHint(cm) {
  const v = Math.abs(cm)
  if (v < 4) return null
  if (v < 12) return '~bir el genişliği'
  if (v < 24) return '~omuz genişliği'
  if (v < 40) return '~yarım gövde'
  return null
}

/**
 * @param {{ active: boolean, children: import('react').ReactNode, onClick: () => void, label: string }} props
 */
function ModePill({ active, children, onClick, label }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={label}
      className={[
        'relative z-[1] flex-1 rounded-full px-3 py-1.5 font-mono-technical text-[9px] font-bold uppercase tracking-[0.2em] transition min-h-[32px]',
        active ? 'text-amber-950' : 'text-app-text/50 hover:text-app-text/75',
      ].join(' ')}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

/**
 * @param {{
 *   results: import('../../lib/ballisticsEngine.js').BallisticsPointResult[]
 *   activeDistance: number
 *   clickUnitSystem?: unknown
 *   clickValueMoa?: unknown
 *   clickValueMrad?: unknown
 * }} props
 */
export default function BallisticQuickReferencePanel({
  results,
  activeDistance,
  clickUnitSystem = null,
  clickValueMoa,
  clickValueMrad,
}) {
  const [mode, setMode] = useState(/** @type {QuickRefMode} */ ('tik'))

  const activeResult = useMemo(
    () => pickNearestResult(results, activeDistance),
    [results, activeDistance],
  )

  const summaryRows = useMemo(() => {
    return QUICK_REF_TARGETS.map((target) => {
      const row = pickNearestResult(results, target)
      if (!row) return null
      return { target, row }
    }).filter(Boolean)
  }, [results])

  if (!activeResult) return null

  const dropCm = activeResult.dropCm
  const windCm = activeResult.windageCm
  const elev = resolveElevationWind(activeResult, clickUnitSystem, clickValueMoa, clickValueMrad)
  const elevCue = elevationCue(dropCm)
  const wind = windCue(windCm)
  const dropHint = bodySizeHint(dropCm)
  const windHint = bodySizeHint(windCm)
  const unitLabel = elev.hasClickValue ? 'TİK' : elev.angleUnit

  return (
    <div className="shrink-0 overflow-hidden rounded-lg border border-amber-500/25 bg-gradient-to-br from-amber-950/20 via-black/55 to-emerald-950/15 shadow-[inset_0_1px_0_rgba(251,191,36,0.12)]">
      <div className="flex items-center justify-between gap-2 border-b border-amber-500/15 px-3 py-2">
        <p className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.26em] text-amber-400/85">
          Hızlı Referans
        </p>
        <div
          className="relative flex w-[9.5rem] shrink-0 rounded-full border border-white/10 bg-black/50 p-0.5"
          role="group"
          aria-label="Gösterim modu"
        >
          <span
            className={`pointer-events-none absolute inset-y-0.5 w-[calc(50%-2px)] rounded-full bg-gradient-to-r from-amber-400 to-amber-500 shadow-[0_0_12px_rgba(251,191,36,0.35)] transition-transform duration-200 ${
              mode === 'nisangah' ? 'translate-x-[calc(100%+2px)]' : 'translate-x-0.5'
            }`}
            aria-hidden
          />
          <ModePill active={mode === 'tik'} label="Tık modu" onClick={() => setMode('tik')}>
            TIK
          </ModePill>
          <ModePill active={mode === 'nisangah'} label="Nişangah modu" onClick={() => setMode('nisangah')}>
            NİŞAN
          </ModePill>
        </div>
      </div>

      <div className="grid gap-2 px-3 py-2.5 sm:grid-cols-[minmax(0,7rem)_1fr] sm:items-center sm:gap-3">
        <div className="rounded-md border border-amber-500/20 bg-black/40 px-2.5 py-2 text-center sm:py-2.5">
          <p className="font-mono-technical text-[7px] uppercase tracking-[0.2em] text-amber-500/65">
            Mesafe
          </p>
          <p className="mt-0.5 font-mono-technical text-2xl font-black tabular-nums leading-none text-amber-50 sm:text-3xl">
            {Math.round(activeDistance)}
            <span className="ml-0.5 text-sm font-bold text-amber-400/80">m</span>
          </p>
        </div>

        {mode === 'tik' ? (
          <div className="space-y-1.5">
            {!elev.hasClickValue ? (
              <p className="rounded border border-amber-500/20 bg-amber-950/30 px-2 py-1 font-mono-technical text-[9px] leading-snug text-amber-200/85">
                Tık değeri yok — {elev.angleUnit} gösteriliyor
                {!isDualClickUnitDisplay(clickUnitSystem) ? null : ' (birim seçin)'}
              </p>
            ) : null}
            <div className="flex items-baseline gap-2 font-mono-technical text-lg font-black leading-none text-slate-50 sm:text-xl">
              <span className="text-amber-300">{elevCue.arrow}</span>
              <span className="tabular-nums">{formatClickCount(elev.elevationValue)}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400/90">
                {unitLabel} {elevCue.label}
              </span>
            </div>
            <div className="flex items-baseline gap-2 font-mono-technical text-lg font-black leading-none text-slate-50 sm:text-xl">
              <span className="text-amber-300">{wind.arrow}</span>
              <span className="tabular-nums">{formatClickCount(elev.windValue)}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400/90">
                {unitLabel} {wind.label !== '—' ? wind.label : 'RÜZGAR YOK'}
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5 font-mono-technical text-sm font-bold leading-snug text-slate-50 sm:text-base">
            <p>
              Nişan noktasını hedefin{' '}
              <span className="text-amber-200">
                ~{Math.abs(dropCm).toFixed(1)} cm {elevCue.label}
              </span>
              ına alın
            </p>
            {dropHint ? <p className="text-[9px] font-normal text-app-text/45">{dropHint}</p> : null}
            <p>
              {wind.label !== '—' ? (
                <>
                  <span className="text-amber-200">
                    ~{Math.abs(windCm).toFixed(1)} cm {wind.label}
                  </span>
                  ına alın
                </>
              ) : (
                <span className="text-app-text/55">Rüzgar düzeltmesi gerekmez</span>
              )}
            </p>
            {windHint && wind.label !== '—' ? (
              <p className="text-[9px] font-normal text-app-text/45">{windHint}</p>
            ) : null}
          </div>
        )}
      </div>

      {summaryRows.length > 0 ? (
        <ul className="grid gap-1 border-t border-amber-500/15 px-2 py-2 sm:px-3">
          {summaryRows.map(({ target, row }, index) => {
            const e = resolveElevationWind(row, clickUnitSystem, clickValueMoa, clickValueMrad)
            const rowElev = elevationCue(row.dropCm)
            const rowWind = windCue(row.windageCm)
            const isActive = Math.abs(row.distance - activeDistance) < 1
            const unitShort = e.hasClickValue ? 'T' : e.angleUnit.slice(0, 1)

            return (
              <li
                key={target}
                className={[
                  'group flex items-center gap-2 rounded-md border px-2 py-1.5 font-mono-technical text-[10px] transition sm:text-[11px]',
                  isActive
                    ? 'border-amber-500/35 bg-amber-500/12 text-amber-50'
                    : index % 2 === 0
                      ? 'border-white/5 bg-white/[0.02] text-slate-300/90 hover:border-amber-500/20 hover:bg-amber-500/5'
                      : 'border-transparent bg-black/20 text-slate-300/80 hover:border-amber-500/20 hover:bg-amber-500/5',
                ].join(' ')}
              >
                <span
                  className={`flex size-5 shrink-0 items-center justify-center rounded border text-[8px] font-bold tabular-nums ${
                    isActive
                      ? 'border-amber-400/50 bg-amber-500/20 text-amber-200'
                      : 'border-white/10 bg-black/40 text-app-text/45 group-hover:border-amber-500/25'
                  }`}
                >
                  {mode === 'tik' ? (
                    <Target className="size-2.5 opacity-70" aria-hidden />
                  ) : (
                    <Crosshair className="size-2.5 opacity-70" aria-hidden />
                  )}
                </span>
                <span className="w-10 shrink-0 font-bold tabular-nums text-amber-400/90">{target}m</span>
                {mode === 'tik' ? (
                  <>
                    <span className="min-w-0 flex-1 truncate tabular-nums">
                      <span className="text-amber-300/90">{rowElev.arrow}</span>
                      {formatClickCount(e.elevationValue)}
                      {unitShort} {rowElev.label.slice(0, 3)}
                    </span>
                    <span className="shrink-0 tabular-nums text-slate-400/80">
                      <span className="text-amber-300/90">{rowWind.arrow}</span>
                      {formatClickCount(e.windValue)}
                      {unitShort}{' '}
                      {rowWind.label !== '—' ? rowWind.label.slice(0, 4) : '—'}
                    </span>
                  </>
                ) : (
                  <span className="min-w-0 flex-1 truncate tabular-nums">
                    {Math.abs(row.dropCm).toFixed(0)}cm {rowElev.label.slice(0, 3)}
                    <span className="mx-1 text-white/15">·</span>
                    {rowWind.label !== '—'
                      ? `${Math.abs(row.windageCm).toFixed(0)}cm ${rowWind.label.slice(0, 4)}`
                      : '—'}
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
