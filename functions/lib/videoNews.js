const Parser = require('rss-parser')
const { getFirestore, FieldValue, Timestamp } = require('firebase-admin/firestore')
const { getMessaging } = require('firebase-admin/messaging')
const { docIdFromUrl } = require('./intelFeed')

/** @typedef {{ name: string, url: string }} VideoNewsChannel */

/** @type {VideoNewsChannel[]} */
const TARGET_CHANNELS = [
  {
    name: 'TASK & PURPOSE',
    url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCSq3p5NKEtyp5Rjd4ctiEbg',
  },
  {
    name: 'T.REX ARMS',
    url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCU-ljC8EvKZFhJ-pct_5rMQ',
  },
  {
    name: 'GBRS Group',
    url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCJxCLIuutemQ2D71hD3c5ug',
  },
  {
    name: 'Polenar Tactical',
    url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC-24483CtyVfhJ-XxRfPr8Q',
  },
  {
    name: 'CarryTrainer',
    url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCP09pijua2ypZguXBA7FnQA',
  },
  {
    name: 'SPARTAN117GW',
    url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC1gt5hr3hBRMGmkfYJT56Lw',
  },
]

const COLLECTION = 'video_news'
const MAX_ITEMS_PER_CHANNEL = 10
const FCM_TOPIC_GLOBAL_INTEL = 'global_intel'

const parser = new Parser({
  timeout: 20000,
  headers: {
    'User-Agent': 'AUDAZ-Tactical-Web-VideoBot/1.0 (+https://audaz-web.firebaseapp.com)',
    Accept: 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
  },
  customFields: {
    item: [
      ['media:content', 'mediaContent', { keepArray: true }],
      ['media:thumbnail', 'mediaThumbnail', { keepArray: true }],
      ['media:group', 'mediaGroup', { keepArray: true }],
      ['yt:videoId', 'videoId'],
    ],
  },
})

/**
 * @param {string} rssUrl
 */
async function logRawRssPreview(rssUrl) {
  try {
    const res = await fetch(rssUrl, {
      headers: {
        'User-Agent': 'AUDAZ-Tactical-Web-VideoBot/1.0 (+https://audaz-web.firebaseapp.com)',
        Accept: 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
      },
      signal: AbortSignal.timeout(15000),
    })
    const text = await res.text()
    console.log('[VIDEO BOT] Ham HTTP yanıtı:', {
      status: res.status,
      contentType: res.headers.get('content-type'),
      bodyLength: text.length,
      preview: text.slice(0, 600).replace(/\s+/g, ' '),
    })
  } catch (previewErr) {
    console.error(
      '[VIDEO BOT] Ham RSS önizlemesi alınamadı:',
      previewErr instanceof Error ? previewErr.message : previewErr,
    )
  }
}

/**
 * @param {import('rss-parser').Item} item
 */
function extractDescription(item) {
  const group = item.mediaGroup?.[0]
  const ytDesc = group?.['media:description']?.[0]
  if (typeof ytDesc === 'string' && ytDesc.trim()) {
    return ytDesc.trim().slice(0, 800)
  }

  const snippet = String(item.contentSnippet ?? '').trim()
  if (snippet) return snippet.slice(0, 800)

  const content = String(item.content ?? item.summary ?? '').trim()
  if (!content) return ''

  return content
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 800)
}

/**
 * @param {import('rss-parser').Item} item
 */
