import {
  buildEgitimLogPayload,
  buildEgitimSandboxLayoutPatch,
  buildEgitimSandboxPayload,
} from './egitimLogPayload'
import { attachMeteoDataToPayload } from './meteoDataCapture'
import { sanitizeForFirestore } from './firestoreSanitize'

/**
 * @param {{
 *   addPlan: (payload: Record<string, unknown>) => Promise<{ id: string }>
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
 * }} p
 */
export async function submitEgitimPlan({
  addPlan,
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
  const bundle = buildEgitimLogPayload({
    userId,
    trainingFocus,
    customTrainingFocus,
    targetDate,
    estimatedDuration,
    difficultyLevel,
    weaponsReady,
    ammoAllocated,
    ppeChecked,
    tcccKitReady,
    status,
    operationNote,
  })

  const payload = /** @type {Record<string, unknown>} */ (
    sanitizeForFirestore(await attachMeteoDataToPayload(bundle))
  )
  const ref = await addPlan(payload)
  const planId = String(ref?.id ?? '')

  if (!planId) {
    const err = new Error('Eğitim planı kimliği alınamadı')
    err.code = 'missing-plan-id'
    throw err
  }

  return { planId, bundle }
}

/**
 * @param {{
 *   addPlan: (payload: Record<string, unknown>) => Promise<{ id: string }>
 *   userId: string
 *   targetDate: string
 *   estimatedDuration: string | number
 *   difficultyLevel: string
 *   operationNote?: string
 *   canvasObjects: import('./egitimLogPayload').CanvasLayoutObject[]
 *   tacticalArrows?: import('./rangeLayoutMetrics').TacticalArrow[]
 *   drawnShapes?: import('./rangeLayoutPrimitives').DrawnShape[]
 *   trainingFocus?: string
 *   customTrainingFocus?: string
 *   status?: string
 * }} p
 */
export async function submitEgitimSandboxPlan({
  addPlan,
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
  const bundle = buildEgitimSandboxPayload({
    userId,
    targetDate,
    estimatedDuration,
    difficultyLevel,
    operationNote,
    canvasObjects,
    tacticalArrows,
    drawnShapes,
    trainingFocus,
    customTrainingFocus,
    status,
  })

  const payload = /** @type {Record<string, unknown>} */ (
    sanitizeForFirestore(await attachMeteoDataToPayload(bundle))
  )
  const ref = await addPlan(payload)
  const planId = String(ref?.id ?? '')

  if (!planId) {
    const err = new Error('Sandbox senaryo kimliği alınamadı')
    err.code = 'missing-plan-id'
    throw err
  }

  return { planId, bundle }
}

/**
 * @param {{
 *   updatePlan: (id: string, patch: Record<string, unknown>) => Promise<unknown>
 *   planId: string
 *   canvasObjects: import('./egitimLogPayload').CanvasLayoutObject[]
 *   tacticalArrows?: import('./rangeLayoutMetrics').TacticalArrow[]
 *   drawnShapes?: import('./rangeLayoutPrimitives').DrawnShape[]
 *   operationNote?: string
 *   targetDate?: string
 *   estimatedDuration?: string | number
 *   difficultyLevel?: string
 * }} p
 */
export async function updateEgitimSandboxPlan({
  updatePlan,
  planId,
  canvasObjects,
  tacticalArrows = [],
  drawnShapes = [],
  operationNote,
  targetDate,
  estimatedDuration,
  difficultyLevel,
}) {
  const id = String(planId ?? '').trim()
  if (!id) {
    const err = new Error('Güncellenecek plan kimliği yok')
    err.code = 'missing-plan-id'
    throw err
  }

  const patch = buildEgitimSandboxLayoutPatch({
    canvasObjects,
    tacticalArrows,
    drawnShapes,
    operationNote,
    targetDate,
    estimatedDuration,
    difficultyLevel,
  })

  const payload = /** @type {Record<string, unknown>} */ (sanitizeForFirestore(patch))
  await updatePlan(id, payload)
  return { planId: id, patch }
}
