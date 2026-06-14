import { buildTcccLogPayload } from './tcccLogPayload'
import { attachMeteoDataToPayload } from './meteoDataCapture'
import { sanitizeForFirestore } from './firestoreSanitize'

/**
 * @param {{
 *   addLog: (payload: Record<string, unknown>) => Promise<{ id: string }>
 *   userId: string
 *   casualtyType?: string
 *   interventionTime?: string | number
 *   outcome?: string
 *   procedures?: string[]
 *   tcccPhase: string
 *   customTcccPhase?: string
 *   injuryType: string
 *   injuryToTqTime: string | number
 *   evacWaitingTime: string | number
 *   systolicBp: string | number
 *   tourniquetLocation: string
 *   customTourniquetLocation?: string
 *   tourniquetApplied: boolean
 *   woundPacking: boolean
 *   npaInserted: boolean
 *   chestSealApplied: boolean
 *   needleDecompression: boolean
 *   hypothermiaBlanket: boolean
 *   operationNote?: string
 * }} p
 */
export async function submitTcccRecord({
  addLog,
  userId,
  casualtyType = '',
  interventionTime = '',
  outcome = '',
  procedures = [],
  tcccPhase,
  customTcccPhase = '',
  injuryType,
  injuryToTqTime = '',
  evacWaitingTime,
  systolicBp,
  tourniquetLocation,
  customTourniquetLocation = '',
  tourniquetApplied,
  woundPacking,
  npaInserted,
  chestSealApplied,
  needleDecompression,
  hypothermiaBlanket,
  operationNote = '',
}) {
  const bundle = buildTcccLogPayload({
    userId,
    casualtyType,
    interventionTime,
    outcome,
    procedures,
    tcccPhase,
    customTcccPhase,
    injuryType,
    injuryToTqTime,
    evacWaitingTime,
    systolicBp,
    tourniquetLocation,
    customTourniquetLocation,
    tourniquetApplied,
    woundPacking,
    npaInserted,
    chestSealApplied,
    needleDecompression,
    hypothermiaBlanket,
    operationNote,
  })

  const payload = /** @type {Record<string, unknown>} */ (
    sanitizeForFirestore(await attachMeteoDataToPayload(bundle))
  )
  const ref = await addLog(payload)
  const logId = String(ref?.id ?? '')

  if (!logId) {
    const err = new Error('TCCC log kimliği alınamadı')
    err.code = 'missing-log-id'
    throw err
  }

  return { logId, bundle }
}
