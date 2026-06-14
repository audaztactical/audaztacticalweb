import { buildCqbLogPayload } from './cqbLogPayload'
import { attachMeteoDataToPayload } from './meteoDataCapture'
import { sanitizeForFirestore } from './firestoreSanitize'

/**
 * @param {{
 *   addLog: (payload: Record<string, unknown>) => Promise<{ id: string }>
 *   userId: string
 *   roomTopology: string
 *   customRoomTopology?: string
 *   entryMethod: string
 *   customEntryMethod?: string
 *   breachingType: string
 *   customBreachingType?: string
 *   doorState: string
 *   teamSize: string
 *   threatCount: number
 *   neutralizedCount: number
 *   clearanceTimeMs: string | number
 *   accuracyScore: string | number
 *   safetyViolations: string | number
 *   tacticalDecision: string
 *   tacticalErrors: string[]
 *   operationNote?: string
 * }} p
 */
export async function submitCqbRecord({
  addLog,
  userId,
  roomTopology,
  customRoomTopology = '',
  entryMethod,
  customEntryMethod = '',
  breachingType,
  customBreachingType = '',
  doorState,
  teamSize,
  threatCount,
  neutralizedCount,
  clearanceTimeMs,
  accuracyScore,
  safetyViolations,
  tacticalDecision,
  tacticalErrors,
  operationNote = '',
}) {
  const bundle = buildCqbLogPayload({
    userId,
    roomTopology,
    customRoomTopology,
    entryMethod,
    customEntryMethod,
    breachingType,
    customBreachingType,
    doorState,
    teamSize,
    threatCount,
    neutralizedCount,
    clearanceTimeMs,
    accuracyScore,
    safetyViolations,
    tacticalDecision,
    tacticalErrors,
    operationNote,
  })

  const payload = /** @type {Record<string, unknown>} */ (
    sanitizeForFirestore(await attachMeteoDataToPayload(bundle))
  )
  const ref = await addLog(payload)
  const logId = String(ref?.id ?? '')

  if (!logId) {
    const err = new Error('CQB log kimliği alınamadı')
    err.code = 'missing-log-id'
    throw err
  }

  return { logId, bundle }
}
