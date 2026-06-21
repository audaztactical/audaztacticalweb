const { getAuth } = require('firebase-admin/auth')
const { getFirestore } = require('firebase-admin/firestore')
const { HttpsError } = require('firebase-functions/v2/https')
const { assertContentAdmin } = require('./adminAuth')

/**
 * @param {string} raw
 */
function normalizeUsernameKey(raw) {
  if (typeof raw !== 'string') return ''
  let s = raw.trim().toLowerCase().replace(/\s+/g, '_')
  s = s.replace(/[^a-z0-9_]/g, '')
  return s
}

/**
 * Callable — admin hesap silme (Auth + users/{uid} + usernames).
 * @param {import('firebase-functions/v2/https').CallableRequest} request
 */
async function adminDeleteUserHandler(request) {
  assertContentAdmin(request)

  const callerUid = request.auth.uid
  const targetUid = String(request.data?.uid ?? '').trim()

  if (!targetUid) {
    throw new HttpsError('invalid-argument', 'uid gerekli.')
  }

  if (targetUid === callerUid) {
    throw new HttpsError('failed-precondition', 'Kendi hesabınızı silemezsiniz.')
  }

  const db = getFirestore()
  const userRef = db.collection('users').doc(targetUid)
  const userSnap = await userRef.get()

  if (!userSnap.exists) {
    throw new HttpsError('not-found', 'Kullanıcı bulunamadı.')
  }

  const userData = userSnap.data() ?? {}
  const usernameKey = normalizeUsernameKey(userData.username)

  if (usernameKey) {
    const nameRef = db.collection('usernames').doc(usernameKey)
    const nameSnap = await nameRef.get()
    if (nameSnap.exists && nameSnap.data()?.uid === targetUid) {
      await nameRef.delete()
    }
  }

  await userRef.delete()

  const auth = getAuth()
  try {
    await auth.deleteUser(targetUid)
  } catch (err) {
    const code = String(err?.code ?? '')
    if (code !== 'auth/user-not-found') {
      throw new HttpsError('internal', 'Auth hesabı silinemedi.')
    }
  }

  return { ok: true, uid: targetUid }
}

module.exports = { adminDeleteUserHandler }
