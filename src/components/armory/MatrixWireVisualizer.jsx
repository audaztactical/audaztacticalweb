import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { streamGlyphs } from './matrixWireModels'

/** @typedef {'pistol' | 'reddot' | 'cartridge'} MatrixModelVariant */

const HUB_IMAGE_WIDTH = 960
const HUB_IMAGE_HEIGHT = 720

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
 *   imagePriority?: 'high' | 'low' | 'auto'
 *   className?: string
 * }} props
 */
export default function MatrixWireVisualizer({
  variant,
  label,
  imageSrc,
  imageAlt = '',
  hubMode = false,
  imagePriority = 'auto',
  className = '',
}) {
  const wrapRef = useRef(/** @type {HTMLDivElement | null} */ (null))
  const imgRef = useRef(/** @type {HTMLImageElement | null} */ (null))
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 })
  const [hovering, setHovering] = useState(false)
  const [tick, setTick] = useState(0)
  const [imageReady, setImageReady] = useState(false)

  const syncImageReady = useCallback(() => {
    const img = imgRef.current
    setImageReady(Boolean(img?.complete && img.naturalWidth > 0))
  }, [])

  useLayoutEffect(() => {
    syncImageReady()
  }, [imageSrc, syncImageReady])

  const glyphs = useMemo(() => streamGlyphs(variant), [variant])

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 400)
    return () => window.clearInterval(id)
  }, [])

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
    ? 'h-[9rem] min-h-[8rem] sm:h-[13rem] sm:min-h-[11rem] md:h-[15rem] xl:h-[16rem] 2xl:h-[20rem] 2xl:min-h-[18rem]'
    : 'h-[10rem] min-h-[9rem] sm:h-[12.5rem] sm:min-h-[10rem] md:h-[14rem]'

  const streamTextClass = hubMode
    ? 'font-mono text-[7px] leading-tight text-accent/30 xl:text-[8px] 2xl:text-[9px] 2xl:leading-snug'
    : 'font-mono text-[7px] leading-tight text-accent/30'

  const imgLoading = hubMode ? 'eager' : imagePriority === 'high' ? 'eager' : 'lazy'
  /** @type {'high' | 'low' | 'auto'} */
  const imgFetchPriority = imagePriority === 'high' ? 'high' : imagePriority === 'low' ? 'low' : 'auto'

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
        <div className={`matrix-viz-stream matrix-viz-stream--left ${streamTextClass}`}>
          {Array.from({ length: STREAM_LINES }, (_, i) => (
            <p key={`l-${i}`}>
              {glyphs[(i + tick) % glyphs.length]} · {((tick * 997 + i * 137) % 0xffff).toString(16).toUpperCase()}
            </p>
          ))}
        </div>
        <div className={`matrix-viz-stream matrix-viz-stream--right ${streamTextClass}`}>
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
        {hubMode && !imageReady ? (
          <div
            className="absolute inset-x-[12%] inset-y-[14%] animate-pulse rounded border border-accent/15 bg-accent/[0.04]"
            aria-hidden
          >
            <div className="flex h-full flex-col items-center justify-center gap-2 font-mono-technical text-[8px] uppercase tracking-[0.28em] text-accent/35 xl:text-[9px] 2xl:text-[10px]">
              <span className="size-8 rounded border border-accent/20 bg-accent/[0.06] xl:size-10 2xl:size-12" />
            </div>
          </div>
        ) : null}
        <div
          className={`flex h-full w-full items-center justify-center [transform-style:preserve-3d] ${
            hovering ? 'transition-transform duration-200 ease-out' : 'matrix-viz-idle'
          }`}
          style={modelTransform ? { transform: modelTransform } : undefined}
        >
          <img
            ref={imgRef}
            src={imageSrc}
            alt={imageAlt}
            width={hubMode ? HUB_IMAGE_WIDTH : undefined}
            height={hubMode ? HUB_IMAGE_HEIGHT : undefined}
            loading={imgLoading}
            decoding="async"
            fetchPriority={imgFetchPriority}
            draggable={false}
            onLoad={syncImageReady}
            onError={() => setImageReady(false)}
            className={[
              'matrix-viz-asset max-h-[78%] max-w-[72%] select-none object-contain [transform-style:preserve-3d]',
              hubMode ? 'transition-opacity duration-300' : '',
              !hubMode && !imageReady ? 'opacity-0' : 'opacity-100',
            ].join(' ')}
            style={{ filter: IMG_GLOW }}
          />
        </div>
      </div>

      {!hubMode && label ? (
        <div className="pointer-events-none absolute inset-x-0 top-2 z-[3] px-2 font-mono-technical text-[7px] uppercase tracking-widest text-accent/75">
          <span>{label}</span>
        </div>
      ) : null}
    </div>
  )
}
