import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Eraser,
  Eye,
  Minimize2,
  Monitor,
  Ruler,
  Save,
  Smartphone,
  Timer,
  Zap,
} from 'lucide-react'
import {
  DRY_FIRE_DISTANCE_MAX_M,
  DRY_FIRE_DISTANCE_MIN_M,
  DRY_FIRE_DISTANCE_PRESETS,
  DRY_FIRE_GRAPH_IDS,
  DRY_FIRE_REF_DISTANCE_M,
} from '../../lib/dryFireHits'
import {
  EYE_SCREEN_DISTANCE_PRESETS,
  EYE_SCREEN_DISTANCE_MAX_M,
  EYE_SCREEN_DISTANCE_MIN_M,
} from '../../lib/dryFireScaleEngine'
import {
  ARM_DELAY_FIXED_MAX_SEC,
  ARM_DELAY_FIXED_MIN_SEC,
  ARM_DELAY_FIXED_STEP_SEC,
  ARM_DELAY_RANDOM_MAX_MS,
  ARM_DELAY_RANDOM_MIN_MS,
  PAR_TIME_MAX_SEC,
  PAR_TIME_STEP_SEC,
} from '../../lib/dryFireTimer'
import {
  SCREEN_DIAGONAL_MAX_IN,
  SCREEN_DIAGONAL_MIN_IN,
  SCREEN_ORIENTATION_OPTIONS,
} from '../../lib/timerCalibrationSettings'
import DryFireRingLegend from './DryFireRingLegend'
import DryFireToolbarAccordion from './DryFireToolbarAccordion'
import { TOOLBAR_ACCENT } from '../../lib/dryFireToolbarThemes'

/** @typedef {'timer' | 'distance' | 'orientation' | 'diagonal' | 'eye' | 'rings' | 'graphs'} AccordionId */

/**
 * Tam ekran sol taktiksel araç çubuğu (daraltılabilir + akordiyon).
 *
 * @param {{
 *   open: boolean
 *   onToggle: () => void
 *   distanceM: number
 *   onDistanceChange: (m: number) => void
 *   manualDraft: string
 *   onManualDraftChange: (v: string) => void
 *   onManualCommit: () => void
 *   screenOrientation: import('../../lib/timerCalibrationSettings').ScreenOrientationMode
 *   screenDiagonalInches: number
 *   eyeScreenDistanceM: number
 *   onScreenOrientationChange: (o: import('../../lib/timerCalibrationSettings').ScreenOrientationMode) => void
 *   onScreenDiagonalChange: (n: number) => void
 *   onEyeDistanceChange: (n: number) => void
 *   rings: { id: string, label: string, diameterCm: number, screenDiameterCm?: number, moa?: number }[]
 *   faceScreenCm?: number
 *   armed: boolean
 *   phase?: 'idle' | 'delay' | 'running'
 *   liveMs?: number
 *   lastDrawMs?: number | null
 *   parOver?: boolean
 *   timerEnabled?: boolean
 *   delayMode?: 'random' | 'fixed'
 *   fixedDelaySec?: number
 *   parTimeSec?: number
 *   onTimerEnabledChange?: (v: boolean) => void
 *   onDelayModeChange?: (m: 'random' | 'fixed') => void
 *   onFixedDelaySecChange?: (n: number) => void
 *   onParTimeSecChange?: (n: number) => void
 *   hitsCount: number
 *   onArm: () => void
 *   onDisarm: () => void
 *   onFire: () => void
 *   onResetPaper: () => void
 *   onSaveSession?: () => void
 *   sessionSaving?: boolean
 *   canSave?: boolean
 *   onExitFullscreen: () => void
 *   openGraphIds?: import('../../lib/dryFireHits').DryFireGraphId[]
 *   onToggleGraph?: (id: import('../../lib/dryFireHits').DryFireGraphId) => void
 * }} props
 */
