import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pause, Play, Radio, RotateCcw } from 'lucide-react'

/** @typedef {{ x: number, y: number, t: number }} TracePt */
/** @typedef {{
 *   id: number
 *   triggerT: number
 *   triggerIndex: number
 *   points: TracePt[]
 * }} TracePlaybackClip */

const SPEEDS = /** @type {const} */ ([0.5, 1, 2])

/**
 * @param {TracePt} p
 * @param {number} [scale]
 */
function toSvg(p, scale = 42) {
  const x = 50 + (p.y / 3) * scale
  const y = 50 - (p.x / 3) * scale
  return {
    x: Math.max(4, Math.min(96, x)),
    y: Math.max(4, Math.min(96, y)),
  }
}

/**
 * @param {TracePlaybackClip | null | undefined} src
 * @returns {TracePlaybackClip | null}
 */
function cloneClip(src) {
  if (!src || !Array.isArray(src.points) || src.points.length === 0) return null
  return {
    id: src.id,
    triggerT: src.triggerT,
    triggerIndex: src.triggerIndex,
    points: src.points.map((p) => ({ x: p.x, y: p.y, t: p.t })),
  }
}

/**
 * Canlı buffer'dan playback clip üret (manuel Oynat).
 * @param {TracePt[]} livePoints
 * @returns {TracePlaybackClip | null}
 */
function clipFromLive(livePoints) {
  if (!livePoints || livePoints.length < 2) return null
  const last = livePoints[livePoints.length - 1]
  const tEnd = last.t
  const cutoff = tEnd - 3000
  const points = livePoints.filter((p) => p.t >= cutoff).map((p) => ({ ...p }))
  if (points.length < 2) return null
  return {
    id: tEnd,
    triggerT: tEnd,
    triggerIndex: points.length - 1,
    points,
  }
}

/**
 * Namlu izi — canlı çizim + tetik sonrası 3 sn playback + fade trail.
 *
 * @param {{
 *   livePoints: TracePt[]
 *   playback: TracePlaybackClip | null
 *   isConnected: boolean
 *   className?: string
 * }} props
 */
