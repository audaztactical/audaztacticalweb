import i18n from '../../i18n'
import {
  defaultShowTurkishForIntelItem,
  pickIntelFeedSummary,
  pickIntelFeedTitle,
} from '../../lib/intelDisplayText'

/** @typedef {{ id: string, title: string, source: string, teaser: string, live?: boolean }} NewsTeaser */

/** @type {NewsTeaser[]} */
export const LANDING_NEWS_TEASERS = [
  {
    id: 'teaser-1',
    title: 'Bölgesel Güvenlik Dinamikleri — Sınır Hattı Özeti',
    source: 'HABER · Küresel Haber Ağı',
    teaser:
      'Açık kaynak sinyalleri, sınır bölgelerinde artan hareketliliğe işaret ediyor. Tam analiz ve coğrafi bağlam üyelere özel.',
  },
  {
    id: 'teaser-2',
    title: 'Siber Tehdit Vektörü — Kritik Altyapı Taraması',
    source: 'HABER · Tehdit Matrisi',
    teaser:
      'Son 72 saatte raporlanan IDS uyarıları düşük yoğunlukta. Derinlemesine paket analizi ve IOC listesi platform içinde.',
  },
  {
    id: 'teaser-3',
    title: 'Deniz Hattı Operasyonları — Açık Kaynak Görüntüleme',
    source: 'HABER · Deniz Gözetim',
    teaser:
      'Uydu ve AIS kaynaklarından derlenen ön izleme. Tam rota reconstrüksiyonu ve operasyonel brifing üyelik gerektirir.',
  },
]

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
    source: item.source || 'HABER · Küresel Haber Ağı',
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
  for (const placeholder of LANDING_NEWS_TEASERS) {
    if (merged.length >= 3) break
    merged.push(placeholder)
  }
  return merged.slice(0, 3)
}

/**
 * @param {FeedStatus} status
 */
export function feedStatusLabel(status) {
  if (status === 'syncing') return 'SENKRONIZE EDİLİYOR'
  if (status === 'live') return 'VERI AKIŞI AKTİF'
  return 'HABER TEASER MODU'
}
