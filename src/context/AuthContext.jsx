/* eslint-disable react-refresh/only-export-components -- AuthProvider + useAuth aynı modülde */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  deleteUser,
  linkWithCredential,
  onAuthStateChanged,
  reauthenticateWithPopup,
  reload,
  sendEmailVerification,
  signInWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
} from 'firebase/auth'
import { auth, db, isFirebaseConfigured } from '../lib/firebase'
import {
  isBenignGoogleRedirectError,
  logGoogleAuthHud,
  resolveGoogleRedirectReturn,
  startGoogleSignIn,
} from '../lib/googleRedirectAuth'
import { emitFirebaseError } from '../lib/firebaseErrorBus'
import { isInstructorRole, normalizeUserRole } from '../lib/authRoles'
import {
  burnInstructorInviteToken,
  INSTRUCTOR_TOKEN_INVALID_MESSAGE,
  validateInstructorInviteToken,
} from '../lib/firestoreInstructorTokens'
import {
  createOperatorProfile,
  fetchUserProfile,
  GUEST_PROFILE,
  subscribeUserProfile,
} from '../lib/firestoreUsers'

const AuthContext = createContext(null)

function mergeWithGuest(partial, authUser) {
  return {
    username: partial.username?.trim() || '',
    callsign: partial.callsign?.trim() || authUser?.displayName?.trim() || GUEST_PROFILE.callsign,
    bloodType: partial.bloodType?.trim() || GUEST_PROFILE.bloodType,
    status: partial.status?.trim() || GUEST_PROFILE.status,
    email: partial.email?.trim() || authUser?.email || '',
    enrolledAt: partial.enrolledAt ?? null,
    role: normalizeUserRole(partial?.role ?? 'operator'),
    allergies: typeof partial.allergies === 'string' ? partial.allergies : '',
    drugSensitivity: typeof partial.drugSensitivity === 'string' ? partial.drugSensitivity : '',
    importantNotes: typeof partial.importantNotes === 'string' ? partial.importantNotes : '',
    groupId: typeof partial.groupId === 'string' && partial.groupId.trim() ? partial.groupId.trim() : null,
    instructorId:
      typeof partial.instructorId === 'string' && partial.instructorId.trim() ? partial.instructorId.trim() : null,
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [userData, setUserData] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [googleRedirectResolving, setGoogleRedirectResolving] = useState(false)
  const [googleAuthError, setGoogleAuthError] = useState(/** @type {{ code: string, message: string } | null} */ (null))

  // Google signInWithRedirect dönüşü — StrictMode güvenli tek seferlik getRedirectResult
  useEffect(() => {
    if (!isFirebaseConfigured() || !auth) return undefined

    let mounted = true
    setGoogleRedirectResolving(true)

    resolveGoogleRedirectReturn(auth)
      .then((result) => {
        if (!mounted) return
        if (result?.user) {
          setGoogleAuthError(null)
        }
      })
      .catch((err) => {
        if (!mounted || isBenignGoogleRedirectError(err)) return
        const logged = logGoogleAuthHud('AuthContext.resolveRedirect', err)
        setGoogleAuthError(logged)
        emitFirebaseError(err)
      })
      .finally(() => {
        if (mounted) setGoogleRedirectResolving(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (!isFirebaseConfigured() || !auth) {
      setUser(null)
      setUserData(null)
      setProfileLoading(false)
      setLoading(false)
      return undefined
    }

    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser)

      if (!nextUser) {
        setUserData(null)
        setProfileLoading(false)
        setLoading(false)
        return
      }

      setLoading(false)
      setProfileLoading(true)

      try {
        const raw = await fetchUserProfile(nextUser.uid)
        if (raw) {
          setUserData(mergeWithGuest(raw, nextUser))
        } else {
          setUserData(
            mergeWithGuest(
              {
                username: '',
                callsign: nextUser.displayName || '',
                bloodType: '',
                status: '',
                email: nextUser.email || '',
                enrolledAt: null,
                allergies: '',
                drugSensitivity: '',
                importantNotes: '',
              },
              nextUser
            )
          )
        }
      } catch {
        setUserData(mergeWithGuest({}, nextUser))
      } finally {
        setProfileLoading(false)
      }
    })

    return unsubscribe
  }, [])

  useEffect(() => {
    if (!isFirebaseConfigured() || !db || !user?.uid) return undefined

    setProfileLoading(true)
    const unsub = subscribeUserProfile(
      user.uid,
      (raw) => {
        if (raw) {
          setUserData(mergeWithGuest(raw, user))
        }
        setProfileLoading(false)
      },
      () => {
        setProfileLoading(false)
      },
    )

    return unsub
  }, [user?.uid])

  const refreshUserProfile = useCallback(async () => {
    if (!isFirebaseConfigured() || !auth || !user) return
    setProfileLoading(true)
    try {
      const raw = await fetchUserProfile(user.uid)
      if (raw) {
        setUserData(mergeWithGuest(raw, user))
      } else {
        setUserData(
          mergeWithGuest(
            {
              username: '',
              callsign: user.displayName || '',
              bloodType: '',
              status: '',
              email: user.email || '',
              enrolledAt: null,
              allergies: '',
              drugSensitivity: '',
              importantNotes: '',
            },
            user
          )
        )
      }
    } catch {
      setUserData(mergeWithGuest({}, user))
    } finally {
      setProfileLoading(false)
    }
  }, [user])

  const signInWithGoogle = useCallback(async (redirectPath = '/dashboard') => {
    if (!isFirebaseConfigured() || !auth) {
      throw new Error('Firebase yapılandırılmadı')
    }
    setGoogleAuthError(null)
    try {
      return await startGoogleSignIn(auth, redirectPath)
    } catch (err) {
      const logged = logGoogleAuthHud('AuthContext.signInWithGoogle', err)
      setGoogleAuthError(logged)
      throw err
    }
  }, [])

  const signInWithEmailPassword = useCallback(async (email, password) => {
    if (!isFirebaseConfigured() || !auth) throw new Error('Firebase yapılandırılmadı')
    return signInWithEmailAndPassword(auth, email.trim(), password)
  }, [])

  const registerWithEmailPassword = useCallback(
    async ({ email, password, username, callsign, bloodType, status, instructorInviteCode = '' }) => {
      if (!isFirebaseConfigured() || !auth) throw new Error('Firebase yapılandırılmadı')

      const inviteRaw = typeof instructorInviteCode === 'string' ? instructorInviteCode.trim() : ''
      /** @type {import('firebase/firestore').DocumentReference | null} */
      let tokenRef = null
      let accountRole = 'operator'

      if (inviteRaw) {
        const check = await validateInstructorInviteToken(inviteRaw)
        if (!check.valid || !check.ref) {
          const e = new Error(INSTRUCTOR_TOKEN_INVALID_MESSAGE)
          e.code = 'instructor-token-invalid'
          throw e
        }
        tokenRef = check.ref
        accountRole = 'instructor'
      }

      let credUser = null
      try {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password)
        credUser = cred.user
        const display = callsign.trim()
        await updateProfile(credUser, { displayName: display })
        await createOperatorProfile(credUser.uid, {
          email: email.trim(),
          username,
          callsign: display,
          bloodType,
          status,
          role: accountRole,
        })
        if (tokenRef) {
          await burnInstructorInviteToken(tokenRef, credUser.uid)
        }
        await sendEmailVerification(credUser)
        return cred
      } catch (err) {
        if (credUser) {
          try {
            await deleteUser(credUser)
          } catch {
            /* ignore */
          }
        }
        throw err
      }
    },
    []
  )

  const linkAccountWithPassword = useCallback(async (plainPassword) => {
    if (!isFirebaseConfigured() || !auth) throw new Error('Firebase yapılandırılmadı')
    const u = auth.currentUser
    if (!u?.email) {
      const e = new Error('Hesapta e-posta yok; şifre bağlanamaz.')
      e.code = 'failed-precondition'
      throw e
    }
    const cred = EmailAuthProvider.credential(u.email, plainPassword)
    try {
      await linkWithCredential(u, cred)
    } catch (err) {
      if (err?.code === 'auth/requires-recent-login') {
        await reauthenticateWithPopup(u, new GoogleAuthProvider())
        const u2 = auth.currentUser
        if (!u2?.email) throw err
        await linkWithCredential(u2, EmailAuthProvider.credential(u2.email, plainPassword))
      } else {
        throw err
      }
    }
    await reload(auth.currentUser)
  }, [])

  const { role, isInstructor } = useMemo(() => {
    const normalizedRole = normalizeUserRole(userData?.role)
    const instructor =
      normalizedRole === 'instructor' || isInstructorRole(userData?.role)
    return { role: normalizedRole, isInstructor: instructor }
  }, [userData?.role])

  const value = useMemo(
    () => ({
      user,
      loading,
      userData,
      profileLoading,
      isConfigured: isFirebaseConfigured(),
      isInstructor,
      role,
      signInWithGoogle,
      signInWithEmailPassword,
      registerWithEmailPassword,
      linkAccountWithPassword,
      refreshUserProfile,
      googleRedirectResolving,
      googleAuthError,
      clearGoogleAuthError: () => setGoogleAuthError(null),
    }),
    [
      user,
      loading,
      userData,
      profileLoading,
      isInstructor,
      role,
      signInWithGoogle,
      signInWithEmailPassword,
      registerWithEmailPassword,
      linkAccountWithPassword,
      refreshUserProfile,
      googleRedirectResolving,
      googleAuthError,
    ]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
