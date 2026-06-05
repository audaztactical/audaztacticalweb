import { HIT_RADIUS_BY_CATEGORY, layoutCanvasMetrics, meterToCanvas } from './rangeLayoutCanvasDraw'
import { getShapeBounds, roundWorld } from './rangeLayoutPrimitives'
import { meterToView, roundMeter, viewToMeter } from './rangeLayoutViewport'

/** @typedef {'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'p1' | 'p2' | 'body'} TransformHandle */

/** @typedef {'shape' | 'arrow' | 'object'} SceneEntityKind */

/**
 * @typedef {Object} SceneHit
 * @property {SceneEntityKind} kind
 * @property {string} id
 * @property {TransformHandle} [handle]
 */

/**
 * @typedef {{ minX: number; maxX: number; minY: number; maxY: number }} Bounds
 */

const HANDLE_IDS = /** @type {TransformHandle[]} */ ([
  'nw',
  'n',
  'ne',
  'e',
  'se',
  's',
  'sw',
  'w',
])

/**
 * @param {number} zoom
 */
export function handleRadiusWorld(zoom) {
  return Math.max(5, 8 / Math.max(zoom, 0.25))
}

/**
 * @param {Bounds} b
 * @param {TransformHandle} handle
 */
function handlePosition(b, handle) {
  const cx = (b.minX + b.maxX) / 2
  const cy = (b.minY + b.maxY) / 2
  switch (handle) {
    case 'nw':
      return { x: b.minX, y: b.minY }
    case 'n':
      return { x: cx, y: b.minY }
    case 'ne':
      return { x: b.maxX, y: b.minY }
    case 'e':
      return { x: b.maxX, y: cy }
    case 'se':
      return { x: b.maxX, y: b.maxY }
    case 's':
      return { x: cx, y: b.maxY }
    case 'sw':
      return { x: b.minX, y: b.maxY }
    case 'w':
      return { x: b.minX, y: cy }
    default:
      return { x: cx, y: cy }
  }
}

/**
 * @param {number} wx
 * @param {number} wy
 * @param {Bounds} b
 * @param {number} zoom
 * @returns {TransformHandle | null}
 */
export function hitTestTransformHandle(wx, wy, b, zoom) {
  const r = handleRadiusWorld(zoom)
  const r2 = r * r
  for (const hid of HANDLE_IDS) {
    const p = handlePosition(b, hid)
    const dx = wx - p.x
    const dy = wy - p.y
    if (dx * dx + dy * dy <= r2) return hid
  }
  return null
}

/**
 * @param {number} wx
 * @param {number} wy
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @param {number} zoom
 */
function hitTestEndpoint(wx, wy, x1, y1, x2, y2, zoom) {
  const r = handleRadiusWorld(zoom) * 1.15
  const r2 = r * r
  if ((wx - x1) ** 2 + (wy - y1) ** 2 <= r2) return 'p1'
  if ((wx - x2) ** 2 + (wy - y2) ** 2 <= r2) return 'p2'
  return null
}

/**
 * @param {number} px
 * @param {number} py
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @param {number} threshold
 */
function distToSegment(px, py, x1, y1, x2, y2, threshold) {
  const dx = x2 - x1
  const dy = y2 - y1
  const len2 = dx * dx + dy * dy
  if (len2 < 1e-6) return Math.hypot(px - x1, py - y1) <= threshold
  let t = ((px - x1) * dx + (py - y1) * dy) / len2
  t = Math.max(0, Math.min(1, t))
  const nx = x1 + t * dx
  const ny = y1 + t * dy
  return Math.hypot(px - nx, py - ny) <= threshold
}

/**
 * @param {import('./rangeLayoutPrimitives').DrawnShape} shape
 * @param {number} wx
 * @param {number} wy
 * @param {number} zoom
 */
