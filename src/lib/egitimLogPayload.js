import { invNum, invStr } from './inventoryIlws'
import {
  EGITIM_CUSTOM,
  resolveEgitimSelectKey,
  resolveEgitimSelectValue,
} from './egitimOptions'

export const EGITIM_INITIAL_FORM = {
  trainingFocus: '',
  customTrainingFocus: '',
  targetDate: '',
  estimatedDuration: '',
  difficultyLevel: '',
  weaponsReady: false,
  ammoAllocated: false,
  ppeChecked: false,
  tcccKitReady: false,
  status: 'planned',
  operationNote: '',
}

/** @deprecated use EGITIM_INITIAL_FORM */
export const INITIAL_FORM = EGITIM_INITIAL_FORM

/**
 * @param {string | number} raw
 */
function parseDurationMinutes(raw) {
  const text = invStr(raw).trim().replace(',', '.')
  if (!text) return null
  const n = invNum(text)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n)
}

/**
 * @param {string} raw
 */
function parseTargetDate(raw) {
  const text = invStr(raw).trim()
  if (!text) return { iso: null, ms: null, label: null }
  const ms = Date.parse(text)
  if (Number.isNaN(ms)) return { iso: null, ms: null, label: null }
  const iso = new Date(ms).toISOString()
  const label = new Date(ms).toLocaleString('tr-TR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
  return { iso, ms, label }
}

/**
 * @param {{
 *   userId: string
 *   trainingFocus: string
 *   customTrainingFocus?: string
 *   targetDate: string
 *   estimatedDuration: string | number
 *   difficultyLevel: string
 *   weaponsReady: boolean
 *   ammoAllocated: boolean
 *   ppeChecked: boolean
 *   tcccKitReady: boolean
 *   status?: string
 *   operationNote?: string
 * }} input
 */
export function buildEgitimLogPayload({
  userId,
  trainingFocus,
  customTrainingFocus = '',
  targetDate,
  estimatedDuration,
  difficultyLevel,
  weaponsReady,
  ammoAllocated,
  ppeChecked,
  tcccKitReady,
  status = 'planned',
  operationNote = '',
}) {
  const trainingFocusLabel = resolveEgitimSelectValue(trainingFocus, customTrainingFocus)
  const trainingFocusKey = resolveEgitimSelectKey(trainingFocus, customTrainingFocus)
  const difficultyLabel = resolveEgitimSelectValue(difficultyLevel)
  const difficultyKey = invStr(difficultyLevel).trim()

  const target = parseTargetDate(targetDate)
  const durationMin = parseDurationMinutes(estimatedDuration)
  const operationNoteText = invStr(operationNote ?? '').trim()
  const planStatus = invStr(status).trim() || 'planned'
  const timestamp = new Date().toISOString()

  const logisticsReady = [weaponsReady, ammoAllocated, ppeChecked, tcccKitReady].filter(Boolean).length

  const summaryLabel = [trainingFocusLabel, difficultyLabel].filter(Boolean).join(' · ')

  return {
    userId,
    trainingFocus: trainingFocusLabel,
    trainingFocusKey,
    customTrainingFocus:
      trainingFocus === EGITIM_CUSTOM ? invStr(customTrainingFocus).trim() || null : null,
    targetDate: target.iso,
    targetDateLabel: target.label,
    targetDateMs: target.ms,
    estimatedDurationMin: durationMin,
    estimatedDuration: durationMin != null ? `${durationMin} dk` : null,
    difficultyLevel: difficultyLabel,
    difficultyLevelKey: difficultyKey || null,
    weaponsReady: Boolean(weaponsReady),
    ammoAllocated: Boolean(ammoAllocated),
    ppeChecked: Boolean(ppeChecked),
    tcccKitReady: Boolean(tcccKitReady),
    logisticsReadyCount: logisticsReady,
    operationNote: operationNoteText,
    status: planStatus,
    operationCategory: 'egitim',
    kind: 'TRAINING_PLAN',
    title: summaryLabel,
    discipline: trainingFocusKey,
    notes: operationNoteText,
    performedAt: target.iso,
    drillName: summaryLabel,
    shootType: summaryLabel,
    timestamp,
  }
}

/**
 * @typedef {import('./rangeLayoutMetrics').CanvasLayoutObject} CanvasLayoutObject
 */

/**
 * @param {unknown} item
 * @returns {CanvasLayoutObject | null}
 */
function parseLayoutObjectItem(item) {
  if (!item || typeof item !== 'object') return null
  const o = /** @type {Record<string, unknown>} */ (item)
  const id = invStr(o.id).trim()
  const type = invStr(o.type).trim()
  if (!id || !type) return null
  return {
    id,
    type,
    category: invStr(o.category).trim() || 'special',
    x: Number(o.x) || 0,
    y: Number(o.y) || 0,
    label: invStr(o.label).trim() || type,
  }
}

/**
 * @param {unknown} raw
 * @returns {import('./rangeLayoutMetrics').TacticalArrow[]}
 */
export function parseTacticalArrows(raw) {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const o = /** @type {Record<string, unknown>} */ (item)
      const id = invStr(o.id).trim()
      if (!id) return null
      const arrowType = invStr(o.arrowType).trim() || 'infiltration'
      const validType =
        arrowType === 'fire_line' || arrowType === 'evac' ? arrowType : 'infiltration'
      return {
        id,
        x1: Number(o.x1) || 0,
        y1: Number(o.y1) || 0,
        x2: Number(o.x2) || 0,
        y2: Number(o.y2) || 0,
        arrowType: validType,
      }
    })
    .filter(Boolean)
}

