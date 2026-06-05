import { invNum, invStr } from './inventoryIlws'
import {
  CQB_CUSTOM,
  labelTacticalError,
  resolveCqbSelectKey,
  resolveCqbSelectValue,
} from './cqbOptions'
import { calculateCqbSuccessPercent } from './trainingSuccessScore'

/**
 * @param {{
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
 * }} input
 */
export function buildCqbLogPayload({
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
  const roomTopologyLabel = resolveCqbSelectValue(roomTopology, customRoomTopology)
  const entryMethodLabel = resolveCqbSelectValue(entryMethod, customEntryMethod)
  const breachingTypeLabel = resolveCqbSelectValue(breachingType, customBreachingType)
  const doorStateLabel = resolveCqbSelectValue(doorState)

  const roomTopologyKey = resolveCqbSelectKey(roomTopology, customRoomTopology)
  const entryMethodKey = resolveCqbSelectKey(entryMethod, customEntryMethod)
  const breachingTypeKey = resolveCqbSelectKey(breachingType, customBreachingType)

  const threats = Math.max(0, Math.floor(threatCount))
  const neutralized = Math.min(Math.max(0, Math.floor(neutralizedCount)), threats)

  const clearingRaw = invStr(clearingTime).trim().replace(',', '.')
  const clearingSec = clearingRaw ? invNum(clearingRaw) : null
  const clearingTimeSec =
    clearingSec != null && Number.isFinite(clearingSec) && clearingSec >= 0
      ? Math.round(clearingSec * 1000) / 1000
      : null

  const errors = Array.isArray(tacticalErrors)
    ? tacticalErrors.map((e) => invStr(e).trim()).filter(Boolean)
    : []

  const tacticalErrorsLabels = errors.map((id) => labelTacticalError(id))

  const operationNoteText = invStr(operationNote ?? '').trim()
  const timestamp = new Date().toISOString()
  const teamSizeLabel = invStr(teamSize).trim() || '—'

  const summaryLabel = [
    roomTopologyLabel,
    entryMethodLabel,
    breachingTypeLabel,
    teamSizeLabel,
  ]
    .filter(Boolean)
    .join(' · ')

  const successPercent = calculateCqbSuccessPercent({
    threatCount: threats,
    neutralizedCount: neutralized,
    clearingTimeSec,
    tacticalErrors: errors,
  })

  return {
    userId,
    roomTopology: roomTopologyLabel,
    roomTopologyKey,
    customRoomTopology:
      roomTopology === CQB_CUSTOM ? invStr(customRoomTopology).trim() || null : null,
    entryMethod: entryMethodLabel,
    entryMethodKey,
    customEntryMethod:
      entryMethod === CQB_CUSTOM ? invStr(customEntryMethod).trim() || null : null,
    breachingType: breachingTypeLabel,
    breachingTypeKey,
    customBreachingType:
      breachingType === CQB_CUSTOM ? invStr(customBreachingType).trim() || null : null,
    doorState: doorStateLabel,
    doorStateKey: invStr(doorState).trim() || null,
    teamSize: teamSizeLabel,
    threatCount: threats,
    neutralizedCount: neutralized,
    clearingTimeSec,
    clearingTime: clearingTimeSec != null ? `${clearingTimeSec}s` : null,
    tacticalErrors: errors,
    tacticalErrorsLabels,
    operationNote: operationNoteText,
    operationCategory: 'cqb',
    kind: 'CQB_DRILL',
    drillName: summaryLabel,
    shootType: summaryLabel,
    timestamp,
    status: 'active',
    successPercent,
  }
}
