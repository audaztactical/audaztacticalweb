import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Bluetooth, Cable, Save, Unplug } from 'lucide-react'
import MicThresholdWaveform, { MIC_WAVE_STYLES } from '../components/timer/MicThresholdWaveform'
import MicFrequencySpectrumPanel from '../components/timer/MicFrequencySpectrumPanel'
import { useHardware } from '../context/HardwareContext'
import {
  getActiveMicTestThreshold,
  loadMicThresholdTest,
  MIC_TEST_MODE_IDS,
  saveMicThresholdTest,
  clampMicTestThreshold,
} from '../lib/micThresholdTestSettings'
import {
  SOUND_THRESHOLD_MAX,
  SOUND_THRESHOLD_MIN,
  saveAcousticThreshold,
} from '../lib/timerCalibrationSettings'

/**
 * @typedef {{
 *   id: string
 *   at: number
 *   lvl: number
 *   mode: import('../lib/micThresholdTestSettings').MicTestModeId
 *   source: 'cross' | 'hw'
 * }} MicDetectLog
 */

const FIELD =
  'w-full rounded-sm border border-zinc-600/55 bg-zinc-950 px-2.5 py-2 font-mono-technical text-sm text-app-text outline-none transition focus:border-accent/55'
const LABEL = 'font-mono-technical text-[8px] font-bold uppercase tracking-[0.22em] text-zinc-500'

/**
 * Mikrofon eşik test monitörü — ayrı rota, ayrı localStorage.
 * Ana kalibrasyon panelinden bağımsız; Kaydet ile hem buraya hem ana eşiğe yazılabilir.
 */
