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
  resolveDryFireShotAim,
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
  readDryFireSafetyAck,
  resolveDryFireTriggerVerdict,
  writeDryFireSafetyAck,
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
import DryFireSessionDashboard from '../DryFireSessionDashboard'
import DryFireShotAnalysisHud from '../DryFireShotAnalysisHud'
import DryFireSafetyModal from '../DryFireSafetyModal'
import DryFireTargetBoard from '../DryFireTargetBoard'
import TimerActiveWeaponPanel from '../TimerActiveWeaponPanel'
import { useTimerActiveWeapon } from '../../../hooks/useTimerActiveWeapon'

/** @typedef {'idle' | 'delay' | 'running'} DryFirePhase */
/** @typedef {import('../../../lib/dryFireTrainingMachine').DryFireScenarioPhase} DryFireScenarioPhase */

/**
 * Kuru Tetik — temiz dashboard, timer/bip, seans kayıt.
 * @param {{
 *   modeTitle?: string
 *   opsCode?: string
 *   onSessionActiveChange?: (active: boolean) => void
 *   fsAbortToken?: number
 *   onExitMode?: () => void
 * }} props
 */
export default function DryFireMode({
  modeTitle = '',
  opsCode = 'TMR-02',
  onSessionActiveChange,
  fsAbortToken = 0,
  onExitMode,
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
  const activeWeaponCtrl = useTimerActiveWeapon()
  const { hasActiveWeapon, activeWeapon } = activeWeaponCtrl
  const hasActiveWeaponRef = useRef(hasActiveWeapon)

  const [phase, setPhase] = useState(/** @type {DryFirePhase} */ ('idle'))
  const [scenarioPhase, setScenarioPhase] = useState(
    /** @type {DryFireScenarioPhase} */ ('idle'),
  )
  /** Güvenlik onayı — sessionStorage ile sayfa ömrü boyunca hatırlanır */
  const [safetyAcknowledged, setSafetyAcknowledged] = useState(() => readDryFireSafetyAck())
  const safetyAcknowledgedRef = useRef(safetyAcknowledged)
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

  useEffect(() => {
    hasActiveWeaponRef.current = hasActiveWeapon
  }, [hasActiveWeapon])

  const trainingLive = isDryFireTrainingLive(scenarioPhase)
  const armed = phase === 'running' && trainingLive && hasActiveWeapon
  /** Prep'te dinle (ilk kurulum sesini yoksaymak için); canlıda yalnızca running + silah seçili */
  const listening =
    hasActiveWeapon &&
    (scenarioPhase === 'prep' || (phase === 'running' && trainingLive))
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
      /** @type {{ flinch?: number, yaw?: number | null, pitch?: number | null, roll?: number | null, accelX?: number | null, accelY?: number | null } | void} */ payload,
    ) => {
      if (!hasActiveWeaponRef.current) return
      if (phaseRef.current !== 'running') return
      const absoluteMs = Math.max(0, Math.round(performance.now() - goAtRef.current))
      const flinchFromSensor =
        payload && payload.flinch != null && Number.isFinite(Number(payload.flinch))
          ? Math.min(100, Math.max(0, Math.round(Number(payload.flinch))))
          : undefined

      // Ateş anı nişanı: yaw (X) + pitch (Y); ivme flinch/recoil için ayrı
      const aim = resolveDryFireShotAim({
        telemetry: getTelemetry(),
        yaw: payload?.yaw,
        pitch: payload?.pitch,
        roll: payload?.roll,
        accelX: payload?.accelX,
        accelY: payload?.accelY,
      })

      setHits((prev) => {
        const next = createDryFireHit({
          index: prev.length,
          offsetX: settings.mpuOffsetX,
          offsetY: settings.mpuOffsetY,
          offsetYaw: settings.mpuOffsetYaw,
          offsetPitch: settings.mpuOffsetPitch,
          mpuGForceRange: settings.mpuGForceRange,
          distanceM,
          reactionMs: absoluteMs,
          yaw: aim.yaw,
          pitch: aim.pitch,
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
      settings.mpuOffsetYaw,
      settings.mpuOffsetPitch,
    ],
  )

  /**
   * Senaryo state makinesi: prep/rack filtreleri + yalnızca live_shot skoru.
   * live_rack kısa süre (RACK_WINDOW) sonra otomatik açılır — her 2. tetik yutulmaz.
   * Manuel Fire / Space her zaman isabet sayılır (kapak döngüsünü atlar).
   */
  const handleIncomingTrigger = useCallback(
    (
      /** @type {{ flinch?: number, yaw?: number | null, pitch?: number | null, roll?: number | null, accelX?: number | null, accelY?: number | null, source?: 'hw' | 'manual' } | void} */ payload,
    ) => {
      if (!hasActiveWeaponRef.current) return
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
        yaw: trigger.yaw,
        pitch: trigger.pitch,
        roll: trigger.roll,
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
    if (!hasActiveWeaponRef.current) return
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
   * Güvenlik modalını aç — yalnızca henüz onaylanmamışsa.
   * Tam ekran girişi ack'i sıfırlamaz (session persistence).
   */
  const requestSafetyPrompt = useCallback(() => {
    if (safetyAcknowledgedRef.current || readDryFireSafetyAck()) {
      safetyAcknowledgedRef.current = true
      setSafetyAcknowledged(true)
      return
    }
    if (scenarioRef.current === 'safety') return
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
    // Kağıt sıfırlama → güvenlik onayı yeniden zorunlu
    writeDryFireSafetyAck(false)
    safetyAcknowledgedRef.current = false
    setSafetyAcknowledged(false)
    scenarioRef.current = 'safety'
    setScenarioPhase('safety')
  }, [clearDelayTimer, clearRackTimer])

  const handleSafetyConfirm = useCallback(() => {
    setPrepRackHeard(false)
    writeDryFireSafetyAck(true)
    safetyAcknowledgedRef.current = true
    setSafetyAcknowledged(true)
    const next = afterSafetyConfirmed()
    scenarioRef.current = next
    setScenarioPhase(next)
  }, [])

  const handleSafetyCancel = useCallback(() => {
    clearDelayTimer()
    clearRackTimer()
    cancelAnimationFrame(rafRef.current)
    setPhase('idle')
    setLiveMs(0)
    setPrepRackHeard(false)
    scenarioRef.current = 'idle'
    setScenarioPhase('idle')
    onExitMode?.()
  }, [clearDelayTimer, clearRackTimer, onExitMode])

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
    if (!activeWeapon || hits.length === 0 || sessionSaving) return
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
        activeWeapon,
      })
      setLastSavedId(saved.id)
      setSavedFlash(true)
      window.setTimeout(() => setSavedFlash(false), 2800)
    } catch {
      setSaveError(t('dryFire.session.saveError'))
    }
  }, [
    activeWeapon,
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
      <DryFireSafetyModal
        open={scenarioPhase === 'safety'}
        onConfirm={handleSafetyConfirm}
        onCancel={handleSafetyCancel}
      />

      <div className="sticky top-0 z-20 -mx-0.5 border-b border-slate-800 bg-[#0a0a0b]/95 px-0.5 py-2.5 backdrop-blur-sm">
        <div className="flex w-full min-w-0 flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
          <div className="min-w-0 flex-1">
            <p className="break-words font-mono text-sm font-bold uppercase leading-relaxed tracking-[0.14em] text-[#facc15] sm:text-base sm:tracking-[0.16em]">
              <span className="text-[#facc15]">{opsCode}</span>
              <span className="mx-1.5 text-zinc-500">·</span>
              <span className="text-white">
                {modeTitle || t('modes.dry-fire.title')}
              </span>
            </p>
            <p className="mt-1.5 break-words font-mono text-xs leading-snug text-zinc-300 sm:text-sm">
              {statusLine}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
            <HardwareStatusBadge className="max-w-full" armed={armed} />
            <button
              type="button"
              disabled={hits.length === 0 || sessionSaving}
              onClick={() => void handleSaveSession()}
              className="inline-flex min-h-11 touch-manipulation items-center gap-1.5 rounded-sm border border-[#facc15]/45 bg-[rgba(250,204,21,0.1)] px-3 py-2 font-mono text-xs font-bold uppercase tracking-[0.14em] text-[#facc15] transition hover:bg-[rgba(250,204,21,0.16)] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#facc15]/55 disabled:opacity-40 sm:min-h-9 sm:px-3 sm:py-2 sm:text-sm"
            >
              <Save className="size-3.5" strokeWidth={1.5} aria-hidden />
              {sessionSaving ? t('dryFire.session.saving') : t('dryFire.session.save')}
            </button>
          </div>
        </div>
      </div>

      <TimerActiveWeaponPanel controller={activeWeaponCtrl} />

      {scenarioPhase === 'safety' ? (
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-amber-400 sm:text-sm">
          {t('dryFire.training.safety.statusPending')}
        </p>
      ) : null}

      {savedFlash ? (
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-emerald-400 sm:text-sm">
          {t('dryFire.session.saved')}
        </p>
      ) : null}
      {saveError ? (
        <p className="font-mono text-xs text-red-400 sm:text-sm">{saveError}</p>
      ) : null}
      {dirty && !savedFlash ? (
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-zinc-400 sm:text-sm">
          {t('dryFire.session.unsaved')}
        </p>
      ) : null}

      <div className="flex w-full min-w-0 flex-col gap-5">
        {/* Hedef — tam genişlik (telemetri önizleme yalnızca ayarlarda) */}
        <section
          className={[
            'relative w-full min-w-0 overflow-hidden rounded-xl border border-slate-800 bg-slate-950 px-3 py-4 sm:px-5 sm:py-6',
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
          <div className="relative z-[1] mx-auto flex w-full max-w-3xl flex-col items-center gap-3">
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
              weaponReady={hasActiveWeapon}
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
              onEnterFullscreen={() => requestSafetyPrompt()}
              scenarioPhase={scenarioPhase}
              prepRackHeard={prepRackHeard}
              onConfirmRacked={handleConfirmRacked}
            />
          </div>
        </section>

        {/* Hold / Trace / Shot — tam genişlik dashboard */}
        <DryFireShotAnalysisHud
          layout="dashboard"
          referencePitch={settings.mpuOffsetPitch}
          referenceRoll={settings.mpuOffsetRoll}
          referenceYaw={settings.mpuOffsetYaw}
        />

        <section className="w-full min-w-0 pb-2">
          <DryFireSessionDashboard />
        </section>

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
