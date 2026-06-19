const crypto = require('crypto')
const { getFirestore, FieldValue } = require('firebase-admin/firestore')
const { getMessaging } = require('firebase-admin/messaging')
const { HttpsError } = require('firebase-functions/v2/https')
const { logger } = require('firebase-functions')
const { assertContentAdmin } = require('./adminAuth')
const { FCM_TOPIC } = require('./localAlerts')

const MANUAL_SOURCE = 'AUDAZ KOMUTA MERKEZİ'
/** Eski news_feed etiketleriyle uyumluluk; artık yalnızca export / referans için. */
const MANUAL_TAGS = Object.freeze(['SİSTEM İKAZI', 'ACİL', 'MANUEL İKAZ'])
const SYSTEM_ALERTS_COLLECTION = 'system_alerts'
const BROADCASTS_COLLECTION = 'manual_alert_broadcasts'

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
      notification: {
        title: `🚨 ${title}`,
        body,
      },
      data: {
        type: 'MANDATORY_SYSTEM_ALERT',
        alertId: input.docId,
        title,
        message: body,
      },
      android: {
        priority: 'high',
      },
      apns: {
        headers: {
          'apns-priority': '10',
        },
        payload: {
          aps: {
            sound: 'default',
            contentAvailable: true,
          },
        },
      },
    })
    return { sent: true, messageId }
  } catch (err) {
    logger.error('sendManualAlert FCM failed', { docId: input.docId, err })
    return { sent: false, reason: 'fcm_error' }
  }
}

/**
 * Callable: admin manual broadcast → system_alerts + arşiv + FCM.
 * @param {import('firebase-functions/v2/https').CallableRequest} request
 */
async function sendManualAlertHandler(request) {
  try {
    assertContentAdmin(request)

    const title = String(request.data?.title ?? '').trim()
    const message = String(request.data?.message ?? '').trim()
    const skipWrite = Boolean(request.data?.skipWrite)
    const presetDocId = String(request.data?.docId ?? '').trim()

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

    const docId = skipWrite && presetDocId ? presetDocId : manualAlertDocId(title, message)
    const db = getFirestore()
    const createdBy = String(request.auth?.uid ?? '').trim()

    if (!skipWrite) {
      await db.collection(SYSTEM_ALERTS_COLLECTION).doc(docId).set(
        {
          title,
          message,
          active: true,
          mandatory: true,
          source: MANUAL_SOURCE,
          createdAt: FieldValue.serverTimestamp(),
          createdBy,
        },
        { merge: false },
      )
    }

    const fcmResult = await sendManualAlertFcm({ title, message, docId })

    if (!skipWrite) {
      await db.collection(BROADCASTS_COLLECTION).doc(docId).set(
        {
          title,
          message,
          publishedAt: FieldValue.serverTimestamp(),
          publishedAtMs: Date.now(),
          publishedByUid: createdBy,
          publishedByEmail: String(request.auth?.token?.email ?? '').trim(),
          systemAlertId: docId,
          fcmSent: fcmResult.sent === true,
          source: MANUAL_SOURCE,
          kind: 'admin_manual',
        },
        { merge: false },
      )
    }

    if (!fcmResult.sent) {
      logger.warn('sendManualAlert: FCM başarısız', { docId, skipWrite, fcmResult })
    }

    return {
      success: true,
      docId,
      topic: FCM_TOPIC,
      fcmSent: fcmResult.sent === true,
      messageId: fcmResult.messageId ?? null,
      mandatoryInApp: true,
    }
  } catch (err) {
    if (err instanceof HttpsError) throw err
    logger.error('sendManualAlert failed', err)
    throw new HttpsError(
      'internal',
      err instanceof Error ? err.message : 'İkaz gönderilemedi.',
    )
  }
}

/**
 * Callable: yalnızca FCM push (Firestore yazımı istemci tarafında).
 * @param {import('firebase-functions/v2/https').CallableRequest} request
 */
async function pushManualAlertFcmHandler(request) {
  try {
    assertContentAdmin(request)

    const title = String(request.data?.title ?? '').trim()
    const message = String(request.data?.message ?? '').trim()
    const docId = String(request.data?.docId ?? '').trim()

    if (!title || !message || !docId) {
      throw new HttpsError('invalid-argument', 'title, message ve docId gerekli.')
    }

    const fcmResult = await sendManualAlertFcm({ title, message, docId })

    return {
      success: true,
      docId,
      fcmSent: fcmResult.sent === true,
      topic: FCM_TOPIC,
    }
  } catch (err) {
    if (err instanceof HttpsError) throw err
    logger.error('pushManualAlertFcm failed', err)
    throw new HttpsError(
      'internal',
      err instanceof Error ? err.message : 'Push gönderilemedi.',
    )
  }
}

module.exports = {
  MANUAL_SOURCE,
  MANUAL_TAGS,
  SYSTEM_ALERTS_COLLECTION,
  BROADCASTS_COLLECTION,
  sendManualAlertHandler,
  sendManualAlertFcm,
  pushManualAlertFcmHandler,
  manualAlertDocId,
}
