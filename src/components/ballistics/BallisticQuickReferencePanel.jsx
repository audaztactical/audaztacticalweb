import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Crosshair, Lock, Pin, Target, Unlock } from 'lucide-react'
import { pickNearestResult } from './BallisticChartPanel.jsx'
import { isDualClickUnitDisplay, parseClickUnitSystem } from '../../lib/clickUnitSystem.js'
import { elevationDirection, windDirection } from '../../lib/ballisticsDisplayText.js'

/** @typedef {'tik' | 'nisangah'} QuickRefMode */

const QUICK_REF_TARGETS = [100, 300, 500, 700, 900, 1200]

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
 * @param {(key: string) => string} t
 */
function bodySizeHint(cm, t) {
  const v = Math.abs(cm)
  if (v < 4) return null
  if (v < 12) return t('quickRef.bodyHints.hand')
  if (v < 24) return t('quickRef.bodyHints.shoulder')
  if (v < 40) return t('quickRef.bodyHints.halfBody')
  return null
}

/**
 * Active − reference deltas for quick-ref display (motor not re-run).
 * @param {import('../../lib/ballisticsEngine.js').BallisticsPointResult} active
 * @param {import('../../lib/ballisticsEngine.js').BallisticsPointResult | null} reference
 * @param {unknown} clickUnitSystem
 * @param {unknown} clickValueMoa
 * @param {unknown} clickValueMrad
 */
function resolveDisplayValues(active, reference, clickUnitSystem, clickValueMoa, clickValueMrad) {
  const activeResolved = resolveElevationWind(active, clickUnitSystem, clickValueMoa, clickValueMrad)
  if (!reference) {
    return {
      elevationValue: activeResolved.elevationValue,
      windValue: activeResolved.windValue,
      dropCm: active.dropCm,
      windageCm: active.windageCm,
      angleUnit: activeResolved.angleUnit,
      hasClickValue: activeResolved.hasClickValue,
      isDelta: false,
    }
  }

  const refResolved = resolveElevationWind(reference, clickUnitSystem, clickValueMoa, clickValueMrad)
  return {
    elevationValue: activeResolved.elevationValue - refResolved.elevationValue,
    windValue: activeResolved.windValue - refResolved.windValue,
    dropCm: active.dropCm - reference.dropCm,
    windageCm: active.windageCm - reference.windageCm,
    angleUnit: activeResolved.angleUnit,
    hasClickValue: activeResolved.hasClickValue,
    isDelta: true,
  }
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
 *   onActiveDistanceChange?: (d: number) => void
 *   rangeMin?: number
 *   rangeMax?: number
 *   clickUnitSystem?: unknown
 *   clickValueMoa?: unknown
 *   clickValueMrad?: unknown
 *   resetKey?: string
 * }} props
 */
