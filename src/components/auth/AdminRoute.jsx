import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { isAdminUser } from '../../config/admin'

export default function AdminRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center font-mono-technical text-sm text-slate-500">
        Yetki kontrolü…
      </div>
    )
  }

  if (!isAdminUser(user)) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
