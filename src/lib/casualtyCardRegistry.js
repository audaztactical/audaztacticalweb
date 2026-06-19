import { invStr } from './inventoryIlws'
import { EVAC_PRIORITY_OPTIONS, MARCH_DD1380_STEPS } from './marchDd1380Config'

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
  if (!ms) return '—'
  return new Date(ms).toLocaleString('tr-TR', {
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
  return invStr(row.patientName || row.title).trim() || fromPatient || 'YARALI — TANIMSIZ'
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
  return EVAC_PRIORITY_OPTIONS.find((o) => o.id === id)?.label ?? id
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
  return MARCH_DD1380_STEPS.find((s) => s.key === key) ?? MARCH_DD1380_STEPS[0]
}

/** @param {Record<string, unknown>} row */
export function getCasualtyBloodTypeLabel(row) {
  const patient = row.patient && typeof row.patient === 'object' ? row.patient : null
  const fromPatient = patient
    ? invStr(/** @type {Record<string, unknown>} */ (patient).bloodTypeLabel).trim()
    : ''
  return invStr(row.bloodTypeLabel).trim() || fromPatient || '—'
}

/** @param {Record<string, unknown>} row */
export function getCasualtyMechanismOfInjury(row) {
  return invStr(row.mechanismOfInjury).trim() || '—'
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
  return merged || '—'
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
  if (evac) parts.push(`Tahliye önceliği: ${evac}`)
  const moi = invStr(row.mechanismOfInjury).trim()
  if (moi) parts.push(`MOI: ${moi}`)
  const step = getCasualtyMarchStepMeta(row)
  parts.push(`Aktif MARCH: ${step.key} · ${step.subtitle}`)
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
    return `${auto} · (Kayıtlı not: ${manual})`
  }
  return auto || manual || '—'
}

/** @param {Record<string, unknown>} row */
export function getCasualtyAllergies(row) {
  const patient = row.patient && typeof row.patient === 'object' ? row.patient : null
  const fromPatient = patient ? invStr(/** @type {Record<string, unknown>} */ (patient).allergies).trim() : ''
  return invStr(row.allergies).trim() || fromPatient || '—'
}

/**
 * @param {Record<string, unknown>} row
 * @returns {{ step: string, title: string, items: string[] }[]}
 */
export function getCasualtyMarchSectionsFromMarch(march) {
  const m =
    march && typeof march === 'object'
      ? /** @type {Record<string, Record<string, unknown>>} */ (march)
      : {}

  /** @type {{ step: string, title: string, items: string[] }[]} */
  const sections = []

  for (const meta of MARCH_DD1380_STEPS) {
    const block = m[meta.key]
    if (!block || typeof block !== 'object') continue
    const b = /** @type {Record<string, unknown>} */ (block)
    /** @type {string[]} */
    const items = []

    if (meta.key === 'M') {
      if (b.tourniquetApplied) {
        const loc = invStr(b.tqLocationLabel || b.tqLocation).trim()
        const t = invStr(b.tqInsertionTime).trim()
        items.push(`Turnike${loc ? ` · ${loc}` : ''}${t ? ` · ${t}` : ''}`)
      }
      if (b.woundPackingHemostatic) items.push('Hemostatik tampon')
      if (b.pressureBandage) items.push('Basınç bandajı')
    } else if (meta.key === 'A') {
      if (b.npaInserted) items.push('NPA')
      if (b.intubatedCric) items.push('Entübasyon / Cric')
      if (b.recoveryPosition) items.push('Kurtarma pozisyonu')
    } else if (meta.key === 'R') {
      if (b.ventedChestSeal) items.push('Ventilli göğüs mührü')
      if (b.needleDecompression) {
        const gauge = invStr(b.ndcGaugeLabel || b.ndcGauge).trim()
        items.push(`NDC${gauge ? ` · ${gauge}` : ''}`)
      }
      const rr = invStr(b.respiratoryRate).trim()
      if (rr) items.push(`Solunum hızı · ${rr}/dk`)
    } else if (meta.key === 'C') {
      if (b.ivIoAccess) items.push('IV / IO erişim')
      const fluid = invStr(b.fluidLabel || b.fluidAdministered).trim()
      if (fluid) items.push(`Sıvı · ${fluid}`)
      if (b.txaAdministered) items.push('TXA')
      const pulse = invStr(b.radialPulseLabel || b.radialPulse).trim()
      if (pulse) items.push(`Radial nabız · ${pulse}`)
    } else if (meta.key === 'H') {
      if (b.hypothermiaWrap) items.push('Termal wrap')
      if (b.activeHeating) items.push('Aktif ısıtma')
      const avpu = invStr(b.avpuLabel || b.avpuLevel).trim()
      if (avpu) items.push(`AVPU · ${avpu}`)
      const pupil = invStr(b.pupilLabel || b.pupilStatus).trim()
      if (pupil) items.push(`Pupil · ${pupil}`)
    }

    if (items.length > 0) {
      sections.push({ step: meta.key, title: meta.subtitle, items })
    }
  }

  return sections
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
