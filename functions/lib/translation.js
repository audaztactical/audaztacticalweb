const { Translate } = require('@google-cloud/translate').v2
const { logger } = require('firebase-functions')

const TR_FAIL_PREFIX = '[TR_FAIL] '

/** @type {Translate | null} */
let translateClient = null

/**
 * Lazy init — ADC on Cloud Functions; local emulator may lack credentials.
 * @returns {Translate | null}
 */
function getTranslateClient() {
  if (translateClient) return translateClient
  try {
    translateClient = new Translate()
    return translateClient
  } catch (err) {
    logger.warn('Google Translate client could not be initialized', err)
    return null
  }
}

/**
 * English → Turkish via Google Cloud Translation API (Basic v2).
 * On failure, returns `[TR_FAIL]` + original text so RSS ingest continues.
 *
 * @param {string} enText
 * @returns {Promise<string>}
 */
async function translateToTurkish(enText) {
  const text = String(enText ?? '').trim()
  if (!text) return ''

  const client = getTranslateClient()
  if (!client) {
    logger.warn('Translation skipped — no Translate client (missing ADC?)')
    return `${TR_FAIL_PREFIX}${text}`
  }

  try {
    let [translations] = await client.translate(text, 'tr')
    translations = Array.isArray(translations) ? translations : [translations]
    const result = String(translations[0] ?? '').trim()
    return result || `${TR_FAIL_PREFIX}${text}`
  } catch (error) {
    logger.error('Translation Error:', error)
    return `${TR_FAIL_PREFIX}${text}`
  }
}

module.exports = {
  TR_FAIL_PREFIX,
  translateToTurkish,
}
