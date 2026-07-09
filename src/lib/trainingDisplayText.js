import i18n from '../i18n'
import { ATIS_DRILL_LEVELS } from './atisDrills'
import {
  formatAtisDurationCell,
  formatWeaponSpecsBlock,
  getAtisCaliberLabel,
  getAtisLogTimestampMs,
  getAtisOperationNote,
  getAtisTimingDetails,
  isAtisTimed,
} from './atisLogRegistry'
import {
  CQB_CUSTOM,
  TACTICAL_ERROR_GROUPS,
  decodeCustomTacticalError,
  isCustomTacticalError,
  labelTacticalError,
} from './cqbOptions'
import {
  getCqbLogTimestampMs,
  getCqbOperationNote,
  getCqbTacticalErrorIds,
  getCqbTacticalErrors,
} from './cqbLogRegistry'
import { FOF_CUSTOM } from './fofOptions'
import { FOF_TACTICAL_ERROR_OPTIONS } from './fofTacticalErrors'
import {
  getFofDebriefNotes,
  getFofLogTimestampMs,
  getFofOperationNote,
  getFofTacticalErrorIds,
} from './fofLogRegistry'
import { formatMeteoOverviewRows } from './meteoDataCapture'
import { VBSS_EVALUATION_PHASES } from './evaluationPhaseDefinitions'
import { VBSS_PHASE_SUB_CRITERIA } from './evaluationPhaseCriteria'
import {
  isUnverifiedObservedEval,
  observedEvalTimestampMs,
} from './observedEvalRegistry'
import { OBSERVED_EVAL_TYPE } from './observedEvalConstants'
import { VBSS_CUSTOM } from './vbssOptions'
import { VBSS_TACTICAL_ERROR_OPTIONS } from './vbssTacticalErrors'
import {
  getVbssLogTimestampMs,
  getVbssOperationNote,
  getVbssSeaState,
  getVbssInsertionMethod,
  getVbssVesselType,
} from './vbssLogRegistry'
import { TCCC_MARCH_EVALUATION_PHASES } from './evaluationPhaseDefinitions'
import { TCCC_PHASE_SUB_CRITERIA } from './evaluationPhaseCriteria'
import { TCCC_CUSTOM, PROCEDURE_PERFORMED_OPTIONS } from './tcccOptions'
import {
  getTcccLogTimestampMs,
  getTcccOperationNote,
  getTcccPhase,
  getTcccInjuryType,
  getTcccTourniquetLocation,
  getTcccTourniquetApplied,
  getTcccWoundPacking,
  getTcccNpaInserted,
  getTcccChestSealApplied,
  getTcccNeedleDecompression,
  getTcccHypothermiaBlanket,
} from './tcccLogRegistry'
import { EGITIM_CUSTOM } from './egitimOptions'
import {
  getEgitimOperationNote,
  getEgitimPlanTimestampMs,
  isEgitimSandboxPlan,
} from './egitimLogRegistry'
import { invNum, invStr } from './inventoryIlws'
import { timestampToMs } from './firestoreSnapshot'
import { getRangeAssetDef } from './rangeLayoutAssets'

/** @typedef {import('../components/training/trainingCategories').TrainingCategory} TrainingCategory */

/** @returns {'tr-TR' | 'en-US'} */
export function trainingLocale() {
  return i18n.language?.startsWith('tr') ? 'tr-TR' : 'en-US'
}

/** @param {string} categoryId */
function sectorKey(categoryId) {
  return `sectors.${String(categoryId ?? '').trim()}`
}

/** @param {string} categoryId */
export function formatTrainingCategoryTitle(categoryId) {
  const id = String(categoryId ?? '').trim()
  if (!id) return ''
  const key = `${sectorKey(id)}.title`
  const translated = i18n.t(key, { ns: 'training', defaultValue: '' })
  if (translated) return translated
  return id
}

/** @param {string} categoryId */
export function formatTrainingSectorLabel(categoryId) {
  const id = String(categoryId ?? '').trim()
  if (!id) return ''
  const key = `${sectorKey(id)}.sectorLabel`
  const translated = i18n.t(key, { ns: 'training', defaultValue: '' })
  if (translated) return translated
  return id
}

/**
 * @param {TrainingCategory | null | undefined} category
 */
export function formatTrainingHeaderTitle(category) {
  if (!category?.id) return i18n.t('page.hubTitle', { ns: 'training' })
  return i18n.t(`headers.${category.id}.title`, { ns: 'training' })
}

/**
 * @param {TrainingCategory | null | undefined} category
 */
export function formatTrainingHeaderSubtitle(category) {
  if (!category?.id) return i18n.t('page.hubSubtitle', { ns: 'training' })
  return i18n.t(`headers.${category.id}.subtitle`, { ns: 'training' })
}

/** @param {number} level */
export function formatAtisDrillLevelTitle(level) {
  return i18n.t(`sectors.atis.drills.levels.${level}.title`, { ns: 'training' })
}

/** @param {string} drillId */
export function formatAtisDrillLabel(drillId) {
  for (const tier of ATIS_DRILL_LEVELS) {
    if (tier.drills.some((d) => d.id === drillId)) {
      return i18n.t(`sectors.atis.drills.levels.${tier.level}.${drillId}`, { ns: 'training' })
    }
  }
  return drillId
}

/** @param {Record<string, unknown>} row */
export function formatAtisDrillNameDisplay(row) {
  const drillId = String(row.drillId ?? '').trim()
  if (drillId === 'custom') {
    return String(row.drillName ?? row.shootType ?? '').trim() || '—'
  }
  if (drillId) return formatAtisDrillLabel(drillId)
  return String(row.drillName ?? row.shootType ?? '').trim() || '—'
}

/**
 * @param {{ key: string, params?: Record<string, unknown> } | null | undefined} reason
 */
export function formatAtisSubmitBlockedReason(reason) {
  if (!reason?.key) return null
  return i18n.t(`sectors.atis.validation.${reason.key}`, {
    ns: 'training',
    ...(reason.params ?? {}),
  })
}

/**
 * @param {'HANDGUN' | 'RIFLE'} weaponType
 */
export function formatAtisWeaponTypeFilterLabel(weaponType) {
  if (weaponType === 'HANDGUN') return i18n.t('sectors.atis.history.handgun', { ns: 'training' })
  if (weaponType === 'RIFLE') return i18n.t('sectors.atis.history.rifle', { ns: 'training' })
  return weaponType
}

/**
 * @param {'TIMED' | 'UNTIMED'} timing
 */
export function formatAtisTimingFilterLabel(timing) {
  if (timing === 'TIMED') return i18n.t('sectors.atis.history.timed', { ns: 'training' })
  if (timing === 'UNTIMED') return i18n.t('sectors.atis.history.untimed', { ns: 'training' })
  return timing
}

/**
 * @param {{ weaponType?: string, caliberKey?: string, drillName?: string, timing?: string }} filters
 */
export function formatAtisFilterSummaryDisplay(filters) {
  const parts = []
  if (filters.weaponType && filters.weaponType !== 'ALL') {
    parts.push(
      i18n.t('sectors.atis.history.filterSummary.weapon', {
        ns: 'training',
        value: formatAtisWeaponTypeFilterLabel(/** @type {'HANDGUN' | 'RIFLE'} */ (filters.weaponType)),
      }),
    )
  }
  if (filters.caliberKey && filters.caliberKey !== 'ALL') {
    parts.push(
      i18n.t('sectors.atis.history.filterSummary.caliber', {
        ns: 'training',
        value: filters.caliberKey,
      }),
    )
  }
  if (filters.drillName && filters.drillName !== 'ALL') {
    parts.push(
      i18n.t('sectors.atis.history.filterSummary.drill', {
        ns: 'training',
        value: filters.drillName,
      }),
    )
  }
  if (filters.timing && filters.timing !== 'ALL') {
    parts.push(
      i18n.t('sectors.atis.history.filterSummary.timing', {
        ns: 'training',
        value: formatAtisTimingFilterLabel(/** @type {'TIMED' | 'UNTIMED'} */ (filters.timing)),
      }),
    )
  }
  return parts.join(' · ')
}

/**
 * @param {Record<string, unknown>} row
 */
