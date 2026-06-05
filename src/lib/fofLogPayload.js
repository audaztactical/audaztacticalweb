import { invNum, invStr } from './inventoryIlws'
import { FOF_CUSTOM, resolveFofSelectKey, resolveFofSelectValue } from './fofOptions'
import {
  buildFofTacticalErrorsForPayload,
  fofPayloadHasBlueOnBlue,
} from './fofTacticalErrors'
import { calculateFofSuccessPercent } from './trainingSuccessScore'

export const FOF_INITIAL_FORM = {
  scenarioType: '',
  customScenarioType: '',
  simSystem: '',
  customSimSystem: '',
  opforCount: '0',
  scenarioDuration: '',
  engagementRounds: '',
  coverUtilizationPercent: '',
  hitsTaken: '0',
  lethalHitsDelivered: '0',
  nonLethalHitsDelivered: '0',
  timeToFirstEngagement: '',
  friendlyCasualties: '0',
  tacticalErrors: /** @type {string[]} */ ([]),
  blueOnBlue: false,
  selfTcccApplied: false,
  operationNote: '',
}

/**
 * @param {string | number} raw
 */
function parseOptionalNonNegativeNumber(raw) {
  const text = invStr(raw).trim().replace(',', '.')
  if (!text) return null
  const n = invNum(text)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * 1000) / 1000
}

/**
 * @param {string | number} raw
 */
function parseCount(raw) {
  return Math.max(0, Math.floor(invNum(raw)))
}

/**
 * @param {{
 *   userId: string
 *   scenarioType: string
 *   customScenarioType?: string
 *   simSystem: string
 *   customSimSystem?: string
 *   opforCount: number
 *   scenarioDuration: string | number
 *   coverUtilizationPercent: string | number
 *   hitsTaken: number
 *   lethalHitsDelivered: number
 *   nonLethalHitsDelivered: number
 *   timeToFirstEngagement: string | number
 *   friendlyCasualties: number
 *   engagementRounds: string | number
 *   tacticalErrors?: string[]
 *   blueOnBlue: boolean
 *   selfTcccApplied: boolean
 *   operationNote?: string
 * }} input
 */
export function buildFofLogPayload({
  userId,
  scenarioType,
  customScenarioType = '',
  simSystem,
  customSimSystem = '',
  opforCount,
  scenarioDuration,
  engagementRounds,
  coverUtilizationPercent,
  hitsTaken,
  lethalHitsDelivered,
  nonLethalHitsDelivered,
  timeToFirstEngagement,
  friendlyCasualties,
  tacticalErrors = [],
  blueOnBlue,
  selfTcccApplied,
  operationNote = '',
}) {
  const scenarioTypeLabel = resolveFofSelectValue(scenarioType, customScenarioType)
  const simSystemLabel = resolveFofSelectValue(simSystem, customSimSystem)
  const scenarioTypeKey = resolveFofSelectKey(scenarioType, customScenarioType)
  const simSystemKey = resolveFofSelectKey(simSystem, customSimSystem)

  const durationSec = parseOptionalNonNegativeNumber(scenarioDuration)
  const coverPercent = parseOptionalNonNegativeNumber(coverUtilizationPercent)
  const ttfeSec = parseOptionalNonNegativeNumber(timeToFirstEngagement)

  const operationNoteText = invStr(operationNote ?? '').trim()
  const timestamp = new Date().toISOString()

  const summaryLabel = [scenarioTypeLabel, simSystemLabel].filter(Boolean).join(' · ')

  const opfor = parseCount(opforCount)
  const hits = parseCount(hitsTaken)
  const lethal = parseCount(lethalHitsDelivered)
  const nonLethal = parseCount(nonLethalHitsDelivered)
  const rounds = parseCount(engagementRounds)

  const errors = buildFofTacticalErrorsForPayload(tacticalErrors, { blueOnBlue })
  const blueOnBlueFlag = fofPayloadHasBlueOnBlue(errors) || Boolean(blueOnBlue)

  const successPercent = calculateFofSuccessPercent({
    blueOnBlue: blueOnBlueFlag,
    hitsTaken: hits,
    opforCount: opfor,
    lethalHitsDelivered: lethal,
    coverUtilizationPercent: coverPercent,
    selfTcccApplied: Boolean(selfTcccApplied),
    tacticalErrors: errors,
    engagementRounds: rounds,
    nonLethalHitsDelivered: nonLethal,
  })

  return {
    userId,
    scenarioType: scenarioTypeLabel,
    scenarioTypeKey,
    customScenarioType:
      scenarioType === FOF_CUSTOM ? invStr(customScenarioType).trim() || null : null,
    simSystem: simSystemLabel,
    simSystemKey,
    customSimSystem: simSystem === FOF_CUSTOM ? invStr(customSimSystem).trim() || null : null,
    opforCount: opfor,
    scenarioDurationSec: durationSec,
    clearingTimeSec: durationSec,
    scenarioDuration: durationSec != null ? `${durationSec}s` : null,
    engagementRounds: rounds,
    coverUtilizationPercent: coverPercent,
    coverUtilizationLabel: coverPercent != null ? `${coverPercent}%` : null,
    hitsTaken: hits,
    lethalHitsDelivered: lethal,
    nonLethalHitsDelivered: nonLethal,
    timeToFirstEngagementSec: ttfeSec,
    timeToFirstEngagement: ttfeSec != null ? `${ttfeSec}s` : null,
    friendlyCasualties: parseCount(friendlyCasualties),
    tacticalErrors: errors,
    blueOnBlue: blueOnBlueFlag,
    selfTcccApplied: Boolean(selfTcccApplied),
    operationNote: operationNoteText,
    operationCategory: 'fof',
    kind: 'FOF_DRILL',
    drillName: summaryLabel,
    shootType: summaryLabel,
    timestamp,
    status: 'active',
    successPercent,
  }
}
