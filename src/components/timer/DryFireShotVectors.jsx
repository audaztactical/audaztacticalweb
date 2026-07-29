import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Info } from 'lucide-react'
import { buildShotToShotLinks, mapHitToFacePercent } from '../../lib/dryFireHits'

/** Taktiksel vektör rengi — sarı nişangah/isabetlerden ayrışır */
const VEC_STROKE = 'rgba(45, 212, 191, 0.72)'
const VEC_STROKE_DIM = 'rgba(45, 212, 191, 0.18)'
const VEC_FILL = 'rgba(45, 212, 191, 0.92)'
const VEC_TRACER = '#5eead4'
const VEC_TRACER_CORE = '#ecfeff'

/** Segment başına çizim süresi (ms) */
const SEGMENT_DRAW_MS = 480
/** Segmentler arası kısa nefes */
const SEGMENT_GAP_MS = 70

/**
 * Varış isabetinin merkezine (x2,y2) bakan ok ucu.
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @param {number} [size]
 */
function arrowHeadPoints(x1, y1, x2, y2, size = 1.65) {
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len
  const tipX = x2
  const tipY = y2
  const bx = x2 - ux * size
  const by = y2 - uy * size
  const px = -uy * size * 0.42
  const py = ux * size * 0.42
  return `${tipX},${tipY} ${bx + px},${by + py} ${bx - px},${by - py}`
}

/**
 * @param {number} t 0…1
 */
function easeOutCubic(t) {
  const x = Math.min(1, Math.max(0, t))
  return 1 - (1 - x) ** 3
}

/**
 * @typedef {{
 *   id: string
 *   fromIndex: number
 *   toIndex: number
 *   x1: number
 *   y1: number
 *   x2: number
 *   y2: number
 *   lx2: number
 *   ly2: number
 *   mx: number
 *   my: number
 *   len: number
 *   splitMs: number
 *   distance: number
 * }} VecSeg
 */

/**
 * Ardışık atış vektörleri — kronolojik tracer + bilgi ikonu ile açılan etiket popover.
 *
 * @param {{
 *   hits: import('../../lib/dryFireHits').DryFireHit[]
 *   distanceM: number
 *   faceHitRadiusPct?: number
 *   visible?: boolean
 *   newestLinkToIndex?: number | null
 * }} props
 */
