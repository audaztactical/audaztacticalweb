import i18n from '../i18n'
import { healthPdfT } from './pdfReportText'
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
import {
  CASEVAC_MIST_INJURY_OPTIONS,
  CASEVAC_MIST_METRIC_OPTIONS,
  CASEVAC_MIST_TREATMENT_OPTIONS,
  CASEVAC_MIST_VITALS_OPTIONS,
} from './casevacSimulatorConstants'
import {
  MEDEVAC_LINE3_PRECEDENCE,
  MEDEVAC_LINE4_OPTIONS,
  MEDEVAC_LINE6_OPTIONS,
  MEDEVAC_LINE7_OPTIONS,
  MEDEVAC_LINE8_OPTIONS,
  MEDEVAC_LINE9_CBRN_OPTIONS,
  MEDEVAC_LINE9_TERRAIN_OPTIONS,
} from './medevacSimulatorConstants'
import { IFAK_ITEM_CATEGORIES } from './tcccHealthConstants'

const NS = 'health'

/** @returns {'tr-TR' | 'en-US'} */
export function healthLocale() {
  return i18n.language?.startsWith('tr') ? 'tr-TR' : 'en-US'
}

/**
 * @param {string} key
 * @param {Record<string, unknown>} [params]
 */
export function healthT(key, params = {}) {
  return i18n.t(key, { ns: NS, ...params })
}

/** @param {string} roleId */
export function labelMedicalRole(roleId) {
  const id = String(roleId ?? '').trim()
  if (!id) return ''
  const key = `personalHealth.roles.${id}`
  const translated = healthT(key)
  return translated === key ? id : translated
}

/** @returns {{ value: string, label: string }[]} */
export function medicalRoleOptions() {
  return [
    { value: 'operator', label: healthT('personalHealth.roles.operator') },
    { value: 'team_medic', label: healthT('personalHealth.roles.team_medic') },
  ]
}

/** @param {string} categoryId */
export function labelIfakCategory(categoryId) {
  const id = String(categoryId ?? '').trim()
  if (!id) return healthT('common.emDash')
  const key = `ifak.categories.${id}`
  const translated = healthT(key)
  return translated === key ? id : translated
}

/** @returns {{ id: string, label: string }[]} */
export function ifakCategoryOptions() {
  return IFAK_ITEM_CATEGORIES.map((c) => ({
    id: c.id,
    label: labelIfakCategory(c.id),
  }))
}

/** @param {'OK' | 'WARNING' | 'CRITICAL_EXPIRED' | string} status */
export function labelIfakStatus(status) {
  const id = String(status ?? 'OK')
  const key = `ifak.status.${id}`
  const translated = healthT(key)
  return translated === key ? id : translated
}

/** @param {string} tabId */
export function labelDocTab(tabId) {
  return healthT(`docs.tabs.${tabId}`)
}

/** @param {string} templateId */
export function fieldTemplateCopy(templateId) {
  return {
    title: healthT(`docs.templates.items.${templateId}.title`),
    subtitle: healthT(`docs.templates.items.${templateId}.subtitle`),
    button: healthT(`docs.templates.items.${templateId}.button`),
  }
}

/**
 * @param {string} group
 * @param {string} id
 * @param {string} [fallback]
 */
function labelOption(group, id, fallback = '') {
  const key = String(id ?? '').trim()
  if (!key) return fallback || ''
  const tKey = `march.options.${group}.${key}`
  const translated = healthT(tKey)
  return translated === tKey ? fallback || key : translated
}

/** @param {string} id */
export function labelCasualtyBloodType(id) {
  const key = String(id ?? '').trim()
  if (!key) return healthT('march.bloodUnknown')
  return labelOption('bloodType', key, key)
}

/** @param {string} id */
export function labelTqLocation(id) {
  return labelOption('tqLocation', id)
}

/** @param {string} id */
export function labelFluid(id) {
  return labelOption('fluid', id)
}

