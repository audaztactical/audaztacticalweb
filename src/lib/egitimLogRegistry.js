import { invNum, invStr } from './inventoryIlws'
import { parseSandboxLayoutData } from './egitimLogPayload'
import {
  formatEgitimStatusLabel,
  resolveEgitimSelectValue,
} from './egitimOptions'
import { filterIndividualTrainingRecords } from './trainingGroupFields'

/**
 * @param {Record<string, unknown>} row
 */
export function isEgitimTrainingPlan(row) {
  const cat = invStr(row.operationCategory).toLowerCase()
  const kind = invStr(row.kind).toUpperCase()
  if (cat === 'egitim') return true
  if (kind === 'TRAINING_PLAN' || kind === 'TACTICAL_SANDBOX_PLAN') return true
  return false
}

/** @param {Record<string, unknown>} row */
export function isEgitimSandboxPlan(row) {
  return invStr(row.kind).toUpperCase() === 'TACTICAL_SANDBOX_PLAN'
}

/** @typedef {{ objects: import('./rangeLayoutMetrics').CanvasLayoutObject[]; tacticalArrows: import('./rangeLayoutMetrics').TacticalArrow[]; drawnShapes: import('./rangeLayoutPrimitives').DrawnShape[] }} SandboxLayoutBlueprint */

/** @type {SandboxLayoutBlueprint} */
export const EMPTY_SANDBOX_BLUEPRINT = {
  objects: [],
  tacticalArrows: [],
  drawnShapes: [],
}

/** @param {Record<string, unknown>} row */
export function getEgitimSandboxLayout(row) {
  const fromObj = parseSandboxLayoutData(row.mapLayoutData)
  if (
    fromObj.objects.length > 0 ||
    fromObj.tacticalArrows.length > 0 ||
    fromObj.drawnShapes.length > 0
  ) {
    return fromObj
  }
  return parseSandboxLayoutData(row.mapLayoutDataJson)
}

/**
 * Isolated deep copy for a single plan row (prevents cross-log leakage).
 * @param {Record<string, unknown>} row
 * @returns {SandboxLayoutBlueprint}
 */
export function extractSandboxBlueprintFromRow(row) {
  const layout = getEgitimSandboxLayout(row)
  return {
    objects: layout.objects.map((o) => ({ ...o })),
    tacticalArrows: layout.tacticalArrows.map((a) => ({ ...a })),
    drawnShapes: layout.drawnShapes.map((s) => ({ ...s })),
  }
}

/** @param {Record<string, unknown>} row */
export function getEgitimMapLayoutObjects(row) {
  return getEgitimSandboxLayout(row).objects
}

/** @param {Record<string, unknown>} row */
export function getEgitimTacticalArrows(row) {
  return getEgitimSandboxLayout(row).tacticalArrows
}

/** @param {Record<string, unknown>} row */
export function getEgitimDrawnShapes(row) {
  return getEgitimSandboxLayout(row).drawnShapes
}

/** @param {Record<string, unknown>} row */
export function getEgitimPlanKindLabel(row) {
  return isEgitimSandboxPlan(row) ? 'TAKTİK SANDBOX' : 'EĞİTİM PLANI'
}

/**
 * @param {Record<string, unknown>} row
 */
export function getEgitimPlanTimestampMs(row) {
  const targetMs = invNum(row.targetDateMs)
  if (targetMs > 0) return targetMs
  const iso = invStr(row.targetDate || row.performedAt || row.timestamp)
  if (iso) {
    const t = Date.parse(iso)
    if (!Number.isNaN(t)) return t
  }
  const u = row.updatedAt
  if (u && typeof u === 'object' && typeof u.toMillis === 'function') return u.toMillis()
  const c = row.createdAt
  if (c && typeof c === 'object' && typeof c.toMillis === 'function') return c.toMillis()
  return 0
}

/**
 * @param {Record<string, unknown>} row
 */
