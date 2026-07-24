import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Save } from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import { useHardware } from '../../../context/HardwareContext'
import { useDryFireSessions } from '../../../hooks/useDryFireSessions'
import { useTimerCalibration } from '../../../hooks/useTimerCalibration'
import { playDryFireStartBeep } from '../../../lib/dryFireBeep'
import {
  clampDryFireDistanceM,
  createDryFireHit,
  DRY_FIRE_REF_DISTANCE_M,
  resolveDryFireShotAccel,
} from '../../../lib/dryFireHits'
import {
  afterCountedShot,
  afterIgnoredRack,
  afterPrepConfirmed,
  afterSafetyConfirmed,
  beginDryFireSetup,
  DRY_FIRE_ARM_GUARD_MS,
  DRY_FIRE_RACK_WINDOW_MS,
  isDryFireTrainingLive,
  resolveDryFireTriggerVerdict,
} from '../../../lib/dryFireTrainingMachine'
import {
  ARM_DELAY_FIXED_DEFAULT_SEC,
  clampFixedDelaySec,
  clampParTimeSec,
  formatShotMillis,
  resolveArmDelayMs,
} from '../../../lib/dryFireTimer'
import HardwareStatusBadge from '../../hardware/HardwareStatusBadge'
import DryFireHistoryPanel from '../DryFireHistoryPanel'
import DryFireLiveTelemetryPanel from '../DryFireLiveTelemetryPanel'
import DryFireSafetyModal from '../DryFireSafetyModal'
import DryFireTargetBoard from '../DryFireTargetBoard'

/** @typedef {'idle' | 'delay' | 'running'} DryFirePhase */
/** @typedef {import('../../../lib/dryFireTrainingMachine').DryFireScenarioPhase} DryFireScenarioPhase */

/**
 * Kuru Tetik — temiz dashboard, timer/bip, seans kayıt.
 * @param {{
 *   modeTitle?: string
 *   opsCode?: string
 *   onSessionActiveChange?: (active: boolean) => void
 *   fsAbortToken?: number
 * }} props
 */
