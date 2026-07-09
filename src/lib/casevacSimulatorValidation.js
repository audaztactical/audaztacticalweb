import { invNum, invStr } from './inventoryIlws'
import { CASEVAC_TRANSMISSION_DEADLINE_SEC } from './casevacSimulatorConstants'
import { healthT } from './healthDisplayText'

/** @typedef {typeof import('./casevacSimulatorConstants').CASEVAC_SIM_INITIAL} CasevacSimForm */

/** @param {CasevacSimForm} form */
export function getCasevacCasualtyCount(form) {
  return Math.max(0, Math.floor(invNum(form.casualty_count)))
}

/**
 * @param {CasevacSimForm} form
 * @returns {string[]}
 */
export function detectCasevacConflicts(form) {
  /** @type {string[]} */
  const issues = []
  const treatment = Array.isArray(form.mist_treatment) ? form.mist_treatment : []

  if (treatment.includes('tourniquet') && form.mist_vitals === 'shock_no') {
    issues.push('TOURNIQUET_WITHOUT_SHOCK')
  }

  if (form.mist_vitals === 'shock_yes' && treatment.includes('morphine')) {
    issues.push('MORPHINE_UNDER_SHOCK')
  }

  return issues
}

/** @param {CasevacSimForm} form */
export function isCasevacFormComplete(form) {
  const metric = Array.isArray(form.mist_metric) ? form.mist_metric : []
  const treatment = Array.isArray(form.mist_treatment) ? form.mist_treatment : []
  if (getCasevacCasualtyCount(form) < 1) return false
  if (metric.length === 0) return false
  if (!form.mist_injury_site) return false
  if (!form.mist_vitals) return false
  if (treatment.length === 0) return false
  if (!invStr(form.pickup_callsign).trim()) return false
  return true
}

/**
 * @param {CasevacSimForm} form
 * @param {{ timedOut?: boolean }} [opts]
 * @returns {string[]}
 */
export function buildCasevacRejectionReasons(form, { timedOut = false } = {}) {
  /** @type {string[]} */
  const reasons = []

  if (timedOut) {
    reasons.push(healthT('sim.reject.timeoutCasevac'))
  }

  const count = getCasevacCasualtyCount(form)
  if (count < 1) {
    reasons.push(healthT('sim.reject.casevacCount'))
  }

  const metric = Array.isArray(form.mist_metric) ? form.mist_metric : []
  if (metric.length === 0) {
    reasons.push(healthT('sim.reject.casevacMetric'))
  }

  if (!form.mist_injury_site) {
    reasons.push(healthT('sim.reject.casevacInjury'))
  }

  if (!form.mist_vitals) {
    reasons.push(healthT('sim.reject.casevacSigns'))
  }

  const treatment = Array.isArray(form.mist_treatment) ? form.mist_treatment : []
  if (treatment.length === 0) {
    reasons.push(healthT('sim.reject.casevacTreatment'))
  }

  if (!invStr(form.pickup_callsign).trim()) {
    reasons.push(healthT('sim.reject.casevacCallsign'))
  }

  if (treatment.includes('tourniquet') && form.mist_vitals === 'shock_no') {
    reasons.push(healthT('sim.reject.casevacTqShock'))
  }

  for (const code of detectCasevacConflicts(form)) {
    if (code === 'TOURNIQUET_WITHOUT_SHOCK') continue
    if (code === 'MORPHINE_UNDER_SHOCK') {
      reasons.push(healthT('sim.reject.casevacMorphine'))
    }
  }

  return reasons
}

/**
 * @param {CasevacSimForm} form
 * @param {number} elapsedSec
 * @param {{ timedOut?: boolean; forcedFailure?: boolean }} [opts]
 */
export function scoreCasevacTransmission(form, elapsedSec, opts = {}) {
  if (opts.forcedFailure || opts.timedOut) return 28
  if (buildCasevacRejectionReasons(form, { timedOut: false }).length > 0) return 26
  if (!isCasevacFormComplete(form)) return 30
  if (elapsedSec > CASEVAC_TRANSMISSION_DEADLINE_SEC) return 32

  let score = 96
  if (elapsedSec > 22) score -= 8
  else if (elapsedSec > 15) score -= 4
  return Math.max(90, Math.min(100, score))
}
