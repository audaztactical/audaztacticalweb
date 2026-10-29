/**
 * Operatör Beyni — Firestore tetikleyicileri (v2).
 */

const { onDocumentCreated, onDocumentWritten } = require('firebase-functions/v2/firestore')
const { logger } = require('firebase-functions')
const {
  processNeuralEvent,
  isTacticalSessionComplete,
  NEURAL_SOURCES,
} = require('./neuralProcess')

/** Bölge belirtilmez → Functions v2 varsayılanı us-central1 (onForumPostCreated / onNotificationCreatedPush ile aynı). */
const OPTS = {
  memory: '256MiB',
  timeoutSeconds: 60,
}

/**
 * @param {string} label
 * @param {() => Promise<unknown>} fn
 */
async function safe(label, fn) {
  try {
    return await fn()
  } catch (err) {
    logger.error('neural_trigger_error', {
      label,
      message: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}

/** range_logs/{uid}/entries/{docId} */
const neuralOnRangeLogCreated = onDocumentCreated(
  { ...OPTS, document: 'range_logs/{uid}/entries/{docId}' },
  async (event) => {
    const uid = event.params.uid
    const docId = event.params.docId
    const data = event.data?.data() || {}
    await safe('range_logs', () =>
      processNeuralEvent(uid, NEURAL_SOURCES.RANGE_LOGS, docId, data),
    )
  },
)

/** vbss_logs/{uid}/entries/{docId} */
const neuralOnVbssLogCreated = onDocumentCreated(
  { ...OPTS, document: 'vbss_logs/{uid}/entries/{docId}' },
  async (event) => {
    const uid = event.params.uid
    const docId = event.params.docId
    const data = event.data?.data() || {}
    await safe('vbss_logs', () => processNeuralEvent(uid, NEURAL_SOURCES.VBSS_LOGS, docId, data))
  },
)

/** tccc_logs/{uid}/entries/{docId} */
const neuralOnTcccLogCreated = onDocumentCreated(
  { ...OPTS, document: 'tccc_logs/{uid}/entries/{docId}' },
  async (event) => {
    const uid = event.params.uid
    const docId = event.params.docId
    const data = event.data?.data() || {}
    await safe('tccc_logs', () => processNeuralEvent(uid, NEURAL_SOURCES.TCCC_LOGS, docId, data))
  },
)

/**
 * users/{uid}/tacticalSessions/{docId}
 * create/merge ile yazılıyor — yalnızca tamamlanmış görününce işle.
 */
const neuralOnTacticalSessionWritten = onDocumentWritten(
  { ...OPTS, document: 'users/{uid}/tacticalSessions/{docId}' },
  async (event) => {
    const after = event.data?.after
    if (!after?.exists) return
    const data = after.data() || {}
    if (!isTacticalSessionComplete(data)) {
      logger.info('neural_skip', { source: 'tacticalSessions', reason: 'incomplete_session' })
      return
    }
    const uid = event.params.uid
    const docId = event.params.docId
    await safe('tacticalSessions', () =>
      processNeuralEvent(uid, NEURAL_SOURCES.TACTICAL_SESSIONS, docId, data),
    )
  },
)

/** trainings/{docId} — ownerId || userId */
const neuralOnTrainingCreated = onDocumentCreated(
  { ...OPTS, document: 'trainings/{docId}' },
  async (event) => {
    const docId = event.params.docId
    const data = event.data?.data() || {}
    const uid = String(data.ownerId || data.userId || '')
    if (!uid) {
      logger.info('neural_skip', { source: 'trainings', reason: 'missing_uid' })
      return
    }
    await safe('trainings', () => processNeuralEvent(uid, NEURAL_SOURCES.TRAININGS, docId, data))
  },
)

/** ballistic_profiles/{uid}/profiles/{docId} */
const neuralOnBallisticProfileCreated = onDocumentCreated(
  { ...OPTS, document: 'ballistic_profiles/{uid}/profiles/{docId}' },
  async (event) => {
    const uid = event.params.uid
    const docId = event.params.docId
    const data = event.data?.data() || {}
    await safe('ballistic_profiles', () =>
      processNeuralEvent(uid, NEURAL_SOURCES.BALLISTIC_PROFILES, docId, data),
    )
  },
)

/** forum_posts/{postId} — yalnızca varlık; içerik saklanmaz */
const neuralOnForumPostCreated = onDocumentCreated(
  { ...OPTS, document: 'forum_posts/{postId}' },
  async (event) => {
    const docId = event.params.postId
    const data = event.data?.data() || {}
    const uid = String(data.authorId || data.ownerId || data.userId || '')
    if (!uid) {
      logger.info('neural_skip', { source: 'forum_posts', reason: 'missing_author' })
      return
    }
    await safe('forum_posts', () =>
      processNeuralEvent(uid, NEURAL_SOURCES.FORUM_POSTS, docId, {
        authorId: uid,
        timestamp: data.timestamp ?? data.createdAt,
      }),
    )
  },
)

/** forum_posts/{postId}/replies/{replyId} */
const neuralOnForumReplyCreated = onDocumentCreated(
  { ...OPTS, document: 'forum_posts/{postId}/replies/{replyId}' },
  async (event) => {
    const docId = `${event.params.postId}_${event.params.replyId}`
    const data = event.data?.data() || {}
    const uid = String(data.authorId || data.ownerId || data.userId || '')
    if (!uid) {
      logger.info('neural_skip', { source: 'forum_replies', reason: 'missing_author' })
      return
    }
    await safe('forum_replies', () =>
      processNeuralEvent(uid, NEURAL_SOURCES.FORUM_REPLIES, docId, {
        authorId: uid,
        timestamp: data.timestamp ?? data.createdAt,
      }),
    )
  },
)

/** users/{uid}/activity_events/{docId} */
const neuralOnActivityEventCreated = onDocumentCreated(
  { ...OPTS, document: 'users/{uid}/activity_events/{docId}' },
  async (event) => {
    const uid = event.params.uid
    const docId = event.params.docId
    const data = event.data?.data() || {}
    await safe('activity_events', () =>
      processNeuralEvent(uid, NEURAL_SOURCES.ACTIVITY_EVENTS, docId, {
        type: data.type,
        refId: data.refId,
        createdAt: data.createdAt,
        timestamp: data.createdAt,
      }),
    )
  },
)

module.exports = {
  neuralOnRangeLogCreated,
  neuralOnVbssLogCreated,
  neuralOnTcccLogCreated,
  neuralOnTacticalSessionWritten,
  neuralOnTrainingCreated,
  neuralOnBallisticProfileCreated,
  neuralOnForumPostCreated,
  neuralOnForumReplyCreated,
  neuralOnActivityEventCreated,
  isTacticalSessionComplete,
}