export function formatAtisDateCellDisplay(row) {
  const ms = getAtisLogTimestampMs(row)
  if (!ms) return '—'
  return new Date(ms).toLocaleString(trainingLocale(), {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

/**
 * @param {Record<string, unknown>} row
 */
export function formatAtisDurationCellDisplay(row) {
  const cell = formatAtisDurationCell(row)
  if (cell.label === 'SÜRESİZ') {
    return { label: i18n.t('sectors.atis.history.untimed', { ns: 'training' }), muted: true }
  }
  return cell
}

/**
 * @param {Record<string, unknown>} row
 */
export function formatAtisCaliberLabelDisplay(row) {
  const label = getAtisCaliberLabel(row)
  if (label === 'TANIMSIZ') {
    return i18n.t('sectors.atis.history.detail.undefinedCaliber', { ns: 'training' })
  }
  return label
}

/**
 * @param {Record<string, unknown>} row
 */
export function formatAtisOperationNoteDisplay(row) {
  const explicit = invStr(row.operationNote ?? row.notes ?? row.operation_note).trim()
  if (explicit) return explicit

  const parts = []
  const timingNote = invStr(row.timingNote).trim()
  if (timingNote) {
    if (timingNote === 'Süresiz Atış') {
      parts.push(i18n.t('sectors.atis.form.untimedNoteValue', { ns: 'training' }))
    } else {
      parts.push(timingNote)
    }
  }
  if (row.drillLevel != null && row.drillLevel !== '') {
    parts.push(
      i18n.t('sectors.atis.history.detail.level', {
        ns: 'training',
        level: row.drillLevel,
      }),
    )
  }
  const tags = row.tags
  if (Array.isArray(tags) && tags.length) {
    parts.push(
      tags
        .map((t) => (invStr(t).startsWith('#') ? invStr(t) : `#${invStr(t)}`))
        .join(' '),
    )
  }
  if (!parts.length) {
    return i18n.t('sectors.atis.history.detail.noOperationNote', { ns: 'training' })
  }
  return parts.join(' · ')
}

const SPEC_PREFIX_KEYS = {
  'AD:': 'specName',
  'MARKA:': 'specBrand',
  'KALİBRE:': 'specCaliber',
  'KOD:': 'specCode',
  'OPTİK:': 'specOptic',
  'SERİ:': 'specSerial',
}

/**
 * @param {Record<string, unknown>} row
 */
export function formatAtisWeaponSpecsLinesDisplay(row) {
  return formatWeaponSpecsBlock(row).map((line) => {
    for (const [prefix, key] of Object.entries(SPEC_PREFIX_KEYS)) {
      if (line.startsWith(prefix)) {
        const value = line.slice(prefix.length).trim()
        const label = i18n.t(`sectors.atis.history.detail.${key}`, { ns: 'training' })
        return `${label}: ${value}`
      }
    }
    return line
  })
}

/** @type {Record<string, string>} */
const METEO_LABEL_KEYS = {
  Sıcaklık: 'temperature',
  Rüzgar: 'wind',
  Nem: 'humidity',
  Konum: 'location',
}

/**
 * @param {import('./meteoDataCapture').MeteoSnapshot | null | undefined} meteo
 */
export function formatAtisMeteoRowsDisplay(meteo) {
  const noRecord = i18n.t('sectors.atis.history.meteo.noRecord', { ns: 'training' })
  return formatMeteoOverviewRows(meteo).map(([label, value]) => {
    const key = METEO_LABEL_KEYS[label]
    const displayLabel = key
      ? i18n.t(`sectors.atis.history.meteo.${key}`, { ns: 'training' })
      : label
    const displayValue = value === 'Kayıt yok' ? noRecord : value
    return [displayLabel, displayValue]
  })
}

/**
 * @param {unknown} raw
 */
export function formatAtisAccessoriesLinesDisplay(raw) {
  if (Array.isArray(raw) && raw.length) {
    return raw.map((item) => {
      if (!item || typeof item !== 'object') return '—'
      const o = /** @type {Record<string, unknown>} */ (item)
      const active = o.active === true
      const role = String(o.role ?? '').trim() || 'AKS'
      const name = String(o.name ?? '').trim() || '—'
      return `${active ? '●' : '○'} ${role}: ${name}`
    })
  }
  const noData = i18n.t('sectors.atis.history.detail.accessoryNoData', { ns: 'training' })
  return [`○ AKS: ${noData}`]
}

/**
 * @param {Record<string, unknown>} row
 */
export function formatAtisTimingDetailLevel(row) {
  if (row.drillLevel != null && row.drillLevel !== '') {
    return i18n.t('sectors.atis.history.detail.level', {
      ns: 'training',
      level: row.drillLevel,
    })
  }
  return null
}

export { getAtisTimingDetails, isAtisTimed }

/** @param {'roomTopology' | 'entryMethod' | 'breachingType' | 'doorState' | 'teamSize' | 'tacticalDecision'} optionType */
function cqbOptionKey(optionType, optionId) {
  const id = String(optionId ?? '').trim()
  if (id === CQB_CUSTOM) return `sectors.cqb.options.${optionType}.custom`
  return `sectors.cqb.options.${optionType}.${id}`
}

/**
 * @param {'roomTopology' | 'entryMethod' | 'breachingType' | 'doorState' | 'teamSize' | 'tacticalDecision'} optionType
 * @param {string} optionId
 * @param {string} [fallback]
 */
export function formatCqbOptionLabel(optionType, optionId, fallback = '') {
  const id = String(optionId ?? '').trim()
  if (!id) return fallback || '—'
  return i18n.t(cqbOptionKey(optionType, id), {
    ns: 'training',
    defaultValue: fallback || id,
  })
}

/** @param {string} groupId */
export function formatCqbTacticalErrorGroupTitle(groupId) {
  const id = String(groupId ?? '').trim()
  if (!id) return ''
  if (id === 'ÖZEL HATA') {
    return i18n.t('sectors.cqb.errors.customPhase', { ns: 'training' })
  }
  if (id === 'DİĞER') {
    return i18n.t('sectors.cqb.errors.other', { ns: 'training' })
  }
  if (id === 'TAKTİK HATALAR') {
    return i18n.t('sectors.cqb.errors.fallbackGroup', { ns: 'training' })
  }
  const match = TACTICAL_ERROR_GROUPS.find((g) => g.id === id || g.title === id)
  if (match) {
    return i18n.t(`sectors.cqb.errors.groups.${match.id}.title`, { ns: 'training' })
  }
  return id
}

/** @param {string} errorId */
export function formatCqbTacticalErrorLabel(errorId) {
  const id = String(errorId ?? '').trim()
  if (!id) return '—'
  if (isCustomTacticalError(id)) {
    return decodeCustomTacticalError(id) || i18n.t('sectors.cqb.errors.customPhase', { ns: 'training' })
  }
  for (const group of TACTICAL_ERROR_GROUPS) {
    if (group.items.some((item) => item.id === id)) {
      return i18n.t(`sectors.cqb.errors.groups.${group.id}.${id}`, {
        ns: 'training',
        defaultValue: labelTacticalError(id),
      })
    }
  }
  return i18n.t(`sectors.cqb.errors.legacy.${id}`, {
    ns: 'training',
    defaultValue: labelTacticalError(id),
  })
}

/**
 * @param {{ key: string, params?: Record<string, unknown> } | null | undefined} reason
 */
export function formatCqbSubmitBlockedReason(reason) {
  if (!reason?.key) return null
  return i18n.t(`sectors.cqb.validation.${reason.key}`, {
    ns: 'training',
    ...(reason.params ?? {}),
  })
}

/**
 * @param {Record<string, unknown>} row
 */
export function formatCqbDateCellDisplay(row) {
  const ms = getCqbLogTimestampMs(row)
  if (!ms) return '—'
  return new Date(ms).toLocaleString(trainingLocale(), {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

/**
 * @param {Record<string, unknown>} row
 */
export function formatCqbTacticalDecisionDisplay(row) {
  const key = String(row.tacticalDecision ?? '').trim()
  if (!key) return '—'
  return formatCqbOptionLabel('tacticalDecision', key, key)
}

/**
 * @param {Record<string, unknown>} row
 */
export function formatCqbOperationNoteDisplay(row) {
  const note = getCqbOperationNote(row)
  if (note === 'Operasyon notu kayıtlı değil.') {
    return i18n.t('sectors.cqb.history.detail.noOperationNote', { ns: 'training' })
  }
  return note
}

/**
 * @param {Record<string, unknown>} row
 * @returns {{ phaseTitle: string; labels: string[] }[]}
 */
export function formatCqbTacticalErrorsGroupedDisplay(row) {
  const ids = getCqbTacticalErrorIds(row)
  if (ids.length) {
    /** @type {Map<string, { title: string; labels: string[] }>} */
    const buckets = new Map()
    for (const id of ids) {
      const group = TACTICAL_ERROR_GROUPS.find((g) => g.items.some((item) => item.id === id))
      const bucketKey = isCustomTacticalError(id) ? 'custom' : group?.id ?? 'other'
      const title = formatCqbTacticalErrorGroupTitle(
        group?.id ?? (isCustomTacticalError(id) ? 'ÖZEL HATA' : 'DİĞER'),
      )
      const entry = buckets.get(bucketKey) ?? { title, labels: [] }
      entry.labels.push(formatCqbTacticalErrorLabel(id))
      buckets.set(bucketKey, entry)
    }
    const order = [...TACTICAL_ERROR_GROUPS.map((g) => g.id), 'custom', 'other']
    return order
      .filter((k) => buckets.has(k))
      .map((k) => {
        const bucket = buckets.get(k)
        return { phaseTitle: bucket.title, labels: bucket.labels }
      })
  }
  const flat = getCqbTacticalErrors(row)
  if (!flat.length) return []
  return [
    {
      phaseTitle: i18n.t('sectors.cqb.errors.fallbackGroup', { ns: 'training' }),
      labels: flat,
    },
  ]
}

/**
 * @param {{ roomTopologyKey?: string, entryMethodKey?: string, teamSize?: string }} filters
 */
export function formatCqbFilterSummaryDisplay(filters) {
  const parts = []
  if (filters.roomTopologyKey && filters.roomTopologyKey !== 'ALL') {
    parts.push(
      i18n.t('sectors.cqb.history.filterSummary.topology', {
        ns: 'training',
        value: filters.roomTopologyKey,
      }),
    )
  }
  if (filters.entryMethodKey && filters.entryMethodKey !== 'ALL') {
    parts.push(
      i18n.t('sectors.cqb.history.filterSummary.entry', {
        ns: 'training',
        value: filters.entryMethodKey,
      }),
    )
  }
  if (filters.teamSize && filters.teamSize !== 'ALL') {
    parts.push(
      i18n.t('sectors.cqb.history.filterSummary.team', {
        ns: 'training',
        value: filters.teamSize,
      }),
    )
  }
  return parts.join(' · ')
}

/** @type {Record<string, string>} */
const CQB_METEO_LABEL_KEYS = {
  Sıcaklık: 'temperature',
  Rüzgar: 'wind',
  Nem: 'humidity',
  Konum: 'location',
}

/**
 * @param {import('./meteoDataCapture').MeteoSnapshot | null | undefined} meteo
 */
export function formatCqbMeteoRowsDisplay(meteo) {
  const noRecord = i18n.t('sectors.cqb.history.meteo.noRecord', { ns: 'training' })
  return formatMeteoOverviewRows(meteo).map(([label, value]) => {
    const key = CQB_METEO_LABEL_KEYS[label]
    const displayLabel = key
      ? i18n.t(`sectors.cqb.history.meteo.${key}`, { ns: 'training' })
      : label
    const displayValue = value === 'Kayıt yok' ? noRecord : value
    return [displayLabel, displayValue]
  })
}

/** @type {Record<string, string>} */
const CQB_CUSTOM_FIELD_MAP = {
  roomTopology: 'customRoomTopology',
  entryMethod: 'customEntryMethod',
  breachingType: 'customBreachingType',
}

/**
 * @param {Record<string, unknown>} row
 * @param {'roomTopology' | 'entryMethod' | 'breachingType' | 'doorState'} field
 */
export function formatCqbSelectFieldDisplay(row, field) {
  const keyField = `${field}Key`
  const key = String(row[keyField] ?? '').trim()
  const customField = CQB_CUSTOM_FIELD_MAP[field]
  const custom = customField ? String(row[customField] ?? '').trim() : ''
  if (key === CQB_CUSTOM) {
    return custom || i18n.t('sectors.cqb.errors.customPhase', { ns: 'training' })
  }
  if (key) {
    const optionType =
      field === 'roomTopology'
        ? 'roomTopology'
        : field === 'entryMethod'
          ? 'entryMethod'
          : field === 'breachingType'
            ? 'breachingType'
            : 'doorState'
    return formatCqbOptionLabel(optionType, key, key)
  }
  const storedLabel = String(row[field] ?? '').trim()
  if (storedLabel && storedLabel !== 'Özel' && storedLabel !== '—') return storedLabel
  return '—'
}

/** @param {'scenarioType' | 'simSystem' | 'engagementType'} optionType */
function fofOptionKey(optionType, optionId) {
  const id = String(optionId ?? '').trim()
  if (id === FOF_CUSTOM) return `sectors.fof.options.${optionType}.custom`
  return `sectors.fof.options.${optionType}.${id}`
}

/**
 * @param {'scenarioType' | 'simSystem' | 'engagementType'} optionType
 * @param {string} optionId
 * @param {string} [fallback]
 */
export function formatFofOptionLabel(optionType, optionId, fallback = '') {
  const id = String(optionId ?? '').trim()
  if (!id) return fallback || '—'
  return i18n.t(fofOptionKey(optionType, id), {
    ns: 'training',
    defaultValue: fallback || id,
  })
}

/** @param {string} errorId */
export function formatFofTacticalErrorLabel(errorId) {
  const id = String(errorId ?? '').trim()
  if (!id) return '—'
  const fallback = FOF_TACTICAL_ERROR_OPTIONS.find((o) => o.id === id)?.label ?? id
  return i18n.t(`sectors.fof.errors.${id}`, { ns: 'training', defaultValue: fallback })
}

/**
 * @param {{ key: string, params?: Record<string, unknown> } | null | undefined} reason
 */
export function formatFofSubmitBlockedReason(reason) {
  if (!reason?.key) return null
  return i18n.t(`sectors.fof.validation.${reason.key}`, {
    ns: 'training',
    ...(reason.params ?? {}),
  })
}

/**
 * @param {Record<string, unknown>} row
 */
export function formatFofDateCellDisplay(row) {
  const ms = getFofLogTimestampMs(row)
  if (!ms) return '—'
  return new Date(ms).toLocaleString(trainingLocale(), {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

/**
 * @param {Record<string, unknown>} row
 */
export function formatFofEngagementTypeDisplay(row) {
  const key = String(row.engagementType ?? '').trim()
  if (!key) return '—'
  return formatFofOptionLabel('engagementType', key, key)
}

/** @type {Record<string, string>} */
const FOF_CUSTOM_FIELD_MAP = {
  scenarioType: 'customScenarioType',
  simSystem: 'customSimSystem',
}

/**
 * @param {Record<string, unknown>} row
 * @param {'scenarioType' | 'simSystem'} field
 */
export function formatFofSelectFieldDisplay(row, field) {
  const keyField = `${field}Key`
  const key = String(row[keyField] ?? '').trim()
  const customField = FOF_CUSTOM_FIELD_MAP[field]
  const custom = customField ? String(row[customField] ?? '').trim() : ''
  if (key === FOF_CUSTOM) {
    return custom || i18n.t('sectors.fof.options.scenarioType.custom', { ns: 'training' })
  }
  if (key) return formatFofOptionLabel(field, key, key)
  const storedLabel = String(row[field] ?? '').trim()
  if (storedLabel && storedLabel !== 'Özel' && storedLabel !== '—') return storedLabel
  return '—'
}

/**
 * @param {Record<string, unknown>} row
 */
export function formatFofOperationNoteDisplay(row) {
  const note = getFofOperationNote(row)
  if (note === 'Operasyon notu kayıtlı değil.') {
    return i18n.t('sectors.fof.history.detail.noOperationNote', { ns: 'training' })
  }
  return note
}

/**
 * @param {Record<string, unknown>} row
 */
export function formatFofDebriefNotesDisplay(row) {
  const note = getFofDebriefNotes(row)
  if (note === 'Debrief notu kayıtlı değil.') {
    return i18n.t('sectors.fof.history.detail.noDebriefNotes', { ns: 'training' })
  }
  return note
}

/**
 * @param {Record<string, unknown>} row
 */
export function formatFofTacticalErrorsDisplay(row) {
  return getFofTacticalErrorIds(row).map((id) => formatFofTacticalErrorLabel(id))
}

/**
 * @param {{ scenarioTypeKey?: string, simSystemKey?: string, engagementType?: string }} filters
 */
export function formatFofFilterSummaryDisplay(filters) {
  const parts = []
  if (filters.scenarioTypeKey && filters.scenarioTypeKey !== 'ALL') {
    parts.push(
      i18n.t('sectors.fof.history.filterSummary.scenario', {
        ns: 'training',
        value: filters.scenarioTypeKey,
      }),
    )
  }
  if (filters.simSystemKey && filters.simSystemKey !== 'ALL') {
    parts.push(
      i18n.t('sectors.fof.history.filterSummary.sim', {
        ns: 'training',
        value: filters.simSystemKey,
      }),
    )
  }
  if (filters.engagementType && filters.engagementType !== 'ALL') {
    parts.push(
      i18n.t('sectors.fof.history.filterSummary.engagement', {
        ns: 'training',
        value: filters.engagementType,
      }),
    )
  }
  return parts.join(' · ')
}

/** @type {Record<string, string>} */
const FOF_METEO_LABEL_KEYS = {
  Sıcaklık: 'temperature',
  Rüzgar: 'wind',
  Nem: 'humidity',
  Konum: 'location',
}

/**
 * @param {import('./meteoDataCapture').MeteoSnapshot | null | undefined} meteo
 */
export function formatFofMeteoRowsDisplay(meteo) {
  const noRecord = i18n.t('sectors.fof.history.meteo.noRecord', { ns: 'training' })
  return formatMeteoOverviewRows(meteo).map(([label, value]) => {
    const key = FOF_METEO_LABEL_KEYS[label]
    const displayLabel = key
      ? i18n.t(`sectors.fof.history.meteo.${key}`, { ns: 'training' })
      : label
    const displayValue = value === 'Kayıt yok' ? noRecord : value
    return [displayLabel, displayValue]
  })
}

/** @param {boolean} value */
export function formatFofYesNoDisplay(value) {
  return i18n.t(`sectors.fof.history.detail.${value ? 'yes' : 'no'}`, { ns: 'training' })
}

/** @param {boolean} value */
export function formatFofSelfTcccDisplay(value) {
  return i18n.t(`sectors.fof.history.detail.${value ? 'applied' : 'no'}`, { ns: 'training' })
}

/** @typedef {'vbss' | 'tccc'} ObservedEvalDiscipline */

export function formatObservedEvalSelectPlaceholder() {
  return i18n.t('common.observedEval.selectPlaceholder', { ns: 'training' })
}

/**
 * @param {string} label
 * @param {number} min
 * @param {number} max
 */
export function formatObservedEvalScoreRangeLabel(label, min, max) {
  return i18n.t('common.observedEval.scoreRange', { ns: 'training', label, min, max })
}

export function formatObservedEvalObservationNoteLabel() {
  return i18n.t('common.observedEval.observationNote', { ns: 'training' })
}

/** @param {string} label */
export function formatObservedEvalAriaScoreGroup(label) {
  return i18n.t('common.observedEval.aria.scoreGroup', { ns: 'training', label })
}

/**
 * @param {string} label
 * @param {number} score
 */
export function formatObservedEvalAriaScoreButton(label, score) {
  return i18n.t('common.observedEval.aria.scoreButton', { ns: 'training', label, score })
}

/**
 * @param {ObservedEvalDiscipline} discipline
 * @param {string} phaseId
 * @param {string} [fallback]
 */
export function formatObservedEvalPhaseTitle(discipline, phaseId, fallback = '') {
  const key = `common.observedEval.phases.${discipline}.${phaseId}.title`
  return i18n.t(key, { ns: 'training', defaultValue: fallback })
}

/**
 * @param {ObservedEvalDiscipline} discipline
 * @param {string} phaseId
 * @param {string} [fallback]
 */
export function formatObservedEvalPhaseSubtitle(discipline, phaseId, fallback = '') {
  const key = `common.observedEval.phases.${discipline}.${phaseId}.subtitle`
  return i18n.t(key, { ns: 'training', defaultValue: fallback })
}

/**
 * @param {ObservedEvalDiscipline} discipline
 * @param {string} phaseId
 * @param {string} criterionId
 * @param {string} [fallback]
 */
export function formatObservedEvalCriterionLabel(discipline, phaseId, criterionId, fallback = '') {
  const key = `common.observedEval.criteria.${discipline}.${phaseId}.${criterionId}`
  return i18n.t(key, { ns: 'training', defaultValue: fallback })
}

/**
 * @param {import('./evaluationPhaseCriteria').EvaluationSubCriterion | null | undefined} criterion
 * @param {ObservedEvalDiscipline | null | undefined} discipline
 * @param {string | null | undefined} phaseId
 */
export function resolveObservedEvalCriterionLabel(criterion, discipline, phaseId) {
  if (!criterion?.id) return ''
  if (discipline && phaseId) {
    return formatObservedEvalCriterionLabel(discipline, phaseId, criterion.id, criterion.label)
  }
  return criterion.label ?? ''
}

/** @param {'boardingPoint' | 'vesselType' | 'threatLevel' | 'seaState'} optionType */
function vbssOptionKey(optionType, optionId) {
  const id = String(optionId ?? '').trim()
  if (id === VBSS_CUSTOM) return `sectors.vbss.options.${optionType}.custom`
  return `sectors.vbss.options.${optionType}.${id}`
}

/**
 * @param {'boardingPoint' | 'vesselType' | 'threatLevel' | 'seaState'} optionType
 * @param {string} optionId
 * @param {string} [fallback]
 */
export function formatVbssOptionLabel(optionType, optionId, fallback = '') {
  const id = String(optionId ?? '').trim()
  if (!id) return fallback || '—'
  return i18n.t(vbssOptionKey(optionType, id), {
    ns: 'training',
    defaultValue: fallback || id,
  })
}

/** @param {string} errorId */
export function formatVbssTacticalErrorLabel(errorId) {
  const id = String(errorId ?? '').trim()
  if (!id) return '—'
  const match = VBSS_TACTICAL_ERROR_OPTIONS.find((o) => o.id === id)
  return i18n.t(`sectors.vbss.options.tacticalErrors.${id}`, {
    ns: 'training',
    defaultValue: match?.label ?? id,
  })
}

/**
 * @param {string | null | undefined} reasonKey
 */
export function formatVbssDrillSubmitBlockedReason(reasonKey) {
  if (!reasonKey) return null
  const keyMap = {
    OTURUM_GEREKLİ: 'sessionRequired',
    BOARDING_POINT_GEREKLİ: 'boardingPointRequired',
    ÖZEL_GİRİŞ_NOKTASI_GEREKLİ: 'customBoardingRequired',
    VESSEL_TYPE_GEREKLİ: 'vesselTypeRequired',
    ÖZEL_GEMİ_TİPİ_GEREKLİ: 'customVesselRequired',
    'SEARCH_DURATION_ZORUNLU · SN > 0': 'searchDurationRequired',
    THREAT_LEVEL_GEREKLİ: 'threatLevelRequired',
    DENİZ_DURUMU_GEREKLİ: 'seaStateRequired',
    ÖZEL_DENİZ_DURUMU_GEREKLİ: 'customSeaRequired',
  }
  const mapped = keyMap[reasonKey] ?? reasonKey
  return i18n.t(`sectors.vbss.drill.validation.${mapped}`, {
    ns: 'training',
    defaultValue: reasonKey,
  })
}

/**
 * @param {string | null | undefined} err
 */
export function formatVbssObservedEvalValidationError(err) {
  if (!err) return null
  const staticMap = {
    'Gözlemci adı zorunludur.': 'observerNameRequired',
    'Saha tarihi zorunludur.': 'observedAtRequired',
    'Hedef operasyon süresi geçersiz.': 'targetDurationInvalid',
  }
  if (staticMap[err]) {
    return i18n.t(`sectors.vbss.observedEval.validation.${staticMap[err]}`, { ns: 'training' })
  }

  const scoreMatch = err.match(/^(.+) · (.+) için geçerli skor seçin \((\d+)–(\d+)\)\.$/)
  if (scoreMatch) {
    const [, phaseTitle, criterionLabel, min, max] = scoreMatch
    for (const meta of VBSS_EVALUATION_PHASES) {
      if (meta.title === phaseTitle) {
        const criteria = VBSS_PHASE_SUB_CRITERIA[meta.id] ?? []
        for (const c of criteria) {
          if (c.label === criterionLabel) {
            return i18n.t('sectors.vbss.observedEval.validation.criterionScoreRequired', {
              ns: 'training',
              phase: formatObservedEvalPhaseTitle('vbss', meta.id, meta.title),
              criterion: formatObservedEvalCriterionLabel('vbss', meta.id, c.id, c.label),
              min,
              max,
            })
          }
        }
      }
    }
  }
  return err
}

/** @param {Record<string, unknown>} row */
export function formatVbssDateCellDisplay(row) {
  const ms = getVbssLogTimestampMs(row)
  if (!ms) return '—'
  return new Date(ms).toLocaleString(trainingLocale(), {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

/** @param {boolean} value */
export function formatVbssBoolDisplay(value) {
  return i18n.t(`sectors.vbss.history.bool.${value ? 'yes' : 'no'}`, { ns: 'training' })
}

/**
 * @param {Record<string, unknown>} row
 * @param {'insertionMethod' | 'vesselType' | 'seaState'} field
 */
export function formatVbssSelectFieldDisplay(row, field) {
  const optionType =
    field === 'insertionMethod'
      ? 'boardingPoint'
      : field === 'vesselType'
        ? 'vesselType'
        : 'seaState'
  const keyField =
    field === 'insertionMethod'
      ? 'insertionMethodKey'
      : field === 'vesselType'
        ? 'vesselTypeKey'
        : 'seaStateKey'
  const customField =
    field === 'insertionMethod'
      ? 'customInsertionMethod'
      : field === 'vesselType'
        ? 'customVesselType'
        : 'customSeaState'
  const key = String(row[keyField] ?? '').trim()
  const custom = String(row[customField] ?? row.customBoardingPoint ?? '').trim()
  if (key === VBSS_CUSTOM) {
    return custom || i18n.t(`sectors.vbss.options.${optionType}.custom`, { ns: 'training' })
  }
  if (key) return formatVbssOptionLabel(optionType, key, key)
  const storedLabel =
    field === 'insertionMethod'
      ? getVbssInsertionMethod(row)
      : field === 'vesselType'
        ? getVbssVesselType(row)
        : getVbssSeaState(row)
  if (!storedLabel || storedLabel === '—') return '—'
  if (storedLabel.startsWith('custom:')) {
    return storedLabel.slice(7).trim() || i18n.t(`sectors.vbss.options.${optionType}.custom`, { ns: 'training' })
  }
  return storedLabel
}

/** @param {Record<string, unknown>} row */
export function formatVbssBoardingPointDisplay(row) {
  return formatVbssSelectFieldDisplay(row, 'insertionMethod')
}

/** @param {Record<string, unknown>} row */
export function formatVbssThreatLevelDisplay(row) {
  const key = String(row.threatLevelKey ?? '').trim()
  if (key) return formatVbssOptionLabel('threatLevel', key, key)
  const stored = String(row.threatLevel ?? '').trim()
  return stored || '—'
}

/** @param {Record<string, unknown>} row */
export function formatVbssOperationNoteDisplay(row) {
  const note = getVbssOperationNote(row)
  if (note === 'Operasyon notu kayıtlı değil.') {
    return i18n.t('sectors.vbss.history.detail.noOperationNote', { ns: 'training' })
  }
  return note
}

/**
 * @param {{ seaStateKey?: string; boardingPointKey?: string; vesselTypeKey?: string; threatLevelKey?: string }} filters
 */
export function formatVbssFilterSummaryDisplay(filters) {
  const parts = []
  if (filters.boardingPointKey && filters.boardingPointKey !== 'ALL') {
    parts.push(
      i18n.t('sectors.vbss.history.filterSummary.boarding', {
        ns: 'training',
        value: filters.boardingPointKey,
      }),
    )
  }
  if (filters.vesselTypeKey && filters.vesselTypeKey !== 'ALL') {
    parts.push(
      i18n.t('sectors.vbss.history.filterSummary.vessel', {
        ns: 'training',
        value: filters.vesselTypeKey,
      }),
    )
  }
  if (filters.threatLevelKey && filters.threatLevelKey !== 'ALL') {
    parts.push(
      i18n.t('sectors.vbss.history.filterSummary.threat', {
        ns: 'training',
        value: filters.threatLevelKey,
      }),
    )
  }
  if (filters.seaStateKey && filters.seaStateKey !== 'ALL') {
    parts.push(
      i18n.t('sectors.vbss.history.filterSummary.sea', {
        ns: 'training',
        value: filters.seaStateKey,
      }),
    )
  }
  return parts.join(' · ')
}

/** @param {Record<string, unknown>} row */
export function formatVbssObservedEvalDateDisplay(row) {
  const ms = observedEvalTimestampMs(row)
  if (!ms) return '—'
  return new Date(ms).toLocaleString(trainingLocale(), {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** @param {Record<string, unknown>} row */
export function formatVbssObservedEvalTypeLabel(row) {
  if (String(row?.type ?? '') !== OBSERVED_EVAL_TYPE) return '—'
  return isUnverifiedObservedEval(row)
    ? i18n.t('sectors.vbss.observedEval.registry.badgeUnverified', { ns: 'training' })
    : i18n.t('sectors.vbss.observedEval.registry.badgeVerified', { ns: 'training' })
}

/** @param {'tcccPhase' | 'injuryType' | 'casualtyType' | 'outcome' | 'tourniquetLocation'} optionType */
function tcccOptionKey(optionType, optionId) {
  const id = String(optionId ?? '').trim()
  if (id === TCCC_CUSTOM) return `sectors.tccc.options.${optionType}.custom`
  return `sectors.tccc.options.${optionType}.${id}`
}

/**
 * @param {'tcccPhase' | 'injuryType' | 'casualtyType' | 'outcome' | 'tourniquetLocation'} optionType
 * @param {string} optionId
 * @param {string} [fallback]
 */
export function formatTcccOptionLabel(optionType, optionId, fallback = '') {
  const id = String(optionId ?? '').trim()
  if (!id) return fallback || '—'
  return i18n.t(tcccOptionKey(optionType, id), {
    ns: 'training',
    defaultValue: fallback || id,
  })
}

/** @param {string} procedureId */
export function formatTcccProcedureLabel(procedureId) {
  const id = String(procedureId ?? '').trim()
  if (!id) return '—'
  const match = PROCEDURE_PERFORMED_OPTIONS.find((o) => o.id === id)
  return i18n.t(`sectors.tccc.options.procedure.${id}`, {
    ns: 'training',
    defaultValue: match?.label ?? id,
  })
}

/**
 * @param {import('./tcccEvaluationPayload').TcccMarchPhaseId} phaseId
 * @param {string} chipId
 * @param {string} [fallback]
 */
export function formatTcccMarchActionChipLabel(phaseId, chipId, fallback = '') {
  const id = String(chipId ?? '').trim()
  if (!id || !phaseId) return fallback || id
  return i18n.t(`sectors.tccc.marchActions.${phaseId}.${id}`, {
    ns: 'training',
    defaultValue: fallback || id,
  })
}

/** @param {boolean} criticalFail */
export function formatTcccCriticalFailLabel(criticalFail) {
  return criticalFail
    ? i18n.t('sectors.tccc.observedEval.criticalFail.active', { ns: 'training' })
    : i18n.t('sectors.tccc.observedEval.criticalFail.toggle', { ns: 'training' })
}

/** @param {boolean} unstable */
export function formatTcccCasualtyStatusDisplay(unstable) {
  return unstable
    ? i18n.t('sectors.tccc.casualtyStatus.eksKia', { ns: 'training' })
    : i18n.t('sectors.tccc.casualtyStatus.stable', { ns: 'training' })
}

/** @param {boolean} unstable */
export function formatTcccCasualtyStatusCodeDisplay(unstable) {
  return unstable
    ? i18n.t('sectors.tccc.casualtyStatus.eksKiaCode', { ns: 'training' })
    : i18n.t('sectors.tccc.casualtyStatus.stableCode', { ns: 'training' })
}

/**
 * @param {string | null | undefined} reasonKey
 */
export function formatTcccDrillSubmitBlockedReason(reasonKey) {
  if (!reasonKey) return null
  const keyMap = {
    OTURUM_GEREKLİ: 'sessionRequired',
    CASUALTY_TYPE_GEREKLİ: 'casualtyTypeRequired',
    'INTERVENTION_TIME_ZORUNLU · SN > 0': 'interventionTimeRequired',
    PROCEDURE_PERFORMED_GEREKLİ: 'procedureRequired',
    OUTCOME_GEREKLİ: 'outcomeRequired',
    TCCC_FAZI_GEREKLİ: 'tcccPhaseRequired',
    ÖZEL_FAZ_GEREKLİ: 'customPhaseRequired',
    YARALANMA_TİPİ_GEREKLİ: 'injuryTypeRequired',
    TURNİKE_KONUMU_GEREKLİ: 'tourniquetLocationRequired',
    ÖZEL_KONUM_GEREKLİ: 'customLocationRequired',
  }
  const mapped = keyMap[reasonKey] ?? reasonKey
  return i18n.t(`sectors.tccc.drill.validation.${mapped}`, {
    ns: 'training',
    defaultValue: reasonKey,
  })
}

/**
 * @param {string | null | undefined} err
 */
export function formatTcccObservedEvalValidationError(err) {
  if (!err) return null
  const staticMap = {
    'Gözlemci adı zorunludur.': 'observerNameRequired',
    'Saha tarihi zorunludur.': 'observedAtRequired',
    'Müdahale hedef süresi geçersiz.': 'targetInterventionInvalid',
  }
  if (staticMap[err]) {
    return i18n.t(`sectors.tccc.observedEval.validation.${staticMap[err]}`, { ns: 'training' })
  }

  const scoreMatch = err.match(/^(.+) · (.+) için geçerli skor seçin \((\d+)–(\d+)\)\.$/)
  if (scoreMatch) {
    const [, phaseTitle, criterionLabel, min, max] = scoreMatch
    for (const meta of TCCC_MARCH_EVALUATION_PHASES) {
      if (meta.title === phaseTitle) {
        const criteria = TCCC_PHASE_SUB_CRITERIA[meta.id] ?? []
        for (const c of criteria) {
          if (c.label === criterionLabel) {
            return i18n.t('sectors.tccc.observedEval.validation.criterionScoreRequired', {
              ns: 'training',
              phase: formatObservedEvalPhaseTitle('tccc', meta.id, meta.title),
              criterion: formatObservedEvalCriterionLabel('tccc', meta.id, c.id, c.label),
              min,
              max,
            })
          }
        }
      }
    }
  }
  return err
}

/** @param {Record<string, unknown>} row */
export function formatTcccDateCellDisplay(row) {
  const ms = getTcccLogTimestampMs(row)
  if (!ms) return '—'
  return new Date(ms).toLocaleString(trainingLocale(), {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

/** @param {boolean} value */
export function formatTcccBoolDisplay(value) {
  return i18n.t(`sectors.tccc.history.bool.${value ? 'yes' : 'no'}`, { ns: 'training' })
}

/**
 * @param {Record<string, unknown>} row
 * @param {'injuryType' | 'tcccPhase' | 'tourniquetLocation'} field
 */
export function formatTcccSelectFieldDisplay(row, field) {
  const optionType = field
  const keyField =
    field === 'injuryType'
      ? 'injuryTypeKey'
      : field === 'tcccPhase'
        ? 'tcccPhaseKey'
        : 'tourniquetLocationKey'
  const customField =
    field === 'tcccPhase'
      ? 'customTcccPhase'
      : field === 'tourniquetLocation'
        ? 'customTourniquetLocation'
        : null
  const key = String(row[keyField] ?? '').trim()
  const custom = customField ? String(row[customField] ?? '').trim() : ''
  if (key === TCCC_CUSTOM) {
    return custom || i18n.t(`sectors.tccc.options.${optionType}.custom`, { ns: 'training' })
  }
  if (key) return formatTcccOptionLabel(optionType, key, key)
  const label =
    field === 'injuryType'
      ? getTcccInjuryType(row)
      : field === 'tcccPhase'
        ? getTcccPhase(row)
        : getTcccTourniquetLocation(row)
  if (!label || label === '—') return '—'
  if (label.startsWith('custom:')) {
    return label.slice(7).trim() || i18n.t(`sectors.tccc.options.${optionType}.custom`, { ns: 'training' })
  }
  return label
}

/** @param {Record<string, unknown>} row */
export function formatTcccCasualtyTypeDisplay(row) {
  const key = String(row.casualtyTypeKey ?? '').trim()
  if (key) return formatTcccOptionLabel('casualtyType', key, key)
  const stored = String(row.casualtyType ?? '').trim()
  return stored || '—'
}

/** @param {Record<string, unknown>} row */
export function formatTcccOutcomeDisplay(row) {
  const key = String(row.outcomeKey ?? '').trim()
  if (key) return formatTcccOptionLabel('outcome', key, key)
  const stored = String(row.outcome ?? '').trim()
  return stored || '—'
}

/** @param {Record<string, unknown>} row */
export function formatTcccProcedurePerformedDisplay(row) {
  const procList = Array.isArray(row.proceduresPerformed)
    ? row.proceduresPerformed.map((id) => String(id ?? '').trim()).filter(Boolean)
    : []
  if (procList.length > 0) {
    return procList.map((id) => formatTcccProcedureLabel(id)).join(' · ')
  }
  const parts = []
  if (getTcccTourniquetApplied(row)) parts.push(formatTcccProcedureLabel('tourniquet'))
  if (getTcccWoundPacking(row)) parts.push(formatTcccProcedureLabel('bandage'))
  if (getTcccNpaInserted(row)) parts.push(formatTcccProcedureLabel('airway'))
  if (row.chestSealApplied) parts.push(i18n.t('sectors.tccc.report.march.chestSeal', { ns: 'training' }))
  if (row.needleDecompression) {
    parts.push(i18n.t('sectors.tccc.report.march.needleDecompression', { ns: 'training' }))
  }
  if (row.hypothermiaBlanket) {
    parts.push(i18n.t('sectors.tccc.report.march.hypothermiaBlanket', { ns: 'training' }))
  }
  return parts.length > 0 ? parts.join(' · ') : '—'
}

/**
 * @param {Record<string, unknown>} row
 * @returns {{ step: string; items: string[] }[]}
 */
export function formatTcccMarchSectionsDisplay(row) {
  const tqLoc = formatTcccSelectFieldDisplay(row, 'tourniquetLocation')
  /** @type {{ step: string; items: string[] }[]} */
  const sections = []

  /** @type {string[]} */
  const mItems = []
  if (getTcccTourniquetApplied(row)) {
    const tq = formatTcccProcedureLabel('tourniquet')
    mItems.push(tqLoc && tqLoc !== '—' ? `${tq} · ${tqLoc}` : tq)
  }
  if (getTcccWoundPacking(row)) {
    mItems.push(i18n.t('sectors.tccc.report.march.woundPacking', { ns: 'training' }))
  }
  if (mItems.length) sections.push({ step: 'M', items: mItems })

  /** @type {string[]} */
  const aItems = []
  if (getTcccNpaInserted(row)) {
    aItems.push(i18n.t('sectors.tccc.report.march.npaAirway', { ns: 'training' }))
  }
  if (aItems.length) sections.push({ step: 'A', items: aItems })

  /** @type {string[]} */
  const rItems = []
  if (getTcccChestSealApplied(row)) {
    rItems.push(i18n.t('sectors.tccc.report.march.ventedChestSeal', { ns: 'training' }))
  }
  if (getTcccNeedleDecompression(row)) {
    rItems.push(i18n.t('sectors.tccc.report.march.needleDecompression', { ns: 'training' }))
  }
  if (rItems.length) sections.push({ step: 'R', items: rItems })

  /** @type {string[]} */
  const hItems = []
  if (getTcccHypothermiaBlanket(row)) {
    hItems.push(i18n.t('sectors.tccc.report.march.hypothermiaBlanket', { ns: 'training' }))
  }
  if (hItems.length) sections.push({ step: 'H', items: hItems })

  return sections
}

/** @param {Record<string, unknown>} row */
export function formatTcccAppliedTreatmentsDisplay(row) {
  const summary = invStr(row.appliedTreatmentsSummary).trim()
  if (summary) {
    const localized = summary
      .split(' · ')
      .map((part) => {
        const trimmed = part.trim()
        const proc = PROCEDURE_PERFORMED_OPTIONS.find((o) => o.label === trimmed)
        if (proc) return formatTcccProcedureLabel(proc.id)
        return trimmed
      })
      .filter(Boolean)
    if (localized.length > 0) return localized.join(' · ')
  }

  const marchSections = formatTcccMarchSectionsDisplay(row)
  const marchLabels = marchSections.flatMap((section) => section.items)
  const procedureDisplay = formatTcccProcedurePerformedDisplay(row)
  const procedureParts =
    procedureDisplay && procedureDisplay !== '—'
      ? procedureDisplay.split(' · ').map((part) => part.trim()).filter(Boolean)
      : []
  const merged = [...new Set([...procedureParts, ...marchLabels])]
  return merged.length > 0 ? merged.join(' · ') : '—'
}

/** @param {Record<string, unknown>} row */
export function formatTcccOperationNoteDisplay(row) {
  const note = getTcccOperationNote(row)
  if (note === 'Operasyon notu kayıtlı değil.') {
    return i18n.t('sectors.tccc.history.detail.noOperationNote', { ns: 'training' })
  }
  return note
}

/**
 * @param {{ tcccPhaseKey?: string }} filters
 */
export function formatTcccFilterSummaryDisplay(filters) {
  if (filters.tcccPhaseKey && filters.tcccPhaseKey !== 'ALL') {
    return i18n.t('sectors.tccc.history.filterSummary.phase', {
      ns: 'training',
      value: filters.tcccPhaseKey,
    })
  }
  return ''
}

/** @param {Record<string, unknown>} row */
export function formatTcccObservedEvalDateDisplay(row) {
  const ms = observedEvalTimestampMs(row)
  if (!ms) return '—'
  return new Date(ms).toLocaleString(trainingLocale(), {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** @param {Record<string, unknown>} row */
export function formatTcccObservedEvalTypeLabel(row) {
  if (String(row?.type ?? '') !== OBSERVED_EVAL_TYPE) return '—'
  return isUnverifiedObservedEval(row)
    ? i18n.t('sectors.tccc.observedEval.registry.badgeUnverified', { ns: 'training' })
    : i18n.t('sectors.tccc.observedEval.registry.badgeVerified', { ns: 'training' })
}

/** @typedef {'trainingFocus' | 'difficultyLevel'} EgitimOptionType */

/**
 * @param {EgitimOptionType} optionType
 * @param {string} optionId
 * @param {string} [fallback]
 */
export function formatEgitimOptionLabel(optionType, optionId, fallback = '') {
  const id = String(optionId || '').trim()
  if (!id) return fallback || '—'
  if (id === EGITIM_CUSTOM) return i18n.t(`sectors.egitim.options.${optionType}.custom`, { ns: 'training' })
  const key = `sectors.egitim.options.${optionType}.${id}`
  if (i18n.exists(key, { ns: 'training' })) {
    return i18n.t(key, { ns: 'training' })
  }
  return fallback || id
}

/** @param {string | null | undefined} reasonKey */
export function formatEgitimSubmitBlockedReason(reasonKey) {
  if (!reasonKey) return null
  const map = {
    OTURUM_GEREKLİ: 'sessionRequired',
    EĞİTİM_ODAĞI_GEREKLİ: 'trainingFocusRequired',
    ÖZEL_EĞİTİM_ODAĞI_GEREKLİ: 'customTrainingFocusRequired',
    ZORLUK_SEVİYESİ_GEREKLİ: 'difficultyRequired',
    HEDEF_TARİH_GEREKLİ: 'targetDateRequired',
    TAHMİNİ_SÜRE_GEREKLİ: 'estimatedDurationRequired',
  }
  const mapped = map[reasonKey]
  if (mapped) {
    return i18n.t(`sectors.egitim.validation.${mapped}`, { ns: 'training' })
  }
  return reasonKey
}

/**
 * @param {string} errorKey
 * @param {string} [code]
 */
export function formatEgitimSubmitError(errorKey, code = '') {
  const hint =
    code === 'permission-denied'
      ? i18n.t('sectors.egitim.validation.permissionDenied', { ns: 'training' })
      : code
        ? ` · ${code}`
        : ''
  if (errorKey === 'SUBMIT_FAILED') {
    return i18n.t('sectors.egitim.messages.submitFailed', { ns: 'training', hint })
  }
  return errorKey
}

/** @param {string} status */
export function formatEgitimStatusDisplay(status) {
  const s = String(status || '').trim().toLowerCase()
  const map = {
    planned: 'planned',
    active: 'active',
    in_progress: 'active',
    completed: 'completed',
    done: 'completed',
    cancelled: 'cancelled',
  }
  const key = map[s]
  if (key) return i18n.t(`sectors.egitim.status.${key}`, { ns: 'training' })
  if (s) return s.toUpperCase()
  return '—'
}

/** @param {Record<string, unknown>} row */
export function formatEgitimDateCellDisplay(row) {
  const label = String(row.targetDateLabel ?? '').trim()
  if (label) return label
  const ms = getEgitimPlanTimestampMs(row)
  if (!ms) return '—'
  return new Date(ms).toLocaleString(trainingLocale(), {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

/** @param {Record<string, unknown>} row */
export function formatEgitimDurationDisplay(row) {
  const n = invNum(row.estimatedDurationMin)
  if (n > 0) {
    return i18n.t('sectors.egitim.history.durationMinutes', { ns: 'training', count: Math.round(n) })
  }
  const label = String(row.estimatedDuration ?? '').trim()
  return label || '—'
}

/** @param {Record<string, unknown>} row */
export function formatEgitimTrainingFocusDisplay(row) {
  const key = String(row.trainingFocusKey || row.discipline || '').trim()
  const custom = String(row.customTrainingFocus || '').trim()
  if (key === EGITIM_CUSTOM) {
    return custom || i18n.t('sectors.egitim.options.trainingFocus.customFocus', { ns: 'training' })
  }
  if (key.startsWith('custom:')) {
    return key.slice(7).trim() || i18n.t('sectors.egitim.options.trainingFocus.customFocus', { ns: 'training' })
  }
  if (key) return formatEgitimOptionLabel('trainingFocus', key, key)
  const label = String(row.trainingFocus || row.title || '').trim()
  return label || '—'
}

/** @param {Record<string, unknown>} row */
export function formatEgitimDifficultyDisplay(row) {
  const key = String(row.difficultyLevelKey || '').trim()
  if (key) return formatEgitimOptionLabel('difficultyLevel', key, key)
  const label = String(row.difficultyLevel || '').trim()
  return label || '—'
}

/** @param {Record<string, unknown>} row */
export function formatEgitimOperationNoteDisplay(row) {
  const note = getEgitimOperationNote(row)
  if (note === 'Eğitim hedefi / not kayıtlı değil.') {
    return i18n.t('sectors.egitim.history.detail.noOperationNote', { ns: 'training' })
  }
  return note
}

/** @param {Record<string, unknown>} row */
export function formatEgitimPlanKindLabel(row) {
  return isEgitimSandboxPlan(row)
    ? i18n.t('sectors.egitim.history.planKind.sandbox', { ns: 'training' })
    : i18n.t('sectors.egitim.history.planKind.plan', { ns: 'training' })
}

/** @param {boolean} value */
export function formatEgitimBoolDisplay(value) {
  return i18n.t(`sectors.egitim.history.bool.${value ? 'yes' : 'no'}`, { ns: 'training' })
}

/** @param {boolean} upcoming */
export function formatEgitimScheduleLabel(upcoming) {
  return i18n.t(`sectors.egitim.history.scheduleLabel.${upcoming ? 'upcoming' : 'past'}`, { ns: 'training' })
}

/** @param {number} count */
export function formatEgitimLogisticsObjectsDisplay(count) {
  return i18n.t('sectors.egitim.history.logisticsObjects', { ns: 'training', count })
}

/**
 * @param {string} errorKey
 * @param {string} [code]
 */
export function formatEgitimSandboxSaveError(errorKey, code = '') {
  const hint = code ? ` · ${code}` : ''
  const map = {
    HEDEF_TARİH_GEREKLİ: 'targetDateRequired',
    ZORLUK_SEVİYESİ_GEREKLİ: 'difficultyRequired',
    EN_AZ_BİR_NESNE_GEREKLİ: 'minOneObjectRequired',
    DEĞİŞİKLİK_KAYDI_BAŞARISIZ: 'saveChangesFailed',
    SENARYO_KAYIT_BAŞARISIZ: 'scenarioSaveFailed',
  }
  const mapped = map[errorKey]
  if (mapped === 'saveChangesFailed' || mapped === 'scenarioSaveFailed') {
    return i18n.t(`sectors.egitim.sandbox.messages.${mapped}`, { ns: 'training', hint })
  }
  if (mapped) {
    return i18n.t(`sectors.egitim.sandbox.validation.${mapped}`, { ns: 'training' })
  }
  return errorKey
}

/** @param {'green_low' | 'amber_medium' | 'red_hardcore' | string} riskLevel */
export function formatEgitimSandboxRiskLabel(riskLevel) {
  const map = {
    green_low: 'low',
    amber_medium: 'medium',
    red_hardcore: 'high',
  }
  const key = map[riskLevel]
  if (key) return i18n.t(`sectors.egitim.sandbox.risk.${key}`, { ns: 'training' })
  return String(riskLevel || '—')
}

/** @param {string} groupId @param {string} [fallback] */
export function formatEgitimSandboxAssetGroupTitle(groupId, fallback = '') {
  const key = `sectors.egitim.sandbox.assets.groups.${groupId}`
  if (i18n.exists(key, { ns: 'training' })) return i18n.t(key, { ns: 'training' })
  return fallback || groupId
}

/**
 * @param {string} type
 * @param {'label' | 'shortLabel'} field
 * @param {string} [fallback]
 */
export function formatEgitimSandboxAssetLabel(type, field, fallback = '') {
  const key = `sectors.egitim.sandbox.assets.items.${type}.${field}`
  if (i18n.exists(key, { ns: 'training' })) return i18n.t(key, { ns: 'training' })
  return fallback || type
}

/**
 * @param {string} type
 * @param {string} [storedLabel]
 */
export function resolveSandboxPlacedObjectLabel(type, storedLabel = '') {
  const def = getRangeAssetDef(type)
  if (!def) return String(storedLabel || '').trim()
  const stored = String(storedLabel || '').trim()
  if (!stored || stored === def.label) {
    return formatEgitimSandboxAssetLabel(type, 'label', def.label)
  }
  const enLabel = i18n.t(`sectors.egitim.sandbox.assets.items.${type}.label`, {
    ns: 'training',
    lng: 'en',
    defaultValue: def.label,
  })
  const trLabel = i18n.t(`sectors.egitim.sandbox.assets.items.${type}.label`, {
    ns: 'training',
    lng: 'tr',
    defaultValue: def.label,
  })
  if (stored === enLabel || stored === trLabel) {
    return formatEgitimSandboxAssetLabel(type, 'label', def.label)
  }
  return stored
}

/**
 * @param {import('./rangeLayoutMetrics').CanvasLayoutObject} obj
 */
export function localizeSandboxCanvasObject(obj) {
  return {
    ...obj,
    label: resolveSandboxPlacedObjectLabel(obj.type, obj.label),
  }
}

/** @param {string} toolId */
export function formatEgitimSandboxToolLabel(toolId) {
  const key = `sectors.egitim.sandbox.toolbar.tools.${toolId}`
  if (i18n.exists(key, { ns: 'training' })) return i18n.t(key, { ns: 'training' })
  return toolId
}

/** @param {string} arrowType */
export function formatEgitimSandboxArrowTypeLabel(arrowType) {
  const key = `sectors.egitim.sandbox.arrowTypes.${arrowType}`
  if (i18n.exists(key, { ns: 'training' })) return i18n.t(key, { ns: 'training' })
  return arrowType
}

/**
 * @param {{
 *   activeTool: string
 *   strokeWidth?: number
 *   selectedArrowType?: string
 *   activeBrushLabel?: string
 *   zoom?: number
 * }} params
 */
export function formatEgitimSandboxStatusBar(params) {
  const { activeTool, strokeWidth = 2, selectedArrowType = 'infiltration', activeBrushLabel = '', zoom = 1 } = params
  let main = i18n.t('sectors.egitim.sandbox.statusBar.toolFallback', { ns: 'training' })

  if (['line', 'circle', 'triangle', 'rectangle'].includes(activeTool)) {
    main = i18n.t('sectors.egitim.sandbox.statusBar.drawMode', {
      ns: 'training',
      tool: activeTool.toUpperCase(),
      width: strokeWidth,
    })
  } else if (activeTool === 'arrow') {
    main = i18n.t('sectors.egitim.sandbox.statusBar.arrowDraw', {
      ns: 'training',
      type: formatEgitimSandboxArrowTypeLabel(selectedArrowType).toUpperCase(),
    })
  } else if (activeTool === 'eraser') {
    main = i18n.t('sectors.egitim.sandbox.statusBar.eraser', { ns: 'training' })
  } else if (activeTool === 'marquee') {
    main = i18n.t('sectors.egitim.sandbox.statusBar.marquee', { ns: 'training' })
  } else if (activeTool === 'select') {
    const assetSuffix = activeBrushLabel
      ? i18n.t('sectors.egitim.sandbox.statusBar.selectAsset', { ns: 'training', label: activeBrushLabel })
      : ''
    main = i18n.t('sectors.egitim.sandbox.statusBar.select', { ns: 'training', assetSuffix })
  }

  return (
    main +
    i18n.t('sectors.egitim.sandbox.statusBar.zoomPan', {
      ns: 'training',
      zoom: Math.round(zoom * 100),
    })
  )
}

/** @typedef {'open' | 'closed_for_me' | 'completed'} GroupTrainingSessionKey */

/** @param {unknown} ts */
export function formatGroupTrainingDateDisplay(ts) {
  const ms = timestampToMs(ts)
  if (!ms) return '—'
  return new Intl.DateTimeFormat(trainingLocale(), {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(ms))
}

/**
 * @param {string | undefined} statusResult
 * @param {boolean} [isPassed]
 */
export function formatGroupTrainingAssessmentLabel(statusResult, isPassed = false) {
  if (isPassed || statusResult === 'BAŞARILI') {
    return i18n.t('sectors.grup-egitimi.assessment.passed', { ns: 'training' })
  }
  if (statusResult === 'SÜRE İHLALİ') {
    return i18n.t('sectors.grup-egitimi.assessment.timeFailed', { ns: 'training' })
  }
  return i18n.t('sectors.grup-egitimi.assessment.failed', { ns: 'training' })
}

/** @param {GroupTrainingSessionKey} key */
export function formatGroupTrainingSessionStatusDisplay(key) {
  return {
    label: i18n.t(`sectors.grup-egitimi.sessionStatus.${key}.label`, { ns: 'training' }),
    hint: i18n.t(`sectors.grup-egitimi.sessionStatus.${key}.hint`, { ns: 'training' }),
  }
}

/**
 * @param {{
 *   hits: number
 *   total: number
 *   isTimed?: boolean
 *   time?: number | null
 *   targetTimeSec?: number | null
 * }} params
 */
export function formatGroupTrainingHitsSummary(params) {
  const { hits, total, isTimed = false, time = null, targetTimeSec = null } = params
  if (isTimed && time != null && targetTimeSec != null) {
    return i18n.t('sectors.grup-egitimi.detail.hitsLineWithTarget', {
      ns: 'training',
      hits,
      total,
      time,
      target: targetTimeSec,
    })
  }
  if (isTimed && time != null) {
    return i18n.t('sectors.grup-egitimi.detail.hitsLineTimed', {
      ns: 'training',
      hits,
      total,
      time,
    })
  }
  return i18n.t('sectors.grup-egitimi.detail.hitsLine', { ns: 'training', hits, total })
}

/**
 * @param {boolean} isTimed
 * @param {number | null | undefined} time
 */
export function formatGroupTrainingAlertTimePart(isTimed, time) {
  if (isTimed && time != null) {
    return i18n.t('sectors.grup-egitimi.alerts.timePart', { ns: 'training', time })
  }
  return ''
}

/**
 * @param {'sessionExpired' | 'alreadySubmitted' | 'hitsRange' | 'submitFailed'} key
 * @param {{ max?: number }} [params]
 */
export function formatGroupTrainingValidationMessage(key, params = {}) {
  return i18n.t(`sectors.grup-egitimi.validation.${key}`, { ns: 'training', ...params })
}
