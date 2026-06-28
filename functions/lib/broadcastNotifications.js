const { getFirestore, FieldValue } = require('firebase-admin/firestore')
const { logger } = require('firebase-functions')
const { FCM_TOPIC_FORUM_UPDATES, FCM_TOPIC_INTEL_UPDATES } = require('./fcmTopicNames')
const { sendTopicDataPush } = require('./topicPush')

const FANOUT_PAGE_SIZE = 400

/**
 * @param {string} text
 * @param {number} [maxLen]
 */
function truncateText(text, maxLen = 80) {
  const normalized = String(text ?? '')
    .trim()
    .replace(/\s+/g, ' ')
  if (!normalized) return ''
  if (normalized.length <= maxLen) return normalized
  return `${normalized.slice(0, Math.max(1, maxLen - 1))}…`
}

/**
 * @param {string} postId
 */
function buildForumPostLink(postId) {
  const id = String(postId ?? '').trim()
  return id ? `/forum?post=${encodeURIComponent(id)}` : '/forum'
}

/**
 * Kullanıcı tercihine göre toplu in-app bildirim (notifications koleksiyonu).
 * @param {{
 *   type: string
 *   title: string
 *   message: string
 *   link: string
 *   senderId?: string
 *   targetId?: string
 *   preferenceKey?: 'intel' | 'muhabere' | 'training' | 'academy'
 * }} input
 */
async function fanOutInAppNotifications(input) {
  const db = getFirestore()
  const senderId = String(input.senderId ?? '').trim()
  const targetId = String(input.targetId ?? '').trim()
  const preferenceKey = input.preferenceKey

  /** @type {import('firebase-admin/firestore').QueryDocumentSnapshot | null} */
  let lastDoc = null
  let written = 0

  while (true) {
    let q = db.collection('users').orderBy('__name__').limit(FANOUT_PAGE_SIZE)
    if (lastDoc) q = q.startAfter(lastDoc)

    const snap = await q.get()
    if (snap.empty) break

    const batch = db.batch()
    let batchCount = 0

    for (const userDoc of snap.docs) {
      const uid = userDoc.id
      if (senderId && uid === senderId) continue

      if (preferenceKey) {
        const prefs = userDoc.data()?.settings?.notifications
        if (prefs && prefs[preferenceKey] === false) continue
      }

      /** @type {Record<string, unknown>} */
      const docPayload = {
        recipientId: uid,
        type: input.type,
        title: input.title,
        message: input.message,
        link: input.link,
        isRead: false,
        createdAt: FieldValue.serverTimestamp(),
      }
      if (senderId) docPayload.senderId = senderId
      if (targetId) docPayload.targetId = targetId

      batch.set(db.collection('notifications').doc(), docPayload)
      batchCount += 1
    }

    if (batchCount > 0) {
      await batch.commit()
      written += batchCount
    }

    lastDoc = snap.docs[snap.docs.length - 1]
    if (snap.size < FANOUT_PAGE_SIZE) break
  }

  return written
}

/**
 * @param {{ title: string, message: string, link?: string }} input
 */
async function broadcastIntelNotification(input) {
  const title = String(input.title ?? 'Yeni İstihbarat').trim() || 'Yeni İstihbarat'
  const message = truncateText(input.message, 80)
  const link = String(input.link ?? '/istihbarat').trim() || '/istihbarat'

  const [topicResult, fanOutCount] = await Promise.all([
    sendTopicDataPush(FCM_TOPIC_INTEL_UPDATES, {
      type: 'INTEL',
      title,
      message,
      link,
    }).then((messageId) => ({ sent: true, messageId })).catch((err) => {
      logger.warn('intel_updates topic push failed', err)
      return { sent: false, reason: 'fcm_error' }
    }),
    fanOutInAppNotifications({
      type: 'INTEL',
      title,
      message,
      link,
      preferenceKey: 'intel',
    }),
  ])

  return { topicResult, fanOutCount, type: 'INTEL' }
}

/**
 * @param {{ postId: string, title: string, authorCallsign: string, authorId: string }} input
 */
async function broadcastForumPostNotification(input) {
  const postId = String(input.postId ?? '').trim()
  const authorId = String(input.authorId ?? '').trim()
  const postTitle = truncateText(input.title, 80)
  const callsign = String(input.authorCallsign ?? 'OPERATÖR').trim() || 'OPERATÖR'
  const link = buildForumPostLink(postId)
  const title = 'Yeni Brifing Paylaşımı'
  const message = `${postTitle} — ${callsign}`

  const [topicResult, fanOutCount] = await Promise.all([
    sendTopicDataPush(FCM_TOPIC_FORUM_UPDATES, {
      type: 'FORUM_POST',
      title,
      message,
      link,
    }).then((messageId) => ({ sent: true, messageId })).catch((err) => {
      logger.warn('forum_updates topic push failed', err)
      return { sent: false, reason: 'fcm_error' }
    }),
    fanOutInAppNotifications({
      type: 'FORUM_POST',
      title,
      message,
      link,
      senderId: authorId,
      targetId: postId,
    }),
  ])

  return { topicResult, fanOutCount, type: 'FORUM_POST', postId }
}

/**
 * Firestore news_feed/{itemId} onCreate
 * @param {import('firebase-functions/v2/firestore').FirestoreEvent} event
 */
async function onNewsFeedItemCreatedHandler(event) {
  const snap = event.data
  if (!snap) return { skipped: true, reason: 'no_snapshot' }

  const data = snap.data()
  if (!data || typeof data !== 'object') return { skipped: true, reason: 'invalid_data' }

  if (data.isAlert === true) {
    return { skipped: true, reason: 'local_alert' }
  }

  const headline = String(data.trTitle ?? data.enTitle ?? '').trim()
  if (!headline) return { skipped: true, reason: 'no_title' }

  return broadcastIntelNotification({
    title: 'Yeni İstihbarat',
    message: headline,
    link: '/istihbarat',
  })
}

/**
 * Firestore forum_posts/{postId} onCreate
 * @param {import('firebase-functions/v2/firestore').FirestoreEvent} event
 */
async function onForumPostCreatedHandler(event) {
  const snap = event.data
  if (!snap) return { skipped: true, reason: 'no_snapshot' }

  const data = snap.data()
  if (!data || typeof data !== 'object') return { skipped: true, reason: 'invalid_data' }

  const postId = event.params?.postId ?? snap.id
  const authorId = String(data.authorId ?? '').trim()
  const title = String(data.title ?? '').trim()
  const authorCallsign = String(data.authorCallsign ?? 'OPERATÖR').trim()

  if (!title) return { skipped: true, reason: 'no_title' }

  return broadcastForumPostNotification({
    postId,
    title,
    authorCallsign,
    authorId,
  })
}

module.exports = {
  truncateText,
  fanOutInAppNotifications,
  broadcastIntelNotification,
  broadcastForumPostNotification,
  onNewsFeedItemCreatedHandler,
  onForumPostCreatedHandler,
}
