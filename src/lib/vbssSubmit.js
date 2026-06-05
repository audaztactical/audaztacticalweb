import { buildVbssLogPayload } from './vbssLogPayload'
import { sanitizeForFirestore } from './firestoreSanitize'

/**
 * @param {{
 *   addLog: (payload: Record<string, unknown>) => Promise<{ id: string }>
 *   userId: string
 *   boardingTime: string | number
 *   bridgeControlTime: string | number
 *   engineRoomControlTime: string | number
 *   containmentTime: string | number
 *   insertionMethod: string
 *   customInsertionMethod?: string
 *   vesselType: string
 *   customVesselType?: string
 *   seaState: string
 *   customSeaState?: string
 *   vesselSpeed: string | number
 *   crewCount: number
 *   contrabandFound: boolean
 *   biometricCheck: boolean
 *   scuttlingAttempt: boolean
 *   commsBlackoutSuccess: boolean
 *   tacticalErrors?: string[]
 *   operationNote?: string
 * }} p
 */
export async function submitVbssRecord({
  addLog,
  userId,
  boardingTime,
  bridgeControlTime,
  engineRoomControlTime,
  containmentTime,
  insertionMethod,
  customInsertionMethod = '',
  vesselType,
  customVesselType = '',
  seaState,
  customSeaState = '',
  vesselSpeed,
  crewCount,
  contrabandFound,
  biometricCheck,
  scuttlingAttempt,
  commsBlackoutSuccess,
  tacticalErrors = [],
  operationNote = '',
}) {
  const bundle = buildVbssLogPayload({
    userId,
    boardingTime,
    bridgeControlTime,
    engineRoomControlTime,
    containmentTime,
    insertionMethod,
    customInsertionMethod,
    vesselType,
    customVesselType,
    seaState,
    customSeaState,
    vesselSpeed,
    crewCount,
    contrabandFound,
    biometricCheck,
    scuttlingAttempt,
    commsBlackoutSuccess,
    tacticalErrors,
    operationNote,
  })

  const payload = /** @type {Record<string, unknown>} */ (sanitizeForFirestore(bundle))
  const ref = await addLog(payload)
  const logId = String(ref?.id ?? '')

  if (!logId) {
    const err = new Error('VBSS log kimliği alınamadı')
    err.code = 'missing-log-id'
    throw err
  }

  return { logId, bundle }
}
