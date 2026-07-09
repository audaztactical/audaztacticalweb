import i18n from '../i18n'
import { formatTrainingCategoryTitle } from './trainingDisplayText.js'
import { humanizeOrsPenaltyCode } from './dashboardDisplayText.js'

const NS = 'progress'

/** @returns {'tr-TR' | 'en-US'} */
export function progressLocale() {
  return i18n.language?.startsWith('tr') ? 'tr-TR' : 'en-US'
}

/**
 * @param {string} key
 * @param {Record<string, unknown>} [params]
 */
export function progressT(key, params) {
  return i18n.t(key, { ns: NS, ...(params ?? {}) })
}

/** @type {import('./progressAnalytics.js').DisciplineFilter[]} */
export const PROGRESS_DISCIPLINE_IDS = ['all', 'atis', 'cqb', 'tccc', 'fof', 'vbss']

/**
 * Filter dropdown options — labels from progress.filters.disciplines.*
 * @returns {{ id: import('./progressAnalytics.js').DisciplineFilter; label: string }[]}
 */
export function getProgressDisciplineOptions() {
  return PROGRESS_DISCIPLINE_IDS.map((id) => ({
    id,
    label: progressT(`filters.disciplines.${id}`),
  }))
}

/**
 * @param {import('./progressAnalytics.js').DisciplineFilter} discipline
 * @param {string} subTopicId
 * @param {string} [fallback] — dynamic Firestore topic labels when key is missing
 */
export function labelProgressSubTopic(discipline, subTopicId, fallback) {
  const key = `filters.subTopics.${discipline}.${subTopicId}`
  const translated = progressT(key)
  if (translated && translated !== key) return translated
  if (fallback != null && String(fallback).length > 0) return String(fallback)
  return progressT('filters.allTasks')
}

/**
 * Map machine tag (ATIS/CQB/…) to compact display label for chips/feed.
 * Uses progress.disciplineTags (short codes) for layout safety.
 * Filter dropdowns use filters.disciplines.* / training sector titles separately.
 * @param {string} tag
 */
export function formatProgressDisciplineTag(tag) {
  const upper = String(tag ?? '').toUpperCase() || 'OTHER'
  return progressT(`disciplineTags.${upper}`, { defaultValue: upper })
}

/**
 * Longer sector title aligned with Training page (ATIŞ / Marksmanship, …).
 * @param {string} tag
 */
export function formatProgressDisciplineSectorTitle(tag) {
  const upper = String(tag ?? '').toUpperCase()
  const sectorId =
    upper === 'ATIS'
      ? 'atis'
      : upper === 'CQB'
        ? 'cqb'
        : upper === 'FOF'
          ? 'fof'
          : upper === 'VBSS'
            ? 'vbss'
            : upper === 'TCCC'
              ? 'tccc'
              : ''
  if (sectorId) {
    const fromTraining = formatTrainingCategoryTitle(sectorId)
    if (fromTraining) return fromTraining
  }
  return formatProgressDisciplineTag(tag)
}

/**
 * @param {import('./progressAnalytics.js').TimeframeFilter} id
 */
export function labelProgressTimeframe(id) {
  return progressT(`filters.timeframes.${id}`)
}

/**
 * @param {'MATRIX' | 'RADAR' | 'WAVE' | 'TCCC' | 'TREND'} panelId
 */
export function labelHudPanelTitle(panelId) {
  return progressT(`hud.panels.${panelId}`)
}

/**
 * Humanize TRANSMISSION OK/FAILURE tokens in feed titles.
 * @param {string} title
 */
export function humanizeProgressFeedTitle(title) {
  return String(title ?? '')
    .replace(/\s·\sTRANSMISSION OK\b/gi, ` · ${progressT('activityFeed.transmissionOk')}`)
    .replace(/\bTRANSMISSION OK\b/gi, progressT('activityFeed.transmissionOk'))
    .replace(/\bTRANSMISSION FAILURE\b/gi, progressT('activityFeed.transmissionFailure'))
}

/**
 * TCCC threshold banner — reuses dashboard penalty code humanization.
 * @param {string} [abbrev]
 */
export function formatTcccOrsPenaltyBanner(abbrev) {
  const code = humanizeOrsPenaltyCode('TCCC EŞİK ALTINDA')
  const abbr =
    abbrev ||
    i18n.t('ors.abbrev', { ns: 'dashboard', defaultValue: i18n.language?.startsWith('tr') ? 'OHP' : 'ORS' })
  return progressT('orsHud.tcccPenaltyBanner', { code, abbrev: abbr })
}

export { humanizeOrsPenaltyCode }
