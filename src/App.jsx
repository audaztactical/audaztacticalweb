import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { FirebaseErrorProvider } from './context/FirebaseErrorContext'
import { TcccAlertProvider } from './context/TcccAlertContext'
import { MuhabereNotifyProvider } from './context/MuhabereNotifyContext'
import AdminRoute from './components/auth/AdminRoute'
import InstructorRoute from './components/auth/InstructorRoute'
import ProtectedRoute from './components/auth/ProtectedRoute'
import MainLayout from './layouts/MainLayout'
import AdminPanel from './pages/AdminPanel'
import InstructorDashboard from './pages/InstructorDashboard'
import ProgressTracker from './pages/ProgressTracker'
import Cephanelik from './pages/Cephanelik'
import Dashboard from './pages/Dashboard'
import LandingPage from './pages/LandingPage'
import Missions from './pages/Missions'
import Profile from './pages/Profile'
import Settings from './pages/Settings'
import TcccSuite from './pages/TcccSuite'
import Training from './pages/Training'
import ModulePlaceholder from './pages/ModulePlaceholder'
import TaktikMuhabere from './pages/TaktikMuhabere'
import VerifyEmail from './pages/VerifyEmail'
import GoogleAuthRedirectHandler from './components/auth/GoogleAuthRedirectHandler'

export default function App() {
  return (
    <AuthProvider>
      <TcccAlertProvider>
        <FirebaseErrorProvider>
          <BrowserRouter>
          <MuhabereNotifyProvider>
          <GoogleAuthRedirectHandler />
          <Routes>
            <Route path="/" element={<LandingPage />} />

            <Route element={<ProtectedRoute />}>
              <Route path="verify-email" element={<VerifyEmail />} />
              <Route element={<MainLayout />}>
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="profil" element={<Profile />} />
                <Route path="mesajlar" element={<TaktikMuhabere />} />
                <Route
                  path="sitrep"
                  element={
                    <ModulePlaceholder
                      title="SITREP · Saha Akışı"
                      opsCode="NET-02"
                      subtitle="Canlı saha durumu ve birim akışı."
                    />
                  }
                />
                <Route
                  path="akademi"
                  element={
                    <ModulePlaceholder
                      title="Audaz Akademi"
                      opsCode="EDU-07"
                      subtitle="Video eğitim ve doktrin kütüphanesi."
                    />
                  }
                />
                <Route
                  path="forum"
                  element={
                    <ModulePlaceholder
                      title="Brifing Odası"
                      opsCode="BRF-03"
                      subtitle="Forum ve operasyon brifingleri."
                    />
                  }
                />
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
          </MuhabereNotifyProvider>
          </BrowserRouter>
        </FirebaseErrorProvider>
      </TcccAlertProvider>
    </AuthProvider>
  )
}
