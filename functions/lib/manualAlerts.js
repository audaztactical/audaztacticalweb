const crypto = require('crypto')
const { getFirestore, FieldValue } = require('firebase-admin/firestore')
const { getMessaging } = require('firebase-admin/messaging')
const { HttpsError } = require('firebase-functions/v2/https')
const { logger } = require('firebase-functions')
const { assertContentAdmin } = require('./adminAuth')
const { COLLECTION } = require('./intelFeed')
const { FCM_TOPIC } = require('./localAlerts')

const MANUAL_SOURCE = 'AUDAZ KOMUTA MERKEZİ'
const MANUAL_TAGS = ['SİSTEM İKAZI', 'ACİL']

/**
 * @param {string} title
 * @param {string} message
 */
function manualAlertDocId(title, message) {
  const seed = `${title}|${message}|${Date.now()}|${crypto.randomBytes(8).toString('hex')}`
  return `manual_${crypto.createHash('sha256').update(seed).digest('hex').slice(0, 32)}`
}

/**
 * @param {{ title: string, message: string, docId: string }} input
 */
async function sendManualAlertFcm(input) {
  const title = String(input.title ?? '').trim()
  const body = String(input.message ?? '').trim().slice(0, 500)

  if (!title || !body) {
    return { sent: false, reason: 'empty_payload' }
  }

  try {
    const messageId = await getMessaging().send({
      topic: FCM_TOPIC,
      notification: { title, body },
      data: {
        type: 'MANUAL_ALERT',
        docId: input.docId,
      },
    })
    return { sent: true, messageId }
  } catch (err) {
    logger.error('sendManualAlert FCM failed', { docId: input.docId, err })
    return { sent: false, reason: 'fcm_error' }
  }
}

/**
 * Callable: admin manual broadcast → news_feed + asayis_ikaz FCM topic.
 * @param {import('firebase-functions/v2/https').CallableRequest} request
 */
async function sendManualAlertHandler(request) {
  assertContentAdmin(request)

  const title = String(request.data?.title ?? '').trim()
  const message = String(request.data?.message ?? '').trim()

  if (!title) {
    throw new HttpsError('invalid-argument', 'İkaz başlığı gerekli.')
  }
  if (!message) {
    throw new HttpsError('invalid-argument', 'İkaz mesajı gerekli.')
  }
  if (title.length > 200) {
    throw new HttpsError('invalid-argument', 'Başlık en fazla 200 karakter olabilir.')
  }
  if (message.length > 2000) {
    throw new HttpsError('invalid-argument', 'Mesaj en fazla 2000 karakter olabilir.')
  }

  const docId = manualAlertDocId(title, message)
  const db = getFirestore()
  const ref = db.collection(COLLECTION).doc(docId)

  /** @type {Record<string, unknown>} */
  const payload = {
    source: MANUAL_SOURCE,
    trTitle: title,
    trSummary: message,
    tags: MANUAL_TAGS,
    isAlert: true,
    timestamp: FieldValue.serverTimestamp(),
  }

  await ref.set(payload, { merge: false })

  const fcmResult = await sendManualAlertFcm({ title, message, docId })

  if (!fcmResult.sent) {
    logger.warn('sendManualAlert: feed written but FCM failed', { docId, fcmResult })
    throw new HttpsError(
      'internal',
      'İkaz kaydı oluşturuldu ancak push bildirimi gönderilemedi.',
    )
  }

  return {
    success: true,
    docId,
    topic: FCM_TOPIC,
    messageId: fcmResult.messageId,
  }
}

module.exports = {
  MANUAL_SOURCE,
  MANUAL_TAGS,
  sendManualAlertHandler,
  sendManualAlertFcm,
  manualAlertDocId,
}
