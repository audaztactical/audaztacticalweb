import { invStr } from './inventoryIlws'
import {
  TCCC_INJURY_EXTREMITY,
  TCCC_INJURY_POLYTRAUMA,
  TCCC_INJURY_THORACIC,
} from './tcccOptions'

const CQB_CRITICAL_ERRORS = new Set(['fatal_funnel_hang', 'muzzle_flagging', 'slow_breach'])

/**
 * @param {number} value
 */
export function roundSuccessPercent(value) {
  const n = Math.max(0, Math.min(100, Number(value) || 0))
  return Math.round(n * 10) / 10
}

/**
 * @param {number} actualSec
 * @param {number} thresholdSec
 * @param {number} maxPts
 */
function scaleDownPhaseSpeed(actualSec, thresholdSec, maxPts) {
  if (actualSec == null || !Number.isFinite(actualSec) || actualSec < 0) return 0
  if (actualSec <= thresholdSec) return maxPts
  return roundSuccessPercent(Math.max(0, maxPts * (thresholdSec / actualSec)))
}

/**
 * @param {{
 *   threatCount: number
 *   neutralizedCount: number
 *   clearingTimeSec: number | null
 *   tacticalErrors: string[]
 * }} input
 */
export function calculateCqbSuccessPercent({
  threatCount,
  neutralizedCount,
  clearingTimeSec,
  tacticalErrors,
}) {
  const threats = Math.max(0, Math.floor(threatCount))
  const neutralized = Math.min(Math.max(0, Math.floor(neutralizedCount)), threats)

  const domination =
    threats === 0 ? 40 : roundSuccessPercent((neutralized / threats) * 40)

  let precision = 40
  const errors = Array.isArray(tacticalErrors) ? tacticalErrors : []
  for (const raw of errors) {
    const id = invStr(raw).trim()
    if (!id) continue
    if (CQB_CRITICAL_ERRORS.has(id)) precision -= 15
    else precision -= 5
  }
  precision = Math.max(0, precision)

  let timing = 0
  if (clearingTimeSec != null && Number.isFinite(clearingTimeSec) && clearingTimeSec >= 0) {
    timing =
      clearingTimeSec <= 5
        ? 20
        : Math.max(0, 20 - (clearingTimeSec - 5) * 2)
  }

  return roundSuccessPercent(domination + precision + timing)
}

/**
 * @param {{
 *   blueOnBlue: boolean
 *   hitsTaken: number
 *   opforCount: number
 *   lethalHitsDelivered: number
 *   coverUtilizationPercent: number | null
 *   selfTcccApplied: boolean
 *   tacticalErrors?: string[]
 *   engagementRounds?: number
 *   nonLethalHitsDelivered?: number
 * }} input
 */
export function calculateFofSuccessPercent({
  blueOnBlue,
  hitsTaken,
  opforCount,
  lethalHitsDelivered,
  coverUtilizationPercent,
  selfTcccApplied,
  tacticalErrors = [],
  engagementRounds = 0,
  nonLethalHitsDelivered = 0,
}) {
  if (blueOnBlue) return 0

  const hits = Math.max(0, Math.floor(hitsTaken))
  const opfor = Math.max(0, Math.floor(opforCount))
  const lethal = Math.max(0, Math.floor(lethalHitsDelivered))
  const nonLethal = Math.max(0, Math.floor(nonLethalHitsDelivered))
  const rounds = Math.max(0, Math.floor(engagementRounds))

  const survival = Math.max(0, 40 - hits * 10)

  let combatEfficiency = 40
  if (rounds > 0) {
    combatEfficiency = roundSuccessPercent(Math.min(40, ((lethal + nonLethal) / rounds) * 40))
  } else if (opfor > 0) {
    combatEfficiency = roundSuccessPercent(Math.min(40, (lethal / opfor) * 40))
  }

  let tactical = 0
  const cover =
    coverUtilizationPercent != null && Number.isFinite(coverUtilizationPercent)
      ? Math.max(0, coverUtilizationPercent)
      : null
  if (cover != null) {
    tactical = cover >= 80 ? 20 : roundSuccessPercent((cover / 80) * 20)
  }

  let total = survival + combatEfficiency + tactical
  if (selfTcccApplied) total += 10

  const errors = Array.isArray(tacticalErrors) ? tacticalErrors : []
  for (const raw of errors) {
    const id = invStr(raw).trim()
    if (id === 'muzzle_flagging') total -= 18
    else if (id === 'slow_breach') total -= 12
    else if (id === 'blue_on_blue') total = 0
  }

  return roundSuccessPercent(Math.min(100, Math.max(0, total)))
}

