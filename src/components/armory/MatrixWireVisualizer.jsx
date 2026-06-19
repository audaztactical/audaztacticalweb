import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { defaultAnalysisLines, streamGlyphs } from './matrixWireModels'

/** @typedef {'pistol' | 'reddot' | 'cartridge'} MatrixModelVariant */

const STREAM_LINES = 10
const TILT_MAX = 15
const IMG_GLOW = 'drop-shadow(0 0 15px rgba(0, 255, 65, 0.6))'

/**
 * @param {{
 *   variant: MatrixModelVariant
 *   label: string
 *   imageSrc: string
 *   imageAlt?: string
 *   analysisLines?: string[]
 *   hubMode?: boolean
 *   className?: string
 * }} props
 */
export default function MatrixWireVisualizer({
  variant,
  label,
  imageSrc,
  imageAlt = '',
  analysisLines = [],
  hubMode = false,
  className = '',
}) {
  const wrapRef = useRef(/** @type {HTMLDivElement | null} */ (null))
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 })
  const [hovering, setHovering] = useState(false)
  const [hud, setHud] = useState('SENKRON · BEKLEMEDE')
  const [tick, setTick] = useState(0)

  const lines = useMemo(
    () => (analysisLines.length ? analysisLines : defaultAnalysisLines(variant)),
    [analysisLines, variant]
  )
  const glyphs = useMemo(() => streamGlyphs(variant), [variant])

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 400)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (hubMode) return
    setHud(`${lines[tick % lines.length]} · HD_${variant.toUpperCase()}`)
  }, [tick, lines, variant, hubMode])

  const onMove = useCallback((e) => {
    const el = wrapRef.current
    if (!el) return
    setHovering(true)
    const rect = el.getBoundingClientRect()
    const nx = (e.clientX - rect.left) / rect.width - 0.5
    const ny = (e.clientY - rect.top) / rect.height - 0.5
    setTilt({
      ry: Math.max(-TILT_MAX, Math.min(TILT_MAX, nx * TILT_MAX * 2)),
      rx: Math.max(-TILT_MAX, Math.min(TILT_MAX, -ny * TILT_MAX * 2)),
    })
  }, [])

  const onLeave = useCallback(() => {
    setHovering(false)
    setTilt({ rx: 0, ry: 0 })
  }, [])

  const modelTransform = hovering
    ? `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) scale(1.05)`
    : undefined

  const heightClass = hubMode
    ? 'h-[13rem] min-h-[11rem] sm:h-[15rem]'
    : 'h-[12.5rem] min-h-[10rem] sm:h-[14rem]'

  return (
    <div
      ref={wrapRef}
      className={`matrix-viz-stage relative w-full overflow-hidden border-b border-accent/20 bg-black/80 ${heightClass} ${
        hubMode ? 'cursor-pointer' : 'cursor-crosshair'
      } ${className}`.trim()}
      aria-hidden={hubMode ? undefined : true}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      <div className="matrix-viz-grid pointer-events-none absolute inset-0 z-0 opacity-40" />
      <div className="matrix-binary-rain pointer-events-none absolute inset-0 z-0 opacity-35" />
      <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,rgba(0,255,65,0.04)_0%,transparent_72%)]" />

      <div className="pointer-events-none absolute inset-0 z-[1]">
        <div className="matrix-viz-stream matrix-viz-stream--left font-mono text-[7px] leading-tight text-accent/30">
          {Array.from({ length: STREAM_LINES }, (_, i) => (
            <p key={`l-${i}`}>
              {glyphs[(i + tick) % glyphs.length]} · {((tick * 997 + i * 137) % 0xffff).toString(16).toUpperCase()}
            </p>
          ))}
        </div>
        <div className="matrix-viz-stream matrix-viz-stream--right font-mono text-[7px] leading-tight text-accent/30">
          {Array.from({ length: STREAM_LINES }, (_, i) => (
            <p key={`r-${i}`}>
              {glyphs[(i + tick + 2) % glyphs.length]} · {((tick * 431 + i * 89) % 0xffff).toString(16).toUpperCase()}
            </p>
          ))}
        </div>
        <span className="matrix-viz-crosshair matrix-viz-crosshair--tl" />
        <span className="matrix-viz-crosshair matrix-viz-crosshair--br" />
      </div>

      <div className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center perspective-[1000px] [transform-style:preserve-3d]">
        <div
          className={`flex h-full w-full items-center justify-center [transform-style:preserve-3d] ${
            hovering ? 'transition-transform duration-200 ease-out' : 'matrix-viz-idle'
          }`}
          style={modelTransform ? { transform: modelTransform } : undefined}
        >
          <img
            src={imageSrc}
            alt={imageAlt}
            loading="lazy"
            decoding="async"
            draggable={false}
            className="matrix-viz-asset max-h-[78%] max-w-[72%] select-none object-contain [transform-style:preserve-3d]"
            style={{ filter: IMG_GLOW }}
          />
        </div>
      </div>

      {!hubMode && label ? (
        <div className="pointer-events-none absolute inset-x-0 top-2 z-[3] flex justify-between px-2 font-mono-technical text-[7px] uppercase tracking-widest text-accent/75">
          <span>{label}</span>
          <span className="max-w-[55%] truncate text-right tabular-nums">{hud}</span>
        </div>
      ) : null}

      {!hubMode ? (
        <>
          <div className="pointer-events-none absolute bottom-2 left-2 right-2 z-[3] flex justify-between font-mono text-[6px] text-accent/50">
            <span>MATRIX_IX · HD_ASSET</span>
            <span className="tabular-nums">01001100 · İNTERAKTİF</span>
          </div>
          <div className="pointer-events-none absolute right-2 top-8 z-[3] hidden w-[4.5rem] border border-accent/15 bg-black/50 p-1.5 font-mono text-[6px] text-accent/45 sm:block">
            <p className="mb-1 text-accent/65">GEO_ANALİZ</p>
            {lines.slice(0, 4).map((line, i) => (
              <p key={line} className={i === tick % 4 ? 'text-accent' : ''}>
                {i === tick % 4 ? '▸' : '·'} {line}
              </p>
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}
