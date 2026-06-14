import { invNum, invStr } from './inventoryIlws'
import {
  CQB_CUSTOM,
  labelTacticalError,
  resolveCqbSelectKey,
  resolveCqbSelectValue,
  resolveTacticalDecisionLabel,
} from './cqbOptions'
import { calculateCqbSuccessPercent } from './trainingSuccessScore'

/**
 * @param {number} sec
 */
function formatClearanceSeconds(sec) {
  if (!Number.isFinite(sec) || sec <= 0) return '—'
  const rounded = Math.round(sec * 1000) / 1000
  return `${rounded.toFixed(rounded < 10 ? 2 : 1)}s`
}

/**
 * @param {string | number} raw — saniye veya milisaniye (≥1000 ise ms kabul edilir)
 */
function parseClearanceTimeMs(raw) {
  const text = invStr(raw).trim().replace(',', '.')
  if (!text) return null
  const n = invNum(text)
  if (!Number.isFinite(n) || n <= 0) return null
  const ms = n >= 1000 ? Math.round(n) : Math.round(n * 1000)
  return ms
}

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
 *   clearanceTimeMs: string | number
 *   accuracyScore: string | number
 *   safetyViolations: string | number
 *   tacticalDecision: string
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
  clearanceTimeMs,
  accuracyScore,
  safetyViolations,
  tacticalDecision,
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

  const clearanceMs = parseClearanceTimeMs(clearanceTimeMs)
  const clearingTimeSec =
    clearanceMs != null ? Math.round((clearanceMs / 1000) * 1000) / 1000 : null

  const accuracy = Math.min(100, Math.max(0, Math.round(invNum(accuracyScore) * 10) / 10))
  const safetyCount = Math.max(0, Math.floor(invNum(safetyViolations)))

  const tacticalDecisionKey = invStr(tacticalDecision).trim()
  const tacticalDecisionLabel = resolveTacticalDecisionLabel(tacticalDecisionKey)

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
    clearanceTimeMs: clearanceMs,
    clearingTimeSec,
    clearingTime: clearingTimeSec != null ? formatClearanceSeconds(clearingTimeSec) : null,
    accuracyScore: accuracy,
    safetyViolations: safetyCount,
    tacticalDecision: tacticalDecisionKey,
    tacticalDecisionLabel,
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
