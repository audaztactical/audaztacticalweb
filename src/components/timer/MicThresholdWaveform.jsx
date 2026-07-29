import { useEffect, useRef } from 'react'

/** @typedef {'line' | 'bars' | 'mirror' | 'dots' | 'heatmap' | 'pulse'} MicWaveStyle */

/** @type {readonly MicWaveStyle[]} */
export const MIC_WAVE_STYLES = Object.freeze([
  'line',
  'bars',
  'mirror',
  'dots',
  'heatmap',
  'pulse',
])

/**
 * Fosfor neon — cyan'dan daha yüksek kontrast (okunabilirlik + HUD).
 * Safe: #39FF14 / #00FF88 · Peak: #FF2D6A · Threshold: #FFB800
 */
const NEON = {
  wave: '#39FF14',
  waveSoft: 'rgba(57,255,20,0.22)',
  waveCore: 'rgba(200,255,180,0.95)',
  peak: '#FF2D6A',
  peakSoft: 'rgba(255,45,106,0.28)',
  peakCore: 'rgba(255,180,200,0.95)',
  thr: '#FFB800',
  thrSoft: 'rgba(255,184,0,0.85)',
  grid: 'rgba(57,255,20,0.07)',
  dots: 'rgba(57,255,20,0.14)',
  frame: 'rgba(57,255,20,0.55)',
  frameDim: 'rgba(57,255,20,0.28)',
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} w
 * @param {number} h
 * @param {number} dpr
 */
