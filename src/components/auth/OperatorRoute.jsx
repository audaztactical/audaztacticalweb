import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

/** Operatör-only sayfalar — eğitmenler Eğitmen Kontrol Paneli'ne yönlendirilir. */
export default function OperatorRoute({ children }) {
  const { user, loading, profileLoading, role, isInstructor } = useAuth()

  if (loading || profileLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center font-mono-technical text-sm text-slate-500">
        Erişim profili kontrol ediliyor…
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/" replace />
  }

  if (role === 'instructor' || isInstructor) {
    return <Navigate to="/egitmen-komuta" replace />
  }

  return children
}
