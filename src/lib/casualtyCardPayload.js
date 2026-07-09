import { invStr } from './inventoryIlws'
import {
  getCasualtyMarchSectionsFromMarch,
  mergeCasualtyTreatmentNotes,
} from './casualtyCardRegistry'
import {
  EVAC_PRIORITY_OPTIONS,
} from './marchDd1380Config'
import {
  labelAvpu,
  labelCasualtyBloodType,
  labelEvacPriority,
  labelFluid,
  labelNdcGauge,
  labelPupil,
  labelRadialPulse,
  labelTqLocation,
  marchStepSubtitle,
} from './healthDisplayText'
import { healthPdfT } from './pdfReportText'
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
 * @param {typeof CASUALTY_DD1380_INITIAL} form
 * @param {string} userId
 */
export function buildCasualtyCardPayload(form, userId) {
  const step = invStr(form.activeMarchStep).trim() || 'M'
  const evac = invStr(form.evacPriority).trim() || 'PRIORITY'
  const evacValid = EVAC_PRIORITY_OPTIONS.some((o) => o.id === evac) ? evac : 'PRIORITY'
  const evacLabel = labelEvacPriority(evacValid)

  const march = {
    M: {
      tourniquetApplied: Boolean(form.tourniquetApplied),
      tqInsertionTime: invStr(form.tqInsertionTime).trim() || null,
      tqLocation: invStr(form.tqLocation).trim() || null,
      tqLocationLabel: labelTqLocation(form.tqLocation),
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
      ndcGaugeLabel: labelNdcGauge(form.ndcGauge),
      respiratoryRate: invStr(form.respiratoryRate).trim() || null,
    },
    C: {
      ivIoAccess: Boolean(form.ivIoAccess),
      fluidAdministered: invStr(form.fluidAdministered).trim() || null,
      fluidLabel: labelFluid(form.fluidAdministered),
      txaAdministered: Boolean(form.txaAdministered),
      radialPulse: invStr(form.radialPulse).trim() || null,
      radialPulseLabel: labelRadialPulse(form.radialPulse),
    },
    H: {
      hypothermiaWrap: Boolean(form.hypothermiaWrap),
      activeHeating: Boolean(form.activeHeating),
      avpuLevel: invStr(form.avpuLevel).trim() || null,
      avpuLabel: labelAvpu(form.avpuLevel),
      pupilStatus: invStr(form.pupilStatus).trim() || null,
      pupilLabel: labelPupil(form.pupilStatus),
    },
  }

  const marchItems = getCasualtyMarchSectionsFromMarch(march).flatMap((section) => section.items)
  const manualTreatments = invStr(form.appliedTreatmentsNote).trim()
  const appliedTreatmentsSummary = mergeCasualtyTreatmentNotes(manualTreatments, marchItems)
  const manualOperationNote = invStr(form.operationNote).trim()
  const moiText = invStr(form.mechanismOfInjury).trim()
  const autoOperationSummary = [
    healthPdfT('autoSummary.evacPriority', { priority: evacLabel }),
    moiText ? healthPdfT('autoSummary.moi', { moi: moiText }) : '',
    healthPdfT('autoSummary.activeMarch', {
      key: step,
      subtitle: marchStepSubtitle(step),
    }),
  ]
    .filter(Boolean)
    .join(' · ')
  const operationNoteText = manualOperationNote || autoOperationSummary
  const patientName = invStr(form.patientName).trim()
  const titleName = patientName || healthPdfT('autoSummary.titleCasualty')

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
      bloodTypeLabel: labelCasualtyBloodType(form.bloodType || 'unknown'),
      patientName,
      allergies: invStr(form.allergies).trim(),
    },
    patientName,
    bloodType: invStr(form.bloodType).trim() || 'unknown',
    bloodTypeLabel: labelCasualtyBloodType(form.bloodType || 'unknown'),
    allergies: invStr(form.allergies).trim(),
    mechanismOfInjury: moiText,
    appliedTreatmentsNote: manualTreatments,
    appliedTreatmentsSummary,
    operationNote: operationNoteText,
    operationNoteManual: manualOperationNote || null,
    evacPriority: evacValid,
    title: healthPdfT('autoSummary.titleTemplate', { name: titleName, evac: evacLabel }),
    timestamp: new Date().toISOString(),
  }
}
