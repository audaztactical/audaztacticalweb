import i18n from '../i18n'
import { MUHABERE_CONTENT_VIOLATION } from './muhabereContentFilter'
import { getMuhaberePreviewTokenKind } from './muhaberePreviewTokens'
import { isOperatorOnline } from './operatorPresence'

/** @returns {'tr-TR' | 'en-US'} */
export function messagesLocale() {
  return i18n.language?.startsWith('tr') ? 'tr-TR' : 'en-US'
}

/** Stable audaz codes thrown from firestoreTaktikMuhabere.js */
const MUHABERE_ERROR_CODES = new Set([
  'FIREBASE_NOT_CONFIGURED',
  'PROFILE_NOT_FOUND',
  'NOT_IN_MUHABERE_NETWORK',
  'INVALID_CONNECTION_TARGET',
  'INVALID_REQUEST_TARGET',
  'ALREADY_IN_ROSTER',
  'REQUEST_ALREADY_SENT',
  'PENDING_INBOUND_REQUEST',
  'REQUEST_SEND_DENIED',
  'INVALID_REQUEST',
  'REQUEST_NOT_FOUND',
  'REQUEST_ACCEPT_DENIED',
  'REQUEST_NOT_PENDING',
  'SENDER_UNKNOWN',
  'PROFILE_READ_AFTER_ACCEPT_FAILED',
  'REQUEST_REJECT_DENIED',
  'INVALID_CHANNEL_NAME',
  'CHANNEL_NOT_FOUND',
  'CHANNEL_EDIT_OWNER_ONLY',
  'CHANNEL_DELETE_OWNER_ONLY',
  'INVALID_MESSAGE_OR_RECIPIENT',
  'EMPTY_MESSAGE',
  'MISSING_IMAGE_URL',
  'INVALID_COORDINATES',
  'INVALID_CHANNEL_OR_CREATOR',
  'CHANNEL_CREATE_DENIED',
  'CHANNEL_CREATE_FAILED',
  'INVALID_CHANNEL_OR_SENDER',
])

/**
 * Resolve muhabere lib error → localized user message.
 * Prefers `__audazCode`, then Error.message if it is a known code.
 * @param {unknown} err
 * @param {string} [fallbackKey]
 */
export function formatMuhabereErrorDisplay(err, fallbackKey = 'errors.requestFailed') {
  const audaz =
    err && typeof err === 'object' && '__audazCode' in err
      ? String(/** @type {{ __audazCode?: string }} */ (err).__audazCode ?? '').trim()
      : ''
  const message = err instanceof Error ? String(err.message ?? '').trim() : ''
  const code =
    err && typeof err === 'object' && 'code' in err
      ? String(/** @type {{ code?: string }} */ (err).code ?? '')
      : ''

  const audazCode = MUHABERE_ERROR_CODES.has(audaz)
    ? audaz
    : MUHABERE_ERROR_CODES.has(message)
      ? message
      : ''

  if (audazCode) {
    return i18n.t(`errors.codes.${audazCode}`, { ns: 'messages' })
  }

  if (code === 'permission-denied') {
    return i18n.t('errors.requestDenied', { ns: 'messages' })
  }
  if (code === 'already-exists') {
    return i18n.t('errors.requestAlreadyExists', { ns: 'messages' })
  }

  if (message && !MUHABERE_ERROR_CODES.has(message)) {
    // Legacy / Firebase raw — avoid showing unknown technical codes as blank
    if (!/^[A-Z][A-Z0-9_]+$/.test(message)) return message
  }

  return i18n.t(fallbackKey, { ns: 'messages' })
}

/** @param {unknown} err */
export function muhabereRequestErrorMessageDisplay(err) {
  return formatMuhabereErrorDisplay(err, 'errors.requestFailed')
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