function drawHudBackdrop(ctx, w, h, dpr) {
  // Deep navy
  ctx.fillStyle = '#05080f'
  ctx.fillRect(0, 0, w, h)

  // Dot grid
  const step = 10 * dpr
  ctx.fillStyle = NEON.dots
  for (let x = step; x < w; x += step) {
    for (let y = step; y < h; y += step) {
      ctx.fillRect(x, y, Math.max(1, dpr * 0.7), Math.max(1, dpr * 0.7))
    }
  }

  // Horizontal guide lines
  ctx.strokeStyle = NEON.grid
  ctx.lineWidth = Math.max(1, dpr * 0.5)
  ctx.setLineDash([3 * dpr, 5 * dpr])
  for (let i = 1; i < 10; i++) {
    const y = (h * i) / 10
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(w, y)
    ctx.stroke()
  }
  ctx.setLineDash([])

  // Corner brackets
  const L = 18 * dpr
  const m = 8 * dpr
  ctx.strokeStyle = NEON.frame
  ctx.lineWidth = Math.max(1.5, 1.25 * dpr)
  const corners = [
    [m, m, 1, 1],
    [w - m, m, -1, 1],
    [m, h - m, 1, -1],
    [w - m, h - m, -1, -1],
  ]
  for (const [x, y, sx, sy] of corners) {
    ctx.beginPath()
    ctx.moveTo(x, y + sy * L)
    ctx.lineTo(x, y)
    ctx.lineTo(x + sx * L, y)
    ctx.stroke()
  }

  // Left micro VU ticks
  ctx.fillStyle = NEON.frameDim
  for (let i = 0; i < 8; i++) {
    const bh = (4 + (i % 3) * 3) * dpr
    ctx.fillRect(m * 0.35, h - m - (i + 1) * 7 * dpr, (6 + (i % 2) * 4) * dpr, bh)
  }

  // Bottom hazard strip
  const stripY = h - 5 * dpr
  const stripH = 3 * dpr
  ctx.save()
  ctx.beginPath()
  ctx.rect(w * 0.35, stripY, w * 0.3, stripH)
  ctx.clip()
  for (let x = w * 0.35; x < w * 0.65; x += 8 * dpr) {
    ctx.fillStyle = NEON.frame
    ctx.beginPath()
    ctx.moveTo(x, stripY + stripH)
    ctx.lineTo(x + 4 * dpr, stripY + stripH)
    ctx.lineTo(x + 8 * dpr, stripY)
    ctx.lineTo(x + 4 * dpr, stripY)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} w
 * @param {number} h
 * @param {number} thr
 * @param {number} dpr
 * @param {'bottom' | 'center'} mode
 */
function drawThreshold(ctx, w, h, thr, dpr, mode) {
  const thrY =
    mode === 'center' ? h / 2 - ((thr / 100) * h) / 2 : h - (thr / 100) * h
  ctx.save()
  ctx.shadowColor = NEON.thr
  ctx.shadowBlur = 10 * dpr
  ctx.strokeStyle = NEON.thrSoft
  ctx.lineWidth = Math.max(1.5, 1.25 * dpr)
  ctx.setLineDash([6 * dpr, 4 * dpr])
  ctx.beginPath()
  ctx.moveTo(10 * dpr, thrY)
  ctx.lineTo(w - 10 * dpr, thrY)
  if (mode === 'center') {
    const thrY2 = h / 2 + ((thr / 100) * h) / 2
    ctx.moveTo(10 * dpr, thrY2)
    ctx.lineTo(w - 10 * dpr, thrY2)
  }
  ctx.stroke()
  ctx.restore()
}

/**
 * @param {Float32Array} buf
 * @param {number} start
 * @param {number} n
 * @param {number} capacity
 * @param {(i: number, v: number) => void} fn
 */
function forEachSample(buf, start, n, capacity, fn) {
  for (let i = 0; i < n; i++) {
    fn(i, buf[(start + i) % capacity])
  }
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {boolean} above
 * @param {number} dpr
 * @param {'stroke' | 'fill'} kind
 */
function applyNeon(ctx, above, dpr, kind = 'stroke') {
  const color = above ? NEON.peak : NEON.wave
  ctx.shadowColor = color
  ctx.shadowBlur = (kind === 'stroke' ? 14 : 18) * dpr
  if (kind === 'stroke') {
    ctx.strokeStyle = above ? NEON.peakCore : NEON.waveCore
  } else {
    ctx.fillStyle = above ? NEON.peakSoft : NEON.waveSoft
  }
}

/**
 * Canlı akustik dalga — fosfor neon HUD stilleri.
 * @param {{
 *   telemetryRef: import('react').MutableRefObject<{ lvl: number, fresh: boolean }>
 *   threshold: number
 *   isConnected: boolean
 *   style?: MicWaveStyle
 *   className?: string
 *   onCross?: (lvl: number, at: number) => void
 * }} props
 */
export default function MicThresholdWaveform({
  telemetryRef,
  threshold,
  isConnected,
  style = 'line',
  className = '',
  onCross,
}) {
  const canvasRef = useRef(/** @type {HTMLCanvasElement | null} */ (null))
  const wrapRef = useRef(/** @type {HTMLDivElement | null} */ (null))
  const samplesRef = useRef(/** @type {Float32Array | null} */ (null))
  const writeRef = useRef(0)
  const filledRef = useRef(0)
  const peakHoldRef = useRef(0)
  const lastCrossRef = useRef(0)
  const wasAboveRef = useRef(false)
  const thresholdRef = useRef(threshold)
  const connectedRef = useRef(isConnected)
  const onCrossRef = useRef(onCross)
  const styleRef = useRef(/** @type {MicWaveStyle} */ (style))

  useEffect(() => {
    thresholdRef.current = threshold
  }, [threshold])

  useEffect(() => {
    connectedRef.current = isConnected
  }, [isConnected])

  useEffect(() => {
    onCrossRef.current = onCross
  }, [onCross])

  useEffect(() => {
    styleRef.current = style
  }, [style])

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return undefined

    const CAPACITY = 480
    samplesRef.current = new Float32Array(CAPACITY)
    writeRef.current = 0
    filledRef.current = 0
    peakHoldRef.current = 0

    let raf = 0
    let dpr = 1

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
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} w
     * @param {number} h
     * @param {Float32Array} buf
     * @param {number} start
     * @param {number} n
     * @param {boolean} above
     * @param {number} thr
     * @param {number} liveLvl
     */
    const paint = (ctx, w, h, buf, start, n, above, thr, liveLvl) => {
      drawHudBackdrop(ctx, w, h, dpr)
      const mode = styleRef.current

      if (mode === 'pulse') {
        const cx = w / 2
        const cy = h / 2
        const R = Math.min(w, h) * 0.38
        ctx.strokeStyle = NEON.frameDim
        ctx.lineWidth = Math.max(1, dpr)
        for (const r of [0.35, 0.65, 1]) {
          ctx.beginPath()
          ctx.arc(cx, cy, R * r, 0, Math.PI * 2)
          ctx.stroke()
        }

        ctx.save()
        ctx.shadowColor = NEON.thr
        ctx.shadowBlur = 12 * dpr
        ctx.strokeStyle = NEON.thrSoft
        ctx.setLineDash([5 * dpr, 4 * dpr])
        ctx.beginPath()
        ctx.arc(cx, cy, R * (thr / 100), 0, Math.PI * 2)
        ctx.stroke()
        ctx.restore()

        peakHoldRef.current = Math.max(liveLvl, peakHoldRef.current * 0.985)
        const liveR = R * (liveLvl / 100)
        const peakR = R * (peakHoldRef.current / 100)

        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(1, liveR))
        grad.addColorStop(0, above ? 'rgba(255,45,106,0.65)' : 'rgba(57,255,20,0.55)')
        grad.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(cx, cy, Math.max(2 * dpr, liveR), 0, Math.PI * 2)
        ctx.fill()

        ctx.save()
        applyNeon(ctx, above, dpr, 'stroke')
        ctx.lineWidth = Math.max(2.5, 2 * dpr)
        ctx.beginPath()
        ctx.arc(cx, cy, Math.max(2 * dpr, liveR), 0, Math.PI * 2)
        ctx.stroke()
        ctx.restore()

        ctx.strokeStyle = 'rgba(255,255,255,0.4)'
        ctx.lineWidth = Math.max(1, dpr)
        ctx.beginPath()
        ctx.arc(cx, cy, Math.max(2 * dpr, peakR), 0, Math.PI * 2)
        ctx.stroke()
        return
      }

      drawThreshold(ctx, w, h, thr, dpr, mode === 'mirror' ? 'center' : 'bottom')
      if (n < 2) return

      if (mode === 'line') {
        ctx.beginPath()
        forEachSample(buf, start, n, CAPACITY, (i, v) => {
          const x = (i / (n - 1)) * w
          const y = h - (v / 100) * h
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        })
        ctx.save()
        applyNeon(ctx, above, dpr, 'fill')
        ctx.lineTo(w, h)
        ctx.lineTo(0, h)
        ctx.closePath()
        ctx.fill()
        ctx.restore()

        ctx.beginPath()
        forEachSample(buf, start, n, CAPACITY, (i, v) => {
          const x = (i / (n - 1)) * w
          const y = h - (v / 100) * h
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        })
        ctx.save()
        applyNeon(ctx, above, dpr, 'stroke')
        ctx.lineWidth = Math.max(2, 1.75 * dpr)
        ctx.lineJoin = 'round'
        ctx.stroke()
        // Core thin white-green edge
        ctx.shadowBlur = 0
        ctx.strokeStyle = above ? 'rgba(255,220,230,0.9)' : 'rgba(220,255,210,0.95)'
        ctx.lineWidth = Math.max(1, 0.85 * dpr)
        ctx.stroke()
        ctx.restore()
        return
      }

      if (mode === 'bars') {
        const barW = Math.max(1, w / n)
        forEachSample(buf, start, n, CAPACITY, (i, v) => {
          const bh = (v / 100) * h
          const x = i * barW
          const hot = v >= thr && thr > 0
          ctx.save()
          ctx.shadowColor = hot ? NEON.peak : NEON.wave
          ctx.shadowBlur = 8 * dpr
          ctx.fillStyle = hot ? NEON.peak : NEON.wave
          ctx.globalAlpha = 0.75
          ctx.fillRect(x, h - bh, Math.max(1, barW * 0.7), bh)
          ctx.restore()
        })
        return
      }

      if (mode === 'mirror') {
        const mid = h / 2
        ctx.beginPath()
        forEachSample(buf, start, n, CAPACITY, (i, v) => {
          const x = (i / (n - 1)) * w
          const y = mid - ((v / 100) * h) / 2
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        })
        for (let i = n - 1; i >= 0; i--) {
          const v = buf[(start + i) % CAPACITY]
          const x = (i / (n - 1)) * w
          const y = mid + ((v / 100) * h) / 2
          ctx.lineTo(x, y)
        }
        ctx.closePath()
        ctx.save()
        applyNeon(ctx, above, dpr, 'fill')
        ctx.fill()
        applyNeon(ctx, above, dpr, 'stroke')
        ctx.lineWidth = Math.max(1.75, 1.4 * dpr)
        ctx.stroke()
        ctx.restore()

        ctx.strokeStyle = 'rgba(255,255,255,0.14)'
        ctx.beginPath()
        ctx.moveTo(0, mid)
        ctx.lineTo(w, mid)
        ctx.stroke()
        return
      }

      if (mode === 'dots') {
        forEachSample(buf, start, n, CAPACITY, (i, v) => {
          const x = (i / (n - 1)) * w
          const y = h - (v / 100) * h
          const hot = v >= thr && thr > 0
          ctx.save()
          ctx.shadowColor = hot ? NEON.peak : NEON.wave
          ctx.shadowBlur = 10 * dpr
          ctx.fillStyle = hot ? NEON.peak : NEON.wave
          ctx.beginPath()
          ctx.arc(x, y, hot ? 2.6 * dpr : 1.8 * dpr, 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()
        })
        ctx.beginPath()
        forEachSample(buf, start, n, CAPACITY, (i, v) => {
          const x = (i / (n - 1)) * w
          const y = h - (v / 100) * h
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        })
        ctx.strokeStyle = 'rgba(57,255,20,0.25)'
        ctx.lineWidth = Math.max(1, dpr * 0.75)
        ctx.stroke()
        return
      }

      if (mode === 'heatmap') {
        const colW = Math.max(1, w / n)
        forEachSample(buf, start, n, CAPACITY, (i, v) => {
          const t = v / 100
          const hot = v >= thr && thr > 0
          // Lime → amber → hot pink scale (cyan yok)
          const r = hot ? 255 : Math.round(20 + t * 60)
          const g = hot ? 45 : Math.round(180 + t * 75)
          const b = hot ? 106 : Math.round(20 + (1 - t) * 30)
          ctx.fillStyle = `rgba(${r},${g},${b},${0.25 + t * 0.65})`
          ctx.fillRect(i * colW, 0, Math.ceil(colW) + 1, h)
          const y = h - t * h
          ctx.fillStyle = hot ? NEON.peakCore : NEON.waveCore
          ctx.fillRect(i * colW, y - dpr, Math.max(1, colW * 0.9), Math.max(1, 2 * dpr))
        })
      }
    }

    const tick = () => {
      const snap = telemetryRef.current
      const lvl =
        connectedRef.current && snap?.fresh
          ? Math.min(100, Math.max(0, Number(snap.lvl) || 0))
          : 0

      const buf = samplesRef.current
      if (buf) {
        buf[writeRef.current] = lvl
        writeRef.current = (writeRef.current + 1) % CAPACITY
        if (filledRef.current < CAPACITY) filledRef.current += 1
      }

      const thr = Math.min(100, Math.max(0, Number(thresholdRef.current) || 0))
      const above = lvl >= thr && thr > 0
      if (above && !wasAboveRef.current) {
        const now = performance.now()
        if (now - lastCrossRef.current > 120) {
          lastCrossRef.current = now
          onCrossRef.current?.(lvl, Date.now())
        }
      }
      wasAboveRef.current = above

      const ctx = canvas.getContext('2d')
      if (ctx && buf) {
        const n = filledRef.current
        const start = filledRef.current < CAPACITY ? 0 : writeRef.current
        paint(ctx, canvas.width, canvas.height, buf, start, n, above, thr, lvl)
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

  const showScale = style !== 'pulse'

  return (
    <div
      ref={wrapRef}
      className={[
        'relative h-[220px] w-full overflow-hidden rounded-sm border border-[#39FF14]/25 bg-[#05080f] shadow-[0_0_24px_-8px_rgba(57,255,20,0.35)] sm:h-[280px]',
        className,
      ].join(' ')}
    >
      {showScale ? (
        <div className="pointer-events-none absolute left-2 top-2 z-[1] flex flex-col gap-0.5 font-mono-technical text-[8px] uppercase tracking-[0.16em] text-[#39FF14]/55">
          {[100, 80, 60, 40, 20, 0].map((v) => (
            <span key={v} className="leading-none tabular-nums">
              {(v / 100).toFixed(1)}
            </span>
          ))}
        </div>
      ) : null}
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden />
      {!isConnected ? (
        <div className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center bg-black/55">
          <p className="px-4 text-center font-mono-technical text-[9px] uppercase tracking-[0.2em] text-[#39FF14]/45">
            Donanım bekleniyor — dalga formu için bağlanın
          </p>
        </div>
      ) : null}
    </div>
  )
}
