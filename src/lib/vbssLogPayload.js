import { invNum, invStr } from './inventoryIlws'
import { VBSS_CUSTOM, resolveVbssSelectKey, resolveVbssSelectValue } from './vbssOptions'
import { buildVbssTacticalErrorsForPayload } from './vbssTacticalErrors'
import { calculateVbssSuccessPercent } from './trainingSuccessScore'

export const VBSS_INITIAL_FORM = {
  insertionMethod: '',
  customInsertionMethod: '',
  vesselType: '',
  customVesselType: '',
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
 * }} input
 */
export function buildVbssLogPayload({
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
  tacticalErrors = [],
  contrabandFound,
  biometricCheck,
  scuttlingAttempt,
  commsBlackoutSuccess,
  operationNote = '',
}) {
  const insertionMethodLabel = resolveVbssSelectValue(insertionMethod, customInsertionMethod)
  const insertionMethodKey = resolveVbssSelectKey(insertionMethod, customInsertionMethod)
  const vesselTypeLabel = resolveVbssSelectValue(vesselType, customVesselType)
  const vesselTypeKey = resolveVbssSelectKey(vesselType, customVesselType)
  const seaStateLabel = resolveVbssSelectValue(seaState, customSeaState)
  const seaStateKey = resolveVbssSelectKey(seaState, customSeaState)

  const boardingSec = parseOptionalNonNegativeNumber(boardingTime)
  const bridgeSec = parseOptionalNonNegativeNumber(bridgeControlTime)
  const engineSec = parseOptionalNonNegativeNumber(engineRoomControlTime)
  const containmentSec = parseOptionalNonNegativeNumber(containmentTime)
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
    insertionMethod: insertionMethodLabel,
    insertionMethodKey,
    customInsertionMethod:
      insertionMethod === VBSS_CUSTOM ? invStr(customInsertionMethod).trim() || null : null,
    vesselType: vesselTypeLabel,
    vesselTypeKey,
    customVesselType:
      vesselType === VBSS_CUSTOM ? invStr(customVesselType).trim() || null : null,
    boardingTimeSec: boardingSec,
    boardingTime: boardingSec != null ? `${boardingSec}s` : null,
    bridgeControlTimeSec: bridgeSec,
    bridgeControlTime: bridgeSec != null ? `${bridgeSec}s` : null,
    engineRoomControlTimeSec: engineSec,
    engineRoomControlTime: engineSec != null ? `${engineSec}s` : null,
    containmentTimeSec: containmentSec,
    containmentTime: containmentSec != null ? `${containmentSec}s` : null,
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
