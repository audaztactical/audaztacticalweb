const { HttpsError } = require('firebase-functions/v2/https')
const { assertContentAdmin } = require('./adminAuth')
const { runVideoNewsIngest } = require('./videoNews')

/**
 * Callable: admin — YouTube RSS → video_news ingest (manuel tetik).
 * @param {import('firebase-functions/v2/https').CallableRequest} request
 */
async function triggerVideoNewsIngestHandler(request) {
  assertContentAdmin(request)

  try {
    const result = await runVideoNewsIngest()
    return {
      ok: true,
      written: result.written ?? 0,
      skipped: result.skipped ?? 0,
      fetched: result.fetched ?? 0,
      channels: result.channels ?? 0,
      channelResults: result.channelResults ?? [],
    }
  } catch (err) {
    throw new HttpsError(
      'internal',
      err instanceof Error ? err.message : 'Video ingest başarısız.',
    )
  }
}

module.exports = { triggerVideoNewsIngestHandler }
