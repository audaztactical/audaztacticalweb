import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function AdminRoute({ children }) {
  const { user, loading, isAdmin, showAdminPanel, syncAdminClaim } = useAuth()
  const [claimSyncing, setClaimSyncing] = useState(false)
  const [syncDone, setSyncDone] = useState(false)

  const canAccess = showAdminPanel || isAdmin

  useEffect(() => {
    if (loading) return undefined
    if (!user) {
      setSyncDone(true)
      setClaimSyncing(false)
      return undefined
    }

    if (canAccess) {
      setSyncDone(true)
      setClaimSyncing(false)
      return undefined
    }

    let cancelled = false
    setClaimSyncing(true)
    setSyncDone(false)

    syncAdminClaim(user).finally(() => {
      if (!cancelled) {
        setClaimSyncing(false)
        setSyncDone(true)
      }
    })

    return () => {
      cancelled = true
    }
  }, [user, loading, syncAdminClaim, canAccess])

  if (loading || claimSyncing) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center font-mono-technical text-sm text-app-text/55">
        Yetki kontrolü…
      </div>
    )
  }

  if (!user || (syncDone && !canAccess)) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
