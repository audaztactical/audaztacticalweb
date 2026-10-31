import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import AuthModal from '../../components/auth/AuthModal'
import TacticalLoader from '../../components/TacticalLoader'

const MaintenancePage = lazy(() => import('./MaintenancePage'))

export function isMaintenanceModeOn() {
  return String(import.meta.env.VITE_MAINTENANCE_MODE || '').toLowerCase() === 'on'
}

/**
 * When VITE_MAINTENANCE_MODE=on, show MaintenancePage for everyone except admins.
 * DEV /dev/* routes bypass the gate.
 * This component must wrap Router children; when mode is off it is not mounted
 * so the maintenance chunk never downloads.
 */
export default function MaintenanceGate({ children }) {
  const { isAdmin, loading, user } = useAuth()
  const location = useLocation()
  const [authOpen, setAuthOpen] = useState(false)
  const [nonAdminHint, setNonAdminHint] = useState(false)
  const wasAuthOpen = useRef(false)

  const isDevRoute = import.meta.env.DEV && location.pathname.startsWith('/dev')

  useEffect(() => {
    if (wasAuthOpen.current && !authOpen && user && !isAdmin) {
      setNonAdminHint(true)
    }
    wasAuthOpen.current = authOpen
  }, [authOpen, user, isAdmin])

  if (!isMaintenanceModeOn() || isDevRoute) {
    return children
  }

  if (loading) {
    return <TacticalLoader />
  }

  if (isAdmin) {
    return children
  }

  return (
    <>
      <Suspense fallback={<TacticalLoader />}>
        <MaintenancePage nonAdminHint={nonAdminHint} onTeamLogin={() => setAuthOpen(true)} />
      </Suspense>
      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        initialMode="login"
        redirectTo="/dashboard"
      />
    </>
  )
}