function extractThumbnail(item) {
  const group = item.mediaGroup?.[0]
  const ytThumb = group?.['media:thumbnail']?.[0]
  if (ytThumb?.$?.url) return String(ytThumb.$.url).trim()

  const thumb = item.mediaThumbnail?.[0]
  if (thumb?.$?.url) return String(thumb.$.url).trim()

  const media = item.mediaContent?.[0]
  if (media?.$?.url && String(media.$.medium ?? '').toLowerCase() === 'image') {
    return String(media.$.url).trim()
  }

  const videoId = String(item.videoId ?? '').trim()
  if (videoId) return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`

  const enclosure = item.enclosure
  if (enclosure?.url && String(enclosure.type ?? '').startsWith('image/')) {
    return String(enclosure.url).trim()
  }

  return ''
}

/**
 * @param {import('rss-parser').Item} item
 */
function extractPublishDate(item) {
  const raw = item.isoDate ?? item.pubDate
  if (!raw) return null
  const parsed = Date.parse(String(raw))
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return Timestamp.fromDate(new Date(parsed))
}

/**
 * @param {import('rss-parser').Item} item
 * @param {string} origin
 */
function mapVideoItemToDoc(item, origin) {
  const title = String(item.title ?? '').trim()
  const url = String(item.link ?? item.guid ?? '').trim()
  const description = extractDescription(item)
  const thumbnail = extractThumbnail(item)
  const videoId = String(item.videoId ?? '').trim()
  const publishDate = extractPublishDate(item)

  /** @type {Record<string, unknown>} */
  const payload = {
    title,
    url,
    origin,
    timestamp: FieldValue.serverTimestamp(),
  }

  if (publishDate) {
    payload.publishDate = publishDate
  } else {
    console.warn('[VIDEO BOT] publishDate eksik, RSS tarihi bulunamadı:', { title, url })
    payload.publishDate = Timestamp.fromDate(new Date())
  }

  if (description) payload.description = description
  if (thumbnail) payload.thumbnail = thumbnail
  if (videoId) payload.videoId = videoId

  return payload
}

/**
 * @param {number} newVideosCount
 */
async function sendGlobalIntelVideoAlert(newVideosCount) {
  if (newVideosCount <= 0) {
    return { sent: false, reason: 'no_new_videos' }
  }

  try {
    const messageId = await getMessaging().send({
      notification: {
        title: '⚠️ KÜRESEL İSTİHBARAT AĞI',
        body: `Sisteme ${newVideosCount} adet yeni taktiksel video analizi eklendi.`,
      },
      topic: FCM_TOPIC_GLOBAL_INTEL,
      data: {
        type: 'VIDEO_INTEL',
        count: String(newVideosCount),
      },
    })
    return { sent: true, messageId }
  } catch (err) {
    console.error('[VIDEO BOT] FCM global_intel gönderimi başarısız:', err)
    return { sent: false, reason: 'fcm_error' }
  }
}

/**
 * @param {VideoNewsChannel} channel
 * @param {import('firebase-admin/firestore').CollectionReference} col
 * @param {number} maxItems
 */
async function ingestChannelFeed(channel, col, maxItems) {
  const { name, url } = channel
  console.log(`[VIDEO BOT] ── Kanal taranıyor: ${name}`)
  console.log('[VIDEO BOT] Hedef URL:', url)

  let feed
  try {
    feed = await parser.parseURL(url)
  } catch (parseErr) {
    console.error(
      `[VIDEO BOT] HATA - ${name} RSS parse başarısız:`,
      parseErr instanceof Error ? parseErr.message : parseErr,
      parseErr,
    )
    await logRawRssPreview(url)
    return {
      channel: name,
      rssUrl: url,
      fetched: 0,
      written: 0,
      skipped: 0,
      invalid: 0,
      error: parseErr instanceof Error ? parseErr.message : 'parse_failed',
    }
  }

  const rawCount = feed?.items?.length ?? 0
  console.log(`[VIDEO BOT] ${name}: Hedefte ${rawCount} adet veri bulundu.`)

  if (feed?.title || feed?.link) {
    console.log(`[VIDEO BOT] ${name} feed meta:`, {
      title: feed.title ?? null,
      link: feed.link ?? null,
    })
  }

  if (!feed?.items || rawCount === 0) {
    console.warn(`[VIDEO BOT] DİKKAT: ${name} RSS kaynağı boş döndü veya parse edilemedi.`)
    await logRawRssPreview(url)
    return {
      channel: name,
      rssUrl: url,
      fetched: 0,
      written: 0,
      skipped: 0,
      invalid: 0,
      warning: 'empty_feed',
    }
  }

  const items = feed.items.slice(0, maxItems)
  console.log(`[VIDEO BOT] ${name}: İşlenecek kayıt (limit sonrası): ${items.length}`)

  if (items[0]) {
    const sample = items[0]
    console.log(`[VIDEO BOT] ${name} ilk kayıt:`, {
      title: sample.title ?? null,
      link: sample.link ?? null,
      videoId: sample.videoId ?? null,
      hasThumbnail: Boolean(extractThumbnail(sample)),
    })
  }

  let written = 0
  let skipped = 0
  let invalid = 0

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i]
    const itemUrl = String(item.link ?? item.guid ?? '').trim()
    const docId = docIdFromUrl(itemUrl)
    const title = String(item.title ?? '').trim()

    if (!docId || !title || !itemUrl) {
      invalid += 1
      console.warn(`[VIDEO BOT] ${name} GEÇERSİZ kayıt:`, {
        index: i,
        title: title || '(boş)',
        url: itemUrl || '(boş)',
      })
      continue
    }

    const existing = await col.doc(docId).get()
    if (existing.exists) {
      skipped += 1
      console.log(`[VIDEO BOT] ${name} ATLANDI (mükerrer) [${i + 1}/${items.length}]: ${docId}`)
      continue
    }

    const payload = mapVideoItemToDoc(item, name)
    try {
      await col.doc(docId).set(payload, { merge: false })
      written += 1
      console.log(`[VIDEO BOT] ${name} YAZILDI [${written}] ${docId} — ${title.slice(0, 80)}`)
    } catch (writeErr) {
      console.error(
        `[VIDEO BOT] ${name} YAZIM HATASI [${i + 1}/${items.length}]:`,
        writeErr instanceof Error ? writeErr.message : writeErr,
        writeErr,
      )
    }
  }

  const channelSummary = {
    channel: name,
    rssUrl: url,
    fetched: items.length,
    written,
    skipped,
    invalid,
  }

  console.log(`[VIDEO BOT] ${name} kanal özeti:`, channelSummary)
  return channelSummary
}

/**
 * Fetch all tactical YouTube channel RSS feeds → Firestore video_news.
 * @param {{ maxItemsPerChannel?: number, channels?: VideoNewsChannel[] }} [options]
 */
async function runVideoNewsIngest(options = {}) {
  console.log('[VIDEO BOT] Operasyon başladı. Hedef RSS taranıyor...')

  const channels = options.channels ?? TARGET_CHANNELS
  const maxItemsPerChannel = Math.min(
    30,
    Math.max(1, Number(options.maxItemsPerChannel) || MAX_ITEMS_PER_CHANNEL),
  )

  console.log('[VIDEO BOT] Hedef kanal sayısı:', channels.length)
  console.log('[VIDEO BOT] Kanal başına maksimum kayıt:', maxItemsPerChannel)

  try {
    const db = getFirestore()
    const col = db.collection(COLLECTION)

    /** @type {Awaited<ReturnType<typeof ingestChannelFeed>>[]} */
    const channelResults = []

    for (const channel of channels) {
      const result = await ingestChannelFeed(channel, col, maxItemsPerChannel)
      channelResults.push(result)
    }

    const summary = {
      channels: channels.length,
      maxItemsPerChannel,
      fetched: channelResults.reduce((n, r) => n + (r.fetched ?? 0), 0),
      written: channelResults.reduce((n, r) => n + (r.written ?? 0), 0),
      skipped: channelResults.reduce((n, r) => n + (r.skipped ?? 0), 0),
      invalid: channelResults.reduce((n, r) => n + (r.invalid ?? 0), 0),
      channelResults,
    }

    const newVideosCount = summary.written
    let fcmSent = false

    if (newVideosCount > 0) {
      const fcmResult = await sendGlobalIntelVideoAlert(newVideosCount)
      fcmSent = fcmResult.sent === true
      if (fcmSent) {
        console.log(
          `[VIDEO BOT] Erken Uyarı Sistemi tetiklendi. ${newVideosCount} bildirim gönderildi.`,
        )
      }
    }

    summary.newVideosCount = newVideosCount
    summary.fcmSent = fcmSent
    summary.fcmTopic = FCM_TOPIC_GLOBAL_INTEL

    console.log('[VIDEO BOT] Operasyon tamamlandı:', {
      channels: summary.channels,
      fetched: summary.fetched,
      written: summary.written,
      skipped: summary.skipped,
      invalid: summary.invalid,
    })

    if (summary.written === 0 && summary.skipped === 0 && summary.fetched === 0) {
      console.warn('[VIDEO BOT] DİKKAT: Hiçbir kanaldan veri alınamadı.')
    } else if (summary.written === 0 && summary.skipped > 0) {
      console.log('[VIDEO BOT] Yeni kayıt yok; tüm öğeler zaten mevcut (mükerrer).')
    }

    return summary
  } catch (error) {
    console.error(
      '[VIDEO BOT] HATA - Sızma başarısız:',
      error instanceof Error ? error.message : error,
      error,
    )
    throw error
  }
}

module.exports = {
  COLLECTION,
  TARGET_CHANNELS,
  MAX_ITEMS_PER_CHANNEL,
  FCM_TOPIC_GLOBAL_INTEL,
  runVideoNewsIngest,
  sendGlobalIntelVideoAlert,
}
