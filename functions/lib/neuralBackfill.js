/**
 * Operatör Beyni — admin backfill (callable).
 * Çekirdek: neuralBuild.buildUserStateFromSources
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { logger } = require('firebase-functions')
const { assertContentAdmin } = require('./adminAuth')
const { emptyStoredState } = require('./neural/neuralEngine')
const {
  buildUserStateFromSources,
  collectUserSourceEvents,
} = require('./neuralBuild')

/**
 * @param {string} uid
 * @param {{ dryRun?: boolean }} [opts]
 */
async function runNeuralBackfillForUser(uid, opts = {}) {
  const dryRun = opts.dryRun !== false
  return buildUserStateFromSources(uid, { dryRun })
}

const neuralBackfillUser = onCall(
  {
    memory: '512MiB',
    timeoutSeconds: 300,
    cors: true,
  },
  async (request) => {
    assertContentAdmin(request)
    const uid = String(request.data?.uid || '')
    if (!uid) throw new HttpsError('invalid-argument', 'uid gerekli')
    const dryRun = request.data?.dryRun !== false
    try {
      return await runNeuralBackfillForUser(uid, { dryRun })
    } catch (err) {
      logger.error('neural_backfill_failed', {
        message: err instanceof Error ? err.message : String(err),
      })
      throw new HttpsError('internal', 'Backfill başarısız')
    }
  },
)

module.exports = {
  neuralBackfillUser,
  runNeuralBackfillForUser,
  collectUserSourceEvents,
  emptyStoredState,
  buildUserStateFromSources,
}