/** @param {string} id */
export function labelRadialPulse(id) {
  return labelOption('radialPulse', id)
}

/** @param {string} id */
export function labelAvpu(id) {
  return labelOption('avpu', id)
}

/** @param {string} id */
export function labelPupil(id) {
  return labelOption('pupil', id)
}

/** @param {string} id */
export function labelNdcGauge(id) {
  return labelOption('ndcGauge', id)
}

/** @param {string} id */
export function labelEvacPriority(id) {
  return labelOption('evacPriority', id, id)
}

/** @returns {{ id: string, label: string }[]} */
export function casualtyBloodTypeOptions() {
  return CASUALTY_BLOOD_TYPE_OPTIONS.map((o) => ({
    id: o.id,
    label: labelCasualtyBloodType(o.id),
  }))
}

/** @returns {{ id: string, label: string }[]} */
export function tqLocationOptions() {
  return TQ_LOCATION_DD_OPTIONS.map((o) => ({ id: o.id, label: labelTqLocation(o.id) }))
}

/** @returns {{ id: string, label: string }[]} */
export function fluidOptions() {
  return FLUID_DD_OPTIONS.map((o) => ({ id: o.id, label: labelFluid(o.id) }))
}

/** @returns {{ id: string, label: string }[]} */
export function radialPulseOptions() {
  return RADIAL_PULSE_OPTIONS.map((o) => ({ id: o.id, label: labelRadialPulse(o.id) }))
}

/** @returns {{ id: string, label: string }[]} */
export function avpuOptions() {
  return AVPU_OPTIONS.map((o) => ({ id: o.id, label: labelAvpu(o.id) }))
}

/** @returns {{ id: string, label: string }[]} */
export function pupilOptions() {
  return PUPIL_OPTIONS.map((o) => ({ id: o.id, label: labelPupil(o.id) }))
}

/** @returns {{ id: string, label: string }[]} */
export function ndcGaugeOptions() {
  return NDC_GAUGE_OPTIONS.map((o) => ({ id: o.id, label: labelNdcGauge(o.id) }))
}

/** @returns {{ id: string, label: string }[]} */
export function evacPriorityOptions() {
  return EVAC_PRIORITY_OPTIONS.map((o) => ({ id: o.id, label: labelEvacPriority(o.id) }))
}

/** @param {'M'|'A'|'R'|'C'|'H'|string} key */
export function marchStepTitle(key) {
  return healthT(`march.steps.${key}.title`)
}

/** @param {'M'|'A'|'R'|'C'|'H'|string} key */
export function marchStepSubtitle(key) {
  return healthT(`march.steps.${key}.subtitle`)
}

/** @param {'M'|'A'|'R'|'C'|'H'|string} key */
export function marchStepDoctrine(key) {
  return healthT(`march.steps.${key}.doctrine`)
}

/**
 * @param {'M'|'A'|'R'|'C'|'H'|string} key
 * @returns {{ definition: string, protocols: string[] }}
 */
export function marchProtocolDetail(key) {
  const definition = healthT(`march.protocol.${key}.definition`)
  /** @type {string[]} */
  const protocols = []
  for (let i = 0; i < 8; i += 1) {
    const tKey = `march.protocol.${key}.protocols.${i}`
    const line = healthT(tKey)
    if (line === tKey) break
    protocols.push(line)
  }
  return { definition, protocols }
}

/**
 * Visual/meta fields from config + translated title/subtitle/doctrine.
 * @param {'M'|'A'|'R'|'C'|'H'|string} key
 */
export function marchStepDisplay(key) {
  const meta = MARCH_DD1380_STEPS.find((s) => s.key === key) ?? MARCH_DD1380_STEPS[0]
  return {
    ...meta,
    title: marchStepTitle(meta.key),
    subtitle: marchStepSubtitle(meta.key),
    doctrine: marchStepDoctrine(meta.key),
  }
}

