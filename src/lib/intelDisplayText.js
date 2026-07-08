import i18n from '../i18n'
import { timestampToMs } from './firestoreSnapshot'

/** @returns {'tr-TR' | 'en-US'} */
export function intelLocale() {
  return i18n.language?.startsWith('tr') ? 'tr-TR' : 'en-US'
}

/** @param {unknown} ts */
export function formatIntelTimestampDisplay(ts) {
  if (ts && typeof ts === 'object' && 'toDate' in ts && typeof ts.toDate === 'function') {
    try {
      return ts.toDate().toLocaleString(intelLocale(), {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    } catch {
      return '—'
    }
  }
  const ms = timestampToMs(ts) || Date.parse(String(ts ?? ''))
  if (!ms) return '—'
  return new Date(ms).toLocaleString(intelLocale(), {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

/** @param {unknown} ts */
export function formatVideoNewsTimestampDisplay(ts) {
  if (ts && typeof ts === 'object' && 'toDate' in ts && typeof ts.toDate === 'function') {
    try {
      return ts.toDate().toLocaleString(intelLocale(), {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return '—'
    }
  }
  const ms = timestampToMs(ts) || Date.parse(String(ts ?? ''))
  if (!ms) return '—'
  return new Date(ms).toLocaleString(intelLocale(), {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** @param {import('./firestoreVideoNews').VideoNewsItem} item */
export function formatVideoNewsDisplayDateDisplay(item) {
  return formatVideoNewsTimestampDisplay(item.publishDate ?? item.timestamp)
}

/** Kanonik "tümü" filtresi — Firestore sorgu değeri değişmez. */
export const INTEL_VIDEO_FILTER_ALL = 'TÜMÜ'

/** @param {unknown} channel */
export function formatVideoChannelFilterLabel(channel) {
  const raw = String(channel ?? '').trim()
  if (raw === INTEL_VIDEO_FILTER_ALL) {
    return i18n.t('video.filterAll', { ns: 'intel' })
  }
  return raw
}

/** @param {unknown} origin */
export function formatVideoOriginDisplay(origin) {
  const raw = String(origin ?? '').trim()
  if (!raw) return i18n.t('video.defaultOrigin', { ns: 'intel' })
  return raw
}
