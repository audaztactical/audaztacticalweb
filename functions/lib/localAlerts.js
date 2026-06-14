const Parser = require('rss-parser')
const { getFirestore, FieldValue, Timestamp } = require('firebase-admin/firestore')
const { getMessaging } = require('firebase-admin/messaging')
const { logger } = require('firebase-functions')
const { COLLECTION, docIdFromUrl } = require('./intelFeed')

const DEFAULT_RSS_URL = 'https://www.trthaber.com/sondakika_articles.rss'
const DEFAULT_SOURCE_LABEL = 'TRT HABER SON DAKİKA'
const FCM_TOPIC = 'asayis_ikaz'
const LOCAL_ALERT_PREFIX = '[LOCAL ALERT] '
const MAX_SCAN_ITEMS = 40

/** @type {string[]} */
const TACTICAL_KEYWORDS = [
  'saldırı',
  'çatışma',
  'silahlı',
  'patlama',
  'rehine',
  'terör',
  'operasyon',
  'suikast',
  'baskın',
  'şehit',
]

const parser = new Parser({
  timeout: 20000,
  headers: {
    'User-Agent': 'AUDAZ-Tactical-Web-AlertBot/1.0 (+https://audaz-web.firebaseapp.com)',
    Accept: 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
  },
})

/**
 * @param {string} text
 */
function normalizeTr(text) {
  return String(text ?? '').toLocaleLowerCase('tr-TR')
}

/**
 * @param {import('rss-parser').Item} item
 */
function extractSummary(item) {
  const snippet = String(item.contentSnippet ?? '').trim()
  if (snippet) return snippet.slice(0, 1200)

  const content = String(item.content ?? item.summary ?? '').trim()
  if (!content) return ''

  return content
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 1200)
}

/**
 * @param {import('rss-parser').Item} item
 */
function matchesTacticalKeywords(item) {
  const haystack = normalizeTr(`${item.title ?? ''} ${extractSummary(item)}`)
  return TACTICAL_KEYWORDS.some((kw) => haystack.includes(normalizeTr(kw)))
}

/**
 * @param {import('rss-parser').Item} item
 * @param {string} sourceLabel
 */
function mapAlertItemToFeedDoc(item, sourceLabel) {
  const trTitle = String(item.title ?? '').trim()
  const trSummary = extractSummary(item)
  const url = String(item.link ?? item.guid ?? '').trim()

  /** @type {Record<string, unknown>} */
  const payload = {
    source: sourceLabel,
    timestamp: FieldValue.serverTimestamp(),
    trTitle,
    enTitle: `${LOCAL_ALERT_PREFIX}${trTitle}`,
    trSummary,
    enSummary: `${LOCAL_ALERT_PREFIX}${trSummary}`,
    tags: ['ASAYİŞ', 'SON DAKİKA', 'ACİL'],
    url,
    isAlert: true,
  }

  if (item.isoDate || item.pubDate) {
    const parsed = Date.parse(String(item.isoDate ?? item.pubDate))
    if (Number.isFinite(parsed) && parsed > 0) {
      payload.publishedAt = Timestamp.fromMillis(parsed)
    }
  }

  return payload
}

/**
 * @param {{ trTitle: string, url?: string, docId: string }} input
 */
async function sendLocalAlertFcm(input) {
  const body = String(input.trTitle ?? '').trim().slice(0, 240)
  if (!body) return { sent: false, reason: 'empty_body' }

  try {
    const messageId = await getMessaging().send({
      topic: FCM_TOPIC,
      notification: {
        title: '[ AUDAZ İKAZ ] SİSTEM UYARISI',
        body,
      },
      data: {
        type: 'LOCAL_ALERT',
        url: String(input.url ?? ''),
        docId: input.docId,
      },
    })
    return { sent: true, messageId }
  } catch (err) {
    logger.error('FCM local alert send failed', { docId: input.docId, err })
    return { sent: false, reason: 'fcm_error' }
  }
}

/**
 * Fetch TR son dakika RSS, filter by tactical keywords, write alerts + FCM.
 * @param {{ rssUrl?: string, sourceLabel?: string, maxScan?: number }} [options]
 */
async function runLocalAlertsIngest(options = {}) {
  const rssUrl = String(
    options.rssUrl ?? process.env.LOCAL_ALERTS_RSS_URL ?? DEFAULT_RSS_URL,
  ).trim()
  const sourceLabel = String(
    options.sourceLabel ?? process.env.LOCAL_ALERTS_SOURCE_LABEL ?? DEFAULT_SOURCE_LABEL,
  ).trim()
  const maxScan = Math.min(80, Math.max(1, Number(options.maxScan) || MAX_SCAN_ITEMS))

  const feed = await parser.parseURL(rssUrl)
  const items = (feed.items ?? []).slice(0, maxScan)

  const db = getFirestore()
  const col = db.collection(COLLECTION)

  let scanned = items.length
  let matched = 0
  let written = 0
  let skipped = 0
  let invalid = 0
  let fcmSent = 0
  let fcmFailed = 0

  for (const item of items) {
    if (!matchesTacticalKeywords(item)) continue
    matched += 1

    const url = String(item.link ?? item.guid ?? '').trim()
    const docId = docIdFromUrl(url)
    const trTitle = String(item.title ?? '').trim()

    if (!docId || !trTitle) {
      invalid += 1
      continue
    }

    const existing = await col.doc(docId).get()
    if (existing.exists) {
      skipped += 1
      continue
    }

    const payload = mapAlertItemToFeedDoc(item, sourceLabel)
    await col.doc(docId).set(payload, { merge: false })
    written += 1

    const fcmResult = await sendLocalAlertFcm({ trTitle, url, docId })
    if (fcmResult.sent) fcmSent += 1
    else fcmFailed += 1
  }

  return {
    rssUrl,
    sourceLabel,
    scanned,
    matched,
    written,
    skipped,
    invalid,
    fcmSent,
    fcmFailed,
    fcmTopic: FCM_TOPIC,
  }
}

module.exports = {
  TACTICAL_KEYWORDS,
  FCM_TOPIC,
  DEFAULT_RSS_URL,
  runLocalAlertsIngest,
  matchesTacticalKeywords,
}
