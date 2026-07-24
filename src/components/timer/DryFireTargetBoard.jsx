import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { createPortal } from 'react-dom'
import { Maximize2, Minimize2, Eye, EyeOff } from 'lucide-react'
import {
  clampDryFireDistanceM,
  mapHitToFacePercent,
  resolveHitMarkerSizePx,
  scaleHitCoordsForDistance,
} from '../../lib/dryFireHits'
import {
  DRY_FIRE_TARGET_RINGS,
  resolveTargetScaleGeometry,
} from '../../lib/dryFireScaleEngine'
import DryFireFullscreenToolbar from './DryFireFullscreenToolbar'
import DryFireGraphPool from './DryFireGraphPool'
import DryFirePrepOverlay from './DryFirePrepOverlay'
import DryFireShotVectors from './DryFireShotVectors'

/**
 * @param {{
 *   hits: import('../../lib/dryFireHits').DryFireHit[]
 *   distanceM: number
 *   onDistanceChange: (m: number) => void
 *   screenOrientation?: import('../../lib/timerCalibrationSettings').ScreenOrientationMode
 *   screenDiagonalInches?: number
 *   eyeScreenDistanceM?: number
 *   onScreenOrientationChange?: (o: import('../../lib/timerCalibrationSettings').ScreenOrientationMode) => void
 *   onScreenDiagonalChange?: (n: number) => void
 *   onEyeDistanceChange?: (n: number) => void
 *   armed?: boolean
 *   phase?: 'idle' | 'delay' | 'running'
 *   liveMs?: number
 *   lastDrawMs?: number | null
 *   parTimeMs?: number
 *   parOver?: boolean
 *   timerEnabled?: boolean
 *   delayMode?: 'random' | 'fixed'
 *   fixedDelaySec?: number
 *   parTimeSec?: number
 *   onTimerEnabledChange?: (v: boolean) => void
 *   onDelayModeChange?: (m: 'random' | 'fixed') => void
 *   onFixedDelaySecChange?: (n: number) => void
 *   onParTimeSecChange?: (n: number) => void
 *   onArm?: () => void
 *   onDisarm?: () => void
 *   onFire?: () => void
 *   onResetPaper?: () => void
 *   onSaveSession?: () => void
 *   sessionSaving?: boolean
 *   canSave?: boolean
 *   onEnterFullscreen?: () => void
 *   scenarioPhase?: import('../../lib/dryFireTrainingMachine').DryFireScenarioPhase
 *   prepRackHeard?: boolean
 *   onConfirmRacked?: () => void
 *   ariaLabel?: string
 * }} props
 */
