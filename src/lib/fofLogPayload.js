import { invNum, invStr } from './inventoryIlws'
import { FOF_CUSTOM, resolveEngagementTypeLabel, resolveFofSelectKey, resolveFofSelectValue } from './fofOptions'
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
  engagementType: '',
  opforCount: '0',
  scenarioDuration: '',
  engagementRounds: '',
  coverUtilizationPercent: '',
  hitsTaken: '0',
  lethalHitsDelivered: '0',
  nonLethalHitsDelivered: '0',
  timeToFirstEngagement: '',
  friendlyCasualties: '0',
  decisionAccuracy: '',
  tacticalErrors: /** @type {string[]} */ ([]),
  blueOnBlue: false,
  selfTcccApplied: false,
  operationNote: '',
  debriefNotes: '',
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
 * @param {number} delivered
 * @param {number} taken
 */
function buildHitTakenRatio(delivered, taken) {
  const d = Math.max(0, delivered)
  const t = Math.max(0, taken)
  const ratio = t > 0 ? Math.round((d / t) * 100) / 100 : d
  return {
    hitsDelivered: d,
    hitTakenRatio: ratio,
    hitTakenRatioLabel: `${d}:${t}`,
  }
}

/**
 * @param {number} sec
 */
function formatDurationSeconds(sec) {
  if (!Number.isFinite(sec) || sec <= 0) return null
  const rounded = Math.round(sec * 1000) / 1000
  return `${rounded.toFixed(rounded < 10 ? 2 : 1)}s`
}

/**
 * @param {{
 *   userId: string
 *   scenarioType: string
 *   customScenarioType?: string
 *   simSystem: string
 *   customSimSystem?: string
 *   engagementType: string
 *   opforCount: number
 *   scenarioDuration: string | number
 *   coverUtilizationPercent: string | number
 *   hitsTaken: number
 *   lethalHitsDelivered: number
 *   nonLethalHitsDelivered: number
 *   timeToFirstEngagement: string | number
 *   friendlyCasualties: number
 *   engagementRounds: string | number
 *   decisionAccuracy: string | number
 *   tacticalErrors?: string[]
 *   blueOnBlue: boolean
 *   selfTcccApplied: boolean
 *   operationNote?: string
 *   debriefNotes?: string
 * }} input
 */
export function buildFofLogPayload({
  userId,
  scenarioType,
  customScenarioType = '',
  simSystem,
  customSimSystem = '',
  engagementType,
  opforCount,
  scenarioDuration,
  engagementRounds,
  coverUtilizationPercent,
  hitsTaken,
  lethalHitsDelivered,
  nonLethalHitsDelivered,
  timeToFirstEngagement,
  friendlyCasualties,
  decisionAccuracy,
  tacticalErrors = [],
  blueOnBlue,
  selfTcccApplied,
  operationNote = '',
  debriefNotes = '',
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
  const decisionAccuracyPct = Math.min(100, Math.max(0, Math.round(invNum(decisionAccuracy) * 10) / 10))

  const engagementTypeKey = invStr(engagementType).trim()
  const engagementTypeLabel = resolveEngagementTypeLabel(engagementTypeKey)
  const ratio = buildHitTakenRatio(lethal + nonLethal, hits)

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

  const debriefNotesText = invStr(debriefNotes ?? '').trim()

  return {
    userId,
    scenarioType: scenarioTypeLabel,
    scenarioTypeKey,
    customScenarioType:
      scenarioType === FOF_CUSTOM ? invStr(customScenarioType).trim() || null : null,
    simSystem: simSystemLabel,
    simSystemKey,
    customSimSystem: simSystem === FOF_CUSTOM ? invStr(customSimSystem).trim() || null : null,
    engagementType: engagementTypeKey,
    engagementTypeLabel,
    opforCount: opfor,
    scenarioDurationSec: durationSec,
    clearingTimeSec: durationSec,
    scenarioDuration: durationSec != null ? formatDurationSeconds(durationSec) : null,
    engagementRounds: rounds,
    coverUtilizationPercent: coverPercent,
    coverUtilizationLabel: coverPercent != null ? `${coverPercent}%` : null,
    hitsTaken: hits,
    lethalHitsDelivered: lethal,
    nonLethalHitsDelivered: nonLethal,
    hitsDelivered: ratio.hitsDelivered,
    hitTakenRatio: ratio.hitTakenRatio,
    hitTakenRatioLabel: ratio.hitTakenRatioLabel,
    timeToFirstEngagementSec: ttfeSec,
    timeToFirstEngagement: ttfeSec != null ? formatDurationSeconds(ttfeSec) : null,
    friendlyCasualties: parseCount(friendlyCasualties),
    decisionAccuracy: decisionAccuracyPct,
    tacticalErrors: errors,
    blueOnBlue: blueOnBlueFlag,
    selfTcccApplied: Boolean(selfTcccApplied),
    operationNote: operationNoteText,
    debriefNotes: debriefNotesText,
    operationCategory: 'fof',
    kind: 'FOF_DRILL',
    drillName: summaryLabel,
    shootType: summaryLabel,
    timestamp,
    status: 'active',
    successPercent,
  }
}
