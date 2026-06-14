import { invNum, invStr } from './inventoryIlws'
import {
  TCCC_CUSTOM,
  resolveInjuryTypeValue,
  resolveTcccSelectKey,
  resolveTcccSelectValue,
} from './tcccOptions'
import { calculateTcccSuccessPercent } from './trainingSuccessScore'

/**
 * @param {number | null | undefined} sec
 */
export function formatTcccInterventionSeconds(sec) {
  if (sec == null || !Number.isFinite(sec) || sec < 0) return '—'
  const rounded = Math.round(sec * 100) / 100
  return `${rounded.toFixed(rounded < 10 ? 2 : 1)}s`
}

/**
 * @param {{
 *   tourniquetApplied?: boolean
 *   woundPacking?: boolean
 *   npaInserted?: boolean
 *   chestSealApplied?: boolean
 *   needleDecompression?: boolean
 *   hypothermiaBlanket?: boolean
 *   procedures?: string[]
 * }} input
 */
export function buildProcedurePerformedLabel({
  tourniquetApplied = false,
  woundPacking = false,
  npaInserted = false,
  chestSealApplied = false,
  needleDecompression = false,
  hypothermiaBlanket = false,
  procedures = [],
}) {
  const labels = []
  const procSet = new Set(Array.isArray(procedures) ? procedures : [])
  if (tourniquetApplied || procSet.has('tourniquet')) labels.push('Turnike')
  if (woundPacking || procSet.has('bandage')) labels.push('Bandaj')
  if (npaInserted || procSet.has('airway')) labels.push('Hava Yolu')
  if (chestSealApplied) labels.push('Göğüs Mühürü')
  if (needleDecompression) labels.push('İğne Dekompresyonu')
  if (hypothermiaBlanket) labels.push('Hipotermi Battaniyesi')
  return labels.length > 0 ? labels.join(' · ') : '—'
}

export const TCCC_INITIAL_FORM = {
  casualtyType: '',
  interventionTime: '',
  outcome: '',
  procedures: /** @type {string[]} */ ([]),
  tcccPhase: '',
  customTcccPhase: '',
  injuryType: '',
  injuryToTqTime: '',
  evacWaitingTime: '',
  systolicBp: '',
  tourniquetLocation: '',
  customTourniquetLocation: '',
  tourniquetApplied: false,
  woundPacking: false,
  npaInserted: false,
  chestSealApplied: false,
  needleDecompression: false,
  hypothermiaBlanket: false,
  operationNote: '',
}

/**
 * @param {string | number} raw
 */
function parseOptionalNonNegativeNumber(raw) {
  const text = invStr(raw).trim().replace(',', '.')
  if (!text) return null
  const n = invNum(text)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * 1000) / 1000
}

/**
 * @param {{
 *   userId: string
 *   casualtyType?: string
 *   interventionTime?: string | number
 *   outcome?: string
 *   procedures?: string[]
 *   tcccPhase: string
 *   customTcccPhase?: string
 *   injuryType: string
 *   injuryToTqTime?: string | number
 *   evacWaitingTime: string | number
 *   systolicBp: string | number
 *   tourniquetLocation: string
 *   customTourniquetLocation?: string
 *   tourniquetApplied: boolean
 *   woundPacking: boolean
 *   npaInserted: boolean
 *   chestSealApplied: boolean
 *   needleDecompression: boolean
 *   hypothermiaBlanket: boolean
 *   operationNote?: string
 * }} input
 */
