const { getFirestore, FieldValue } = require('firebase-admin/firestore')
const { logger } = require('firebase-functions')

const FANOUT_PAGE_SIZE = 400
const FANOUT_STALE_MS = 10 * 60 * 1000

/**
 * @param {string} value
 * @returns {string}
 */
function sanitizeDocPart(value) {
  return String(value ?? '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 120)
}

/**
 * postId + recipientId başına tek notifications belgesi (retry / çift fan-out koruması).
 * @param {string} type
 * @param {string} targetId
 * @param {string} recipientId
 * @returns {string | null}
 */
function buildNotificationDocId(type, targetId, recipientId) {
  const tid = String(targetId ?? '').trim()
  const rid = String(recipientId ?? '').trim()
  if (!tid || !rid) return null
  return `${sanitizeDocPart(type)}_${sanitizeDocPart(tid)}_${sanitizeDocPart(rid)}`
}

/**
 * @param {string} type
 * @param {string} targetId
 * @returns {string}
 */
function fanOutLeaseDocId(type, targetId) {
  return `${sanitizeDocPart(type)}_${sanitizeDocPart(targetId)}`
}

/**
 * Aynı hedef için fan-out yalnızca bir kez (paralel trigger / retry koruması).
 * @param {string} type
 * @param {string} targetId
 */
async function claimFanOutLease(type, targetId) {
  const db = getFirestore()
  const leaseId = fanOutLeaseDocId(type, targetId)
  const ref = db.doc(`notification_fanout/${leaseId}`)

  return db.runTransaction(async (transaction) => {
    const snap = await transaction.get(ref)

    if (snap.exists) {
      const status = String(snap.data()?.status ?? '')
      if (status === 'completed') {
        return { proceed: false, reason: 'already_completed' }
      }

      if (status === 'pending') {
        const startedAt = snap.data()?.startedAt
        const startedMs =
          startedAt && typeof startedAt.toMillis === 'function' ? startedAt.toMillis() : 0
        if (startedMs && Date.now() - startedMs < FANOUT_STALE_MS) {
          return { proceed: false, reason: 'in_progress' }
        }
      }
    }

    transaction.set(ref, {
      type,
      targetId,
      status: 'pending',
      startedAt: FieldValue.serverTimestamp(),
    })

    return { proceed: true }
  })
}

/**
 * @param {string} type
 * @param {string} targetId
 * @param {number} fanOutCount
 */
async function completeFanOutLease(type, targetId, fanOutCount) {
  const db = getFirestore()
  const leaseId = fanOutLeaseDocId(type, targetId)
  await db.doc(`notification_fanout/${leaseId}`).set(
    {
      type,
      targetId,
      status: 'completed',
      fanOutCount,
      completedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  )
}

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
 * targetId verilirse belge kimliği deterministiktir → aynı kullanıcı + hedef için tek kayıt.
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

      const docId = buildNotificationDocId(input.type, targetId, uid)
      const notifRef = docId
        ? db.collection('notifications').doc(docId)
        : db.collection('notifications').doc()

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

      batch.set(notifRef, docPayload)
      batchCount += 1
    }

    if (batchCount > 0) {
      await batch.commit()
      written += batchCount
    }

    lastDoc = snap.docs[snap.docs.length - 1]
    if (snap.size < FANOUT_PAGE_SIZE) break
  }

  return { written }
}

/**
 * @param {{
 *   targetId: string
 *   title: string
 *   message: string
 *   link?: string
 * }} input
 */
async function broadcastIntelNotification(input) {
  const targetId = String(input.targetId ?? '').trim()
  if (!targetId) return { skipped: true, reason: 'no_target_id' }

  const lease = await claimFanOutLease('INTEL', targetId)
  if (!lease.proceed) {
    logger.info('broadcastIntelNotification skipped', { targetId, reason: lease.reason })
    return { skipped: true, reason: lease.reason, targetId }
  }

  const title = String(input.title ?? 'Yeni İstihbarat').trim() || 'Yeni İstihbarat'
  const message = truncateText(input.message, 80)
  const link = String(input.link ?? '/istihbarat').trim() || '/istihbarat'

  const { written } = await fanOutInAppNotifications({
    type: 'INTEL',
    title,
    message,
    link,
    targetId,
    preferenceKey: 'intel',
  })

  await completeFanOutLease('INTEL', targetId, written)

  logger.info('broadcastIntelNotification', {
    targetId,
    fanOutCount: written,
    type: 'INTEL',
  })

  return { fanOutCount: written, type: 'INTEL', targetId }
}

/**
 * @param {{ postId: string, title: string, authorCallsign: string, authorId: string }} input
 */
async function broadcastForumPostNotification(input) {
  const postId = String(input.postId ?? '').trim()
  const authorId = String(input.authorId ?? '').trim()
  if (!postId) return { skipped: true, reason: 'no_post_id' }

  const lease = await claimFanOutLease('FORUM_POST', postId)
  if (!lease.proceed) {
    logger.info('broadcastForumPostNotification skipped', { postId, reason: lease.reason })
    return { skipped: true, reason: lease.reason, postId }
  }

  const postTitle = truncateText(input.title, 80)
  const callsign = String(input.authorCallsign ?? 'OPERATÖR').trim() || 'OPERATÖR'
  const link = buildForumPostLink(postId)
  const title = 'Yeni Brifing Paylaşımı'
  const message = `${postTitle} — ${callsign}`

  const { written } = await fanOutInAppNotifications({
    type: 'FORUM_POST',
    title,
    message,
    link,
    senderId: authorId,
    targetId: postId,
  })

  await completeFanOutLease('FORUM_POST', postId, written)

  logger.info('broadcastForumPostNotification', {
    postId,
    fanOutCount: written,
    type: 'FORUM_POST',
  })

  return { fanOutCount: written, type: 'FORUM_POST', postId }
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

  const itemId = event.params?.itemId ?? snap.id
  const headline = String(data.trTitle ?? data.enTitle ?? '').trim()
  if (!headline) return { skipped: true, reason: 'no_title' }

  return broadcastIntelNotification({
    targetId: itemId,
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
  buildNotificationDocId,
  fanOutInAppNotifications,
  broadcastIntelNotification,
  broadcastForumPostNotification,
  onNewsFeedItemCreatedHandler,
  onForumPostCreatedHandler,
}
