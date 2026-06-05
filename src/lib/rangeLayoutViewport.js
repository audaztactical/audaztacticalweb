import { layoutCanvasMetrics, meterToCanvas } from './rangeLayoutCanvasDraw'

/**
 * Inverse viewport matrix: screen CSS pixels → world (layout canvas) space.
 * Matches AutoCAD-style pan/zoom before scale is applied in the render pass.
 *
 * @param {number} clientX
 * @param {number} clientY
 * @param {DOMRect} rect
 * @param {{ x: number; y: number }} pan
 * @param {number} zoom
 */
export function screenToWorld(clientX, clientY, rect, pan, zoom) {
  return {
    x: (clientX - rect.left - pan.x) / zoom,
    y: (clientY - rect.top - pan.y) / zoom,
  }
}

/**
 * Layout view space → range meters (persistent world storage).
 * @param {number} viewX
 * @param {number} viewY
 * @param {number} width
 * @param {number} height
 */
export function viewToMeter(viewX, viewY, width, height) {
  const m = layoutCanvasMetrics(width, height)
  return {
    x: (viewX - m.AXIS_PAD) / m.scaleX,
    y: (viewY - m.AXIS_PAD) / m.scaleY,
  }
}

/**
 * Range meters → layout view space (for rendering inside viewport transform).
 * @param {number} meterX
 * @param {number} meterY
 * @param {number} width
 * @param {number} height
 */
export function meterToView(meterX, meterY, width, height) {
  const m = layoutCanvasMetrics(width, height)
  return meterToCanvas(meterX, meterY, m)
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ x: number; y: number }} pan
 * @param {number} zoom
 */
export function applyViewportTransform(ctx, pan, zoom) {
  ctx.translate(pan.x, pan.y)
  ctx.scale(zoom, zoom)
}

/**
 * @param {number} value
 */
export function roundMeter(value) {
  return Math.round(value * 10) / 10
}
