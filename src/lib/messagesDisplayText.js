import i18n from '../i18n'
import { MUHABERE_CONTENT_VIOLATION } from './muhabereContentFilter'
import { getMuhaberePreviewTokenKind } from './muhaberePreviewTokens'
import { isOperatorOnline } from './operatorPresence'

/** @returns {'tr-TR' | 'en-US'} */
export function messagesLocale() {
  return i18n.language?.startsWith('tr') ? 'tr-TR' : 'en-US'
}

/** @param {unknown} err */
export function muhabereRequestErrorMessageDisplay(err) {
  const code =
    err && typeof err === 'object' && 'code' in err ? String(/** @type {{ code?: string }} */ (err).code) : ''
  if (code === 'permission-denied') {
    return i18n.t('errors.requestDenied', { ns: 'messages' })
  }
  if (code === 'already-exists') {
    return err instanceof Error ? err.message : i18n.t('errors.requestAlreadyExists', { ns: 'messages' })
  }
  return err instanceof Error ? err.message : i18n.t('errors.requestFailed', { ns: 'messages' })
}

export function muhabereContentViolationMessage() {
  return i18n.t('errors.contentViolation', { ns: 'messages' })
}

/** @param {unknown} message */
export function isMuhabereContentViolationMessage(message) {
  const raw = String(message ?? '').trim()
  return raw === MUHABERE_CONTENT_VIOLATION || raw === muhabereContentViolationMessage()
}

/** @param {unknown} text */
export function formatMuhabereMessagePreviewDisplay(text) {
  const raw = String(text ?? '').trim()
  if (!raw) return ''
  const kind = getMuhaberePreviewTokenKind(raw)
  if (kind === 'image') return i18n.t('preview.image', { ns: 'messages' })
  if (kind === 'location') return i18n.t('preview.location', { ns: 'messages' })
  return raw
}

/**
 * @param {import('./operatorPresence').OperatorPresenceSnapshot | null | undefined} snapshot
 * @param {number} [nowMs]
 */
export function formatOperatorPresenceLabelDisplay(snapshot, nowMs = Date.now()) {
  return isOperatorOnline(snapshot, nowMs)
    ? i18n.t('presence.online', { ns: 'messages' })
    : i18n.t('presence.offline', { ns: 'messages' })
}

/** @param {unknown} role */
export function messagesRoleLabel(role) {
  if (role === 'instructor') return i18n.t('roles.instructor', { ns: 'messages' })
  if (role === 'premium_member') return i18n.t('roles.premiumOperator', { ns: 'messages' })
  if (role === 'member' || role === 'operator') return i18n.t('roles.operator', { ns: 'messages' })
  return String(role || '—')
}
