import i18n from '../i18n'

/** @returns {'tr-TR' | 'en-US'} */
export function profileLocale() {
  return i18n.language?.startsWith('tr') ? 'tr-TR' : 'en-US'
}

/** @param {import('firebase/firestore').Timestamp | null | undefined} ts */
export function formatProfileEnrolledDate(ts) {
  if (!ts || typeof ts.toDate !== 'function') return '—'
  try {
    return ts.toDate().toLocaleDateString(profileLocale(), {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

/** @param {number} ms */
export function formatProfileActivityTs(ms) {
  try {
    return new Date(ms).toLocaleString(profileLocale(), {
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

/** @param {unknown} role */
export function profileRoleLabel(role) {
  const r = String(role || 'member')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
  const key = /** @type {Record<string, string>} */ ({
    admin: 'admin',
    instructor: 'instructor',
    premium_member: 'premium',
    premium: 'premium',
    member: 'member',
    operator: 'member',
    operatör: 'member',
    commander: 'commander',
    komutan: 'commander',
    command: 'commander',
    cmd: 'commander',
  })[r]
  return i18n.t(`roles.${key ?? 'member'}`, { ns: 'profile' })
}
