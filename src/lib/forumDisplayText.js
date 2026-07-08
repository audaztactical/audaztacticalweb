import i18n from '../i18n'
import { FORUM_CATEGORIES } from './firestoreForum'
import { timestampToMs } from './firestoreSnapshot'

/** @returns {'tr-TR' | 'en-US'} */
export function forumLocale() {
  return i18n.language?.startsWith('tr') ? 'tr-TR' : 'en-US'
}

/** @type {Record<string, string>} */
const FORUM_CATEGORY_KEYS = {
  'SİLAH SİSTEMLERİ': 'categories.weapons',
  'CQB & TAKTİK': 'categories.cqb',
  'TCCC & MEDİKAL': 'categories.tccc',
  'GENEL OPERASYON': 'categories.general',
}

/** @param {unknown} category */
export function formatForumCategoryLabel(category) {
  const raw = String(category ?? '').trim()
  const key = FORUM_CATEGORY_KEYS[raw]
  if (key) return i18n.t(key, { ns: 'forum' })
  return raw || i18n.t('categories.general', { ns: 'forum' })
}

/** @param {unknown} role */
export function formatForumRoleLabelDisplay(role) {
  const r = String(role || 'operator').toLowerCase()
  if (r === 'admin') return i18n.t('roles.admin', { ns: 'forum' })
  if (r === 'instructor') return i18n.t('roles.instructor', { ns: 'forum' })
  if (r === 'operator' || r === 'member' || r === 'premium_member') {
    return i18n.t('roles.operator', { ns: 'forum' })
  }
  return String(role || i18n.t('roles.operator', { ns: 'forum' }))
}

/** @param {import('./firestoreForumReports').ForumReportReasonKey} reasonKey */
export function formatForumReportReasonLabel(reasonKey) {
  return i18n.t(`report.reasons.${reasonKey}`, { ns: 'forum', defaultValue: String(reasonKey) })
}

/** @param {unknown} ts */
export function formatForumTimestampDisplay(ts) {
  const ms = timestampToMs(ts)
  if (!ms) return '—'
  return new Intl.DateTimeFormat(forumLocale(), {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(ms))
}

/** Firestore kategori sabitleri — form value olarak kullanılır. */
export function forumCategoryOptions() {
  return [...FORUM_CATEGORIES]
}
