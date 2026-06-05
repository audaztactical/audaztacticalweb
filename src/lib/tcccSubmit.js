import { buildTcccLogPayload } from './tcccLogPayload'
import { sanitizeForFirestore } from './firestoreSanitize'

/**
 * @param {{
 *   addLog: (payload: Record<string, unknown>) => Promise<{ id: string }>
 *   userId: string
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
  tcccPhase,
  customTcccPhase = '',
  injuryType,
  injuryToTqTime,
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

  const payload = /** @type {Record<string, unknown>} */ (sanitizeForFirestore(bundle))
  const ref = await addLog(payload)
  const logId = String(ref?.id ?? '')

  if (!logId) {
    const err = new Error('TCCC log kimliği alınamadı')
    err.code = 'missing-log-id'
    throw err
  }

  return { logId, bundle }
}