/**
 * @param {{
 *   boardingTimeSec: number | null
 *   bridgeControlTimeSec: number | null
 *   engineRoomControlTimeSec: number | null
 *   commsBlackoutSuccess: boolean
 *   scuttlingAttempt: boolean
 *   contrabandFound: boolean
 *   biometricCheck: boolean
 *   tacticalErrors?: string[]
 * }} input
 */
export function calculateVbssSuccessPercent({
  boardingTimeSec,
  bridgeControlTimeSec,
  engineRoomControlTimeSec,
  commsBlackoutSuccess,
  scuttlingAttempt,
  contrabandFound,
  biometricCheck,
  tacticalErrors = [],
}) {
  const boardingPts = scaleDownPhaseSpeed(boardingTimeSec, 45, 20)
  const bridgePts = scaleDownPhaseSpeed(bridgeControlTimeSec, 120, 15)
  const enginePts = scaleDownPhaseSpeed(engineRoomControlTimeSec, 180, 15)
  const speedAnalytics = boardingPts + bridgePts + enginePts

  let checklist = 0
  if (commsBlackoutSuccess) checklist += 15
  if (scuttlingAttempt) checklist += 20
  if (contrabandFound || biometricCheck) checklist += 15

  let total = speedAnalytics + checklist
  const errors = Array.isArray(tacticalErrors) ? tacticalErrors : []
  for (const raw of errors) {
    const id = invStr(raw).trim()
    if (id === 'fatal_funnel_hang') total -= 22
    else if (id === 'poor_corner_piercing') total -= 14
  }

  return roundSuccessPercent(Math.max(0, total))
}

const TCCC_GOLDEN_HOUR_MAX = 40
const TCCC_MARCH_MAX = 40
const TCCC_HYPOTHERMIA_MAX = 10
const TCCC_EVAC_MAX = 10

/**
 * @param {boolean[]} checks
 * @param {number} maxPts
 */
function proportionalMarchScore(checks, maxPts) {
  if (!checks.length) return 0
  const ptsEach = maxPts / checks.length
  return roundSuccessPercent(checks.filter(Boolean).length * ptsEach)
}

/**
 * @param {string} injuryType
 */
export function isTcccGoldenHourApplicable(injuryType) {
  const k = String(injuryType || '').trim()
  return k === TCCC_INJURY_EXTREMITY || k === TCCC_INJURY_POLYTRAUMA
}

/**
 * @param {string} injuryType
 * @returns {Set<string>}
 */
export function getTcccScoredMarchInterventions(injuryType) {
  const k = String(injuryType || '').trim()
  if (k === TCCC_INJURY_EXTREMITY) {
    return new Set(['tourniquetApplied', 'woundPacking'])
  }
  if (k === TCCC_INJURY_THORACIC) {
    return new Set(['chestSealApplied', 'needleDecompression'])
  }
  if (k === TCCC_INJURY_POLYTRAUMA) {
    return new Set([
      'tourniquetApplied',
      'woundPacking',
      'npaInserted',
      'chestSealApplied',
      'needleDecompression',
    ])
  }
  return new Set()
}

/**
 * @param {string} injuryType
 * @param {{
 *   injuryToTqTimeSec: number | null
 *   tourniquetApplied: boolean
 * }} input
 */
function calculateTcccGoldenHourScore(injuryType, { injuryToTqTimeSec, tourniquetApplied }) {
  if (!isTcccGoldenHourApplicable(injuryType)) return 0

  const tqSec =
    injuryToTqTimeSec != null && Number.isFinite(injuryToTqTimeSec) ? injuryToTqTimeSec : null
  if (!tourniquetApplied || tqSec == null) return 0
  if (tqSec <= 60) return TCCC_GOLDEN_HOUR_MAX
  if (tqSec <= 120) return 20
  return 0
}

