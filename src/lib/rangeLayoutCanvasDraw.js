import { getRangeAssetDef, RANGE_HEIGHT_M, RANGE_WIDTH_M } from './rangeLayoutAssets'
import { WORLD_GRID_SPACING } from './rangeLayoutPrimitives'

const AXIS_PAD = 28
const GRID_STEP_M = 5
const HUD_GLOW = '#22c55e'

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width
 * @param {number} height
 */
export function layoutCanvasMetrics(width, height) {
  const plotW = width - AXIS_PAD * 2
  const plotH = height - AXIS_PAD * 2
  const scaleX = plotW / RANGE_WIDTH_M
  const scaleY = plotH / RANGE_HEIGHT_M
  return { AXIS_PAD, plotW, plotH, scaleX, scaleY }
}

/**
 * @param {number} mx
 * @param {number} my
 * @param {{ scaleX: number; scaleY: number; AXIS_PAD: number }} m
 */
export function meterToCanvas(mx, my, m) {
  return {
    cx: m.AXIS_PAD + mx * m.scaleX,
    cy: m.AXIS_PAD + my * m.scaleY,
  }
}

/**
 * @param {number} cx
 * @param {number} cy
 * @param {{ scaleX: number; scaleY: number; AXIS_PAD: number }} m
 */
export function canvasToMeter(cx, cy, m, opts = {}) {
  const { clamp = false } = opts
  const x = (cx - m.AXIS_PAD) / m.scaleX
  const y = (cy - m.AXIS_PAD) / m.scaleY
  if (clamp) {
    return {
      x: Math.max(0, Math.min(RANGE_WIDTH_M, x)),
      y: Math.max(0, Math.min(RANGE_HEIGHT_M, y)),
    }
  }
  return { x, y }
}

/**
 * Visible layout-view bounds inside an applied pan/zoom transform.
 * @param {number} width
 * @param {number} height
 * @param {{ x: number; y: number }} pan
 * @param {number} zoom
 */
export function getViewportViewBounds(width, height, pan, zoom) {
  const z = zoom || 1
  return {
    minX: -pan.x / z,
    maxX: (width - pan.x) / z,
    minY: -pan.y / z,
    maxY: (height - pan.y) / z,
  }
}

/**
 * Boundless infinite grid in world (layout-view) coordinates.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width
 * @param {number} height
 * @param {{ pan?: { x: number; y: number }; zoom?: number }} [opts]
 */
export function drawInfiniteGrid(ctx, width, height, opts = {}) {
  const pan = opts.pan ?? { x: 0, y: 0 }
  const zoom = opts.zoom ?? 1
  const { minX, maxX, minY, maxY } = getViewportViewBounds(width, height, pan, zoom)

  const viewW = maxX - minX
  const viewH = maxY - minY
  if (viewW <= 0 || viewH <= 0) return

  ctx.fillStyle = '#0a0f0a'
  ctx.fillRect(minX, minY, viewW, viewH)

  const spacing = WORLD_GRID_SPACING
  const pad = 2
  const startIx = Math.floor(minX / spacing) - pad
  const endIx = Math.ceil(maxX / spacing) + pad
  const startIy = Math.floor(minY / spacing) - pad
  const endIy = Math.ceil(maxY / spacing) + pad

  ctx.strokeStyle = 'rgba(34, 197, 94, 0.08)'
  ctx.lineWidth = 1
  ctx.setLineDash([])

  for (let i = startIx; i <= endIx; i += 1) {
    const x = i * spacing
    ctx.beginPath()
    ctx.moveTo(x, minY)
    ctx.lineTo(x, maxY)
    ctx.stroke()
  }

  for (let j = startIy; j <= endIy; j += 1) {
    const y = j * spacing
    ctx.beginPath()
    ctx.moveTo(minX, y)
    ctx.lineTo(maxX, y)
    ctx.stroke()
  }

  const majorEvery = 5
  ctx.strokeStyle = 'rgba(34, 197, 94, 0.12)'
  for (let i = startIx; i <= endIx; i += majorEvery) {
    const x = i * spacing
    ctx.beginPath()
    ctx.moveTo(x, minY)
    ctx.lineTo(x, maxY)
    ctx.stroke()
  }
  for (let j = startIy; j <= endIy; j += majorEvery) {
    const y = j * spacing
    ctx.beginPath()
    ctx.moveTo(minX, y)
    ctx.lineTo(maxX, y)
    ctx.stroke()
  }
}

