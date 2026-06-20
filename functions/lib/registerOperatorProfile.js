const { getFirestore, FieldValue } = require('firebase-admin/firestore')
const { HttpsError } = require('firebase-functions/v2/https')

/** @typedef {'ok' | 'username_taken' | 'profile_exists'} RegisterProfileTxOutcome */

/**
 * @param {unknown} raw
 */
function normalizeUsername(raw) {
  if (typeof raw !== 'string') return ''
  let s = raw.trim().toLowerCase().replace(/\s+/g, '_')
  s = s.replace(/[^a-z0-9_]/g, '')
  return s
}

/**
 * @param {string} key
 */
function isValidUsernameNormalized(key) {
  return typeof key === 'string' && key.length >= 3 && key.length <= 24 && /^[a-z0-9_]+$/.test(key)
}

/**
 * @param {unknown} role
 */
function normalizeMemberRole(role) {
  const r = typeof role === 'string' ? role.trim().toLowerCase() : 'member'
  if (r === 'operator' || r === 'operatör' || r === '') return 'member'
  return r
}

/**
 * Kayıt profili — Admin SDK ile users/{uid} + usernames/{key} (istemci kurallarını atlar).
 * @param {import('firebase-functions/v2/https').CallableRequest} request
 */
async function registerOperatorProfileHandler(request) {
  try {
    return await registerOperatorProfileCore(request)
  } catch (err) {
    if (err instanceof HttpsError) throw err
    console.error('[registerOperatorProfile]', err)
    throw new HttpsError('internal', 'Profil kaydı tamamlanamadı.')
  }
}

/**
 * @param {import('firebase-functions/v2/https').CallableRequest} request
 */
async function registerOperatorProfileCore(request) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Giriş gerekli.')
  }

  const uid = request.auth.uid
  const tokenEmail = typeof request.auth.token.email === 'string' ? request.auth.token.email.trim() : ''
  const data = request.data ?? {}

  const key = normalizeUsername(data.username)
  if (!isValidUsernameNormalized(key)) {
    throw new HttpsError('invalid-argument', 'Geçersiz kullanıcı adı (3–24 karakter; a-z, 0-9, alt çizgi).')
  }

  const finalRole = normalizeMemberRole(data.role)
  const premiumPaymentId = typeof data.premiumPaymentId === 'string' ? data.premiumPaymentId.trim() : ''

  if (premiumPaymentId) {
    if (!premiumPaymentId.startsWith('pi_mock_')) {
      throw new HttpsError('invalid-argument', 'Geçersiz ödeme referansı.')
    }
  } else if (finalRole !== 'member') {
    throw new HttpsError('invalid-argument', 'Kayıt yalnızca standart üye rolü ile yapılabilir.')
  }

  const accountStatus =
    typeof data.accountStatus === 'string' && data.accountStatus.trim().toLowerCase() === 'locked'
      ? 'locked'
      : 'active'
  if (accountStatus !== 'active') {
    throw new HttpsError('invalid-argument', 'Geçersiz hesap durumu.')
  }

  const email =
    typeof data.email === 'string' && data.email.trim()
      ? data.email.trim()
      : tokenEmail || null

  const callsign = typeof data.callsign === 'string' ? data.callsign.trim() : ''
  const bloodType = typeof data.bloodType === 'string' ? data.bloodType.trim() : ''
  const status = typeof data.status === 'string' && data.status.trim() ? data.status.trim() : 'Sivil'

  const db = getFirestore()
  const nameRef = db.collection('usernames').doc(key)
  const userRef = db.collection('users').doc(uid)

  /** @type {RegisterProfileTxOutcome} */
  let outcome = 'ok'
  /** @type {boolean} */
  let mergeUserDoc = false

  await db.runTransaction(async (tx) => {
    const [nameSnap, userSnap] = await Promise.all([tx.get(nameRef), tx.get(userRef)])

    if (userSnap.exists) {
      const existing = userSnap.data() ?? {}
      const existingUsername =
        typeof existing.username === 'string' ? existing.username.trim().toLowerCase() : ''
      if (existingUsername === key) {
        outcome = 'ok'
        return
      }
      if (!existingUsername) {
        mergeUserDoc = true
      } else {
        outcome = 'profile_exists'
        return
      }
    }

    if (nameSnap.exists) {
      const ownerUid = typeof nameSnap.data()?.uid === 'string' ? nameSnap.data().uid : ''
      if (ownerUid === uid) {
        /* kullanıcı adı bu oturuma ayrılmış — users belgesini tamamla */
      } else if (ownerUid) {
        const ownerUserSnap = await tx.get(db.collection('users').doc(ownerUid))
        if (ownerUserSnap.exists) {
          outcome = 'username_taken'
          return
        }
        tx.set(nameRef, { uid })
      } else {
        tx.set(nameRef, { uid })
      }
    } else {
      tx.set(nameRef, { uid })
    }

    /** @type {Record<string, unknown>} */
    const docPayload = {
      email,
      username: key,
      callsign,
      displayName: callsign,
      bloodType,
      status,
      role: premiumPaymentId ? 'premium_member' : finalRole,
      accountStatus,
      enrolledAt: FieldValue.serverTimestamp(),
      agreedToTerms: false,
      updatedAt: FieldValue.serverTimestamp(),
    }

    if (premiumPaymentId) {
      docPayload.premiumPaymentId = premiumPaymentId
      docPayload.premiumUpgradedAt = FieldValue.serverTimestamp()
    }

    if (mergeUserDoc) {
      tx.set(userRef, docPayload, { merge: true })
    } else {
      tx.set(userRef, docPayload)
    }
  })

  if (outcome === 'username_taken') {
    throw new HttpsError('already-exists', 'Bu kullanıcı adı zaten kullanılıyor.')
  }
  if (outcome === 'profile_exists') {
    throw new HttpsError('already-exists', 'Profil zaten mevcut.')
  }

  return { ok: true, username: key }
}

module.exports = { registerOperatorProfileHandler, normalizeUsername, isValidUsernameNormalized }
