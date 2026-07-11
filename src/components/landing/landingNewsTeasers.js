import i18n from '../../i18n'
import {
  defaultShowTurkishForIntelItem,
  pickIntelFeedSummary,
  pickIntelFeedTitle,
} from '../../lib/intelDisplayText'

/** @typedef {{ id: string, title: string, source: string, teaser: string, live?: boolean }} NewsTeaser */

/**
 * @returns {NewsTeaser[]}
 */
export function getLandingNewsTeasers() {
  return [
    {
      id: 'teaser-1',
      title: i18n.t('teasers.t1.title', { ns: 'landing' }),
      source: i18n.t('teasers.t1.source', { ns: 'landing' }),
      teaser: i18n.t('teasers.t1.body', { ns: 'landing' }),
    },
    {
      id: 'teaser-2',
      title: i18n.t('teasers.t2.title', { ns: 'landing' }),
      source: i18n.t('teasers.t2.source', { ns: 'landing' }),
      teaser: i18n.t('teasers.t2.body', { ns: 'landing' }),
    },
    {
      id: 'teaser-3',
      title: i18n.t('teasers.t3.title', { ns: 'landing' }),
      source: i18n.t('teasers.t3.source', { ns: 'landing' }),
      teaser: i18n.t('teasers.t3.body', { ns: 'landing' }),
    },
  ]
}

/** @deprecated Prefer getLandingNewsTeasers() for language-aware placeholders */
export const LANDING_NEWS_TEASERS = getLandingNewsTeasers()

/** @typedef {'syncing' | 'live' | 'teaser'} FeedStatus */

/**
 * @param {import('../../lib/firestoreIntelFeed').IntelFeedItem} item
 * @param {string} [language]
 * @returns {NewsTeaser}
 */
export function intelItemToTeaser(item, language = i18n.language) {
  const showTurkish = defaultShowTurkishForIntelItem(item, language)

  return {
    id: item.id,
    title: pickIntelFeedTitle(item, showTurkish) || i18n.t('card.noTitle', { ns: 'intel' }),
    source: item.source || i18n.t('news.defaultSource', { ns: 'landing' }),
    teaser: pickIntelFeedSummary(item, showTurkish) || i18n.t('card.noSummary', { ns: 'intel' }),
    live: true,
  }
}

/**
 * @param {NewsTeaser[]} live
 * @returns {NewsTeaser[]}
 */
export function mergeNewsTeasers(live) {
  const merged = [...live]
  for (const placeholder of getLandingNewsTeasers()) {
    if (merged.length >= 3) break
    merged.push(placeholder)
  }
  return merged.slice(0, 3)
}

/**
 * @param {FeedStatus} status
 */
export function feedStatusLabel(status) {
  if (status === 'syncing') return i18n.t('news.statusSyncing', { ns: 'landing' })
  if (status === 'live') return i18n.t('news.statusLive', { ns: 'landing' })
  return i18n.t('news.statusTeaser', { ns: 'landing' })
}
