import { invNum, invStr } from './inventoryIlws'
import { VBSS_CUSTOM, resolveVbssSelectKey, resolveVbssSelectValue } from './vbssOptions'
import { buildVbssTacticalErrorsForPayload } from './vbssTacticalErrors'
import { calculateVbssSuccessPercent } from './trainingSuccessScore'

/**
 * @param {number | null | undefined} sec
 */
export function formatVbssClockSeconds(sec) {
  if (sec == null || !Number.isFinite(sec) || sec < 0) return '—'
  return `${sec.toFixed(2)}s`
}

export const VBSS_INITIAL_FORM = {
  boardingPoint: '',
  customBoardingPoint: '',
  vesselType: '',
  customVesselType: '',
  searchDuration: '',
  threatLevel: '',
  insertionMethod: '',
  customInsertionMethod: '',
  boardingTime: '',
  bridgeControlTime: '',
  engineRoomControlTime: '',
  containmentTime: '',
  seaState: '',
  customSeaState: '',
  vesselSpeed: '',
  crewCount: '0',
  tacticalErrors: /** @type {string[]} */ ([]),
  contrabandFound: false,
  biometricCheck: false,
  scuttlingAttempt: false,
  commsBlackoutSuccess: false,
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
 *   boardingPoint?: string
 *   customBoardingPoint?: string
 *   searchDuration?: string | number
 *   threatLevel?: string
 *   boardingTime: string | number
 *   bridgeControlTime: string | number
 *   engineRoomControlTime: string | number
 *   containmentTime: string | number
 *   insertionMethod?: string
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
 * }} input
 */
export function buildVbssLogPayload({
  userId,
  boardingPoint = '',
  customBoardingPoint = '',
  searchDuration = '',
  threatLevel = '',
  boardingTime,
  bridgeControlTime,
  engineRoomControlTime,
  containmentTime,
  insertionMethod = '',
  customInsertionMethod = '',
  vesselType,
  customVesselType = '',
  seaState,
  customSeaState = '',
  vesselSpeed,
  crewCount,
  tacticalErrors = [],
  contrabandFound,
  biometricCheck,
  scuttlingAttempt,
  commsBlackoutSuccess,
  operationNote = '',
}) {
  const boardingPointKey = resolveVbssSelectKey(
    boardingPoint || insertionMethod,
    customBoardingPoint || customInsertionMethod
  )
  const boardingPointLabel = resolveVbssSelectValue(
    boardingPoint || insertionMethod,
    customBoardingPoint || customInsertionMethod
  )
  const insertionMethodLabel = boardingPointLabel
  const insertionMethodKey = boardingPointKey
  const vesselTypeLabel = resolveVbssSelectValue(vesselType, customVesselType)
  const vesselTypeKey = resolveVbssSelectKey(vesselType, customVesselType)
  const seaStateLabel = resolveVbssSelectValue(seaState, customSeaState)
  const seaStateKey = resolveVbssSelectKey(seaState, customSeaState)
  const threatLevelLabel = resolveVbssSelectValue(threatLevel)
  const threatLevelKey = resolveVbssSelectKey(threatLevel)

  const boardingSec = parseOptionalNonNegativeNumber(boardingTime)
  const bridgeSec = parseOptionalNonNegativeNumber(bridgeControlTime)
  const engineSec = parseOptionalNonNegativeNumber(engineRoomControlTime)
  const containmentSec = parseOptionalNonNegativeNumber(containmentTime)
  const searchDurationSec = parseOptionalNonNegativeNumber(searchDuration)
  const speedKnots = parseOptionalNonNegativeNumber(vesselSpeed)

  const operationNoteText = invStr(operationNote ?? '').trim()
  const timestamp = new Date().toISOString()

  const summaryLabel = [insertionMethodLabel, vesselTypeLabel, seaStateLabel]
    .filter(Boolean)
    .join(' · ')

  const errors = buildVbssTacticalErrorsForPayload(tacticalErrors)

  const successPercent = calculateVbssSuccessPercent({
    boardingTimeSec: boardingSec,
    bridgeControlTimeSec: bridgeSec,
    engineRoomControlTimeSec: engineSec,
    commsBlackoutSuccess: Boolean(commsBlackoutSuccess),
    scuttlingAttempt: Boolean(scuttlingAttempt),
    contrabandFound: Boolean(contrabandFound),
    biometricCheck: Boolean(biometricCheck),
    tacticalErrors: errors,
  })

  return {
    userId,
    boardingPoint: boardingPointLabel,
    boardingPointKey,
    customBoardingPoint:
      (boardingPoint || insertionMethod) === VBSS_CUSTOM
        ? invStr(customBoardingPoint || customInsertionMethod).trim() || null
        : null,
    insertionMethod: insertionMethodLabel,
    insertionMethodKey,
    customInsertionMethod:
      (boardingPoint || insertionMethod) === VBSS_CUSTOM
        ? invStr(customBoardingPoint || customInsertionMethod).trim() || null
        : null,
    vesselType: vesselTypeLabel,
    vesselTypeKey,
    customVesselType:
      vesselType === VBSS_CUSTOM ? invStr(customVesselType).trim() || null : null,
    searchDurationSec,
    searchDuration: searchDurationSec != null ? formatVbssClockSeconds(searchDurationSec) : null,
    threatLevel: threatLevelLabel,
    threatLevelKey,
    boardingTimeSec: boardingSec,
    boardingTime: boardingSec != null ? formatVbssClockSeconds(boardingSec) : null,
    bridgeControlTimeSec: bridgeSec,
    bridgeControlTime: bridgeSec != null ? formatVbssClockSeconds(bridgeSec) : null,
    engineRoomControlTimeSec: engineSec,
    engineRoomControlTime: engineSec != null ? formatVbssClockSeconds(engineSec) : null,
    containmentTimeSec: containmentSec,
    containmentTime: containmentSec != null ? formatVbssClockSeconds(containmentSec) : null,
    seaState: seaStateLabel,
    seaStateKey,
    customSeaState: seaState === VBSS_CUSTOM ? invStr(customSeaState).trim() || null : null,
    vesselSpeedKnots: speedKnots,
    vesselSpeed: speedKnots != null ? `${speedKnots} kt` : null,
    crewCount: parseCount(crewCount),
    tacticalErrors: errors,
    contrabandFound: Boolean(contrabandFound),
    biometricCheck: Boolean(biometricCheck),
    scuttlingAttempt: Boolean(scuttlingAttempt),
    commsBlackoutSuccess: Boolean(commsBlackoutSuccess),
    operationNote: operationNoteText,
    operationCategory: 'vbss',
    kind: 'VBSS_DRILL',
    drillName: summaryLabel,
    shootType: summaryLabel,
    timestamp,
    status: 'active',
    successPercent,
  }
}
