import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useHardware } from '../../context/HardwareContext'
import { cloneAnalysisView, holdQualityBand } from '../../lib/shotAnalysisEngines'
import {
  resolveHoldFeedback,
  resolveShotEventFeedback,
  resolveTraceFeedback,
} from '../../lib/analysisFeedback'
import AnalysisFeedbackBox from './AnalysisFeedbackBox'
import ChartZoomFrame from './ChartZoomFrame'
import MuzzleTracePlayer from './MuzzleTracePlayer'

/**
 * Canlı atış analiz HUD — Hold / Muzzle Trace / Shot Event.
 *
 * @param {{
 *   className?: string
 *   layout?: 'stack' | 'dashboard'
 *   referencePitch?: number
 *   referenceRoll?: number
 *   referenceYaw?: number
 * }} [props]
 */
export default function DryFireShotAnalysisHud({
  className = '',
  layout = 'stack',
  referencePitch = 0,
  referenceRoll = 0,
  referenceYaw = 0,
}) {
  const { t } = useTranslation('timer')
  const { isConnected, analysisRef, setAimReference } = useHardware()
  const [view, setView] = useState(() => cloneAnalysisView(analysisRef.current))
  const lastSeqRef = useRef(-1)
  const canvasRef = useRef(/** @type {HTMLCanvasElement | null} */ (null))

  useEffect(() => {
    setAimReference({
      pitch: referencePitch,
      roll: referenceRoll,
      yaw: referenceYaw,
    })
  }, [referencePitch, referenceRoll, referenceYaw, setAimReference])

  useEffect(() => {
    if (!isConnected) return undefined
    let raf = 0
    const tick = () => {
      const state = analysisRef.current
      if (state.seq !== lastSeqRef.current) {
        lastSeqRef.current = state.seq
        setView(cloneAnalysisView(state))
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [analysisRef, isConnected])

  const band = holdQualityBand(view.hold.holdQuality)
  const bandClass =
    band === 'elite'
      ? 'text-emerald-300 border-emerald-500/45 bg-emerald-500/10'
      : band === 'stable'
        ? 'text-[#facc15] border-[#facc15]/40 bg-[rgba(250,204,21,0.08)]'
        : band === 'fair'
          ? 'text-amber-300 border-amber-500/40 bg-amber-500/10'
          : 'text-red-300 border-red-500/40 bg-red-500/10'

  const holdFb = useMemo(() => resolveHoldFeedback(view.hold), [view.hold])
  const traceFb = useMemo(() => resolveTraceFeedback(view.trace), [view.trace])
  const shotFb = useMemo(
    () => resolveShotEventFeedback(view.shot, view.hold),
    [view.shot, view.hold],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const w = canvas.width
    const h = canvas.height
    ctx.clearRect(0, 0, w, h)
    ctx.strokeStyle = 'rgba(148,163,184,0.25)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(w / 2, 0)
    ctx.lineTo(w / 2, h)
    ctx.moveTo(0, h / 2)
    ctx.lineTo(w, h / 2)
    ctx.stroke()

    const shot = view.shot
    if (shot.preCount < 1 && !shot.triggerTimestamp) return

    const allPitch = [...shot.prePitch, shot.triggerPitch, ...shot.postPitch]
    const allRoll = [...shot.preRoll, shot.triggerRoll, ...shot.postRoll]
    if (!allPitch.length) return

    let minP = Infinity
    let maxP = -Infinity
    let minR = Infinity
    let maxR = -Infinity
    for (let i = 0; i < allPitch.length; i++) {
      minP = Math.min(minP, allPitch[i])
      maxP = Math.max(maxP, allPitch[i])
      minR = Math.min(minR, allRoll[i])
      maxR = Math.max(maxR, allRoll[i])
    }
    const padP = Math.max(0.5, (maxP - minP) * 0.15)
    const padR = Math.max(0.5, (maxR - minR) * 0.15)
    minP -= padP
    maxP += padP
    minR -= padR
    maxR += padR
    const spanP = maxP - minP || 1
    const spanR = maxR - minR || 1

    const map = (pitch, roll) => ({
      x: ((roll - minR) / spanR) * (w - 8) + 4,
      y: (1 - (pitch - minP) / spanP) * (h - 8) + 4,
    })

    const drawSeg = (pitches, rolls, color, width) => {
      if (pitches.length < 2) return
      ctx.strokeStyle = color
      ctx.lineWidth = width
      ctx.beginPath()
      const p0 = map(pitches[0], rolls[0])
      ctx.moveTo(p0.x, p0.y)
      for (let i = 1; i < pitches.length; i++) {
        const p = map(pitches[i], rolls[i])
        ctx.lineTo(p.x, p.y)
      }
      ctx.stroke()
    }

    drawSeg(shot.prePitch, shot.preRoll, 'rgba(56,189,248,0.85)', 1.5)
    drawSeg(shot.postPitch, shot.postRoll, 'rgba(251,146,60,0.9)', 1.5)

    const trig = map(shot.triggerPitch, shot.triggerRoll)
    ctx.fillStyle = '#f87171'
    ctx.beginPath()
    ctx.arc(trig.x, trig.y, 3.5, 0, Math.PI * 2)
    ctx.fill()
  }, [view.shot])

  const fmt = (n, d = 2) => (Number.isFinite(n) ? n.toFixed(d) : t('dryFire.feedback.empty'))
  const isDash = layout === 'dashboard'

  const cardClass = isDash
    ? 'flex min-w-0 flex-col gap-3 overflow-hidden rounded-lg border border-slate-800/90 bg-slate-900/50 p-3 sm:p-3.5'
    : ''

  return (
    <div
      className={[
        'rounded-xl border border-slate-800 bg-slate-950/80 p-3 sm:p-4',
        isDash ? '' : 'mt-4 rounded-lg bg-slate-900/60 px-3 py-3',
        className,
      ].join(' ')}
      aria-label={t('dryFire.liveAnalysis.aria')}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 sm:mb-4">
        <p className="min-w-0 font-mono text-sm font-bold uppercase leading-snug tracking-[0.12em] text-[#facc15] sm:text-base">
          {t('dryFire.liveAnalysis.kicker')}
        </p>
        <span
          className={[
            'shrink-0 rounded border px-2 py-1 font-mono text-xs font-bold uppercase tracking-wider',
            isConnected ? bandClass : 'border-slate-700 text-zinc-400',
          ].join(' ')}
        >
          {isConnected
            ? t(`dryFire.liveAnalysis.band.${band}`)
            : t('dryFire.liveAnalysis.offline')}
        </span>
      </div>

      <div
        className={
          isDash
            ? 'grid w-full min-w-0 grid-cols-1 gap-4 lg:grid-cols-3 lg:items-start xl:gap-5'
            : 'flex flex-col gap-4'
        }
      >
        {/* Hold */}
        <div className={isDash ? cardClass : 'mt-1 flex flex-col gap-3'}>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-[#facc15] sm:text-sm">
            {t('dryFire.liveAnalysis.holdTitle')}
          </p>
          <div className="flex items-end gap-2">
            <p className="font-mono text-2xl font-bold tabular-nums tracking-tight text-app-text sm:text-3xl">
              {fmt(view.hold.holdQuality, 0)}
              <span className="ml-0.5 text-xs font-normal text-zinc-500">
                {t('dryFire.liveAnalysis.of100')}
              </span>
            </p>
            <div className="mb-1 h-1.5 flex-1 overflow-hidden rounded-sm bg-slate-800">
              <div
                className="h-full rounded-sm bg-[#facc15] transition-[width] duration-150"
                style={{ width: `${Math.max(0, Math.min(100, view.hold.holdQuality))}%` }}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Metric label={t('dryFire.liveAnalysis.rms')} value={fmt(view.hold.holdCombinedRms)} />
            <Metric label={t('dryFire.liveAnalysis.std')} value={fmt(view.hold.holdStdDev)} />
            <Metric label={t('dryFire.liveAnalysis.peak')} value={fmt(view.hold.holdMaxDev)} />
          </div>
          <AnalysisFeedbackBox
            className="mt-auto px-0"
            statusKey={holdFb.statusKey}
            tipKey={holdFb.tipKey}
            severity={holdFb.severity}
            params={holdFb.params}
          />
        </div>

        {/* Trace */}
        <div className={isDash ? cardClass : 'flex flex-col gap-3 border-t border-slate-800/80 pt-3'}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-[#facc15] sm:text-sm">
              {t('dryFire.liveAnalysis.traceTitle')}
            </p>
            <p className="font-mono text-xs tabular-nums text-zinc-400">
              {t('dryFire.liveAnalysis.tracePath', { n: fmt(view.trace.pathLength, 1) })}
            </p>
          </div>
          <ChartZoomFrame
            title={t('dryFire.liveAnalysis.traceTitle')}
            className="w-full shrink-0"
            bodyClassName="min-h-[11rem]"
            feedback={
              <AnalysisFeedbackBox
                statusKey={traceFb.statusKey}
                tipKey={traceFb.tipKey}
                severity={traceFb.severity}
                params={traceFb.params}
              />
            }
          >
            <div className="flex w-full flex-col p-1.5 sm:p-2">
              <MuzzleTracePlayer
                livePoints={view.trace.points}
                playback={view.trace.playback}
                isConnected={isConnected}
                className="w-full"
              />
            </div>
          </ChartZoomFrame>
          <div className="grid grid-cols-3 gap-2">
            <Metric label={t('dryFire.liveAnalysis.radius')} value={fmt(view.trace.traceRadius)} />
            <Metric label={t('dryFire.liveAnalysis.avg')} value={fmt(view.trace.traceAverage)} />
            <Metric label={t('dryFire.liveAnalysis.peak')} value={fmt(view.trace.tracePeak)} />
          </div>
        </div>

        {/* Shot event */}
        <div className={isDash ? cardClass : 'flex flex-col gap-3 border-t border-slate-800/80 pt-3'}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-[#facc15] sm:text-sm">
              {t('dryFire.liveAnalysis.shotTitle')}
            </p>
            <p className="font-mono text-xs uppercase tracking-wider text-zinc-400">
              {view.shot.capturingPost
                ? t('dryFire.liveAnalysis.shotCapturing')
                : view.shot.complete
                  ? t('dryFire.liveAnalysis.shotReady')
                  : view.shot.triggerTimestamp
                    ? t('dryFire.liveAnalysis.shotPartial')
                    : t('dryFire.liveAnalysis.shotIdle')}
            </p>
          </div>
          <ChartZoomFrame
            title={t('dryFire.liveAnalysis.shotTitle')}
            className="w-full shrink-0"
            bodyClassName="min-h-[9rem]"
            feedback={
              <AnalysisFeedbackBox
                statusKey={shotFb.statusKey}
                tipKey={shotFb.tipKey}
                severity={shotFb.severity}
                params={shotFb.params}
              />
            }
          >
            <canvas
              ref={canvasRef}
              width={480}
              height={200}
              className="h-[8.5rem] w-full bg-slate-950 sm:h-[9.5rem]"
              aria-hidden
            />
          </ChartZoomFrame>
          <div className="flex justify-between gap-2 font-mono text-xs uppercase tracking-wider text-zinc-400">
            <span className="text-sky-400">{t('dryFire.liveAnalysis.pre')}</span>
            <span className="text-red-400">{t('dryFire.liveAnalysis.trigger')}</span>
            <span className="text-orange-400">{t('dryFire.liveAnalysis.post')}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Metric label={t('dryFire.liveAnalysis.preSamples')} value={String(view.shot.preCount)} />
            <Metric
              label={t('dryFire.liveAnalysis.postSamples')}
              value={String(view.shot.postCount)}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * @param {{ label: string, value: string }} props
 */
function Metric({ label, value }) {
  return (
    <div className="min-w-0 rounded-sm border border-slate-700/80 bg-slate-950/80 px-2 py-1.5">
      <p className="truncate font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400 sm:text-xs">
        {label}
      </p>
      <p className="mt-0.5 truncate font-mono text-sm font-bold tabular-nums text-app-text">{value}</p>
    </div>
  )
}
