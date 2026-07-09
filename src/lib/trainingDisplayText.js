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
  const note = getAtisOperationNote(row)
  if (note === 'Operasyon notu kayıtlı değil.') {
    return i18n.t('sectors.atis.history.detail.noOperationNote', { ns: 'training' })
  }
  return note
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
  const label = String(row.tacticalDecisionLabel ?? '').trim()
  if (label) return label
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
  const storedLabel = String(row[field] ?? '').trim()
  if (storedLabel && storedLabel !== 'Özel' && storedLabel !== '—') return storedLabel
  const keyField = `${field}Key`
  const key = String(row[keyField] ?? row[field] ?? '').trim()
  const customField = CQB_CUSTOM_FIELD_MAP[field]
  const custom = customField ? String(row[customField] ?? '').trim() : ''
  if (key === CQB_CUSTOM) {
    return custom || i18n.t('sectors.cqb.errors.customPhase', { ns: 'training' })
  }
  if (!key) return '—'
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
  const label = String(row.engagementTypeLabel ?? '').trim()
  if (label) return label
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
  const storedLabel = String(row[field] ?? '').trim()
  if (storedLabel && storedLabel !== 'Özel' && storedLabel !== '—') return storedLabel
  const keyField = `${field}Key`
  const key = String(row[keyField] ?? row[field] ?? '').trim()
  const customField = FOF_CUSTOM_FIELD_MAP[field]
  const custom = customField ? String(row[customField] ?? '').trim() : ''
  if (key === FOF_CUSTOM) {
    return custom || i18n.t('sectors.fof.options.scenarioType.custom', { ns: 'training' })
  }
  if (!key) return '—'
  return formatFofOptionLabel(field, key, key)
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
  const label =
    field === 'insertionMethod'
      ? getVbssInsertionMethod(row)
      : field === 'vesselType'
        ? getVbssVesselType(row)
        : getVbssSeaState(row)
  if (!label || label === '—') return '—'
  if (label.startsWith('custom:')) {
    return label.slice(7).trim() || i18n.t('sectors.vbss.options.boardingPoint.custom', { ns: 'training' })
  }
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
  const key = String(row[keyField] ?? '').trim()
  if (key && key !== VBSS_CUSTOM) {
    return formatVbssOptionLabel(optionType, key, label)
  }
  return label
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
