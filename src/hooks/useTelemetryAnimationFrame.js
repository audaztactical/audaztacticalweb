import { useEffect, useRef, useState } from 'react'

/** Paket gelmezse UI'nin "dondu" sanmaması için stale eşiği (ms) */
const DEFAULT_STALE_MS = 450

/**
 * telemetryRef'i her frame okur; throttle ile React state günceller (UI re-render).
 * seq değişmese bile stale bayrağını günceller — kalibrasyon sessizliğinde kilitlenmez.
 *
 * @param {import('react').MutableRefObject<{
 *   ax: number
 *   ay: number
 *   az: number
 *   gz: number
 *   gy: number
 *   gx: number
 *   yaw: number
 *   pitch: number
 *   roll: number
 *   lvl: number
 *   mode?: string
 *   timestamp: number
 *   seq: number
 *   fresh: boolean
 *   receivedAt?: number
 * }>} telemetryRef
 * @param {{
 *   enabled?: boolean
 *   throttleMs?: number
 *   staleMs?: number
 * }} [opts]
 */
export function useTelemetryAnimationFrame(telemetryRef, opts = {}) {
  const enabled = opts.enabled !== false
  const throttleMs = Math.max(16, Number(opts.throttleMs) || 33)
  const staleMs = Math.max(100, Number(opts.staleMs) || DEFAULT_STALE_MS)

  const [snap, setSnap] = useState(() => ({
    ax: 0,
    ay: 0,
    az: 0,
    gz: 0,
    gy: 0,
    gx: 0,
    yaw: 0,
    pitch: 0,
    roll: 0,
    lvl: 0,
    mode: '',
    fresh: false,
    stale: true,
    seq: 0,
    timestamp: 0,
    ageMs: 0,
  }))

  const lastPublishRef = useRef(0)
  const lastSeqRef = useRef(-1)
  const lastStaleRef = useRef(true)

  useEffect(() => {
    if (!enabled) return undefined
    let raf = 0

    const tick = (now) => {
      const t = telemetryRef.current
      const ageMs =
      t.fresh && t.receivedAt > 0
        ? Math.max(0, now - t.receivedAt)
        : t.fresh && t.timestamp > 0
          ? Math.max(0, now - t.timestamp)
          : Number.POSITIVE_INFINITY
      const stale = !t.fresh || ageMs > staleMs
      const due = now - lastPublishRef.current >= throttleMs
      const changed = t.seq !== lastSeqRef.current
      const staleFlipped = stale !== lastStaleRef.current

      if (due && (changed || !t.fresh || staleFlipped)) {
        lastPublishRef.current = now
        lastSeqRef.current = t.seq
        lastStaleRef.current = stale
        setSnap({
          ax: t.ax,
          ay: t.ay,
          az: t.az,
          gz: t.gz,
          gy: t.gy ?? 0,
          gx: t.gx ?? 0,
          yaw: t.yaw,
          pitch: t.pitch ?? 0,
          roll: t.roll ?? 0,
          lvl: t.lvl,
          mode: t.mode || '',
          fresh: t.fresh,
          stale,
          seq: t.seq,
          timestamp: t.timestamp,
          ageMs: Number.isFinite(ageMs) ? ageMs : 0,
        })
      }
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [enabled, staleMs, telemetryRef, throttleMs])

  return snap
}
