const { getMessaging } = require('firebase-admin/messaging')

/**
 * @param {Record<string, unknown>} fields
 * @returns {Record<string, string>}
 */
function toFcmDataPayload(fields) {
  /** @type {Record<string, string>} */
  const data = {}
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null) continue
    data[key] = String(value)
  }
  return data
}

/**
 * Data-only topic push (SW tek bildirim gösterir).
 * @param {string} topic
 * @param {{ type: string, title: string, message: string, link: string }} payload
 */
async function sendTopicDataPush(topic, payload) {
  const link = String(payload.link ?? '/dashboard').trim() || '/dashboard'
  return getMessaging().send({
    topic,
    data: toFcmDataPayload({
      type: payload.type,
      title: payload.title,
      message: payload.message,
      link,
    }),
    webpush: {
      headers: { Urgency: 'high' },
      fcmOptions: {
        link: link.startsWith('http') ? link : undefined,
      },
    },
  })
}

module.exports = {
  sendTopicDataPush,
  toFcmDataPayload,
}
