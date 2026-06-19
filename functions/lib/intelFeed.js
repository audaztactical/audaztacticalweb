const crypto = require('crypto')
const Parser = require('rss-parser')
const { getFirestore, FieldValue, Timestamp } = require('firebase-admin/firestore')
const { translateToTurkish } = require('./translation')

const DEFAULT_RSS_URL =
  'https://www.defensenews.com/arc/outboundfeeds/rss/category/global/'
const DEFAULT_SOURCE_LABEL = 'Defense News'
const COLLECTION = 'news_feed'
const MAX_ITEMS = 10

const parser = new Parser({
  timeout: 20000,
  headers: {
    'User-Agent': 'AUDAZ-Tactical-Web-IntelBot/1.0 (+https://audaz-web.firebaseapp.com)',
    Accept: 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
  },
})

/**
 * Stable Firestore document id from article URL (dedup key).
 * @param {string} url
 */
function docIdFromUrl(url) {
  const normalized = String(url ?? '').trim().toLowerCase()
  if (!normalized) return null
  return crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 40)
}

/**
 * @param {import('rss-parser').Item} item
 */
function extractTags(item) {
  const raw = Array.isArray(item.categories) ? item.categories : []
  const tags = raw
    .map((c) => String(c ?? '').trim())
    .filter(Boolean)
    .slice(0, 6)

  if (tags.length) return tags
  return ['GLOBAL', 'INTEL']
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
 * @param {string} sourceLabel
 */
async function mapRssItemToFeedDoc(item, sourceLabel) {
  const enTitle = String(item.title ?? '').trim()
  const enSummary = extractSummary(item)
  const url = String(item.link ?? item.guid ?? '').trim()

  const [trTitle, trSummary] = await Promise.all([
    translateToTurkish(enTitle),
    translateToTurkish(enSummary),
  ])

  /** @type {Record<string, unknown>} */
  const payload = {
    source: sourceLabel,
    timestamp: FieldValue.serverTimestamp(),
    enTitle,
    trTitle,
    enSummary,
    trSummary,
    tags: extractTags(item),
    url,
    type: 'haber',
    public: true,
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
 * Fetch RSS, dedupe by URL hash, write new docs to news_feed.
 * @param {{ rssUrl?: string, sourceLabel?: string, maxItems?: number }} [options]
 */
async function runIntelFeedIngest(options = {}) {
  const rssUrl = String(options.rssUrl ?? process.env.INTEL_RSS_FEED_URL ?? DEFAULT_RSS_URL).trim()
  const sourceLabel = String(
    options.sourceLabel ?? process.env.INTEL_RSS_SOURCE_LABEL ?? DEFAULT_SOURCE_LABEL,
  ).trim()
  const maxItems = Math.min(20, Math.max(1, Number(options.maxItems) || MAX_ITEMS))

  const feed = await parser.parseURL(rssUrl)
  const items = (feed.items ?? []).slice(0, maxItems)

  const db = getFirestore()
  const col = db.collection(COLLECTION)

  let written = 0
  let skipped = 0
  let invalid = 0

  for (const item of items) {
    const url = String(item.link ?? item.guid ?? '').trim()
    const docId = docIdFromUrl(url)

    if (!docId || !String(item.title ?? '').trim()) {
      invalid += 1
      continue
    }

    const existing = await col.doc(docId).get()
    if (existing.exists) {
      skipped += 1
      continue
    }

    const payload = await mapRssItemToFeedDoc(item, sourceLabel)
    await col.doc(docId).set(payload, { merge: false })
    written += 1
  }

  return {
    rssUrl,
    sourceLabel,
    fetched: items.length,
    written,
    skipped,
    invalid,
  }
}

module.exports = {
  COLLECTION,
  DEFAULT_RSS_URL,
  docIdFromUrl,
  runIntelFeedIngest,
}
