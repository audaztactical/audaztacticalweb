import { invStr } from './inventoryIlws'
import { EVAC_PRIORITY_OPTIONS } from './marchDd1380Config'
import {
  buildMarchInterventionSections,
  healthLocale,
  healthT,
  labelCasualtyBloodType,
  labelEvacPriority,
  marchStepDisplay,
  marchStepSubtitle,
} from './healthDisplayText'
import { healthPdfT } from './pdfReportText'

/** @param {Record<string, unknown>} row */
export function getCasualtyCardTimestampMs(row) {
  const u = row.timestamp ?? row.updatedAt ?? row.createdAt
  if (u && typeof u === 'object' && typeof u.toMillis === 'function') return u.toMillis()
  if (typeof u === 'string') {
    const t = Date.parse(u)
    return Number.isNaN(t) ? 0 : t
  }
  return 0
}

/** @param {Record<string, unknown>} row */
export function formatCasualtyCardDate(row) {
  const ms = getCasualtyCardTimestampMs(row)
  if (!ms) return healthT('common.emDash')
  return new Date(ms).toLocaleString(healthLocale(), {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** @param {Record<string, unknown>} row */
export function getCasualtyPatientName(row) {
  const patient = row.patient && typeof row.patient === 'object' ? row.patient : null
  const fromPatient = patient ? invStr(/** @type {Record<string, unknown>} */ (patient).patientName).trim() : ''
  return invStr(row.patientName || row.title).trim() || fromPatient || healthT('archive.undefinedCasualty')
}

/** @param {Record<string, unknown>} row */
export function getCasualtyEvacPriority(row) {
  const raw = invStr(row.evacPriority).trim().toUpperCase()
  if (EVAC_PRIORITY_OPTIONS.some((o) => o.id === raw)) return raw
  return 'PRIORITY'
}

/** @param {Record<string, unknown>} row */
export function getCasualtyEvacPriorityLabel(row) {
  const id = getCasualtyEvacPriority(row)
  return labelEvacPriority(id)
}

/** @param {string} priority */
export function evacPriorityTone(priority) {
  if (priority === 'URGENT') return 'urgent'
  if (priority === 'ROUTINE') return 'routine'
  return 'priority'
}

/** @param {Record<string, unknown>} row */
export function getCasualtyMarchStep(row) {
  const step = invStr(row.activeMarchStep).trim().toUpperCase()
  return /** @type {'M'|'A'|'R'|'C'|'H'} */ (['M', 'A', 'R', 'C', 'H'].includes(step) ? step : 'M')
}

/** @param {Record<string, unknown>} row */
export function getCasualtyMarchStepMeta(row) {
  const key = getCasualtyMarchStep(row)
  return marchStepDisplay(key)
}

/** @param {Record<string, unknown>} row */
export function getCasualtyBloodTypeLabel(row) {
  const patient = row.patient && typeof row.patient === 'object' ? row.patient : null
  const fromPatient = patient
    ? invStr(/** @type {Record<string, unknown>} */ (patient).bloodTypeLabel).trim()
    : ''
  const bloodId =
    invStr(row.bloodType).trim() ||
    (patient ? invStr(/** @type {Record<string, unknown>} */ (patient).bloodType).trim() : '')
  if (bloodId) return labelCasualtyBloodType(bloodId)
  return invStr(row.bloodTypeLabel).trim() || fromPatient || healthT('common.emDash')
}

/** @param {Record<string, unknown>} row */
export function getCasualtyMechanismOfInjury(row) {
  return invStr(row.mechanismOfInjury).trim() || healthT('common.emDash')
}

/**
 * @param {string} manual
 * @param {string[]} marchItems
 */
export function mergeCasualtyTreatmentNotes(manual, marchItems) {
  const text = invStr(manual).trim()
  const auto = (Array.isArray(marchItems) ? marchItems : []).filter(Boolean)
  if (auto.length === 0) return text
  if (!text) return auto.join(' · ')

  const manualLower = text.toLowerCase()
  const extra = auto.filter((item) => {
    const probe = invStr(item).trim().toLowerCase().slice(0, 10)
    return probe && !manualLower.includes(probe)
  })
  if (extra.length === 0) return text
  return `${text} · ${extra.join(' · ')}`
}

/** @param {Record<string, unknown>} row */
export function flattenCasualtyMarchItems(row) {
  return getCasualtyMarchSections(row).flatMap((section) => section.items)
}

/** @param {Record<string, unknown>} row */
export function getCasualtyAppliedTreatmentsNote(row) {
  const summary = invStr(row.appliedTreatmentsSummary).trim()
  if (summary) return summary
  const manual = invStr(row.appliedTreatmentsNote).trim()
  const merged = mergeCasualtyTreatmentNotes(manual, flattenCasualtyMarchItems(row))
  return merged || healthT('common.emDash')
}

/** @param {string} text */
function isLikelyAccidentalNumericNote(text) {
  const t = invStr(text).trim()
  return /^\d{4,}$/.test(t)
}

/**
 * @param {Record<string, unknown>} row
 * @returns {string}
 */
export function buildCasualtyAutoOperationSummary(row) {
  /** @type {string[]} */
  const parts = []
  const evac = getCasualtyEvacPriorityLabel(row)
  if (evac) parts.push(healthPdfT('autoSummary.evacPriority', { priority: evac }))
  const moi = invStr(row.mechanismOfInjury).trim()
  if (moi) parts.push(healthPdfT('autoSummary.moi', { moi }))
  const step = getCasualtyMarchStep(row)
  parts.push(
    healthPdfT('autoSummary.activeMarch', {
      key: step,
      subtitle: marchStepSubtitle(step),
    }),
  )
  return parts.join(' · ')
}

/** @param {Record<string, unknown>} row */
export function getCasualtyOperationNote(row) {
  const manualOnly = invStr(row.operationNoteManual).trim()
  const stored = invStr(row.operationNote).trim()
  const manual = manualOnly || stored
  const auto = buildCasualtyAutoOperationSummary(row)

  if (manual && !isLikelyAccidentalNumericNote(manual)) {
    return manual
  }
  if (manual && isLikelyAccidentalNumericNote(manual) && auto) {
    return `${auto} · ${healthPdfT('autoSummary.storedNote', { note: manual })}`
  }
  return auto || manual || healthT('common.emDash')
}

/** @param {Record<string, unknown>} row */
export function getCasualtyAllergies(row) {
  const patient = row.patient && typeof row.patient === 'object' ? row.patient : null
  const fromPatient = patient ? invStr(/** @type {Record<string, unknown>} */ (patient).allergies).trim() : ''
  return invStr(row.allergies).trim() || fromPatient || healthT('common.emDash')
}

/**
 * @param {Record<string, unknown>} march
 * @returns {{ step: string, title: string, items: string[] }[]}
 */
export function getCasualtyMarchSectionsFromMarch(march) {
  return buildMarchInterventionSections(
    /** @type {Record<string, Record<string, unknown>>} */ (march && typeof march === 'object' ? march : {}),
  )
}

/** @param {Record<string, unknown>} row */
export function getCasualtyMarchSections(row) {
  const march = row.march && typeof row.march === 'object' ? row.march : {}
  return getCasualtyMarchSectionsFromMarch(march)
}

/** @param {Record<string, unknown>} row */
export function countCasualtyMarchInterventions(row) {
  const sections = getCasualtyMarchSections(row)
  const done = sections.reduce((sum, s) => sum + s.items.length, 0)
  return { done, sections: sections.length }
}

/** @param {Record<string, unknown>[]} cards */
export function sortCasualtyCardsDesc(cards) {
  return [...cards].sort((a, b) => getCasualtyCardTimestampMs(b) - getCasualtyCardTimestampMs(a))
}
