import { buildFofLogPayload } from './fofLogPayload'
import { sanitizeForFirestore } from './firestoreSanitize'

/**
 * @param {{
 *   addLog: (payload: Record<string, unknown>) => Promise<{ id: string }>
 *   userId: string
 *   scenarioType: string
 *   customScenarioType?: string
 *   simSystem: string
 *   customSimSystem?: string
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
 *   blueOnBlue: boolean
 *   selfTcccApplied: boolean
 *   operationNote?: string
 * }} p
 */
export async function submitFofRecord({
  addLog,
  userId,
  scenarioType,
  customScenarioType = '',
  simSystem,
  customSimSystem = '',
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
  blueOnBlue,
  selfTcccApplied,
  operationNote = '',
}) {
  const bundle = buildFofLogPayload({
    userId,
    scenarioType,
    customScenarioType,
    simSystem,
    customSimSystem,
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
    blueOnBlue,
    selfTcccApplied,
    operationNote,
  })

  const payload = /** @type {Record<string, unknown>} */ (sanitizeForFirestore(bundle))
  const ref = await addLog(payload)
  const logId = String(ref?.id ?? '')

  if (!logId) {
    const err = new Error('FOF log kimliği alınamadı')
    err.code = 'missing-log-id'
    throw err
  }

  return { logId, bundle }
}
