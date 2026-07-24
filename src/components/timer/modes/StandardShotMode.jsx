import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Crosshair,
  FileDown,
  History,
  Loader2,
  RotateCcw,
  Save,
  Square,
  Timer,
  Zap,
} from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import { useHardware } from '../../../context/HardwareContext'
import { useTimerCalibration } from '../../../hooks/useTimerCalibration'
import { useTacticalSessions } from '../../../hooks/useTacticalSessions'
import HardwareStatusBadge from '../../hardware/HardwareStatusBadge'
import StandardShotAnalytics from '../StandardShotAnalytics'
import StandardShotHistory from '../StandardShotHistory'
import UnsavedSessionGuardModal from '../UnsavedSessionGuardModal'
import { createStandardShotSession, synthesizeMpuSamples } from '../../../lib/standardShotSessionStore'
import { exportStandardShotSessionPdf } from '../../../lib/standardShotReportPdf'
import {
  ARM_DELAY_FIXED_DEFAULT_SEC,
  ARM_DELAY_FIXED_MAX_SEC,
  ARM_DELAY_FIXED_MIN_SEC,
  ARM_DELAY_FIXED_STEP_SEC,
  buildSplitRows,
  clampFixedDelaySec,
  computeShotSummary,
  formatShotMillis,
  formatShotSeconds,
  resolveArmDelayMs,
} from '../../../lib/standardShotTimer'

/** @typedef {'idle' | 'delay' | 'running' | 'summary'} ShotPhase */
/** @typedef {'live' | 'history'} ShotTab */
/** @typedef {import('../../../lib/standardShotTimer').ArmDelayMode} ArmDelayMode */

/**
 * Standart Atış — shot timer terminali.
 * @param {{
 *   modeTitle?: string
 *   opsCode?: string
 *   onSessionActiveChange?: (active: boolean) => void
 *   fsAbortToken?: number
 * }} props
 */