export default function DryFireShotVectors({
  hits,
  distanceM,
  faceHitRadiusPct = 46,
  visible = false,
  newestLinkToIndex = null,
}) {
  const { t } = useTranslation('timer')
  const links = useMemo(() => buildShotToShotLinks(hits), [hits])

  /** @type {VecSeg[]} */
  const segments = useMemo(() => {
    return links.map((link) => {
      const from = mapHitToFacePercent(link.from.x, link.from.y, distanceM, faceHitRadiusPct)
      const to = mapHitToFacePercent(link.to.x, link.to.y, distanceM, faceHitRadiusPct)
      const x1 = from.leftPct
      const y1 = from.topPct
      const x2 = to.leftPct
      const y2 = to.topPct
      const dx = x2 - x1
      const dy = y2 - y1
      const len = Math.hypot(dx, dy) || 1
      const trim = Math.min(1.55, len * 0.22)
      const lx2 = x2 - (dx / len) * trim
      const ly2 = y2 - (dy / len) * trim
      return {
        id: link.id,
        fromIndex: link.fromIndex,
        toIndex: link.toIndex,
        x1,
        y1,
        x2,
        y2,
        lx2,
        ly2,
        mx: (x1 + x2) / 2,
        my: (y1 + y2) / 2,
        len,
        splitMs: link.splitMs,
        distance: link.distance,
      }
    })
  }, [links, distanceM, faceHitRadiusPct])

  const linkSig = useMemo(() => segments.map((s) => s.id).join('|'), [segments])

  /** 'draw' | 'flow' */
  const [phase, setPhase] = useState(/** @type {'draw' | 'flow'} */ ('draw'))
  /** Fractional progress across segments (0 … n) */
  const [drawProgress, setDrawProgress] = useState(0)
  /** Açık etiket — varsayılan kapalı */
  const [openId, setOpenId] = useState(/** @type {string | null} */ (null))
  const drawFromRef = useRef(0)
  const rafRef = useRef(0)
  const phaseRef = useRef(phase)
  const prevSigRef = useRef('')
  const prevVisibleRef = useRef(false)
  const labelsLayerRef = useRef(/** @type {HTMLDivElement | null} */ (null))

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  useEffect(() => {
    if (!visible) setOpenId(null)
  }, [visible])

  useEffect(() => {
    if (!openId) return undefined
    const onPointerDown = (/** @type {PointerEvent} */ e) => {
      const root = labelsLayerRef.current
      const target = e.target
      if (!(target instanceof Node)) return
      if (root?.contains(target)) return
      setOpenId(null)
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [openId])

  useEffect(() => {
    if (!visible || segments.length === 0) {
      cancelAnimationFrame(rafRef.current)
      setPhase('draw')
      setDrawProgress(0)
      drawFromRef.current = 0
      prevSigRef.current = ''
      prevVisibleRef.current = visible
      setOpenId(null)
      return undefined
    }

    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches

    const prevSig = prevSigRef.current
    const turnedOn = visible && !prevVisibleRef.current
    const grew = prevSig && linkSig.startsWith(prevSig) && linkSig.length > prevSig.length
    const replaced = prevSig && linkSig !== prevSig && !grew

    prevVisibleRef.current = visible
    prevSigRef.current = linkSig

    if (reduceMotion) {
      setPhase('flow')
      setDrawProgress(segments.length)
      drawFromRef.current = segments.length
      return undefined
    }

    let fromIdx = 0
    if (turnedOn || replaced || !prevSig) {
      fromIdx = 0
    } else if (grew && phaseRef.current === 'flow') {
      fromIdx = prevSig.split('|').filter(Boolean).length
    } else if (grew) {
      fromIdx = Math.min(Math.floor(drawFromRef.current), segments.length - 1)
    } else {
      return undefined
    }

    drawFromRef.current = fromIdx
    setPhase('draw')
    setDrawProgress(fromIdx)

    const start = performance.now()
    const n = segments.length
    const remaining = Math.max(0, n - fromIdx)
    const totalMs = remaining * (SEGMENT_DRAW_MS + SEGMENT_GAP_MS)

    const tick = (now) => {
      const elapsed = now - start
      if (remaining === 0 || totalMs <= 0 || elapsed >= totalMs) {
        setDrawProgress(n)
        setPhase('flow')
        return
      }
      let p = fromIdx
      let tLeft = elapsed
      for (let i = fromIdx; i < n; i += 1) {
        if (tLeft <= SEGMENT_DRAW_MS) {
          p = i + easeOutCubic(tLeft / SEGMENT_DRAW_MS)
          break
        }
        tLeft -= SEGMENT_DRAW_MS
        if (tLeft <= SEGMENT_GAP_MS) {
          p = i + 1
          break
        }
        tLeft -= SEGMENT_GAP_MS
        p = i + 1
      }
      setDrawProgress(Math.min(n, p))
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [visible, linkSig, segments.length])

  if (!visible || segments.length === 0) return null

  const isFlowing = phase === 'flow'
  const activeSegIndex = isFlowing ? -1 : Math.min(segments.length - 1, Math.floor(drawProgress))
  const activeFrac = isFlowing ? 1 : drawProgress - Math.floor(drawProgress)

  return (
    <>
      <svg
        className="pointer-events-none absolute inset-0 z-[15] h-full w-full overflow-visible"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <filter id="df-vec-tracer-glow" x="-120%" y="-120%" width="340%" height="340%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="0.55" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {segments.map((seg, i) => {
          const done = isFlowing || drawProgress >= i + 1
          const drawing = !isFlowing && i === activeSegIndex && !done
          const pending = !isFlowing && drawProgress < i
          const reveal = done ? 1 : drawing ? activeFrac : 0

          const dx = seg.lx2 - seg.x1
          const dy = seg.ly2 - seg.y1
          const tipX = seg.x1 + dx * reveal
          const tipY = seg.y1 + dy * reveal

          const isNew = newestLinkToIndex != null && seg.toIndex === newestLinkToIndex
          const showDecor = done || (drawing && reveal > 0.82)

          return (
            <g key={seg.id} className={isNew && isFlowing ? 'df-vec-pop' : undefined}>
              {!done ? (
                <line
                  x1={seg.x1}
                  y1={seg.y1}
                  x2={seg.lx2}
                  y2={seg.ly2}
                  stroke={VEC_STROKE_DIM}
                  strokeWidth="0.14"
                  strokeLinecap="round"
                  strokeDasharray="0.4 0.55"
                />
              ) : null}

              {reveal > 0.001 ? (
                <line
                  x1={seg.x1}
                  y1={seg.y1}
                  x2={tipX}
                  y2={tipY}
                  stroke={VEC_STROKE}
                  strokeWidth={isFlowing ? '0.28' : '0.24'}
                  strokeLinecap="round"
                  strokeDasharray={isFlowing ? '1.15 0.95' : undefined}
                  className={isFlowing ? 'df-vec-hud-flow' : undefined}
                  style={
                    isFlowing
                      ? { animationDelay: `${(i * 0.12).toFixed(2)}s` }
                      : undefined
                  }
                />
              ) : null}

              {drawing && reveal > 0.02 ? (
                <line
                  x1={seg.x1}
                  y1={seg.y1}
                  x2={tipX}
                  y2={tipY}
                  stroke="rgba(94, 234, 212, 0.35)"
                  strokeWidth="0.55"
                  strokeLinecap="round"
                  opacity="0.55"
                />
              ) : null}

              {showDecor && !pending ? (
                <polygon
                  points={arrowHeadPoints(seg.x1, seg.y1, seg.x2, seg.y2)}
                  fill={VEC_FILL}
                  stroke="rgba(10,10,11,0.35)"
                  strokeWidth="0.08"
                  opacity={done ? 1 : Math.min(1, (reveal - 0.82) / 0.18)}
                />
              ) : null}
            </g>
          )
        })}

        {!isFlowing && activeSegIndex >= 0 && activeFrac > 0.01 && activeFrac < 0.995
          ? (() => {
              const seg = segments[activeSegIndex]
              if (!seg) return null
              const dx = seg.lx2 - seg.x1
              const dy = seg.ly2 - seg.y1
              const tx = seg.x1 + dx * activeFrac
              const ty = seg.y1 + dy * activeFrac
              return (
                <g className="df-vec-tracer" filter="url(#df-vec-tracer-glow)">
                  <circle cx={tx} cy={ty} r="1.65" fill="rgba(45, 212, 191, 0.22)" />
                  <circle cx={tx} cy={ty} r="0.85" fill={VEC_TRACER} />
                  <circle cx={tx} cy={ty} r="0.35" fill={VEC_TRACER_CORE} />
                </g>
              )
            })()
          : null}

        <style>{`
          @keyframes dfVecPop {
            0% { opacity: 0; }
            100% { opacity: 1; }
          }
          .df-vec-pop {
            animation: dfVecPop 0.4s ease-out both;
          }
          @keyframes dfVecHudFlow {
            0% { stroke-dashoffset: 0; }
            100% { stroke-dashoffset: -21; }
          }
          .df-vec-hud-flow {
            animation: dfVecHudFlow 1.65s linear infinite;
          }
          @keyframes dfVecTracerPulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.72; }
          }
          .df-vec-tracer {
            animation: dfVecTracerPulse 0.55s ease-in-out infinite;
          }
          @media (prefers-reduced-motion: reduce) {
            .df-vec-hud-flow,
            .df-vec-tracer,
            .df-vec-pop {
              animation: none !important;
            }
          }
        `}</style>
      </svg>

      {/* Etiketler varsayılan gizli — orta noktada info ikonu; hover/tık → kompakt popover */}
      <div
        ref={labelsLayerRef}
        className="pointer-events-none absolute inset-0 z-[16]"
        data-dry-vec-labels
      >
        {segments.map((seg, i) => {
          const done = isFlowing || drawProgress >= i + 1
          if (!done) return null
          const open = openId === seg.id
          return (
            <div
              key={`lbl-${seg.id}`}
              className="pointer-events-auto absolute"
              style={{
                left: `${seg.mx}%`,
                top: `${seg.my}%`,
                transform: 'translate(-50%, -50%)',
              }}
              onPointerEnter={() => setOpenId(seg.id)}
              onPointerLeave={() => setOpenId((cur) => (cur === seg.id ? null : cur))}
            >
              <button
                type="button"
                data-dry-vec-info={seg.id}
                aria-expanded={open}
                aria-label={t('dryFire.target.vectorInfoAria', {
                  from: seg.fromIndex,
                  to: seg.toIndex,
                })}
                title={t('dryFire.target.vectorInfoAria', {
                  from: seg.fromIndex,
                  to: seg.toIndex,
                })}
                onClick={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                  setOpenId((cur) => (cur === seg.id ? null : seg.id))
                }}
                className={[
                  'inline-flex size-5 touch-manipulation items-center justify-center rounded-full border transition',
                  'focus:outline-none focus-visible:ring-1 focus-visible:ring-teal-300/70',
                  open
                    ? 'border-teal-300/70 bg-teal-950/90 text-teal-200'
                    : 'border-teal-500/45 bg-[#0a0a0b]/85 text-teal-300/90 hover:border-teal-300/60 hover:bg-teal-950/70 hover:text-teal-100',
                ].join(' ')}
              >
                <Info className="size-2.5" strokeWidth={2.25} aria-hidden />
              </button>

              {open ? (
                <div
                  role="tooltip"
                  className={[
                    'absolute left-1/2 top-[calc(100%+0.35rem)] z-20 w-max min-w-[6.5rem] -translate-x-1/2',
                    'rounded-sm border border-teal-500/40 bg-[#0a0a0b]/95 px-2 py-1.5 shadow-[0_8px_24px_-10px_rgba(0,0,0,0.85)] backdrop-blur-sm',
                  ].join(' ')}
                >
                  <p className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-teal-200/95">
                    {seg.fromIndex}→{seg.toIndex}
                  </p>
                  <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 font-mono text-[10px] tabular-nums leading-tight">
                    <dt className="text-zinc-500">{t('dryFire.target.vectorDist')}</dt>
                    <dd className="text-right text-teal-100/95">{seg.distance.toFixed(2)}</dd>
                    <dt className="text-zinc-500">{t('dryFire.target.vectorSplit')}</dt>
                    <dd className="text-right text-teal-100/95">
                      {seg.splitMs}
                      {t('dryFire.units.ms')}
                    </dd>
                  </dl>
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </>
  )
}