export function formatEgitimTargetDateCell(row) {
  const label = invStr(row.targetDateLabel).trim()
  if (label) return label
  const ms = getEgitimPlanTimestampMs(row)
  if (!ms) return '—'
  return new Date(ms).toLocaleString('tr-TR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

/** @param {Record<string, unknown>} row */
export function getEgitimTrainingFocus(row) {
  const label = invStr(row.trainingFocus || row.title).trim()
  if (label) return label
  const key = invStr(row.trainingFocusKey || row.discipline).trim()
  const custom = invStr(row.customTrainingFocus).trim()
  return resolveEgitimSelectValue(key, custom)
}

/** @param {Record<string, unknown>} row */
export function getEgitimDifficultyLevel(row) {
  const label = invStr(row.difficultyLevel).trim()
  if (label) return label
  return resolveEgitimSelectValue(invStr(row.difficultyLevelKey).trim())
}

/** @param {Record<string, unknown>} row */
export function formatEgitimDuration(row) {
  const n = invNum(row.estimatedDurationMin)
  if (n > 0) return `${n} dk`
  const label = invStr(row.estimatedDuration).trim()
  return label || '—'
}

/** @param {Record<string, unknown>} row */
export function getEgitimStatus(row) {
  return formatEgitimStatusLabel(invStr(row.status))
}

/** @param {Record<string, unknown>} row */
export function getEgitimOperationNote(row) {
  return invStr(row.operationNote ?? row.notes).trim() || 'Eğitim hedefi / not kayıtlı değil.'
}

/** @param {Record<string, unknown>} row */
export function countEgitimLogisticsReady(row) {
  const stored = invNum(row.logisticsReadyCount)
  if (stored >= 0 && row.logisticsReadyCount != null) return stored
  return [
    Boolean(row.weaponsReady),
    Boolean(row.ammoAllocated),
    Boolean(row.ppeChecked),
    Boolean(row.tcccKitReady),
  ].filter(Boolean).length
}

/** @param {Record<string, unknown>} row */
export function isEgitimPlanUpcoming(row) {
  const ms = getEgitimPlanTimestampMs(row)
  if (!ms) return false
  return ms >= Date.now()
}

/**
 * @param {Record<string, unknown>[]} plans
 */
export function sortEgitimPlansByTargetDate(plans) {
  return [...plans].sort((a, b) => getEgitimPlanTimestampMs(b) - getEgitimPlanTimestampMs(a))
}

/**
 * @param {Record<string, unknown>[]} allPlans
 */
export function selectEgitimPlans(allPlans) {
  return sortEgitimPlansByTargetDate(
    filterIndividualTrainingRecords(allPlans).filter(isEgitimTrainingPlan),
  )
}

/**
 * @param {{
 *   plans: Record<string, unknown>[]
 *   trainingFocusKey: string
 *   scheduleFilter: 'ALL' | 'UPCOMING' | 'PAST'
 * }} filters
 */
export function filterEgitimPlans({ plans, trainingFocusKey, scheduleFilter }) {
  return plans.filter((row) => {
    if (trainingFocusKey !== 'ALL') {
      const key = invStr(row.trainingFocusKey || row.discipline).trim()
      const label = getEgitimTrainingFocus(row)
      if (key !== trainingFocusKey && label !== trainingFocusKey) return false
    }
    if (scheduleFilter === 'UPCOMING' && !isEgitimPlanUpcoming(row)) return false
    if (scheduleFilter === 'PAST' && isEgitimPlanUpcoming(row)) return false
    return true
  })
}

/**
 * @param {Record<string, unknown>[]} plans
 */
export function extractEgitimFocusOptions(plans) {
  const set = new Map()
  for (const row of plans) {
    const label = getEgitimTrainingFocus(row)
    const key = invStr(row.trainingFocusKey || row.discipline).trim() || label
    if (label && label !== '—') set.set(key, label)
  }
  return Array.from(set.entries())
    .map(([key, label]) => ({ key, label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'tr'))
}

/** @param {string} difficultyKey */
export function difficultyToneClass(difficultyKey) {
  const k = String(difficultyKey || '').trim()
  if (k === 'red_hardcore') return 'text-red-400'
  if (k === 'amber_medium') return 'text-accent'
  if (k === 'green_low') return 'text-accent'
  return 'text-app-text/90'
}