export default function StandardShotMode({
  modeTitle = '',
  opsCode = 'TMR-01',
  onSessionActiveChange,
  fsAbortToken = 0,
}) {
  const { t, i18n } = useTranslation('timer')
  const { userData, user } = useAuth()
  const { settings } = useTimerCalibration()
  const {
    sessions,
    loading: sessionsLoading,
    saving: sessionSaving,
    deletingId,
    saveSession,
    deleteSession,
  } = useTacticalSessions()

  const [tab, setTab] = useState(/** @type {ShotTab} */ ('live'))
  const [phase, setPhase] = useState(/** @type {ShotPhase} */ ('idle'))
  const [liveMs, setLiveMs] = useState(0)
  const [shotTimesMs, setShotTimesMs] = useState(/** @type {number[]} */ ([]))
  const [delayTotalMs, setDelayTotalMs] = useState(0)
  const [savedFlash, setSavedFlash] = useState(false)
  const [lastSavedId, setLastSavedId] = useState(/** @type {string | null} */ (null))
  const [pdfBusy, setPdfBusy] = useState(false)
  const [saveError, setSaveError] = useState(/** @type {string | null} */ (null))
  const [delayMode, setDelayMode] = useState(/** @type {ArmDelayMode} */ ('random'))
  const [fixedDelaySec, setFixedDelaySec] = useState(ARM_DELAY_FIXED_DEFAULT_SEC)
  const [unsavedGuardOpen, setUnsavedGuardOpen] = useState(false)
  const [pendingGuardAction, setPendingGuardAction] = useState(
    /** @type {'arm' | 'reset' | null} */ (null),
  )

  const phaseRef = useRef(phase)
  const goAtRef = useRef(0)
  const delayTimerRef = useRef(0)
  const rafRef = useRef(0)
  const shotTimesRef = useRef(/** @type {number[]} */ ([]))

  const locale = i18n.language?.startsWith('tr') ? 'tr' : 'en'

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  const listening = phase === 'running'
  const { subscribeTrigger, triggerManual, error: hwError } = useHardware()
  const thresholdRef = useRef(settings.soundThreshold)

  useEffect(() => {
    thresholdRef.current = settings.soundThreshold
  }, [settings.soundThreshold])

  const handleBang = useCallback(() => {
    if (phaseRef.current !== 'running') return
    const elapsed = performance.now() - goAtRef.current
    const next = [...shotTimesRef.current, elapsed]
    shotTimesRef.current = next
    setShotTimesMs(next)
  }, [])

  useEffect(() => {
    if (!listening) return undefined
    return subscribeTrigger((trigger) => {
      if (trigger.loudness < thresholdRef.current) return
      handleBang()
    })
  }, [listening, subscribeTrigger, handleBang])

  // Canlı kronometre — ilk atışa kadar büyük display; sonrası string elapsed
  useEffect(() => {
    if (phase !== 'running') {
      cancelAnimationFrame(rafRef.current)
      return undefined
    }
    const tick = () => {
      setLiveMs(performance.now() - goAtRef.current)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [phase])

  // Space / Enter → manuel bang (running)
  useEffect(() => {
    if (phase !== 'running') return undefined
    const onKey = (e) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault()
        triggerManual({ loudness: Math.max(thresholdRef.current, 60) })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, triggerManual])

  const hasUnsavedChanges = shotTimesMs.length > 0 && !lastSavedId

  const clearDelayTimer = useCallback(() => {
    if (delayTimerRef.current) {
      window.clearTimeout(delayTimerRef.current)
      delayTimerRef.current = 0
    }
  }, [])

  const resetAll = useCallback(() => {
    clearDelayTimer()
    cancelAnimationFrame(rafRef.current)
    shotTimesRef.current = []
    setShotTimesMs([])
    setLiveMs(0)
    setDelayTotalMs(0)
    setPhase('idle')
    setSavedFlash(false)
    setLastSavedId(null)
    setSaveError(null)
    setUnsavedGuardOpen(false)
    setPendingGuardAction(null)
  }, [clearDelayTimer])

  useEffect(() => {
    if (hwError !== 'link-lost') return
    clearDelayTimer()
    cancelAnimationFrame(rafRef.current)
    setPhase('idle')
    setLiveMs(0)
  }, [clearDelayTimer, hwError])

  useEffect(() => {
    if (fsAbortToken <= 0) return
    clearDelayTimer()
    cancelAnimationFrame(rafRef.current)
    setPhase('idle')
    setLiveMs(0)
  }, [clearDelayTimer, fsAbortToken])

  useEffect(() => {
    const active = phase === 'delay' || phase === 'running'
    onSessionActiveChange?.(active)
    return () => onSessionActiveChange?.(false)
  }, [onSessionActiveChange, phase])

  const armStart = useCallback(() => {
    clearDelayTimer()
    shotTimesRef.current = []
    setShotTimesMs([])
    setLiveMs(0)
    setSavedFlash(false)
    setLastSavedId(null)
    setSaveError(null)
    setUnsavedGuardOpen(false)
    setPendingGuardAction(null)
    const delay = resolveArmDelayMs(delayMode, fixedDelaySec)
    setDelayTotalMs(delay)
    setPhase('delay')
    setTab('live')
    delayTimerRef.current = window.setTimeout(() => {
      goAtRef.current = performance.now()
      setLiveMs(0)
      setPhase('running')
      delayTimerRef.current = 0
    }, delay)
  }, [clearDelayTimer, delayMode, fixedDelaySec])

  const requestArmStart = useCallback(() => {
    if (hasUnsavedChanges) {
      setPendingGuardAction('arm')
      setUnsavedGuardOpen(true)
      return
    }
    armStart()
  }, [armStart, hasUnsavedChanges])

  const requestReset = useCallback(() => {
    if (hasUnsavedChanges) {
      setPendingGuardAction('reset')
      setUnsavedGuardOpen(true)
      return
    }
    resetAll()
  }, [hasUnsavedChanges, resetAll])

  const cancelUnsavedGuard = useCallback(() => {
    setUnsavedGuardOpen(false)
    setPendingGuardAction(null)
  }, [])

  const confirmUnsavedGuard = useCallback(() => {
    const action = pendingGuardAction
    setUnsavedGuardOpen(false)
    setPendingGuardAction(null)
    if (action === 'arm') {
      armStart()
      return
    }
    resetAll()
  }, [armStart, pendingGuardAction, resetAll])

  const buildLiveSessionPayload = useCallback(() => {
    return createStandardShotSession({
      shotTimesMs: shotTimesRef.current.length ? shotTimesRef.current : shotTimesMs,
      delayMs: delayTotalMs,
      calibration: {
        soundThreshold: settings.soundThreshold,
        mpuGForceRange: settings.mpuGForceRange,
        mpuOffsetX: settings.mpuOffsetX,
        mpuOffsetY: settings.mpuOffsetY,
        neopixelBrightness: settings.neopixelBrightness,
      },
      operator: {
        callsign: userData?.callsign || user?.displayName || '',
        username: userData?.username || '',
      },
    })
  }, [
    delayTotalMs,
    settings.mpuGForceRange,
    settings.mpuOffsetX,
    settings.mpuOffsetY,
    settings.neopixelBrightness,
    settings.soundThreshold,
    shotTimesMs,
    user?.displayName,
    userData?.callsign,
    userData?.username,
  ])

  const handleSaveSession = useCallback(async () => {
    if (shotTimesMs.length === 0 || sessionSaving) return
    setSaveError(null)
    try {
      const session = buildLiveSessionPayload()
      const saved = await saveSession(session)
      setLastSavedId(saved.id)
      setSavedFlash(true)
      window.setTimeout(() => setSavedFlash(false), 2800)
    } catch {
      setSaveError(t('standardShot.save.error'))
    }
  }, [buildLiveSessionPayload, saveSession, sessionSaving, shotTimesMs.length, t])

  const handlePdfActive = useCallback(async () => {
    if (shotTimesMs.length === 0) return
    setPdfBusy(true)
    try {
      const session =
        (lastSavedId && sessions.find((s) => s.id === lastSavedId)) || buildLiveSessionPayload()
      await exportStandardShotSessionPdf({
        session,
        operator: {
          callsign: userData?.callsign || user?.displayName || '',
          username: userData?.username || '',
          bloodType: userData?.bloodType || '',
          email: userData?.email || user?.email || '',
        },
      })
    } finally {
      setPdfBusy(false)
    }
  }, [
    buildLiveSessionPayload,
    lastSavedId,
    sessions,
    shotTimesMs.length,
    user?.displayName,
    user?.email,
    userData?.bloodType,
    userData?.callsign,
    userData?.email,
    userData?.username,
  ])

  const liveMpuSamples = useMemo(() => {
    if (shotTimesMs.length === 0) return []
    return synthesizeMpuSamples(
      `live-${shotTimesMs.length}-${Math.round(shotTimesMs[0] || 0)}`,
      shotTimesMs.length,
      settings,
    )
  }, [settings, shotTimesMs])

  const endTest = useCallback(() => {
    if (shotTimesRef.current.length === 0) return
    clearDelayTimer()
    cancelAnimationFrame(rafRef.current)
    setPhase('summary')
  }, [clearDelayTimer])

  useEffect(() => () => clearDelayTimer(), [clearDelayTimer])

  const reactionMs = shotTimesMs.length > 0 ? shotTimesMs[0] : null
  const splits = useMemo(() => buildSplitRows(shotTimesMs), [shotTimesMs])
  const summary = useMemo(() => computeShotSummary(shotTimesMs), [shotTimesMs])

  const mainReadout =
    reactionMs != null ? formatShotSeconds(reactionMs) : formatShotSeconds(liveMs)

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 overflow-x-hidden">
      <div className="grid grid-cols-2 gap-1 rounded-sm border border-zinc-600/55 bg-[#0a0a0b]/90 p-1">
        <button
          type="button"
          onClick={() => setTab('live')}
          className={[
            'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-sm px-2 py-2 font-mono-technical text-[9px] font-bold uppercase tracking-[0.18em] transition',
            tab === 'live'
              ? 'bg-[rgba(250,204,21,0.14)] text-[#facc15]'
              : 'text-zinc-500 hover:text-app-text/80',
          ].join(' ')}
        >
          <Timer className="size-3.5" strokeWidth={1.5} aria-hidden />
          {t('standardShot.tabs.live')}
        </button>
        <button
          type="button"
          onClick={() => setTab('history')}
          className={[
            'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-sm px-2 py-2 font-mono-technical text-[9px] font-bold uppercase tracking-[0.18em] transition',
            tab === 'history'
              ? 'bg-[rgba(250,204,21,0.14)] text-[#facc15]'
              : 'text-zinc-500 hover:text-app-text/80',
          ].join(' ')}
        >
          <History className="size-3.5" strokeWidth={1.5} aria-hidden />
          {t('standardShot.tabs.history')}
        </button>
      </div>

      {tab === 'history' ? (
        <StandardShotHistory
          sessions={sessions}
          loading={sessionsLoading}
          deletingId={deletingId}
          onDeleteSession={deleteSession}
          locale={locale}
        />
      ) : null}

      {tab === 'live' ? (
      <>
      {/* Üst durum şeridi */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-zinc-600/55 bg-[#0a0a0b]/90 px-3 py-2">
        <div className="min-w-0">
          <p className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.3em] text-[#facc15]/75">
            {opsCode} · {modeTitle || t('modes.standard-shot.title')}
          </p>
          <p className="mt-0.5 font-mono-technical text-[9px] text-app-text/50">
            {t('standardShot.thresholdHint', { value: settings.soundThreshold })}
          </p>
        </div>
        <HardwareStatusBadge className="max-w-full" />
      </div>

      {/* Ana HUD */}
      <div
        className={[
          'relative overflow-hidden rounded-sm border bg-[#0a0a0b] px-4 py-8 text-center sm:px-6 sm:py-10',
          phase === 'running'
            ? 'border-emerald-400/55 shadow-[0_0_28px_-8px_rgba(52,211,153,0.45)]'
            : phase === 'delay'
              ? 'border-[#facc15]/35'
              : 'border-zinc-600/60',
        ].join(' ')}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(250,204,21,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(250,204,21,0.06) 1px, transparent 1px)',
            backgroundSize: '14px 14px',
          }}
          aria-hidden
        />
        <span className="pointer-events-none absolute left-2 top-2 h-3 w-3 border-l border-t border-[#facc15]/50" />
        <span className="pointer-events-none absolute right-2 top-2 h-3 w-3 border-r border-t border-[#facc15]/50" />
        <span className="pointer-events-none absolute bottom-2 left-2 h-3 w-3 border-b border-l border-[#facc15]/50" />
        <span className="pointer-events-none absolute bottom-2 right-2 h-3 w-3 border-b border-r border-[#facc15]/50" />

        <div className="relative z-[1] flex flex-col items-center gap-3">
          {phase === 'idle' ? (
            <>
              <p className="font-mono-technical text-[9px] uppercase tracking-[0.32em] text-zinc-500">
                {t('standardShot.status.idle')}
              </p>
              <p className="max-w-md font-mono-technical text-[10px] leading-relaxed text-app-text/55">
                {t('standardShot.armHint')}
              </p>

              <div className="mt-1 w-full max-w-md space-y-3 text-left">
                <p className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.28em] text-[#facc15]/80">
                  {t('standardShot.delayMode.label')}
                </p>
                <div className="grid grid-cols-2 gap-1 rounded-sm border border-zinc-600/55 bg-zinc-950/80 p-1">
                  <button
                    type="button"
                    onClick={() => setDelayMode('random')}
                    aria-pressed={delayMode === 'random'}
                    className={[
                      'min-h-11 touch-manipulation rounded-sm px-2 py-2 font-mono-technical text-[8px] font-bold uppercase tracking-[0.14em] transition sm:text-[9px]',
                      delayMode === 'random'
                        ? 'bg-[rgba(250,204,21,0.14)] text-[#facc15]'
                        : 'text-zinc-500 hover:text-app-text/80',
                    ].join(' ')}
                  >
                    {t('standardShot.delayMode.random')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDelayMode('fixed')}
                    aria-pressed={delayMode === 'fixed'}
                    className={[
                      'min-h-11 touch-manipulation rounded-sm px-2 py-2 font-mono-technical text-[8px] font-bold uppercase tracking-[0.14em] transition sm:text-[9px]',
                      delayMode === 'fixed'
                        ? 'bg-[rgba(250,204,21,0.14)] text-[#facc15]'
                        : 'text-zinc-500 hover:text-app-text/80',
                    ].join(' ')}
                  >
                    {t('standardShot.delayMode.fixed')}
                  </button>
                </div>

                {delayMode === 'fixed' ? (
                  <div className="rounded-sm border border-[#facc15]/35 bg-[#0a0a0b]/90 px-3 py-3">
                    <div className="flex items-end justify-between gap-3">
                      <label
                        htmlFor="standard-shot-fixed-delay"
                        className="font-mono-technical text-[8px] uppercase tracking-[0.2em] text-zinc-500"
                      >
                        {t('standardShot.delayMode.fixedValue')}
                      </label>
                      <div className="flex items-baseline gap-1.5">
                        <input
                          id="standard-shot-fixed-delay"
                          type="number"
                          inputMode="decimal"
                          min={ARM_DELAY_FIXED_MIN_SEC}
                          max={ARM_DELAY_FIXED_MAX_SEC}
                          step={ARM_DELAY_FIXED_STEP_SEC}
                          value={fixedDelaySec}
                          onChange={(e) => {
                            const raw = Number(e.target.value)
                            if (!Number.isFinite(raw)) return
                            setFixedDelaySec(raw)
                          }}
                          onBlur={() => setFixedDelaySec((v) => clampFixedDelaySec(v))}
                          className="w-20 rounded-sm border border-[#facc15]/40 bg-zinc-950 px-2 py-1.5 text-right font-mono-technical text-sm font-bold tabular-nums text-[#facc15] outline-none focus:border-[#facc15]/80"
                        />
                        <span className="font-mono-technical text-[9px] uppercase tracking-[0.16em] text-zinc-500">
                          {t('standardShot.delayMode.unit')}
                        </span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min={ARM_DELAY_FIXED_MIN_SEC}
                      max={ARM_DELAY_FIXED_MAX_SEC}
                      step={ARM_DELAY_FIXED_STEP_SEC}
                      value={clampFixedDelaySec(fixedDelaySec)}
                      onChange={(e) => setFixedDelaySec(clampFixedDelaySec(Number(e.target.value)))}
                      aria-label={t('standardShot.delayMode.fixedValue')}
                      className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-sm bg-zinc-800 accent-[#facc15]"
                    />
                    <p className="mt-2 font-mono-technical text-[8px] uppercase tracking-[0.16em] text-zinc-600">
                      {t('standardShot.delayMode.fixedRange', {
                        min: ARM_DELAY_FIXED_MIN_SEC,
                        max: ARM_DELAY_FIXED_MAX_SEC,
                      })}
                    </p>
                  </div>
                ) : (
                  <p className="font-mono-technical text-[9px] leading-relaxed text-app-text/45">
                    {t('standardShot.delayMode.randomHint')}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={requestArmStart}
                className="mt-2 inline-flex min-h-14 w-full max-w-md touch-manipulation items-center justify-center gap-2 rounded-sm border border-[#facc15]/55 bg-[#facc15]/12 px-6 py-4 font-display text-base font-bold uppercase tracking-[0.2em] text-[#facc15] transition hover:border-[#facc15]/80 hover:bg-[#facc15]/18 active:scale-[0.99] sm:text-lg"
              >
                <Zap className="size-5" strokeWidth={1.5} aria-hidden />
                {t('standardShot.armStart')}
              </button>
            </>
          ) : null}

          {phase === 'delay' ? (
            <>
              <p className="animate-pulse font-mono-technical text-[10px] font-bold uppercase tracking-[0.35em] text-[#facc15]">
                {t('standardShot.status.waiting')}
              </p>
              <p className="font-display text-4xl font-bold tabular-nums text-[#facc15]/90 sm:text-5xl">
                …
              </p>
              <p className="font-mono-technical text-[8px] uppercase tracking-[0.22em] text-zinc-500">
                {delayMode === 'fixed'
                  ? t('standardShot.fixedDelay', { sec: (delayTotalMs / 1000).toFixed(1) })
                  : t('standardShot.randomDelay', { sec: (delayTotalMs / 1000).toFixed(1) })}
              </p>
            </>
          ) : null}

          {phase === 'running' ? (
            <>
              <p className="rounded-sm border border-emerald-400/50 bg-emerald-500/15 px-3 py-1 font-mono-technical text-[11px] font-bold uppercase tracking-[0.35em] text-emerald-300 shadow-[0_0_16px_-4px_rgba(52,211,153,0.7)]">
                {t('standardShot.fireFree')}
              </p>
              <p className="font-mono-technical text-[8px] uppercase tracking-[0.28em] text-emerald-500/70">
                {reactionMs != null
                  ? t('standardShot.reactionLabel')
                  : t('standardShot.chronoLabel')}
              </p>
              <p
                className={[
                  'font-display font-bold tabular-nums tracking-tight',
                  reactionMs != null
                    ? 'text-5xl text-[#facc15] sm:text-6xl'
                    : 'text-5xl text-emerald-300 sm:text-6xl',
                ].join(' ')}
              >
                {mainReadout}
              </p>
              <p className="font-mono-technical text-[9px] text-app-text/45">
                {t('standardShot.unitSeconds')}
                {reactionMs != null ? (
                  <span className="ml-2 text-zinc-500">
                    · {t('standardShot.stringElapsed')}: {formatShotSeconds(liveMs)}
                  </span>
                ) : null}
              </p>
            </>
          ) : null}

          {phase === 'summary' ? (
            <>
              <p className="font-mono-technical text-[9px] font-bold uppercase tracking-[0.32em] text-[#facc15]/80">
                {t('standardShot.status.complete')}
              </p>
              <p className="font-display text-4xl font-bold tabular-nums text-[#facc15] sm:text-5xl">
                {formatShotSeconds(summary.reactionMs ?? 0)}
              </p>
              <p className="font-mono-technical text-[8px] uppercase tracking-[0.22em] text-zinc-500">
                {t('standardShot.reactionLabel')}
              </p>
            </>
          ) : null}
        </div>
      </div>

      {/* Kontroller */}
      {phase === 'running' ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => triggerManual({ loudness: Math.max(thresholdRef.current, 60) })}
            className="inline-flex min-h-12 touch-manipulation items-center justify-center gap-2 rounded-sm border border-emerald-400/45 bg-emerald-500/10 px-4 py-3 font-mono-technical text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-300 transition hover:bg-emerald-500/16 active:scale-[0.99]"
          >
            <Crosshair className="size-4" strokeWidth={1.5} aria-hidden />
            {t('standardShot.manualBang')}
          </button>
          <button
            type="button"
            onClick={endTest}
            disabled={shotTimesMs.length === 0}
            className="inline-flex min-h-12 touch-manipulation items-center justify-center gap-2 rounded-sm border border-zinc-500/45 bg-zinc-900/70 px-4 py-3 font-mono-technical text-[10px] font-bold uppercase tracking-[0.22em] text-app-text/75 transition hover:border-[#facc15]/40 hover:text-[#facc15] disabled:opacity-40 active:scale-[0.99]"
          >
            <Square className="size-3.5" strokeWidth={1.5} aria-hidden />
            {t('standardShot.endTest')}
          </button>
        </div>
      ) : null}

      {/* Split listesi */}
      {(phase === 'running' || phase === 'summary') && shotTimesMs.length > 0 ? (
        <div className="rounded-sm border border-zinc-600/55 bg-[#0a0a0b]/85 p-3 sm:p-4">
          <div className="mb-3 flex items-baseline justify-between gap-2 border-b border-white/10 pb-2">
            <h3 className="font-display text-sm font-bold uppercase tracking-[0.18em] text-app-text">
              {t('standardShot.splits.title')}
            </h3>
            <span className="font-mono-technical text-[8px] uppercase tracking-[0.22em] text-zinc-500">
              {t('standardShot.splits.count', { count: shotTimesMs.length })}
            </span>
          </div>

          <div className="mb-2 flex items-center justify-between gap-2 rounded-sm border border-[#facc15]/25 bg-[rgba(250,204,21,0.06)] px-3 py-2">
            <span className="font-mono-technical text-[9px] font-bold uppercase tracking-[0.2em] text-[#facc15]">
              {t('standardShot.splits.reaction')}
            </span>
            <span className="font-mono-technical text-sm font-bold tabular-nums text-[#facc15]">
              {formatShotSeconds(shotTimesMs[0])} s
              <span className="ml-2 text-[10px] font-normal text-zinc-500">
                ({formatShotMillis(shotTimesMs[0])} ms)
              </span>
            </span>
          </div>

          <ul className="flex max-h-64 flex-col gap-1.5 overflow-y-auto">
            {splits.length === 0 ? (
              <li className="px-1 py-3 text-center font-mono-technical text-[9px] text-zinc-500">
                {t('standardShot.splits.empty')}
              </li>
            ) : (
              splits.map((row) => (
                <li
                  key={row.index}
                  className="flex items-center justify-between gap-2 rounded-sm border border-zinc-700/60 bg-zinc-900/40 px-3 py-2"
                >
                  <span className="font-mono-technical text-[9px] font-bold uppercase tracking-[0.2em] text-app-text/70">
                    {t('standardShot.splits.item', { n: row.index })}
                  </span>
                  <span className="font-mono-technical text-sm tabular-nums text-app-text">
                    {formatShotSeconds(row.splitMs)} s
                    <span className="ml-2 text-[10px] text-zinc-500">
                      ({formatShotMillis(row.splitMs)} ms)
                    </span>
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}

      {/* Özet kartı */}
      {phase === 'summary' ? (
        <div className="relative overflow-hidden rounded-sm border border-[#facc15]/40 bg-[#0a0a0b] p-4 shadow-[0_0_24px_-10px_rgba(250,204,21,0.35)] sm:p-5">
          <span className="pointer-events-none absolute left-2 top-2 h-2.5 w-2.5 border-l border-t border-[#facc15]/55" />
          <span className="pointer-events-none absolute right-2 top-2 h-2.5 w-2.5 border-r border-t border-[#facc15]/55" />
          <span className="pointer-events-none absolute bottom-2 left-2 h-2.5 w-2.5 border-b border-l border-[#facc15]/55" />
          <span className="pointer-events-none absolute bottom-2 right-2 h-2.5 w-2.5 border-b border-r border-[#facc15]/55" />

          <p className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.3em] text-[#facc15]/75">
            {t('standardShot.summary.kicker')}
          </p>
          <h3 className="mt-1 font-display text-base font-bold uppercase tracking-[0.16em] text-app-text">
            {t('standardShot.summary.title')}
          </h3>

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <SummaryStat
              label={t('standardShot.summary.total')}
              value={`${formatShotSeconds(summary.totalMs ?? 0)} s`}
            />
            <SummaryStat
              label={t('standardShot.summary.avgSplit')}
              value={
                summary.avgSplitMs != null
                  ? `${formatShotSeconds(summary.avgSplitMs)} s`
                  : '—'
              }
            />
            <SummaryStat
              label={t('standardShot.summary.bestReaction')}
              value={`${formatShotSeconds(summary.reactionMs ?? 0)} s`}
              accent
            />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => void handleSaveSession()}
              disabled={Boolean(lastSavedId) || sessionSaving}
              className="inline-flex min-h-12 touch-manipulation items-center justify-center gap-2 rounded-sm border border-emerald-400/45 bg-emerald-500/10 px-4 py-3 font-mono-technical text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300 transition hover:bg-emerald-500/16 disabled:opacity-45 active:scale-[0.99]"
            >
              {sessionSaving ? (
                <Loader2 className="size-4 animate-spin" strokeWidth={1.5} aria-hidden />
              ) : (
                <Save className="size-4" strokeWidth={1.5} aria-hidden />
              )}
              {sessionSaving
                ? t('standardShot.save.saving')
                : lastSavedId
                  ? t('standardShot.save.saved')
                  : t('standardShot.save.cta')}
            </button>
            <button
              type="button"
              onClick={() => void handlePdfActive()}
              disabled={pdfBusy}
              className="inline-flex min-h-12 touch-manipulation items-center justify-center gap-2 rounded-sm border border-[#facc15]/45 bg-[rgba(250,204,21,0.1)] px-4 py-3 font-mono-technical text-[10px] font-bold uppercase tracking-[0.2em] text-[#facc15] transition hover:bg-[rgba(250,204,21,0.16)] disabled:opacity-50 active:scale-[0.99]"
            >
              <FileDown className="size-4" strokeWidth={1.5} aria-hidden />
              {t('standardShot.pdf.download')}
            </button>
          </div>

          {savedFlash ? (
            <p className="mt-2 text-center font-mono-technical text-[9px] uppercase tracking-[0.2em] text-emerald-300/90">
              {t('standardShot.save.toast')}
            </p>
          ) : null}
          {saveError ? (
            <p className="mt-2 text-center font-mono-technical text-[9px] text-red-400/90">{saveError}</p>
          ) : null}

          <div className="mt-5">
            <p className="mb-3 font-mono-technical text-[8px] font-bold uppercase tracking-[0.28em] text-[#facc15]/75">
              {t('standardShot.analytics.kicker')}
            </p>
            <StandardShotAnalytics shotTimesMs={shotTimesMs} mpuSamples={liveMpuSamples} />
          </div>

          <button
            type="button"
            onClick={requestReset}
            className="mt-5 inline-flex min-h-12 w-full touch-manipulation items-center justify-center gap-2 rounded-sm border border-[#facc15]/50 bg-[#facc15]/12 px-4 py-3 font-mono-technical text-[10px] font-bold uppercase tracking-[0.22em] text-[#facc15] transition hover:bg-[#facc15]/18 active:scale-[0.99]"
          >
            <RotateCcw className="size-4" strokeWidth={1.5} aria-hidden />
            {t('standardShot.retry')}
          </button>
        </div>
      ) : null}

      {phase === 'idle' ? (
        <p className="text-center font-mono-technical text-[8px] uppercase tracking-[0.2em] text-zinc-500">
          {t('standardShot.manualHint')}
        </p>
      ) : null}
      </>
      ) : null}

      <UnsavedSessionGuardModal
        open={unsavedGuardOpen}
        onCancel={cancelUnsavedGuard}
        onConfirm={confirmUnsavedGuard}
      />
    </div>
  )
}

/**
 * @param {{ label: string, value: string, accent?: boolean }} props
 */
function SummaryStat({ label, value, accent = false }) {
  return (
    <div
      className={[
        'rounded-sm border px-3 py-3',
        accent
          ? 'border-[#facc15]/40 bg-[rgba(250,204,21,0.08)]'
          : 'border-zinc-600/50 bg-zinc-900/40',
      ].join(' ')}
    >
      <p className="font-mono-technical text-[7px] uppercase tracking-[0.22em] text-zinc-500">{label}</p>
      <p
        className={[
          'mt-1 font-mono-technical text-lg font-bold tabular-nums',
          accent ? 'text-[#facc15]' : 'text-app-text',
        ].join(' ')}
      >
        {value}
      </p>
    </div>
  )
}
