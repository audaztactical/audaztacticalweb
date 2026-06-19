import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { userRequiresEmailVerification } from '../../lib/authEmailVerification'
import { useAuth } from '../../context/AuthContext'
import {
  consumeGoogleAuthRedirectPath,
  hasPendingGoogleAuthRedirectPath,
} from '../../lib/googleAuth'
import { shouldShowIntro } from '../../lib/introStorage'

/**
 * Google signInWithRedirect dönüşünde hedef rotaya yönlendirir.
 * getRedirectResult bazen null döner; oturum yine de açık kalabilir — bu yüzden
 * pending path + user state ile yönlendirme yapılır.
 */
export default function GoogleAuthRedirectHandler() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, userData, googleRedirectResolving } = useAuth()
  const navigatedRef = useRef(false)

  useEffect(() => {
    if (navigatedRef.current || googleRedirectResolving || !user) return undefined

    const pendingGoogle = hasPendingGoogleAuthRedirectPath()
    const onLanding = location.pathname === '/'
    const skipIntro = location.state?.skipIntro === true

    if (onLanding && shouldShowIntro(skipIntro) && !pendingGoogle) return undefined

    // Karargâh / landing bilinçli ziyareti — dashboard'a zorla gönderme
    if (onLanding && skipIntro) return undefined

    if (!pendingGoogle && !onLanding) return undefined

    navigatedRef.current = true
    const target = pendingGoogle ? consumeGoogleAuthRedirectPath() : '/dashboard'
    const accountStatus = userData?.accountStatus ?? 'active'

    if (userRequiresEmailVerification(user, accountStatus)) {
      navigate('/verify-email', { replace: true })
    } else {
      navigate(target.startsWith('/') ? target : '/dashboard', { replace: true })
    }

    return undefined
  }, [googleRedirectResolving, location.pathname, location.state?.skipIntro, navigate, user, userData?.accountStatus])

  return null
}
