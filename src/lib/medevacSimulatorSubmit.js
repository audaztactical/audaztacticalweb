import { invStr } from './inventoryIlws'
import { sanitizeForFirestore } from './firestoreSanitize'
import { buildMedevac9LinePayload } from './medevacPayload'
import { MEDEVAC_NINE_LINE_INITIAL } from './tcccHealthConstants'
import { roundSuccessPercent } from './trainingSuccessScore'
import { buildSimulationTimingFields } from './simulationHistoryHelpers'
import {
  MEDEVAC_TRANSMISSION_DEADLINE_SEC,
  detectNineLineConflicts,
  isNineLineFormComplete,
  scoreMedevacTransmission,
} from './medevacSimulatorValidation'

/**
 * @param {typeof import('./medevacSimulatorConstants').MEDEVAC_SIM_INITIAL} form
 */
export function simFormToMedevacNineLine(form) {
  const line4 = Array.isArray(form.line4_equipment) ? form.line4_equipment : []
  return {
    ...MEDEVAC_NINE_LINE_INITIAL,
    line1_pickupGrid: invStr(form.line1_mgrs).trim(),
    line2_radioFreqCallsign: invStr(form.line2_freq_callsign).trim(),
    line3_patientsPrecedence: {
      urgent: invStr(form.line3_urgent),
      urgentSurge: invStr(form.line3_urgent_surge),
      priority: invStr(form.line3_priority),
      routine: invStr(form.line3_routine),
      convenience: invStr(form.line3_convenience),
    },
    line4_medicalEquipment: {
      hoist: line4.includes('hoist'),
      ventilator: line4.includes('ventilator'),
      oxygen: line4.includes('extraction'),
    },
    line5_patientsType: {
      litter: invStr(form.line5_litter),
      ambulatory: invStr(form.line5_ambulatory),
    },
    line6_pickupSecurity: mapSimSecurityToLegacy(form.line6_security),
    line7_lzMarking: {
      method: mapSimMarkingToLegacy(form.line7_marking),
      smokeColor: form.line7_marking === 'smoke' ? 'green' : '',
    },
    line8_patientNationality: mapSimNationalityToLegacy(form.line8_nationality),
    line9_cbrnTerrain: [form.line9_cbrn, form.line9_terrain].filter(Boolean).join(' · '),
  }
}

/** @param {string} id */
function mapSimSecurityToLegacy(id) {
  const map = {
    no_enemy: 'no_troops',
    possible_enemy: 'no_threat',
    enemy_area: 'enemy_area',
    armed_escort: 'hot_lz',
  }
  return map[/** @type {keyof typeof map} */ (id)] ?? 'no_troops'
}

/** @param {string} id */
function mapSimMarkingToLegacy(id) {
  const map = {
    panels: 'panels',
    pyrotechnic: 'strobe',
    smoke: 'smoke',
    none: 'panels',
  }
  return map[/** @type {keyof typeof map} */ (id)] ?? 'panels'
}

/** @param {string} id */
function mapSimNationalityToLegacy(id) {
  const map = {
    us_nato: 'friendly',
    non_nato: 'allied',
    civilian: 'civilian',
    epw: 'pow',
    military: 'friendly',
    non_combatant: 'pow',
  }
  return map[/** @type {keyof typeof map} */ (id)] ?? 'friendly'
}

/**
 * @param {{
 *   addRangeLog: (payload: Record<string, unknown>) => Promise<{ id: string }>
 *   addMedevacLog?: (payload: Record<string, unknown>) => Promise<unknown>
 *   userId: string
 *   form: typeof import('./medevacSimulatorConstants').MEDEVAC_SIM_INITIAL
 *   elapsedSec: number
 *   timedOut?: boolean
 *   finalRemaining?: number
 *   failureReason?: string | null
 *   rejectionReasons?: string[]
 * }} p
 */
export async function submitMedevacSimulatorSession({
  addRangeLog,
  addMedevacLog,
  userId,
  form,
  elapsedSec,
  timedOut = false,
  finalRemaining,
  failureReason = null,
  rejectionReasons = [],
}) {
  const timing = buildSimulationTimingFields('medevac', elapsedSec, timedOut, finalRemaining)
  const effectiveElapsed = timing.elapsedTime
  const hasOvertime = timing.overtime > 0

  const conflicts = detectNineLineConflicts(form)
  const complete = isNineLineFormComplete(form)
  const failed =
    hasOvertime ||
    timedOut ||
    Boolean(failureReason) ||
    conflicts.length > 0 ||
    !complete ||
    effectiveElapsed > MEDEVAC_TRANSMISSION_DEADLINE_SEC

  let successPercent = scoreMedevacTransmission(form, effectiveElapsed, {
    timedOut: timedOut || hasOvertime,
    forcedFailure: failed,
  })
  if (failed) successPercent = Math.min(38, successPercent)

  const success = !failed && successPercent >= 85

  const nineLine = simFormToMedevacNineLine(form)
  const grid = invStr(form.line1_mgrs).trim()

  const rangePayload = sanitizeForFirestore({
    userId,
    ownerId: userId,
    operationCategory: 'tccc',
    kind: 'TCCC_DRILL',
    drillName: success
      ? `9-LINE MEDEVAC SIM · TRANSMISSION OK · ${grid.slice(0, 20)}`
      : '9-LINE MEDEVAC SIM · TRANSMISSION FAILURE / COLD HIT',
    shootType: 'MEDEVAC_9LINE_RADIO_SIM',
    tcccPhase: 'MEDEVAC · 9-LINE',
    tcccPhaseKey: 'medevac_9line',
    timestamp: new Date().toISOString(),
    status: 'active',
    successPercent: roundSuccessPercent(successPercent),
    medevacSim: true,
    ...timing,
    medevacTransmissionSuccess: success,
    tcccSimStatus: hasOvertime || failed ? 'BAŞARISIZ' : success ? 'BAŞARILI' : 'BAŞARISIZ',
    medevacFailureReason: failureReason ?? (failed ? 'TRANSMISSION FAILURE' : null),
    simRejectionReasons: rejectionReasons,
    medevacSimForm: form,
    medevacNineLine: nineLine.medevacNineLine ?? nineLine,
    operationNote: success
      ? `9-LINE transmitted in ${Math.round(effectiveElapsed)}s · BIRD OUTBOARD`
      : `MEDEVAC TRANSMISSION FAILURE · ${failureReason ?? 'TIMEOUT / INVALID 9-LINE'}`,
  })

  const rangeRef = await addRangeLog(/** @type {Record<string, unknown>} */ (rangePayload))

  if (addMedevacLog && success) {
    const medPayload = buildMedevac9LinePayload(nineLine, userId)
    medPayload.successPercent = roundSuccessPercent(successPercent)
    medPayload.medevacSim = true
    await addMedevacLog(sanitizeForFirestore(medPayload))
  }

  return {
    logId: String(rangeRef?.id ?? ''),
    success,
    successPercent: roundSuccessPercent(successPercent),
  }
}