function hitTestDrawnShape(shape, wx, wy, zoom) {
  const pad = Math.max(6, 8 / zoom)
  switch (shape.type) {
    case 'line': {
      const ep = hitTestEndpoint(wx, wy, shape.startX, shape.startY, shape.endX, shape.endY, zoom)
      if (ep) return { handle: ep }
      if (distToSegment(wx, wy, shape.startX, shape.startY, shape.endX, shape.endY, pad + shape.strokeWidth)) {
        return { handle: 'body' }
      }
      return null
    }
    case 'circle': {
      const d = Math.hypot(wx - shape.startX, wy - shape.startY)
      const r = Math.max(shape.radius, 1)
      if (Math.abs(d - r) <= pad || d <= r) {
        const ep = hitTestEndpoint(wx, wy, shape.startX + r, shape.startY, shape.startX - r, shape.startY, zoom)
        if (ep === 'p1') return { handle: 'e' }
        if (ep === 'p2') return { handle: 'w' }
        return { handle: 'body' }
      }
      return null
    }
    default: {
      const b = getShapeBounds(shape)
      const handle = hitTestTransformHandle(wx, wy, b, zoom)
      if (handle) return { handle }
      if (wx >= b.minX - pad && wx <= b.maxX + pad && wy >= b.minY - pad && wy <= b.maxY + pad) {
        return { handle: 'body' }
      }
      return null
    }
  }
}

/**
 * @param {import('./rangeLayoutMetrics').TacticalArrow} arrow
 * @param {number} width
 * @param {number} height
 */
export function arrowToViewPoints(arrow, width, height) {
  const p1 = meterToView(arrow.x1, arrow.y1, width, height)
  const p2 = meterToView(arrow.x2, arrow.y2, width, height)
  return { x1: p1.cx, y1: p1.cy, x2: p2.cx, y2: p2.cy }
}

/**
 * @param {{
 *   wx: number
 *   wy: number
 *   zoom: number
 *   width: number
 *   height: number
 *   drawnShapes: import('./rangeLayoutPrimitives').DrawnShape[]
 *   tacticalArrows: import('./rangeLayoutMetrics').TacticalArrow[]
 *   canvasObjects: import('./rangeLayoutMetrics').CanvasLayoutObject[]
 * }} ctx
 * @returns {SceneHit | null}
 */
export function hitTestScene({
  wx,
  wy,
  zoom,
  width,
  height,
  drawnShapes,
  tacticalArrows,
  canvasObjects,
}) {
  const threshold = Math.max(6, 10 / zoom)

  for (let i = drawnShapes.length - 1; i >= 0; i -= 1) {
    const shape = drawnShapes[i]
    const hit = hitTestDrawnShape(shape, wx, wy, zoom)
    if (hit) {
      return { kind: 'shape', id: shape.id, handle: hit.handle }
    }
  }

  for (let i = tacticalArrows.length - 1; i >= 0; i -= 1) {
    const arrow = tacticalArrows[i]
    const { x1, y1, x2, y2 } = arrowToViewPoints(arrow, width, height)
    const ep = hitTestEndpoint(wx, wy, x1, y1, x2, y2, zoom)
    if (ep) return { kind: 'arrow', id: arrow.id, handle: ep }
    if (distToSegment(wx, wy, x1, y1, x2, y2, threshold)) {
      return { kind: 'arrow', id: arrow.id, handle: 'body' }
    }
  }

  const m = layoutCanvasMetrics(width, height)
  for (let i = canvasObjects.length - 1; i >= 0; i -= 1) {
    const obj = canvasObjects[i]
    const { cx, cy } = meterToCanvas(obj.x, obj.y, m)
    const radius = HIT_RADIUS_BY_CATEGORY[obj.category] ?? 18
    const dx = wx - cx
    const dy = wy - cy
    if (dx * dx + dy * dy <= radius * radius) {
      return { kind: 'object', id: obj.id, handle: 'body' }
    }
  }

  return null
}

/**
 * @param {SceneEntityKind} kind
 * @param {string} id
 * @param {import('./rangeLayoutPrimitives').DrawnShape[]} drawnShapes
 * @param {import('./rangeLayoutMetrics').TacticalArrow[]} tacticalArrows
 * @param {import('./rangeLayoutMetrics').CanvasLayoutObject[]} canvasObjects
 * @param {number} width
 * @param {number} height
 * @returns {Bounds | null}
 */
