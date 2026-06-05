import { buildCqbLogPayload } from './cqbLogPayload'
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
 *   clearingTime: string | number
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
  clearingTime,
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
    clearingTime,
    tacticalErrors,
    operationNote,
  })

  const payload = /** @type {Record<string, unknown>} */ (sanitizeForFirestore(bundle))
  const ref = await addLog(payload)
  const logId = String(ref?.id ?? '')

  if (!logId) {
    const err = new Error('CQB log kimliği alınamadı')
    err.code = 'missing-log-id'
    throw err
  }

  return { logId, bundle }
}