export default function MuzzleTracePlayer({
  livePoints,
  playback,
  isConnected,
  className = '',
}) {
  const { t } = useTranslation('timer')
  const rootRef = useRef(/** @type {HTMLDivElement | null} */ (null))
  const [isFs, setIsFs] = useState(false)

  /** @type {'live' | 'playback'} */
  const [mode, setMode] = useState('live')
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(/** @type {typeof SPEEDS[number]} */ (1))
  /** 0…1 */
  const [progress, setProgress] = useState(1)
  /** Dondurulmuş clip — canlı telemetry her frame yeni object üretmesin diye */
  const [clip, setClip] = useState(/** @type {TracePlaybackClip | null} */ (null))

  const lastClipIdRef = useRef(/** @type {number | null} */ (null))
  const progressRef = useRef(1)
  const playingRef = useRef(false)
  const speedRef = useRef(/** @type {number} */ (1))
  const modeRef = useRef(/** @type {'live' | 'playback'} */ ('live'))
  const clipRef = useRef(/** @type {TracePlaybackClip | null} */ (null))

  useEffect(() => {
    progressRef.current = progress
  }, [progress])
  useEffect(() => {
    playingRef.current = playing
  }, [playing])
  useEffect(() => {
    speedRef.current = speed
  }, [speed])
  useEffect(() => {
    modeRef.current = mode
  }, [mode])
  useEffect(() => {
    clipRef.current = clip
  }, [clip])

  // Tam ekran (ChartZoomFrame :fullscreen) — alanı doldur
  useEffect(() => {
    const syncFs = () => {
      const el = rootRef.current
      setIsFs(Boolean(el?.closest(':fullscreen')))
    }
    syncFs()
    document.addEventListener('fullscreenchange', syncFs)
    return () => document.removeEventListener('fullscreenchange', syncFs)
  }, [])

  // Yeni trigger clip → dondur + otomatik oynat
  useEffect(() => {
    if (!playback?.id || playback.id === lastClipIdRef.current) return
    if (!playback.points || playback.points.length < 2) return
    lastClipIdRef.current = playback.id
    const frozen = cloneClip(playback)
    if (!frozen) return
    setClip(frozen)
    setMode('playback')
    setProgress(0)
    progressRef.current = 0
    setPlaying(true)
    playingRef.current = true
  }, [playback])

  // Post uzantısı aynı id ile gelirse clip'i güncelle (oynatma ortasında nokta ekle)
  useEffect(() => {
    if (!playback?.id || playback.id !== lastClipIdRef.current) return
    if (!playback.points || playback.points.length < 2) return
    const cur = clipRef.current
    if (!cur || playback.points.length <= cur.points.length) return
    const frozen = cloneClip(playback)
    if (!frozen) return
    setClip(frozen)
  }, [playback])

  const hasClip = Boolean(clip && clip.points.length >= 2)

  const clipDurationMs = useMemo(() => {
    if (!clip || clip.points.length < 2) return 1
    return Math.max(1, clip.points[clip.points.length - 1].t - clip.points[0].t)
  }, [clip])

  // Tek stabil rAF döngüsü — playback progress
  useEffect(() => {
    let raf = 0
    let lastWall = performance.now()

    const tick = (now) => {
      const dt = Math.max(0, now - lastWall)
      lastWall = now
      if (
        modeRef.current === 'playback' &&
        playingRef.current &&
        clipRef.current &&
        clipRef.current.points.length >= 2
      ) {
        const c = clipRef.current
        const dur = Math.max(1, c.points[c.points.length - 1].t - c.points[0].t)
        const next = Math.min(1, progressRef.current + (dt * speedRef.current) / dur)
        if (next !== progressRef.current) {
          progressRef.current = next
          setProgress(next)
        }
        if (next >= 1) {
          playingRef.current = false
          setPlaying(false)
          progressRef.current = 1
          setProgress(1)
        }
      }
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const displayPoints = mode === 'live' ? livePoints || [] : clip?.points || []
  const revealIdx = useMemo(() => {
    if (mode === 'live') return Math.max(0, displayPoints.length - 1)
    if (!clip || !displayPoints.length) return -1
    const t0 = displayPoints[0].t
    const dur = Math.max(1, displayPoints[displayPoints.length - 1].t - t0)
    const cursorT = t0 + progress * dur
    let idx = 0
    for (let i = 0; i < displayPoints.length; i++) {
      if (displayPoints[i].t <= cursorT) idx = i
      else break
    }
    return idx
  }, [mode, displayPoints, progress, clip])

  /** Fade trail segmentleri — eski kısımlar saydam */
  const trailSegs = useMemo(() => {
    if (revealIdx < 1 || displayPoints.length < 2) return []
    const segs = []
    const n = revealIdx
    for (let i = 0; i < n; i++) {
      const a = toSvg(displayPoints[i])
      const b = toSvg(displayPoints[i + 1])
      const age = 1 - i / Math.max(1, n)
      // Kuyruk: eski → opacity düşük; uç → opak
      const opacity = 0.08 + Math.pow(1 - age, 1.35) * 0.88
      const width = 0.55 + Math.pow(1 - age, 1.1) * 1.05
      segs.push({ key: i, a, b, opacity, width })
    }
    return segs
  }, [displayPoints, revealIdx])

  const head = revealIdx >= 0 && displayPoints[revealIdx] ? toSvg(displayPoints[revealIdx]) : null

  const triggerRevealed = mode === 'playback' && clip != null && revealIdx >= clip.triggerIndex
  const triggerPos =
    clip && clip.points[clip.triggerIndex] ? toSvg(clip.points[clip.triggerIndex]) : null

  const startPlayback = useCallback(
    (/** @type {TracePlaybackClip} */ nextClip, fromStart = true) => {
      setClip(nextClip)
      clipRef.current = nextClip
      lastClipIdRef.current = nextClip.id
      setMode('playback')
      modeRef.current = 'playback'
      const p0 = fromStart ? 0 : progressRef.current
      progressRef.current = p0
      setProgress(p0)
      playingRef.current = true
      setPlaying(true)
    },
    [],
  )

  const togglePlay = useCallback(() => {
    if (mode === 'playback' && hasClip) {
      if (progressRef.current >= 0.999) {
        progressRef.current = 0
        setProgress(0)
        playingRef.current = true
        setPlaying(true)
        return
      }
      const next = !playingRef.current
      playingRef.current = next
      setPlaying(next)
      return
    }
    // Clip yoksa: son playback prop veya canlı 3 sn buffer
    const fromProp = cloneClip(playback)
    const fromLive = clipFromLive(livePoints)
    const next = fromProp || fromLive || clip
    if (!next || next.points.length < 2) return
    startPlayback(next, true)
  }, [mode, hasClip, playback, livePoints, clip, startPlayback])

  const goLive = useCallback(() => {
    playingRef.current = false
    setPlaying(false)
    setMode('live')
    modeRef.current = 'live'
    progressRef.current = 1
    setProgress(1)
  }, [])

  const replay = useCallback(() => {
    const next = clip || cloneClip(playback) || clipFromLive(livePoints)
    if (!next || next.points.length < 2) return
    startPlayback(next, true)
  }, [clip, playback, livePoints, startPlayback])

  const canPlay = hasClip || Boolean(playback && playback.points.length >= 2) || (livePoints?.length ?? 0) >= 2

  const timeLabel = useMemo(() => {
    if (mode === 'live') return t('dryFire.liveAnalysis.traceLive')
    const ms = Math.round(progress * clipDurationMs)
    return t('dryFire.liveAnalysis.traceTime', { ms })
  }, [mode, progress, clipDurationMs, t])

  const strokeLive = mode === 'live'

  return (
    <div
      ref={rootRef}
      className={[
        'muzzle-trace-player flex w-full min-w-0 flex-col gap-2.5',
        isFs ? 'h-full min-h-0 flex-1' : 'min-h-0',
        className,
      ].join(' ')}
    >
      {/* Sahne — kontrollerden ayrı flex alanı */}
      <div
        className={[
          'relative w-full shrink-0 overflow-hidden rounded-sm border border-slate-800 bg-slate-950',
          isFs
            ? 'min-h-0 flex-1'
            : 'mx-auto aspect-square max-h-[14rem] w-full max-w-[14rem] sm:max-h-[16rem] sm:max-w-[16rem]',
        ].join(' ')}
      >
        <svg
          viewBox="0 0 100 100"
          className="absolute inset-0 h-full w-full"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden
        >
          <defs>
            <radialGradient id="muzzle-trace-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(56,189,248,0.12)" />
              <stop offset="100%" stopColor="rgba(56,189,248,0)" />
            </radialGradient>
          </defs>
          <rect x="0" y="0" width="100" height="100" fill="url(#muzzle-trace-glow)" />
          <line x1="50" y1="4" x2="50" y2="96" stroke="rgba(148,163,184,0.2)" strokeWidth="0.5" />
          <line x1="4" y1="50" x2="96" y2="50" stroke="rgba(148,163,184,0.2)" strokeWidth="0.5" />
          <circle cx="50" cy="50" r="18" fill="none" stroke="rgba(250,204,21,0.12)" strokeWidth="0.4" />
          <circle cx="50" cy="50" r="2" fill="rgba(250,204,21,0.7)" />

          {trailSegs.map((seg) => (
            <line
              key={seg.key}
              x1={seg.a.x}
              y1={seg.a.y}
              x2={seg.b.x}
              y2={seg.b.y}
              stroke={strokeLive ? 'rgba(56,189,248,1)' : 'rgba(45,212,191,1)'}
              strokeWidth={seg.width}
              strokeLinecap="round"
              opacity={seg.opacity}
            />
          ))}

          {triggerRevealed && triggerPos ? (
            <g>
              <circle
                cx={triggerPos.x}
                cy={triggerPos.y}
                r="3.2"
                fill="none"
                stroke="rgba(248,113,113,0.85)"
                strokeWidth="0.7"
              />
              <line
                x1={triggerPos.x - 4}
                y1={triggerPos.y}
                x2={triggerPos.x + 4}
                y2={triggerPos.y}
                stroke="rgba(248,113,113,0.9)"
                strokeWidth="0.55"
              />
              <line
                x1={triggerPos.x}
                y1={triggerPos.y - 4}
                x2={triggerPos.x}
                y2={triggerPos.y + 4}
                stroke="rgba(248,113,113,0.9)"
                strokeWidth="0.55"
              />
            </g>
          ) : null}

          {head ? (
            <circle
              cx={head.x}
              cy={head.y}
              r="2.15"
              fill={strokeLive ? '#38bdf8' : '#5eead4'}
              opacity="0.95"
            />
          ) : null}
        </svg>

        <div className="pointer-events-none absolute left-1.5 top-1.5 rounded-sm border border-slate-700/80 bg-black/65 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-300">
          {mode === 'live' ? (
            <span className="inline-flex items-center gap-1 text-sky-300">
              <Radio className="size-2.5" strokeWidth={2} aria-hidden />
              {t('dryFire.liveAnalysis.traceModeLive')}
            </span>
          ) : (
            <span className="text-teal-300">{t('dryFire.liveAnalysis.traceModePlayback')}</span>
          )}
        </div>

        {!isConnected ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-1.5 flex justify-center px-2">
            <p className="rounded-sm border border-zinc-700/70 bg-black/70 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-500">
              {t('dryFire.liveAnalysis.traceAwaitHw')}
            </p>
          </div>
        ) : null}
      </div>

      {/* Kontroller — shrink-0, sahne ile net boşluk */}
      <div className="flex w-full shrink-0 flex-col gap-2 border-t border-slate-800/70 pt-2">
        {mode === 'playback' && hasClip ? (
          <div className="h-1 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-teal-400/90"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        ) : null}

        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <p className="min-w-0 font-mono text-xs tabular-nums text-zinc-400">{timeLabel}</p>
          <div className="flex shrink-0 items-center gap-1">
            {SPEEDS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setSpeed(s)
                }}
                className={[
                  'inline-flex min-h-8 min-w-[2.25rem] items-center justify-center rounded-sm border px-2 font-mono text-xs font-bold tabular-nums transition',
                  speed === s
                    ? 'border-teal-400/55 bg-teal-950/60 text-teal-200'
                    : 'border-slate-700 text-zinc-400 hover:border-teal-500/40 hover:text-teal-200',
                ].join(' ')}
                aria-pressed={speed === s}
              >
                {s === 0.5 ? '0.5×' : `${s}×`}
              </button>
            ))}
          </div>
        </div>

        <div className="flex w-full items-stretch gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              togglePlay()
            }}
            disabled={!canPlay}
            className={[
              'inline-flex min-h-9 flex-1 touch-manipulation items-center justify-center gap-1.5 rounded-sm border font-mono text-xs font-bold uppercase tracking-[0.1em] transition',
              canPlay
                ? 'border-teal-500/45 bg-teal-950/40 text-teal-200 hover:bg-teal-950/70'
                : 'cursor-not-allowed border-slate-800 text-zinc-600 opacity-50',
            ].join(' ')}
            aria-label={
              playing ? t('dryFire.liveAnalysis.tracePause') : t('dryFire.liveAnalysis.tracePlay')
            }
          >
            {playing ? (
              <Pause className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
            ) : (
              <Play className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
            )}
            <span className="truncate">
              {playing ? t('dryFire.liveAnalysis.tracePause') : t('dryFire.liveAnalysis.tracePlay')}
            </span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              replay()
            }}
            disabled={!canPlay}
            className="inline-flex size-9 shrink-0 touch-manipulation items-center justify-center rounded-sm border border-slate-700 text-zinc-400 transition hover:border-teal-500/40 hover:text-teal-200 disabled:opacity-40"
            title={t('dryFire.liveAnalysis.traceReplay')}
            aria-label={t('dryFire.liveAnalysis.traceReplay')}
          >
            <RotateCcw className="size-3.5" strokeWidth={1.75} aria-hidden />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              goLive()
            }}
            className={[
              'inline-flex min-h-9 shrink-0 touch-manipulation items-center justify-center rounded-sm border px-2.5 font-mono text-xs font-bold uppercase tracking-[0.1em] transition',
              mode === 'live'
                ? 'border-sky-400/50 bg-sky-950/50 text-sky-200'
                : 'border-slate-700 text-zinc-400 hover:border-sky-500/40 hover:text-sky-200',
            ].join(' ')}
          >
            {t('dryFire.liveAnalysis.traceGoLive')}
          </button>
        </div>
      </div>
    </div>
  )
}
