import { useMemo, useState } from 'react'
import { pickNearestResult } from './BallisticChartPanel.jsx'
import { isDualClickUnitDisplay, parseClickUnitSystem } from '../../lib/clickUnitSystem.js'

/** @typedef {'tik' | 'nisangah'} QuickRefMode */

const QUICK_REF_TARGETS = [100, 300, 500, 700, 900, 1200]

const modeBtnClass = (active) =>
  [
    'rounded border px-3 py-1.5 font-mono-technical text-[10px] font-bold uppercase tracking-[0.18em] transition min-h-[36px]',
    active
      ? 'border-amber-500/55 bg-amber-500/15 text-amber-200'
      : 'border-white/15 bg-black/40 text-app-text/55 hover:border-white/25',
  ].join(' ')

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
 * @param {number} dropCm
 */
function elevationDirection(dropCm) {
  return dropCm >= 0 ? 'YUKARI' : 'AŞAĞI'
}

/**
 * @param {number} windageCm — pozitif = sağ sapma → nişanı sola al
 */
function windDirection(windageCm) {
  if (Math.abs(windageCm) < 0.05) return '—'
  return windageCm > 0 ? 'SOLA' : 'SAĞA'
}

/**
 * @param {number} windageCm
 */
function windArrow(windageCm) {
  if (Math.abs(windageCm) < 0.05) return '·'
  return windageCm > 0 ? '←' : '→'
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
  const elevDir = elevationDirection(dropCm)
  const windDir = windDirection(windCm)
  const dropHint = bodySizeHint(dropCm)
  const windHint = bodySizeHint(windCm)

  return (
    <div className="shrink-0 rounded-lg border-2 border-amber-500/45 bg-gradient-to-b from-amber-950/30 to-black/70 p-3 shadow-[0_0_24px_-8px_rgba(245,158,11,0.35)] sm:p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono-technical text-[9px] font-bold uppercase tracking-[0.28em] text-amber-400/90">
          HIZLI REFERANS · ACİL DURUM
        </p>
        <div className="flex gap-1.5">
          <button type="button" className={modeBtnClass(mode === 'tik')} onClick={() => setMode('tik')}>
            TIK
          </button>
          <button
            type="button"
            className={modeBtnClass(mode === 'nisangah')}
            onClick={() => setMode('nisangah')}
          >
            NİŞAN
          </button>
        </div>
      </div>

      <div className="mb-3 rounded border border-amber-500/35 bg-black/50 px-4 py-3 text-center">
        <p className="font-mono-technical text-[10px] uppercase tracking-[0.22em] text-amber-500/75">
          Aktif mesafe
        </p>
        <p className="mt-1 font-mono-technical text-4xl font-black tabular-nums tracking-tight text-amber-100 sm:text-5xl">
          {Math.round(activeDistance)} m
        </p>
      </div>

      {mode === 'tik' ? (
        <div className="space-y-3">
          {!elev.hasClickValue ? (
            <p className="rounded border border-amber-500/30 bg-amber-950/40 px-2 py-1.5 font-mono-technical text-[10px] leading-relaxed text-amber-200/90">
              Tık değeri girilmedi; sadece açısal değer gösteriliyor:{' '}
              <span className="font-bold text-amber-100">{elev.angleUnit}</span>
              {!isDualClickUnitDisplay(clickUnitSystem) ? null : (
                <span className="text-amber-200/70"> (birim sistemi seçin)</span>
              )}
            </p>
          ) : null}
          <p className="font-mono-technical text-2xl font-black leading-tight text-slate-50 sm:text-3xl">
            ↑ {formatClickCount(elev.elevationValue)}{' '}
            {elev.hasClickValue ? 'TİK' : elev.angleUnit} {elevDir}
          </p>
          <p className="font-mono-technical text-2xl font-black leading-tight text-slate-50 sm:text-3xl">
            {windArrow(windCm)} {formatClickCount(elev.windValue)}{' '}
            {elev.hasClickValue ? 'TİK' : elev.angleUnit}{' '}
            {windDir !== '—' ? windDir : 'RÜZGAR YOK'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="font-mono-technical text-xl font-black leading-snug text-slate-50 sm:text-2xl">
            Nişan noktasını hedefin{' '}
            <span className="text-amber-200">~{Math.abs(dropCm).toFixed(1)} cm {elevDir}</span>
            ına alın
          </p>
          {dropHint ? (
            <p className="font-mono-technical text-[10px] text-app-text/45">{dropHint}</p>
          ) : null}
          <p className="font-mono-technical text-xl font-black leading-snug text-slate-50 sm:text-2xl">
            {windDir !== '—' ? (
              <>
                <span className="text-amber-200">~{Math.abs(windCm).toFixed(1)} cm {windDir}</span>
                ına alın
              </>
            ) : (
              <span className="text-app-text/55">Rüzgar düzeltmesi gerekmez</span>
            )}
          </p>
          {windHint && windDir !== '—' ? (
            <p className="font-mono-technical text-[10px] text-app-text/45">{windHint}</p>
          ) : null}
        </div>
      )}

      {summaryRows.length > 0 ? (
        <ul className="mt-4 space-y-1 border-t border-amber-500/25 pt-3">
          {summaryRows.map(({ target, row }) => {
            const e = resolveElevationWind(row, clickUnitSystem, clickValueMoa, clickValueMrad)
            const dDir = elevationDirection(row.dropCm)
            const wDir = windDirection(row.windageCm)
            const compact =
              mode === 'tik'
                ? `${target}m · ↑${formatClickCount(e.elevationValue)}${e.hasClickValue ? 'T' : e.angleUnit.slice(0, 1)} ${dDir.slice(0, 3)} · ${windArrow(row.windageCm)}${formatClickCount(e.windValue)}${e.hasClickValue ? 'T' : e.angleUnit.slice(0, 1)} ${wDir !== '—' ? wDir.slice(0, 4) : '—'}`
                : `${target}m · ${Math.abs(row.dropCm).toFixed(0)}cm ${dDir.slice(0, 3)} · ${wDir !== '—' ? `${Math.abs(row.windageCm).toFixed(0)}cm ${wDir.slice(0, 4)}` : '—'}`
            return (
              <li
                key={target}
                className={`rounded px-2 py-1 font-mono-technical text-[10px] tabular-nums sm:text-[11px] ${
                  Math.abs(row.distance - activeDistance) < 1
                    ? 'bg-amber-500/15 text-amber-100'
                    : 'text-slate-300/90'
                }`}
              >
                {compact}
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