export default function MicThresholdTest() {
  const { t } = useTranslation('timer')
  const {
    isConnected,
    connectionType,
    deviceName,
    connecting,
    error: hwError,
    usbSupported,
    bleSupported,
    connectUSB,
    connectBLE,
    disconnect,
    sendThreshold,
    telemetryRef,
    subscribeTrigger,
  } = useHardware()

  const [settings, setSettings] = useState(() => loadMicThresholdTest())
  const [instantLvl, setInstantLvl] = useState(0)
  const [detectCount, setDetectCount] = useState(0)
  const [logs, setLogs] = useState(/** @type {MicDetectLog[]} */ ([]))
  const [toast, setToast] = useState(/** @type {string | null} */ (null))
  const [dirty, setDirty] = useState(false)

  const settingsRef = useRef(settings)
  const pushTimerRef = useRef(0)

  useEffect(() => {
    settingsRef.current = settings
  }, [settings])

  useEffect(() => {
    if (!toast) return undefined
    const id = window.setTimeout(() => setToast(null), 2800)
    return () => window.clearTimeout(id)
  }, [toast])

  const activeThreshold = useMemo(() => getActiveMicTestThreshold(settings), [settings])

  const pushThresholdToDevice = useCallback(
    (val, { immediate = false } = {}) => {
      const n = clampMicTestThreshold(val)
      window.clearTimeout(pushTimerRef.current)
      const run = () => {
        if (isConnected) void sendThreshold(n)
      }
      if (immediate) run()
      else pushTimerRef.current = window.setTimeout(run, 180)
    },
    [isConnected, sendThreshold],
  )

  useEffect(() => {
    if (!isConnected) return
    pushThresholdToDevice(activeThreshold, { immediate: true })
  }, [isConnected, activeThreshold, pushThresholdToDevice])

  useEffect(() => {
    let raf = 0
    const tick = () => {
      const snap = telemetryRef.current
      const lvl = isConnected && snap.fresh ? Math.round(Math.min(100, Math.max(0, snap.lvl))) : 0
      setInstantLvl((prev) => (prev === lvl ? prev : lvl))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [isConnected, telemetryRef])

  const appendLog = useCallback((/** @type {Omit<MicDetectLog, 'id'>} */ entry) => {
    const row = { ...entry, id: `${entry.at}-${entry.source}-${Math.random().toString(36).slice(2, 7)}` }
    setDetectCount((c) => c + 1)
    setLogs((prev) => [row, ...prev].slice(0, 80))
  }, [])

  const handleCross = useCallback(
    (lvl, at) => {
      appendLog({
        at,
        lvl: Math.round(lvl),
        mode: settingsRef.current.activeMode,
        source: 'cross',
      })
    },
    [appendLog],
  )

  useEffect(() => {
    return subscribeTrigger((trig) => {
      const loud = Number(trig?.loudness)
      appendLog({
        at: Date.now(),
        lvl: Number.isFinite(loud) ? Math.round(loud) : Math.round(telemetryRef.current.lvl || 0),
        mode: settingsRef.current.activeMode,
        source: 'hw',
      })
    })
  }, [appendLog, subscribeTrigger, telemetryRef])

  const patchSettings = useCallback((/** @type {Partial<ReturnType<typeof loadMicThresholdTest>>} */ patch) => {
    setSettings((prev) => ({ ...prev, ...patch }))
    setDirty(true)
  }, [])

  const setModeThreshold = useCallback(
    (/** @type {import('../lib/micThresholdTestSettings').MicTestModeId} */ mode, raw) => {
      const n = clampMicTestThreshold(raw)
      patchSettings({ [mode]: n })
      if (settingsRef.current.activeMode === mode) {
        pushThresholdToDevice(n)
      }
    },
    [patchSettings, pushThresholdToDevice],
  )

  const selectMode = useCallback(
    (/** @type {import('../lib/micThresholdTestSettings').MicTestModeId} */ mode) => {
      patchSettings({ activeMode: mode })
      const next = { ...settingsRef.current, activeMode: mode }
      pushThresholdToDevice(getActiveMicTestThreshold(next), { immediate: true })
    },
    [patchSettings, pushThresholdToDevice],
  )

  const handleSave = useCallback(() => {
    const saved = saveMicThresholdTest(settings)
    setSettings(saved)
    setDirty(false)
    const active = getActiveMicTestThreshold(saved)
    saveAcousticThreshold(active)
    if (isConnected) void sendThreshold(active)
    setToast(t('micTest.toast.saved'))
  }, [isConnected, sendThreshold, settings, t])

  const handleResetLogs = useCallback(() => {
    setLogs([])
    setDetectCount(0)
  }, [])

  const typeLabel =
    connectionType === 'BLUETOOTH' ? 'BLE' : connectionType === 'USB_SERIAL' ? 'USB' : ''

  const statusText = connecting
    ? t('micTest.status.connecting')
    : isConnected
      ? t('micTest.status.connected', { name: deviceName || typeLabel || 'AUDAZ' })
      : hwError
        ? t('micTest.status.error')
        : t('micTest.status.idle')

  return (
    <div className="ilws-shell relative mx-auto w-full min-w-0 max-w-[1100px] overflow-x-hidden px-2.5 py-4 pt-11 sm:px-4 sm:py-5 sm:pt-14 md:px-6">
      {toast ? (
        <div
          className="pointer-events-none fixed left-1/2 top-[max(5.5rem,env(safe-area-inset-top))] z-[90] w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2"
          role="status"
        >
          <p className="rounded-md border border-[#facc15]/50 bg-zinc-950/95 px-4 py-2.5 text-center font-mono-technical text-[10px] font-bold uppercase tracking-[0.18em] text-[#facc15] shadow-lg">
            {toast}
          </p>
        </div>
      ) : null}

      <header className="mb-4 flex w-full min-w-0 flex-col gap-3 border-b border-white/10 pb-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="font-mono-technical text-[9px] font-semibold uppercase tracking-[0.28em] text-accent/85">
            [ {t('micTest.kicker')} ]
          </p>
          <h1 className="font-display mt-1 text-base font-bold tracking-[0.08em] text-app-text sm:text-lg md:text-xl">
            {t('micTest.title')}
          </h1>
          <p className="mt-1 max-w-2xl font-mono-technical text-[8px] leading-snug text-app-text/55 sm:text-[9px]">
            {t('micTest.subtitle')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/taktik-timer"
            className="inline-flex min-h-11 touch-manipulation items-center gap-1.5 rounded-sm border border-accent/25 bg-accent/[0.06] px-3 py-2 font-mono-technical text-[9px] uppercase tracking-[0.2em] text-accent/90 transition hover:border-accent/50"
          >
            <ArrowLeft className="size-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
            {t('micTest.back')}
          </Link>
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex min-h-11 touch-manipulation items-center gap-1.5 rounded-sm border border-[#facc15]/45 bg-[#facc15]/10 px-3 py-2 font-mono-technical text-[9px] font-bold uppercase tracking-[0.2em] text-[#facc15] transition hover:bg-[#facc15]/18"
          >
            <Save className="size-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
            {t('micTest.save')}
            {dirty ? <span className="text-[#facc15]/60">•</span> : null}
          </button>
        </div>
      </header>

      <div className="mb-4 flex flex-col gap-3 rounded-sm border border-zinc-600/50 bg-zinc-950/70 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <p className={LABEL}>{t('micTest.port')}</p>
          <p className="mt-1 font-mono-technical text-[11px] text-app-text/80">{statusText}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {bleSupported ? (
            <button
              type="button"
              disabled={connecting}
              onClick={() => void connectBLE()}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-sm border border-accent/35 bg-accent/[0.08] px-3 py-2 font-mono-technical text-[9px] uppercase tracking-[0.16em] text-accent disabled:opacity-50"
            >
              <Bluetooth className="size-3.5" strokeWidth={1.5} aria-hidden />
              {t('hardware.connectBle')}
            </button>
          ) : null}
          {usbSupported ? (
            <button
              type="button"
              disabled={connecting}
              onClick={() => void connectUSB()}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-sm border border-white/15 bg-white/[0.04] px-3 py-2 font-mono-technical text-[9px] uppercase tracking-[0.16em] text-app-text/80 disabled:opacity-50"
            >
              <Cable className="size-3.5" strokeWidth={1.5} aria-hidden />
              {t('hardware.connectUsb')}
            </button>
          ) : null}
          {isConnected ? (
            <button
              type="button"
              onClick={() => void disconnect()}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-sm border border-rose-500/35 bg-rose-500/10 px-3 py-2 font-mono-technical text-[9px] uppercase tracking-[0.16em] text-rose-300"
            >
              <Unplug className="size-3.5" strokeWidth={1.5} aria-hidden />
              {t('hardware.disconnect')}
            </button>
          ) : null}
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {MIC_TEST_MODE_IDS.map((mode) => {
          const active = settings.activeMode === mode
          const value = settings[mode]
          return (
            <button
              key={mode}
              type="button"
              onClick={() => selectMode(mode)}
              className={[
                'flex flex-col rounded-sm border p-3 text-left transition',
                active
                  ? mode === 'liveFire'
                    ? 'border-rose-500/55 bg-rose-950/35 shadow-[0_0_20px_-10px_rgba(244,63,94,0.55)]'
                    : 'border-[#facc15]/50 bg-[#facc15]/08'
                  : 'border-zinc-700/60 bg-zinc-950/50 hover:border-zinc-500/70',
              ].join(' ')}
            >
              <p
                className={[
                  'font-mono-technical text-[9px] font-bold uppercase tracking-[0.18em]',
                  active && mode === 'liveFire' ? 'text-rose-300' : active ? 'text-[#facc15]' : 'text-zinc-400',
                ].join(' ')}
              >
                {t(`micTest.modes.${mode}.title`)}
              </p>
              <p className="mt-1 font-mono-technical text-[8px] leading-snug text-app-text/45">
                {t(`micTest.modes.${mode}.hint`)}
              </p>
              <label
                className="mt-3 block"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <span className={LABEL}>{t('micTest.threshold')}</span>
                <input
                  type="number"
                  min={SOUND_THRESHOLD_MIN}
                  max={SOUND_THRESHOLD_MAX}
                  step={1}
                  value={value}
                  onChange={(e) => setModeThreshold(mode, e.target.value)}
                  className={`${FIELD} mt-1.5`}
                />
              </label>
              <input
                type="range"
                min={SOUND_THRESHOLD_MIN}
                max={SOUND_THRESHOLD_MAX}
                step={1}
                value={value}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => setModeThreshold(mode, e.target.value)}
                className="mt-2 h-2 w-full cursor-pointer accent-[var(--accent-color)]"
              />
            </button>
          )
        })}
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2 sm:gap-3">
        <div className="rounded-sm border border-zinc-700/60 bg-zinc-950/60 px-3 py-2.5">
          <p className={LABEL}>{t('micTest.instant')}</p>
          <p className="mt-1 font-mono-technical text-xl font-bold tabular-nums text-[#facc15]">
            {instantLvl}
          </p>
        </div>
        <div className="rounded-sm border border-zinc-700/60 bg-zinc-950/60 px-3 py-2.5">
          <p className={LABEL}>{t('micTest.activeMode')}</p>
          <p
            className={[
              'mt-1 font-mono-technical text-sm font-bold uppercase tracking-[0.12em]',
              settings.activeMode === 'liveFire' ? 'text-rose-300' : 'text-[#facc15]',
            ].join(' ')}
          >
            {t(`micTest.modes.${settings.activeMode}.title`)}
          </p>
        </div>
        <div className="rounded-sm border border-zinc-700/60 bg-zinc-950/60 px-3 py-2.5">
          <p className={LABEL}>{t('micTest.detected')}</p>
          <p className="mt-1 font-mono-technical text-xl font-bold tabular-nums text-app-text">
            {detectCount}
          </p>
        </div>
      </div>

      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.22em] text-zinc-500">
          {t('micTest.waveStylesLabel')}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {MIC_WAVE_STYLES.map((id) => {
            const active = settings.waveStyle === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => patchSettings({ waveStyle: id })}
                className={[
                  'rounded-sm border px-2.5 py-1.5 font-mono-technical text-[8px] font-bold uppercase tracking-[0.14em] transition',
                  active
                    ? 'border-[#facc15]/55 bg-[#facc15]/12 text-[#facc15]'
                    : 'border-zinc-700/70 bg-zinc-950/60 text-zinc-500 hover:border-zinc-500 hover:text-app-text/80',
                ].join(' ')}
              >
                {t(`micTest.waveStyles.${id}`)}
              </button>
            )
          })}
        </div>
      </div>

      <MicThresholdWaveform
        telemetryRef={telemetryRef}
        threshold={activeThreshold}
        isConnected={isConnected}
        style={settings.waveStyle}
        onCross={handleCross}
        className="mb-4"
      />

      <MicFrequencySpectrumPanel
        telemetryRef={telemetryRef}
        isConnected={isConnected}
        mode={settings.activeMode}
        threshold={activeThreshold}
        className="mb-4"
      />

      <div className="rounded-sm border border-zinc-700/60 bg-zinc-950/50 p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="font-mono-technical text-[9px] font-bold uppercase tracking-[0.2em] text-app-text/70">
            {t('micTest.logsTitle')}
          </p>
          <button
            type="button"
            onClick={handleResetLogs}
            className="font-mono-technical text-[8px] uppercase tracking-[0.16em] text-zinc-500 transition hover:text-accent"
          >
            {t('micTest.clearLogs')}
          </button>
        </div>
        {logs.length === 0 ? (
          <p className="font-mono-technical text-[9px] text-zinc-600">{t('micTest.logsEmpty')}</p>
        ) : (
          <ul className="max-h-48 space-y-1 overflow-y-auto font-mono-technical text-[10px] tabular-nums text-app-text/75">
            {logs.map((row) => (
              <li key={row.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-b border-white/[0.04] py-1">
                <span className="text-zinc-500">
                  {new Date(row.at).toLocaleTimeString()}
                </span>
                <span className={row.source === 'hw' ? 'text-rose-300' : 'text-[#facc15]'}>
                  LVL {row.lvl}
                </span>
                <span className="text-zinc-500">
                  {t(`micTest.modes.${row.mode}.title`)}
                </span>
                <span className="text-zinc-600">
                  {row.source === 'hw' ? t('micTest.sourceHw') : t('micTest.sourceCross')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
