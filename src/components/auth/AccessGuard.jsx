import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { resolveAccessRedirect } from '../../lib/accessControl'

function AccessLoader() {
  return (
    <div
      className="flex min-h-[40vh] items-center justify-center font-mono-technical text-sm text-app-text/55"
      role="status"
      aria-live="polite"
    >
      Erişim profili doğrulanıyor…
    </div>
  )
}

/**
 * Rol (member / instructor / premium_member) ve accountStatus (active / locked) koruması.
 */
export default function AccessGuard() {
  const { userData, profileLoading, isAdmin } = useAuth()
  const location = useLocation()

  if (!userData && profileLoading) {
    return <AccessLoader />
  }

  const redirectTo = resolveAccessRedirect({
    pathname: location.pathname,
    userData,
    isAdmin,
  })

  if (redirectTo && redirectTo !== location.pathname) {
    return <Navigate to={redirectTo} replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
