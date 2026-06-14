const { initializeApp } = require('firebase-admin/app')
const { onCall } = require('firebase-functions/v2/https')
const { onSchedule } = require('firebase-functions/v2/scheduler')
const { logger } = require('firebase-functions')
const { subscribeToAlertsHandler, subscribeToGlobalIntelHandler } = require('./lib/fcmTopics')
const { runIntelFeedIngest } = require('./lib/intelFeed')
const { runLocalAlertsIngest } = require('./lib/localAlerts')
const { sendManualAlertHandler } = require('./lib/manualAlerts')
const { runVideoNewsIngest } = require('./lib/videoNews')

initializeApp()

/**
 * Scheduled ingest: RSS → Firestore news_feed (every 4 hours).
 * Pub/Sub schedule · Europe/Istanbul
 */
exports.fetchTacticalNews = onSchedule(
  {
    schedule: 'every 4 hours',
    timeZone: 'Europe/Istanbul',
    retryCount: 2,
    memory: '256MiB',
    timeoutSeconds: 120,
  },
  async () => {
    try {
      const result = await runIntelFeedIngest()
      logger.info('fetchTacticalNews completed', result)
      return result
    } catch (err) {
      logger.error('fetchTacticalNews failed', err)
      throw err
    }
  },
)

/**
 * Erken uyarı: TR son dakika RSS → taktik anahtar kelime filtresi → news_feed + FCM.
 * Pub/Sub schedule · every 15 minutes · Europe/Istanbul
 */
exports.fetchLocalAlerts = onSchedule(
  {
    schedule: 'every 15 minutes',
    timeZone: 'Europe/Istanbul',
    retryCount: 2,
    memory: '256MiB',
    timeoutSeconds: 120,
  },
  async () => {
    try {
      const result = await runLocalAlertsIngest()
      logger.info('fetchLocalAlerts completed', result)
      return result
    } catch (err) {
      logger.error('fetchLocalAlerts failed', err)
      throw err
    }
  },
)

/**
 * Callable: client FCM token → asayis_ikaz topic subscription.
 */
exports.subscribeToAlerts = onCall(
  {
    memory: '128MiB',
    timeoutSeconds: 30,
  },
  subscribeToAlertsHandler,
)

/**
 * Callable: client FCM token → global_intel topic subscription.
 */
exports.subscribeToGlobalIntel = onCall(
  {
    memory: '128MiB',
    timeoutSeconds: 30,
  },
  subscribeToGlobalIntelHandler,
)

/**
 * Callable: admin manual alert → news_feed + asayis_ikaz FCM topic.
 */
exports.sendManualAlert = onCall(
  {
    memory: '128MiB',
    timeoutSeconds: 30,
  },
  sendManualAlertHandler,
)

/**
 * Scheduled ingest: Task & Purpose YouTube RSS → Firestore video_news (every 1 hour).
 */
exports.fetchVideoNews = onSchedule(
  {
    schedule: 'every 1 hours',
    timeZone: 'Europe/Istanbul',
    retryCount: 2,
    memory: '256MiB',
    timeoutSeconds: 120,
  },
  async () => {
    try {
      const result = await runVideoNewsIngest()
      logger.info('fetchVideoNews completed', result)
      return result
    } catch (err) {
      logger.error('fetchVideoNews failed', err)
      throw err
    }
  },
)
