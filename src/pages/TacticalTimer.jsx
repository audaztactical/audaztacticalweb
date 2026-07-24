import { lazy, Suspense, useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Settings2 } from 'lucide-react'
import HudTicker from '../components/ui/HudTicker'
import TimerModeSelector from '../components/timer/TimerModeSelector'
import TimerFullscreenProtocol from '../components/timer/TimerFullscreenProtocol'
import { findTimerMode } from '../components/timer/timerModes'

const StandardShotMode = lazy(() => import('../components/timer/modes/StandardShotMode'))
const DryFireMode = lazy(() => import('../components/timer/modes/DryFireMode'))
const FofMode = lazy(() => import('../components/timer/modes/FofMode'))
const StructuralFrameMode = lazy(() => import('../components/timer/modes/StructuralFrameMode'))
const TimerCalibrationPanel = lazy(() => import('../components/timer/TimerCalibrationPanel'))

/** @typedef {import('../components/timer/timerModes').TimerModeId} TimerModeId */
/** @typedef {'modes' | 'calibration'} TimerView */

function ModeLoadingFallback() {
  const { t } = useTranslation('timer')
  return (
    <div className="flex min-h-[14rem] items-center justify-center rounded-lg border border-accent/15 bg-app-bg/60 px-4 py-12">
      <p className="font-mono-technical text-[10px] uppercase tracking-[0.28em] text-accent/70 animate-pulse">
        {t('placeholder.loading')}…
      </p>
    </div>
  )
}

/**
 * @param {TimerModeId} id
 * @param {{ modeTitle: string, opsCode: string, onSessionActiveChange?: (active: boolean) => void }} props
 */
function renderLazyMode(id, props) {
  switch (id) {
    case 'standard-shot':
      return <StandardShotMode {...props} />
    case 'dry-fire':
      return <DryFireMode {...props} />
    case 'fof':
      return <FofMode {...props} />
    case 'structural-frame':
      return <StructuralFrameMode {...props} />
    default:
      return null
  }
}

export default function TacticalTimer() {
  const { t } = useTranslation('timer')
  const [view, setView] = useState(/** @type {TimerView} */ ('modes'))
  const [activeModeId, setActiveModeId] = useState(/** @type {TimerModeId | null} */ (null))
  const [modeSessionActive, setModeSessionActive] = useState(false)
  const [fsAbortToken, setFsAbortToken] = useState(0)

  const activeMode = useMemo(() => findTimerMode(activeModeId), [activeModeId])
  const showCalibration = view === 'calibration'
  // Hub / kalibrasyon serbest; FS kilidi yalnızca canlı seans (arm / safety / delay / running)
  const sessionActive = Boolean(modeSessionActive)

  const handleModeSelect = useCallback((/** @type {import('../components/timer/timerModes').TimerModeDef} */ mode) => {
    setActiveModeId(mode.id)
    setModeSessionActive(false)
  }, [])

  const exitMode = useCallback(() => {
    setActiveModeId(null)
    setModeSessionActive(false)
  }, [])

  const openCalibration = useCallback(() => {
    setActiveModeId(null)
    setModeSessionActive(false)
    setView('calibration')
  }, [])

  const closeCalibration = useCallback(() => {
    setView('modes')
  }, [])

  const handleFullscreenLost = useCallback(() => {
    // Canlı atışı durdur — moddan / hub'a atma. F12 DevTools FS'i kapatınca da burası çalışır.
    setFsAbortToken((n) => n + 1)
  }, [])

  const headerTitle = showCalibration
    ? t('calibration.title')
    : activeMode
      ? t(activeMode.titleKey)
      : t('page.title')
  const headerSubtitle = showCalibration
    ? t('calibration.subtitle')
    : activeMode
      ? t(activeMode.descriptionKey)
      : t('page.subtitle')

  return (
    <TimerFullscreenProtocol
      sessionActive={sessionActive}
      onFullscreenLost={handleFullscreenLost}
    >
      <div className="ilws-shell relative mx-auto w-full min-w-0 max-w-[1480px] px-3 py-5 pt-12 sm:px-4 sm:pt-14 md:px-6">
        <div className="relative z-[2] flex w-full min-w-0 flex-col space-y-5">
          <header className="flex flex-wrap items-end justify-between gap-3 border-b border-white/10 pb-3">
            <div className="min-w-0 flex-1">
              <p className="font-mono-technical text-[10px] font-semibold uppercase tracking-[0.32em] text-accent/85">
                [ {showCalibration ? t('calibration.kicker') : t('page.kicker')} ]
              </p>
              <h1 className="font-display mt-1 break-words text-lg font-bold tracking-[0.1em] text-app-text sm:text-xl">
                {headerTitle}
              </h1>
              <p className="mt-1 max-w-2xl break-words font-mono-technical text-[9px] leading-snug text-app-text/55">
                {headerSubtitle}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <div className="flex flex-wrap items-center justify-end gap-2">
                {showCalibration ? (
                  <button
                    type="button"
                    onClick={closeCalibration}
                    className="inline-flex items-center gap-1.5 rounded-sm border border-accent/25 bg-accent/[0.06] px-2.5 py-1.5 font-mono-technical text-[9px] uppercase tracking-[0.2em] text-accent/90 transition hover:border-accent/50 hover:bg-accent/10"
                  >
                    <ArrowLeft className="size-3.5" strokeWidth={1.5} aria-hidden />
                    {t('page.backToModes')}
                  </button>
                ) : (
                  <>
                    {activeMode ? (
                      <button
                        type="button"
                        onClick={exitMode}
                        className="inline-flex items-center gap-1.5 rounded-sm border border-accent/25 bg-accent/[0.06] px-2.5 py-1.5 font-mono-technical text-[9px] uppercase tracking-[0.2em] text-accent/90 transition hover:border-accent/50 hover:bg-accent/10"
                      >
                        <ArrowLeft className="size-3.5" strokeWidth={1.5} aria-hidden />
                        {t('page.backToModes')}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={openCalibration}
                      className="inline-flex items-center gap-1.5 rounded-sm border border-white/15 bg-white/[0.03] px-2.5 py-1.5 font-mono-technical text-[9px] uppercase tracking-[0.2em] text-app-text/75 transition hover:border-accent/45 hover:bg-accent/[0.08] hover:text-accent"
                      aria-label={t('calibration.openAria')}
                    >
                      <Settings2 className="size-3.5" strokeWidth={1.5} aria-hidden />
                      {t('calibration.open')}
                    </button>
                  </>
                )}
              </div>
              <HudTicker />
            </div>
          </header>

          {showCalibration ? (
            <Suspense fallback={<ModeLoadingFallback />}>
              <TimerCalibrationPanel />
            </Suspense>
          ) : !activeMode ? (
            <TimerModeSelector onModeSelect={handleModeSelect} />
          ) : (
            <Suspense fallback={<ModeLoadingFallback />}>
              {renderLazyMode(activeMode.id, {
                modeTitle: t(activeMode.titleKey),
                opsCode: activeMode.opsCode,
                onSessionActiveChange: setModeSessionActive,
                fsAbortToken,
              })}
            </Suspense>
          )}
        </div>
      </div>
    </TimerFullscreenProtocol>
  )
}
