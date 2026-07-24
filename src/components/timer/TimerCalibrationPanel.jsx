import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bluetooth, Cable, CheckCircle2, Circle, Save, Send, SlidersHorizontal, Unplug } from 'lucide-react'
import AcousticVuMeter from './AcousticVuMeter'
import MpuCalibrationTarget from './MpuCalibrationTarget'
import MpuGForceGuidePanel from './MpuGForceGuidePanel'
import TacticalPanel from '../ui/TacticalPanel'
import { useHardware } from '../../context/HardwareContext'
import { useTimerCalibration } from '../../hooks/useTimerCalibration'
import {
  MPU_G_FORCE_OPTIONS,
  NEOPIXEL_BRIGHTNESS_MAX,
  NEOPIXEL_BRIGHTNESS_MIN,
  NEOPIXEL_STATUS_COLORS,
  SCREEN_DIAGONAL_MAX_IN,
  SCREEN_DIAGONAL_MIN_IN,
  SCREEN_ORIENTATION_OPTIONS,
  EYE_SCREEN_DISTANCE_PRESETS,
  EYE_SCREEN_DISTANCE_MIN_M,
  EYE_SCREEN_DISTANCE_MAX_M,
  SOUND_THRESHOLD_MAX,
  SOUND_THRESHOLD_MIN,
  saveAcousticThreshold,
} from '../../lib/timerCalibrationSettings'

const FIELD =
  'w-full rounded-sm border border-accent/30 bg-app-bg px-2.5 py-2 font-mono-technical text-sm text-app-text outline-none transition focus:border-accent/60'
const LABEL =
  'font-mono-technical text-[8px] font-bold uppercase tracking-[0.28em] text-accent/70'
const SLIDER = 'h-2 w-full cursor-pointer accent-[var(--accent-color)]'

/**
 * @param {{
 *   title: string
 *   opsCode: string
 *   children: import('react').ReactNode
 *   className?: string
 * }} props
 */
function CalibrationSection({ title, opsCode, children, className = '' }) {
  return (
    <TacticalPanel className={`flex flex-col p-4 sm:p-5 ${className}`.trim()}>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 border-b border-white/10 pb-2.5">
        <h3 className="font-display text-[13px] font-bold uppercase tracking-[0.16em] text-app-text sm:text-sm sm:tracking-[0.2em]">
          {title}
        </h3>
        <span className="font-mono-technical text-[7px] uppercase tracking-[0.32em] text-app-text/40">
          {opsCode}
        </span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-4">{children}</div>
    </TacticalPanel>
  )
}

/**
 * Ayarlar & Kalibrasyon — içerik blokları (sayfa header’ı başlığı taşır).
 */