export default function DryFireTargetBoard({
  hits,
  distanceM,
  onDistanceChange,
  screenOrientation = 'portrait',
  screenDiagonalInches = 6.5,
  eyeScreenDistanceM = 1,
  onScreenOrientationChange,
  onScreenDiagonalChange,
  onEyeDistanceChange,
  armed = false,
  phase = 'idle',
  liveMs = 0,
  lastDrawMs = null,
  parTimeMs = 0,
  parOver = false,
  timerEnabled = true,
  delayMode = 'random',
  fixedDelaySec = 3,
  parTimeSec = 0,
  onTimerEnabledChange,
  onDelayModeChange,
  onFixedDelaySecChange,
  onParTimeSecChange,
  onArm,
  onDisarm,
  onFire,
  onResetPaper,
  onSaveSession,
  sessionSaving = false,
  canSave = false,
  onEnterFullscreen,
  scenarioPhase = 'idle',
  prepRackHeard = false,
  onConfirmRacked,
  ariaLabel,
}) {
  const { t } = useTranslation('timer')
  const fsRootRef = useRef(/** @type {HTMLDivElement | null} */ (null))
  const boardHostRef = useRef(/** @type {HTMLDivElement | null} */ (null))
  const boardSquareRef = useRef(/** @type {HTMLDivElement | null} */ (null))
  const wasFullscreenRef = useRef(false)
  const onEnterFullscreenRef = useRef(onEnterFullscreen)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [openGraphIds, setOpenGraphIds] = useState(
    /** @type {import('../../lib/dryFireHits').DryFireGraphId[]} */ ([]),
  )
  const [poolCollapsed, setPoolCollapsed] = useState(false)
  const [fsError, setFsError] = useState(/** @type {string | null} */ (null))
  const [activeId, setActiveId] = useState(/** @type {string | null} */ (null))
  const [tooltipPos, setTooltipPos] = useState({ left: 0, top: 0 })
  const [manualDraft, setManualDraft] = useState(String(distanceM))
  const [hostSize, setHostSize] = useState({ w: 360, h: 360 })
  const [boardRenderPx, setBoardRenderPx] = useState(360)

  const geometry = useMemo(() => {
    const vw = typeof window !== 'undefined' ? window.innerWidth : hostSize.w
    const vh = typeof window !== 'undefined' ? window.innerHeight : hostSize.h
    return resolveTargetScaleGeometry({
      distanceM,
      eyeScreenDistanceM,
      screenOrientation,
      screenDiagonalInches,
      viewportWidthPx: vw,
      viewportHeightPx: vh,
      containerWidthPx: hostSize.w,
      containerHeightPx: hostSize.h,
      fullscreen: isFullscreen,
    })
  }, [
    distanceM,
    eyeScreenDistanceM,
    hostSize.h,
    hostSize.w,
    isFullscreen,
    screenDiagonalInches,
    screenOrientation,
  ])

  const faceFraction = geometry.finalScale
  const faceHitRadiusPct = geometry.faceHitRadiusPct ?? 46
  const facePx = geometry.facePx
  const markerSizePx = resolveHitMarkerSizePx(facePx || boardRenderPx * faceFraction, isFullscreen)
  const activeHit = hits.find((h) => h.id === activeId) ?? null
  const activeScaled = activeHit
    ? scaleHitCoordsForDistance(activeHit.x, activeHit.y, distanceM)
    : null

  useEffect(() => {
    onEnterFullscreenRef.current = onEnterFullscreen
  }, [onEnterFullscreen])

  useEffect(() => {
    setManualDraft(String(distanceM))
  }, [distanceM])

  useEffect(() => {
    const el = boardHostRef.current
    if (!el || typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect
      if (!cr) return
      setHostSize({
        w: Math.max(1, cr.width),
        h: Math.max(1, cr.height || cr.width),
      })
    })
    ro.observe(el)
    const rect = el.getBoundingClientRect()
    if (rect.width > 0) {
      setHostSize({
        w: Math.max(1, rect.width),
        h: Math.max(1, rect.height || rect.width),
      })
    }
    return () => ro.disconnect()
  }, [isFullscreen, sidebarOpen])

  useEffect(() => {
    const el = boardSquareRef.current
    if (!el || typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect
      if (!cr) return
      const side = Math.max(1, Math.min(cr.width, cr.height || cr.width))
      setBoardRenderPx(side)
    })
    ro.observe(el)
    const rect = el.getBoundingClientRect()
    if (rect.width > 0) {
      setBoardRenderPx(Math.max(1, Math.min(rect.width, rect.height || rect.width)))
    }
    return () => ro.disconnect()
  }, [isFullscreen, hostSize.w, hostSize.h])

  useEffect(() => {
    const sync = () => {
      const el = fsRootRef.current
      const cur =
        document.fullscreenElement ||
        /** @type {{ webkitFullscreenElement?: Element | null }} */ (document).webkitFullscreenElement ||
        null
      const on = Boolean(el && cur === el)
      // Güvenlik onayı yalnızca "Tam Ekran" buton niyetinde açılır — burası sadece UI senkronu.
      wasFullscreenRef.current = on
      setIsFullscreen(on)
      if (on) {
        // Dar ekranda hedef alanını koru — toolbar varsayılan kapalı
        const narrow =
          typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
        setSidebarOpen(!narrow)
      }
      window.requestAnimationFrame(() => {
        const host = boardHostRef.current
        if (!host) return
        const rect = host.getBoundingClientRect()
        if (rect.width > 0) {
          setHostSize({
            w: Math.max(1, rect.width),
            h: Math.max(1, rect.height || rect.width),
          })
        }
      })
    }
    document.addEventListener('fullscreenchange', sync)
    document.addEventListener('webkitfullscreenchange', sync)
    return () => {
      document.removeEventListener('fullscreenchange', sync)
      document.removeEventListener('webkitfullscreenchange', sync)
    }
  }, [])

  const exitFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else if (
        /** @type {{ webkitExitFullscreen?: () => Promise<void> | void }} */ (document)
          .webkitExitFullscreen
      ) {
        await /** @type {{ webkitExitFullscreen: () => Promise<void> | void }} */ (document).webkitExitFullscreen()
      }
    } catch {
      /* ignore */
    }
  }, [])

  const enterFullscreen = useCallback(async () => {
    setFsError(null)
    // Kullanıcı "Tam Ekran" niyeti — güvenlik protokolünü her seferinde aç
    onEnterFullscreenRef.current?.()
    const el = fsRootRef.current
    if (!el) return
    try {
      if (el.requestFullscreen) await el.requestFullscreen()
      else if (
        /** @type {{ webkitRequestFullscreen?: () => Promise<void> | void }} */ (el)
          .webkitRequestFullscreen
      ) {
        await /** @type {{ webkitRequestFullscreen: () => Promise<void> | void }} */ (
          el
        ).webkitRequestFullscreen()
      } else {
        setFsError(t('dryFire.fullscreen.unsupported'))
      }
    } catch {
      setFsError(t('dryFire.fullscreen.failed'))
    }
  }, [t])

  const toggleFullscreen = useCallback(() => {
    if (isFullscreen) void exitFullscreen()
    else void enterFullscreen()
  }, [enterFullscreen, exitFullscreen, isFullscreen])

  const clearActive = useCallback(() => setActiveId(null), [])

  const placeTooltip = useCallback((clientX, clientY) => {
    const pad = 12
    const tw = 220
    const th = 170
    const vw = typeof window !== 'undefined' ? window.innerWidth : 400
    const vh = typeof window !== 'undefined' ? window.innerHeight : 700
    let left = clientX + 14
    let top = clientY + 14
    if (left + tw > vw - pad) left = clientX - tw - 10
    if (top + th > vh - pad) top = clientY - th - 10
    setTooltipPos({ left: Math.max(pad, left), top: Math.max(pad, top) })
  }, [])

  const activateHit = useCallback(
    (hit, clientX, clientY) => {
      setActiveId(hit.id)
      placeTooltip(clientX, clientY)
    },
    [placeTooltip],
  )

  useEffect(() => {
    if (!activeId) return undefined
    const onPointerDown = (e) => {
      const el = /** @type {HTMLElement | null} */ (e.target)
      if (el?.closest?.('[data-dry-hit]') || el?.closest?.('[data-dry-hit-tooltip]')) return
      clearActive()
    }
    window.addEventListener('pointerdown', onPointerDown)
    return () => window.removeEventListener('pointerdown', onPointerDown)
  }, [activeId, clearActive])

  const commitManualDistance = useCallback(() => {
    const next = clampDryFireDistanceM(manualDraft)
    setManualDraft(String(next))
    onDistanceChange(next)
  }, [manualDraft, onDistanceChange])

  const toggleGraph = useCallback((/** @type {import('../../lib/dryFireHits').DryFireGraphId} */ id) => {
    setOpenGraphIds((prev) => {
      if (prev.includes(id)) return prev.filter((g) => g !== id)
      setPoolCollapsed(false)
      return [...prev, id]
    })
  }, [])

  const closeGraph = useCallback((/** @type {import('../../lib/dryFireHits').DryFireGraphId} */ id) => {
    setOpenGraphIds((prev) => prev.filter((g) => g !== id))
  }, [])

  /** Canlı katman: her yeni isabette belirme animasyonu */
  const newestHitId = hits.length > 0 ? hits[hits.length - 1].id : null
  const [popHitId, setPopHitId] = useState(/** @type {string | null} */ (null))
  /** Atış vektör okları — varsayılan gizli */
  const [vectorsVisible, setVectorsVisible] = useState(false)
  useEffect(() => {
    if (!newestHitId) return undefined
    setPopHitId(newestHitId)
    const t = window.setTimeout(() => setPopHitId(null), 520)
    return () => window.clearTimeout(t)
  }, [newestHitId])

  /** Vektör okları — kullanıcı açtıysa ve 2+ isabet varsa */
  const showShotVectors = vectorsVisible && hits.length >= 2

  const avail = Math.min(hostSize.w, hostSize.h) || geometry.boardPx
  const boardSidePx = Math.max(120, Math.min(geometry.boardPx, avail))

  const canvas = (
    <div
      ref={boardHostRef}
      className={[
        'mx-auto flex w-full min-w-0 max-w-full items-center justify-center',
        isFullscreen
          ? 'min-h-0 w-full flex-1'
          : 'aspect-square max-h-[min(72vw,20rem)] sm:max-h-[min(100vw,22rem)]',
      ].join(' ')}
    >
      <div
        ref={boardSquareRef}
        className="relative shrink-0 overflow-hidden rounded-sm border border-zinc-600/70 bg-[#0a0a0b] shadow-[inset_0_0_0_1px_rgba(250,204,21,0.08)] touch-manipulation"
        style={{
          width: boardSidePx,
          height: boardSidePx,
          aspectRatio: '1 / 1',
          maxWidth: '100%',
          maxHeight: isFullscreen ? '100%' : undefined,
        }}
        role="img"
        aria-label={ariaLabel || t('dryFire.target.aria')}
        onPointerDown={(e) => {
          if (e.target === e.currentTarget || /** @type {HTMLElement} */ (e.target).tagName === 'svg') {
            clearActive()
          }
        }}
      >
        {/* —— STATİK katman: grid + hedef kağıdı (asla dönmez) —— */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.32]"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(250,204,21,0.07) 1px, transparent 1px), linear-gradient(to bottom, rgba(250,204,21,0.07) 1px, transparent 1px)',
            backgroundSize: '12px 12px',
          }}
          aria-hidden
        />

        <div
          className="absolute left-1/2 top-1/2 z-10 overflow-visible transition-[width,height] duration-300 ease-out"
          style={{
            width: `${faceFraction * 100}%`,
            height: `${faceFraction * 100}%`,
            aspectRatio: '1 / 1',
            transform: 'translate(-50%, -50%)',
          }}
        >
          {/* Sabit radar / çember / crosshair — rotasyon yok */}
          <svg
            viewBox="0 0 200 200"
            className="pointer-events-none absolute inset-0 h-full w-full"
            preserveAspectRatio="xMidYMid meet"
            aria-hidden
          >
            {DRY_FIRE_TARGET_RINGS.map((ring) => (
              <circle
                key={ring.id}
                cx="100"
                cy="100"
                r={ring.svgR}
                fill="none"
                stroke="rgba(250,204,21,0.22)"
                strokeWidth={ring.id === '10' ? 1.25 : 0.75}
              />
            ))}
            <circle cx="100" cy="100" r="2.2" fill="#facc15" opacity="0.45" />
            <line x1="100" y1="8" x2="100" y2="192" stroke="rgba(250,204,21,0.4)" strokeWidth="0.85" />
            <line x1="8" y1="100" x2="192" y2="100" stroke="rgba(250,204,21,0.4)" strokeWidth="0.85" />
            <polygon points="100,10 95,20 105,20" fill="#facc15" opacity="0.75" />
            {isFullscreen
              ? geometry.rings
                  .filter((r) => ['X', '10', '9', '6'].includes(r.id))
                  .map((ring) => {
                    const live =
                      ring.screenDiameterCm != null ? ring.screenDiameterCm : ring.diameterCm
                    return (
                      <text
                        key={`lbl-${ring.id}`}
                        x="100"
                        y={100 - ring.svgR + (ring.id === 'X' ? 4 : 0)}
                        textAnchor="middle"
                        dominantBaseline="hanging"
                        fill="rgba(250,204,21,0.55)"
                        fontSize="5"
                        fontFamily="ui-monospace, monospace"
                      >
                        {live.toFixed(1)}
                      </text>
                    )
                  })
              : null}
          </svg>

          {/* —— CANLI katman: vektörler (isabet merkezlerine anchor) + sabit isabetler —— */}
          <DryFireShotVectors
            hits={hits}
            distanceM={distanceM}
            faceHitRadiusPct={faceHitRadiusPct}
            visible={showShotVectors}
            newestLinkToIndex={hits.length >= 2 ? hits[hits.length - 1].index : null}
          />

          {hits.map((hit) => {
            const pos = mapHitToFacePercent(hit.x, hit.y, distanceM, faceHitRadiusPct)
            const isActive = activeId === hit.id
            const isNew = popHitId === hit.id
            const size = markerSizePx
            return (
              /*
               * Konum sarmalayıcısı: left/top + translate(-50%,-50%) ASLA animasyonlanmaz.
               * scale/pop yalnızca iç düğümde — vektör/CSS transform marker'ı kaydırmaz.
               */
              <div
                key={hit.id}
                data-dry-hit={hit.id}
                className="pointer-events-none absolute z-20"
                style={{
                  left: `${pos.leftPct}%`,
                  top: `${pos.topPct}%`,
                  width: size,
                  height: size,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <button
                  type="button"
                  aria-label={t('dryFire.target.hitAria', { n: hit.index })}
                  className={[
                    'pointer-events-auto absolute inset-0 flex items-center justify-center rounded-full border-[2.5px] bg-black/70',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#facc15]/70',
                    isActive ? 'z-30' : '',
                    isNew ? 'df-hit-pop' : '',
                    isActive ? 'df-hit-active' : 'df-hit-idle',
                  ].join(' ')}
                  style={{
                    borderColor: hit.color,
                    boxShadow: `0 0 ${Math.max(8, size * 0.45)}px 2px ${hit.color}cc, inset 0 0 0 1px ${hit.color}88`,
                  }}
                  onMouseEnter={(e) => activateHit(hit, e.clientX, e.clientY)}
                  onMouseMove={(e) => {
                    if (activeId === hit.id) placeTooltip(e.clientX, e.clientY)
                  }}
                  onMouseLeave={() => {
                    if (typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches) {
                      clearActive()
                    }
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (activeId === hit.id) {
                      clearActive()
                      return
                    }
                    activateHit(hit, e.clientX, e.clientY)
                  }}
                >
                  <span
                    className="pointer-events-none font-mono-technical font-bold tabular-nums leading-none"
                    style={{
                      color: hit.color,
                      fontSize: Math.max(8, Math.round(size * 0.38)),
                    }}
                  >
                    {hit.index}
                  </span>
                </button>
              </div>
            )
          })}
        </div>

        <style>{`
          @keyframes dfHitPop {
            0% { transform: scale(0.2); opacity: 0; }
            55% { transform: scale(1.28); opacity: 1; }
            100% { transform: scale(1); opacity: 1; }
          }
          .df-hit-pop {
            animation: dfHitPop 0.48s cubic-bezier(0.22, 1, 0.36, 1) both;
          }
          .df-hit-idle:hover {
            transform: scale(1.1);
          }
          .df-hit-active {
            transform: scale(1.25);
          }
        `}</style>

        <span className="pointer-events-none absolute left-1.5 top-1.5 z-[5] h-2.5 w-2.5 border-l border-t border-[#facc15]/50" />
        <span className="pointer-events-none absolute right-1.5 top-1.5 z-[5] h-2.5 w-2.5 border-r border-t border-[#facc15]/50" />
        <span className="pointer-events-none absolute bottom-1.5 left-1.5 z-[5] h-2.5 w-2.5 border-b border-l border-[#facc15]/50" />
        <span className="pointer-events-none absolute bottom-1.5 right-1.5 z-[5] h-2.5 w-2.5 border-b border-r border-[#facc15]/50" />

        {!isFullscreen ? (
          <div className="absolute right-1.5 top-1.5 z-30 flex flex-col items-end gap-1.5">
            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label={t('dryFire.fullscreen.enter')}
              title={t('dryFire.fullscreen.enter')}
              className={[
                'inline-flex size-11 touch-manipulation items-center justify-center rounded-md sm:size-8',
                'border border-white/10 bg-black/55 text-[#facc15]/90 shadow-sm backdrop-blur-md',
                'transition hover:border-[#facc15]/40 hover:bg-black/75 hover:text-[#facc15]',
                'focus:outline-none focus-visible:ring-1 focus-visible:ring-[#facc15]/55',
              ].join(' ')}
            >
              <Maximize2 className="size-4 sm:size-3.5" strokeWidth={1.75} aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => setVectorsVisible((v) => !v)}
              aria-pressed={vectorsVisible}
              aria-label={
                vectorsVisible ? t('dryFire.target.vectorsHide') : t('dryFire.target.vectorsShow')
              }
              title={
                vectorsVisible ? t('dryFire.target.vectorsHide') : t('dryFire.target.vectorsShow')
              }
              className={[
                'inline-flex min-h-11 touch-manipulation items-center gap-1.5 rounded-md border px-2.5 py-1.5 shadow-sm backdrop-blur-md sm:min-h-8 sm:px-2 sm:py-1',
                'font-mono-technical text-[7px] font-bold uppercase tracking-[0.14em] transition',
                'focus:outline-none focus-visible:ring-1 focus-visible:ring-teal-400/55',
                vectorsVisible
                  ? 'border-teal-400/45 bg-teal-950/70 text-teal-300'
                  : 'border-white/10 bg-black/55 text-zinc-400 hover:border-teal-400/35 hover:text-teal-300/90',
              ].join(' ')}
            >
              {vectorsVisible ? (
                <Eye className="size-4 shrink-0 sm:size-3.5" strokeWidth={1.75} aria-hidden />
              ) : (
                <EyeOff className="size-4 shrink-0 sm:size-3.5" strokeWidth={1.75} aria-hidden />
              )}
              <span className="max-w-[4.5rem] leading-tight">{t('dryFire.target.vectorsToggle')}</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setVectorsVisible((v) => !v)}
            aria-pressed={vectorsVisible}
            aria-label={
              vectorsVisible ? t('dryFire.target.vectorsHide') : t('dryFire.target.vectorsShow')
            }
            title={
              vectorsVisible ? t('dryFire.target.vectorsHide') : t('dryFire.target.vectorsShow')
            }
            className={[
              'absolute left-1.5 top-1.5 z-30 inline-flex min-h-11 touch-manipulation items-center gap-1.5 rounded-md border px-2.5 py-1.5 sm:min-h-8 sm:px-2 sm:py-1',
              'font-mono-technical text-[7px] font-bold uppercase tracking-[0.14em] shadow-sm backdrop-blur-md transition',
              'focus:outline-none focus-visible:ring-1 focus-visible:ring-teal-400/55',
              vectorsVisible
                ? 'border-teal-400/45 bg-teal-950/70 text-teal-300'
                : 'border-white/10 bg-black/55 text-zinc-400 hover:border-teal-400/35 hover:text-teal-300/90',
            ].join(' ')}
          >
            {vectorsVisible ? (
              <Eye className="size-4 shrink-0 sm:size-3.5" strokeWidth={1.75} aria-hidden />
            ) : (
              <EyeOff className="size-4 shrink-0 sm:size-3.5" strokeWidth={1.75} aria-hidden />
            )}
            <span>{t('dryFire.target.vectorsToggle')}</span>
          </button>
        )}

        {phase === 'delay' || phase === 'running' || lastDrawMs != null ? (
          <div
            className={[
              'pointer-events-none absolute bottom-2 left-1/2 z-30 -translate-x-1/2 rounded-sm border px-3 py-1.5 backdrop-blur-sm',
              parOver
                ? 'border-red-400/55 bg-red-950/70'
                : phase === 'delay'
                  ? 'border-amber-400/45 bg-[#0a0a0b]/85'
                  : 'border-[#facc15]/40 bg-[#0a0a0b]/85',
            ].join(' ')}
          >
            <p
              className={[
                'text-center font-mono-technical text-[10px] font-bold uppercase tracking-[0.18em] tabular-nums',
                parOver ? 'text-red-300' : 'text-[#facc15]',
              ].join(' ')}
            >
              {phase === 'delay'
                ? t('dryFire.timer.delaying')
                : `${liveMs.toString().padStart(4, '0')} ms`}
            </p>
            {lastDrawMs != null && phase !== 'delay' ? (
              <p className="mt-0.5 text-center font-mono-technical text-[8px] uppercase tracking-[0.14em] text-zinc-400">
                {t('dryFire.timer.draw')}: {lastDrawMs} ms
                {parTimeMs > 0 ? ` · PAR ${parTimeMs}` : ''}
              </p>
            ) : null}
          </div>
        ) : null}

        {hits.length === 0 && phase === 'idle' ? (
          <div className="pointer-events-none absolute inset-0 z-[6] flex items-center justify-center px-6">
            <div className="relative max-w-[12rem] border border-dashed border-[#facc15]/22 bg-[#0a0a0b]/55 px-3 py-4">
              <span className="absolute left-1 top-1 h-1.5 w-1.5 border-l border-t border-[#facc15]/35" />
              <span className="absolute right-1 top-1 h-1.5 w-1.5 border-r border-t border-[#facc15]/35" />
              <span className="absolute bottom-1 left-1 h-1.5 w-1.5 border-b border-l border-[#facc15]/35" />
              <span className="absolute bottom-1 right-1 h-1.5 w-1.5 border-b border-r border-[#facc15]/35" />
              <p className="text-center font-mono-technical text-[8px] uppercase leading-relaxed tracking-[0.2em] text-zinc-500">
                {t('dryFire.target.empty')}
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )

  return (
    <div
      ref={fsRootRef}
      className={[
        'relative w-full min-w-0',
        isFullscreen
          ? [
              'flex h-[100dvh] w-full max-w-none overflow-hidden bg-[#0a0a0b]',
              /* Mobil: dikey yığın; md+: toolbar | pool | hedef */
              'flex-col md:flex-row',
            ].join(' ')
          : 'mx-auto w-full max-w-[min(100%,22rem)]',
      ].join(' ')}
      style={isFullscreen ? { pointerEvents: 'auto' } : undefined}
      data-dry-fs-interactive={isFullscreen ? '1' : undefined}
    >
      {isFullscreen ? (
        <button
          type="button"
          onClick={() => void exitFullscreen()}
          data-dry-fs-exit
          aria-label={t('dryFire.fullscreen.exitEsc')}
          title={t('dryFire.fullscreen.exitEsc')}
          className={[
            'absolute right-2 top-2 z-[280] inline-flex min-h-11 touch-manipulation items-center gap-1.5 rounded-sm border border-[#facc15]/55 sm:right-3 sm:top-3 sm:gap-2',
            'bg-[#0a0a0b]/92 px-2.5 py-2 font-mono-technical text-[8px] font-bold uppercase tracking-[0.14em] text-[#facc15] sm:px-3 sm:text-[9px] sm:tracking-[0.16em]',
            'max-w-[calc(100vw-5.5rem)] shadow-[0_8px_28px_-10px_rgba(0,0,0,0.85)] backdrop-blur-md transition',
            'hover:border-[#facc15]/75 hover:bg-[rgba(250,204,21,0.12)]',
            'focus:outline-none focus-visible:ring-1 focus-visible:ring-[#facc15]/55',
          ].join(' ')}
        >
          <Minimize2 className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
          <span className="truncate sm:whitespace-nowrap">{t('dryFire.fullscreen.exitEsc')}</span>
        </button>
      ) : null}

      {isFullscreen ? (
        <DryFirePrepOverlay
          open={scenarioPhase === 'prep'}
          prepRackHeard={prepRackHeard}
          onReady={() => onConfirmRacked?.()}
        />
      ) : null}

      {isFullscreen ? (
        <DryFireFullscreenToolbar
          open={sidebarOpen}
          onToggle={() => setSidebarOpen((v) => !v)}
          distanceM={distanceM}
          onDistanceChange={onDistanceChange}
          manualDraft={manualDraft}
          onManualDraftChange={setManualDraft}
          onManualCommit={commitManualDistance}
          screenOrientation={screenOrientation}
          screenDiagonalInches={screenDiagonalInches}
          eyeScreenDistanceM={eyeScreenDistanceM}
          onScreenOrientationChange={(o) => onScreenOrientationChange?.(o)}
          onScreenDiagonalChange={(n) => onScreenDiagonalChange?.(n)}
          onEyeDistanceChange={(n) => onEyeDistanceChange?.(n)}
          rings={geometry.rings}
          faceScreenCm={geometry.faceScreenCm}
          armed={armed}
          phase={phase}
          liveMs={liveMs}
          lastDrawMs={lastDrawMs}
          parOver={parOver}
          timerEnabled={timerEnabled}
          delayMode={delayMode}
          fixedDelaySec={fixedDelaySec}
          parTimeSec={parTimeSec}
          onTimerEnabledChange={(v) => onTimerEnabledChange?.(v)}
          onDelayModeChange={(m) => onDelayModeChange?.(m)}
          onFixedDelaySecChange={(n) => onFixedDelaySecChange?.(n)}
          onParTimeSecChange={(n) => onParTimeSecChange?.(n)}
          hitsCount={hits.length}
          onArm={() => onArm?.()}
          onDisarm={() => onDisarm?.()}
          onFire={() => onFire?.()}
          onResetPaper={() => onResetPaper?.()}
          onSaveSession={() => onSaveSession?.()}
          sessionSaving={sessionSaving}
          canSave={canSave}
          onExitFullscreen={() => void exitFullscreen()}
          openGraphIds={openGraphIds}
          onToggleGraph={toggleGraph}
        />
      ) : null}

      {isFullscreen ? (
        <DryFireGraphPool
          openGraphIds={openGraphIds}
          onCloseGraph={closeGraph}
          poolCollapsed={poolCollapsed}
          onTogglePool={() => setPoolCollapsed((v) => !v)}
          hits={hits}
        />
      ) : null}

      <div
        className={[
          'flex min-w-0 flex-col',
          isFullscreen
            ? [
                'min-h-0 overflow-hidden p-2 sm:p-3 md:p-4',
                /* Mobil: hedef üstte (order-1); md+: sağda (order-3) */
                'order-1 flex-1 md:order-3',
                openGraphIds.length > 0 && !poolCollapsed
                  ? 'md:w-[min(42vh,22rem)] md:shrink-0 md:grow-0 md:flex-none'
                  : 'md:flex-1',
              ].join(' ')
            : '',
        ].join(' ')}
      >
        {fsError ? (
          <p className="mb-2 shrink-0 px-1 text-center font-mono-technical text-[9px] text-red-400/90">
            {fsError}
          </p>
        ) : null}

        {canvas}

        {isFullscreen ? (
          <p className="mt-1.5 hidden shrink-0 text-center font-mono-technical text-[8px] uppercase tracking-[0.2em] text-zinc-600 md:mt-2 md:block">
            {t('dryFire.fullscreen.escHint')}
          </p>
        ) : null}
      </div>

      {activeHit && activeScaled && typeof document !== 'undefined'
        ? createPortal(
            <div
              data-dry-hit-tooltip
              role="tooltip"
              className="pointer-events-none fixed z-[280] w-[min(100vw-1.5rem,14rem)] rounded-sm border border-[#facc15]/45 bg-[#0a0a0b]/95 px-3 py-2.5 shadow-[0_0_28px_-8px_rgba(250,204,21,0.4)] backdrop-blur-sm"
              style={{ left: tooltipPos.left, top: tooltipPos.top }}
            >
              <p
                className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.24em]"
                style={{ color: activeHit.color }}
              >
                {t('dryFire.tooltip.shot', { n: activeHit.index })}
              </p>
              <dl className="mt-2 space-y-1.5 font-mono-technical text-[9px] text-app-text/80">
                <div className="flex justify-between gap-3">
                  <dt className="uppercase tracking-[0.12em] text-zinc-500">{t('dryFire.tooltip.trigger')}</dt>
                  <dd className="tabular-nums text-[#facc15]">{activeHit.triggerPressMs} ms</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="uppercase tracking-[0.12em] text-zinc-500">{t('dryFire.tooltip.flinch')}</dt>
                  <dd className="tabular-nums text-[#facc15]">{activeHit.flinchScore}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="uppercase tracking-[0.12em] text-zinc-500">{t('dryFire.tooltip.deviation')}</dt>
                  <dd className="tabular-nums text-zinc-200">
                    {activeScaled.deviationX.toFixed(3)}, {activeScaled.deviationY.toFixed(3)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="uppercase tracking-[0.12em] text-zinc-500">{t('dryFire.tooltip.distance')}</dt>
                  <dd className="tabular-nums text-zinc-200">{distanceM} m</dd>
                </div>
              </dl>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
