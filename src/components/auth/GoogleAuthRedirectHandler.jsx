import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, isFirebaseConfigured } from '../../lib/firebase'
import { userRequiresEmailVerification } from '../../lib/authEmailVerification'
import { useAuth } from '../../context/AuthContext'
import {
  consumeGoogleAuthRedirectPath,
  hasPendingGoogleAuthRedirectPath,
} from '../../lib/googleAuth'
import {
  getGoogleRedirectResultOnce,
  isBenignGoogleRedirectError,
  logGoogleAuthHud,
} from '../../lib/googleRedirectAuth'
import { emitFirebaseError } from '../../lib/firebaseErrorBus'

/**
 * Google signInWithRedirect dönüşünde hedef rotaya yönlendirir.
 * Yönlendirme, AuthContext'teki user state hazır olduktan sonra yapılır (redirect yarışı önlenir).
 * Profil oluşturma AuthContext.resolveGoogleRedirectReturn içinde yapılır.
 */
export default function GoogleAuthRedirectHandler() {
  const navigate = useNavigate()
  const { user, googleRedirectResolving } = useAuth()
  const navigatedRef = useRef(false)

  useEffect(() => {
    if (!isFirebaseConfigured() || !auth || navigatedRef.current) return undefined
    if (!user || googleRedirectResolving) return undefined
    if (!hasPendingGoogleAuthRedirectPath()) return undefined

    let cancelled = false

    getGoogleRedirectResultOnce(auth)
      .then((result) => {
        if (cancelled || navigatedRef.current || !result?.user) return
        if (result.user.uid !== user.uid) return

        navigatedRef.current = true
        const target = consumeGoogleAuthRedirectPath()

        if (userRequiresEmailVerification(result.user)) {
          navigate('/verify-email', { replace: true })
        } else {
          navigate(target, { replace: true })
        }
      })
      .catch((err) => {
        if (cancelled || isBenignGoogleRedirectError(err)) {
          consumeGoogleAuthRedirectPath()
          return
        }
        logGoogleAuthHud('GoogleAuthRedirectHandler.navigate', err)
        emitFirebaseError(err)
      })

    return () => {
      cancelled = true
    }
  }, [navigate, user, googleRedirectResolving])

  return null
}
