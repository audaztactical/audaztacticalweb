const { getFirestore, FieldValue } = require('firebase-admin/firestore')
const { HttpsError } = require('firebase-functions/v2/https')

/**
 * Eğitmen rolünü yalnızca sunucu yazar — client users/{uid}.role güncelleyemez.
 * @param {import('firebase-functions/v2/https').CallableRequest} request
 */
async function claimInstructorRoleHandler(request) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Giriş gerekli.')
  }

  const tokenId = String(request.data?.tokenId ?? '').trim()
  if (!tokenId) {
    throw new HttpsError('invalid-argument', 'Eğitmen davet kodu gerekli.')
  }

  const db = getFirestore()
  const tokenRef = db.collection('instructor_tokens').doc(tokenId)
  const userRef = db.collection('users').doc(request.auth.uid)

  await db.runTransaction(async (tx) => {
    const tokenSnap = await tx.get(tokenRef)
    if (!tokenSnap.exists) {
      throw new HttpsError('not-found', 'Geçersiz eğitmen davet kodu.')
    }
    const token = tokenSnap.data()
    if (token.isUsed === true) {
      throw new HttpsError('failed-precondition', 'Davet kodu zaten kullanılmış.')
    }

    tx.update(tokenRef, {
      isUsed: true,
      usedBy: request.auth.uid,
      usedAt: FieldValue.serverTimestamp(),
    })

    tx.set(
      userRef,
      {
        role: 'instructor',
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    )
  })

  return { ok: true, role: 'instructor' }
}

module.exports = { claimInstructorRoleHandler }
