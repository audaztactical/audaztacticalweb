import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Crosshair } from 'lucide-react'
import { useHardware } from '../../context/HardwareContext'

/** @typedef {'idle' | 'locking' | 'locked'} MpuCalPhase */

/**
 * @param {number} min
 * @param {number} max
 * @param {number} n
 */
function clamp(min, max, n) {
  return Math.min(max, Math.max(min, n))
}

/**
 * @param {string} [range]
 */
function gForceFullScale(range) {
  const m = String(range ?? '').match(/(\d+)/)
  const n = m ? Number(m[1]) : 8
  return Number.isFinite(n) && n > 0 ? n : 8
}

/**
 * @param {number} value
 * @param {number} zero
 * @param {number} fullScale
 */
function residualToPlane(value, zero, fullScale) {
  const sens = Math.max(0.5, fullScale * 0.5)
  return clamp(-1, 1, (value - zero) / sens)
}

/**
 * MPU hedef — rAF doğrudan telemetryRef okur; yaw ile nişangah döner.
 * @param {{
 *   offsetX?: number
 *   offsetY?: number
 *   offsetYaw?: number
 *   gForceRange?: string
 *   onZeroPointCommit?: (offset: { x: number, y: number, yaw: number }) => void
 *   onSuccess?: () => void
 *   preview?: boolean  Dry Fire önizleme: ham veri + kalibre butonu yok
 * }} props
 */