/**
 * Infinite workspace background only (no polygon boundary).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width
 * @param {number} height
 * @param {{ pan?: { x: number; y: number }; zoom?: number }} [opts]
 */
export function drawRangeGrid(ctx, width, height, opts = {}) {
  const { pan = { x: 0, y: 0 }, zoom = 1 } = opts
  drawInfiniteGrid(ctx, width, height, { pan, zoom })
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ selected?: boolean; accent?: string; lineWidth?: number }} opts
 */
function applyHudGlow(ctx, opts = {}) {
  const { selected = false, accent = HUD_GLOW, lineWidth = 1.5 } = opts
  ctx.lineWidth = lineWidth
  ctx.strokeStyle = accent
  ctx.shadowBlur = selected ? 10 : 4
  ctx.shadowColor = HUD_GLOW
}

/**
 * @param {CanvasRenderingContext2D} ctx
 */
function clearHudGlow(ctx) {
  ctx.shadowBlur = 0
  ctx.setLineDash([])
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx
 * @param {number} cy
 * @param {number} s
 * @param {string} stroke
 * @param {boolean} selected
 */
function drawHumanSilhouette(ctx, cx, cy, s, stroke, selected) {
  applyHudGlow(ctx, { selected, accent: stroke, lineWidth: selected ? 2 : 1.5 })
  ctx.fillStyle = 'rgba(251, 191, 36, 0.28)'
  ctx.beginPath()
  ctx.ellipse(cx, cy + s * 0.15, s * 0.95, s * 0.55, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = 'rgba(251, 191, 36, 0.4)'
  ctx.beginPath()
  ctx.arc(cx, cy - s * 0.55, s * 0.38, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(cx - s * 0.35, cy - s * 0.35)
  ctx.lineTo(cx + s * 0.2, cy - s * 0.75)
  ctx.stroke()
  clearHudGlow(ctx)
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx
 * @param {number} cy
 * @param {number} s
 * @param {string} stroke
 * @param {boolean} selected
 */
function drawSilhouettePaper(ctx, cx, cy, s, stroke, selected) {
  drawHumanSilhouette(ctx, cx, cy, s, stroke, selected)
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx
 * @param {number} cy
 * @param {number} s
 * @param {string} stroke
 * @param {boolean} selected
 */
function drawSteelPopper(ctx, cx, cy, s, stroke, selected) {
  applyHudGlow(ctx, { selected, accent: stroke, lineWidth: 2 })
  ctx.fillStyle = 'rgba(251, 146, 60, 0.35)'
  ctx.beginPath()
  ctx.arc(cx, cy - s * 0.15, s * 0.62, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  ctx.strokeStyle = 'rgba(161, 161, 170, 0.9)'
  ctx.lineWidth = selected ? 2.5 : 2
  ctx.beginPath()
  ctx.moveTo(cx, cy + s * 0.35)
  ctx.lineTo(cx, cy + s * 0.95)
  ctx.moveTo(cx - s * 0.45, cy + s * 0.95)
  ctx.lineTo(cx + s * 0.45, cy + s * 0.95)
  ctx.stroke()
  clearHudGlow(ctx)
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx
 * @param {number} cy
 * @param {number} s
 * @param {string} stroke
 * @param {boolean} selected
 */
function drawMovingTarget(ctx, cx, cy, s, stroke, selected) {
  drawHumanSilhouette(ctx, cx, cy - s * 0.35, s * 0.85, stroke, selected)

  applyHudGlow(ctx, { selected, accent: stroke, lineWidth: 1 })
  ctx.setLineDash([3, 3])
  const trackY = cy + s * 1.05
  ctx.beginPath()
  ctx.moveTo(cx - s * 1.35, trackY)
  ctx.lineTo(cx + s * 1.35, trackY)
  ctx.stroke()

  ctx.setLineDash([])
  ctx.fillStyle = stroke
  ctx.beginPath()
  ctx.moveTo(cx - s * 1.2, trackY)
  ctx.lineTo(cx - s * 1.45, trackY - s * 0.12)
  ctx.lineTo(cx - s * 1.45, trackY + s * 0.12)
  ctx.closePath()
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(cx + s * 1.2, trackY)
  ctx.lineTo(cx + s * 1.45, trackY - s * 0.12)
  ctx.lineTo(cx + s * 1.45, trackY + s * 0.12)
  ctx.closePath()
  ctx.fill()
  clearHudGlow(ctx)
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 */
function fillConcreteHatch(ctx, x, y, w, h) {
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  ctx.clip()
  ctx.fillStyle = 'rgba(63, 63, 70, 0.75)'
  ctx.fillRect(x, y, w, h)
  ctx.strokeStyle = 'rgba(24, 24, 27, 0.85)'
  ctx.lineWidth = 1
  const step = 5
  for (let i = -h; i < w + h; i += step) {
    ctx.beginPath()
    ctx.moveTo(x + i, y)
    ctx.lineTo(x + i + h, y + h)
    ctx.stroke()
  }
  ctx.restore()
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx
 * @param {number} cy
 * @param {number} s
 * @param {string} stroke
 * @param {boolean} selected
 */
function drawConcreteWall(ctx, cx, cy, s, stroke, selected) {
  const w = s * 2.1
  const h = s * 0.95
  const x = cx - w / 2
  const y = cy - h / 2
  fillConcreteHatch(ctx, x, y, w, h)
  applyHudGlow(ctx, { selected, accent: stroke, lineWidth: selected ? 2.5 : 2 })
  ctx.strokeRect(x, y, w, h)
  clearHudGlow(ctx)
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx
 * @param {number} cy
 * @param {number} s
 * @param {string} stroke
 * @param {boolean} selected
 */
function drawTireStack(ctx, cx, cy, s, stroke, selected) {
  const radii = [s * 0.72, s * 0.58, s * 0.44]
  const offsets = [
    { x: -s * 0.22, y: -s * 0.08 },
    { x: s * 0.18, y: s * 0.12 },
    { x: -s * 0.05, y: s * 0.28 },
  ]
  radii.forEach((r, i) => {
    const ox = cx + offsets[i].x
    const oy = cy + offsets[i].y
    applyHudGlow(ctx, { selected, accent: stroke, lineWidth: 1.5 })
    ctx.fillStyle = 'rgba(82, 82, 91, 0.45)'
    ctx.beginPath()
    ctx.arc(ox, oy, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.strokeStyle = 'rgba(39, 39, 42, 0.9)'
    ctx.lineWidth = 1
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
      ctx.beginPath()
      ctx.moveTo(ox, oy)
      ctx.lineTo(ox + Math.cos(a) * r, oy + Math.sin(a) * r)
      ctx.stroke()
    }
    clearHudGlow(ctx)
  })
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx
 * @param {number} cy
 * @param {number} s
 * @param {string} stroke
 * @param {boolean} selected
 */
function drawSandbagBarrier(ctx, cx, cy, s, stroke, selected) {
  const bags = 5
  applyHudGlow(ctx, { selected, accent: stroke, lineWidth: 1.5 })
  for (let i = 0; i < bags; i += 1) {
    const t = (i - (bags - 1) / 2) / ((bags - 1) / 2)
    const bx = cx + t * s * 1.1
    const by = cy + Math.abs(t) * s * 0.15
    ctx.fillStyle = 'rgba(161, 98, 7, 0.35)'
    ctx.beginPath()
    ctx.ellipse(bx, by, s * 0.42, s * 0.28, t * 0.25, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(bx - s * 0.15, by)
    ctx.lineTo(bx + s * 0.15, by)
    ctx.stroke()
  }
  clearHudGlow(ctx)
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx
 * @param {number} cy
 * @param {number} s
 * @param {string} stroke
 * @param {boolean} selected
 * @param {'center' | 'corner'} variant
 */
function drawRoomModule(ctx, cx, cy, s, stroke, selected, variant) {
  const w = s * 2.4
  const h = s * 1.85
  const x0 = cx - w / 2
  const y0 = cy - h / 2
  const thick = selected ? 3.5 : 2.5

  applyHudGlow(ctx, { selected, accent: stroke, lineWidth: thick })
  ctx.fillStyle = 'rgba(34, 197, 94, 0.08)'

  ctx.beginPath()
  if (variant === 'corner') {
    ctx.moveTo(x0, y0)
    ctx.lineTo(x0 + w, y0)
    ctx.lineTo(x0 + w, y0 + h)
    ctx.lineTo(x0, y0 + h)
    ctx.closePath()
  } else {
    ctx.rect(x0, y0, w, h)
  }
  ctx.fill()

  const doorW = s * 0.55
  ctx.strokeStyle = stroke
  ctx.lineWidth = thick
  ctx.beginPath()
  ctx.moveTo(x0, y0)
  ctx.lineTo(x0 + w * 0.35, y0)
  ctx.moveTo(x0 + w * 0.35 + doorW, y0)
  ctx.lineTo(x0 + w, y0)
  ctx.lineTo(x0 + w, y0 + h)
  ctx.lineTo(x0, y0 + h)
  ctx.lineTo(x0, y0)
  ctx.stroke()

  const arcX = variant === 'corner' ? x0 + w * 0.35 : x0 + w * 0.35 + doorW / 2
  const arcY = y0
  const arcR = doorW * 0.95
  ctx.beginPath()
  ctx.arc(arcX, arcY, arcR, 0, Math.PI / 2)
  ctx.stroke()

  if (variant === 'corner') {
    ctx.beginPath()
    ctx.moveTo(x0, y0 + h * 0.4)
    ctx.lineTo(x0, y0 + h * 0.4 + doorW)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(x0, y0 + h * 0.4, doorW * 0.9, Math.PI / 2, 0)
    ctx.stroke()
  }

  clearHudGlow(ctx)
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx
 * @param {number} cy
 * @param {number} s
 * @param {string} stroke
 * @param {boolean} selected
 */
function drawLShapeWall(ctx, cx, cy, s, stroke, selected) {
  const thick = selected ? 3.5 : 2.5
  applyHudGlow(ctx, { selected, accent: stroke, lineWidth: thick })
  ctx.fillStyle = 'rgba(34, 197, 94, 0.1)'
  ctx.beginPath()
  ctx.moveTo(cx - s, cy + s)
  ctx.lineTo(cx - s, cy - s * 0.2)
  ctx.lineTo(cx + s * 1.1, cy - s * 0.2)
  ctx.lineTo(cx + s * 1.1, cy - s * 0.55)
  ctx.lineTo(cx - s * 0.35, cy - s * 0.55)
  ctx.lineTo(cx - s * 0.35, cy + s)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = stroke
  ctx.beginPath()
  ctx.arc(cx - s, cy - s * 0.2, s * 0.18, 0, Math.PI * 2)
  ctx.fill()
  clearHudGlow(ctx)
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx
 * @param {number} cy
 * @param {number} s
 * @param {string} stroke
 * @param {boolean} selected
 */
function drawCorridorModule(ctx, cx, cy, s, stroke, selected) {
  const thick = selected ? 3 : 2
  const gap = s * 0.85
  applyHudGlow(ctx, { selected, accent: stroke, lineWidth: thick })
  ctx.fillStyle = 'rgba(34, 197, 94, 0.06)'
  ctx.fillRect(cx - s * 1.35, cy - gap / 2, s * 2.7, gap)

  ctx.beginPath()
  ctx.moveTo(cx - s * 1.35, cy - gap / 2 - thick)
  ctx.lineTo(cx + s * 1.35, cy - gap / 2 - thick)
  ctx.moveTo(cx - s * 1.35, cy + gap / 2 + thick)
  ctx.lineTo(cx + s * 1.35, cy + gap / 2 + thick)
  ctx.stroke()

  ctx.setLineDash([2, 4])
  ctx.beginPath()
  ctx.moveTo(cx - s * 1.1, cy)
  ctx.lineTo(cx + s * 1.1, cy)
  ctx.stroke()
  clearHudGlow(ctx)
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx
 * @param {number} cy
 * @param {number} s
 * @param {boolean} selected
 */
function drawLaserGate(ctx, cx, cy, s, selected) {
  const span = s * 2.2
  const drawTripod = (/** @type {number} */ tx) => {
    applyHudGlow(ctx, { selected, accent: '#22c55e', lineWidth: 1.5 })
    ctx.fillStyle = 'rgba(34, 197, 94, 0.35)'
    ctx.beginPath()
    ctx.moveTo(tx, cy + s * 0.35)
    ctx.lineTo(tx - s * 0.22, cy - s * 0.15)
    ctx.lineTo(tx + s * 0.22, cy - s * 0.15)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(tx, cy - s * 0.15)
    ctx.lineTo(tx, cy - s * 0.55)
    ctx.stroke()
    clearHudGlow(ctx)
  }

  drawTripod(cx - span)
  drawTripod(cx + span)

  ctx.save()
  ctx.shadowBlur = selected ? 8 : 5
  ctx.shadowColor = '#ef4444'
  ctx.strokeStyle = '#f87171'
  ctx.lineWidth = 1.5
  ctx.setLineDash([4, 4])
  ctx.beginPath()
  ctx.moveTo(cx - span + s * 0.15, cy - s * 0.35)
  ctx.lineTo(cx + span - s * 0.15, cy - s * 0.35)
  ctx.stroke()
  ctx.restore()
  clearHudGlow(ctx)
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx
 * @param {number} cy
 * @param {number} s
 * @param {string} stroke
 * @param {boolean} selected
 */
function drawSmokeGenerator(ctx, cx, cy, s, stroke, selected) {
  applyHudGlow(ctx, { selected, accent: stroke, lineWidth: 1.5 })
  ctx.fillStyle = 'rgba(113, 113, 122, 0.55)'
  ctx.fillRect(cx - s * 0.55, cy + s * 0.05, s * 1.1, s * 0.55)
  ctx.strokeRect(cx - s * 0.55, cy + s * 0.05, s * 1.1, s * 0.55)
  clearHudGlow(ctx)

  for (let i = 1; i <= 3; i += 1) {
    const alpha = 0.35 - i * 0.08
    ctx.strokeStyle = `rgba(161, 161, 170, ${alpha})`
    ctx.lineWidth = 1.5
    ctx.shadowBlur = 3
    ctx.shadowColor = HUD_GLOW
    ctx.beginPath()
    ctx.arc(cx, cy - s * 0.15, s * (0.35 + i * 0.28), Math.PI * 1.05, Math.PI * 1.95)
    ctx.stroke()
  }
  clearHudGlow(ctx)
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx
 * @param {number} cy
 * @param {number} s
 * @param {string} stroke
 * @param {boolean} selected
 */
function drawStrobeLight(ctx, cx, cy, s, stroke, selected) {
  applyHudGlow(ctx, { selected, accent: stroke, lineWidth: 1.5 })
  ctx.fillStyle = 'rgba(192, 132, 252, 0.35)'
  ctx.fillRect(cx - s * 0.2, cy, s * 0.4, s * 0.75)
  ctx.strokeRect(cx - s * 0.2, cy, s * 0.4, s * 0.75)
  ctx.fillStyle = 'rgba(250, 204, 21, 0.5)'
  ctx.beginPath()
  ctx.arc(cx, cy - s * 0.05, s * 0.22, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2
    ctx.beginPath()
    ctx.moveTo(cx + Math.cos(a) * s * 0.28, cy - s * 0.05 + Math.sin(a) * s * 0.28)
    ctx.lineTo(cx + Math.cos(a) * s * 0.55, cy - s * 0.05 + Math.sin(a) * s * 0.55)
    ctx.stroke()
  }
  clearHudGlow(ctx)
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx
 * @param {number} cy
 * @param {number} s
 * @param {string} stroke
 * @param {boolean} selected
 */
function drawSpeakerArray(ctx, cx, cy, s, stroke, selected) {
  applyHudGlow(ctx, { selected, accent: stroke, lineWidth: 1.5 })
  ctx.fillStyle = 'rgba(167, 139, 250, 0.3)'
  ctx.fillRect(cx - s * 0.75, cy - s * 0.35, s * 1.5, s * 0.7)
  ctx.strokeRect(cx - s * 0.75, cy - s * 0.35, s * 1.5, s * 0.7)
  ctx.strokeStyle = stroke
  for (let i = 0; i < 3; i += 1) {
    ctx.beginPath()
    ctx.arc(cx + s * 0.95, cy, s * (0.25 + i * 0.18), -Math.PI / 3, Math.PI / 3)
    ctx.stroke()
  }
  clearHudGlow(ctx)
}

/** @type {Record<string, (ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, stroke: string, selected: boolean) => void>} */
const TACTICAL_DRAWERS = {
  silhouette_paper: drawSilhouettePaper,
  steel_popper: drawSteelPopper,
  moving_target: drawMovingTarget,
  concrete_wall: drawConcreteWall,
  tire_stack: drawTireStack,
  sandbag_barrier: drawSandbagBarrier,
  center_fed_room: (ctx, cx, cy, s, stroke, sel) => drawRoomModule(ctx, cx, cy, s, stroke, sel, 'center'),
  corner_fed_room: (ctx, cx, cy, s, stroke, sel) => drawRoomModule(ctx, cx, cy, s, stroke, sel, 'corner'),
  l_shape_wall: drawLShapeWall,
  corridor_module: drawCorridorModule,
  laser_gate: (ctx, cx, cy, s, _stroke, sel) => drawLaserGate(ctx, cx, cy, s, sel),
  smoke_generator: drawSmokeGenerator,
  strobe_light: drawStrobeLight,
  speaker_array: drawSpeakerArray,
}

/** @type {Record<string, number>} */
export const HIT_RADIUS_BY_CATEGORY = {
  targets: 18,
  cover: 20,
  cqb: 22,
  special: 16,
}

/**
 * Clean semi-translucent geometric shapes by asset category.
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('./rangeLayoutMetrics').CanvasLayoutObject} obj
 * @param {number} cx
 * @param {number} cy
 * @param {number} s
 * @param {boolean} selected
 */
function drawGeometricObject(ctx, obj, cx, cy, s, selected) {
  const cat = obj.category || 'special'
  const w = s * 1.55
  const h = s * 1.15

  if (cat === 'targets') {
    const useCircle = obj.type === 'steel_popper'
    applyHudGlow(ctx, { selected, accent: '#fbbf24', lineWidth: 1.5 })
    ctx.fillStyle = 'rgba(251, 191, 36, 0.42)'
    ctx.strokeStyle = '#fb923c'
    if (useCircle) {
      ctx.beginPath()
      ctx.arc(cx, cy, s * 0.95, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    } else {
      ctx.beginPath()
      ctx.moveTo(cx, cy - s)
      ctx.lineTo(cx + s * 0.92, cy + s * 0.75)
      ctx.lineTo(cx - s * 0.92, cy + s * 0.75)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    }
    clearHudGlow(ctx)
    return
  }

  if (cat === 'cover') {
    applyHudGlow(ctx, { selected, accent: '#94a3b8', lineWidth: 1.5 })
    ctx.fillStyle = 'rgba(100, 116, 139, 0.5)'
    ctx.strokeStyle = '#64748b'
    ctx.fillRect(cx - w / 2, cy - h / 2, w, h)
    ctx.strokeRect(cx - w / 2, cy - h / 2, w, h)
    if (obj.type === 'concrete_wall') {
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.35)'
      ctx.lineWidth = 1
      for (let i = -w; i < w + h; i += 5) {
        ctx.beginPath()
        ctx.moveTo(cx - w / 2 + i, cy - h / 2)
        ctx.lineTo(cx - w / 2 + i - h, cy + h / 2)
        ctx.stroke()
      }
    }
    clearHudGlow(ctx)
    return
  }

  if (cat === 'cqb') {
    applyHudGlow(ctx, { selected, accent: HUD_GLOW, lineWidth: 2.5 })
    ctx.fillStyle = 'rgba(34, 197, 94, 0.08)'
    ctx.strokeStyle = HUD_GLOW
    const outer = s * 1.65
    ctx.fillRect(cx - outer / 2, cy - outer / 2, outer, outer)
    ctx.strokeRect(cx - outer / 2, cy - outer / 2, outer, outer)
    ctx.lineWidth = 1
    ctx.strokeRect(cx - w / 2, cy - h / 2, w, h)
    clearHudGlow(ctx)
    return
  }

  applyHudGlow(ctx, { selected, accent: '#22d3ee', lineWidth: 1.5 })
  ctx.fillStyle = 'rgba(34, 211, 238, 0.38)'
  ctx.strokeStyle = '#22d3ee'
  ctx.beginPath()
  ctx.moveTo(cx, cy - s)
  ctx.lineTo(cx + s, cy)
  ctx.lineTo(cx, cy + s)
  ctx.lineTo(cx - s, cy)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  clearHudGlow(ctx)
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ x1: number; y1: number; x2: number; y2: number }} box
 */
export function drawSelectionBox(ctx, box) {
  const x = Math.min(box.x1, box.x2)
  const y = Math.min(box.y1, box.y2)
  const w = Math.abs(box.x2 - box.x1)
  const h = Math.abs(box.y2 - box.y1)
  ctx.save()
  ctx.fillStyle = 'rgba(34, 197, 94, 0.12)'
  ctx.strokeStyle = 'rgba(34, 197, 94, 0.85)'
  ctx.lineWidth = 1
  ctx.setLineDash([4, 3])
  ctx.shadowBlur = 6
  ctx.shadowColor = HUD_GLOW
  ctx.fillRect(x, y, w, h)
  ctx.strokeRect(x, y, w, h)
  ctx.restore()
}

/** @type {Record<string, { stroke: string; lineWidth: number; dash: number[] }>} */
export const TACTICAL_ARROW_STYLES = {
  infiltration: { stroke: '#22d3ee', lineWidth: 2, dash: [6, 4] },
  fire_line: { stroke: '#ff3355', lineWidth: 2.5, dash: [] },
  evac: { stroke: '#fbbf24', lineWidth: 2, dash: [4, 4] },
}

/**
 * Draw arrowhead + shaft in layout view space (call inside viewport transform).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @param {import('./rangeLayoutMetrics').TacticalArrowType} [arrowType]
 * @param {{ draft?: boolean }} [opts]
 */
export function drawTacticalArrowView(ctx, x1, y1, x2, y2, arrowType = 'infiltration', opts = {}) {
  const { draft = false } = opts
  const style = TACTICAL_ARROW_STYLES[arrowType] ?? TACTICAL_ARROW_STYLES.infiltration
  const stroke = draft ? '#ff3355' : style.stroke
  const headLen = draft ? 10 : 12
  const angle = Math.atan2(y2 - y1, x2 - x1)
  const lineEndX = x2 - Math.cos(angle) * headLen
  const lineEndY = y2 - Math.sin(angle) * headLen

  ctx.save()
  ctx.strokeStyle = stroke
  ctx.fillStyle = stroke
  ctx.lineWidth = draft ? 1.5 : style.lineWidth
  ctx.shadowBlur = draft ? 8 : 6
  ctx.shadowColor = stroke
  ctx.setLineDash(draft ? [5, 4] : style.dash)
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(lineEndX, lineEndY)
  ctx.stroke()
  const spread = Math.PI / 7
  ctx.setLineDash([])
  ctx.beginPath()
  ctx.moveTo(x2, y2)
  ctx.lineTo(x2 - headLen * Math.cos(angle - spread), y2 - headLen * Math.sin(angle - spread))
  ctx.lineTo(x2 - headLen * Math.cos(angle + spread), y2 - headLen * Math.sin(angle + spread))
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

/**
 * @param {import('./rangeLayoutMetrics').CanvasLayoutObject[]} objects
 * @param {{ x1: number; y1: number; x2: number; y2: number }} box
 * @param {number} width
 * @param {number} height
 * @returns {string[]}
 */
export function getObjectIdsInCanvasRect(objects, box, width, height) {
  const m = layoutCanvasMetrics(width, height)
  const minX = Math.min(box.x1, box.x2)
  const maxX = Math.max(box.x1, box.x2)
  const minY = Math.min(box.y1, box.y2)
  const maxY = Math.max(box.y1, box.y2)
  return objects
    .filter((obj) => {
      const { cx, cy } = meterToCanvas(obj.x, obj.y, m)
      return cx >= minX && cx <= maxX && cy >= minY && cy <= maxY
    })
    .map((o) => o.id)
}

/**
 * @param {import('./rangeLayoutMetrics').TacticalArrow[]} arrows
 * @param {{ x1: number; y1: number; x2: number; y2: number }} box
 * @param {number} width
 * @param {number} height
 * @returns {string[]}
 */
export function getArrowIdsInCanvasRect(arrows, box, width, height) {
  const m = layoutCanvasMetrics(width, height)
  const minX = Math.min(box.x1, box.x2)
  const maxX = Math.max(box.x1, box.x2)
  const minY = Math.min(box.y1, box.y2)
  const maxY = Math.max(box.y1, box.y2)
  const inBox = (/** @type {number} */ px, /** @type {number} */ py) =>
    px >= minX && px <= maxX && py >= minY && py <= maxY

  return arrows
    .filter((arrow) => {
      const p1 = meterToCanvas(arrow.x1, arrow.y1, m)
      const p2 = meterToCanvas(arrow.x2, arrow.y2, m)
      return inBox(p1.cx, p1.cy) || inBox(p2.cx, p2.cy)
    })
    .map((a) => a.id)
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('./rangeLayoutMetrics').CanvasLayoutObject} obj
 * @param {number} width
 * @param {number} height
 * @param {{ selected?: boolean; readOnly?: boolean }} [opts]
 */
export function drawLayoutObject(ctx, obj, width, height, opts = {}) {
  const { selected = false, readOnly = false } = opts
  const m = layoutCanvasMetrics(width, height)
  const { cx, cy } = meterToCanvas(obj.x, obj.y, m)
  const def = getRangeAssetDef(obj.type)
  const s =
    obj.category === 'cqb' ? 14 : obj.category === 'cover' ? 12 : obj.category === 'special' ? 11 : 10
  const hitR = HIT_RADIUS_BY_CATEGORY[obj.category] ?? 18

  ctx.save()
  if (selected && !readOnly) {
    ctx.shadowColor = 'rgba(34, 197, 94, 0.95)'
    ctx.shadowBlur = 14
    ctx.strokeStyle = HUD_GLOW
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(cx, cy, hitR + 4, 0, Math.PI * 2)
    ctx.stroke()
    ctx.shadowBlur = 0
  }

  drawGeometricObject(ctx, obj, cx, cy, s, selected)

  const customLabel = String(obj.label ?? '').trim()
  if (customLabel) {
    ctx.fillStyle = 'rgba(251, 191, 36, 0.95)'
    ctx.font = '10px monospace'
    ctx.textAlign = 'center'
    ctx.shadowBlur = 3
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)'
    ctx.fillText(customLabel, cx, cy + s * 1.9)
    ctx.shadowBlur = 0
  } else {
    ctx.fillStyle = 'rgba(226, 232, 240, 0.95)'
    ctx.font = 'bold 7px monospace'
    ctx.textAlign = 'center'
    ctx.shadowBlur = 2
    ctx.shadowColor = '#000'
    ctx.fillText(def?.shortLabel ?? '?', cx, cy + s * 1.35)
    ctx.shadowBlur = 0
  }
  ctx.textAlign = 'left'
  ctx.restore()
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('./rangeLayoutMetrics').TacticalArrow} arrow
 * @param {number} width
 * @param {number} height
 * @param {{ draft?: boolean; color?: string }} [opts]
 */
/**
 * Draw arrow from world (range meter) coordinates — converts to view space once.
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('./rangeLayoutMetrics').TacticalArrow} arrow
 * @param {number} width
 * @param {number} height
 * @param {{ draft?: boolean }} [opts]
 */
export function drawTacticalArrow(ctx, arrow, width, height, opts = {}) {
  const { draft = false } = opts
  const m = layoutCanvasMetrics(width, height)
  const p1 = meterToCanvas(arrow.x1, arrow.y1, m)
  const p2 = meterToCanvas(arrow.x2, arrow.y2, m)
  const arrowType = arrow.arrowType ?? 'infiltration'
  drawTacticalArrowView(ctx, p1.cx, p1.cy, p2.cx, p2.cy, arrowType, { draft })
}

/**
 * @param {import('./rangeLayoutMetrics').CanvasLayoutObject[]} objects
 * @param {number} cx
 * @param {number} cy
 * @param {number} width
 * @param {number} height
 */
export function hitTestLayoutObject(objects, cx, cy, width, height) {
  const m = layoutCanvasMetrics(width, height)
  for (let i = objects.length - 1; i >= 0; i -= 1) {
    const obj = objects[i]
    const { cx: ox, cy: oy } = meterToCanvas(obj.x, obj.y, m)
    const radius = HIT_RADIUS_BY_CATEGORY[obj.category] ?? 18
    const dx = cx - ox
    const dy = cy - oy
    if (dx * dx + dy * dy <= radius * radius) return obj
  }
  return null
}