export default function BallisticQuickReferencePanel({
  results,
  activeDistance,
  onActiveDistanceChange,
  rangeMin,
  rangeMax,
  clickUnitSystem = null,
  clickValueMoa,
  clickValueMrad,
  resetKey = '',
}) {
  const { t } = useTranslation('ballistics')
  const [mode, setMode] = useState(/** @type {QuickRefMode} */ ('tik'))
  /** Session-only; always starts unlocked (null). Never writes activeDistance. */
  const [lockedRefDistance, setLockedRefDistance] = useState(/** @type {number | null} */ (null))

  useEffect(() => {
    setLockedRefDistance(null)
  }, [resetKey])

  useEffect(() => {
    if (!results?.length) setLockedRefDistance(null)
  }, [results])

  const sliderBounds = useMemo(() => {
    const fromResultsMin = results?.[0]?.distance
    const fromResultsMax = results?.[results.length - 1]?.distance
    const min = Number.isFinite(Number(rangeMin))
      ? Number(rangeMin)
      : Number.isFinite(fromResultsMin)
        ? fromResultsMin
        : 100
    const max = Number.isFinite(Number(rangeMax))
      ? Number(rangeMax)
      : Number.isFinite(fromResultsMax)
        ? fromResultsMax
        : 1500
    return { min, max: Math.max(min, max) }
  }, [rangeMin, rangeMax, results])

  const sliderStep = useMemo(
    () => Math.max(1, Math.round((sliderBounds.max - sliderBounds.min) / 100)),
    [sliderBounds],
  )

  const activeResult = useMemo(
    () => pickNearestResult(results, activeDistance),
    [results, activeDistance],
  )

  const referenceResult = useMemo(() => {
    if (lockedRefDistance === null) return null
    return pickNearestResult(results, lockedRefDistance)
  }, [results, lockedRefDistance])

  const summaryRows = useMemo(() => {
    return QUICK_REF_TARGETS.map((target) => {
      const row = pickNearestResult(results, target)
      if (!row) return null
      return { target, row }
    }).filter(Boolean)
  }, [results])

  if (!activeResult) return null

  // Locked only when user explicitly set a distance AND that row exists in results.
  // lockedRefDistance and activeDistance are independent — locking never freezes the slider.
  const isLocked = lockedRefDistance !== null && referenceResult != null
  const display = resolveDisplayValues(
    activeResult,
    isLocked ? referenceResult : null,
    clickUnitSystem,
    clickValueMoa,
    clickValueMrad,
  )
  const elevCue = elevationDirection(display.dropCm)
  const wind = windDirection(display.windageCm)
  const dropHint = bodySizeHint(display.dropCm, t)
  const windHint = bodySizeHint(display.windageCm, t)
  const unitLabel = display.hasClickValue ? t('quickRef.tikLabel') : display.angleUnit
  const canControlDistance = typeof onActiveDistanceChange === 'function'
  const sliderValue = Math.min(
    sliderBounds.max,
    Math.max(sliderBounds.min, Number(activeDistance) || sliderBounds.min),
  )

  const lockReference = () => {
    const d = Math.round(Number(activeDistance))
    if (!Number.isFinite(d)) return
    // Only stores reference — does NOT touch activeDistance / parent slider state.
    setLockedRefDistance(d)
  }

  const clearReference = () => {
    setLockedRefDistance(null)
  }

  const setActiveDistance = (next) => {
    if (!canControlDistance) return
    const n = Number(next)
    if (!Number.isFinite(n)) return
    onActiveDistanceChange(n)
  }

  return (
    <div
      className={[
        'shrink-0 overflow-hidden rounded-lg border bg-gradient-to-br from-amber-950/20 via-black/55 to-emerald-950/15 shadow-[inset_0_1px_0_rgba(251,191,36,0.12)]',
        isLocked ? 'border-amber-400/40' : 'border-amber-500/25',
      ].join(' ')}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/15 px-3 py-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <p className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.26em] text-amber-400/85">
            {t('quickRef.title')}
          </p>
          {isLocked ? (
            <span className="inline-flex items-center gap-1 rounded border border-amber-400/35 bg-amber-500/10 px-1.5 py-0.5 font-mono-technical text-[8px] font-bold uppercase tracking-wider text-amber-200">
              <Lock className="size-2.5 shrink-0" aria-hidden />
              {t('quickRef.refBadge', { distance: Math.round(lockedRefDistance) })}
            </span>
          ) : null}
        </div>
        <div
          className="relative flex w-[9.5rem] shrink-0 rounded-full border border-white/10 bg-black/50 p-0.5"
          role="group"
          aria-label={t('quickRef.ariaMode')}
        >
          <span
            className={`pointer-events-none absolute inset-y-0.5 w-[calc(50%-2px)] rounded-full bg-gradient-to-r from-amber-400 to-amber-500 shadow-[0_0_12px_rgba(251,191,36,0.35)] transition-transform duration-200 ${
              mode === 'nisangah' ? 'translate-x-[calc(100%+2px)]' : 'translate-x-0.5'
            }`}
            aria-hidden
          />
          <ModePill active={mode === 'tik'} label={t('quickRef.ariaTik')} onClick={() => setMode('tik')}>
            {t('quickRef.modeTik')}
          </ModePill>
          <ModePill active={mode === 'nisangah'} label={t('quickRef.ariaNisangah')} onClick={() => setMode('nisangah')}>
            {t('quickRef.modeNisangah')}
          </ModePill>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-amber-500/10 bg-amber-500/[0.03] px-3 py-2">
        {!isLocked ? (
          <button
            type="button"
            onClick={lockReference}
            className="inline-flex items-center gap-1.5 rounded border border-amber-400/50 bg-amber-500/15 px-2.5 py-1.5 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-amber-100 shadow-[0_0_12px_rgba(251,191,36,0.12)] transition hover:border-amber-300/60 hover:bg-amber-500/25"
          >
            <Pin className="size-3.5 shrink-0" aria-hidden />
            {t('quickRef.lockReference')}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={lockReference}
              className="inline-flex items-center gap-1.5 rounded border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-amber-200 transition hover:border-amber-400/55 hover:bg-amber-500/15"
            >
              <Pin className="size-3.5 shrink-0" aria-hidden />
              {t('quickRef.updateReference')}
            </button>
            <button
              type="button"
              onClick={clearReference}
              aria-label={t('quickRef.clearReferenceAria')}
              className="inline-flex items-center gap-1 rounded border border-white/20 px-2.5 py-1.5 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-app-text/70 transition hover:border-white/30 hover:text-app-text/95"
            >
              <Unlock className="size-3.5 shrink-0" aria-hidden />
              {t('quickRef.clearReference')}
            </button>
            <span className="font-mono-technical text-[8px] uppercase tracking-wider text-amber-500/55">
              {t('quickRef.deltaModeHint')}
            </span>
          </>
        )}
      </div>

      {canControlDistance ? (
        <div className="border-b border-amber-500/10 px-3 py-2">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.2em] text-amber-500/70">
              {t('quickRef.activeSlider')}
            </span>
            <span className="font-mono-technical text-xs font-bold tabular-nums text-amber-200">
              {Math.round(sliderValue)} m
              {isLocked ? (
                <span className="ml-1.5 text-[8px] font-bold uppercase tracking-wider text-amber-400/65">
                  {t('quickRef.refBadge', { distance: Math.round(lockedRefDistance) })}
                </span>
              ) : null}
            </span>
          </div>
          <input
            type="range"
            min={sliderBounds.min}
            max={sliderBounds.max}
            step={sliderStep}
            value={sliderValue}
            disabled={false}
            readOnly={false}
            onChange={(e) => setActiveDistance(e.target.value)}
            className="h-2 w-full cursor-pointer accent-amber-400"
            aria-label={t('quickRef.activeSliderAria')}
          />
        </div>
      ) : null}

      <div className="grid gap-2 px-3 py-2.5 sm:grid-cols-[minmax(0,7rem)_1fr] sm:items-center sm:gap-3">
        <div className="rounded-md border border-amber-500/20 bg-black/40 px-2.5 py-2 text-center sm:py-2.5">
          <p className="font-mono-technical text-[7px] uppercase tracking-[0.2em] text-amber-500/65">
            {t('quickRef.distance')}
          </p>
          <p className="mt-0.5 font-mono-technical text-2xl font-black tabular-nums leading-none text-amber-50 sm:text-3xl">
            {Math.round(activeDistance)}
            <span className="ml-0.5 text-sm font-bold text-amber-400/80">m</span>
          </p>
          {isLocked ? (
            <p className="mt-1 font-mono-technical text-[7px] font-bold uppercase tracking-wider text-amber-400/70">
              {t('quickRef.refBadge', { distance: Math.round(lockedRefDistance) })}
            </p>
          ) : null}
        </div>

        {mode === 'tik' ? (
          <div
            className={[
              'relative space-y-1.5 rounded-md px-0.5',
              isLocked ? 'border border-amber-400/30 bg-amber-500/[0.04] px-2 py-1.5' : '',
            ].join(' ')}
          >
            {isLocked ? (
              <span className="absolute -top-1.5 right-1 rounded border border-amber-400/40 bg-black/80 px-1.5 py-px font-mono-technical text-[7px] font-bold uppercase tracking-[0.18em] text-amber-300">
                {t('quickRef.deltaBadge')}
              </span>
            ) : null}
            {!display.hasClickValue ? (
              <p className="rounded border border-amber-500/20 bg-amber-950/30 px-2 py-1 font-mono-technical text-[9px] leading-snug text-amber-200/85">
                {t('quickRef.noClickValue', { unit: display.angleUnit })}
                {!isDualClickUnitDisplay(clickUnitSystem) ? null : t('quickRef.noClickValuePickUnit')}
              </p>
            ) : null}
            <div className="flex items-baseline gap-2 font-mono-technical text-lg font-black leading-none text-slate-50 sm:text-xl">
              <span className="text-amber-300">{elevCue.arrow}</span>
              <span className="tabular-nums">{formatClickCount(display.elevationValue)}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400/90">
                {unitLabel} {elevCue.label}
              </span>
            </div>
            <div className="flex items-baseline gap-2 font-mono-technical text-lg font-black leading-none text-slate-50 sm:text-xl">
              <span className="text-amber-300">{wind.arrow}</span>
              <span className="tabular-nums">{formatClickCount(display.windValue)}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400/90">
                {unitLabel} {!wind.none ? wind.label : t('quickRef.noWind')}
              </span>
            </div>
          </div>
        ) : (
          <div
            className={[
              'relative space-y-1.5 font-mono-technical text-sm font-bold leading-snug text-slate-50 sm:text-base',
              isLocked ? 'rounded-md border border-amber-400/30 bg-amber-500/[0.04] px-2 py-1.5' : '',
            ].join(' ')}
          >
            {isLocked ? (
              <span className="absolute -top-1.5 right-1 rounded border border-amber-400/40 bg-black/80 px-1.5 py-px font-mono-technical text-[7px] font-bold uppercase tracking-[0.18em] text-amber-300">
                {t('quickRef.deltaBadge')}
              </span>
            ) : null}
            <p>
              {t('quickRef.aimInstruction', {
                n: Math.abs(display.dropCm).toFixed(1),
                dir: elevCue.label,
              })}
            </p>
            {dropHint ? <p className="text-[9px] font-normal text-app-text/45">{dropHint}</p> : null}
            <p>
              {!wind.none ? (
                <span className="text-amber-200">
                  {t('quickRef.windInstruction', {
                    n: Math.abs(display.windageCm).toFixed(1),
                    dir: wind.label,
                  })}
                </span>
              ) : (
                <span className="text-app-text/55">{t('quickRef.noWindAim')}</span>
              )}
            </p>
            {windHint && !wind.none ? (
              <p className="text-[9px] font-normal text-app-text/45">{windHint}</p>
            ) : null}
          </div>
        )}
      </div>

      {summaryRows.length > 0 ? (
        <ul className="grid gap-1 border-t border-amber-500/15 px-2 py-2 sm:px-3">
          {summaryRows.map(({ target, row }, index) => {
            const rowDisplay = resolveDisplayValues(
              row,
              isLocked ? referenceResult : null,
              clickUnitSystem,
              clickValueMoa,
              clickValueMrad,
            )
            const rowElev = elevationDirection(rowDisplay.dropCm)
            const rowWind = windDirection(rowDisplay.windageCm)
            const isActive = Math.abs(row.distance - activeDistance) < 1
            const isRefRow =
              isLocked && Math.abs(row.distance - lockedRefDistance) < 1
            const unitShort = rowDisplay.hasClickValue
              ? t('quickRef.abbrev.tik')
              : rowDisplay.angleUnit.slice(0, 1)

            return (
              <li key={target}>
                <button
                  type="button"
                  disabled={!canControlDistance}
                  aria-label={t('quickRef.pickRowAria', { distance: target })}
                  aria-current={isActive ? 'true' : undefined}
                  onClick={() => setActiveDistance(target)}
                  className={[
                    'group flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-left font-mono-technical text-[10px] transition sm:text-[11px]',
                    canControlDistance ? 'cursor-pointer' : 'cursor-default',
                    isActive
                      ? 'border-amber-500/35 bg-amber-500/12 text-amber-50'
                      : isRefRow
                        ? 'border-amber-400/25 bg-amber-500/[0.06] text-amber-100/90'
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
                  {isLocked ? (
                    <span className="shrink-0 rounded border border-amber-400/25 px-1 py-px text-[7px] font-bold uppercase tracking-wider text-amber-400/70">
                      {t('quickRef.deltaBadge')}
                    </span>
                  ) : null}
                  {mode === 'tik' ? (
                    <>
                      <span className="min-w-0 flex-1 truncate tabular-nums">
                        <span className="text-amber-300/90">{rowElev.arrow}</span>
                        {formatClickCount(rowDisplay.elevationValue)}
                        {unitShort} {rowElev.abbrev}
                      </span>
                      <span className="shrink-0 tabular-nums text-slate-400/80">
                        <span className="text-amber-300/90">{rowWind.arrow}</span>
                        {formatClickCount(rowDisplay.windValue)}
                        {unitShort}{' '}
                        {!rowWind.none ? rowWind.abbrev : '—'}
                      </span>
                    </>
                  ) : (
                    <span className="min-w-0 flex-1 truncate tabular-nums">
                      {Math.abs(rowDisplay.dropCm).toFixed(0)}cm {rowElev.abbrev}
                      <span className="mx-1 text-white/15">·</span>
                      {!rowWind.none
                        ? `${Math.abs(rowDisplay.windageCm).toFixed(0)}cm ${rowWind.abbrev}`
                        : '—'}
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
