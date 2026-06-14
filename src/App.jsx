import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import { AuthProvider } from './context/AuthContext'
import { FirebaseErrorProvider } from './context/FirebaseErrorContext'
import { TcccAlertProvider } from './context/TcccAlertContext'
import { MuhabereNotifyProvider } from './context/MuhabereNotifyContext'
import { NotificationProvider } from './context/NotificationContext'
import AdminRoute from './components/auth/AdminRoute'
import InstructorRoute from './components/auth/InstructorRoute'
import ProtectedRoute from './components/auth/ProtectedRoute'
import MainLayout from './layouts/MainLayout'
import TacticalLoader from './components/TacticalLoader'
import GoogleAuthRedirectHandler from './components/auth/GoogleAuthRedirectHandler'

const VerifyEmail = lazy(() => import('./pages/VerifyEmail'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Profile = lazy(() => import('./pages/Profile'))
const OperatorProfile = lazy(() => import('./pages/OperatorProfile'))
const TaktikMuhabere = lazy(() => import('./pages/TaktikMuhabere'))
const ModulePlaceholder = lazy(() => import('./pages/ModulePlaceholder'))
const Akademi = lazy(() => import('./pages/Akademi'))
const Forum = lazy(() => import('./pages/Forum'))
const IntelFeed = lazy(() => import('./pages/IntelFeed'))
const Missions = lazy(() => import('./pages/Missions'))
const Cephanelik = lazy(() => import('./pages/Cephanelik'))
const Training = lazy(() => import('./pages/Training'))
const TcccSuite = lazy(() => import('./pages/TcccSuite'))
const ProgressTracker = lazy(() => import('./pages/ProgressTracker'))
const InstructorDashboard = lazy(() => import('./pages/InstructorDashboard'))
const Settings = lazy(() => import('./pages/Settings'))
const AdminPanel = lazy(() => import('./pages/AdminPanel'))

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
      <TcccAlertProvider>
        <FirebaseErrorProvider>
          <BrowserRouter>
          <MuhabereNotifyProvider>
          <GoogleAuthRedirectHandler />
          <Suspense fallback={<TacticalLoader />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />

            <Route element={<ProtectedRoute />}>
              <Route path="verify-email" element={<VerifyEmail />} />
              <Route element={<MainLayout />}>
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="profil" element={<Profile />} />
                <Route path="profil/:operatorUid" element={<OperatorProfile />} />
                <Route path="mesajlar" element={<TaktikMuhabere />} />
                <Route path="akademi" element={<Akademi />} />
                <Route path="forum" element={<Forum />} />
                <Route path="istihbarat" element={<IntelFeed />} />
                <Route path="gorevler" element={<Missions />} />
                <Route path="cephanelik" element={<Cephanelik />} />
                <Route path="antrenman" element={<Training />} />
                <Route path="tccc" element={<TcccSuite />} />
                <Route path="basarilar" element={<ProgressTracker />} />
                <Route
                  path="egitmen-komuta"
                  element={
                    <InstructorRoute>
                      <InstructorDashboard />
                    </InstructorRoute>
                  }
                />
                <Route path="ayarlar" element={<Settings />} />
                <Route
                  path="admin"
                  element={
                    <AdminRoute>
                      <AdminPanel />
                    </AdminRoute>
                  }
                />
              </Route>
            </Route>
          </Routes>
          </Suspense>
          </MuhabereNotifyProvider>
          </BrowserRouter>
        </FirebaseErrorProvider>
      </TcccAlertProvider>
      </NotificationProvider>
    </AuthProvider>
  )
}
