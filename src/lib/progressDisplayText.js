import i18n from '../i18n'
import {
  formatAtisDrillNameDisplay,
  formatCqbOptionLabel,
  formatCqbSelectFieldDisplay,
  formatCqbTacticalErrorLabel,
  formatFofSelectFieldDisplay,
  formatFofTacticalErrorLabel,
  formatTrainingCategoryTitle,
  formatVbssSelectFieldDisplay,
} from './trainingDisplayText.js'
import { humanizeOrsPenaltyCode } from './dashboardDisplayText.js'
import { invStr } from './inventoryIlws.js'

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

/**
 * CQB feed/title line — same field helpers as CQB registry / PDF (never raw TR drillName).
 * @param {Record<string, unknown>} row
 */
export function formatCqbActivityTitle(row) {
  const teamRaw = invStr(row.teamSize).trim()
  let team = ''
  if (teamRaw && teamRaw !== '—') {
    const teamId =
      ['1-Man', '2-Man', '3-Man', '4-Man Team'].find((id) => id === teamRaw) ||
      (teamRaw.match(/^[1-4]/) ? `${teamRaw.match(/^[1-4]/)?.[0]}-Man` : '')
    team = teamId
      ? formatCqbOptionLabel('teamSize', teamId === '4' ? '4-Man Team' : teamId.includes('Man') ? teamId : `${teamId}-Man`, teamRaw)
      : formatCqbOptionLabel('teamSize', teamRaw, teamRaw)
  }
  const parts = [
    formatCqbSelectFieldDisplay(row, 'roomTopology'),
    formatCqbSelectFieldDisplay(row, 'entryMethod'),
    formatCqbSelectFieldDisplay(row, 'breachingType'),
    team,
  ].filter((p) => p && p !== '—')
  return parts.join(' · ') || progressT('activityTitles.drillFallbacks.cqb')
}

/**
 * @param {Record<string, unknown>} row
 */
export function formatFofActivityTitle(row) {
  const scenario = formatFofSelectFieldDisplay(row, 'scenarioType')
  const sim = formatFofSelectFieldDisplay(row, 'simSystem')
  const parts = [scenario, sim].filter((p) => p && p !== '—')
  return parts.join(' · ') || progressT('activityTitles.drillFallbacks.fof')
}

/**
 * @param {Record<string, unknown>} row
 */
export function formatVbssActivityTitle(row) {
  const vessel = formatVbssSelectFieldDisplay(row, 'vesselType')
  const insertion = formatVbssSelectFieldDisplay(row, 'insertionMethod')
  const parts = [vessel, insertion].filter((p) => p && p !== '—')
  return parts.join(' · ') || progressT('activityTitles.drillFallbacks.vbss')
}

/**
 * @param {Record<string, unknown>} row
 */
export function formatAtisActivityTitle(row) {
  return formatAtisDrillNameDisplay(row) || progressT('activityTitles.drillFallbacks.atis', {
    defaultValue: 'ATIS DRILL',
  })
}

/**
 * Route tactical error IDs through training i18n (not cqbOptions TR presets).
 * @param {string} errorId
 * @param {string} [disciplineTag]
 */
export function formatProgressTacticalErrorLabel(errorId, disciplineTag = '') {
  const id = String(errorId ?? '').trim()
  if (!id) return '—'
  const tag = String(disciplineTag ?? '').toUpperCase()
  if (tag === 'FOF') return formatFofTacticalErrorLabel(id)
  return formatCqbTacticalErrorLabel(id)
}