export default function DryFireMode({
  modeTitle = '',
  opsCode = 'TMR-02',
  onSessionActiveChange,
  fsAbortToken = 0,
}) {
  const { t } = useTranslation('timer')
  const { user, userData } = useAuth()
  const { settings, persistPatch } = useTimerCalibration()
  const {
    sessions,
    loading: historyLoading,
    saving: sessionSaving,
    deletingId,
    saveSession,
    deleteSession,
  } = useDryFireSessions()

  const [phase, setPhase] = useState(/** @type {DryFirePhase} */ ('idle'))
  const [scenarioPhase, setScenarioPhase] = useState(
    /** @type {DryFireScenarioPhase} */ ('idle'),
  )
  /** Güvenlik onayı bu seans için alındı mı — resize / FS flicker ile sıfırlanmaz */
  const [safetyAcknowledged, setSafetyAcknowledged] = useState(false)
  const safetyAcknowledgedRef = useRef(false)
  const [prepRackHeard, setPrepRackHeard] = useState(false)
  const [hits, setHits] = useState(/** @type {import('../../../lib/dryFireHits').DryFireHit[]} */ ([]))
  const [reactionTimesMs, setReactionTimesMs] = useState(/** @type {number[]} */ ([]))
  const [flash, setFlash] = useState(false)
  const [distanceM, setDistanceM] = useState(DRY_FIRE_REF_DISTANCE_M)
  const [liveMs, setLiveMs] = useState(0)
  const [lastDrawMs, setLastDrawMs] = useState(/** @type {number | null} */ (null))
  const [delayTotalMs, setDelayTotalMs] = useState(0)

  const [timerEnabled, setTimerEnabled] = useState(true)
  const [delayMode, setDelayMode] = useState(/** @type {'random' | 'fixed'} */ ('random'))
  const [fixedDelaySec, setFixedDelaySec] = useState(ARM_DELAY_FIXED_DEFAULT_SEC)
  const [parTimeSec, setParTimeSec] = useState(0)

  const [savedFlash, setSavedFlash] = useState(false)
  const [saveError, setSaveError] = useState(/** @type {string | null} */ (null))
  const [lastSavedId, setLastSavedId] = useState(/** @type {string | null} */ (null))

  const goAtRef = useRef(0)
  const delayTimerRef = useRef(0)
  const rackTimerRef = useRef(0)
  const armGuardUntilRef = useRef(0)
  const rafRef = useRef(0)
  const reactionRef = useRef(/** @type {number[]} */ ([]))
  const phaseRef = useRef(phase)
  const scenarioRef = useRef(scenarioPhase)

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  useEffect(() => {
    scenarioRef.current = scenarioPhase
  }, [scenarioPhase])

  useEffect(() => {
    safetyAcknowledgedRef.current = safetyAcknowledged
  }, [safetyAcknowledged])

  const trainingLive = isDryFireTrainingLive(scenarioPhase)
  const armed = phase === 'running' && trainingLive
  /** Prep'te dinle (ilk kurulum sesini yoksaymak için); canlıda yalnızca running */
  const listening =
    scenarioPhase === 'prep' || (phase === 'running' && trainingLive)
  const parTimeMs = clampParTimeSec(parTimeSec) * 1000
  const parOver = parTimeMs > 0 && liveMs > parTimeMs && phase === 'running'
  const dirty = hits.length > 0 && lastSavedId == null

  const handleDistanceChange = useCallback((m) => {
    setDistanceM(clampDryFireDistanceM(m))
  }, [])

  const clearDelayTimer = useCallback(() => {
    if (delayTimerRef.current) {
      window.clearTimeout(delayTimerRef.current)
      delayTimerRef.current = 0
    }
  }, [])

  const clearRackTimer = useCallback(() => {
    if (rackTimerRef.current) {
      window.clearTimeout(rackTimerRef.current)
      rackTimerRef.current = 0
    }
  }, [])

  /** live_rack → live_shot (kapak sesi veya süre dolumu) */
  const returnToLiveShot = useCallback(() => {
    clearRackTimer()
    if (scenarioRef.current !== 'live_rack') return
    const next = afterIgnoredRack(scenarioRef.current)
    scenarioRef.current = next
    setScenarioPhase(next)
  }, [clearRackTimer])

  const scheduleRackWindow = useCallback(() => {
    clearRackTimer()
    rackTimerRef.current = window.setTimeout(() => {
      rackTimerRef.current = 0
      returnToLiveShot()
    }, DRY_FIRE_RACK_WINDOW_MS)
  }, [clearRackTimer, returnToLiveShot])

  const { subscribeTrigger, error: hwError, getTelemetry } = useHardware()
  const thresholdRef = useRef(settings.soundThreshold)

  useEffect(() => {
    thresholdRef.current = settings.soundThreshold
  }, [settings.soundThreshold])

  const recordHit = useCallback(
    (
      /** @type {{ flinch?: number, accelX?: number | null, accelY?: number | null } | void} */ payload,
    ) => {
      if (phaseRef.current !== 'running') return
      const absoluteMs = Math.max(0, Math.round(performance.now() - goAtRef.current))
      const flinchFromSensor =
        payload && payload.flinch != null && Number.isFinite(Number(payload.flinch))
          ? Math.min(100, Math.max(0, Math.round(Number(payload.flinch))))
          : undefined

      // Ateş anı nişanı: canlı MPU telemetrisi (manuel Fire dahil) — merkeze snap yok
      const aim = resolveDryFireShotAccel({
        telemetry: getTelemetry(),
        accelX: payload?.accelX,
        accelY: payload?.accelY,
      })

      setHits((prev) => {
        const next = createDryFireHit({
          index: prev.length,
          offsetX: settings.mpuOffsetX,
          offsetY: settings.mpuOffsetY,
          mpuGForceRange: settings.mpuGForceRange,
          distanceM,
          reactionMs: absoluteMs,
          accelX: aim.accelX,
          accelY: aim.accelY,
          ...(flinchFromSensor != null ? { flinchScore: flinchFromSensor } : {}),
        })
        return [...prev, next]
      })
      reactionRef.current = [...reactionRef.current, absoluteMs]
      setReactionTimesMs(reactionRef.current)
      if (reactionRef.current.length === 1) setLastDrawMs(absoluteMs)
      setLastSavedId(null)
      setFlash(true)
      window.setTimeout(() => setFlash(false), 220)
    },
    [
      distanceM,
      getTelemetry,
      settings.mpuGForceRange,
      settings.mpuOffsetX,
      settings.mpuOffsetY,
    ],
  )

  /**
   * Senaryo state makinesi: prep/rack filtreleri + yalnızca live_shot skoru.
   * live_rack kısa süre (RACK_WINDOW) sonra otomatik açılır — her 2. tetik yutulmaz.
   * Manuel Fire / Space her zaman isabet sayılır (kapak döngüsünü atlar).
   */
  const handleIncomingTrigger = useCallback(
    (
      /** @type {{ flinch?: number, accelX?: number | null, accelY?: number | null, source?: 'hw' | 'manual' } | void} */ payload,
    ) => {
      const fromManual = payload?.source === 'manual'
      // Go bip / arm sonrası donanım yankısını yoksay (manuel Fire hariç)
      if (!fromManual && performance.now() < armGuardUntilRef.current) return

      // Simüle tetik: kapak penceresindeyse önce live_shot'a dön, sonra say
      if (fromManual && scenarioRef.current === 'live_rack') {
        clearRackTimer()
        scenarioRef.current = 'live_shot'
        setScenarioPhase('live_shot')
      }

      const verdict = resolveDryFireTriggerVerdict(
        scenarioRef.current,
        phaseRef.current === 'running',
      )
      if (verdict === 'blocked') return
      if (verdict === 'ignore_prep') {
        setPrepRackHeard(true)
        return
      }
      if (verdict === 'ignore_rack') {
        returnToLiveShot()
        return
      }
      if (verdict === 'count_shot') {
        recordHit(payload)
        const next = afterCountedShot(scenarioRef.current)
        scenarioRef.current = next
        setScenarioPhase(next)
        scheduleRackWindow()
      }
    },
    [clearRackTimer, recordHit, returnToLiveShot, scheduleRackWindow],
  )

  useEffect(() => {
    if (!listening) return undefined
    return subscribeTrigger((trigger) => {
      // Donanım: Ayarlar akustik eşiğinin altındaki gürültüyü isabet sayma
      const loud = Number(trigger.loudness)
      const thr = Number(thresholdRef.current) || 0
      if (Number.isFinite(loud) && loud < thr) return
      handleIncomingTrigger({
        flinch: trigger.flinch,
        accelX: trigger.accel_x,
        accelY: trigger.accel_y,
        source: 'hw',
      })
    })
  }, [listening, subscribeTrigger, handleIncomingTrigger])

  useEffect(() => {
    if (!listening) return undefined
    const onKey = (e) => {
      if (e.code !== 'Space' && e.code !== 'Enter') return
      e.preventDefault()
      // Accel yok — recordHit anlık telemetryRef örnekler
      handleIncomingTrigger({ flinch: 50, source: 'manual' })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [listening, handleIncomingTrigger])

  useEffect(() => {
    if (phase !== 'running') {
      cancelAnimationFrame(rafRef.current)
      return undefined
    }
    const tick = () => {
      setLiveMs(Math.max(0, Math.round(performance.now() - goAtRef.current)))
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [phase])

  useEffect(
    () => () => {
      clearDelayTimer()
      clearRackTimer()
    },
    [clearDelayTimer, clearRackTimer],
  )

  const enterRunning = useCallback(() => {
    // Önce running — await beep setTimeout'tan gelince AudioContext.resume asılı kalırsa
    // phase hiç running olmazdı → listening kapalı → isabet oluşmazdı.
    const now = performance.now()
    goAtRef.current = now
    armGuardUntilRef.current = now + DRY_FIRE_ARM_GUARD_MS
    setLiveMs(0)
    setPhase('running')
    void playDryFireStartBeep().catch(() => {
      /* bip opsiyonel */
    })
  }, [])

  const beginArmedListening = useCallback(() => {
    clearDelayTimer()
    clearRackTimer()
    setSavedFlash(false)
    setSaveError(null)
    // Döngüyü atış beklemede başlat
    if (scenarioRef.current === 'live_rack') {
      scenarioRef.current = 'live_shot'
      setScenarioPhase('live_shot')
    }

    if (!timerEnabled) {
      setDelayTotalMs(0)
      enterRunning()
      return
    }

    const delay = resolveArmDelayMs(delayMode, fixedDelaySec)
    setDelayTotalMs(delay)
    setPhase('delay')
    delayTimerRef.current = window.setTimeout(() => {
      delayTimerRef.current = 0
      enterRunning()
    }, delay)
  }, [clearDelayTimer, clearRackTimer, delayMode, enterRunning, fixedDelaySec, timerEnabled])

  /**
   * Bip & Başlat: güvenlik yoksa modal; onaylıysa FS prep kartı; canlıdaysa arm.
   */
  const armStart = useCallback(() => {
    const sc = scenarioRef.current
    if (sc === 'safety' || sc === 'prep') return
    if (sc === 'idle') {
      if (!safetyAcknowledgedRef.current) {
        setPrepRackHeard(false)
        const next = beginDryFireSetup(sc)
        scenarioRef.current = next
        setScenarioPhase(next)
        return
      }
      // Güvenlik OK → tam ekran Silahı Kur talimat kartı
      setPrepRackHeard(false)
      scenarioRef.current = 'prep'
      setScenarioPhase('prep')
      return
    }
    if (!isDryFireTrainingLive(sc)) return
    beginArmedListening()
  }, [beginArmedListening])

  /**
   * Güvenlik modalını aç.
   * @param {{ force?: boolean }} [opts] force=true → Tam Ekran butonu niyeti; ack yok sayılır
   */
  const requestSafetyPrompt = useCallback((opts = {}) => {
    const force = Boolean(opts.force)
    if (!force && safetyAcknowledgedRef.current) return
    if (!force && scenarioRef.current === 'safety') return
    if (force) {
      safetyAcknowledgedRef.current = false
      setSafetyAcknowledged(false)
    }
    setPrepRackHeard(false)
    scenarioRef.current = 'safety'
    setScenarioPhase('safety')
  }, [])

  const disarm = useCallback(() => {
    clearDelayTimer()
    clearRackTimer()
    cancelAnimationFrame(rafRef.current)
    setPhase('idle')
    setLiveMs(0)
  }, [clearDelayTimer, clearRackTimer])

  useEffect(() => {
    if (hwError === 'link-lost') {
      disarm()
    }
  }, [disarm, hwError])

  // Tam ekran kaybı → yalnızca timer'ı durdur; güvenlik senaryosuna geri dönme
  useEffect(() => {
    if (fsAbortToken > 0) disarm()
  }, [disarm, fsAbortToken])

  // Kuru tetik kendi hedef-tahtası tam ekranı + güvenlik modalını kullanır.
  // Sayfa protokolüne seans aktifliği bildirilmez — aksi halde prep sonrası
  // pointer-events-none ile FS UI donar ve ESC çıkışında "Tam Ekrana Geç" döngüsü oluşur.
  useEffect(() => {
    onSessionActiveChange?.(false)
    return () => onSessionActiveChange?.(false)
  }, [onSessionActiveChange])

  // Güvenlik modalı açıkken: sekme kapat/yenile + SPA link engeli.
  // history.pushState/popstate kullanma — BrowserRouter ile çakışır (geri/F12 sonrası yanlış rota).
  const safetyLock = scenarioPhase === 'safety'

  useEffect(() => {
    if (!safetyLock) return undefined

    const onBeforeUnload = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }

    /** Sidebar / nav Link tıklamalarını yakala — rota değişmesin */
    const onClickCapture = (e) => {
      const target = e.target
      if (!(target instanceof Element)) return
      const anchor = target.closest('a[href]')
      if (!anchor) return
      const href = anchor.getAttribute('href')
      if (!href || href.startsWith('#')) return
      e.preventDefault()
      e.stopPropagation()
    }

    window.addEventListener('beforeunload', onBeforeUnload)
    document.addEventListener('click', onClickCapture, true)

    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      document.removeEventListener('click', onClickCapture, true)
    }
  }, [safetyLock])

  const resetPaper = useCallback(() => {
    clearDelayTimer()
    clearRackTimer()
    cancelAnimationFrame(rafRef.current)
    reactionRef.current = []
    armGuardUntilRef.current = 0
    setHits([])
    setReactionTimesMs([])
    setFlash(false)
    setLiveMs(0)
    setLastDrawMs(null)
    setDelayTotalMs(0)
    setPhase('idle')
    setSavedFlash(false)
    setLastSavedId(null)
    setSaveError(null)
    setPrepRackHeard(false)
    // Manuel sıfırlama → güvenlik onayı yeniden zorunlu
    safetyAcknowledgedRef.current = false
    setSafetyAcknowledged(false)
    scenarioRef.current = 'safety'
    setScenarioPhase('safety')
  }, [clearDelayTimer, clearRackTimer])

  const handleSafetyConfirm = useCallback(() => {
    setPrepRackHeard(false)
    safetyAcknowledgedRef.current = true
    setSafetyAcknowledged(true)
    const next = afterSafetyConfirmed()
    scenarioRef.current = next
    setScenarioPhase(next)
  }, [])

  const handleConfirmRacked = useCallback(() => {
    const next = afterPrepConfirmed()
    scenarioRef.current = next
    setScenarioPhase(next)
    // HAZIR — sistem arm olur, döngü başlar
    beginArmedListening()
  }, [beginArmedListening])

  const applyCal = useCallback(
    (/** @type {Partial<import('../../../lib/timerCalibrationSettings').TimerCalibrationSettings>} */ patch) => {
      persistPatch(patch)
    },
    [persistPatch],
  )

  const handleSaveSession = useCallback(async () => {
    if (hits.length === 0 || sessionSaving) return
    setSaveError(null)
    try {
      const saved = await saveSession({
        hits,
        reactionTimesMs: reactionRef.current.length ? reactionRef.current : reactionTimesMs,
        delayMs: delayTotalMs,
        parTimeMs: parTimeMs > 0 ? parTimeMs : null,
        delayMode: timerEnabled ? delayMode : 'none',
        distanceM,
        operator: {
          callsign: userData?.callsign || user?.displayName || '',
          username: userData?.username || '',
        },
      })
      setLastSavedId(saved.id)
      setSavedFlash(true)
      window.setTimeout(() => setSavedFlash(false), 2800)
    } catch {
      setSaveError(t('dryFire.session.saveError'))
    }
  }, [
    delayMode,
    delayTotalMs,
    distanceM,
    hits,
    parTimeMs,
    reactionTimesMs,
    saveSession,
    sessionSaving,
    t,
    timerEnabled,
    user?.displayName,
    userData?.callsign,
    userData?.username,
  ])

  const statusLine = (() => {
    if (scenarioPhase === 'safety') return t('dryFire.training.safety.statusPending')
    if (scenarioPhase === 'prep') return t('dryFire.training.prep.status')
    if (scenarioPhase === 'live_rack' && phase === 'running') {
      return t('dryFire.training.cycle.rackStatus')
    }
    if (phase === 'delay') return t('dryFire.timer.delaying')
    if (phase === 'running') {
      return [
        t('dryFire.status.armed'),
        hits.length > 0 ? t('dryFire.status.hits', { count: hits.length }) : null,
        lastDrawMs != null ? `${t('dryFire.timer.draw')}: ${formatShotMillis(lastDrawMs)} ms` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    }
    return [
      trainingLive ? t('dryFire.status.idleShort') : t('dryFire.status.idle'),
      hits.length > 0 ? t('dryFire.status.hits', { count: hits.length }) : null,
    ]
      .filter(Boolean)
      .join(' · ')
  })()

  return (
    <div className="flex w-full min-w-0 flex-col gap-5 overflow-x-hidden">
      <DryFireSafetyModal open={scenarioPhase === 'safety'} onConfirm={handleSafetyConfirm} />

      <div className="sticky top-0 z-20 -mx-0.5 border-b border-slate-800 bg-[#0a0a0b]/95 px-0.5 py-2.5 backdrop-blur-sm">
        <div className="flex w-full min-w-0 flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
          <div className="min-w-0 flex-1">
            <p className="break-words font-mono text-[8px] font-bold uppercase leading-relaxed tracking-[0.22em] text-[#facc15]/90 sm:tracking-[0.28em]">
              <span className="text-[#facc15]">{opsCode}</span>
              <span className="mx-1.5 text-zinc-600">·</span>
              <span className="text-app-text/90">
                {modeTitle || t('modes.dry-fire.title')}
              </span>
            </p>
            <p className="mt-1.5 break-words font-mono text-[9px] leading-snug text-app-text/50">
              {statusLine}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
            <HardwareStatusBadge className="max-w-full" armed={armed} />
            <button
              type="button"
              disabled={hits.length === 0 || sessionSaving}
              onClick={() => void handleSaveSession()}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-sm border border-[#facc15]/45 bg-[rgba(250,204,21,0.1)] px-2.5 py-1.5 font-mono text-[8px] font-bold uppercase tracking-[0.16em] text-[#facc15] transition hover:bg-[rgba(250,204,21,0.16)] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#facc15]/55 disabled:opacity-40"
            >
              <Save className="size-3.5" strokeWidth={1.5} aria-hidden />
              {sessionSaving ? t('dryFire.session.saving') : t('dryFire.session.save')}
            </button>
          </div>
        </div>
      </div>

      {scenarioPhase === 'safety' ? (
        <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-amber-500">
          {t('dryFire.training.safety.statusPending')}
        </p>
      ) : null}

      {savedFlash ? (
        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-emerald-400">
          {t('dryFire.session.saved')}
        </p>
      ) : null}
      {saveError ? (
        <p className="font-mono text-[9px] text-red-400">{saveError}</p>
      ) : null}
      {dirty && !savedFlash ? (
        <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-zinc-500">
          {t('dryFire.session.unsaved')}
        </p>
      ) : null}

      <div className="flex w-full min-w-0 flex-col gap-6">
        <div className="flex w-full min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:gap-5">
          <div className="order-2 w-full min-w-0 lg:order-1 lg:w-[17.5rem] lg:shrink-0 xl:w-[19rem]">
            <DryFireLiveTelemetryPanel
              soundThreshold={settings.soundThreshold}
              offsetX={settings.mpuOffsetX}
              offsetY={settings.mpuOffsetY}
              offsetYaw={settings.mpuOffsetYaw}
              gForceRange={settings.mpuGForceRange}
            />
          </div>

          <section
            className={[
              'order-1 relative w-full min-w-0 overflow-hidden rounded-xl border border-slate-800 bg-slate-950 px-3 py-5 sm:px-4 sm:py-6 lg:order-2 lg:flex-1',
              'transition-all duration-200',
              flash
                ? 'border-red-500/70 shadow-[0_0_28px_-8px_rgba(239,68,68,0.55)]'
                : phase === 'running'
                  ? 'border-[#facc15]/40'
                  : phase === 'delay'
                    ? 'border-amber-500/45'
                    : '',
            ].join(' ')}
          >
            <span
              className="pointer-events-none absolute left-2 top-2 h-3 w-3 border-l border-t border-slate-600/70"
              aria-hidden
            />
            <span
              className="pointer-events-none absolute right-2 top-2 h-3 w-3 border-r border-t border-slate-600/70"
              aria-hidden
            />
            <span
              className="pointer-events-none absolute bottom-2 left-2 h-3 w-3 border-b border-l border-slate-600/70"
              aria-hidden
            />
            <span
              className="pointer-events-none absolute bottom-2 right-2 h-3 w-3 border-b border-r border-slate-600/70"
              aria-hidden
            />
            {flash ? (
              <div className="pointer-events-none absolute inset-0 z-[2] bg-red-500/20" aria-hidden />
            ) : null}
            <div className="relative z-[1] mx-auto flex w-full max-w-[22rem] flex-col items-center gap-3">
              <p className="w-full font-mono text-[8px] font-bold uppercase tracking-[0.28em] text-[#facc15]/80">
                {t('dryFire.target.kicker')}
              </p>
              <DryFireTargetBoard
                hits={hits}
                distanceM={distanceM}
                onDistanceChange={handleDistanceChange}
                screenOrientation={settings.screenOrientation}
                screenDiagonalInches={settings.screenDiagonalInches}
                eyeScreenDistanceM={settings.eyeScreenDistanceM}
                onScreenOrientationChange={(o) => applyCal({ screenOrientation: o })}
                onScreenDiagonalChange={(n) => applyCal({ screenDiagonalInches: n })}
                onEyeDistanceChange={(n) => applyCal({ eyeScreenDistanceM: n })}
                armed={armed}
                phase={phase}
                liveMs={liveMs}
                lastDrawMs={lastDrawMs}
                parTimeMs={parTimeMs}
                parOver={parOver}
                timerEnabled={timerEnabled}
                delayMode={delayMode}
                fixedDelaySec={fixedDelaySec}
                parTimeSec={parTimeSec}
                onTimerEnabledChange={setTimerEnabled}
                onDelayModeChange={setDelayMode}
                onFixedDelaySecChange={(sec) => setFixedDelaySec(clampFixedDelaySec(sec))}
                onParTimeSecChange={(sec) => setParTimeSec(clampParTimeSec(sec))}
                onArm={armStart}
                onDisarm={disarm}
                onFire={() => handleIncomingTrigger({ flinch: 50, source: 'manual' })}
                onResetPaper={resetPaper}
                onSaveSession={() => void handleSaveSession()}
                sessionSaving={sessionSaving}
                canSave={hits.length > 0}
                onEnterFullscreen={() => requestSafetyPrompt({ force: true })}
                scenarioPhase={scenarioPhase}
                prepRackHeard={prepRackHeard}
                onConfirmRacked={handleConfirmRacked}
              />
            </div>
          </section>
        </div>

        <section className="w-full min-w-0 pb-2">
          <DryFireHistoryPanel
            sessions={sessions}
            loading={historyLoading}
            deletingId={deletingId}
            onDelete={(id) => void deleteSession(id)}
          />
        </section>
      </div>
    </div>
  )
}
