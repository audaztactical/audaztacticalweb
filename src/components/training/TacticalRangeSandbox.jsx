import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import TacticalPanel from '../ui/TacticalPanel'
import { DIFFICULTY_LEVEL_OPTIONS } from '../../lib/egitimOptions'
import { submitEgitimSandboxPlan, updateEgitimSandboxPlan } from '../../lib/egitimSubmit'
import { getEgitimPlanTimestampMs } from '../../lib/egitimLogRegistry'
import { invNum, invStr } from '../../lib/inventoryIlws'
import {
  alignLayoutObjectsHorizontally,
  alignLayoutObjectsVertically,
  computeLayoutMetrics,
} from '../../lib/rangeLayoutMetrics'
import {
  RANGE_ASSET_GROUPS,
  RANGE_HEIGHT_M,
  RANGE_WIDTH_M,
} from '../../lib/rangeLayoutAssets'
import {
  drawLayoutObject,
  drawRangeGrid,
  drawSelectionBox,
  drawTacticalArrow,
  getArrowIdsInCanvasRect,
  getObjectIdsInCanvasRect,
} from '../../lib/rangeLayoutCanvasDraw'
import {
  arrowToViewPoints,
  drawLineEndpointHandles,
  drawTransformHandles,
  getEntityBounds,
  hitTestScene,
  resizeDrawnShape,
  translateArrowInView,
  translateDrawnShape,
  updateArrowFromViewDrag,
} from '../../lib/rangeLayoutInteraction'
import SandboxFloatingToolbar from './SandboxFloatingToolbar'
import {
  applyViewportTransform,
  meterToView,
  roundMeter,
  screenToWorld,
  viewToMeter,
} from '../../lib/rangeLayoutViewport'
import {
  createShapeDraft,
  drawDrawnShape,
  finalizeShapeDraft,
  getShapeIdsInCanvasRect,
  isCanvasDrawMode,
  isPrimitiveDrawMode,
  isShapeValid,
  updateShapeDraft,
} from '../../lib/rangeLayoutPrimitives'
import {
  formatEgitimOptionLabel,
  formatEgitimSandboxArrowTypeLabel,
  formatEgitimSandboxAssetGroupTitle,
  formatEgitimSandboxAssetLabel,
  formatEgitimSandboxRiskLabel,
  formatEgitimSandboxSaveError,
  formatEgitimSandboxStatusBar,
  localizeSandboxCanvasObject,
  resolveSandboxPlacedObjectLabel,
} from '../../lib/trainingDisplayText'

const STROKE_WIDTH_OPTIONS = [2, 4, 6, 8, 10]

