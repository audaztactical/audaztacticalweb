const { getFirestore, FieldValue } = require('firebase-admin/firestore')
const { HttpsError } = require('firebase-functions/v2/https')

/**
 * Mock / Stripe ödeme sonrası premium yükseltme — yalnızca sunucu yazar.
 * @param {import('firebase-functions/v2/https').CallableRequest} request
 */
async function completePremiumUpgradeHandler(request) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Giriş gerekli.')
  }

  const paymentIntentId = String(request.data?.paymentIntentId ?? '').trim()
  if (!paymentIntentId.startsWith('pi_mock_') || paymentIntentId.length < 12) {
    throw new HttpsError('invalid-argument', 'Geçersiz ödeme referansı.')
  }

  const db = getFirestore()
  const userRef = db.collection('users').doc(request.auth.uid)
  const userSnap = await userRef.get()

  if (!userSnap.exists) {
    throw new HttpsError('failed-precondition', 'Kullanıcı profili bulunamadı.')
  }

  const accountStatus = userSnap.data()?.accountStatus ?? 'active'
  if (accountStatus !== 'locked' && accountStatus !== 'active') {
    throw new HttpsError('failed-precondition', 'Hesap premium yükseltme için uygun değil.')
  }

  await userRef.set(
    {
      role: 'premium_member',
      accountStatus: 'active',
      premiumPaymentId: paymentIntentId,
      premiumUpgradedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  )

  return { ok: true, role: 'premium_member', accountStatus: 'active' }
}

module.exports = { completePremiumUpgradeHandler }