export default function DryFireFullscreenToolbar({
  open,
  onToggle,
  distanceM,
  onDistanceChange,
  manualDraft,
  onManualDraftChange,
  onManualCommit,
  screenOrientation,
  screenDiagonalInches,
  eyeScreenDistanceM,
  onScreenOrientationChange,
  onScreenDiagonalChange,
  onEyeDistanceChange,
  rings,
  faceScreenCm,
  armed,
  phase = 'idle',
  liveMs = 0,
  lastDrawMs = null,
  parOver = false,
  timerEnabled = true,
  delayMode = 'random',
  fixedDelaySec = 3,
  parTimeSec = 0,
  onTimerEnabledChange,
  onDelayModeChange,
  onFixedDelaySecChange,
  onParTimeSecChange,
  hitsCount,
  onArm,
  onDisarm,
  onFire,
  onResetPaper,
  onSaveSession,
  sessionSaving = false,
  canSave = false,
  onExitFullscreen,
  openGraphIds = [],
  onToggleGraph,
}) {
  const { t } = useTranslation('timer')
  const presetSet = new Set(DRY_FIRE_DISTANCE_PRESETS)
  const busy = phase === 'delay' || phase === 'running'
  const openSet = new Set(openGraphIds)

  /** Varsayılan: tüm akordiyonlar kapalı */
  const [expanded, setExpanded] = useState(
    /** @type {ReadonlySet<AccordionId>} */ (new Set()),
  )

  const toggleAccordion = useCallback((/** @type {AccordionId} */ id) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const isOpen = (/** @type {AccordionId} */ id) => expanded.has(id)

  const timerTheme = TOOLBAR_ACCENT.timer
  const distanceTheme = TOOLBAR_ACCENT.distance
  const orientTheme = TOOLBAR_ACCENT.orientation
  const diagonalTheme = TOOLBAR_ACCENT.diagonal
  const eyeTheme = TOOLBAR_ACCENT.eye
  const ringsTheme = TOOLBAR_ACCENT.rings
  const graphsTheme = TOOLBAR_ACCENT.graphs

  return (
    <aside
      className={[
        'relative z-40 flex h-full shrink-0 flex-col border-r border-[#facc15]/30 bg-[#0a0a0b] transition-[width] duration-300 ease-out',
        open ? 'w-[min(100%,20rem)]' : 'w-11',
      ].join(' ')}
      aria-label={t('dryFire.toolbar.aria')}
    >
      <div className="flex shrink-0 items-center justify-between gap-1 border-b border-zinc-700/50 px-1.5 py-2">
        {open ? (
          <p className="truncate px-1.5 font-mono-technical text-[8px] font-bold uppercase tracking-[0.22em] text-[#facc15]">
            {t('dryFire.toolbar.title')}
          </p>
        ) : (
          <span className="sr-only">{t('dryFire.toolbar.title')}</span>
        )}
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex size-8 items-center justify-center rounded-sm border border-[#facc15]/40 text-[#facc15] transition hover:bg-[rgba(250,204,21,0.12)]"
          aria-expanded={open}
          aria-label={open ? t('dryFire.toolbar.collapse') : t('dryFire.toolbar.expand')}
        >
          {open ? (
            <ChevronLeft className="size-4" strokeWidth={1.5} aria-hidden />
          ) : (
            <ChevronRight className="size-4" strokeWidth={1.5} aria-hidden />
          )}
        </button>
      </div>

      {open ? (
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-2.5 py-2.5">
          {/* Zamanlayıcı — amber */}
          <DryFireToolbarAccordion
            id="timer"
            title={t('dryFire.timer.title')}
            theme={timerTheme}
            open={isOpen('timer')}
            onToggle={() => toggleAccordion('timer')}
            icon={<Timer className="size-3.5" strokeWidth={1.5} aria-hidden />}
            badge={
              <span
                className={[
                  'rounded-sm border px-1.5 py-0.5 font-mono-technical text-[7px] font-bold uppercase tracking-[0.1em]',
                  timerEnabled ? timerTheme.chipActive : 'border-zinc-600/50 text-zinc-500',
                ].join(' ')}
              >
                {timerEnabled ? t('dryFire.timer.on') : t('dryFire.timer.off')}
              </span>
            }
          >
            <div className="mb-2 flex justify-end">
              <button
                type="button"
                disabled={busy}
                onClick={() => onTimerEnabledChange?.(!timerEnabled)}
                className={[
                  'min-h-7 rounded-sm border px-2 font-mono-technical text-[8px] font-bold uppercase tracking-[0.12em] transition disabled:opacity-40',
                  timerEnabled ? timerTheme.chipActive : 'border-zinc-600/50 text-zinc-500',
                ].join(' ')}
              >
                {timerEnabled ? t('dryFire.timer.on') : t('dryFire.timer.off')}
              </button>
            </div>

            {(phase === 'delay' || phase === 'running') && (
              <div
                className={[
                  'mb-2 rounded-sm border px-2 py-2 text-center',
                  parOver ? 'border-red-400/45 bg-red-950/40' : timerTheme.accentSoft,
                ].join(' ')}
              >
                <p
                  className={[
                    'font-mono-technical text-lg font-bold tabular-nums',
                    parOver ? 'text-red-300' : timerTheme.headerText,
                  ].join(' ')}
                >
                  {phase === 'delay' ? '…' : `${liveMs} ms`}
                </p>
                {lastDrawMs != null ? (
                  <p
                    className={[
                      'mt-0.5 font-mono-technical text-[8px] uppercase tracking-[0.14em]',
                      timerTheme.muted,
                    ].join(' ')}
                  >
                    {t('dryFire.timer.draw')}: {lastDrawMs} ms
                  </p>
                ) : null}
              </div>
            )}

            {timerEnabled ? (
              <div className="space-y-2">
                <div
                  className={[
                    'grid grid-cols-2 gap-1 rounded-sm border p-1',
                    timerTheme.bodyBorder,
                    'bg-[#0a0a0b]/50',
                  ].join(' ')}
                >
                  {/** @type {Array<'random' | 'fixed'>} */ (['random', 'fixed']).map((mode) => {
                    const active = delayMode === mode
                    return (
                      <button
                        key={mode}
                        type="button"
                        disabled={busy}
                        onClick={() => onDelayModeChange?.(mode)}
                        className={[
                          'min-h-9 rounded-sm border px-1 font-mono-technical text-[8px] font-bold uppercase tracking-[0.1em] transition disabled:opacity-40',
                          active ? timerTheme.chipActive : 'border-transparent text-zinc-500 hover:text-amber-200/80',
                        ].join(' ')}
                      >
                        {t(`dryFire.timer.delay.${mode}`)}
                      </button>
                    )
                  })}
                </div>
                {delayMode === 'random' ? (
                  <p
                    className={[
                      'font-mono-technical text-[7px] uppercase tracking-[0.12em]',
                      timerTheme.muted,
                    ].join(' ')}
                  >
                    {t('dryFire.timer.delay.randomHint', {
                      min: ARM_DELAY_RANDOM_MIN_MS / 1000,
                      max: ARM_DELAY_RANDOM_MAX_MS / 1000,
                    })}
                  </p>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={ARM_DELAY_FIXED_MIN_SEC}
                      max={ARM_DELAY_FIXED_MAX_SEC}
                      step={ARM_DELAY_FIXED_STEP_SEC}
                      disabled={busy}
                      value={fixedDelaySec}
                      onChange={(e) => onFixedDelaySecChange?.(Number(e.target.value))}
                      className={`${timerTheme.field} max-w-[5.5rem] disabled:opacity-40`}
                      aria-label={t('dryFire.timer.delay.fixedAria')}
                    />
                    <span className={['font-mono-technical text-[9px]', timerTheme.muted].join(' ')}>
                      s
                    </span>
                  </div>
                )}
                <div>
                  <p
                    className={[
                      'mb-1.5 font-mono-technical text-[8px] font-bold uppercase tracking-[0.18em]',
                      timerTheme.headerText,
                    ].join(' ')}
                  >
                    {t('dryFire.timer.par')}
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={PAR_TIME_MAX_SEC}
                      step={PAR_TIME_STEP_SEC}
                      disabled={busy}
                      value={parTimeSec}
                      onChange={(e) => onParTimeSecChange?.(Number(e.target.value))}
                      className={`${timerTheme.field} max-w-[5.5rem] disabled:opacity-40`}
                      aria-label={t('dryFire.timer.parAria')}
                    />
                    <span className={['font-mono-technical text-[9px]', timerTheme.muted].join(' ')}>
                      s
                    </span>
                  </div>
                  <p
                    className={[
                      'mt-1 font-mono-technical text-[7px] uppercase tracking-[0.12em]',
                      timerTheme.muted,
                    ].join(' ')}
                  >
                    {parTimeSec > 0 ? t('dryFire.timer.parHint') : t('dryFire.timer.parOff')}
                  </p>
                </div>
              </div>
            ) : (
              <p
                className={[
                  'font-mono-technical text-[7px] uppercase tracking-[0.12em]',
                  timerTheme.muted,
                ].join(' ')}
              >
                {t('dryFire.timer.freeHint')}
              </p>
            )}
          </DryFireToolbarAccordion>

          {/* Atış mesafesi — neon yeşil */}
          <DryFireToolbarAccordion
            id="distance"
            title={t('dryFire.distance.label')}
            theme={distanceTheme}
            open={isOpen('distance')}
            onToggle={() => toggleAccordion('distance')}
            icon={<Crosshair className="size-3.5" strokeWidth={1.5} aria-hidden />}
            badge={
              <span className="font-mono-technical text-[9px] font-bold tabular-nums text-emerald-300">
                {distanceM}m
              </span>
            }
          >
            <div className="flex flex-wrap gap-1.5">
              {DRY_FIRE_DISTANCE_PRESETS.map((m) => {
                const active = distanceM === m
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => onDistanceChange(m)}
                    className={[
                      'min-h-9 rounded-sm border px-2 py-1 font-mono-technical text-[9px] font-bold uppercase tracking-[0.12em] transition',
                      active ? distanceTheme.chipActive : distanceTheme.chip,
                    ].join(' ')}
                  >
                    {m}m
                  </button>
                )
              })}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="number"
                inputMode="decimal"
                min={DRY_FIRE_DISTANCE_MIN_M}
                max={DRY_FIRE_DISTANCE_MAX_M}
                step={0.5}
                value={manualDraft}
                onChange={(e) => onManualDraftChange(e.target.value)}
                onBlur={onManualCommit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    onManualCommit()
                  }
                }}
                className={`${distanceTheme.field} max-w-[5.5rem]`}
                aria-label={t('dryFire.distance.manual')}
              />
              <span className={['font-mono-technical text-[9px]', distanceTheme.muted].join(' ')}>
                m
              </span>
              {!presetSet.has(distanceM) ? (
                <span
                  className={[
                    'font-mono-technical text-[8px]',
                    distanceTheme.headerText,
                  ].join(' ')}
                >
                  {t('dryFire.distance.custom')}
                </span>
              ) : null}
            </div>
            <p
              className={[
                'mt-1.5 font-mono-technical text-[7px] uppercase tracking-[0.12em]',
                distanceTheme.muted,
              ].join(' ')}
            >
              {t('dryFire.distance.scale', {
                scale: (DRY_FIRE_REF_DISTANCE_M / distanceM).toFixed(2),
                ref: DRY_FIRE_REF_DISTANCE_M,
                dist: distanceM,
              })}
            </p>
          </DryFireToolbarAccordion>

          {/* Ekran yönü — taktik mavi */}
          <DryFireToolbarAccordion
            id="orientation"
            title={t('calibration.screen.orientationLabel')}
            theme={orientTheme}
            open={isOpen('orientation')}
            onToggle={() => toggleAccordion('orientation')}
            icon={<Smartphone className="size-3.5" strokeWidth={1.5} aria-hidden />}
          >
            <div
              className={[
                'grid grid-cols-2 gap-1 rounded-sm border p-1',
                orientTheme.bodyBorder,
                'bg-[#0a0a0b]/50',
              ].join(' ')}
            >
              {SCREEN_ORIENTATION_OPTIONS.map((orient) => {
                const active = screenOrientation === orient
                return (
                  <button
                    key={orient}
                    type="button"
                    onClick={() => onScreenOrientationChange(orient)}
                    aria-pressed={active}
                    className={[
                      'min-h-10 rounded-sm border px-1.5 py-1.5 font-mono-technical text-[8px] font-bold uppercase tracking-[0.12em] transition',
                      active ? orientTheme.chipActive : 'border-transparent text-zinc-500 hover:text-sky-200/80',
                    ].join(' ')}
                  >
                    {t(`calibration.screen.orientation.${orient}`)}
                  </button>
                )
              })}
            </div>
          </DryFireToolbarAccordion>

          {/* Ekran diyagonali — mat turuncu */}
          <DryFireToolbarAccordion
            id="diagonal"
            title={t('calibration.screen.diagonal')}
            theme={diagonalTheme}
            open={isOpen('diagonal')}
            onToggle={() => toggleAccordion('diagonal')}
            icon={<Monitor className="size-3.5" strokeWidth={1.5} aria-hidden />}
            badge={
              <span className="font-mono-technical text-[10px] font-bold tabular-nums text-orange-300">
                {screenDiagonalInches}&quot;
              </span>
            }
          >
            <input
              type="range"
              min={SCREEN_DIAGONAL_MIN_IN}
              max={SCREEN_DIAGONAL_MAX_IN}
              step={0.1}
              value={screenDiagonalInches}
              onChange={(e) => onScreenDiagonalChange(Number(e.target.value))}
              className={['h-2 w-full cursor-pointer', diagonalTheme.rangeAccent].join(' ')}
              aria-label={t('calibration.screen.diagonalAria')}
            />
            <input
              type="number"
              min={SCREEN_DIAGONAL_MIN_IN}
              max={SCREEN_DIAGONAL_MAX_IN}
              step={0.1}
              value={screenDiagonalInches}
              onChange={(e) => onScreenDiagonalChange(Number(e.target.value))}
              className={`${diagonalTheme.field} mt-2 max-w-[5.5rem]`}
            />
          </DryFireToolbarAccordion>

          {/* Göz–ekran — teal */}
          <DryFireToolbarAccordion
            id="eye"
            title={t('calibration.screen.eyeDistance')}
            theme={eyeTheme}
            open={isOpen('eye')}
            onToggle={() => toggleAccordion('eye')}
            icon={<Eye className="size-3.5" strokeWidth={1.5} aria-hidden />}
            badge={
              <span className="font-mono-technical text-[9px] font-bold tabular-nums text-teal-300">
                {eyeScreenDistanceM}m
              </span>
            }
          >
            <div className="flex flex-wrap gap-1.5">
              {EYE_SCREEN_DISTANCE_PRESETS.map((m) => {
                const active = eyeScreenDistanceM === m
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => onEyeDistanceChange(m)}
                    className={[
                      'min-h-9 rounded-sm border px-2 py-1 font-mono-technical text-[9px] font-bold uppercase tracking-[0.12em] transition',
                      active ? eyeTheme.chipActive : eyeTheme.chip,
                    ].join(' ')}
                  >
                    {m} m
                  </button>
                )
              })}
            </div>
            <input
              type="number"
              min={EYE_SCREEN_DISTANCE_MIN_M}
              max={EYE_SCREEN_DISTANCE_MAX_M}
              step={0.1}
              value={eyeScreenDistanceM}
              onChange={(e) => onEyeDistanceChange(Number(e.target.value))}
              className={`${eyeTheme.field} mt-2 max-w-[5.5rem]`}
              aria-label={t('calibration.screen.eyeDistanceAria')}
            />
          </DryFireToolbarAccordion>

          {/* Hedef kağıdı ölçümleri — violet */}
          <DryFireToolbarAccordion
            id="rings"
            title={t('dryFire.rings.legendTitle')}
            theme={ringsTheme}
            open={isOpen('rings')}
            onToggle={() => toggleAccordion('rings')}
            icon={<Ruler className="size-3.5" strokeWidth={1.5} aria-hidden />}
          >
            <DryFireRingLegend
              rings={rings}
              distanceM={distanceM}
              faceScreenCm={faceScreenCm}
              hideChrome
              accentClass="text-violet-300"
              mutedClass="text-violet-200/45"
              chipClass="border-violet-400/25 bg-[#0a0a0b]/70"
            />
          </DryFireToolbarAccordion>

          {/* Grafik havuzu — pink */}
          <DryFireToolbarAccordion
            id="graphs"
            title={t('dryFire.analytics.graphs.section')}
            theme={graphsTheme}
            open={isOpen('graphs')}
            onToggle={() => toggleAccordion('graphs')}
            icon={<Activity className="size-3.5" strokeWidth={1.5} aria-hidden />}
            badge={
              openGraphIds.length > 0 ? (
                <span className="font-mono-technical text-[9px] font-bold tabular-nums text-pink-300">
                  {openGraphIds.length}
                </span>
              ) : null
            }
          >
            <ul className="flex flex-col gap-1" role="list">
              {DRY_FIRE_GRAPH_IDS.map((id) => {
                const active = openSet.has(id)
                return (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => onToggleGraph?.(id)}
                      aria-pressed={active}
                      className={[
                        'inline-flex min-h-9 w-full items-center gap-2 rounded-sm border px-2.5 py-2 text-left font-mono-technical text-[8px] font-bold uppercase tracking-[0.12em] transition',
                        active
                          ? graphsTheme.chipActive
                          : 'border-transparent text-zinc-400 hover:border-pink-400/30 hover:bg-pink-950/40 hover:text-pink-200/90',
                      ].join(' ')}
                    >
                      <span
                        className={[
                          'size-1.5 shrink-0 rounded-full',
                          active ? 'bg-pink-400' : 'bg-zinc-700',
                        ].join(' ')}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1 leading-snug">
                        {t(`dryFire.analytics.graphs.${id}`)}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </DryFireToolbarAccordion>

          {/* Aksiyonlar — her zaman görünür */}
          <section className="space-y-2 border-t border-zinc-700/50 pt-3">
            {phase === 'delay' ? (
              <button
                type="button"
                onClick={onDisarm}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-sm border border-amber-400/45 bg-amber-500/10 px-3 font-mono-technical text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200"
              >
                {t('dryFire.timer.cancelDelay')}
              </button>
            ) : !armed ? (
              <button
                type="button"
                onClick={onArm}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-sm border border-[#facc15]/55 bg-[#facc15]/12 px-3 font-mono-technical text-[10px] font-bold uppercase tracking-[0.18em] text-[#facc15] transition hover:bg-[#facc15]/18"
              >
                <Zap className="size-4" strokeWidth={1.5} aria-hidden />
                {timerEnabled ? t('dryFire.timer.start') : t('dryFire.armShort')}
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={onFire}
                  className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-sm border border-emerald-400/45 bg-emerald-500/10 px-2 font-mono-technical text-[9px] font-bold uppercase tracking-[0.14em] text-emerald-300"
                >
                  <Crosshair className="size-3.5" strokeWidth={1.5} aria-hidden />
                  {t('dryFire.fire')}
                </button>
                <button
                  type="button"
                  onClick={onDisarm}
                  className="inline-flex min-h-11 items-center justify-center rounded-sm border border-zinc-600/55 px-2 font-mono-technical text-[9px] font-bold uppercase tracking-[0.14em] text-zinc-400"
                >
                  {t('dryFire.disarmShort')}
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={onSaveSession}
              disabled={!canSave || sessionSaving}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-sm border border-emerald-400/40 bg-emerald-500/10 px-3 font-mono-technical text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-300 transition hover:bg-emerald-500/16 disabled:opacity-40"
            >
              <Save className="size-4" strokeWidth={1.5} aria-hidden />
              {sessionSaving ? t('dryFire.session.saving') : t('dryFire.session.save')}
            </button>
            <button
              type="button"
              onClick={onResetPaper}
              disabled={hitsCount === 0 && phase === 'idle'}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-sm border border-[#facc15]/40 bg-[rgba(250,204,21,0.08)] px-3 font-mono-technical text-[10px] font-bold uppercase tracking-[0.16em] text-[#facc15] transition hover:bg-[rgba(250,204,21,0.14)] disabled:opacity-40"
            >
              <Eraser className="size-4" strokeWidth={1.5} aria-hidden />
              {t('dryFire.resetPaper')}
            </button>
            <button
              type="button"
              onClick={onExitFullscreen}
              className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-sm border border-zinc-600/50 px-3 font-mono-technical text-[9px] font-bold uppercase tracking-[0.16em] text-zinc-400 transition hover:border-[#facc15]/35 hover:text-[#facc15]"
            >
              <Minimize2 className="size-3.5" strokeWidth={1.5} aria-hidden />
              {t('dryFire.fullscreen.exit')}
            </button>
          </section>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center gap-2 py-3">
          <button
            type="button"
            onClick={onArm}
            disabled={busy}
            className="inline-flex size-8 items-center justify-center rounded-sm border border-[#facc15]/40 text-[#facc15] disabled:opacity-40"
            title={timerEnabled ? t('dryFire.timer.start') : t('dryFire.armShort')}
          >
            <Zap className="size-3.5" strokeWidth={1.5} aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => onToggleGraph?.('flinch')}
            className={[
              'inline-flex size-8 items-center justify-center rounded-sm border',
              openSet.has('flinch')
                ? 'border-[#facc15]/55 text-[#facc15]'
                : 'border-[#facc15]/35 text-[#facc15]/80',
            ].join(' ')}
            title={t('dryFire.analytics.open')}
            aria-label={t('dryFire.analytics.openAria')}
            aria-pressed={openSet.has('flinch')}
          >
            <Activity className="size-3.5" strokeWidth={1.5} aria-hidden />
          </button>
          <button
            type="button"
            onClick={onSaveSession}
            disabled={!canSave || sessionSaving}
            className="inline-flex size-8 items-center justify-center rounded-sm border border-emerald-400/40 text-emerald-300 disabled:opacity-40"
            title={t('dryFire.session.save')}
          >
            <Save className="size-3.5" strokeWidth={1.5} aria-hidden />
          </button>
          <button
            type="button"
            onClick={onResetPaper}
            disabled={hitsCount === 0 && phase === 'idle'}
            className="inline-flex size-8 items-center justify-center rounded-sm border border-[#facc15]/35 text-[#facc15] disabled:opacity-40"
            title={t('dryFire.resetPaper')}
          >
            <Eraser className="size-3.5" strokeWidth={1.5} aria-hidden />
          </button>
          <button
            type="button"
            onClick={onExitFullscreen}
            className="mt-auto inline-flex size-8 items-center justify-center rounded-sm border border-zinc-600/50 text-zinc-400"
            title={t('dryFire.fullscreen.exit')}
          >
            <Minimize2 className="size-3.5" strokeWidth={1.5} aria-hidden />
          </button>
        </div>
      )}
    </aside>
  )
}
