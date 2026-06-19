import { RANGE_HEIGHT_M, RANGE_WIDTH_M } from './rangeLayoutAssets'

/**
 * @typedef {{ id: string; type: string; category: string; x: number; y: number; label: string }} CanvasLayoutObject
 */

/**
 * @typedef {'infiltration' | 'fire_line' | 'evac'} TacticalArrowType
 */

/**
 * @typedef {{ id: string; x1: number; y1: number; x2: number; y2: number; arrowType?: TacticalArrowType }} TacticalArrow
 */

/**
 * @param {CanvasLayoutObject[]} objects
 * @param {string | null} selectedId
 * @param {string[]} selectedIds
 * @returns {CanvasLayoutObject[]}
 */
export function getAlignmentTargetObjects(objects, selectedId, selectedIds) {
  const list = Array.isArray(objects) ? objects : []
  const multi = Array.isArray(selectedIds) ? selectedIds.filter(Boolean) : []
  if (multi.length >= 2) {
    const set = new Set(multi)
    return list.filter((o) => set.has(o.id))
  }
  const sel = list.find((o) => o.id === selectedId)
  if (!sel) return []
  return list.filter((o) => o.category === sel.category)
}

/**
 * @param {CanvasLayoutObject[]} objects
 * @param {CanvasLayoutObject[]} targets
 * @returns {CanvasLayoutObject[]}
 */
export function alignLayoutObjectsHorizontally(objects, targets) {
  if (!targets || targets.length < 2) return objects
  const avgY = targets.reduce((sum, o) => sum + Number(o.y), 0) / targets.length
  const y = Math.round(avgY * 10) / 10
  const ids = new Set(targets.map((t) => t.id))
  return objects.map((o) => (ids.has(o.id) ? { ...o, y } : o))
}

/**
 * @param {CanvasLayoutObject[]} objects
 * @param {CanvasLayoutObject[]} targets
 * @returns {CanvasLayoutObject[]}
 */
export function alignLayoutObjectsVertically(objects, targets) {
  if (!targets || targets.length < 2) return objects
  const avgX = targets.reduce((sum, o) => sum + Number(o.x), 0) / targets.length
  const x = Math.round(avgX * 10) / 10
  const ids = new Set(targets.map((t) => t.id))
  return objects.map((o) => (ids.has(o.id) ? { ...o, x } : o))
}

/**
 * @param {CanvasLayoutObject[]} objects
 */
export function computeLayoutMetrics(objects) {
  const list = Array.isArray(objects) ? objects : []

  let minX = RANGE_WIDTH_M
  let minY = RANGE_HEIGHT_M
  let maxX = 0
  let maxY = 0
  let hasBounds = false

  for (const o of list) {
    const x = Number(o.x)
    const y = Number(o.y)
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue
    hasBounds = true
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  }

  const targetCount = list.filter((o) => o.category === 'targets').length
  const coverCount = list.filter((o) => o.category === 'cover' || o.category === 'cqb').length

  let riskLevel = 'green_low'
  let riskLabel = 'Düşük'
  let riskTone = 'text-accent'

  if (targetCount > 8) {
    riskLevel = 'red_hardcore'
    riskLabel = 'Yüksek'
    riskTone = 'text-red-400'
  } else if (targetCount > 5) {
    riskLevel = 'amber_medium'
    riskLabel = 'Orta'
    riskTone = 'text-accent'
  }

  const areaLabel = hasBounds
    ? `${Math.max(0, maxX - minX).toFixed(1)}m × ${Math.max(0, maxY - minY).toFixed(1)}m`
    : '—'

  return {
    targetCount,
    coverCount,
    totalObjects: list.length,
    areaLabel,
    riskLevel,
    riskLabel,
    riskTone,
    bounds: hasBounds ? { minX, minY, maxX, maxY } : null,
  }
}
