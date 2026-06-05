/** World-space grid spacing (layout view coordinates, px). */
export const WORLD_GRID_SPACING = 48

export const DEFAULT_PRIMITIVE_COLOR = 'rgba(34, 211, 238, 0.88)'

/** @typedef {'line' | 'circle' | 'triangle' | 'square' | 'rectangle'} PrimitiveShapeType */

/**
 * @typedef {Object} DrawnShapeBase
 * @property {string} id
 * @property {PrimitiveShapeType} type
 * @property {number} strokeWidth
 * @property {string} color
 */

/**
 * @typedef {DrawnShapeBase & { type: 'line'; startX: number; startY: number; endX: number; endY: number }} LineShape
 */

/**
 * @typedef {DrawnShapeBase & { type: 'circle'; startX: number; startY: number; radius: number }} CircleShape
 */

/**
 * @typedef {DrawnShapeBase & { type: 'triangle'; x1: number; y1: number; x2: number; y2: number; x3: number; y3: number }} TriangleShape
 */

/**
 * @typedef {DrawnShapeBase & { type: 'square'; startX: number; startY: number; size: number }} SquareShape
 */

/**
 * @typedef {DrawnShapeBase & { type: 'rectangle'; startX: number; startY: number; width: number; height: number }} RectangleShape
 */

/** @typedef {LineShape | CircleShape | TriangleShape | SquareShape | RectangleShape} DrawnShape */

/** @type {PrimitiveShapeType[]} */
export const PRIMITIVE_DRAW_MODES = ['line', 'circle', 'triangle', 'square', 'rectangle']

/**
 * @param {string} mode
 */
export function isPrimitiveDrawMode(mode) {
  return PRIMITIVE_DRAW_MODES.includes(mode)
}

/**
 * @param {string} mode
 */
export function isCanvasDrawMode(mode) {
  return mode === 'arrow' || isPrimitiveDrawMode(mode)
}

/**
 * @param {number} n
 */
export function roundWorld(n) {
  return Math.round(n * 10) / 10
}

/**
 * @param {PrimitiveShapeType} type
 * @param {number} startX
 * @param {number} startY
 * @param {number} strokeWidth
 * @param {string} [color]
 * @returns {DrawnShape}
 */
export function createShapeDraft(type, startX, startY, strokeWidth, color = DEFAULT_PRIMITIVE_COLOR) {
  const base = {
    id: 'preview',
    type,
    strokeWidth,
    color,
  }
  switch (type) {
    case 'line':
      return { ...base, type: 'line', startX, startY, endX: startX, endY: startY }
    case 'circle':
      return { ...base, type: 'circle', startX, startY, radius: 0 }
    case 'triangle':
      return { ...base, type: 'triangle', x1: startX, y1: startY, x2: startX, y2: startY, x3: startX, y3: startY }
    case 'square':
      return { ...base, type: 'square', startX, startY, size: 0 }
    case 'rectangle':
      return { ...base, type: 'rectangle', startX, startY, width: 0, height: 0 }
    default:
      return { ...base, type: 'line', startX, startY, endX: startX, endY: startY }
  }
}

/**
 * @param {DrawnShape} draft
 * @param {number} currentX
 * @param {number} currentY
 * @returns {DrawnShape}
 */
export function updateShapeDraft(draft, currentX, currentY) {
  const cx = roundWorld(currentX)
  const cy = roundWorld(currentY)
  switch (draft.type) {
    case 'line':
      return { ...draft, endX: cx, endY: cy }
    case 'circle': {
      const r = Math.hypot(cx - draft.startX, cy - draft.startY)
      return { ...draft, radius: roundWorld(r) }
    }
    case 'triangle': {
      const dx = cx - draft.x1
      const dy = cy - draft.y1
      const halfW = dx / 2
      return {
        ...draft,
        x1: draft.x1,
        y1: draft.y1,
        x2: roundWorld(draft.x1 - halfW),
        y2: roundWorld(draft.y1 + dy),
        x3: roundWorld(draft.x1 + halfW),
        y3: roundWorld(draft.y1 + dy),
      }
    }
    case 'square': {
      const w = cx - draft.startX
      const h = cy - draft.startY
      const mag = Math.max(Math.abs(w), Math.abs(h))
      const sign = w === 0 && h === 0 ? 1 : Math.sign(w || h)
      return { ...draft, size: roundWorld(mag * sign) }
    }
    case 'rectangle':
      return {
        ...draft,
        width: roundWorld(cx - draft.startX),
        height: roundWorld(cy - draft.startY),
      }
    default:
      return draft
  }
}

/**
 * @param {DrawnShape} draft
 * @returns {DrawnShape | null}
 */
