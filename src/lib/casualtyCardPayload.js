import { invStr } from './inventoryIlws'
import {
  getCasualtyMarchSectionsFromMarch,
  mergeCasualtyTreatmentNotes,
} from './casualtyCardRegistry'
import {
  AVPU_OPTIONS,
  CASUALTY_BLOOD_TYPE_OPTIONS,
  EVAC_PRIORITY_OPTIONS,
  FLUID_DD_OPTIONS,
  MARCH_DD1380_STEPS,
  NDC_GAUGE_OPTIONS,
  PUPIL_OPTIONS,
  RADIAL_PULSE_OPTIONS,
  TQ_LOCATION_DD_OPTIONS,
} from './marchDd1380Config'
import { TCCC_OPERATION_CATEGORY } from './tcccHealthConstants'

/** @typedef {import('./marchDd1380Config').MarchStepKey} MarchStepKey */
/** @typedef {import('./marchDd1380Config').EvacPriority} EvacPriority */

export const CASUALTY_DD1380_INITIAL = {
  activeMarchStep: /** @type {MarchStepKey} */ ('M'),
  tourniquetApplied: false,
  tqInsertionTime: '',
  tqLocation: 'right_arm',
  tqLocationCustom: '',
  woundPackingHemostatic: false,
  pressureBandage: false,
  npaInserted: false,
  intubatedCric: false,
  recoveryPosition: false,
  ventedChestSeal: false,
  needleDecompression: false,
  ndcGauge: '10',
  respiratoryRate: '',
  ivIoAccess: false,
  fluidAdministered: '',
  txaAdministered: false,
  radialPulse: '',
  hypothermiaWrap: false,
  activeHeating: false,
  avpuLevel: '',
  pupilStatus: '',
  bloodType: '',
  patientName: '',
  allergies: '',
  mechanismOfInjury: '',
  appliedTreatmentsNote: '',
  operationNote: '',
  evacPriority: /** @type {EvacPriority} */ ('PRIORITY'),
}

/**
 * @param {string} id
 * @param {{ id: string; label: string }[]} options
 */
function labelFor(id, options) {
  const k = invStr(id).trim()
  return options.find((o) => o.id === k)?.label ?? k
}

function casualtyBloodTypeLabel(id) {
  const k = invStr(id).trim()
  if (!k) return 'Bilinmiyor'
  return CASUALTY_BLOOD_TYPE_OPTIONS.find((o) => o.id === k)?.label ?? k
}

/**
 * @param {typeof CASUALTY_DD1380_INITIAL} form
 * @param {string} userId
 */
export function buildCasualtyCardPayload(form, userId) {
  const step = invStr(form.activeMarchStep).trim() || 'M'
  const evac = invStr(form.evacPriority).trim() || 'PRIORITY'
  const evacValid = EVAC_PRIORITY_OPTIONS.some((o) => o.id === evac) ? evac : 'PRIORITY'
  const evacLabel = EVAC_PRIORITY_OPTIONS.find((o) => o.id === evacValid)?.label ?? evacValid

  const march = {
    M: {
      tourniquetApplied: Boolean(form.tourniquetApplied),
      tqInsertionTime: invStr(form.tqInsertionTime).trim() || null,
      tqLocation: invStr(form.tqLocation).trim() || null,
      tqLocationLabel: labelFor(form.tqLocation, TQ_LOCATION_DD_OPTIONS),
      tqLocationCustom: invStr(form.tqLocationCustom).trim() || null,
      woundPackingHemostatic: Boolean(form.woundPackingHemostatic),
      pressureBandage: Boolean(form.pressureBandage),
    },
    A: {
      npaInserted: Boolean(form.npaInserted),
      intubatedCric: Boolean(form.intubatedCric),
      recoveryPosition: Boolean(form.recoveryPosition),
    },
    R: {
      ventedChestSeal: Boolean(form.ventedChestSeal),
      needleDecompression: Boolean(form.needleDecompression),
      ndcGauge: invStr(form.ndcGauge).trim() || null,
      ndcGaugeLabel: labelFor(form.ndcGauge, NDC_GAUGE_OPTIONS),
      respiratoryRate: invStr(form.respiratoryRate).trim() || null,
    },
    C: {
      ivIoAccess: Boolean(form.ivIoAccess),
      fluidAdministered: invStr(form.fluidAdministered).trim() || null,
      fluidLabel: labelFor(form.fluidAdministered, FLUID_DD_OPTIONS),
      txaAdministered: Boolean(form.txaAdministered),
      radialPulse: invStr(form.radialPulse).trim() || null,
      radialPulseLabel: labelFor(form.radialPulse, RADIAL_PULSE_OPTIONS),
    },
    H: {
      hypothermiaWrap: Boolean(form.hypothermiaWrap),
      activeHeating: Boolean(form.activeHeating),
      avpuLevel: invStr(form.avpuLevel).trim() || null,
      avpuLabel: labelFor(form.avpuLevel, AVPU_OPTIONS),
      pupilStatus: invStr(form.pupilStatus).trim() || null,
      pupilLabel: labelFor(form.pupilStatus, PUPIL_OPTIONS),
    },
  }

  const marchItems = getCasualtyMarchSectionsFromMarch(march).flatMap((section) => section.items)
  const manualTreatments = invStr(form.appliedTreatmentsNote).trim()
  const appliedTreatmentsSummary = mergeCasualtyTreatmentNotes(manualTreatments, marchItems)
  const manualOperationNote = invStr(form.operationNote).trim()
  const moiText = invStr(form.mechanismOfInjury).trim()
  const activeStepMeta = MARCH_DD1380_STEPS.find((s) => s.key === step) ?? MARCH_DD1380_STEPS[0]
  const autoOperationSummary = [
    `Tahliye önceliği: ${evacLabel}`,
    moiText ? `MOI: ${moiText}` : '',
    `Aktif MARCH: ${activeStepMeta.key} · ${activeStepMeta.subtitle}`,
  ]
    .filter(Boolean)
    .join(' · ')
  const operationNoteText = manualOperationNote || autoOperationSummary

  return {
    kind: 'DD1380_CASUALTY_CARD',
    formType: 'TCCC_DD1380',
    operationCategory: TCCC_OPERATION_CATEGORY,
    ownerId: userId,
    userId,
    activeMarchStep: step,
    march,
    patient: {
      bloodType: invStr(form.bloodType).trim() || 'unknown',
      bloodTypeLabel: casualtyBloodTypeLabel(form.bloodType),
      patientName: invStr(form.patientName).trim(),
      allergies: invStr(form.allergies).trim(),
    },
    patientName: invStr(form.patientName).trim(),
    bloodType: invStr(form.bloodType).trim() || 'unknown',
    bloodTypeLabel: casualtyBloodTypeLabel(form.bloodType),
    allergies: invStr(form.allergies).trim(),
    mechanismOfInjury: moiText,
    appliedTreatmentsNote: manualTreatments,
    appliedTreatmentsSummary,
    operationNote: operationNoteText,
    operationNoteManual: manualOperationNote || null,
    evacPriority: evacValid,
    title: `DD1380 · ${invStr(form.patientName).trim() || 'Yaralı'} · ${evacLabel}`,
    timestamp: new Date().toISOString(),
  }
}