export function getEntityBounds(kind, id, drawnShapes, tacticalArrows, canvasObjects, width, height) {
  if (kind === 'shape') {
    const shape = drawnShapes.find((s) => s.id === id)
    if (!shape) return null
    const b = getShapeBounds(shape)
    return b
  }
  if (kind === 'arrow') {
    const arrow = tacticalArrows.find((a) => a.id === id)
    if (!arrow) return null
    const { x1, y1, x2, y2 } = arrowToViewPoints(arrow, width, height)
    return {
      minX: Math.min(x1, x2) - 8,
      maxX: Math.max(x1, x2) + 8,
      minY: Math.min(y1, y2) - 8,
      maxY: Math.max(y1, y2) + 8,
    }
  }
  if (kind === 'object') {
    const obj = canvasObjects.find((o) => o.id === id)
    if (!obj) return null
    const { cx, cy } = meterToView(obj.x, obj.y, width, height)
    const r = HIT_RADIUS_BY_CATEGORY[obj.category] ?? 18
    return { minX: cx - r, maxX: cx + r, minY: cy - r, maxY: cy + r }
  }
  return null
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {Bounds} b
 * @param {number} zoom
 * @param {{ endpointsOnly?: boolean }} [opts]
 */
export function drawTransformHandles(ctx, b, zoom, opts = {}) {
  const { endpointsOnly = false } = opts
  const r = handleRadiusWorld(zoom) * 0.85
  ctx.save()
  ctx.strokeStyle = 'rgba(34, 197, 94, 0.95)'
  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)'
  ctx.lineWidth = 1
  ctx.setLineDash([])
  ctx.shadowBlur = 6
  ctx.shadowColor = '#22c55e'
  ctx.strokeRect(b.minX, b.minY, b.maxX - b.minX, b.maxY - b.minY)

  const drawHandle = (/** @type {number} */ x, /** @type {number} */ y) => {
    ctx.fillRect(x - r, y - r, r * 2, r * 2)
    ctx.strokeRect(x - r, y - r, r * 2, r * 2)
  }

  if (endpointsOnly) {
    drawHandle(b.minX, b.minY)
    drawHandle(b.maxX, b.maxY)
  } else {
    for (const hid of HANDLE_IDS) {
      const p = handlePosition(b, hid)
      drawHandle(p.x, p.y)
    }
  }
  ctx.restore()
}

/**
 * @param {import('./rangeLayoutPrimitives').DrawnShape} shape
 * @param {number} dx
 * @param {number} dy
 */
export function translateDrawnShape(shape, dx, dy) {
  switch (shape.type) {
    case 'line':
      return {
        ...shape,
        startX: roundWorld(shape.startX + dx),
        startY: roundWorld(shape.startY + dy),
        endX: roundWorld(shape.endX + dx),
        endY: roundWorld(shape.endY + dy),
      }
    case 'circle':
      return {
        ...shape,
        startX: roundWorld(shape.startX + dx),
        startY: roundWorld(shape.startY + dy),
      }
    case 'triangle':
      return {
        ...shape,
        x1: roundWorld(shape.x1 + dx),
        y1: roundWorld(shape.y1 + dy),
        x2: roundWorld(shape.x2 + dx),
        y2: roundWorld(shape.y2 + dy),
        x3: roundWorld(shape.x3 + dx),
        y3: roundWorld(shape.y3 + dy),
      }
    case 'square':
      return {
        ...shape,
        startX: roundWorld(shape.startX + dx),
        startY: roundWorld(shape.startY + dy),
      }
    case 'rectangle':
      return {
        ...shape,
        startX: roundWorld(shape.startX + dx),
        startY: roundWorld(shape.startY + dy),
      }
    default:
      return shape
  }
}

/**
 * @param {import('./rangeLayoutPrimitives').DrawnShape} shape
 * @param {TransformHandle} handle
 * @param {number} wx
 * @param {number} wy
 */
