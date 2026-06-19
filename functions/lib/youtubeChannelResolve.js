const { HttpsError } = require('firebase-functions/v2/https')
const { assertContentAdmin } = require('./adminAuth')

const USER_AGENT =
  'Mozilla/5.0 (compatible; AudazTactical/1.0; +https://audaz-web.firebaseapp.com)'

/**
 * @param {string} input
 */
function parseChannelIdFromInput(input) {
  const s = String(input ?? '').trim()
  if (!s) return ''

  const fromQuery = s.match(/[?&]channel_id=([A-Za-z0-9_-]+)/i)
  if (fromQuery?.[1]) return fromQuery[1]

  const fromPath = s.match(/youtube\.com\/channel\/([A-Za-z0-9_-]+)/i)
  if (fromPath?.[1]) return fromPath[1]

  if (/^UC[\w-]{10,}$/i.test(s)) return s

  return ''
}

/**
 * @param {string} input
 */
function parseHandleFromInput(input) {
  const s = String(input ?? '').trim()
  if (!s) return ''

  const fromUrl = s.match(/youtube\.com\/@([A-Za-z0-9._-]+)/i)
  if (fromUrl?.[1]) return fromUrl[1]

  const fromAt = s.match(/^@([A-Za-z0-9._-]+)$/)
  if (fromAt?.[1]) return fromAt[1]

  if (/^[A-Za-z0-9._-]{3,}$/.test(s) && !s.startsWith('UC')) return s

  return ''
}

/**
 * @param {string} html
 */
function extractChannelIdFromHtml(html) {
  const canonical = html.match(
    /<link\s+rel="canonical"\s+href="https:\/\/www\.youtube\.com\/channel\/(UC[A-Za-z0-9_-]+)"/i,
  )
  if (canonical?.[1]) return canonical[1]

  const ogUrl = html.match(
    /property="og:url"\s+content="https:\/\/www\.youtube\.com\/channel\/(UC[A-Za-z0-9_-]+)"/i,
  )
  if (ogUrl?.[1]) return ogUrl[1]

  const metaRenderer = html.match(/channelMetadataRenderer[\s\S]{0,400}?"externalId":"(UC[^"]+)"/)
  if (metaRenderer?.[1]) return metaRenderer[1]

  /** @type {Record<string, number>} */
  const counts = {}
  for (const m of html.matchAll(/youtube\.com\/channel\/(UC[A-Za-z0-9_-]+)/gi)) {
    counts[m[1]] = (counts[m[1]] ?? 0) + 1
  }
  const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1])
  if (ranked[0]?.[0]) return ranked[0][0]

  const first = html.match(/"channelId":"(UC[^"]+)"/)
  if (first?.[1]) return first[1]

  return ''
}

/**
 * @param {string} handle
 */
async function resolveChannelIdFromHandle(handle) {
  const h = String(handle ?? '').trim().replace(/^@/, '')
  if (!h) {
    throw new HttpsError('invalid-argument', 'YouTube @handle boş.')
  }

  const urls = [`https://www.youtube.com/@${h}`, `https://www.youtube.com/@${h}/about`]

  for (const url of urls) {
    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    })
    if (!res.ok) continue

    const html = await res.text()
    const channelId = extractChannelIdFromHtml(html)
    if (channelId) return channelId
  }

  throw new HttpsError(
    'not-found',
    'YouTube kanalı bulunamadı. @handle yerine kanal sayfasından UC… kimliğini deneyin.',
  )
}

/**
 * @param {import('firebase-functions/v2/https').CallableRequest} request
 */
async function resolveYoutubeChannelInputHandler(request) {
  assertContentAdmin(request)

  const input = String(request.data?.input ?? '').trim()
  if (!input) {
    throw new HttpsError('invalid-argument', 'Kanal URL veya kimliği gerekli.')
  }

  const directId = parseChannelIdFromInput(input)
  if (directId) {
    return {
      channelId: directId,
      feedUrl: `https://www.youtube.com/feeds/videos.xml?channel_id=${directId}`,
      source: 'channel_id',
    }
  }

  const handle = parseHandleFromInput(input)
  if (!handle) {
    throw new HttpsError(
      'invalid-argument',
      'Geçerli format: @ProjectGecko, youtube.com/@ProjectGecko veya UC… kanal kimliği.',
    )
  }

  const channelId = await resolveChannelIdFromHandle(handle)
  return {
    channelId,
    feedUrl: `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`,
    handle,
    source: 'handle',
  }
}

module.exports = {
  resolveYoutubeChannelInputHandler,
  parseChannelIdFromInput,
  parseHandleFromInput,
}
