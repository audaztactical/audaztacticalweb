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