export default function MpuCalibrationTarget({
  offsetX = 0,
  offsetY = 0,
  offsetYaw = 0,
  gForceRange = '±8G',
  onZeroPointCommit,
  onSuccess,
  preview = false,
}) {
  const { t } = useTranslation('timer')
  const { isConnected, telemetryRef, sendCommand } = useHardware()

  const [phase, setPhase] = useState(/** @type {MpuCalPhase} */ ('idle'))

  const phaseRef = useRef(phase)
  const zeroOffsetRef = useRef({ x: offsetX, y: offsetY, yaw: offsetYaw })
  const displayRef = useRef({ x: 0, y: 0 })
  const liveAxAyRef = useRef({ x: 0, y: 0, yaw: 0 })
  const lockFromRef = useRef({ x: 0, y: 0 })
  const lockStartRef = useRef(0)
  const fullScaleRef = useRef(gForceFullScale(gForceRange))
  const isConnectedRef = useRef(isConnected)
  const onZeroPointCommitRef = useRef(onZeroPointCommit)
  const onSuccessRef = useRef(onSuccess)
  const lastDrawnSeqRef = useRef(-1)
  const lastLabelMsRef = useRef(0)

  const dotRef = useRef(/** @type {HTMLSpanElement | null} */ (null))
  const reticleRef = useRef(/** @type {SVGSVGElement | null} */ (null))
  const axLabelRef = useRef(/** @type {HTMLParagraphElement | null} */ (null))
  const ayLabelRef = useRef(/** @type {HTMLParagraphElement | null} */ (null))
  const yawLabelRef = useRef(/** @type {HTMLParagraphElement | null} */ (null))
  const waitHwRef = useRef(/** @type {HTMLDivElement | null} */ (null))
  const waitTelRef = useRef(/** @type {HTMLDivElement | null} */ (null))
  const lockOverlayRef = useRef(/** @type {HTMLDivElement | null} */ (null))
  const lockedBadgeRef = useRef(/** @type {HTMLDivElement | null} */ (null))

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  useEffect(() => {
    zeroOffsetRef.current = { x: offsetX, y: offsetY, yaw: offsetYaw }
  }, [offsetX, offsetY, offsetYaw])

  useEffect(() => {
    fullScaleRef.current = gForceFullScale(gForceRange)
  }, [gForceRange])

  useEffect(() => {
    isConnectedRef.current = isConnected
  }, [isConnected])

  useEffect(() => {
    onZeroPointCommitRef.current = onZeroPointCommit
  }, [onZeroPointCommit])

  useEffect(() => {
    onSuccessRef.current = onSuccess
  }, [onSuccess])

  /**
   * Tek rAF döngüsü: ax/ay nokta + yaw ile nişangah rotasyonu.
   */
  useEffect(() => {
    let raf = 0
    let lockedUntil = 0

    const paintDot = (dx, dy) => {
      displayRef.current = { x: dx, y: dy }
      const el = dotRef.current
      if (!el) return
      el.style.left = `${50 + dx * 42}%`
      el.style.top = `${50 + dy * 42}%`
    }

    const paintYaw = (yawDeg) => {
      const el = reticleRef.current
      if (!el) return
      el.style.transform = `rotate(${yawDeg}deg)`
    }

    const paintLabels = (ax, ay, yaw, now) => {
      if (now - lastLabelMsRef.current < 33) return
      lastLabelMsRef.current = now
      if (axLabelRef.current) axLabelRef.current.textContent = ax.toFixed(3)
      if (ayLabelRef.current) ayLabelRef.current.textContent = ay.toFixed(3)
      if (yawLabelRef.current) yawLabelRef.current.textContent = `${yaw.toFixed(1)}°`
    }

    const setVisible = (/** @type {HTMLElement | null} */ el, on) => {
      if (!el) return
      el.style.display = on ? '' : 'none'
    }

    const tick = (now) => {
      const connected = isConnectedRef.current
      const snap = telemetryRef.current
      const p = phaseRef.current

      setVisible(waitHwRef.current, !connected)
      setVisible(waitTelRef.current, connected && !snap.fresh)
      setVisible(lockOverlayRef.current, p === 'locking')
      setVisible(lockedBadgeRef.current, p === 'locked')

      if (p === 'locking') {
        const elapsed = now - lockStartRef.current
        const dur = 500
        const reduceMotion =
          typeof window !== 'undefined' &&
          window.matchMedia('(prefers-reduced-motion: reduce)').matches
        const u = reduceMotion ? 1 : clamp(0, 1, elapsed / dur)
        const ease = reduceMotion ? 1 : 1 - (1 - u) ** 3
        const from = lockFromRef.current
        paintDot(from.x * (1 - ease), from.y * (1 - ease))
        paintYaw(0)
        if (u >= 1) {
          paintDot(0, 0)
          paintYaw(0)
          phaseRef.current = 'locked'
          setPhase('locked')
          lockedUntil = now + 1400
          onSuccessRef.current?.()
        }
        raf = requestAnimationFrame(tick)
        return
      }

      if (p === 'locked') {
        paintDot(0, 0)
        paintYaw(0)
        if (now >= lockedUntil) {
          phaseRef.current = 'idle'
          setPhase('idle')
        }
        raf = requestAnimationFrame(tick)
        return
      }

      if (!connected || !snap.fresh) {
        liveAxAyRef.current = { x: 0, y: 0, yaw: 0 }
        paintDot(0, 0)
        paintYaw(0)
        paintLabels(0, 0, 0, now)
        lastDrawnSeqRef.current = snap.seq
        raf = requestAnimationFrame(tick)
        return
      }

      const ax = snap.ax
      const ay = snap.ay
      const yawRaw = Number.isFinite(snap.yaw) ? snap.yaw : 0
      const off = zeroOffsetRef.current
      let yawRel = yawRaw - (off.yaw || 0)
      while (yawRel > 180) yawRel -= 360
      while (yawRel < -180) yawRel += 360

      liveAxAyRef.current = { x: ax, y: ay, yaw: yawRaw }
      paintLabels(ax, ay, yawRel, now)
      lastDrawnSeqRef.current = snap.seq
      const fs = fullScaleRef.current
      paintDot(residualToPlane(ax, off.x, fs), residualToPlane(ay, off.y, fs))
      paintYaw(yawRel)

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [telemetryRef])

  const startCalibration = useCallback(() => {
    if (phaseRef.current === 'locking') return

    const sample = {
      x: liveAxAyRef.current.x,
      y: liveAxAyRef.current.y,
      // Firmware YAW_RESET sonrası yaw=0 → ofset de 0
      yaw: 0,
    }
    zeroOffsetRef.current = sample
    onZeroPointCommitRef.current?.(sample)
    void sendCommand('YAW_RESET')

    lockFromRef.current = { ...displayRef.current }
    lockStartRef.current = performance.now()
    phaseRef.current = 'locking'
    setPhase('locking')
  }, [sendCommand])

  const isBusy = phase === 'locking'

  return (
    <div className="flex flex-col gap-3">
      <div
        className="relative mx-auto aspect-square w-full max-w-[min(100%,20rem)] overflow-hidden rounded-sm border border-zinc-600/70 bg-[#0a0a0b] shadow-[inset_0_0_0_1px_rgba(250,204,21,0.08),inset_0_1px_0_rgba(255,255,255,0.04)]"
        role="img"
        aria-label={t('calibration.mpu.targetAria')}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(250,204,21,0.07) 1px, transparent 1px), linear-gradient(to bottom, rgba(250,204,21,0.07) 1px, transparent 1px)',
            backgroundSize: '12px 12px',
          }}
          aria-hidden
        />

        <svg
          ref={reticleRef}
          viewBox="0 0 200 200"
          className="absolute inset-0 h-full w-full origin-center will-change-transform"
          style={{ transform: 'rotate(0deg)' }}
          aria-hidden
        >
          {[92, 74, 56, 38, 22].map((r) => (
            <circle
              key={r}
              cx="100"
              cy="100"
              r={r}
              fill="none"
              stroke="rgba(250,204,21,0.22)"
              strokeWidth={r === 22 ? 1.25 : 0.75}
            />
          ))}
          <circle cx="100" cy="100" r="6" fill="none" stroke="#facc15" strokeWidth="1.4" opacity="0.85" />
          <circle cx="100" cy="100" r="2.2" fill="#facc15" opacity="0.55" />
          <line x1="100" y1="8" x2="100" y2="192" stroke="rgba(250,204,21,0.45)" strokeWidth="0.9" />
          <line x1="8" y1="100" x2="192" y2="100" stroke="rgba(250,204,21,0.45)" strokeWidth="0.9" />
          {/* Yaw yön işareti (üst) */}
          <polygon points="100,12 96,22 104,22" fill="#facc15" opacity="0.9" />
          {[20, 40, 60, 80, 120, 140, 160, 180].map((v) => (
            <g key={v}>
              <line x1={v} y1="96" x2={v} y2="104" stroke="rgba(250,204,21,0.35)" strokeWidth="0.7" />
              <line x1="96" y1={v} x2="104" y2={v} stroke="rgba(250,204,21,0.35)" strokeWidth="0.7" />
            </g>
          ))}
        </svg>

        <span
          ref={dotRef}
          className="pointer-events-none absolute z-10 block size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#facc15]/90 bg-[#facc15] will-change-[left,top]"
          style={{
            left: '50%',
            top: '50%',
            boxShadow: '0 0 10px 2px rgba(250,204,21,0.75), 0 0 18px 4px rgba(250,204,21,0.25)',
          }}
          aria-hidden
        />

        <div
          ref={waitHwRef}
          className="pointer-events-none absolute inset-x-0 top-2 z-20 flex justify-center px-2"
          style={{ display: isConnected ? 'none' : undefined }}
        >
          <p className="rounded-sm border border-zinc-600/50 bg-black/70 px-2 py-1 font-mono-technical text-[7px] uppercase tracking-[0.18em] text-zinc-500">
            {t('calibration.mpu.awaitingHardware')}
          </p>
        </div>

        <div
          ref={waitTelRef}
          className="pointer-events-none absolute inset-x-0 top-2 z-20 flex justify-center px-2"
          style={{ display: 'none' }}
        >
          <p className="rounded-sm border border-zinc-600/50 bg-black/70 px-2 py-1 font-mono-technical text-[7px] uppercase tracking-[0.18em] text-zinc-500">
            {t('calibration.mpu.awaitingTelemetry')}
          </p>
        </div>

        <div
          ref={lockOverlayRef}
          className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
          style={{ display: 'none' }}
        >
          <p className="rounded-sm border border-[#facc15]/40 bg-black/70 px-3 py-1.5 font-mono-technical text-[9px] font-bold uppercase tracking-[0.28em] text-[#facc15]">
            {t('calibration.mpu.locking')}
          </p>
        </div>

        <div
          ref={lockedBadgeRef}
          className="pointer-events-none absolute bottom-2 left-1/2 z-20 -translate-x-1/2"
          style={{ display: 'none' }}
        >
          <p className="rounded-sm border border-[#facc15]/35 bg-black/75 px-2.5 py-1 font-mono-technical text-[8px] font-bold uppercase tracking-[0.22em] text-[#facc15]">
            {t('calibration.mpu.zeroed')}
          </p>
        </div>

        <span className="pointer-events-none absolute left-1.5 top-1.5 z-[5] h-2.5 w-2.5 border-l border-t border-[#facc15]/50" />
        <span className="pointer-events-none absolute right-1.5 top-1.5 z-[5] h-2.5 w-2.5 border-r border-t border-[#facc15]/50" />
        <span className="pointer-events-none absolute bottom-1.5 left-1.5 z-[5] h-2.5 w-2.5 border-b border-l border-[#facc15]/50" />
        <span className="pointer-events-none absolute bottom-1.5 right-1.5 z-[5] h-2.5 w-2.5 border-b border-r border-[#facc15]/50" />
      </div>

      {!preview ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-sm border border-zinc-600/60 bg-zinc-900/50 px-2.5 py-2">
            <p className="font-mono-technical text-[7px] uppercase tracking-[0.22em] text-zinc-500">AX</p>
            <p
              ref={axLabelRef}
              className="mt-0.5 font-mono-technical text-[11px] tabular-nums text-[#facc15]/90"
            >
              0.000
            </p>
          </div>
          <div className="rounded-sm border border-zinc-600/60 bg-zinc-900/50 px-2.5 py-2">
            <p className="font-mono-technical text-[7px] uppercase tracking-[0.22em] text-zinc-500">AY</p>
            <p
              ref={ayLabelRef}
              className="mt-0.5 font-mono-technical text-[11px] tabular-nums text-[#facc15]/90"
            >
              0.000
            </p>
          </div>
          <div className="rounded-sm border border-zinc-600/60 bg-zinc-900/50 px-2.5 py-2">
            <p className="font-mono-technical text-[7px] uppercase tracking-[0.22em] text-zinc-500">
              {t('calibration.mpu.yaw')}
            </p>
            <p
              ref={yawLabelRef}
              className="mt-0.5 font-mono-technical text-[11px] tabular-nums text-[#facc15]/90"
            >
              0.0°
            </p>
          </div>
          <div className="rounded-sm border border-zinc-600/60 bg-zinc-900/50 px-2.5 py-2">
            <p className="font-mono-technical text-[7px] uppercase tracking-[0.22em] text-zinc-500">
              {t('calibration.mpu.offset')}
            </p>
            <p className="mt-0.5 font-mono-technical text-[10px] tabular-nums text-zinc-300">
              {offsetX.toFixed(2)}, {offsetY.toFixed(2)} · {offsetYaw.toFixed(0)}°
            </p>
          </div>
        </div>
      ) : null}

      {!preview ? (
        <button
          type="button"
          onClick={startCalibration}
          disabled={isBusy || !isConnected}
          className={
            'inline-flex min-h-11 w-full touch-manipulation items-center justify-center gap-2 rounded-sm border px-3 py-2.5 font-mono-technical text-[10px] font-bold uppercase tracking-[0.22em] transition active:scale-[0.99] ' +
            (isBusy || !isConnected
              ? 'cursor-not-allowed border-zinc-600/50 bg-zinc-900/40 text-zinc-500 opacity-60'
              : 'border-[#facc15]/45 bg-[#facc15]/10 text-[#facc15] hover:border-[#facc15]/70 hover:bg-[#facc15]/16')
          }
        >
          <Crosshair className="size-4 shrink-0" strokeWidth={1.5} aria-hidden />
          {isBusy ? t('calibration.mpu.calibrating') : t('calibration.mpu.zeroCalibrate')}
        </button>
      ) : null}
    </div>
  )
}

