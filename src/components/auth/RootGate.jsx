import { lazy, Suspense } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useAuthAppSettings } from '../../hooks/useAuthAppSettings'
import { userRequiresEmailVerification } from '../../lib/authEmailVerification'
import { isLandingAuthFlowActive } from '../../lib/landingAuthFlow'
import TacticalLoader from '../TacticalLoader'

const Landing = lazy(() => import('../../pages/landing/Landing'))

function RouteLoader() {
  return (
    <div
      className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-[#0a0b0d] text-accent"
      role="status"
      aria-live="polite"
    >
      <div className="size-10 animate-pulse rounded-full border-2 border-accent/30 border-t-accent" />
      <p className="font-mono-technical text-xs font-semibold uppercase tracking-[0.35em] text-app-text/55">
        Oturum doğrulanıyor
      </p>
    </div>
  )
}

/**
 * "/" — girişli kullanıcıyı landing chunk yüklemeden /dashboard (veya verify) yollar.
 * Auth modal akışı (sessionStorage audaz-auth-flow) sürerken Landing kalır.
 */
export default function RootGate() {
  const { user, userData, loading, profileLoading } = useAuth()
  const { emailVerificationRequired, ready: authSettingsReady } = useAuthAppSettings()

  // Modal giriş/kayıt sürerken Landing unmount olmamalı (profil yüklemesi RouteLoader'a düşmesin)
  const authFlow = isLandingAuthFlowActive()
  if (authFlow) {
    return (
      <Suspense fallback={<TacticalLoader />}>
        <Landing />
      </Suspense>
    )
  }

  if (loading || (user && profileLoading && !userData)) {
    return <RouteLoader />
  }

  if (user) {
    const accountStatus = userData?.accountStatus ?? 'active'
    const enforceEmailVerification = !authSettingsReady || emailVerificationRequired !== false
    const needsVerify =
      enforceEmailVerification && userRequiresEmailVerification(user, accountStatus)
    if (needsVerify) {
      return <Navigate to="/verify-email" replace />
    }
    return <Navigate to="/dashboard" replace />
  }

  return (
    <Suspense fallback={<TacticalLoader />}>
      <Landing />
    </Suspense>
  )
}