/** @returns {ReturnType<typeof marchStepDisplay>[]} */
export function marchStepsDisplay() {
  return MARCH_DD1380_STEPS.map((s) => marchStepDisplay(s.key))
}

/**
 * @param {string} group sim.options.*
 * @param {string} id
 */
function labelSimOption(group, id) {
  const key = String(id ?? '').trim()
  if (!key) return ''
  const tKey = `sim.options.${group}.${key}`
  const translated = healthT(tKey)
  return translated === tKey ? key : translated
}

/** @returns {{ id: string; label: string; code: string }[]} */
export function medevacLine3Options() {
  return MEDEVAC_LINE3_PRECEDENCE.map((o) => ({
    id: o.id,
    code: o.code,
    label: labelSimOption('line3', o.id),
  }))
}

/** @returns {{ id: string; label: string }[]} */
export function medevacLine4Options() {
  return MEDEVAC_LINE4_OPTIONS.map((o) => ({ id: o.id, label: labelSimOption('line4', o.id) }))
}

/** @returns {{ id: string; label: string }[]} */
export function medevacLine6Options() {
  return MEDEVAC_LINE6_OPTIONS.map((o) => ({ id: o.id, label: labelSimOption('line6', o.id) }))
}

/** @returns {{ id: string; label: string }[]} */
export function medevacLine7Options() {
  return MEDEVAC_LINE7_OPTIONS.map((o) => ({ id: o.id, label: labelSimOption('line7', o.id) }))
}

/** @returns {{ id: string; label: string }[]} */
export function medevacLine8Options() {
  return MEDEVAC_LINE8_OPTIONS.map((o) => ({ id: o.id, label: labelSimOption('line8', o.id) }))
}

/** @returns {{ id: string; label: string }[]} */
export function medevacLine9CbrnOptions() {
  return MEDEVAC_LINE9_CBRN_OPTIONS.map((o) => ({
    id: o.id,
    label: labelSimOption('line9Cbrn', o.id),
  }))
}

/** @returns {{ id: string; label: string }[]} */
export function medevacLine9TerrainOptions() {
  return MEDEVAC_LINE9_TERRAIN_OPTIONS.map((o) => ({
    id: o.id,
    label: labelSimOption('line9Terrain', o.id),
  }))
}

/** @returns {{ id: string; label: string }[]} */
export function casevacMistMetricOptions() {
  return CASEVAC_MIST_METRIC_OPTIONS.map((o) => ({
    id: o.id,
    label: labelSimOption('mistMetric', o.id),
  }))
}

/** @returns {{ id: string; label: string }[]} */
export function casevacMistInjuryOptions() {
  return CASEVAC_MIST_INJURY_OPTIONS.map((o) => ({
    id: o.id,
    label: labelSimOption('mistInjury', o.id),
  }))
}

/** @returns {{ id: string; label: string }[]} */
export function casevacMistVitalsOptions() {
  return CASEVAC_MIST_VITALS_OPTIONS.map((o) => ({
    id: o.id,
    label: labelSimOption('mistVitals', o.id),
  }))
}

/** @returns {{ id: string; label: string }[]} */
export function casevacMistTreatmentOptions() {
  return CASEVAC_MIST_TREATMENT_OPTIONS.map((o) => ({
    id: o.id,
    label: labelSimOption('mistTreatment', o.id),
  }))
}

/** @param {string} code */
export function labelMedevacConflict(code) {
  const key = `sim.conflicts.${code}`
  const translated = healthT(key)
  return translated === key ? code : translated
}

/**
 * Resolve option label preferring ID lookup over stored (possibly TR) label.
 * @param {string} id
 * @param {string} storedLabel
 * @param {(id: string) => string} labelFn
 */
export function resolveOptionLabel(id, storedLabel, labelFn) {
  const fromId = id ? labelFn(id) : ''
  if (fromId) return fromId
  return String(storedLabel ?? '').trim()
}