export default function TimerCalibrationPanel() {
  const { t } = useTranslation('timer')
  const { settings, updateSettings, persistPatch, persistAndSync, resetDefaults } = useTimerCalibration()
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
    sendSaveThreshold,
  } = useHardware()
  const [toast, setToast] = useState(/** @type {string | null} */ (null))
  const wasConnectedRef = useRef(false)
  const thresholdSendTimerRef = useRef(0)

  useEffect(() => {
    if (!toast) return undefined
    const id = window.setTimeout(() => setToast(null), 3200)
    return () => window.clearTimeout(id)
  }, [toast])

  const pushToast = useCallback((msg) => {
    setToast(msg)
  }, [])

  const clampThreshold = useCallback((raw) => {
    const n = Math.round(Number(raw))
    if (!Number.isFinite(n)) return SOUND_THRESHOLD_MIN
    return Math.min(SOUND_THRESHOLD_MAX, Math.max(SOUND_THRESHOLD_MIN, n))
  }, [])

  /** UI + donanım: THRESHOLD:<val>\\n */
  const applySoundThreshold = useCallback(
    (raw, { pushNow = false } = {}) => {
      const n = clampThreshold(raw)
      updateSettings({ soundThreshold: n })

      if (!isConnected) return n

      if (thresholdSendTimerRef.current) {
        window.clearTimeout(thresholdSendTimerRef.current)
        thresholdSendTimerRef.current = 0
      }

      const fire = () => {
        thresholdSendTimerRef.current = 0
        void sendThreshold(n)
      }

      if (pushNow) fire()
      else thresholdSendTimerRef.current = window.setTimeout(fire, 40)

      return n
    },
    [clampThreshold, isConnected, sendThreshold, updateSettings],
  )

  // Bağlantı kurulunca mevcut (varsayılan) eşiği donanıma fırlat
  useEffect(() => {
    if (isConnected && !wasConnectedRef.current) {
      void sendThreshold(clampThreshold(settings.soundThreshold))
    }
    wasConnectedRef.current = isConnected
  }, [clampThreshold, isConnected, sendThreshold, settings.soundThreshold])

  useEffect(() => {
    if (hwError === 'link-lost') {
      pushToast(t('hardware.toast.linkLost'))
    }
  }, [hwError, pushToast, t])

  useEffect(() => {
    return () => {
      if (thresholdSendTimerRef.current) window.clearTimeout(thresholdSendTimerRef.current)
    }
  }, [])

  const handleConnectBle = useCallback(async () => {
    const ok = await connectBLE()
    if (ok) {
      pushToast(t('hardware.toast.bleConnected'))
      const n = clampThreshold(settings.soundThreshold)
      void sendThreshold(n)
    }
  }, [clampThreshold, connectBLE, pushToast, sendThreshold, settings.soundThreshold, t])

  const handleConnectUsb = useCallback(async () => {
    const ok = await connectUSB()
    if (ok) {
      pushToast(t('hardware.toast.usbConnected'))
      const n = clampThreshold(settings.soundThreshold)
      void sendThreshold(n)
    }
  }, [clampThreshold, connectUSB, pushToast, sendThreshold, settings.soundThreshold, t])

  const handleSaveAcousticThreshold = useCallback(async () => {
    const n = clampThreshold(settings.soundThreshold)
    updateSettings({ soundThreshold: n })
    saveAcousticThreshold(n)
    if (isConnected) {
      await sendSaveThreshold(n)
      await sendThreshold(n)
    }
    pushToast(t('calibration.sound.savedToast'))
  }, [
    clampThreshold,
    isConnected,
    pushToast,
    sendSaveThreshold,
    sendThreshold,
    settings.soundThreshold,
    t,
    updateSettings,
  ])

  const handleDisconnect = useCallback(async () => {
    await disconnect()
    pushToast(t('calibration.toast.disconnected'))
  }, [disconnect, pushToast, t])

  const handleSave = useCallback(() => {
    persistAndSync()
    pushToast(
      isConnected ? t('calibration.toast.savedAndSent') : t('calibration.toast.savedLocal'),
    )
  }, [isConnected, persistAndSync, pushToast, t])

  const handleReset = useCallback(() => {
    resetDefaults()
    pushToast(t('calibration.toast.reset'))
  }, [pushToast, resetDefaults, t])

  const handleZeroPointCommit = useCallback(
    (/** @type {{ x: number, y: number, yaw?: number }} */ offset) => {
      // Sıfırla / Kalibre Et → localStorage'a anında yaz (sayfa değişince kaybolmasın)
      persistPatch({
        mpuOffsetX: offset.x,
        mpuOffsetY: offset.y,
        mpuOffsetYaw: offset.yaw ?? 0,
        mpuCalibratedAt: Date.now(),
      })
    },
    [persistPatch],
  )

  const handleMpuCalSuccess = useCallback(() => {
    pushToast(t('calibration.toast.zeroSuccessSaved'))
  }, [pushToast, t])

  const typeLabel =
    connectionType === 'BLUETOOTH' ? 'BLE' : connectionType === 'USB_SERIAL' ? 'USB' : ''

  const hwErrorText =
    hwError === 'cancelled'
      ? t('calibration.serial.cancelled')
      : hwError === 'usb-unsupported'
        ? t('hardware.error.usbUnsupported')
        : hwError === 'ble-unsupported'
          ? t('hardware.error.bleUnsupported')
          : hwError === 'usb-failed'
            ? t('hardware.error.usbFailed')
            : hwError === 'ble-failed'
              ? t('hardware.error.bleFailed')
              : hwError
                ? t('calibration.serial.failed')
                : null

  return (
    <div className="relative flex w-full min-w-0 flex-col gap-4 overflow-x-hidden">
      {toast ? (
        <div
          className="pointer-events-none fixed left-1/2 top-[max(5.5rem,env(safe-area-inset-top))] z-[90] w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2"
          role="status"
          aria-live="polite"
        >
          <p className="pointer-events-auto rounded-md border border-[#facc15]/50 bg-zinc-950/95 px-4 py-2.5 text-center font-mono-technical text-[10px] font-bold uppercase tracking-[0.18em] text-[#facc15] shadow-lg">
            {toast}
          </p>
        </div>
      ) : null}

      {/* Başlık sayfa header'ında — burada tekrarlanmaz */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CalibrationSection title={t('calibration.sound.title')} opsCode="CAL-AUD">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-4">
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex items-center justify-between gap-2">
                <label htmlFor="timer-sound-threshold" className={LABEL}>
                  {t('calibration.sound.threshold')}
                </label>
                <span className="font-mono-technical text-xs font-bold tabular-nums text-accent">
                  {settings.soundThreshold}
                </span>
              </div>
              <input
                id="timer-sound-threshold"
                type="range"
                min={SOUND_THRESHOLD_MIN}
                max={SOUND_THRESHOLD_MAX}
                step={1}
                value={settings.soundThreshold}
                onChange={(e) => applySoundThreshold(e.target.value)}
                onMouseUp={(e) =>
                  applySoundThreshold(/** @type {HTMLInputElement} */ (e.currentTarget).value, {
                    pushNow: true,
                  })
                }
                onTouchEnd={(e) =>
                  applySoundThreshold(/** @type {HTMLInputElement} */ (e.currentTarget).value, {
                    pushNow: true,
                  })
                }
                onKeyUp={(e) => {
                  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Home' || e.key === 'End') {
                    applySoundThreshold(/** @type {HTMLInputElement} */ (e.currentTarget).value, {
                      pushNow: true,
                    })
                  }
                }}
                className={SLIDER}
                aria-label={t('calibration.sound.thresholdAria')}
              />
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                <label htmlFor="timer-sound-threshold-num" className={`${LABEL} shrink-0`}>
                  {t('calibration.sound.numeric')}
                </label>
                <input
                  id="timer-sound-threshold-num"
                  type="number"
                  min={SOUND_THRESHOLD_MIN}
                  max={SOUND_THRESHOLD_MAX}
                  value={settings.soundThreshold}
                  onChange={(e) => applySoundThreshold(e.target.value)}
                  onBlur={(e) =>
                    applySoundThreshold(e.currentTarget.value, { pushNow: true })
                  }
                  className={`${FIELD} sm:max-w-[7rem]`}
                />
                <button
                  type="button"
                  onClick={() => void handleSaveAcousticThreshold()}
                  className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-sm border border-[#facc15]/45 bg-[#facc15]/10 px-3 font-mono-technical text-[9px] font-bold uppercase tracking-[0.18em] text-[#facc15] transition hover:border-[#facc15]/70 hover:bg-[#facc15]/16 active:scale-[0.99]"
                >
                  <Save className="size-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
                  {t('calibration.sound.save')}
                </button>
              </div>
              {/* Mobil: yatay VU */}
              <AcousticVuMeter
                threshold={settings.soundThreshold}
                orientation="horizontal"
                className="mt-3 sm:hidden"
              />
            </div>
            {/* Masaüstü: slider yanında dikey VU */}
            <AcousticVuMeter
              threshold={settings.soundThreshold}
              orientation="vertical"
              className="hidden sm:flex"
            />
          </div>
        </CalibrationSection>

        <CalibrationSection title={t('calibration.neopixel.title')} opsCode="CAL-LED">
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <label htmlFor="timer-neopixel-brightness" className={LABEL}>
                {t('calibration.neopixel.brightness')}
              </label>
              <span className="font-mono-technical text-xs font-bold tabular-nums text-accent">
                {settings.neopixelBrightness}%
              </span>
            </div>
            <input
              id="timer-neopixel-brightness"
              type="range"
              min={NEOPIXEL_BRIGHTNESS_MIN}
              max={NEOPIXEL_BRIGHTNESS_MAX}
              step={1}
              value={settings.neopixelBrightness}
              onChange={(e) => updateSettings({ neopixelBrightness: Number(e.target.value) })}
              className={SLIDER}
              aria-label={t('calibration.neopixel.brightnessAria')}
            />
          </div>

          <div>
            <p className={`${LABEL} mb-2`}>{t('calibration.neopixel.statusColor')}</p>
            <div className="flex flex-wrap gap-2">
              {NEOPIXEL_STATUS_COLORS.map((swatch) => {
                const selected = settings.neopixelStatusColor === swatch.hex
                return (
                  <button
                    key={swatch.id}
                    type="button"
                    onClick={() => updateSettings({ neopixelStatusColor: swatch.hex })}
                    className={[
                      'flex min-w-[4.5rem] flex-1 items-center gap-2 rounded-sm border px-2.5 py-2 transition sm:flex-none',
                      selected
                        ? 'border-accent/55 bg-accent/[0.1]'
                        : 'border-white/12 bg-white/[0.03] hover:border-accent/35',
                    ].join(' ')}
                    aria-pressed={selected}
                    aria-label={t(swatch.labelKey)}
                  >
                    <span
                      className="size-4 shrink-0 rounded-sm border border-white/20"
                      style={{
                        backgroundColor: swatch.hex,
                        opacity: Math.max(0.25, settings.neopixelBrightness / 100),
                        boxShadow: selected
                          ? `0 0 10px -2px ${swatch.hex}`
                          : 'none',
                      }}
                    />
                    <span className="font-mono-technical text-[8px] uppercase tracking-[0.16em] text-app-text/75">
                      {t(swatch.labelKey)}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </CalibrationSection>

        <CalibrationSection title={t('calibration.mpu.title')} opsCode="CAL-IMU" className="lg:col-span-2">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:items-stretch lg:gap-6">
            <div className="flex w-full min-w-0 flex-col gap-4">
              <MpuCalibrationTarget
                offsetX={settings.mpuOffsetX}
                offsetY={settings.mpuOffsetY}
                offsetYaw={settings.mpuOffsetYaw}
                gForceRange={settings.mpuGForceRange}
                onZeroPointCommit={handleZeroPointCommit}
                onSuccess={handleMpuCalSuccess}
              />

              <div>
                <label htmlFor="timer-mpu-range" className={`${LABEL} mb-2 block`}>
                  {t('calibration.mpu.gForce')}
                </label>
                <select
                  id="timer-mpu-range"
                  value={settings.mpuGForceRange}
                  onChange={(e) =>
                    updateSettings({
                      mpuGForceRange: /** @type {import('../../lib/timerCalibrationSettings').MpuGForceRange} */ (
                        e.target.value
                      ),
                    })
                  }
                  className={`dossier-blood-select ${FIELD} pr-8`}
                >
                  {MPU_G_FORCE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <p className="mt-2 font-mono-technical text-[9px] leading-relaxed text-app-text/45">
                  {t('calibration.mpu.hint')}
                </p>
              </div>

              <div className="rounded-sm border border-zinc-600/50 bg-zinc-900/40 px-3 py-2.5">
                <p className={`${LABEL} text-[#facc15]/70`}>{t('calibration.mpu.targetHintTitle')}</p>
                <p className="mt-1.5 font-mono-technical text-[9px] leading-relaxed text-app-text/55">
                  {t('calibration.mpu.targetHint')}
                </p>
                {settings.mpuCalibratedAt ? (
                  <p className="mt-2 font-mono-technical text-[8px] uppercase tracking-[0.18em] text-[#facc15]/75">
                    {t('calibration.mpu.lastCal', {
                      time: new Date(settings.mpuCalibratedAt).toLocaleTimeString(),
                    })}
                  </p>
                ) : (
                  <p className="mt-2 font-mono-technical text-[8px] uppercase tracking-[0.18em] text-zinc-500">
                    {t('calibration.mpu.notCalibrated')}
                  </p>
                )}
              </div>
            </div>

            <div className="flex w-full min-w-0">
              <MpuGForceGuidePanel
                activeRange={settings.mpuGForceRange}
                onSelectRange={(range) => updateSettings({ mpuGForceRange: range })}
              />
            </div>
          </div>
        </CalibrationSection>

        <CalibrationSection title={t('calibration.screen.title')} opsCode="CAL-SCR" className="lg:col-span-2">
          <p className="font-mono-technical text-[9px] leading-relaxed text-app-text/55">
            {t('calibration.screen.subtitle')}
          </p>

          <div>
            <p className={`${LABEL} mb-2`}>{t('calibration.screen.orientationLabel')}</p>
            <div className="grid grid-cols-2 gap-1 rounded-sm border border-zinc-600/55 bg-zinc-950/60 p-1">
              {SCREEN_ORIENTATION_OPTIONS.map((orient) => {
                const active = settings.screenOrientation === orient
                return (
                  <button
                    key={orient}
                    type="button"
                    onClick={() => updateSettings({ screenOrientation: orient })}
                    aria-pressed={active}
                    className={[
                      'min-h-11 rounded-sm px-2 py-2 font-mono-technical text-[9px] font-bold uppercase tracking-[0.16em] transition',
                      active
                        ? 'bg-[rgba(250,204,21,0.14)] text-[#facc15]'
                        : 'text-zinc-500 hover:text-app-text/80',
                    ].join(' ')}
                  >
                    {t(`calibration.screen.orientation.${orient}`)}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <label htmlFor="timer-screen-inches" className={LABEL}>
                {t('calibration.screen.diagonal')}
              </label>
              <span className="font-mono-technical text-xs font-bold tabular-nums text-accent">
                {settings.screenDiagonalInches}&quot;
              </span>
            </div>
            <input
              id="timer-screen-inches"
              type="range"
              min={SCREEN_DIAGONAL_MIN_IN}
              max={SCREEN_DIAGONAL_MAX_IN}
              step={0.1}
              value={settings.screenDiagonalInches}
              onChange={(e) => updateSettings({ screenDiagonalInches: Number(e.target.value) })}
              className={SLIDER}
              aria-label={t('calibration.screen.diagonalAria')}
            />
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <label htmlFor="timer-screen-inches-num" className={`${LABEL} shrink-0`}>
                {t('calibration.screen.diagonalNumeric')}
              </label>
              <input
                id="timer-screen-inches-num"
                type="number"
                min={SCREEN_DIAGONAL_MIN_IN}
                max={SCREEN_DIAGONAL_MAX_IN}
                step={0.1}
                value={settings.screenDiagonalInches}
                onChange={(e) => updateSettings({ screenDiagonalInches: Number(e.target.value) })}
                className={`${FIELD} sm:max-w-[7rem]`}
              />
            </div>
            <p className="mt-2 font-mono-technical text-[9px] leading-relaxed text-app-text/45">
              {t('calibration.screen.hint')}
            </p>
          </div>

          <div>
            <p className={`${LABEL} mb-2`}>{t('calibration.screen.eyeDistance')}</p>
            <div className="flex flex-wrap gap-1.5">
              {EYE_SCREEN_DISTANCE_PRESETS.map((m) => {
                const active = settings.eyeScreenDistanceM === m
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => updateSettings({ eyeScreenDistanceM: m })}
                    aria-pressed={active}
                    className={[
                      'min-h-10 rounded-sm border px-2.5 py-1.5 font-mono-technical text-[9px] font-bold uppercase tracking-[0.14em] transition',
                      active
                        ? 'border-[#facc15]/55 bg-[rgba(250,204,21,0.14)] text-[#facc15]'
                        : 'border-zinc-600/50 text-zinc-400 hover:border-[#facc15]/35 hover:text-[#facc15]',
                    ].join(' ')}
                  >
                    {m} m
                  </button>
                )
              })}
            </div>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <label htmlFor="timer-eye-distance" className={`${LABEL} shrink-0`}>
                {t('calibration.screen.eyeDistanceNumeric')}
              </label>
              <input
                id="timer-eye-distance"
                type="number"
                min={EYE_SCREEN_DISTANCE_MIN_M}
                max={EYE_SCREEN_DISTANCE_MAX_M}
                step={0.1}
                value={settings.eyeScreenDistanceM}
                onChange={(e) => updateSettings({ eyeScreenDistanceM: Number(e.target.value) })}
                className={`${FIELD} sm:max-w-[7rem]`}
                aria-label={t('calibration.screen.eyeDistanceAria')}
              />
              <span className="font-mono-technical text-[9px] text-app-text/45">m</span>
            </div>
            <p className="mt-2 font-mono-technical text-[9px] leading-relaxed text-app-text/45">
              {t('calibration.screen.eyeHint')}
            </p>
          </div>
        </CalibrationSection>

        <CalibrationSection title={t('calibration.serial.title')} opsCode="CAL-HW" className="lg:col-span-2">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              {isConnected ? (
                <CheckCircle2 className="size-4 shrink-0 text-emerald-400" strokeWidth={1.5} aria-hidden />
              ) : (
                <Circle className="size-4 shrink-0 text-app-text/35" strokeWidth={1.5} aria-hidden />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-mono-technical text-[10px] font-bold uppercase tracking-[0.2em] text-app-text">
                  {t('hardware.connectTitle')}
                </p>
                <p className="mt-0.5 font-mono-technical text-[8px] uppercase tracking-[0.18em] text-app-text/45">
                  {isConnected
                    ? t('hardware.badge.connected', {
                        name: deviceName || 'AUDAZ-DRYFIRE-S3',
                        type: typeLabel,
                      })
                    : t('hardware.connectHint')}
                </p>
              </div>
            </div>

            {isConnected ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex min-h-10 items-center gap-1.5 rounded-sm border border-emerald-500/45 bg-emerald-500/10 px-3 font-mono-technical text-[9px] font-bold uppercase tracking-[0.16em] text-emerald-300">
                  {connectionType === 'BLUETOOTH' ? (
                    <Bluetooth className="size-3.5 text-sky-400" strokeWidth={1.5} aria-hidden />
                  ) : (
                    <Cable className="size-3.5" strokeWidth={1.5} aria-hidden />
                  )}
                  {t('hardware.badge.connected', {
                    name: deviceName || 'AUDAZ-DRYFIRE-S3',
                    type: typeLabel,
                  })}
                </span>
                <button
                  type="button"
                  onClick={() => void handleDisconnect()}
                  className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-sm border border-white/20 bg-white/[0.04] px-3 py-2 font-mono-technical text-[9px] uppercase tracking-[0.2em] text-app-text/80 transition hover:border-accent/40 hover:text-accent"
                >
                  <Unplug className="size-3.5" strokeWidth={1.5} aria-hidden />
                  {t('hardware.disconnect')}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => void handleConnectBle()}
                  disabled={connecting || !bleSupported}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-sm border border-sky-400/45 bg-sky-500/10 px-3 font-mono-technical text-[9px] font-bold uppercase tracking-[0.16em] text-sky-300 transition hover:bg-sky-500/16 disabled:opacity-45"
                >
                  <Bluetooth className="size-4" strokeWidth={1.5} aria-hidden />
                  {connecting ? t('hardware.connecting') : t('hardware.connectBle')}
                </button>
                <button
                  type="button"
                  onClick={() => void handleConnectUsb()}
                  disabled={connecting || !usbSupported}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-sm border border-accent/40 bg-accent/[0.1] px-3 font-mono-technical text-[9px] font-bold uppercase tracking-[0.16em] text-accent transition hover:border-accent/65 hover:bg-accent/[0.16] disabled:opacity-45"
                >
                  <Cable className="size-4" strokeWidth={1.5} aria-hidden />
                  {connecting ? t('hardware.connecting') : t('hardware.connectUsb')}
                </button>
              </div>
            )}

            {!bleSupported || !usbSupported ? (
              <p className="font-mono-technical text-[8px] uppercase tracking-[0.12em] text-app-text/40">
                {!bleSupported ? t('hardware.error.bleUnsupported') : null}
                {!bleSupported && !usbSupported ? ' · ' : null}
                {!usbSupported ? t('hardware.error.usbUnsupported') : null}
              </p>
            ) : null}

            {hwErrorText ? (
              <p className="font-mono-technical text-[9px] text-red-400/90">{hwErrorText}</p>
            ) : null}
          </div>
        </CalibrationSection>
      </div>

      <div className="flex flex-col gap-2 border-t border-white/10 pt-4 sm:flex-row sm:flex-wrap sm:justify-end">
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex min-h-11 touch-manipulation items-center justify-center gap-1.5 rounded-sm border border-white/15 bg-transparent px-3 py-2.5 font-mono-technical text-[9px] uppercase tracking-[0.2em] text-app-text/60 transition hover:border-white/30 hover:text-app-text/85 sm:order-1"
        >
          <SlidersHorizontal className="size-3.5" strokeWidth={1.5} aria-hidden />
          {t('calibration.actions.reset')}
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="inline-flex min-h-11 touch-manipulation items-center justify-center gap-1.5 rounded-sm border border-accent/45 bg-accent/[0.12] px-4 py-2.5 font-mono-technical text-[10px] font-bold uppercase tracking-[0.22em] text-accent transition hover:border-accent/70 hover:bg-accent/[0.18] sm:order-2"
        >
          <Send className="size-3.5" strokeWidth={1.5} aria-hidden />
          {t('calibration.actions.saveSend')}
        </button>
      </div>
    </div>
  )
}
