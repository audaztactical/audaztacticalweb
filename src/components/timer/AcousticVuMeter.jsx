import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useHardware } from '../../context/HardwareContext'
import { SOUND_THRESHOLD_MAX, SOUND_THRESHOLD_MIN } from '../../lib/timerCalibrationSettings'

/**
 * Canlı akustik VU-Meter — telemetryRef.lvl + eşik çizgisi + peak flash.
 * @param {{
 *   threshold: number
 *   className?: string
 *   orientation?: 'vertical' | 'horizontal'
 * }} props
 */
export default function AcousticVuMeter({
  threshold,
  className = '',
  orientation = 'vertical',
}) {
  const { t } = useTranslation('timer')
  const { isConnected, telemetryRef } = useHardware()

  const trackRef = useRef(/** @type {HTMLDivElement | null} */ (null))
  const fillRef = useRef(/** @type {HTMLDivElement | null} */ (null))
  const markerRef = useRef(/** @type {HTMLDivElement | null} */ (null))
  const peakRef = useRef(/** @type {HTMLDivElement | null} */ (null))
  const levelLabelRef = useRef(/** @type {HTMLSpanElement | null} */ (null))
  const thresholdRef = useRef(threshold)
  const connectedRef = useRef(isConnected)
  const peakUntilRef = useRef(0)
  const displayLevelRef = useRef(0)

  useEffect(() => {
    thresholdRef.current = threshold
  }, [threshold])

  useEffect(() => {
    connectedRef.current = isConnected
  }, [isConnected])

  useEffect(() => {
    const marker = markerRef.current
    if (!marker) return
    const thr = Math.min(
      SOUND_THRESHOLD_MAX,
      Math.max(SOUND_THRESHOLD_MIN, Number(threshold) || 0),
    )
    const pct = thr
    if (orientation === 'vertical') {
      marker.style.bottom = `${pct}%`
      marker.style.left = '0'
      marker.style.right = '0'
      marker.style.top = 'auto'
      marker.style.width = 'auto'
      marker.style.height = '2px'
    } else {
      marker.style.left = `${pct}%`
      marker.style.top = '0'
      marker.style.bottom = '0'
      marker.style.right = 'auto'
      marker.style.height = 'auto'
      marker.style.width = '2px'
    }
  }, [threshold, orientation])

  useEffect(() => {
    let raf = 0
    const vertical = orientation === 'vertical'
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const tick = (now) => {
      const snap = telemetryRef.current
      const target = connectedRef.current && snap.fresh ? Math.min(100, Math.max(0, snap.lvl)) : 0
      // Hafif attack / decay — VU hissi (reduced-motion: anlık)
      const cur = displayLevelRef.current
      const next = reduceMotion
        ? target
        : target >= cur
          ? cur + (target - cur) * 0.55
          : cur + (target - cur) * 0.18
      displayLevelRef.current = next

      const thr = thresholdRef.current
      if (target >= thr && thr > 0) {
        peakUntilRef.current = now + 180
      }

      const fill = fillRef.current
      if (fill) {
        const pct = `${Math.max(0, Math.min(100, next))}%`
        if (vertical) {
          fill.style.height = pct
          fill.style.width = '100%'
        } else {
          fill.style.width = pct
          fill.style.height = '100%'
        }
      }

      const peaking = now < peakUntilRef.current
      const track = trackRef.current
      if (track) {
        track.style.boxShadow = peaking
          ? '0 0 14px 2px rgba(248,113,113,0.75), inset 0 0 0 1px rgba(248,113,113,0.55)'
          : 'inset 0 0 0 1px rgba(255,255,255,0.06)'
      }
      const peakEl = peakRef.current
      if (peakEl) {
        peakEl.style.opacity = peaking ? '1' : '0'
      }
      if (levelLabelRef.current) {
        levelLabelRef.current.textContent = String(Math.round(next))
      }

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [orientation, telemetryRef])

  const isVertical = orientation === 'vertical'

  return (
    <div
      className={[
        'flex shrink-0',
        isVertical ? 'flex-col items-center gap-1' : 'w-full flex-col gap-1',
        className,
      ].join(' ')}
      role="meter"
      aria-label={t('calibration.sound.vuAria')}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={threshold}
    >
      <p className="font-mono-technical text-[7px] font-bold uppercase tracking-[0.2em] text-zinc-500">
        {t('calibration.sound.vuLabel')}
      </p>

      <div
        className={[
          'relative overflow-hidden rounded-sm border border-zinc-600/60 bg-[#0a0a0b]',
          isVertical ? 'h-[7.5rem] w-8 sm:w-7' : 'h-9 w-full sm:h-7',
        ].join(' ')}
      >
        <div
          ref={trackRef}
          className="absolute inset-0 transition-[box-shadow] duration-75"
          style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)' }}
        >
          {/* Gradyan zemin (boş) */}
          <div
            className="pointer-events-none absolute inset-0 opacity-25"
            style={{
              background: isVertical
                ? 'linear-gradient(to top, #22c55e 0%, #eab308 55%, #ef4444 100%)'
                : 'linear-gradient(to right, #22c55e 0%, #eab308 55%, #ef4444 100%)',
            }}
            aria-hidden
          />

          {/* Canlı dolgu */}
          <div
            ref={fillRef}
            className={[
              'absolute left-0 will-change-[height,width]',
              isVertical ? 'bottom-0 w-full' : 'top-0 h-full',
            ].join(' ')}
            style={{
              height: isVertical ? '0%' : '100%',
              width: isVertical ? '100%' : '0%',
              background: isVertical
                ? 'linear-gradient(to top, #22c55e 0%, #eab308 55%, #ef4444 100%)'
                : 'linear-gradient(to right, #22c55e 0%, #eab308 55%, #ef4444 100%)',
            }}
            aria-hidden
          />

          {/* Eşik marker */}
          <div
            ref={markerRef}
            className="pointer-events-none absolute z-10 bg-red-500"
            style={{
              boxShadow: '0 0 6px 1px rgba(239,68,68,0.85)',
              ...(isVertical
                ? { left: 0, right: 0, height: 2, bottom: `${threshold}%` }
                : { top: 0, bottom: 0, width: 2, left: `${threshold}%` }),
            }}
            aria-hidden
          />

          {/* Peak flash overlay */}
          <div
            ref={peakRef}
            className="pointer-events-none absolute inset-0 z-20 bg-red-400/35 transition-opacity duration-75"
            style={{ opacity: 0 }}
            aria-hidden
          />
        </div>
      </div>

      <span
        ref={levelLabelRef}
        className="font-mono-technical text-[9px] font-bold tabular-nums text-[#facc15]/85"
      >
        0
      </span>
    </div>
  )
}
