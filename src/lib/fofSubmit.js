import { buildFofLogPayload } from './fofLogPayload'
import { attachMeteoDataToPayload } from './meteoDataCapture'
import { sanitizeForFirestore } from './firestoreSanitize'

/**
 * @param {{
 *   addLog: (payload: Record<string, unknown>) => Promise<{ id: string }>
 *   userId: string
 *   scenarioType: string
 *   customScenarioType?: string
 *   simSystem: string
 *   customSimSystem?: string
 *   engagementType: string
 *   opforCount: number
 *   scenarioDuration: string | number
 *   engagementRounds: string | number
 *   tacticalErrors?: string[]
 *   coverUtilizationPercent: string | number
 *   hitsTaken: number
 *   lethalHitsDelivered: number
 *   nonLethalHitsDelivered: number
 *   timeToFirstEngagement: string | number
 *   friendlyCasualties: number
 *   decisionAccuracy: string | number
 *   blueOnBlue: boolean
 *   selfTcccApplied: boolean
 *   operationNote?: string
 *   debriefNotes?: string
 * }} p
 */
export async function submitFofRecord({
  addLog,
  userId,
  scenarioType,
  customScenarioType = '',
  simSystem,
  customSimSystem = '',
  engagementType,
  opforCount,
  scenarioDuration,
  engagementRounds,
  tacticalErrors = [],
  coverUtilizationPercent,
  hitsTaken,
  lethalHitsDelivered,
  nonLethalHitsDelivered,
  timeToFirstEngagement,
  friendlyCasualties,
  decisionAccuracy,
  blueOnBlue,
  selfTcccApplied,
  operationNote = '',
  debriefNotes = '',
}) {
  const bundle = buildFofLogPayload({
    userId,
    scenarioType,
    customScenarioType,
    simSystem,
    customSimSystem,
    engagementType,
    opforCount,
    scenarioDuration,
    engagementRounds,
    tacticalErrors,
    coverUtilizationPercent,
    hitsTaken,
    lethalHitsDelivered,
    nonLethalHitsDelivered,
    timeToFirstEngagement,
    friendlyCasualties,
    decisionAccuracy,
    blueOnBlue,
    selfTcccApplied,
    operationNote,
    debriefNotes,
  })

  const payload = /** @type {Record<string, unknown>} */ (
    sanitizeForFirestore(await attachMeteoDataToPayload(bundle))
  )
  const ref = await addLog(payload)
  const logId = String(ref?.id ?? '')

  if (!logId) {
    const err = new Error('FOF log kimliği alınamadı')
    err.code = 'missing-log-id'
    throw err
  }

  return { logId, bundle }
}