export function resizeDrawnShape(shape, handle, wx, wy) {
  const x = roundWorld(wx)
  const y = roundWorld(wy)
  switch (shape.type) {
    case 'line':
      if (handle === 'p1' || handle === 'nw' || handle === 'w' || handle === 'sw') {
        return { ...shape, startX: x, startY: y }
      }
      return { ...shape, endX: x, endY: y }
    case 'circle': {
      const r = Math.max(3, Math.hypot(x - shape.startX, y - shape.startY))
      return { ...shape, radius: roundWorld(r) }
    }
    case 'triangle': {
      const b0 = getShapeBounds(shape)
      let minX = b0.minX
      let minY = b0.minY
      let maxX = b0.maxX
      let maxY = b0.maxY
      if (handle.includes('n')) minY = y
      if (handle.includes('s')) maxY = y
      if (handle.includes('w')) minX = x
      if (handle.includes('e')) maxX = x
      const w0 = b0.maxX - b0.minX || 1
      const h0 = b0.maxY - b0.minY || 1
      const mapX = (/** @type {number} */ px) =>
        roundWorld(minX + ((px - b0.minX) / w0) * (maxX - minX))
      const mapY = (/** @type {number} */ py) =>
        roundWorld(minY + ((py - b0.minY) / h0) * (maxY - minY))
      return {
        ...shape,
        x1: mapX(shape.x1),
        y1: mapY(shape.y1),
        x2: mapX(shape.x2),
        y2: mapY(shape.y2),
        x3: mapX(shape.x3),
        y3: mapY(shape.y3),
      }
    }
    case 'square': {
      const size = roundWorld(x - shape.startX)
      return { ...shape, size }
    }
    case 'rectangle': {
      if (handle === 'nw' || handle === 'n' || handle === 'w') {
        const x2 = shape.startX + shape.width
        const y2 = shape.startY + shape.height
        return {
          ...shape,
          startX: x,
          startY: y,
          width: roundWorld(x2 - x),
          height: roundWorld(y2 - y),
        }
      }
      return {
        ...shape,
        width: roundWorld(x - shape.startX),
        height: roundWorld(y - shape.startY),
      }
    }
    default:
      return shape
  }
}

/**
 * @param {import('./rangeLayoutMetrics').TacticalArrow} arrow
 * @param {TransformHandle} handle
 * @param {number} wx
 * @param {number} wy
 * @param {number} width
 * @param {number} height
 */
export function updateArrowFromViewDrag(arrow, handle, wx, wy, width, height) {
  const meter = viewToMeter(wx, wy, width, height)
  if (handle === 'p1') {
    return { ...arrow, x1: roundMeter(meter.x), y1: roundMeter(meter.y) }
  }
  if (handle === 'p2') {
    return { ...arrow, x2: roundMeter(meter.x), y2: roundMeter(meter.y) }
  }
  return arrow
}

/**
 * @param {import('./rangeLayoutMetrics').TacticalArrow} arrow
 * @param {number} dxView
 * @param {number} dyView
 * @param {number} width
 * @param {number} height
 */
/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @param {number} zoom
 */
export function drawLineEndpointHandles(ctx, x1, y1, x2, y2, zoom) {
  const r = handleRadiusWorld(zoom) * 0.9
  ctx.save()
  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)'
  ctx.strokeStyle = 'rgba(34, 197, 94, 0.95)'
  ctx.lineWidth = 1
  ctx.shadowBlur = 8
  ctx.shadowColor = '#22c55e'
  for (const [px, py] of [
    [x1, y1],
    [x2, y2],
  ]) {
    ctx.fillRect(px - r, py - r, r * 2, r * 2)
    ctx.strokeRect(px - r, py - r, r * 2, r * 2)
  }
  ctx.restore()
}

export function translateArrowInView(arrow, dxView, dyView, width, height) {
  const m = layoutCanvasMetrics(width, height)
  const dMeterX = dxView / m.scaleX
  const dMeterY = dyView / m.scaleY
  return {
    ...arrow,
    x1: roundMeter(arrow.x1 + dMeterX),
    y1: roundMeter(arrow.y1 + dMeterY),
    x2: roundMeter(arrow.x2 + dMeterX),
    y2: roundMeter(arrow.y2 + dMeterY),
  }
}
