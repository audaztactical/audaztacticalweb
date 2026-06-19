import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion as Motion } from 'framer-motion'
import { signOut } from 'firebase/auth'
import { Menu } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { auth } from '../lib/firebase'
import NotificationDropdown from '../components/notifications/NotificationDropdown'
import BottomTabBar from './BottomTabBar'
import MobileNavMenu from './MobileNavMenu'

export default function MobileLayout() {
  const { user } = useAuth()
  const location = useLocation()
  const [navMenuOpen, setNavMenuOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    document.documentElement.classList.add('native-app')
    return () => {
      document.documentElement.classList.remove('native-app')
    }
  }, [])

  useEffect(() => {
    setNavMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!navMenuOpen) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [navMenuOpen])

  const handleSignOut = async () => {
    if (!auth) return
    setSigningOut(true)
    try {
      await signOut(auth)
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <div
      className="mobile-app-shell native-layout relative z-[1] flex h-dvh min-h-0 flex-col overflow-hidden text-slate-100"
      style={{ backgroundColor: '#0a0a0a' }}
    >
      <div className="app-atmosphere" aria-hidden />

      <header className="mobile-app-header sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b border-white/10 bg-app-bg/90 px-3 backdrop-blur-md">
        <button
          type="button"
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-white/10 bg-white/5 text-accent"
          aria-expanded={navMenuOpen}
          aria-label="Modül menüsü"
          onClick={() => setNavMenuOpen(true)}
        >
          <Menu className="size-5" strokeWidth={1.75} aria-hidden />
        </button>

        <Link to="/dashboard" className="flex min-w-0 flex-1 justify-center" aria-label="Ana sayfa">
          <img src="/logo.png" alt="AUDAZ Tactical" className="h-9 w-auto object-contain" decoding="async" />
        </Link>

        <div className="flex min-w-[44px] items-center justify-end">
          <NotificationDropdown />
        </div>
      </header>

      <MobileNavMenu
        open={navMenuOpen}
        onClose={() => setNavMenuOpen(false)}
        signingOut={signingOut}
        onSignOut={handleSignOut}
        userEmail={user?.email ?? ''}
      />

      <main
        className="mobile-app-main relative flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain"
        data-app-scroll-root
      >
        <div className="flex-1 p-4">
          <AnimatePresence mode="wait">
            <Motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              <Outlet />
            </Motion.div>
          </AnimatePresence>
        </div>
      </main>

      <BottomTabBar />
    </div>
  )
}