/**
 * @param {unknown} raw
 * @returns {import('./rangeLayoutPrimitives').DrawnShape[]}
 */
export function parseDrawnShapes(raw) {
  if (!Array.isArray(raw)) return []
  const validTypes = new Set(['line', 'circle', 'triangle', 'square', 'rectangle'])
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const o = /** @type {Record<string, unknown>} */ (item)
      const id = invStr(o.id).trim()
      const type = invStr(o.type).trim()
      if (!id || !validTypes.has(type)) return null
      const base = {
        id,
        type,
        strokeWidth: Number(o.strokeWidth) || 2,
        color: invStr(o.color).trim() || 'rgba(34, 211, 238, 0.88)',
      }
      if (type === 'line') {
        return {
          ...base,
          type: 'line',
          startX: Number(o.startX) || 0,
          startY: Number(o.startY) || 0,
          endX: Number(o.endX) || 0,
          endY: Number(o.endY) || 0,
        }
      }
      if (type === 'circle') {
        return {
          ...base,
          type: 'circle',
          startX: Number(o.startX) || 0,
          startY: Number(o.startY) || 0,
          radius: Number(o.radius) || 0,
        }
      }
      if (type === 'triangle') {
        return {
          ...base,
          type: 'triangle',
          x1: Number(o.x1) || 0,
          y1: Number(o.y1) || 0,
          x2: Number(o.x2) || 0,
          y2: Number(o.y2) || 0,
          x3: Number(o.x3) || 0,
          y3: Number(o.y3) || 0,
        }
      }
      if (type === 'square') {
        return {
          ...base,
          type: 'square',
          startX: Number(o.startX) || 0,
          startY: Number(o.startY) || 0,
          size: Number(o.size) || 0,
        }
      }
      return {
        ...base,
        type: 'rectangle',
        startX: Number(o.startX) || 0,
        startY: Number(o.startY) || 0,
        width: Number(o.width) || 0,
        height: Number(o.height) || 0,
      }
    })
    .filter(Boolean)
}

/**
 * @param {unknown} raw
 * @returns {{ objects: CanvasLayoutObject[]; tacticalArrows: import('./rangeLayoutMetrics').TacticalArrow[]; drawnShapes: import('./rangeLayoutPrimitives').DrawnShape[] }}
 */
export function parseSandboxLayoutData(raw) {
  const empty = { objects: [], tacticalArrows: [], drawnShapes: [] }

  if (Array.isArray(raw)) {
    return {
      objects: raw.map(parseLayoutObjectItem).filter(Boolean),
      tacticalArrows: [],
      drawnShapes: [],
    }
  }

  if (raw && typeof raw === 'object') {
    const o = /** @type {Record<string, unknown>} */ (raw)
    const objectsRaw = Array.isArray(o.objects)
      ? o.objects
      : Array.isArray(o.canvasObjects)
        ? o.canvasObjects
        : null
    if (objectsRaw) {
      return {
        objects: objectsRaw.map(parseLayoutObjectItem).filter(Boolean),
        tacticalArrows: parseTacticalArrows(o.tacticalArrows ?? o.tactical_arrows),
        drawnShapes: parseDrawnShapes(o.drawnShapes ?? o.drawn_shapes),
      }
    }
    const single = parseLayoutObjectItem(raw)
    if (single) return { objects: [single], tacticalArrows: [], drawnShapes: [] }
    return empty
  }

  if (typeof raw === 'string' && raw.trim()) {
    try {
      return parseSandboxLayoutData(JSON.parse(raw))
    } catch {
      return empty
    }
  }

  return empty
}

/**
 * @param {unknown} raw
 * @returns {CanvasLayoutObject[]}
 */
export function parseMapLayoutData(raw) {
  return parseSandboxLayoutData(raw).objects
}

