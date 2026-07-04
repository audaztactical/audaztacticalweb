const { initializeApp } = require('firebase-admin/app')
const { onCall } = require('firebase-functions/v2/https')
const { onSchedule } = require('firebase-functions/v2/scheduler')
const { onDocumentCreated } = require('firebase-functions/v2/firestore')
const { logger } = require('firebase-functions')
const { subscribeToAlertsHandler, subscribeToGlobalIntelHandler, subscribeToIntelUpdatesHandler, subscribeToForumUpdatesHandler } = require('./lib/fcmTopics')
const { onNotificationCreatedPushHandler } = require('./lib/notificationPush')
const { onNewsFeedItemCreatedHandler, onForumPostCreatedHandler } = require('./lib/broadcastNotifications')
const { runIntelFeedIngest } = require('./lib/intelFeed')
const { runLocalAlertsIngest } = require('./lib/localAlerts')
const { runVideoNewsIngest } = require('./lib/videoNews')
const { ensureAdminClaimHandler } = require('./lib/adminClaims')
const { adminDeleteUserHandler } = require('./lib/adminDeleteUser')
const { joinGroupByPasswordHandler } = require('./lib/joinGroup')
const { leaveGroupHandler } = require('./lib/leaveGroup')
const { completePremiumUpgradeHandler } = require('./lib/premiumUpgrade')
const { redeemAccessCodeHandler } = require('./lib/redeemAccessCode')
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
 * Callable: client FCM token → intel_updates topic subscription.
 */
exports.subscribeToIntelUpdates = onCall(
  {
    memory: '128MiB',
    timeoutSeconds: 30,
  },
  subscribeToIntelUpdatesHandler,
)

/**
 * Callable: client FCM token → forum_updates topic subscription.
 */
exports.subscribeToForumUpdates = onCall(
  {
    memory: '128MiB',
    timeoutSeconds: 30,
  },
  subscribeToForumUpdatesHandler,
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
 * Callable: admin kullanıcı silme (Auth + users/{uid}).
 */
exports.adminDeleteUser = onCall(
  {
    memory: '256MiB',
    timeoutSeconds: 60,
    cors: true,
  },
  adminDeleteUserHandler,
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
 * Callable: operatörün taktik grubundan ayrılması (Admin SDK).
 */
exports.leaveGroup = onCall(
  {
    memory: '128MiB',
    timeoutSeconds: 30,
    cors: true,
  },
  leaveGroupHandler,
)

/**
 * Callable: kayıt sonrası users/{uid} + usernames/{key} (Admin SDK — istemci kurallarını atlar).
 */
exports.registerOperatorProfile = onCall(
  {
    memory: '256MiB',
    timeoutSeconds: 30,
    cors: true,
  },
  registerOperatorProfileHandler,
)

/**
 * Callable: Premium / Pro-Eğitmen çok-kişilik erişim kodu kullanımı (Admin SDK).
 */
exports.redeemAccessCode = onCall(
  {
    memory: '256MiB',
    timeoutSeconds: 30,
    cors: true,
  },
  redeemAccessCodeHandler,
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

/**
 * Firestore trigger: notifications/{id} oluşturulunca alıcıya FCM push gönder.
 */
exports.onNotificationCreatedPush = onDocumentCreated(
  {
    document: 'notifications/{notificationId}',
    memory: '256MiB',
    timeoutSeconds: 30,
  },
  onNotificationCreatedPushHandler,
)

/**
 * Firestore trigger: news_feed/{itemId} oluşturulunca notifications fan-out (FCM: onNotificationCreatedPush).
 */
exports.onNewsFeedItemCreated = onDocumentCreated(
  {
    document: 'news_feed/{itemId}',
    memory: '512MiB',
    timeoutSeconds: 120,
  },
  onNewsFeedItemCreatedHandler,
)

/**
 * Firestore trigger: forum_posts/{postId} oluşturulunca notifications fan-out (FCM: onNotificationCreatedPush).
 */
exports.onForumPostCreated = onDocumentCreated(
  {
    document: 'forum_posts/{postId}',
    memory: '512MiB',
    timeoutSeconds: 120,
  },
  onForumPostCreatedHandler,
)
