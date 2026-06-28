const { getFirestore, FieldValue } = require('firebase-admin/firestore')
const { getMessaging } = require('firebase-admin/messaging')
const { logger } = require('firebase-functions')

const VALID_TYPES = new Set([
  'LIKE',
  'COMMENT',
  'FRIEND_REQUEST',
  'TRAINING',
  'ACADEMY',
  'SYSTEM',
])

/**
 * @param {string} link
 * @returns {string}
 */
function normalizeLink(link) {
  const trimmed = String(link ?? '').trim()
  return trimmed || '/dashboard'
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
  const fcmToken = typeof userSnap.data()?.fcmToken === 'string' ? userSnap.data().fcmToken.trim() : ''
  if (!fcmToken) {
    return { sent: false, reason: 'no_token' }
  }

  const rawType = typeof data.type === 'string' ? data.type : 'SYSTEM'
  const type = VALID_TYPES.has(rawType) ? rawType : 'SYSTEM'
  const title = String(data.title ?? 'AUDAZ TACTICAL').trim() || 'AUDAZ TACTICAL'
  const message = String(data.message ?? '').trim()
  const link = normalizeLink(data.link)

  try {
    await getMessaging().send({
      token: fcmToken,
      notification: {
        title,
        body: message,
      },
      data: {
        type,
        title,
        message,
        link,
        notificationId: String(notificationId),
      },
      webpush: {
        notification: {
          icon: '/logo.png',
          badge: '/logo.png',
        },
        fcmOptions: {
          link: link.startsWith('http') ? link : undefined,
        },
      },
    })

    return { sent: true }
  } catch (err) {
    const code = err && typeof err === 'object' && 'code' in err ? String(err.code) : ''
    if (
      code === 'messaging/registration-token-not-registered' ||
      code === 'messaging/invalid-registration-token'
    ) {
      try {
        await getFirestore().doc(`users/${recipientId}`).update({
          fcmToken: FieldValue.delete(),
          fcmTokenUpdatedAt: FieldValue.serverTimestamp(),
        })
      } catch (cleanupErr) {
        logger.warn('Stale FCM token cleanup failed', { recipientId, cleanupErr })
      }
    }

    logger.warn('User notification FCM failed', {
      notificationId,
      recipientId,
      code,
      message: err instanceof Error ? err.message : String(err),
    })
    return { sent: false, reason: code || 'fcm_error' }
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
}