/** @param {unknown} v */
function toDatetimeLocalValue(v) {
  const ms =
    typeof v === 'number' && Number.isFinite(v)
      ? v
      : typeof v === 'string' && v.trim()
        ? Date.parse(v)
        : v && typeof v === 'object' && typeof v.toMillis === 'function'
          ? v.toMillis()
          : NaN
  if (!Number.isFinite(ms) || Number.isNaN(ms)) return ''
  const d = new Date(ms)
  const pad = (/** @type {number} */ n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const inputClass =
  'w-full rounded border border-accent/30 bg-app-bg px-2 py-2 font-mono-technical text-sm text-slate-100 outline-none placeholder:text-app-text/45 focus:border-accent/60 shadow-[0_0_10px_rgba(34,197,94,0.12)]'

const selectClass =
  'dossier-blood-select w-full rounded border border-accent/35 bg-app-bg py-2 pl-2 pr-8 font-mono-technical text-[11px] uppercase text-app-text outline-none focus:border-accent/60'

const operationNoteTextareaClass =
  'block h-full min-h-0 w-full resize-none rounded border border-accent/30 bg-app-bg px-2 py-2 font-mono-technical text-sm leading-relaxed text-slate-100 outline-none placeholder:text-app-text/45 focus:border-accent/60 shadow-[0_0_10px_rgba(34,197,94,0.12)]'

const labelClass = 'font-mono-technical text-[8px] font-bold uppercase tracking-[0.22em] text-app-text/55'

/** @typedef {import('../../lib/rangeLayoutMetrics').CanvasLayoutObject} CanvasLayoutObject */

/** @typedef {import('./SandboxFloatingToolbar').SandboxTool} SandboxTool */

/** @typedef {import('../../lib/rangeLayoutPrimitives').DrawnShape} DrawnShape */

/** @typedef {import('../../lib/rangeLayoutInteraction').SceneEntityKind} SceneEntityKind */

/** @typedef {{ kind: SceneEntityKind; id: string }} PrimarySelection */

/** @typedef {import('../../lib/rangeLayoutMetrics').TacticalArrow} TacticalArrow */

/** @typedef {import('../../lib/rangeLayoutMetrics').TacticalArrowType} TacticalArrowType */

/** @typedef {TacticalArrow & { arrowType: TacticalArrowType }} ArrowPreview */

const ZOOM_MIN = 0.5
const ZOOM_MAX = 3

/**
 * @typedef {import('../../lib/egitimLogRegistry').SandboxLayoutBlueprint} SandboxLayoutBlueprint
 */

/**
 * @param {{
 *   userId: string
 *   addPlan: (payload: Record<string, unknown>) => Promise<{ id: string }>
 *   updatePlan?: (id: string, patch: Record<string, unknown>) => Promise<unknown>
 *   editingPlanId?: string | null
 *   editingPlan?: Record<string, unknown> | null
 *   layoutBlueprint?: SandboxLayoutBlueprint | null
 *   readOnly?: boolean
 * }} props
 */
export default function TacticalRangeSandbox({
  userId,
  addPlan,
  updatePlan,
  editingPlanId = null,
  editingPlan = null,
  layoutBlueprint = null,
  readOnly = false,
}) {
  const { t, i18n } = useTranslation('training')
  const canvasRef = useRef(/** @type {HTMLCanvasElement | null} */ (null))
  const wrapRef = useRef(/** @type {HTMLDivElement | null} */ (null))
  const interactionRef = useRef(
    /** @type {{
     *   type: string
     *   startWx: number
     *   startWy: number
     *   snapshot?: DrawnShape | import('../../lib/rangeLayoutMetrics').TacticalArrow
     *   hit?: import('../../lib/rangeLayoutInteraction').SceneHit
     *   objectOffsetX?: number
     *   objectOffsetY?: number
     * } | null} */ (null)
  )
  const panDragRef = useRef(/** @type {{ startX: number; startY: number; panX: number; panY: number } | null} */ (null))
  const arrowDrawingRef = useRef(false)
  const shapeDrawingRef = useRef(false)
  const spaceHeldRef = useRef(false)
  const editingFormInitRef = useRef(/** @type {string | null} */ (null))

  const isEditingExisting = Boolean(editingPlanId && updatePlan)

  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [activeTool, setActiveTool] = useState(/** @type {SandboxTool} */ ('select'))
  const [primarySelection, setPrimarySelection] = useState(
    /** @type {PrimarySelection | null} */ (null)
  )
  const [tacticalArrows, setTacticalArrows] = useState(/** @type {TacticalArrow[]} */ ([]))
  const [arrowPreview, setArrowPreview] = useState(/** @type {ArrowPreview | null} */ (null))
  const [selectionBox, setSelectionBox] = useState(
    /** @type {{ x1: number; y1: number; x2: number; y2: number } | null} */ (null)
  )
  const [isPanning, setIsPanning] = useState(false)
  const [spaceHeld, setSpaceHeld] = useState(false)

  const [canvasObjects, setCanvasObjects] = useState(/** @type {CanvasLayoutObject[]} */ ([]))
  const [activeBrush, setActiveBrush] = useState(
    /** @type {import('../../lib/rangeLayoutAssets').RangeLayoutAssetDef | null} */ (null)
  )
  const [selectedId, setSelectedId] = useState(/** @type {string | null} */ (null))
  const [selectedObjectIds, setSelectedObjectIds] = useState(/** @type {string[]} */ ([]))
  const [selectedArrowIds, setSelectedArrowIds] = useState(/** @type {string[]} */ ([]))
  const [selectedArrowType, setSelectedArrowType] = useState(/** @type {TacticalArrowType} */ ('infiltration'))
  const [drawnShapes, setDrawnShapes] = useState(/** @type {DrawnShape[]} */ ([]))
  const [shapePreview, setShapePreview] = useState(/** @type {DrawnShape | null} */ (null))
  const [selectedShapeIds, setSelectedShapeIds] = useState(/** @type {string[]} */ ([]))
  const [strokeWidth, setStrokeWidth] = useState(2)
  const [openGroup, setOpenGroup] = useState('targets')
  const [canvasSize, setCanvasSize] = useState({ width: 640, height: 420 })

  const [targetDate, setTargetDate] = useState('')
  const [estimatedDuration, setEstimatedDuration] = useState('90')
  const [difficultyLevel, setDifficultyLevel] = useState('amber_medium')
  const [designNote, setDesignNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveOk, setSaveOk] = useState(false)
  const [saveError, setSaveError] = useState(/** @type {string | null} */ (null))

  const metrics = useMemo(() => computeLayoutMetrics(canvasObjects), [canvasObjects])

  const selectedObject = useMemo(
    () => canvasObjects.find((o) => o.id === selectedId) ?? null,
    [canvasObjects, selectedId]
  )

  const calcCoords = useCallback(
    (/** @type {React.MouseEvent<HTMLCanvasElement>} */ e) => {
      const canvas = canvasRef.current
      if (!canvas) return null
      const rect = canvas.getBoundingClientRect()
      return screenToWorld(e.clientX, e.clientY, rect, pan, zoom)
    },
    [pan.x, pan.y, zoom]
  )

  const purgeDrawingState = useCallback(() => {
    setCanvasObjects([])
    setTacticalArrows([])
    setDrawnShapes([])
    setSelectedObjectIds([])
    setSelectedArrowIds([])
    setSelectedShapeIds([])
    setSelectedId(null)
    setPrimarySelection(null)
    setArrowPreview(null)
    setShapePreview(null)
    setSelectionBox(null)
    arrowDrawingRef.current = false
    shapeDrawingRef.current = false
    interactionRef.current = null
  }, [])

  const clearScene = useCallback(() => {
    purgeDrawingState()
    setSaveOk(false)
  }, [purgeDrawingState])

  const applyLayoutBlueprint = useCallback(
    (/** @type {SandboxLayoutBlueprint | null} */ blueprint) => {
      purgeDrawingState()
      if (!blueprint) return
      setCanvasObjects(blueprint.objects.map((o) => localizeSandboxCanvasObject({ ...o })))
      setTacticalArrows(blueprint.tacticalArrows.map((a) => ({ ...a })))
      setDrawnShapes(blueprint.drawnShapes.map((s) => ({ ...s })))
      setSaveOk(false)
    },
    [purgeDrawingState]
  )

  useEffect(() => {
    if (layoutBlueprint) {
      applyLayoutBlueprint(layoutBlueprint)
    }
  }, [layoutBlueprint, applyLayoutBlueprint])

  useEffect(() => {
    if (!editingPlanId || !editingPlan) {
      editingFormInitRef.current = null
      return
    }
    if (editingFormInitRef.current === editingPlanId) return
    editingFormInitRef.current = editingPlanId

    const localDate = toDatetimeLocalValue(
      editingPlan.targetDate ?? editingPlan.performedAt ?? getEgitimPlanTimestampMs(editingPlan)
    )
    if (localDate) setTargetDate(localDate)

    const durationMin = invNum(editingPlan.estimatedDurationMin)
    if (durationMin > 0) {
      setEstimatedDuration(String(Math.round(durationMin)))
    } else {
      const durText = invStr(editingPlan.estimatedDuration).replace(/\D/g, '')
      if (durText) setEstimatedDuration(durText)
    }

    const diffKey = invStr(editingPlan.difficultyLevelKey).trim()
    if (diffKey) {
      setDifficultyLevel(diffKey)
    }

    const note = invStr(editingPlan.operationNote || editingPlan.notes).trim()
    if (note) setDesignNote(note)

    setSaveOk(false)
    setSaveError(null)
  }, [editingPlanId, editingPlan])

  const deleteEntity = useCallback((/** @type {PrimarySelection} */ sel) => {
    if (sel.kind === 'shape') {
      setDrawnShapes((prev) => prev.filter((s) => s.id !== sel.id))
      setSelectedShapeIds((prev) => prev.filter((id) => id !== sel.id))
    } else if (sel.kind === 'arrow') {
      setTacticalArrows((prev) => prev.filter((a) => a.id !== sel.id))
      setSelectedArrowIds((prev) => prev.filter((id) => id !== sel.id))
    } else {
      setCanvasObjects((prev) => prev.filter((o) => o.id !== sel.id))
      setSelectedObjectIds((prev) => prev.filter((id) => id !== sel.id))
      if (selectedId === sel.id) setSelectedId(null)
    }
    setPrimarySelection(null)
    setSaveOk(false)
  }, [selectedId])

  const deleteSelectedItems = useCallback(() => {
    if (selectedObjectIds.length || selectedArrowIds.length || selectedShapeIds.length) {
      setCanvasObjects((prev) => prev.filter((o) => !selectedObjectIds.includes(o.id)))
      setTacticalArrows((prev) => prev.filter((a) => !selectedArrowIds.includes(a.id)))
      setDrawnShapes((prev) => prev.filter((s) => !selectedShapeIds.includes(s.id)))
      setSelectedObjectIds([])
      setSelectedArrowIds([])
      setSelectedShapeIds([])
      setSelectedId(null)
      setPrimarySelection(null)
      setSaveOk(false)
      return true
    }
    if (primarySelection) {
      deleteEntity(primarySelection)
      return true
    }
    return false
  }, [
    deleteEntity,
    primarySelection,
    selectedArrowIds,
    selectedObjectIds,
    selectedShapeIds,
  ])

  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const { width, height } = canvasSize
    const selectedSet = new Set(selectedObjectIds)
    const selectedShapeSet = new Set(selectedShapeIds)
    const dpr = window.devicePixelRatio || 1

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = '#050805'
    ctx.fillRect(0, 0, width, height)

    ctx.save()
    applyViewportTransform(ctx, pan, zoom)
    drawRangeGrid(ctx, width, height, { pan, zoom })
    for (const shape of drawnShapes) {
      drawDrawnShape(ctx, shape, { selected: selectedShapeSet.has(shape.id) })
    }
    if (shapePreview) {
      drawDrawnShape(ctx, shapePreview, { draft: true })
    }
    const selectedArrowSet = new Set(selectedArrowIds)
    for (const arrow of tacticalArrows) {
      drawTacticalArrow(ctx, arrow, width, height, {
        draft: false,
      })
      if (selectedArrowSet.has(arrow.id)) {
        const { x1, y1, x2, y2 } = arrowToViewPoints(arrow, width, height)
        drawLineEndpointHandles(ctx, x1, y1, x2, y2, zoom)
      }
    }
    if (arrowPreview) {
      drawTacticalArrow(ctx, arrowPreview, width, height, { draft: true })
    }
    for (const obj of canvasObjects) {
      drawLayoutObject(ctx, obj, width, height, {
        selected: selectedSet.has(obj.id),
      })
    }
    if (selectionBox) {
      drawSelectionBox(ctx, selectionBox)
    }

    if (primarySelection && activeTool === 'select') {
      const b = getEntityBounds(
        primarySelection.kind,
        primarySelection.id,
        drawnShapes,
        tacticalArrows,
        canvasObjects,
        width,
        height
      )
      if (b) {
        const shape = drawnShapes.find((s) => s.id === primarySelection.id)
        if (primarySelection.kind === 'arrow') {
          const arrow = tacticalArrows.find((a) => a.id === primarySelection.id)
          if (arrow) {
            const { x1, y1, x2, y2 } = arrowToViewPoints(arrow, width, height)
            drawLineEndpointHandles(ctx, x1, y1, x2, y2, zoom)
          }
        } else if (shape && shape.type === 'line') {
          drawLineEndpointHandles(ctx, shape.startX, shape.startY, shape.endX, shape.endY, zoom)
        } else if (shape && shape.type !== 'circle') {
          drawTransformHandles(ctx, b, zoom)
        } else if (shape?.type === 'circle') {
          drawTransformHandles(ctx, b, zoom, { endpointsOnly: false })
        } else if (primarySelection.kind === 'object') {
          drawTransformHandles(ctx, b, zoom)
        }
      }
    }

    ctx.restore()
  }, [
    activeTool,
    arrowPreview,
    canvasObjects,
    canvasSize,
    drawnShapes,
    pan.x,
    pan.y,
    primarySelection,
    selectedArrowIds,
    selectedObjectIds,
    selectedShapeIds,
    selectionBox,
    shapePreview,
    tacticalArrows,
    zoom,
  ])

  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const ro = new ResizeObserver(() => {
      const width = Math.max(320, wrap.clientWidth)
      const height = Math.round(width * (RANGE_HEIGHT_M / RANGE_WIDTH_M) * 0.85)
      setCanvasSize({ width, height: Math.min(520, Math.max(360, height)) })
    })
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const { width, height } = canvasSize
    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    redraw()
  }, [canvasSize, redraw])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const onWheel = (/** @type {WheelEvent} */ e) => {
      e.preventDefault()
      const rect = canvas.getBoundingClientRect()
      const sx = e.clientX - rect.left
      const sy = e.clientY - rect.top
      const worldX = (sx - pan.x) / zoom
      const worldY = (sy - pan.y) / zoom
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1
      setZoom((prev) => {
        const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, prev * factor))
        setPan({
          x: sx - worldX * next,
          y: sy - worldY * next,
        })
        return next
      })
    }

    canvas.addEventListener('wheel', onWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', onWheel)
  }, [pan.x, pan.y, zoom])

  useEffect(() => {
    const isTypingTarget = () => {
      const tag = /** @type {HTMLElement | null} */ (document.activeElement)?.tagName
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
    }

    const onKeyDown = (/** @type {KeyboardEvent} */ e) => {
      if (e.code === 'Space' && !e.repeat) {
        if (isTypingTarget()) return
        e.preventDefault()
        spaceHeldRef.current = true
        setSpaceHeld(true)
        return
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (isTypingTarget()) return
        e.preventDefault()
        deleteSelectedItems()
      }
    }
    const onKeyUp = (/** @type {KeyboardEvent} */ e) => {
      if (e.code !== 'Space') return
      spaceHeldRef.current = false
      setSpaceHeld(false)
      panDragRef.current = null
      setIsPanning(false)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [deleteSelectedItems])

  useEffect(() => {
    setCanvasObjects((prev) => prev.map(localizeSandboxCanvasObject))
  }, [i18n.language])

  const addObjectAt = useCallback(
    (/** @type {number} */ mx, /** @type {number} */ my, /** @type {import('../../lib/rangeLayoutAssets').RangeLayoutAssetDef} */ brush) => {
      const id = `obj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
      const next = {
        id,
        type: brush.type,
        category: brush.category,
        x: roundMeter(mx),
        y: roundMeter(my),
        label: resolveSandboxPlacedObjectLabel(brush.type, brush.label),
      }
      setCanvasObjects((prev) => [...prev, next])
      setSelectedId(id)
      setSelectedObjectIds([id])
      setPrimarySelection({ kind: 'object', id })
      setSaveOk(false)
    },
    []
  )

  const applySelectionFromHit = useCallback(
    (/** @type {import('../../lib/rangeLayoutInteraction').SceneHit} */ hit, /** @type {boolean} */ shiftKey) => {
      setPrimarySelection({ kind: hit.kind, id: hit.id })
      if (hit.kind === 'shape') {
        if (shiftKey) {
          setSelectedShapeIds((prev) =>
            prev.includes(hit.id) ? prev.filter((id) => id !== hit.id) : [...prev, hit.id]
          )
        } else {
          setSelectedShapeIds([hit.id])
          setSelectedObjectIds([])
          setSelectedArrowIds([])
          setSelectedId(null)
        }
      } else if (hit.kind === 'arrow') {
        if (shiftKey) {
          setSelectedArrowIds((prev) =>
            prev.includes(hit.id) ? prev.filter((id) => id !== hit.id) : [...prev, hit.id]
          )
        } else {
          setSelectedArrowIds([hit.id])
          setSelectedObjectIds([])
          setSelectedShapeIds([])
          setSelectedId(null)
        }
      } else {
        if (shiftKey) {
          setSelectedObjectIds((prev) =>
            prev.includes(hit.id) ? prev.filter((id) => id !== hit.id) : [...prev, hit.id]
          )
        } else {
          setSelectedObjectIds([hit.id])
          setSelectedId(hit.id)
          setSelectedArrowIds([])
          setSelectedShapeIds([])
        }
      }
    },
    []
  )

  const handleCanvasMouseDown = (e) => {
    if (readOnly) return
    const coords = calcCoords(e)
    if (!coords) return
    const canvas = canvasRef.current
    const rect = canvas?.getBoundingClientRect()
    const sx = rect ? e.clientX - rect.left : 0
    const sy = rect ? e.clientY - rect.top : 0

    if (e.button === 1 || spaceHeldRef.current) {
      e.preventDefault()
      panDragRef.current = {
        startX: sx,
        startY: sy,
        panX: pan.x,
        panY: pan.y,
      }
      setIsPanning(true)
      return
    }

    const { width, height } = canvasSize

    if (activeTool === 'arrow') {
      const start = viewToMeter(coords.x, coords.y, width, height)
      arrowDrawingRef.current = true
      setArrowPreview({
        id: 'preview',
        x1: roundMeter(start.x),
        y1: roundMeter(start.y),
        x2: roundMeter(start.x),
        y2: roundMeter(start.y),
        arrowType: selectedArrowType,
      })
      return
    }

    if (isPrimitiveDrawMode(activeTool)) {
      shapeDrawingRef.current = true
      setShapePreview(
        createShapeDraft(
          /** @type {import('../../lib/rangeLayoutPrimitives').PrimitiveShapeType} */ (activeTool),
          coords.x,
          coords.y,
          strokeWidth
        )
      )
      return
    }

    const sceneHit = hitTestScene({
      wx: coords.x,
      wy: coords.y,
      zoom,
      width,
      height,
      drawnShapes,
      tacticalArrows,
      canvasObjects,
    })

    if (activeTool === 'eraser') {
      if (sceneHit) deleteEntity({ kind: sceneHit.kind, id: sceneHit.id })
      return
    }

    if (activeTool === 'select' && sceneHit) {
      applySelectionFromHit(sceneHit, e.shiftKey)

      if (sceneHit.handle && sceneHit.handle !== 'body') {
        if (sceneHit.kind === 'shape') {
          const shape = drawnShapes.find((s) => s.id === sceneHit.id)
          if (shape) {
            interactionRef.current = {
              type: 'resize-shape',
              startWx: coords.x,
              startWy: coords.y,
              snapshot: { ...shape },
              hit: sceneHit,
            }
          }
        } else if (sceneHit.kind === 'arrow') {
          const arrow = tacticalArrows.find((a) => a.id === sceneHit.id)
          if (arrow) {
            interactionRef.current = {
              type: 'drag-arrow-end',
              startWx: coords.x,
              startWy: coords.y,
              snapshot: { ...arrow },
              hit: sceneHit,
            }
          }
        }
        return
      }

      if (sceneHit.kind === 'shape') {
        const shape = drawnShapes.find((s) => s.id === sceneHit.id)
        if (shape) {
          interactionRef.current = {
            type: 'move-shape',
            startWx: coords.x,
            startWy: coords.y,
            snapshot: { ...shape },
            hit: sceneHit,
          }
        }
      } else if (sceneHit.kind === 'arrow') {
        const arrow = tacticalArrows.find((a) => a.id === sceneHit.id)
        if (arrow) {
          interactionRef.current = {
            type: 'move-arrow',
            startWx: coords.x,
            startWy: coords.y,
            snapshot: { ...arrow },
            hit: sceneHit,
          }
        }
      } else {
        const obj = canvasObjects.find((o) => o.id === sceneHit.id)
        if (obj) {
          const { cx, cy } = meterToView(obj.x, obj.y, width, height)
          interactionRef.current = {
            type: 'move-object',
            startWx: coords.x,
            startWy: coords.y,
            snapshot: obj,
            objectOffsetX: coords.x - cx,
            objectOffsetY: coords.y - cy,
            hit: sceneHit,
          }
        }
      }
      return
    }

    if (activeTool === 'select' && activeBrush) {
      const { x, y } = viewToMeter(coords.x, coords.y, width, height)
      addObjectAt(x, y, activeBrush)
      return
    }

    if (activeTool === 'marquee' || (activeTool === 'select' && !sceneHit)) {
      setSelectionBox({ x1: coords.x, y1: coords.y, x2: coords.x, y2: coords.y })
      if (!e.shiftKey) {
        setSelectedId(null)
        setSelectedObjectIds([])
        setSelectedArrowIds([])
        setSelectedShapeIds([])
        setPrimarySelection(null)
      }
    }
  }

  const handleCanvasMouseMove = (e) => {
    if (readOnly) return
    const coords = calcCoords(e)
    if (!coords) return
    const canvas = canvasRef.current
    const rect = canvas?.getBoundingClientRect()
    const sx = rect ? e.clientX - rect.left : 0
    const sy = rect ? e.clientY - rect.top : 0

    const panDrag = panDragRef.current
    if (panDrag) {
      setPan({
        x: panDrag.panX + (sx - panDrag.startX),
        y: panDrag.panY + (sy - panDrag.startY),
      })
      return
    }

    const { width, height } = canvasSize

    if (activeTool === 'arrow' && arrowDrawingRef.current && arrowPreview) {
      const end = viewToMeter(coords.x, coords.y, width, height)
      setArrowPreview({
        ...arrowPreview,
        x2: roundMeter(end.x),
        y2: roundMeter(end.y),
        arrowType: selectedArrowType,
      })
      return
    }

    if (shapeDrawingRef.current && shapePreview && isPrimitiveDrawMode(activeTool)) {
      setShapePreview(updateShapeDraft(shapePreview, coords.x, coords.y))
      return
    }

    if (selectionBox) {
      setSelectionBox((prev) => (prev ? { ...prev, x2: coords.x, y2: coords.y } : null))
      return
    }

    const interaction = interactionRef.current
    if (!interaction) return

    if (interaction.type === 'resize-shape' && interaction.snapshot && interaction.hit) {
      const snap = /** @type {DrawnShape} */ (interaction.snapshot)
      const handle = interaction.hit.handle ?? 'se'
      setDrawnShapes((prev) =>
        prev.map((s) =>
          s.id === snap.id ? resizeDrawnShape(snap, handle, coords.x, coords.y) : s
        )
      )
      setSaveOk(false)
      return
    }

    if (interaction.type === 'move-shape' && interaction.snapshot) {
      const snap = /** @type {DrawnShape} */ (interaction.snapshot)
      const dx = coords.x - interaction.startWx
      const dy = coords.y - interaction.startWy
      setDrawnShapes((prev) =>
        prev.map((s) => (s.id === snap.id ? translateDrawnShape(snap, dx, dy) : s))
      )
      setSaveOk(false)
      return
    }

    if (interaction.type === 'drag-arrow-end' && interaction.snapshot && interaction.hit) {
      const snap = /** @type {import('../../lib/rangeLayoutMetrics').TacticalArrow} */ (
        interaction.snapshot
      )
      const handle = interaction.hit.handle ?? 'p2'
      setTacticalArrows((prev) =>
        prev.map((a) =>
          a.id === snap.id
            ? updateArrowFromViewDrag(a, handle, coords.x, coords.y, width, height)
            : a
        )
      )
      setSaveOk(false)
      return
    }

    if (interaction.type === 'move-arrow' && interaction.snapshot) {
      const snap = /** @type {import('../../lib/rangeLayoutMetrics').TacticalArrow} */ (
        interaction.snapshot
      )
      const dx = coords.x - interaction.startWx
      const dy = coords.y - interaction.startWy
      setTacticalArrows((prev) =>
        prev.map((a) => (a.id === snap.id ? translateArrowInView(a, dx, dy, width, height) : a))
      )
      setSaveOk(false)
      return
    }

    if (interaction.type === 'move-object' && interaction.snapshot) {
      const snap = /** @type {CanvasLayoutObject} */ (interaction.snapshot)
      const vx = coords.x - (interaction.objectOffsetX ?? 0)
      const vy = coords.y - (interaction.objectOffsetY ?? 0)
      const { x, y } = viewToMeter(vx, vy, width, height)
      setCanvasObjects((prev) =>
        prev.map((o) =>
          o.id === snap.id ? { ...o, x: roundMeter(x), y: roundMeter(y) } : o
        )
      )
      setSaveOk(false)
    }
  }

  const handleCanvasMouseUp = () => {
    const { width, height } = canvasSize

    if (activeTool === 'arrow' && arrowPreview) {
      const dx = arrowPreview.x2 - arrowPreview.x1
      const dy = arrowPreview.y2 - arrowPreview.y1
      if (Math.hypot(dx, dy) >= 0.4) {
        setTacticalArrows((prev) => [
          ...prev,
          {
            id: `arrow_${Date.now()}`,
            x1: arrowPreview.x1,
            y1: arrowPreview.y1,
            x2: arrowPreview.x2,
            y2: arrowPreview.y2,
            arrowType: arrowPreview.arrowType,
          },
        ])
        setSaveOk(false)
      }
      arrowDrawingRef.current = false
      setArrowPreview(null)
    }

    if (shapePreview && isPrimitiveDrawMode(activeTool)) {
      const finalized = finalizeShapeDraft(shapePreview)
      if (isShapeValid(finalized)) {
        setDrawnShapes((prev) => [...prev, finalized])
        setSaveOk(false)
      }
      shapeDrawingRef.current = false
      setShapePreview(null)
    }

    if (selectionBox && (activeTool === 'select' || activeTool === 'marquee')) {
      const ids = getObjectIdsInCanvasRect(canvasObjects, selectionBox, width, height)
      const arrowIds = getArrowIdsInCanvasRect(tacticalArrows, selectionBox, width, height)
      const shapeIds = getShapeIdsInCanvasRect(drawnShapes, selectionBox)
      if (ids.length) {
        setSelectedObjectIds(ids)
        setSelectedId(ids[0])
        setPrimarySelection({ kind: 'object', id: ids[0] })
      } else if (arrowIds.length) {
        setSelectedObjectIds([])
        setSelectedId(null)
        setPrimarySelection({ kind: 'arrow', id: arrowIds[0] })
      } else if (shapeIds.length) {
        setSelectedObjectIds([])
        setSelectedId(null)
        setPrimarySelection({ kind: 'shape', id: shapeIds[0] })
      } else {
        setSelectedObjectIds([])
        setSelectedId(null)
        setPrimarySelection(null)
      }
      setSelectedArrowIds(arrowIds)
      setSelectedShapeIds(shapeIds)
      setSelectionBox(null)
    }

    interactionRef.current = null
    panDragRef.current = null
    setIsPanning(false)
  }

  const handleLabelChange = (/** @type {string} */ value) => {
    if (!selectedId) return
    setCanvasObjects((prev) =>
      prev.map((o) => (o.id === selectedId ? { ...o, label: value } : o))
    )
    setSaveOk(false)
  }

  const alignmentTargets = useMemo(
    () => canvasObjects.filter((o) => selectedObjectIds.includes(o.id)),
    [canvasObjects, selectedObjectIds]
  )

  const runHorizontalAlign = () => {
    if (alignmentTargets.length < 2) return
    setCanvasObjects((prev) => alignLayoutObjectsHorizontally(prev, alignmentTargets))
    setSaveOk(false)
  }

  const runVerticalAlign = () => {
    if (alignmentTargets.length < 2) return
    setCanvasObjects((prev) => alignLayoutObjectsVertically(prev, alignmentTargets))
    setSaveOk(false)
  }

  const injectBrushAtCenter = (/** @type {import('../../lib/rangeLayoutAssets').RangeLayoutAssetDef} */ brush) => {
    const { width, height } = canvasSize
    const center = viewToMeter(width / 2, height / 2, width, height)
    setActiveTool('select')
    setActiveBrush(brush)
    addObjectAt(center.x, center.y, brush)
  }

  const handleSaveChanges = async () => {
    if (!userId || !editingPlanId || !updatePlan) return

    setSaving(true)
    setSaveError(null)
    setSaveOk(false)
    try {
      await updateEgitimSandboxPlan({
        updatePlan,
        planId: editingPlanId,
        canvasObjects,
        tacticalArrows,
        drawnShapes,
        operationNote: designNote,
        targetDate,
        estimatedDuration,
        difficultyLevel,
      })
      setSaveOk(true)
    } catch (err) {
      const code = err && typeof err === 'object' && 'code' in err ? String(err.code) : ''
      setSaveError(formatEgitimSandboxSaveError('DEĞİŞİKLİK_KAYDI_BAŞARISIZ', code))
    } finally {
      setSaving(false)
    }
  }

  const handleSaveScenario = async () => {
    if (!userId) return
    if (!targetDate.trim()) {
      setSaveError(formatEgitimSandboxSaveError('HEDEF_TARİH_GEREKLİ'))
      return
    }
    if (!difficultyLevel) {
      setSaveError(formatEgitimSandboxSaveError('ZORLUK_SEVİYESİ_GEREKLİ'))
      return
    }
    if (canvasObjects.length === 0) {
      setSaveError(formatEgitimSandboxSaveError('EN_AZ_BİR_NESNE_GEREKLİ'))
      return
    }

    setSaving(true)
    setSaveError(null)
    setSaveOk(false)
    try {
      await submitEgitimSandboxPlan({
        addPlan,
        userId,
        targetDate,
        estimatedDuration,
        difficultyLevel,
        operationNote: designNote,
        canvasObjects,
        tacticalArrows,
        drawnShapes,
      })
      setSaveOk(true)
      setCanvasObjects([])
      setTacticalArrows([])
      setDrawnShapes([])
      setSelectedId(null)
      setSelectedObjectIds([])
      setSelectedArrowIds([])
      setSelectedShapeIds([])
      setActiveTool('select')
      setArrowPreview(null)
      setDesignNote('')
      setZoom(1)
      setPan({ x: 0, y: 0 })
    } catch (err) {
      const code = err && typeof err === 'object' && 'code' in err ? String(err.code) : ''
      setSaveError(formatEgitimSandboxSaveError('SENARYO_KAYIT_BAŞARISIZ', code))
    } finally {
      setSaving(false)
    }
  }

  const statusBarText = formatEgitimSandboxStatusBar({
    activeTool,
    strokeWidth,
    selectedArrowType,
    activeBrushLabel: activeBrush
      ? formatEgitimSandboxAssetLabel(activeBrush.type, 'label', activeBrush.label)
      : '',
    zoom,
  })

  const arrowTypeOptions = [
    { id: 'infiltration', color: '#22d3ee' },
    { id: 'fire_line', color: '#ff3355' },
    { id: 'evac', color: '#fbbf24' },
  ]

  return (
    <div className="grid min-h-0 w-full min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)] lg:items-stretch">
      <TacticalPanel className="relative flex min-h-0 flex-col overflow-hidden border-accent/25 bg-app-bg/95 p-0 shadow-[0_0_10px_rgba(34,197,94,0.15)]">
        <span className="pointer-events-none absolute left-2 top-2 z-10 h-4 w-4 border-l border-t border-accent/40" />
        <span className="pointer-events-none absolute right-2 top-2 z-10 h-4 w-4 border-r border-t border-accent/40" />
        <div className="shrink-0 border-b border-accent/15 bg-app-bg px-4 py-2">
          <p className="font-mono-technical text-[9px] font-bold uppercase tracking-[0.28em] text-accent/90">
            {t('sectors.egitim.sandbox.title')}
          </p>
          {isEditingExisting ? (
            <p className="mt-1 font-mono-technical text-[8px] uppercase tracking-wider text-accent/90">
              {t('sectors.egitim.sandbox.editingBanner')}
            </p>
          ) : null}
        </div>
        <div ref={wrapRef} className="relative min-h-0 flex-1 p-3 sm:p-4">
          <div className="relative overflow-hidden rounded border border-accent/30 bg-app-bg shadow-[0_0_10px_rgba(34,197,94,0.2)]">
            {!readOnly ? (
              <SandboxFloatingToolbar
                activeTool={activeTool}
                onToolChange={(tool) => {
                  setActiveTool(tool)
                  setArrowPreview(null)
                  setShapePreview(null)
                  arrowDrawingRef.current = false
                  shapeDrawingRef.current = false
                  interactionRef.current = null
                  if (tool !== 'marquee' && tool !== 'select') setSelectionBox(null)
                }}
              />
            ) : null}
            <canvas
              ref={canvasRef}
              className={`block w-full touch-none ${
                isPanning || spaceHeld
                  ? isPanning
                    ? 'cursor-grabbing'
                    : 'cursor-grab'
                  : activeTool === 'eraser'
                    ? 'cursor-cell'
                    : isCanvasDrawMode(activeTool)
                      ? 'cursor-crosshair'
                      : activeTool === 'marquee' || selectionBox
                        ? 'cursor-crosshair'
                        : 'cursor-default'
              }`}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
              onContextMenu={(e) => e.preventDefault()}
              aria-label={t('sectors.egitim.sandbox.canvasAria')}
            />
          </div>
          {readOnly ? (
            <div className="pointer-events-none absolute inset-3 z-10 flex items-start justify-end p-3 sm:inset-4">
              <span className="rounded border border-accent/40 bg-black/80 px-2 py-1 font-mono-technical text-[8px] font-bold uppercase tracking-wider text-accent">
                {t('sectors.egitim.sandbox.readOnlyOverlay')}
              </span>
            </div>
          ) : null}
          <p className="mt-2 font-mono-technical text-[8px] uppercase text-app-text/55">
            {statusBarText}
          </p>
        </div>
      </TacticalPanel>

      <div className="grid min-h-0 grid-rows-[1fr_auto] gap-4">
        <TacticalPanel className="relative flex min-h-0 flex-col border-accent/20 bg-app-bg/95 p-0">
          <span className="pointer-events-none absolute bottom-2 left-2 z-10 h-3 w-3 border-b border-l border-accent/40" />
          <span className="pointer-events-none absolute bottom-2 right-2 z-10 h-3 w-3 border-b border-r border-accent/40" />
          <p className="shrink-0 border-b border-accent/15 bg-app-bg px-3 py-2 font-mono-technical text-[9px] font-bold uppercase tracking-[0.28em] text-app-text">
            {t('sectors.egitim.sandbox.assetLibrary')}
          </p>
          <div className="ilws-green-scroll min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
            {RANGE_ASSET_GROUPS.map((group) => {
              const open = openGroup === group.id
              return (
                <div
                  key={group.id}
                  className="overflow-hidden rounded border border-accent/20 bg-black/40 shadow-[0_0_8px_rgba(34,197,94,0.08)]"
                >
                  <button
                    type="button"
                    onClick={() => setOpenGroup(open ? '' : group.id)}
                    className="flex w-full items-center justify-between border-b border-accent/10 bg-app-bg px-3 py-2 text-left font-mono-technical text-[9px] font-bold uppercase tracking-wider text-accent/85"
                  >
                    {formatEgitimSandboxAssetGroupTitle(group.id, group.title)}
                    <span className="text-app-text/55">{open ? '−' : '+'}</span>
                  </button>
                  {open ? (
                    <div className="grid gap-1.5 p-2 sm:grid-cols-2">
                      {group.items.map((item) => {
                        const active = activeBrush?.type === item.type
                        const shortLabel = formatEgitimSandboxAssetLabel(item.type, 'shortLabel', item.shortLabel)
                        const itemLabel = formatEgitimSandboxAssetLabel(item.type, 'label', item.label)
                        return (
                          <button
                            key={item.type}
                            type="button"
                            onClick={() => injectBrushAtCenter(item)}
                            onFocus={() => setActiveBrush(item)}
                            className={`rounded border px-2 py-2 text-left transition ${
                              active
                                ? 'border-accent/55 bg-accent/12 text-accent shadow-[0_0_10px_rgba(34,197,94,0.2)]'
                                : 'border-white/10 bg-app-bg text-zinc-300 hover:border-accent/30'
                            }`}
                          >
                            <span
                              className="mb-1 inline-block rounded px-1 font-mono-technical text-[8px] font-bold"
                              style={{ color: item.color, border: `1px solid ${item.color}44` }}
                            >
                              {shortLabel}
                            </span>
                            <span className="block font-mono-technical text-sm leading-snug">{itemLabel}</span>
                          </button>
                        )
                      })}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        </TacticalPanel>

        <TacticalPanel className="relative flex min-h-0 flex-col border-accent/25 bg-app-bg/95 p-0 shadow-[0_0_10px_rgba(34,197,94,0.12)]">
          <p className="shrink-0 border-b border-accent/15 bg-app-bg px-3 py-2 font-mono-technical text-[9px] font-bold uppercase tracking-[0.28em] text-accent/90">
            {t('sectors.egitim.sandbox.liveControl')}
          </p>
          <div className="grid min-h-0 flex-1 grid-rows-[auto_auto_auto_1fr] gap-3 p-3">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={clearScene}
                className="rounded border border-red-500/60 bg-red-950/30 px-3 py-2 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-red-300 shadow-[0_0_12px_rgba(239,68,68,0.25)] hover:bg-red-950/50"
              >
                {t('sectors.egitim.sandbox.clearScene')}
              </button>
              {isEditingExisting ? (
                <button
                  type="button"
                  disabled={saving || readOnly}
                  onClick={handleSaveChanges}
                  className="col-span-2 flex-1 rounded border border-accent/70 bg-accent/18 px-3 py-2 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-accent shadow-[0_0_16px_rgba(251,191,36,0.35)] hover:bg-accent/28 disabled:opacity-40"
                >
                  {saving ? t('sectors.egitim.sandbox.saveChangesBusy') : t('sectors.egitim.sandbox.saveChanges')}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={saving || readOnly}
                  onClick={handleSaveScenario}
                  className="flex-1 rounded border border-accent/60 bg-accent/15 px-3 py-2 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-accent shadow-[0_0_16px_rgba(34,197,94,0.35)] hover:bg-accent/25 disabled:opacity-40"
                >
                  {saving ? t('sectors.egitim.sandbox.saveScenarioBusy') : t('sectors.egitim.sandbox.saveScenario')}
                </button>
              )}
            </div>

            <div className="space-y-2 rounded border border-accent/25 bg-black/40 p-2.5 shadow-[0_0_10px_rgba(251,191,36,0.08)]">
              <p className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.22em] text-accent/90">
                {t('sectors.egitim.sandbox.designControls')}
              </p>
              <div className="space-y-1">
                <span className={labelClass}>
                  {t('sectors.egitim.sandbox.strokeWidth', { width: strokeWidth })}
                </span>
                <input
                  type="range"
                  min={2}
                  max={10}
                  step={2}
                  value={strokeWidth}
                  onChange={(e) => setStrokeWidth(Number(e.target.value))}
                  className="h-1.5 w-full cursor-pointer accent-[#22d3ee]"
                />
                <div className="flex justify-between font-mono-technical text-[7px] text-app-text/45">
                  {STROKE_WIDTH_OPTIONS.map((w) => (
                    <span key={w} className={strokeWidth === w ? 'text-[#22d3ee]' : ''}>
                      {w}
                    </span>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <span className={labelClass}>{t('sectors.egitim.sandbox.arrowTypesLabel')}</span>
                <div className="grid gap-1.5">
                  {arrowTypeOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSelectedArrowType(/** @type {TacticalArrowType} */ (opt.id))}
                      className={`rounded border px-2 py-1.5 text-left font-mono-technical text-[8px] font-bold uppercase tracking-wider transition ${
                        selectedArrowType === opt.id
                          ? 'shadow-[0_0_10px_rgba(34,211,238,0.2)]'
                          : 'border-white/10 bg-black/40 text-app-text/70'
                      }`}
                      style={
                        selectedArrowType === opt.id
                          ? { borderColor: `${opt.color}99`, color: opt.color, background: `${opt.color}18` }
                          : undefined
                      }
                    >
                      {formatEgitimSandboxArrowTypeLabel(opt.id)}
                    </button>
                  ))}
                </div>
              </div>
              <label className="block space-y-1">
                <span className={labelClass}>{t('sectors.egitim.sandbox.editLabel')}</span>
                <input
                  type="text"
                  className={`${inputClass} text-[10px] font-mono text-amber-400 placeholder:text-amber-400/30`}
                  value={selectedObject?.label ?? ''}
                  onChange={(e) => handleLabelChange(e.target.value)}
                  disabled={!selectedObject}
                  placeholder={
                    selectedObject
                      ? t('sectors.egitim.sandbox.labelPlaceholder')
                      : t('sectors.egitim.sandbox.labelPlaceholderNoSelection')
                  }
                  maxLength={48}
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={alignmentTargets.length < 2}
                  onClick={runHorizontalAlign}
                  className="rounded border border-[#5ec8ff]/40 bg-[#5ec8ff]/10 px-2 py-2 font-mono-technical text-[8px] font-bold uppercase tracking-wider text-[#5ec8ff] hover:bg-[#5ec8ff]/20 disabled:opacity-35"
                >
                  {t('sectors.egitim.sandbox.alignHorizontal')}
                </button>
                <button
                  type="button"
                  disabled={alignmentTargets.length < 2}
                  onClick={runVerticalAlign}
                  className="rounded border border-[#5ec8ff]/40 bg-[#5ec8ff]/10 px-2 py-2 font-mono-technical text-[8px] font-bold uppercase tracking-wider text-[#5ec8ff] hover:bg-[#5ec8ff]/20 disabled:opacity-35"
                >
                  {t('sectors.egitim.sandbox.alignVertical')}
                </button>
              </div>
              <p className="font-mono-technical text-[7px] uppercase leading-relaxed text-app-text/45">
                {t('sectors.egitim.sandbox.selectionHint')}
              {selectedObjectIds.length > 0 ||
              selectedArrowIds.length > 0 ||
              selectedShapeIds.length > 0 ? (
                <span className="text-accent">
                  {t('sectors.egitim.sandbox.selectionCounts', {
                    objects: selectedObjectIds.length,
                    arrows: selectedArrowIds.length,
                    shapes: selectedShapeIds.length,
                  })}
                </span>
              ) : null}
              </p>
            </div>

            {saveOk ? (
              <p className="rounded border border-accent/40 bg-accent/10 px-2 py-1.5 text-center font-mono-technical text-[8px] font-bold uppercase text-accent">
                {isEditingExisting
                  ? t('sectors.egitim.sandbox.messages.changesSaved')
                  : t('sectors.egitim.sandbox.messages.scenarioTransferred')}
              </p>
            ) : null}
            {saveError ? (
              <p className="rounded border border-red-500/40 bg-red-950/25 px-2 py-1.5 text-center font-mono-technical text-[8px] font-bold uppercase text-red-300">
                {saveError}
              </p>
            ) : null}

            <div className="grid grid-cols-2 gap-2 rounded border border-accent/20 bg-black/50 p-2.5 font-mono-technical text-[9px] uppercase shadow-[0_0_10px_rgba(34,197,94,0.1)]">
              <p className="text-app-text/55">
                {t('sectors.egitim.sandbox.metrics.designedArea')}{' '}
                <span className="text-slate-100">{metrics.areaLabel}</span>
              </p>
              <p className="text-app-text/55">
                {t('sectors.egitim.sandbox.metrics.targetCount')}{' '}
                <span className="text-red-400">{metrics.targetCount}</span>
              </p>
              <p className="text-app-text/55">
                {t('sectors.egitim.sandbox.metrics.coverCount')}{' '}
                <span className="text-[#5ec8ff]">{metrics.coverCount}</span>
              </p>
              <p className="text-app-text/55">
                {t('sectors.egitim.sandbox.metrics.tacticalRisk')}{' '}
                <span className={metrics.riskTone}>
                  {formatEgitimSandboxRiskLabel(metrics.riskLevel).toUpperCase()}
                </span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="block space-y-1">
                <span className={labelClass}>{t('sectors.egitim.sandbox.targetDate')}</span>
                <input
                  type="datetime-local"
                  className={`${inputClass} text-[11px]`}
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                />
              </label>
              <label className="block space-y-1">
                <span className={labelClass}>{t('sectors.egitim.sandbox.duration')}</span>
                <input
                  type="number"
                  min={0}
                  className={`${inputClass} tabular-nums text-[11px]`}
                  value={estimatedDuration}
                  onChange={(e) => setEstimatedDuration(e.target.value)}
                />
              </label>
              <label className="col-span-2 block space-y-1">
                <span className={labelClass}>{t('sectors.egitim.sandbox.difficulty')}</span>
                <select
                  className={selectClass}
                  value={difficultyLevel}
                  onChange={(e) => setDifficultyLevel(e.target.value)}
                >
                  {DIFFICULTY_LEVEL_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>
                      {formatEgitimOptionLabel('difficultyLevel', o.id, o.label)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid min-h-0 grid-rows-[auto_1fr] gap-1 border-t border-accent/12 pt-2">
              <label
                htmlFor="sandbox-design-note"
                className="shrink-0 font-mono text-xs tracking-wider text-green-500/70"
              >
                {t('sectors.egitim.sandbox.designNoteSection')}
              </label>
              <textarea
                id="sandbox-design-note"
                className={operationNoteTextareaClass}
                placeholder={t('sectors.egitim.sandbox.designNotePlaceholder')}
                value={designNote}
                onChange={(e) => setDesignNote(e.target.value)}
                maxLength={2000}
              />
            </div>
          </div>
        </TacticalPanel>
      </div>
    </div>
  )
}
