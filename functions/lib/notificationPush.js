const { getFirestore, FieldValue } = require('firebase-admin/firestore')
const { getMessaging } = require('firebase-admin/messaging')
const { logger } = require('firebase-functions')

const INVALID_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
])

/**
 * @param {string} link
 * @returns {string}
 */
function normalizeLink(link) {
  const trimmed = String(link ?? '').trim()
  if (!trimmed) return '/dashboard'
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

/**
 * Firestore type alanını normalize eder; bilinmeyen tipler de push alır.
 * @param {unknown} raw
 * @returns {string}
 */
function normalizeNotificationType(raw) {
  const type = String(raw ?? '').trim().toUpperCase()
  return type || 'SYSTEM'
}

/**
 * Push tıklama yönlendirmesi — data.link öncelikli, tip bazlı yedek.
 * @param {string} type
 * @param {Record<string, unknown>} data
 * @returns {string}
 */
function resolvePushLink(type, data) {
  const storedLink = String(data.link ?? '').trim()

  switch (type) {
    case 'LIKE':
    case 'COMMENT':
      return normalizeLink(storedLink || '/forum')
    case 'FRIEND_REQUEST':
      return normalizeLink(storedLink || '/profil')
    case 'MESSAGE':
    case 'DM':
      return normalizeLink(storedLink || '/mesajlar')
    case 'TRAINING':
      if (storedLink.includes('sector=grup-egitimi')) return normalizeLink(storedLink)
      return '/antrenman?sector=grup-egitimi'
    case 'INTEL':
    case 'NEWS':
      return '/istihbarat'
    case 'FORUM_POST':
      return normalizeLink(storedLink || '/forum')
    case 'ACADEMY':
    case 'SYSTEM':
      return '/dashboard'
    default:
      return normalizeLink(storedLink)
  }
}

/**
 * @param {unknown} userData
 * @returns {string[]}
 */
function collectFcmTokens(userData) {
  if (!userData || typeof userData !== 'object') return []

  /** @type {Set<string>} */
  const tokenSet = new Set()

  if (Array.isArray(userData.fcmTokens)) {
    for (const entry of userData.fcmTokens) {
      if (typeof entry === 'string') {
        const trimmed = entry.trim()
        if (trimmed) tokenSet.add(trimmed)
      }
    }
  }

  if (typeof userData.fcmToken === 'string') {
    const legacy = userData.fcmToken.trim()
    if (legacy && !tokenSet.has(legacy)) {
      tokenSet.add(legacy)
    }
  }

  return [...tokenSet]
}

/**
 * FCM data alanı yalnızca string kabul eder.
 * @param {Record<string, unknown>} fields
 * @returns {Record<string, string>}
 */
function toFcmDataPayload(fields) {
  /** @type {Record<string, string>} */
  const data = {}
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null) continue
    data[key] = String(value)
  }
  return data
}

/**
 * @param {FirebaseFirestore.DocumentSnapshot} snap
 * @param {string} notificationId
 */
async function sendUserNotificationPush(snap, notificationId) {
  const data = snap.data()
  if (!data || typeof data !== 'object') {
    return { sent: false, reason: 'invalid_data' }
  }

  const recipientId = String(data.recipientId ?? '').trim()
  if (!recipientId) {
    return { sent: false, reason: 'no_recipient' }
  }

  const userSnap = await getFirestore().doc(`users/${recipientId}`).get()
  const userData = userSnap.data()
  const tokens = collectFcmTokens(userData)

  if (tokens.length === 0) {
    return { sent: false, reason: 'no_token' }
  }

  const type = normalizeNotificationType(data.type)
  const title = String(data.title ?? 'AUDAZ TACTICAL').trim() || 'AUDAZ TACTICAL'
  const message = String(data.message ?? '').trim()
  const link = resolvePushLink(type, data)

  try {
    // Yalnızca data payload — notification alanı SW onBackgroundMessage ile çift gösterim üretir.
    const response = await getMessaging().sendEachForMulticast({
      tokens,
      data: toFcmDataPayload({
        type,
        title,
        message,
        link,
        notificationId: String(notificationId),
      }),
      webpush: {
        headers: {
          Urgency: 'high',
        },
        fcmOptions: {
          link: link.startsWith('http') ? link : undefined,
        },
      },
    })

    const staleTokens = []
    response.responses.forEach((result, index) => {
      if (result.success) return
      const code =
        result.error && typeof result.error === 'object' && 'code' in result.error
          ? String(result.error.code)
          : ''
      if (INVALID_TOKEN_CODES.has(code)) {
        staleTokens.push(tokens[index])
      }
    })

    if (staleTokens.length > 0) {
      try {
        await getFirestore()
          .doc(`users/${recipientId}`)
          .update({
            fcmTokens: FieldValue.arrayRemove(...staleTokens),
            fcmToken: FieldValue.delete(),
            fcmTokenUpdatedAt: FieldValue.serverTimestamp(),
          })
      } catch (cleanupErr) {
        logger.warn('Stale FCM token cleanup failed', { recipientId, cleanupErr })
      }
    }

    return {
      sent: response.successCount > 0,
      type,
      tokenCount: tokens.length,
      successCount: response.successCount,
      failureCount: response.failureCount,
      staleTokensRemoved: staleTokens.length,
    }
  } catch (err) {
    logger.warn('User notification FCM failed', {
      notificationId,
      recipientId,
      type,
      message: err instanceof Error ? err.message : String(err),
    })
    return { sent: false, reason: 'fcm_error', type }
  }
}

/**
 * Firestore notifications/{id} onCreate handler.
 * @param {import('firebase-functions/v2/firestore').FirestoreEvent} event
 */
async function onNotificationCreatedPushHandler(event) {
  const snap = event.data
  if (!snap) return { sent: false, reason: 'no_snapshot' }

  const notificationId = event.params?.notificationId ?? snap.id
  const result = await sendUserNotificationPush(snap, notificationId)
  logger.info('onNotificationCreatedPush', { notificationId, ...result })
  return result
}

module.exports = {
  sendUserNotificationPush,
  onNotificationCreatedPushHandler,
  resolvePushLink,
  collectFcmTokens,
  normalizeNotificationType,
  toFcmDataPayload,
}
