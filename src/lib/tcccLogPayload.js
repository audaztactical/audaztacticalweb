import { invNum, invStr } from './inventoryIlws'
import {
  TCCC_CUSTOM,
  resolveInjuryTypeValue,
  resolveTcccSelectKey,
  resolveTcccSelectValue,
} from './tcccOptions'
import { calculateTcccSuccessPercent } from './trainingSuccessScore'

export const TCCC_INITIAL_FORM = {
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
 *   tcccPhase: string
 *   customTcccPhase?: string
 *   injuryType: string
 *   injuryToTqTime: string | number
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
  tcccPhase,
  customTcccPhase = '',
  injuryType,
  injuryToTqTime,
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
  const evacWaitMin = parseOptionalNonNegativeNumber(evacWaitingTime)
  const systolic = parseOptionalNonNegativeNumber(systolicBp)

  const operationNoteText = invStr(operationNote ?? '').trim()
  const timestamp = new Date().toISOString()

  const injuryTypeKey = invStr(injuryType).trim()
  const injuryTypeLabel = resolveInjuryTypeValue(injuryTypeKey)

  const summaryLabel = [injuryTypeLabel, tcccPhaseLabel, tourniquetLocationLabel]
    .filter(Boolean)
    .join(' · ')

  const successPercent = calculateTcccSuccessPercent({
    injuryType: injuryTypeKey,
    injuryToTqTimeSec: injuryToTqSec,
    tourniquetApplied: Boolean(tourniquetApplied),
    chestSealApplied: Boolean(chestSealApplied),
    npaInserted: Boolean(npaInserted),
    needleDecompression: Boolean(needleDecompression),
    woundPacking: Boolean(woundPacking),
    hypothermiaBlanket: Boolean(hypothermiaBlanket),
    evacWaitingTimeMin: evacWaitMin,
    operationNote: operationNoteText,
  })

  return {
    userId,
    tcccPhase: tcccPhaseLabel,
    tcccPhaseKey,
    customTcccPhase: tcccPhase === TCCC_CUSTOM ? invStr(customTcccPhase).trim() || null : null,
    injuryType: injuryTypeLabel,
    injuryTypeKey,
    injuryToTqTimeSec: injuryToTqSec,
    injuryToTqTime: injuryToTqSec != null ? `${injuryToTqSec}s` : null,
    evacWaitingTimeMin: evacWaitMin,
    evacWaitingTime: evacWaitMin != null ? `${evacWaitMin} dk` : null,
    systolicBp: systolic,
    systolicBpLabel: systolic != null ? `${systolic} mmHg` : null,
    tourniquetLocation: tourniquetLocationLabel,
    tourniquetLocationKey,
    customTourniquetLocation:
      tourniquetLocation === TCCC_CUSTOM ? invStr(customTourniquetLocation).trim() || null : null,
    tourniquetApplied: Boolean(tourniquetApplied),
    woundPacking: Boolean(woundPacking),
    npaInserted: Boolean(npaInserted),
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
