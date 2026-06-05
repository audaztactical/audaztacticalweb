import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { userRequiresEmailVerification } from '../../lib/authEmailVerification'

function RouteLoader() {
  return (
    <div
      className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-[#0a0b0d] text-[#ffb400]"
      role="status"
      aria-live="polite"
    >
      <div className="size-10 animate-pulse rounded-full border-2 border-[#ffb400]/30 border-t-[#ffb400]" />
      <p className="font-mono-technical text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">
        Oturum doğrulanıyor
      </p>
    </div>
  )
}

export default function ProtectedRoute() {
  const { user, loading, googleRedirectResolving } = useAuth()
  const location = useLocation()

  if (loading || googleRedirectResolving) {
    return <RouteLoader />
  }

  if (!user) {
    return <Navigate to="/" replace state={{ openAuth: true, from: location.pathname }} />
  }

  const needsVerify = userRequiresEmailVerification(user)
  const onVerifyPage = location.pathname === '/verify-email'

  if (needsVerify && !onVerifyPage) {
    return <Navigate to="/verify-email" replace state={{ from: location.pathname }} />
  }

  if (!needsVerify && onVerifyPage) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
