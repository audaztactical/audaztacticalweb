const { getMessaging } = require('firebase-admin/messaging')
const { HttpsError } = require('firebase-functions/v2/https')
const { logger } = require('firebase-functions')
const { FCM_TOPIC } = require('./localAlerts')
const { FCM_TOPIC_GLOBAL_INTEL } = require('./videoNews')

/**
 * Callable: subscribe client FCM token to asayis_ikaz topic.
 * @param {import('firebase-functions/v2/https').CallableRequest} request
 */
async function subscribeToAlertsHandler(request) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Erken uyarı aboneliği için giriş gerekli.')
  }

  const token = String(request.data?.token ?? '').trim()
  if (!token) {
    throw new HttpsError('invalid-argument', 'FCM cihaz tokenı gerekli.')
  }

  try {
    const response = await getMessaging().subscribeToTopic([token], FCM_TOPIC)
    const errors = response.errors ?? []

    if (errors.length > 0) {
      logger.warn('subscribeToAlerts partial failure', { uid: request.auth.uid, errors })
      throw new HttpsError('internal', 'Topic aboneliği tamamlanamadı.')
    }

    return {
      success: true,
      topic: FCM_TOPIC,
    }
  } catch (err) {
    if (err instanceof HttpsError) throw err
    logger.error('subscribeToAlerts failed', err)
    throw new HttpsError('internal', 'Topic aboneliği başarısız.')
  }
}

/**
 * Callable: subscribe client FCM token to global_intel topic.
 * @param {import('firebase-functions/v2/https').CallableRequest} request
 */
async function subscribeToGlobalIntelHandler(request) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Küresel istihbarat aboneliği için giriş gerekli.')
  }

  const token = String(request.data?.token ?? '').trim()
  if (!token) {
    throw new HttpsError('invalid-argument', 'FCM cihaz tokenı gerekli.')
  }

  try {
    const response = await getMessaging().subscribeToTopic([token], FCM_TOPIC_GLOBAL_INTEL)
    const errors = response.errors ?? []

    if (errors.length > 0) {
      logger.warn('subscribeToGlobalIntel partial failure', { uid: request.auth.uid, errors })
      throw new HttpsError('internal', 'Topic aboneliği tamamlanamadı.')
    }

    return {
      success: true,
      message: 'Subscribed to global_intel',
      topic: FCM_TOPIC_GLOBAL_INTEL,
    }
  } catch (err) {
    if (err instanceof HttpsError) throw err
    logger.error('subscribeToGlobalIntel failed', err)
    throw new HttpsError('internal', 'Topic aboneliği başarısız.')
  }
}

module.exports = {
  subscribeToAlertsHandler,
  subscribeToGlobalIntelHandler,
}