/**
 * @param {string} injuryType
 * @param {{
 *   tourniquetApplied: boolean
 *   woundPacking: boolean
 *   npaInserted: boolean
 *   chestSealApplied: boolean
 *   needleDecompression: boolean
 * }} input
 */
function calculateTcccMarchFidelityScore(
  injuryType,
  { tourniquetApplied, woundPacking, npaInserted, chestSealApplied, needleDecompression }
) {
  const k = String(injuryType || '').trim()

  if (k === TCCC_INJURY_EXTREMITY) {
    return proportionalMarchScore([tourniquetApplied, woundPacking], TCCC_MARCH_MAX)
  }
  if (k === TCCC_INJURY_THORACIC) {
    return proportionalMarchScore([chestSealApplied, needleDecompression], TCCC_MARCH_MAX)
  }
  if (k === TCCC_INJURY_POLYTRAUMA) {
    return proportionalMarchScore(
      [tourniquetApplied, woundPacking, npaInserted, chestSealApplied, needleDecompression],
      TCCC_MARCH_MAX
    )
  }
  return 0
}

/**
 * @param {boolean} hypothermiaBlanket
 */
function calculateTcccHypothermiaScore(hypothermiaBlanket) {
  return hypothermiaBlanket ? TCCC_HYPOTHERMIA_MAX : 0
}

/**
 * @param {number | null} evacWaitingTimeMin
 * @param {string} operationNote
 */
function calculateTcccEvacScore(evacWaitingTimeMin, operationNote = '') {
  if (evacWaitingTimeMin != null && Number.isFinite(evacWaitingTimeMin)) {
    const evac = Math.max(0, evacWaitingTimeMin)
    if (evac <= 15) return TCCC_EVAC_MAX
    if (evac <= 30) return 6
    return Math.max(0, roundSuccessPercent(TCCC_EVAC_MAX - (evac - 15) * 0.25))
  }
  if (invStr(operationNote).trim()) return 7
  return 5
}

/**
 * @param {{
 *   injuryType: string
 *   injuryToTqTimeSec: number | null
 *   tourniquetApplied: boolean
 *   chestSealApplied: boolean
 *   npaInserted: boolean
 *   needleDecompression: boolean
 *   woundPacking: boolean
 *   hypothermiaBlanket: boolean
 *   evacWaitingTimeMin: number | null
 *   operationNote?: string
 * }} input
 */
export function calculateTcccSuccessPercent({
  injuryType,
  injuryToTqTimeSec,
  tourniquetApplied,
  chestSealApplied,
  npaInserted,
  needleDecompression,
  woundPacking,
  hypothermiaBlanket,
  evacWaitingTimeMin,
  operationNote = '',
}) {
  const goldenHour = calculateTcccGoldenHourScore(injuryType, {
    injuryToTqTimeSec,
    tourniquetApplied,
  })
  const marchFidelity = calculateTcccMarchFidelityScore(injuryType, {
    tourniquetApplied,
    woundPacking,
    npaInserted,
    chestSealApplied,
    needleDecompression,
  })
  const hypothermiaPts = calculateTcccHypothermiaScore(hypothermiaBlanket)
  const evacMgmt = calculateTcccEvacScore(evacWaitingTimeMin, operationNote)

  return roundSuccessPercent(
    Math.min(100, goldenHour + marchFidelity + hypothermiaPts + evacMgmt)
  )
}

/**
 * @param {Record<string, unknown>} row
 */
export function getLogSuccessPercent(row) {
  if (row.successPercent == null || row.successPercent === '') return null
  const n = Number(row.successPercent)
  if (!Number.isFinite(n)) return null
  return roundSuccessPercent(n)
}

/**
 * @param {Record<string, unknown>} row
 */
export function formatSuccessPercentCell(row) {
  const n = getLogSuccessPercent(row)
  return n != null ? `${n}%` : '—'
}
