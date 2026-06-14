import { invStr } from './inventoryIlws'
import { attachMeteoDataToPayload } from './meteoDataCapture'
import { sanitizeForFirestore } from './firestoreSanitize'
import { roundSuccessPercent } from './trainingSuccessScore'
import {
  CASEVAC_MIST_INJURY_OPTIONS,
  CASEVAC_MIST_METRIC_OPTIONS,
  CASEVAC_MIST_TREATMENT_OPTIONS,
  CASEVAC_MIST_VITALS_OPTIONS,
  CASEVAC_TRANSMISSION_DEADLINE_SEC,
} from './casevacSimulatorConstants'
import { buildSimulationTimingFields } from './simulationHistoryHelpers'
import {
  buildCasevacRejectionReasons,
  detectCasevacConflicts,
  getCasevacCasualtyCount,
  isCasevacFormComplete,
  scoreCasevacTransmission,
} from './casevacSimulatorValidation'

/** @param {string} id @param {{ id: string; label: string }[]} options */
function labelFor(id, options) {
  return options.find((o) => o.id === id)?.label ?? id
}

/**
 * @param {typeof import('./casevacSimulatorConstants').CASEVAC_SIM_INITIAL} form
 */
export function casevacFormToPayload(form) {
  const metric = Array.isArray(form.mist_metric) ? form.mist_metric : []
  const treatment = Array.isArray(form.mist_treatment) ? form.mist_treatment : []
  return {
    casualtyCount: getCasevacCasualtyCount(form),
    mist: {
      metric: metric.map((id) => labelFor(id, CASEVAC_MIST_METRIC_OPTIONS)),
      injurySite: labelFor(form.mist_injury_site, CASEVAC_MIST_INJURY_OPTIONS),
      vitals: labelFor(form.mist_vitals, CASEVAC_MIST_VITALS_OPTIONS),
      treatment: treatment.map((id) => labelFor(id, CASEVAC_MIST_TREATMENT_OPTIONS)),
    },
    pickupCallsign: invStr(form.pickup_callsign).trim(),
  }
}

/**
 * @param {{
 *   addRangeLog: (payload: Record<string, unknown>) => Promise<{ id: string }>
 *   userId: string
 *   form: typeof import('./casevacSimulatorConstants').CASEVAC_SIM_INITIAL
 *   elapsedSec: number
 *   timedOut?: boolean
 *   finalRemaining?: number
 *   failureReason?: string | null
 *   rejectionReasons?: string[]
 * }} p
 */
export async function submitCasevacSimulatorSession({
  addRangeLog,
  userId,
  form,
  elapsedSec,
  timedOut = false,
  finalRemaining,
  failureReason = null,
  rejectionReasons,
}) {
  const timing = buildSimulationTimingFields('casevac', elapsedSec, timedOut, finalRemaining)
  const effectiveElapsed = timing.elapsedTime
  const hasOvertime = timing.overtime > 0

  const debrief = rejectionReasons ?? buildCasevacRejectionReasons(form, { timedOut: timedOut || hasOvertime })
  const conflicts = detectCasevacConflicts(form)
  const complete = isCasevacFormComplete(form)
  const failed =
    hasOvertime ||
    timedOut ||
    Boolean(failureReason) ||
    debrief.length > 0 ||
    conflicts.length > 0 ||
    !complete ||
    effectiveElapsed > CASEVAC_TRANSMISSION_DEADLINE_SEC

  let successPercent = scoreCasevacTransmission(form, effectiveElapsed, {
    timedOut: timedOut || hasOvertime,
    forcedFailure: failed,
  })
  if (failed) successPercent = Math.min(38, successPercent)

  const success = !failed && successPercent >= 85
  const mistPayload = casevacFormToPayload(form)

  const rangePayload = sanitizeForFirestore(
    await attachMeteoDataToPayload({
      userId,
      ownerId: userId,
      operationCategory: 'tccc',
      kind: 'TCCC_DRILL',
      drillName: success
        ? `CASEVAC MIST SIM · TRANSMISSION OK · ${mistPayload.pickupCallsign.slice(0, 16)}`
        : 'CASEVAC MIST SIM · HOT ZONE FAILURE',
      shootType: 'CASEVAC_MIST_RADIO_SIM',
      tcccPhase: 'CASEVAC · MIST',
      tcccPhaseKey: 'casevac_mist',
      timestamp: new Date().toISOString(),
      status: 'active',
      successPercent: roundSuccessPercent(successPercent),
      casevacSim: true,
      ...timing,
      medevacTransmissionSuccess: success,
      tcccSimStatus: hasOvertime || failed ? 'BAŞARISIZ' : success ? 'BAŞARILI' : 'BAŞARISIZ',
      medevacFailureReason: failureReason ?? (failed ? 'TRANSMISSION FAILURE' : null),
      simRejectionReasons: debrief,
      casevacSimForm: form,
      casevacMist: mistPayload,
      operationNote: success
        ? `MIST transmitted in ${Math.round(effectiveElapsed)}s · CASEVAC EN ROUTE`
        : `CASEVAC FAILURE · ${failureReason ?? 'TIMEOUT / INVALID MIST'}`,
    })
  )

  const rangeRef = await addRangeLog(/** @type {Record<string, unknown>} */ (rangePayload))

  return {
    logId: String(rangeRef?.id ?? ''),
    success,
    successPercent: roundSuccessPercent(successPercent),
  }
}
