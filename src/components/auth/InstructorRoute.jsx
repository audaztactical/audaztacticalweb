import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function InstructorRoute({ children }) {
  const { user, loading, profileLoading, isInstructor } = useAuth()

  if (loading || profileLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center font-mono-technical text-sm text-app-text/55">
        Eğitmen yetkisi kontrol ediliyor…
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/" replace />
  }

  if (!isInstructor) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