/**
 * @param {{
 *   userId: string
 *   targetDate: string
 *   estimatedDuration: string | number
 *   difficultyLevel: string
 *   operationNote?: string
 *   canvasObjects: CanvasLayoutObject[]
 *   tacticalArrows?: import('./rangeLayoutMetrics').TacticalArrow[]
 *   drawnShapes?: import('./rangeLayoutPrimitives').DrawnShape[]
 *   trainingFocus?: string
 *   customTrainingFocus?: string
 *   status?: string
 * }} input
 */
export function buildEgitimSandboxPayload({
  userId,
  targetDate,
  estimatedDuration,
  difficultyLevel,
  operationNote = '',
  canvasObjects,
  tacticalArrows = [],
  drawnShapes = [],
  trainingFocus = 'atis_mastery',
  customTrainingFocus = '',
  status = 'planned',
}) {
  const base = buildEgitimLogPayload({
    userId,
    trainingFocus,
    customTrainingFocus,
    targetDate,
    estimatedDuration,
    difficultyLevel,
    weaponsReady: false,
    ammoAllocated: false,
    ppeChecked: false,
    tcccKitReady: false,
    status,
    operationNote,
  })

  const objects = Array.isArray(canvasObjects) ? canvasObjects : []
  const arrows = Array.isArray(tacticalArrows) ? tacticalArrows : []
  const shapes = Array.isArray(drawnShapes) ? drawnShapes : []
  const mapLayoutData = {
    version: 4,
    coordinateSpace: 'view_world',
    objects,
    tacticalArrows: arrows,
    drawnShapes: shapes,
  }
  const layoutJson = JSON.stringify(mapLayoutData)

  return {
    ...base,
    kind: 'TACTICAL_SANDBOX_PLAN',
    mapLayoutData,
    mapLayoutDataJson: layoutJson,
    layoutObjectCount: objects.length,
    tacticalArrowCount: arrows.length,
    drawnShapeCount: shapes.length,
    title: `Taktik Sandbox · ${base.title}`,
    drillName: `Sandbox ${objects.length} nesne · ${arrows.length} ok · ${shapes.length} çizim`,
    shootType: `SANDBOX · ${objects.length} OBJ · ${arrows.length} VEC · ${shapes.length} PMT`,
  }
}

/**
 * Mevcut sandbox planının layout alanlarını günceller (yeni kayıt oluşturmaz).
 * @param {{
 *   canvasObjects: CanvasLayoutObject[]
 *   tacticalArrows?: import('./rangeLayoutMetrics').TacticalArrow[]
 *   drawnShapes?: import('./rangeLayoutPrimitives').DrawnShape[]
 *   operationNote?: string
 *   targetDate?: string
 *   estimatedDuration?: string | number
 *   difficultyLevel?: string
 * }} input
 */
export function buildEgitimSandboxLayoutPatch({
  canvasObjects,
  tacticalArrows = [],
  drawnShapes = [],
  operationNote,
  targetDate,
  estimatedDuration,
  difficultyLevel,
}) {
  const objects = Array.isArray(canvasObjects) ? canvasObjects : []
  const arrows = Array.isArray(tacticalArrows) ? tacticalArrows : []
  const shapes = Array.isArray(drawnShapes) ? drawnShapes : []
  const mapLayoutData = {
    version: 4,
    coordinateSpace: 'view_world',
    objects,
    tacticalArrows: arrows,
    drawnShapes: shapes,
  }
  const layoutJson = JSON.stringify(mapLayoutData)

  /** @type {Record<string, unknown>} */
  const patch = {
    mapLayoutData,
    mapLayoutDataJson: layoutJson,
    layoutObjectCount: objects.length,
    tacticalArrowCount: arrows.length,
    drawnShapeCount: shapes.length,
    drillName: `Sandbox ${objects.length} nesne · ${arrows.length} ok · ${shapes.length} çizim`,
    shootType: `SANDBOX · ${objects.length} OBJ · ${arrows.length} VEC · ${shapes.length} PMT`,
  }

  if (operationNote !== undefined) {
    const note = invStr(operationNote).trim()
    patch.operationNote = note
    patch.notes = note
  }

  if (targetDate !== undefined) {
    const target = parseTargetDate(targetDate)
    if (target.iso) {
      patch.targetDate = target.iso
      patch.targetDateLabel = target.label
      patch.targetDateMs = target.ms
      patch.performedAt = target.iso
    }
  }

  if (estimatedDuration !== undefined) {
    const durationMin = parseDurationMinutes(estimatedDuration)
    patch.estimatedDurationMin = durationMin
    patch.estimatedDuration = durationMin != null ? `${durationMin} dk` : null
  }

  if (difficultyLevel !== undefined) {
    const difficultyLabel = resolveEgitimSelectValue(difficultyLevel)
    const difficultyKey = invStr(difficultyLevel).trim()
    patch.difficultyLevel = difficultyLabel
    patch.difficultyLevelKey = difficultyKey || null
  }

  return patch
}
