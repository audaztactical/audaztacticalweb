const { getMessaging } = require('firebase-admin/messaging')
const { HttpsError } = require('firebase-functions/v2/https')
const { logger } = require('firebase-functions')
const { FCM_TOPIC } = require('./localAlerts')
const { FCM_TOPIC_GLOBAL_INTEL } = require('./videoNews')
const {
  FCM_TOPIC_FORUM_UPDATES,
  FCM_TOPIC_INTEL_UPDATES,
} = require('./fcmTopicNames')

/**
 * @param {string} token
 * @param {string} topic
 * @param {string} logLabel
 */
async function subscribeTokenToTopic(token, topic, logLabel) {
  const response = await getMessaging().subscribeToTopic([token], topic)
  const errors = response.errors ?? []

  if (errors.length > 0) {
    logger.warn(`${logLabel} partial failure`, { topic, errors })
    throw new HttpsError('internal', 'Topic aboneliği tamamlanamadı.')
  }

  return { success: true, topic }
}

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
    const result = await subscribeTokenToTopic(token, FCM_TOPIC, 'subscribeToAlerts')
    return result
  } catch (err) {
    if (err instanceof HttpsError) throw err
    logger.error('subscribeToAlerts failed', err)
    throw new HttpsError('internal', 'Topic aboneliği başarısız.')
  }
}

/**
 * Callable: subscribe client FCM token to global_intel topic (video RSS — geriye dönük).
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
    const result = await subscribeTokenToTopic(token, FCM_TOPIC_GLOBAL_INTEL, 'subscribeToGlobalIntel')
    return {
      ...result,
      message: 'Subscribed to global_intel',
    }
  } catch (err) {
    if (err instanceof HttpsError) throw err
    logger.error('subscribeToGlobalIntel failed', err)
    throw new HttpsError('internal', 'Topic aboneliği başarısız.')
  }
}

/**
 * Callable: subscribe client FCM token to intel_updates topic.
 * @param {import('firebase-functions/v2/https').CallableRequest} request
 */
async function subscribeToIntelUpdatesHandler(request) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'İstihbarat bildirimleri için giriş gerekli.')
  }

  const token = String(request.data?.token ?? '').trim()
  if (!token) {
    throw new HttpsError('invalid-argument', 'FCM cihaz tokenı gerekli.')
  }

  try {
    return subscribeTokenToTopic(token, FCM_TOPIC_INTEL_UPDATES, 'subscribeToIntelUpdates')
  } catch (err) {
    if (err instanceof HttpsError) throw err
    logger.error('subscribeToIntelUpdates failed', err)
    throw new HttpsError('internal', 'Topic aboneliği başarısız.')
  }
}

/**
 * Callable: subscribe client FCM token to forum_updates topic.
 * @param {import('firebase-functions/v2/https').CallableRequest} request
 */
async function subscribeToForumUpdatesHandler(request) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Forum bildirimleri için giriş gerekli.')
  }

  const token = String(request.data?.token ?? '').trim()
  if (!token) {
    throw new HttpsError('invalid-argument', 'FCM cihaz tokenı gerekli.')
  }

  try {
    return subscribeTokenToTopic(token, FCM_TOPIC_FORUM_UPDATES, 'subscribeToForumUpdates')
  } catch (err) {
    if (err instanceof HttpsError) throw err
    logger.error('subscribeToForumUpdates failed', err)
    throw new HttpsError('internal', 'Topic aboneliği başarısız.')
  }
}

module.exports = {
  subscribeToAlertsHandler,
  subscribeToGlobalIntelHandler,
  subscribeToIntelUpdatesHandler,
  subscribeToForumUpdatesHandler,
  FCM_TOPIC_INTEL_UPDATES,
  FCM_TOPIC_FORUM_UPDATES,
}
