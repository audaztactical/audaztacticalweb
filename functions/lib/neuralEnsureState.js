/**
 * Operatör Beyni — oturum sahibi için ihtiyaç anında state (callable).
 * uid parametresi YOK; yalnızca request.auth.uid.
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { logger } = require('firebase-functions')
const { getFirestore } = require('firebase-admin/firestore')
const {
  needsFullBuild,
  ensureFullUserState,
  checkEnsureCooldown,
  touchEnsureMeta,
} = require('./neuralBuild')

/**
 * @param {string} uid — mutlaka auth.uid
 */
async function runNeuralEnsureForCaller(uid) {
  const db = getFirestore()
  const stateRef = db.collection('users').doc(uid).collection('neural').doc('state')
  const snap = await stateRef.get()

  if (snap.exists && !needsFullBuild(snap.data())) {
    return {
      status: 'exists',
      eventCount: Number(snap.data()?.eventCount) || 0,
    }
  }

  const cool = await checkEnsureCooldown(uid)
  if (!cool.allowed) {
    logger.info('neural_ensure_rate_limited', {})
    const again = await stateRef.get()
    return {
      status: again.exists && !needsFullBuild(again.data()) ? 'exists' : 'rate_limited',
      eventCount: Number(again.data()?.eventCount) || 0,
    }
  }

  await touchEnsureMeta(uid)

  const result = await ensureFullUserState(uid)
  return {
    status: result.status === 'exists' ? 'exists' : 'built',
    eventCount: result.eventCount,
  }
}

const neuralEnsureState = onCall(
  {
    memory: '512MiB',
    timeoutSeconds: 300,
    cors: true,
  },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Oturum gerekli')
    }
    // data.uid yok sayılır — yalnızca auth
    const uid = request.auth.uid
    try {
      return await runNeuralEnsureForCaller(uid)
    } catch (err) {
      if (err instanceof HttpsError) throw err
      logger.error('neural_ensure_failed', {
        message: err instanceof Error ? err.message : String(err),
      })
      throw new HttpsError('internal', 'State kurulumu başarısız')
    }
  },
)

module.exports = {
  neuralEnsureState,
  runNeuralEnsureForCaller,
}
