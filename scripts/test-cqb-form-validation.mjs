import assert from 'node:assert/strict'
import {
  CQB_BREACHING_NA,
  CQB_CUSTOM,
  CQB_DOOR_OPEN,
  createCqbInitialForm,
  isKnownCqbSelectId,
} from '../src/lib/cqbOptions.js'

function invStr(value) {
  return value == null ? '' : String(value)
}

function invNum(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : NaN
}

function evaluateCqbSubmitBlockedReason(form, ctx = {}) {
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

const uid = 'test-user-uid'

function filledForm(patch = {}) {
  return {
    ...createCqbInitialForm(),
    roomTopology: 'center_fed',
    entryMethod: 'limited_penetration',
    breachingType: 'manual',
    doorState: 'closed_inward',
    teamSize: '2-Man',
    threatCount: '0',
    neutralizedCount: '0',
    clearanceTimeMs: '30',
    accuracyScore: '0',
    safetyViolations: '0',
    tacticalDecision: 'correct',
    ...patch,
  }
}

function runCase(name, form, expectedKey) {
  const result = evaluateCqbSubmitBlockedReason(form, { uid })
  const key = result?.key ?? null
  assert.equal(key, expectedKey, `${name}: expected ${expectedKey}, got ${key}`)
  console.log(`PASS ${name}`)
}

runCase('empty topology blocked', createCqbInitialForm(), 'roomTopologyRequired')
runCase('selected topology accepted', filledForm(), null)
runCase('topology id center_fed not false positive', filledForm({ roomTopology: 'center_fed' }), null)
runCase('zero threats and neutralized accepted', filledForm({ threatCount: '0', neutralizedCount: '0' }), null)
runCase('zero accuracy accepted', filledForm({ accuracyScore: '0' }), null)
runCase('neutralized exceeds threat blocked', filledForm({ threatCount: '0', neutralizedCount: '1' }), 'neutralizedExceedsThreat')
runCase('open door skips breaching requirement', filledForm({ doorState: 'open', breachingType: CQB_BREACHING_NA }), null)
runCase('open door with empty breaching still ok', filledForm({ doorState: 'open', breachingType: '' }), null)
runCase('closed door requires breaching', filledForm({ doorState: 'closed_inward', breachingType: '' }), 'breachingRequired')
runCase('clearance zero still blocked', filledForm({ clearanceTimeMs: '0' }), 'clearanceTimeRequired')
runCase('full empty-room scenario', filledForm({
  doorState: 'open',
  breachingType: CQB_BREACHING_NA,
  threatCount: '0',
  neutralizedCount: '0',
  accuracyScore: '0',
  clearanceTimeMs: '25',
}), null)

console.log('\nAll CQB validation tests passed.')
