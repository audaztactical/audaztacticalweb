import i18n from '../i18n'
import { formatAtisDrillLabel } from './trainingDisplayText'

const NS = 'instructor'

/** @returns {'tr-TR' | 'en-US'} */
export function instructorLocale() {
  return i18n.language?.startsWith('tr') ? 'tr-TR' : 'en-US'
}

/**
 * @param {string} key
 * @param {Record<string, unknown>} [params]
 */
export function instructorT(key, params = {}) {
  return i18n.t(key, { ns: NS, ...params })
}

/** English preset drill name → ATIS drill id (training.json) */
const PRESET_DRILL_NAME_TO_ID = {
  'draw & first shot': 'l1-draw-first',
  'double tap': 'l1-double-tap',
  'ready position': 'l1-ready',
  'reload drills': 'l2-reload',
  'rifle to pistol transition': 'l2-rifle-pistol',
  'malfunction clearance': 'l2-malfunction',
  'mozambique drill': 'l3-mozambique',
  'multi target transition': 'l3-multi-target',
  'multi-target transition': 'l3-multi-target',
}

/**
 * Display drill name — reuse training ATIS labels when preset matches.
 * @param {string | null | undefined} rawName
 * @param {string | null | undefined} [drillId]
 */
export function formatInstructorDrillName(rawName, drillId) {
  const id = String(drillId ?? '').trim()
  if (id && !id.startsWith('preset:')) {
    const fromId = formatAtisDrillLabel(id)
    if (fromId && fromId !== id) return fromId
  }

  const name = String(rawName ?? '').trim()
  if (!name) return instructorT('common.emDash')

  const mapped = PRESET_DRILL_NAME_TO_ID[name.toLowerCase()]
  if (mapped) {
    const label = formatAtisDrillLabel(mapped)
    if (label && label !== mapped) return label
  }

  // preset:level:slug → try slug match
  if (id.startsWith('preset:')) {
    const slug = id.split(':').pop() || ''
    for (const [en, atisId] of Object.entries(PRESET_DRILL_NAME_TO_ID)) {
      const enSlug = en.replace(/[^a-z0-9]+/g, '-')
      if (slug === enSlug || slug.includes(enSlug)) {
        const label = formatAtisDrillLabel(atisId)
        if (label && label !== atisId) return label
      }
    }
  }

  return name
}

/**
 * @param {string} discipline
 */
export function labelInstructorDiscipline(discipline) {
  const id = String(discipline ?? '').toLowerCase()
  const key = `disciplines.${id}`
  const translated = instructorT(key)
  return translated === key ? id.toUpperCase() : translated
}

/**
 * @param {string} sourceKey
 */
export function labelInstructorSource(sourceKey) {
  const key = `sources.${sourceKey}`
  const translated = instructorT(key)
  return translated === key ? sourceKey : translated
}

/**
 * @param {unknown} ts
 */
export function formatInstructorDateTime(ts) {
  const locale = instructorLocale()
  if (ts && typeof ts === 'object' && 'toDate' in ts && typeof /** @type {{ toDate?: () => Date }} */ (ts).toDate === 'function') {
    return /** @type {{ toDate: () => Date }} */ (ts).toDate().toLocaleString(locale, {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  }
  const ms = Date.parse(String(ts ?? ''))
  if (!ms) return instructorT('common.emDash')
  return new Date(ms).toLocaleString(locale, { dateStyle: 'short', timeStyle: 'short' })
}

/**
 * @param {unknown} ts
 */
export function resolveInstructorTimestampMs(ts) {
  if (ts && typeof ts === 'object' && 'toMillis' in ts && typeof /** @type {{ toMillis?: () => number }} */ (ts).toMillis === 'function') {
    return /** @type {{ toMillis: () => number }} */ (ts).toMillis()
  }
  if (ts && typeof ts === 'object' && 'toDate' in ts && typeof /** @type {{ toDate?: () => Date }} */ (ts).toDate === 'function') {
    return /** @type {{ toDate: () => Date }} */ (ts).toDate().getTime()
  }
  return Date.parse(String(ts ?? '')) || 0
}