export function buildTcccLogPayload({
  userId,
  casualtyType = '',
  interventionTime = '',
  outcome = '',
  procedures = [],
  tcccPhase,
  customTcccPhase = '',
  injuryType,
  injuryToTqTime = '',
  evacWaitingTime,
  systolicBp,
  tourniquetLocation,
  customTourniquetLocation = '',
  tourniquetApplied,
  woundPacking,
  npaInserted,
  chestSealApplied,
  needleDecompression,
  hypothermiaBlanket,
  operationNote = '',
}) {
  const tcccPhaseLabel = resolveTcccSelectValue(tcccPhase, customTcccPhase)
  const tcccPhaseKey = resolveTcccSelectKey(tcccPhase, customTcccPhase)
  const tourniquetLocationLabel = resolveTcccSelectValue(
    tourniquetLocation,
    customTourniquetLocation
  )
  const tourniquetLocationKey = resolveTcccSelectKey(tourniquetLocation, customTourniquetLocation)

  const injuryToTqSec = parseOptionalNonNegativeNumber(injuryToTqTime)
  const interventionTimeSec =
    parseOptionalNonNegativeNumber(interventionTime) ?? injuryToTqSec
  const evacWaitMin = parseOptionalNonNegativeNumber(evacWaitingTime)
  const systolic = parseOptionalNonNegativeNumber(systolicBp)

  const procList = Array.isArray(procedures) ? procedures : []
  const tourniquetFromProc = procList.includes('tourniquet')
  const bandageFromProc = procList.includes('bandage')
  const airwayFromProc = procList.includes('airway')
  const tourniquetFinal = Boolean(tourniquetApplied || tourniquetFromProc)
  const woundPackingFinal = Boolean(woundPacking || bandageFromProc)
  const npaFinal = Boolean(npaInserted || airwayFromProc)

  const casualtyTypeLabel = resolveTcccSelectValue(casualtyType)
  const casualtyTypeKey = resolveTcccSelectKey(casualtyType)
  const outcomeLabel = resolveTcccSelectValue(outcome)
  const outcomeKey = resolveTcccSelectKey(outcome)
  const procedurePerformed = buildProcedurePerformedLabel({
    tourniquetApplied: tourniquetFinal,
    woundPacking: woundPackingFinal,
    npaInserted: npaFinal,
    chestSealApplied,
    needleDecompression,
    hypothermiaBlanket,
    procedures: procList,
  })

  const operationNoteText = invStr(operationNote ?? '').trim()
  const timestamp = new Date().toISOString()

  const injuryTypeKey = invStr(injuryType).trim()
  const injuryTypeLabel = resolveInjuryTypeValue(injuryTypeKey)

  const summaryLabel = [injuryTypeLabel, tcccPhaseLabel, tourniquetLocationLabel]
    .filter(Boolean)
    .join(' · ')

  const successPercent = calculateTcccSuccessPercent({
    injuryType: injuryTypeKey,
    injuryToTqTimeSec: interventionTimeSec ?? injuryToTqSec,
    tourniquetApplied: tourniquetFinal,
    chestSealApplied: Boolean(chestSealApplied),
    npaInserted: npaFinal,
    needleDecompression: Boolean(needleDecompression),
    woundPacking: woundPackingFinal,
    hypothermiaBlanket: Boolean(hypothermiaBlanket),
    evacWaitingTimeMin: evacWaitMin,
    operationNote: operationNoteText,
  })

  return {
    userId,
    casualtyType: casualtyTypeLabel,
    casualtyTypeKey,
    interventionTimeSec,
    interventionTime:
      interventionTimeSec != null ? formatTcccInterventionSeconds(interventionTimeSec) : null,
    procedurePerformed,
    proceduresPerformed: procList,
    outcome: outcomeLabel,
    outcomeKey,
    tcccPhase: tcccPhaseLabel,
    tcccPhaseKey,
    customTcccPhase: tcccPhase === TCCC_CUSTOM ? invStr(customTcccPhase).trim() || null : null,
    injuryType: injuryTypeLabel,
    injuryTypeKey,
    injuryToTqTimeSec: interventionTimeSec ?? injuryToTqSec,
    injuryToTqTime:
      (interventionTimeSec ?? injuryToTqSec) != null
        ? formatTcccInterventionSeconds(interventionTimeSec ?? injuryToTqSec)
        : null,
    evacWaitingTimeMin: evacWaitMin,
    evacWaitingTime: evacWaitMin != null ? `${evacWaitMin} dk` : null,
    systolicBp: systolic,
    systolicBpLabel: systolic != null ? `${systolic} mmHg` : null,
    tourniquetLocation: tourniquetLocationLabel,
    tourniquetLocationKey,
    customTourniquetLocation:
      tourniquetLocation === TCCC_CUSTOM ? invStr(customTourniquetLocation).trim() || null : null,
    tourniquetApplied: tourniquetFinal,
    woundPacking: woundPackingFinal,
    npaInserted: npaFinal,
    chestSealApplied: Boolean(chestSealApplied),
    needleDecompression: Boolean(needleDecompression),
    hypothermiaBlanket: Boolean(hypothermiaBlanket),
    operationNote: operationNoteText,
    operationCategory: 'tccc',
    kind: 'TCCC_DRILL',
    drillName: summaryLabel,
    shootType: summaryLabel,
    timestamp,
    status: 'active',
    successPercent,
  }
}
