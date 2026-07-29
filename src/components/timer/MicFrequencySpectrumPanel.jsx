import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Mic, Radio } from 'lucide-react'
import {
  createMicSpectralState,
  estimateSpectralPeak,
  hzToLogNorm,
  MIC_SPECTRUM_F_MAX,
  MIC_SPECTRUM_F_MIN,
  setMicSpectralMode,
  tickMicSpectralFromAnalyser,
  tickMicSpectralFromLvl,
} from '../../lib/micSpectralEnvelope'

/** @typedef {'device' | 'browser'} MicSpectrumSource */

const NEON = {
  wave: '#39FF14',
  waveCore: 'rgba(200,255,180,0.95)',
  fillTop: 'rgba(57,255,20,0.35)',
  fillBot: 'rgba(57,255,20,0.02)',
  amber: '#FACC15',
  amberSoft: 'rgba(250,204,21,0.55)',
  peak: '#FF2D6A',
  peakSoft: 'rgba(255,45,106,0.5)',
  grid: 'rgba(57,255,20,0.1)',
  axis: 'rgba(250,204,21,0.45)',
  frame: 'rgba(57,255,20,0.45)',
  text: 'rgba(57,255,20,0.55)',
}

const HZ_MARKS = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000]
const DB_MARKS = [0, -10, -20, -30, -40, -50, -60]

/**
 * Sonarworks tarzı Frekans Tepki / Spektrum paneli (Canvas).
 * @param {{
 *   telemetryRef: import('react').MutableRefObject<{ lvl: number, fresh: boolean }>
 *   isConnected: boolean
 *   mode?: import('../../lib/micThresholdTestSettings').MicTestModeId
 *   threshold?: number
 *   className?: string
 * }} props
 */
