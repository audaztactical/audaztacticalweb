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
import { formatMeteoOverviewRows } from './meteoDataCapture'

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
