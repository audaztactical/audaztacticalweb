import { useEffect, useRef } from 'react'
import {
  drawLayoutObject,
  drawRangeGrid,
  drawTacticalArrow,
} from '../../lib/rangeLayoutCanvasDraw'
import { drawDrawnShape } from '../../lib/rangeLayoutPrimitives'

/**
 * @param {{
 *   layoutKey: string
 *   objects: import('../../lib/rangeLayoutMetrics').CanvasLayoutObject[]
 *   tacticalArrows?: import('../../lib/rangeLayoutMetrics').TacticalArrow[]
 *   drawnShapes?: import('../../lib/rangeLayoutPrimitives').DrawnShape[]
 *   readOnly?: boolean
 *   className?: string
 *   height?: number
 * }} props
 */
export default function RangeLayoutPreviewCanvas({
  layoutKey,
  objects,
  tacticalArrows = [],
  drawnShapes = [],
  readOnly = true,
  className = '',
  height = 220,
}) {
  const canvasRef = useRef(/** @type {HTMLCanvasElement | null} */ (null))

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const parent = canvas.parentElement
    if (!parent) return

    const width = Math.max(280, parent.clientWidth)
    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = '#050805'
    ctx.fillRect(0, 0, width, height)

    drawRangeGrid(ctx, width, height)
    for (const shape of drawnShapes) {
      drawDrawnShape(ctx, shape)
    }
    for (const arrow of tacticalArrows) {
      drawTacticalArrow(ctx, arrow, width, height)
    }
    for (const obj of objects) {
      drawLayoutObject(ctx, obj, width, height, { readOnly: true })
    }
  }, [layoutKey, objects, tacticalArrows, drawnShapes, height])

  return (
    <div
      className={`relative overflow-hidden rounded border border-[#00FF41]/25 bg-[#050805] shadow-[0_0_10px_rgba(34,197,94,0.2)] ${className}`}
    >
      <canvas
        ref={canvasRef}
        className={`block w-full ${readOnly ? 'pointer-events-none cursor-default' : 'cursor-crosshair'}`}
        aria-label={readOnly ? 'Taktik layout salt okunur önizleme' : 'Taktik layout önizleme'}
      />
      {readOnly ? (
        <span className="pointer-events-none absolute right-2 top-2 rounded border border-[#00FF41]/35 bg-black/70 px-2 py-0.5 font-mono-technical text-[7px] font-bold uppercase tracking-wider text-[#00FF41]/90">
          SALT OKUNUR
        </span>
      ) : null}
    </div>
  )
}

