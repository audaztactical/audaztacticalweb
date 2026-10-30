import {
  createUserWithEmailAndPassword,
  deleteUser,
  sendEmailVerification,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { auth, isFirebaseConfigured } from './firebase'
import { isPlatformInBetaPeriod } from './registrationPolicy'
import {
  createOperatorProfile,
  fetchUserProfile,
  normalizeUsername,
  releaseUsernameIfOrphaned,
} from './firestoreUsers'
import {
  clearPendingOperatorProfile,
  savePendingOperatorProfile,
} from './pendingOperatorProfile'

/**
 * Auth hesabı + operatör profili + (beta değilse) doğrulama e-postası.
 * AuthContext.registerWithEmailPassword ve landing AuthModal ortak kullanır.
 *
 * @param {object} payload
 * @param {string} payload.email
 * @param {string} payload.password
 * @param {string} payload.username
 * @param {string} payload.callsign
 * @param {string} payload.bloodType
 * @param {string} payload.status
 * @param {string} [payload.role]
 * @param {string} [payload.accountStatus]
 * @param {string} [payload.premiumPaymentId]
 * @param {(step: 'auth' | 'profile' | 'verify') => void} [payload.onStep]
 * @returns {Promise<{ user: import('firebase/auth').User }>}
 */
export async function registerOperatorAccount({
  email,
  password,
  username,
  callsign,
  bloodType,
  status,
  role = 'member',
  accountStatus = 'active',
  premiumPaymentId = '',
  onStep,
}) {
  if (!isFirebaseConfigured() || !auth) throw new Error('Firebase yapılandırılmadı')

  let credUser = null
  try {
    onStep?.('auth')
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password)
    credUser = cred.user
    const display = callsign.trim()
    await updateProfile(credUser, { displayName: display })
    await credUser.getIdToken(true)
    savePendingOperatorProfile({
      email: email.trim(),
      username: normalizeUsername(username),
      callsign: display,
      bloodType,
      status,
      role,
      accountStatus,
    })

    onStep?.('profile')
    await createOperatorProfile(credUser.uid, {
      email: email.trim(),
      username,
      callsign: display,
      bloodType,
      status,
      role,
      accountStatus,
      premiumPaymentId,
    })
    clearPendingOperatorProfile()

    if (!isPlatformInBetaPeriod()) {
      onStep?.('verify')
      await sendEmailVerification(credUser)
    }

    return cred
  } catch (err) {
    if (credUser) {
      try {
        const profile = await fetchUserProfile(credUser.uid)
        if (profile?.username) {
          clearPendingOperatorProfile()
          return { user: credUser }
        }
        await releaseUsernameIfOrphaned(credUser.uid, normalizeUsername(username))
        await deleteUser(credUser)
      } catch {
        /* ignore */
      }
      clearPendingOperatorProfile()
      try {
        await signOut(auth)
      } catch {
        /* ignore */
      }
    }
    throw err
  }
}

/** Beta döneminde doğrulama satırı gösterilmez. */
export function registerSendsEmailVerification() {
  return !isPlatformInBetaPeriod()
}