export function finalizeShapeDraft(draft) {
  if (draft.id === 'preview') {
    const id = `shape_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    return { ...draft, id }
  }
  return draft
}

/**
 * @param {DrawnShape} shape
 */
export function isShapeValid(shape) {
  switch (shape.type) {
    case 'line':
      return Math.hypot(shape.endX - shape.startX, shape.endY - shape.startY) >= 4
    case 'circle':
      return shape.radius >= 3
    case 'triangle':
      return (
        Math.hypot(shape.x2 - shape.x1, shape.y2 - shape.y1) >= 4 ||
        Math.hypot(shape.x3 - shape.x2, shape.y3 - shape.y2) >= 4
      )
    case 'square':
      return Math.abs(shape.size) >= 4
    case 'rectangle':
      return Math.abs(shape.width) >= 4 || Math.abs(shape.height) >= 4
    default:
      return false
  }
}

/**
 * @param {DrawnShape} shape
 */
export function getShapeBounds(shape) {
  switch (shape.type) {
    case 'line':
      return {
        minX: Math.min(shape.startX, shape.endX),
        maxX: Math.max(shape.startX, shape.endX),
        minY: Math.min(shape.startY, shape.endY),
        maxY: Math.max(shape.startY, shape.endY),
      }
    case 'circle':
      return {
        minX: shape.startX - shape.radius,
        maxX: shape.startX + shape.radius,
        minY: shape.startY - shape.radius,
        maxY: shape.startY + shape.radius,
      }
    case 'triangle': {
      const xs = [shape.x1, shape.x2, shape.x3]
      const ys = [shape.y1, shape.y2, shape.y3]
      return {
        minX: Math.min(...xs),
        maxX: Math.max(...xs),
        minY: Math.min(...ys),
        maxY: Math.max(...ys),
      }
    }
    case 'square': {
      const x2 = shape.startX + shape.size
      const y2 = shape.startY + shape.size
      return {
        minX: Math.min(shape.startX, x2),
        maxX: Math.max(shape.startX, x2),
        minY: Math.min(shape.startY, y2),
        maxY: Math.max(shape.startY, y2),
      }
    }
    case 'rectangle': {
      const x2 = shape.startX + shape.width
      const y2 = shape.startY + shape.height
      return {
        minX: Math.min(shape.startX, x2),
        maxX: Math.max(shape.startX, x2),
        minY: Math.min(shape.startY, y2),
        maxY: Math.max(shape.startY, y2),
      }
    }
    default:
      return { minX: 0, maxX: 0, minY: 0, maxY: 0 }
  }
}

/**
 * @param {{ minX: number; maxX: number; minY: number; maxY: number }} a
 * @param {{ minX: number; maxX: number; minY: number; maxY: number }} b
 */
function boundsOverlap(a, b) {
  return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY
}

/**
 * @param {DrawnShape[]} shapes
 * @param {{ x1: number; y1: number; x2: number; y2: number }} box
 * @returns {string[]}
 */
export function getShapeIdsInCanvasRect(shapes, box) {
  const sel = {
    minX: Math.min(box.x1, box.x2),
    maxX: Math.max(box.x1, box.x2),
    minY: Math.min(box.y1, box.y2),
    maxY: Math.max(box.y1, box.y2),
  }
  return shapes
    .filter((s) => boundsOverlap(getShapeBounds(s), sel))
    .map((s) => s.id)
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {DrawnShape} shape
 * @param {{ draft?: boolean; selected?: boolean }} [opts]
 */
export function drawDrawnShape(ctx, shape, opts = {}) {
  const { draft = false, selected = false } = opts
  const stroke = shape.color || DEFAULT_PRIMITIVE_COLOR
  const lw = shape.strokeWidth || 2

  ctx.save()
  ctx.strokeStyle = stroke
  ctx.fillStyle = draft ? 'rgba(34, 211, 238, 0.12)' : 'rgba(34, 211, 238, 0.18)'
  ctx.lineWidth = lw
  ctx.shadowBlur = selected ? 12 : draft ? 8 : 5
  ctx.shadowColor = selected ? '#22c55e' : stroke
  ctx.setLineDash(draft ? [5, 4] : [])

  switch (shape.type) {
    case 'line':
      ctx.beginPath()
      ctx.moveTo(shape.startX, shape.startY)
      ctx.lineTo(shape.endX, shape.endY)
      ctx.stroke()
      break
    case 'circle':
      ctx.beginPath()
      ctx.arc(shape.startX, shape.startY, Math.max(0, shape.radius), 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      break
    case 'triangle':
      ctx.beginPath()
      ctx.moveTo(shape.x1, shape.y1)
      ctx.lineTo(shape.x2, shape.y2)
      ctx.lineTo(shape.x3, shape.y3)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      break
    case 'square': {
      const size = shape.size
      ctx.beginPath()
      ctx.rect(shape.startX, shape.startY, size, size)
      ctx.fill()
      ctx.stroke()
      break
    }
    case 'rectangle':
      ctx.beginPath()
      ctx.rect(shape.startX, shape.startY, shape.width, shape.height)
      ctx.fill()
      ctx.stroke()
      break
    default:
      break
  }

  if (selected) {
    const b = getShapeBounds(shape)
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.9)'
    ctx.lineWidth = 1
    ctx.setLineDash([3, 2])
    ctx.shadowBlur = 0
    ctx.strokeRect(b.minX - 4, b.minY - 4, b.maxX - b.minX + 8, b.maxY - b.minY + 8)
  }

  ctx.restore()
}