export default function MicFrequencySpectrumPanel({
  telemetryRef,
  isConnected,
  mode = 'liveFire',
  threshold = 50,
  className = '',
}) {
  const { t } = useTranslation('timer')
  const canvasRef = useRef(/** @type {HTMLCanvasElement | null} */ (null))
  const wrapRef = useRef(/** @type {HTMLDivElement | null} */ (null))
  const stateRef = useRef(createMicSpectralState(mode))
  const sourceRef = useRef(/** @type {MicSpectrumSource} */ ('device'))
  const connectedRef = useRef(isConnected)
  const thresholdRef = useRef(threshold)

  const audioCtxRef = useRef(/** @type {AudioContext | null} */ (null))
  const analyserRef = useRef(/** @type {AnalyserNode | null} */ (null))
  const streamRef = useRef(/** @type {MediaStream | null} */ (null))
  const freqBytesRef = useRef(/** @type {Uint8Array | null} */ (null))

  const [source, setSource] = useState(/** @type {MicSpectrumSource} */ ('device'))
  const [browserError, setBrowserError] = useState(/** @type {string | null} */ (null))
  const [peakLabel, setPeakLabel] = useState({ hz: 0, db: -60 })

  useEffect(() => {
    connectedRef.current = isConnected
  }, [isConnected])

  useEffect(() => {
    thresholdRef.current = threshold
  }, [threshold])

  useEffect(() => {
    setMicSpectralMode(stateRef.current, mode)
  }, [mode])

  useEffect(() => {
    sourceRef.current = source
  }, [source])

  const stopBrowserMic = useCallback(() => {
    try {
      streamRef.current?.getTracks().forEach((tr) => tr.stop())
    } catch {
      /* ignore */
    }
    streamRef.current = null
    analyserRef.current = null
    freqBytesRef.current = null
    if (audioCtxRef.current) {
      void audioCtxRef.current.close().catch(() => {})
      audioCtxRef.current = null
    }
  }, [])

  const startBrowserMic = useCallback(async () => {
    setBrowserError(null)
    stopBrowserMic()
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
        video: false,
      })
      const Ctx =
        window.AudioContext ||
        /** @type {typeof AudioContext | undefined} */ (
          /** @type {unknown} */ (window).webkitAudioContext
        )
      if (!Ctx) {
        setBrowserError(t('micTest.spectrum.browserDenied'))
        setSource('device')
        return
      }
      const ctx = new Ctx()
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 2048
      analyser.smoothingTimeConstant = 0.65
      const src = ctx.createMediaStreamSource(stream)
      src.connect(analyser)
      streamRef.current = stream
      audioCtxRef.current = ctx
      analyserRef.current = analyser
      freqBytesRef.current = new Uint8Array(analyser.frequencyBinCount)
      setSource('browser')
    } catch {
      setBrowserError(t('micTest.spectrum.browserDenied'))
      setSource('device')
    }
  }, [stopBrowserMic, t])

  useEffect(() => {
    return () => stopBrowserMic()
  }, [stopBrowserMic])

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return undefined

    let raf = 0
    let dpr = 1
    let labelAcc = 0

    const resize = () => {
      const rect = wrap.getBoundingClientRect()
      dpr = Math.min(2, window.devicePixelRatio || 1)
      const w = Math.max(1, Math.floor(rect.width * dpr))
      const h = Math.max(1, Math.floor(rect.height * dpr))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
    }

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null
    if (ro) ro.observe(wrap)
    else window.addEventListener('resize', resize)
    resize()

    /**
     * @param {number} db 0…-60
     * @param {number} plotTop
     * @param {number} plotH
     */
    const dbToY = (db, plotTop, plotH) => plotTop + ((0 - db) / 60) * plotH

    /**
     * @param {number} energy 0…1 → approx dB
     */
    const energyToDb = (energy) => {
      const e = Math.max(1e-4, Math.min(1, energy))
      return Math.max(-60, Math.min(0, 20 * Math.log10(e)))
    }

    const paint = () => {
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const w = canvas.width
      const h = canvas.height
      const padL = 44 * dpr
      const padR = 14 * dpr
      const padT = 18 * dpr
      const padB = 28 * dpr
      const plotW = w - padL - padR
      const plotH = h - padT - padB
      const plotL = padL
      const plotT = padT

      // Backdrop
      ctx.fillStyle = '#05080f'
      ctx.fillRect(0, 0, w, h)

      // Dot field
      ctx.fillStyle = 'rgba(57,255,20,0.08)'
      const step = 12 * dpr
      for (let x = plotL; x < plotL + plotW; x += step) {
        for (let y = plotT; y < plotT + plotH; y += step) {
          ctx.fillRect(x, y, dpr * 0.7, dpr * 0.7)
        }
      }

      // Grid — Hz vertical
      ctx.strokeStyle = NEON.grid
      ctx.lineWidth = Math.max(1, 0.6 * dpr)
      for (const hz of HZ_MARKS) {
        const x = plotL + hzToLogNorm(hz) * plotW
        ctx.beginPath()
        ctx.moveTo(x, plotT)
        ctx.lineTo(x, plotT + plotH)
        ctx.stroke()
      }
      // Grid — dB horizontal
      for (const db of DB_MARKS) {
        const y = dbToY(db, plotT, plotH)
        ctx.beginPath()
        ctx.moveTo(plotL, y)
        ctx.lineTo(plotL + plotW, y)
        ctx.stroke()
      }

      // Corner brackets
      const L = 14 * dpr
      ctx.strokeStyle = NEON.frame
      ctx.lineWidth = Math.max(1.25, dpr)
      const corners = [
        [plotL, plotT, 1, 1],
        [plotL + plotW, plotT, -1, 1],
        [plotL, plotT + plotH, 1, -1],
        [plotL + plotW, plotT + plotH, -1, -1],
      ]
      for (const [x, y, sx, sy] of corners) {
        ctx.beginPath()
        ctx.moveTo(x, y + sy * L)
        ctx.lineTo(x, y)
        ctx.lineTo(x + sx * L, y)
        ctx.stroke()
      }

      const st = stateRef.current
      const n = st.bands.length

      // Instant bars (spectrum)
      const barW = plotW / n
      for (let i = 0; i < n; i++) {
        const db = energyToDb(st.bands[i])
        const y = dbToY(db, plotT, plotH)
        const hot = st.bands[i] >= thresholdRef.current / 100
        ctx.fillStyle = hot ? 'rgba(255,45,106,0.35)' : 'rgba(57,255,20,0.22)'
        ctx.fillRect(plotL + i * barW, y, Math.max(1, barW * 0.85), plotT + plotH - y)
      }

      // Peak hold (amber dashed)
      ctx.save()
      ctx.setLineDash([4 * dpr, 4 * dpr])
      ctx.strokeStyle = NEON.amberSoft
      ctx.lineWidth = Math.max(1, 0.9 * dpr)
      ctx.beginPath()
      for (let i = 0; i < n; i++) {
        const x = plotL + hzToLogNorm(st.freqs[i]) * plotW
        const y = dbToY(energyToDb(st.peakHold[i]), plotT, plotH)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
      ctx.restore()

      // Smooth FR curve fill (SoundID style)
      ctx.beginPath()
      for (let i = 0; i < n; i++) {
        const x = plotL + hzToLogNorm(st.freqs[i]) * plotW
        const y = dbToY(energyToDb(st.smooth[i]), plotT, plotH)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.lineTo(plotL + plotW, plotT + plotH)
      ctx.lineTo(plotL, plotT + plotH)
      ctx.closePath()
      const grad = ctx.createLinearGradient(0, plotT, 0, plotT + plotH)
      grad.addColorStop(0, NEON.fillTop)
      grad.addColorStop(1, NEON.fillBot)
      ctx.fillStyle = grad
      ctx.fill()

      // Smooth FR stroke + glow
      ctx.beginPath()
      for (let i = 0; i < n; i++) {
        const x = plotL + hzToLogNorm(st.freqs[i]) * plotW
        const y = dbToY(energyToDb(st.smooth[i]), plotT, plotH)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.save()
      ctx.shadowColor = NEON.wave
      ctx.shadowBlur = 12 * dpr
      ctx.strokeStyle = NEON.waveCore
      ctx.lineWidth = Math.max(2, 1.6 * dpr)
      ctx.lineJoin = 'round'
      ctx.stroke()
      ctx.shadowBlur = 0
      ctx.strokeStyle = 'rgba(255,255,220,0.85)'
      ctx.lineWidth = Math.max(1, 0.8 * dpr)
      ctx.stroke()
      ctx.restore()

      // Threshold line — map 0–100 UI threshold onto −60…0 dB scale
      const thrY = dbToY(-60 + (Math.min(100, Math.max(0, thresholdRef.current)) / 100) * 60, plotT, plotH)
      ctx.save()
      ctx.setLineDash([6 * dpr, 4 * dpr])
      ctx.shadowColor = NEON.peak
      ctx.shadowBlur = 8 * dpr
      ctx.strokeStyle = NEON.peakSoft
      ctx.lineWidth = Math.max(1.25, dpr)
      ctx.beginPath()
      ctx.moveTo(plotL, thrY)
      ctx.lineTo(plotL + plotW, thrY)
      ctx.stroke()
      ctx.restore()

      // Axis labels
      ctx.fillStyle = NEON.text
      ctx.font = `${Math.max(8, 8 * dpr)}px ui-monospace, monospace`
      ctx.textAlign = 'center'
      for (const hz of [100, 1000, 10000]) {
        const x = plotL + hzToLogNorm(hz) * plotW
        const label = hz >= 1000 ? `${hz / 1000}k` : String(hz)
        ctx.fillText(label, x, h - 8 * dpr)
      }
      ctx.textAlign = 'right'
      for (const db of [0, -20, -40, -60]) {
        const y = dbToY(db, plotT, plotH)
        ctx.fillText(`${db}`, plotL - 6 * dpr, y + 3 * dpr)
      }

      // Axis titles
      ctx.fillStyle = NEON.axis
      ctx.textAlign = 'left'
      ctx.fillText('dB', 6 * dpr, plotT + 8 * dpr)
      ctx.textAlign = 'right'
      ctx.fillText('Hz', w - 6 * dpr, h - 8 * dpr)
    }

    const tick = () => {
      const st = stateRef.current
      if (sourceRef.current === 'browser' && analyserRef.current && freqBytesRef.current && audioCtxRef.current) {
        analyserRef.current.getByteFrequencyData(freqBytesRef.current)
        tickMicSpectralFromAnalyser(
          st,
          freqBytesRef.current,
          audioCtxRef.current.sampleRate,
        )
      } else {
        const snap = telemetryRef.current
        const lvl =
          connectedRef.current && snap?.fresh
            ? Math.min(100, Math.max(0, Number(snap.lvl) || 0))
            : 0
        tickMicSpectralFromLvl(st, lvl)
      }

      paint()

      labelAcc += 1
      if (labelAcc >= 8) {
        labelAcc = 0
        const peak = estimateSpectralPeak(st.smooth)
        setPeakLabel({ hz: Math.round(peak.peakHz), db: Math.round(peak.peakDb) })
      }

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      if (ro) ro.disconnect()
      else window.removeEventListener('resize', resize)
    }
  }, [telemetryRef])

  const selectDevice = () => {
    stopBrowserMic()
    setBrowserError(null)
    setSource('device')
  }

  const selectBrowser = () => {
    void startBrowserMic()
  }

  return (
    <section
      className={[
        'flex w-full min-w-0 flex-col gap-2 rounded-sm border border-[#39FF14]/25 bg-[#05080f] p-3 shadow-[0_0_24px_-10px_rgba(57,255,20,0.3)]',
        className,
      ].join(' ')}
      aria-label={t('micTest.spectrum.aria')}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.22em] text-[#39FF14]/80">
            {t('micTest.spectrum.kicker')}
          </p>
          <p className="mt-0.5 font-mono-technical text-[11px] font-bold uppercase tracking-[0.12em] text-[#FACC15]">
            {t('micTest.spectrum.title')}
          </p>
          <p className="mt-1 max-w-xl font-mono-technical text-[8px] leading-relaxed text-app-text/45">
            {source === 'browser'
              ? t('micTest.spectrum.hintBrowser')
              : t('micTest.spectrum.hintDevice')}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex flex-wrap justify-end gap-1.5">
            <button
              type="button"
              onClick={selectDevice}
              className={[
                'inline-flex items-center gap-1 rounded-sm border px-2.5 py-1.5 font-mono-technical text-[8px] font-bold uppercase tracking-[0.14em] transition',
                source === 'device'
                  ? 'border-[#39FF14]/55 bg-[#39FF14]/12 text-[#39FF14]'
                  : 'border-zinc-700/70 text-zinc-500 hover:border-zinc-500',
              ].join(' ')}
            >
              <Radio className="size-3" strokeWidth={1.5} aria-hidden />
              {t('micTest.spectrum.sourceDevice')}
            </button>
            <button
              type="button"
              onClick={selectBrowser}
              className={[
                'inline-flex items-center gap-1 rounded-sm border px-2.5 py-1.5 font-mono-technical text-[8px] font-bold uppercase tracking-[0.14em] transition',
                source === 'browser'
                  ? 'border-[#FACC15]/55 bg-[#FACC15]/12 text-[#FACC15]'
                  : 'border-zinc-700/70 text-zinc-500 hover:border-zinc-500',
              ].join(' ')}
            >
              <Mic className="size-3" strokeWidth={1.5} aria-hidden />
              {t('micTest.spectrum.sourceBrowser')}
            </button>
          </div>
          <p className="font-mono-technical text-[9px] tabular-nums text-[#39FF14]/85">
            {t('micTest.spectrum.peak', {
              hz:
                peakLabel.hz >= 1000
                  ? `${(peakLabel.hz / 1000).toFixed(1)}k`
                  : String(peakLabel.hz),
              db: peakLabel.db,
            })}
          </p>
        </div>
      </div>

      {browserError ? (
        <p className="font-mono-technical text-[8px] text-rose-300/90">{browserError}</p>
      ) : null}

      <div
        ref={wrapRef}
        className="relative h-[240px] w-full overflow-hidden rounded-sm border border-[#39FF14]/15 sm:h-[300px]"
      >
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden />
        {source === 'device' && !isConnected ? (
          <div className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center bg-black/50">
            <p className="px-4 text-center font-mono-technical text-[9px] uppercase tracking-[0.18em] text-[#39FF14]/40">
              {t('micTest.spectrum.awaiting')}
            </p>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-3 font-mono-technical text-[7px] uppercase tracking-[0.16em] text-zinc-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-sm bg-[#39FF14]" aria-hidden />
          {t('micTest.spectrum.legendFr')}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-sm bg-[#FACC15]/70" aria-hidden />
          {t('micTest.spectrum.legendPeak')}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-sm bg-[#FF2D6A]/80" aria-hidden />
          {t('micTest.spectrum.legendThr')}
        </span>
        <span className="ml-auto text-zinc-600">
          {MIC_SPECTRUM_F_MIN}–{MIC_SPECTRUM_F_MAX / 1000}k Hz · 64 band
        </span>
      </div>
    </section>
  )
}
