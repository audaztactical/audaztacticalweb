import { invNum, invStr } from './inventoryIlws'
import {
  CQB_BREACHING_NA,
  CQB_CUSTOM,
  CQB_DOOR_OPEN,
  isKnownCqbSelectId,
} from './cqbOptions'

/**
 * @param {typeof import('./cqbOptions').CQB_INITIAL_FORM} form
 * @param {{
 *   uid?: string
 *   saving?: boolean
 *   threatNum?: number
 *   neutralizedNum?: number
 * }} ctx
 * @returns {{ key: string, params?: Record<string, unknown> } | null}
 */
export function evaluateCqbSubmitBlockedReason(form, ctx = {}) {
  const { uid = '', saving = false, threatNum, neutralizedNum } = ctx
  if (saving) return null
  if (!uid) return { key: 'sessionRequired' }

  const roomTopology = invStr(form.roomTopology).trim()
  if (!roomTopology || !isKnownCqbSelectId('roomTopology', roomTopology)) {
    return { key: 'roomTopologyRequired' }
  }
  if (roomTopology === CQB_CUSTOM && !invStr(form.customRoomTopology).trim()) {
    return { key: 'customRoomRequired' }
  }

  const entryMethod = invStr(form.entryMethod).trim()
  if (!entryMethod || !isKnownCqbSelectId('entryMethod', entryMethod)) {
    return { key: 'entryMethodRequired' }
  }
  if (entryMethod === CQB_CUSTOM && !invStr(form.customEntryMethod).trim()) {
    return { key: 'customEntryRequired' }
  }

  const doorState = invStr(form.doorState).trim()
  if (!doorState || !isKnownCqbSelectId('doorState', doorState)) {
    return { key: 'doorStateRequired' }
  }

  const breachingRequired = doorState !== CQB_DOOR_OPEN
  const breachingType = invStr(form.breachingType).trim()
  if (breachingRequired) {
    if (!breachingType || !isKnownCqbSelectId('breachingType', breachingType)) {
      return { key: 'breachingRequired' }
    }
    if (breachingType === CQB_CUSTOM && !invStr(form.customBreachingType).trim()) {
      return { key: 'customBreachingRequired' }
    }
  }

  const teamSize = invStr(form.teamSize).trim()
  if (!teamSize || !isKnownCqbSelectId('teamSize', teamSize)) {
    return { key: 'teamSizeRequired' }
  }

  const threats = threatNum ?? Math.max(0, Math.floor(invNum(form.threatCount)))
  const neutralized = neutralizedNum ?? Math.max(0, Math.floor(invNum(form.neutralizedCount)))
  if (neutralized > threats) return { key: 'neutralizedExceedsThreat' }

  const clearanceRaw = invStr(form.clearanceTimeMs).trim().replace(',', '.')
  const clearanceMs = clearanceRaw ? invNum(clearanceRaw) : NaN
  if (clearanceRaw === '' || !Number.isFinite(clearanceMs) || clearanceMs <= 0) {
    return { key: 'clearanceTimeRequired' }
  }

  const accuracyRaw = invStr(form.accuracyScore).trim().replace(',', '.')
  const accuracy = accuracyRaw === '' ? NaN : invNum(accuracyRaw)
  if (accuracyRaw === '' || !Number.isFinite(accuracy) || accuracy < 0 || accuracy > 100) {
    return { key: 'accuracyRequired' }
  }

  const safetyRaw = invStr(form.safetyViolations).trim()
  const safety = safetyRaw === '' ? NaN : invNum(safetyRaw)
  if (safetyRaw === '' || !Number.isFinite(safety) || safety < 0) return { key: 'safetyRequired' }

  const tacticalDecision = invStr(form.tacticalDecision).trim()
  if (!tacticalDecision || !isKnownCqbSelectId('tacticalDecision', tacticalDecision)) {
    return { key: 'decisionRequired' }
  }

  return null
}

/**
 * @param {string} doorState
 * @param {string} breachingType
 */
export function resolveCqbBreachingTypeForDoor(doorState, breachingType) {
  if (invStr(doorState).trim() === CQB_DOOR_OPEN) return CQB_BREACHING_NA
  if (invStr(breachingType).trim() === CQB_BREACHING_NA) return ''
  return breachingType
}
