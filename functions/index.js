const { initializeApp } = require('firebase-admin/app')
const { onCall } = require('firebase-functions/v2/https')
const { onSchedule } = require('firebase-functions/v2/scheduler')
const { logger } = require('firebase-functions')
const { subscribeToAlertsHandler, subscribeToGlobalIntelHandler } = require('./lib/fcmTopics')
const { runIntelFeedIngest } = require('./lib/intelFeed')
const { runLocalAlertsIngest } = require('./lib/localAlerts')
const { runVideoNewsIngest } = require('./lib/videoNews')
const { ensureAdminClaimHandler } = require('./lib/adminClaims')
const { claimInstructorRoleHandler } = require('./lib/instructorClaim')
const { joinGroupByPasswordHandler } = require('./lib/joinGroup')
const { completePremiumUpgradeHandler } = require('./lib/premiumUpgrade')
const { registerOperatorProfileHandler } = require('./lib/registerOperatorProfile')
const { syncMuhabereChannelSummary, syncMuhabereDmSummary } = require('./src/muhabereSync')
const { resolveYoutubeChannelInputHandler } = require('./lib/youtubeChannelResolve')
const { triggerVideoNewsIngestHandler } = require('./lib/videoNewsTrigger')

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

/**
 * Callable: admin custom claim (admin: true) — client VITE_ADMIN_EMAIL karşılaştırması gerekmez.
 */
exports.ensureAdminClaim = onCall(
  {
    memory: '128MiB',
    timeoutSeconds: 30,
    cors: true,
  },
  ensureAdminClaimHandler,
)

/**
 * Callable: eğitmen davet kodu yakma + users.role = instructor (yalnızca Admin SDK).
 */
exports.claimInstructorRole = onCall(
  {
    memory: '128MiB',
    timeoutSeconds: 30,
    cors: true,
  },
  claimInstructorRoleHandler,
)

/**
 * Callable: grup şifresi doğrulama + members arrayUnion (Admin SDK).
 */
exports.joinGroupByPassword = onCall(
  {
    memory: '128MiB',
    timeoutSeconds: 30,
    cors: true,
  },
  joinGroupByPasswordHandler,
)

/**
 * Callable: kayıt sonrası users/{uid} + usernames/{key} (Admin SDK — istemci kurallarını atlar).
 */
exports.registerOperatorProfile = onCall(
  {
    memory: '128MiB',
    timeoutSeconds: 30,
    cors: true,
  },
  registerOperatorProfileHandler,
)

/**
 * Callable: mock ödeme sonrası premium_member yükseltme (Admin SDK).
 */
exports.completePremiumUpgrade = onCall(
  {
    memory: '128MiB',
    timeoutSeconds: 30,
    cors: true,
  },
  completePremiumUpgradeHandler,
)

/**
 * Callable: @handle veya kanal URL → UC… kimliği (admin).
 */
exports.resolveYoutubeChannel = onCall(
  {
    memory: '256MiB',
    timeoutSeconds: 30,
    cors: true,
  },
  resolveYoutubeChannelInputHandler,
)

/**
 * Callable: admin — video_news ingest (manuel tetik).
 */
exports.triggerVideoNewsIngest = onCall(
  {
    memory: '256MiB',
    timeoutSeconds: 120,
    cors: true,
  },
  triggerVideoNewsIngestHandler,
)

/**
 * Firestore trigger: kanal mesajı → users/{uid}/muhabere_summary/latest (batch).
 */
exports.syncMuhabereChannelSummary = syncMuhabereChannelSummary
exports.syncMuhabereDmSummary = syncMuhabereDmSummary
