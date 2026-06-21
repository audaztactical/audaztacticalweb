import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion as Motion } from 'framer-motion'
import { signOut } from 'firebase/auth'
import { Bug, Menu, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { auth } from '../lib/firebase'
import HudTicker from '../components/ui/HudTicker'
import NotificationDropdown from '../components/notifications/NotificationDropdown'
import Sidebar from '../components/navigation/Sidebar'

export default function MainLayout() {
  const { user, loading } = useAuth()
  const location = useLocation()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    setMobileNavOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!mobileNavOpen) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [mobileNavOpen])

  const closeMobileNav = () => setMobileNavOpen(false)

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
    <div className="relative z-[1] flex h-dvh min-h-0 overflow-hidden text-slate-100" style={{ backgroundColor: '#0a0a0a' }}>
      <div className="app-atmosphere" aria-hidden />

      <Bug
        className="corner-unit-mark right-4 top-6 size-14 sm:right-8 sm:top-8 sm:size-16"
        strokeWidth={1}
        aria-hidden
      />
      <Bug
        className="corner-unit-mark bottom-8 right-6 size-14 sm:bottom-10 sm:right-10 sm:size-16"
        strokeWidth={1}
        aria-hidden
      />

      {mobileNavOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
          aria-label="Menüyü kapat"
          onClick={closeMobileNav}
        />
      ) : null}

      <aside
        id="sidebar-nav"
        className={[
          'sidebar-shell fixed inset-y-0 left-0 z-50 flex w-[17.5rem] flex-col transition-transform duration-200 ease-out lg:static lg:z-10 lg:translate-x-0',
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        ].join(' ')}
        aria-label="Ana navigasyon"
      >
        <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-5">
          <Link
            to="/"
            state={{ skipIntro: true }}
            onClick={closeMobileNav}
            className="flex min-w-0 items-center gap-3 transition-opacity hover:opacity-90"
            aria-label="Ana sayfa"
          >
            <img
              src="/logo.png"
              alt="AUDAZ Tactical"
              className="h-12 w-auto shrink-0 object-contain"
              decoding="async"
            />
            <div className="min-w-0">
              <p className="font-mono-technical text-base font-bold leading-none tracking-[0.22em] text-app-text">AUDAZ</p>
              <p className="font-mono-technical mt-0.5 text-[10px] font-semibold tracking-[0.38em] text-accent">
                TACTICAL
              </p>
            </div>
          </Link>
          <button
            type="button"
            className="rounded-lg p-2 text-app-text/70 transition hover:bg-white/10 hover:text-app-text lg:hidden"
            aria-label="Menüyü kapat"
            onClick={closeMobileNav}
          >
            <X className="size-5" strokeWidth={1.75} aria-hidden />
          </button>
        </div>

        <Sidebar
          onNavigate={closeMobileNav}
          signingOut={signingOut}
          onSignOut={handleSignOut}
          userEmail={user?.email ?? ''}
          loading={loading}
        />
      </aside>

      <div className="relative z-[1] flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-white/10 bg-app-bg/85 px-4 backdrop-blur-md lg:hidden">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-accent"
            aria-expanded={mobileNavOpen}
            aria-controls="sidebar-nav"
            aria-label="Menüyü aç"
            onClick={() => setMobileNavOpen(true)}
          >
            <Menu className="size-5" strokeWidth={1.75} aria-hidden />
          </button>
          <Link to="/" state={{ skipIntro: true }} className="flex flex-1 justify-center" aria-label="Ana sayfa">
            <img
              src="/logo.png"
              alt="AUDAZ Tactical"
              className="h-9 w-auto object-contain"
              decoding="async"
            />
          </Link>
          <NotificationDropdown />
        </header>

        <main
          className="relative flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto"
          data-app-scroll-root
        >
          <div className="relative z-[110] hidden border-b border-white/10 bg-black/20 px-4 py-2 backdrop-blur-md md:flex md:items-center md:justify-end md:gap-3 lg:px-8">
            <NotificationDropdown />
            <HudTicker />
          </div>
          <div className="flex min-h-0 flex-1 flex-col p-4 sm:p-6 lg:p-8">
            <AnimatePresence mode="wait">
              <Motion.div
                key={location.pathname}
                className="flex min-h-0 flex-1 flex-col"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              >
                <Outlet />
              </Motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  )
}