/**
 * Build intervention display strings for a MARCH block (shared by archive + PDF).
 * @param {Record<string, Record<string, unknown>>} march
 * @returns {{ step: string, title: string, items: string[] }[]}
 */
export function buildMarchInterventionSections(march) {
  const m = march && typeof march === 'object' ? march : {}
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
        const locId = String(b.tqLocation ?? '').trim()
        const loc =
          locId === 'custom'
            ? String(b.tqLocationCustom ?? b.tqLocationLabel ?? '').trim()
            : resolveOptionLabel(locId, String(b.tqLocationLabel ?? ''), labelTqLocation)
        const t = String(b.tqInsertionTime ?? '').trim()
        const locPart = loc ? healthPdfT('interventions.locSep', { loc }) : ''
        const timePart = t ? healthPdfT('interventions.timeSep', { time: t }) : ''
        items.push(healthPdfT('interventions.tourniquetWithMeta', { loc: locPart, time: timePart }))
      }
      if (b.woundPackingHemostatic) items.push(healthPdfT('interventions.hemostaticPacking'))
      if (b.pressureBandage) items.push(healthPdfT('interventions.pressureBandage'))
    } else if (meta.key === 'A') {
      if (b.npaInserted) items.push(healthPdfT('interventions.npa'))
      if (b.intubatedCric) items.push(healthPdfT('interventions.intubatedCric'))
      if (b.recoveryPosition) items.push(healthPdfT('interventions.recoveryPosition'))
    } else if (meta.key === 'R') {
      if (b.ventedChestSeal) items.push(healthPdfT('interventions.ventedChestSeal'))
      if (b.needleDecompression) {
        const gaugeId = String(b.ndcGauge ?? '').trim()
        const gauge = resolveOptionLabel(gaugeId, String(b.ndcGaugeLabel ?? ''), labelNdcGauge)
        const gaugePart = gauge ? healthPdfT('interventions.gaugeSep', { gauge }) : ''
        items.push(healthPdfT('interventions.ndcWithGauge', { gauge: gaugePart }))
      }
      const rr = String(b.respiratoryRate ?? '').trim()
      if (rr) items.push(healthPdfT('interventions.respiratoryRate', { rate: rr }))
    } else if (meta.key === 'C') {
      if (b.ivIoAccess) items.push(healthPdfT('interventions.ivIo'))
      const fluidId = String(b.fluidAdministered ?? '').trim()
      const fluid = resolveOptionLabel(fluidId, String(b.fluidLabel ?? ''), labelFluid)
      if (fluid) items.push(healthPdfT('interventions.fluidWithValue', { fluid }))
      if (b.txaAdministered) items.push(healthPdfT('interventions.txa'))
      const pulseId = String(b.radialPulse ?? '').trim()
      const pulse = resolveOptionLabel(pulseId, String(b.radialPulseLabel ?? ''), labelRadialPulse)
      if (pulse) items.push(healthPdfT('interventions.radialPulseWithValue', { pulse }))
    } else if (meta.key === 'H') {
      if (b.hypothermiaWrap) items.push(healthPdfT('interventions.thermalWrap'))
      if (b.activeHeating) items.push(healthPdfT('interventions.activeHeating'))
      const avpuId = String(b.avpuLevel ?? '').trim()
      const avpu = resolveOptionLabel(avpuId, String(b.avpuLabel ?? ''), labelAvpu)
      if (avpu) items.push(healthPdfT('interventions.avpuWithValue', { avpu }))
      const pupilId = String(b.pupilStatus ?? '').trim()
      const pupil = resolveOptionLabel(pupilId, String(b.pupilLabel ?? ''), labelPupil)
      if (pupil) items.push(healthPdfT('interventions.pupilWithValue', { pupil }))
    }

    if (items.length > 0) {
      sections.push({ step: meta.key, title: marchStepSubtitle(meta.key), items })
    }
  }

  return sections
}
