const { getFirestore, FieldValue } = require('firebase-admin/firestore')
const { HttpsError } = require('firebase-functions/v2/https')
const { logger } = require('firebase-functions')

/** @readonly */
const ACCESS_PLANS = new Set(['premium', 'pro_instructor'])

/**
 * @param {string} raw
 */
function normalizeAccessCode(raw) {
  return String(raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
}

/**
 * @param {string} plan
 */
function roleForPlan(plan) {
  if (plan === 'pro_instructor') return 'instructor'
  if (plan === 'premium') return 'premium_member'
  return null
}

/**
 * @param {FirebaseFirestore.Timestamp | null | undefined} expiresAt
 */
function isExpired(expiresAt) {
  if (!expiresAt || typeof expiresAt.toMillis !== 'function') return false
  return expiresAt.toMillis() <= Date.now()
}

/**
 * Premium / Pro-Eğitmen çok-kişilik erişim kodu — yalnızca Admin SDK yazar.
 * @param {import('firebase-functions/v2/https').CallableRequest} request
 */
async function redeemAccessCodeHandler(request) {
  try {
    return await redeemAccessCodeCore(request)
  } catch (err) {
    if (err instanceof HttpsError) throw err
    logger.error('[redeemAccessCode]', err)
    throw new HttpsError('internal', 'Erişim kodu kullanılamadı.')
  }
}

/**
 * @param {import('firebase-functions/v2/https').CallableRequest} request
 */
async function redeemAccessCodeCore(request) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Giriş gerekli.')
  }

  const codeId = normalizeAccessCode(request.data?.code)
  if (!codeId || codeId.length < 8) {
    throw new HttpsError('invalid-argument', 'Geçerli bir erişim kodu girin.')
  }

  const uid = request.auth.uid
  const db = getFirestore()
  const codeRef = db.collection('access_codes').doc(codeId)
  const redemptionRef = db.collection('access_code_redemptions').doc(`${codeId}_${uid}`)
  const userRef = db.collection('users').doc(uid)

  const result = await db.runTransaction(async (tx) => {
    const [codeSnap, redemptionSnap, userSnap] = await Promise.all([
      tx.get(codeRef),
      tx.get(redemptionRef),
      tx.get(userRef),
    ])

    if (!codeSnap.exists) {
      throw new HttpsError('not-found', 'Erişim kodu bulunamadı.')
    }

    if (redemptionSnap.exists) {
      throw new HttpsError('already-exists', 'Bu kodu daha önce kullandınız.')
    }

    const codeDoc = codeSnap.data()
    const plan = typeof codeDoc.plan === 'string' ? codeDoc.plan : ''
    const maxUses = Number(codeDoc.maxUses)
    const usedCount = Number(codeDoc.usedCount ?? 0)
    const status = typeof codeDoc.status === 'string' ? codeDoc.status : 'active'

    if (!ACCESS_PLANS.has(plan)) {
      throw new HttpsError('failed-precondition', 'Erişim kodu yapılandırması geçersiz.')
    }

    if (status === 'revoked') {
      throw new HttpsError('failed-precondition', 'Erişim kodu iptal edilmiş.')
    }

    if (isExpired(codeDoc.expiresAt)) {
      throw new HttpsError('failed-precondition', 'Erişim kodunun süresi dolmuş.')
    }

    if (usedCount >= maxUses || status === 'depleted') {
      throw new HttpsError('resource-exhausted', 'Erişim kodu kullanım limitine ulaşmış.')
    }

    const nextUsedCount = usedCount + 1
    const nextStatus = nextUsedCount >= maxUses ? 'depleted' : 'active'

    tx.update(codeRef, {
      usedCount: nextUsedCount,
      status: nextStatus,
      lastRedeemedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    tx.set(redemptionRef, {
      codeId,
      uid,
      plan,
      role: roleForPlan(plan),
      redeemedAt: FieldValue.serverTimestamp(),
    })

    const role = roleForPlan(plan)
    /** @type {Record<string, unknown>} */
    const userPatch = {
      role,
      updatedAt: FieldValue.serverTimestamp(),
      accessCodeRedeemedAt: FieldValue.serverTimestamp(),
      accessCodeId: codeId,
      accessCodePlan: plan,
    }

    if (plan === 'premium') {
      userPatch.accountStatus = 'active'
      userPatch.premiumUpgradedAt = FieldValue.serverTimestamp()
    }

    if (!userSnap.exists) {
      tx.set(userRef, userPatch, { merge: true })
    } else {
      tx.set(userRef, userPatch, { merge: true })
    }

    return {
      ok: true,
      role,
      plan,
      usedCount: nextUsedCount,
      maxUses,
      status: nextStatus,
    }
  })

  return result
}

module.exports = { redeemAccessCodeHandler, normalizeAccessCode, roleForPlan }
