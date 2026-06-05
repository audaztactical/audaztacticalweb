import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion as Motion } from 'framer-motion'
import { signOut } from 'firebase/auth'
import { Bug, Menu, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { auth } from '../lib/firebase'
import HudTicker from '../components/ui/HudTicker'
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
    <div className="relative z-[1] flex min-h-dvh text-slate-100" style={{ backgroundColor: '#0a0a0a' }}>
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
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="relative shrink-0 rounded-lg p-0.5 shadow-[0_0_28px_-2px_rgba(255,180,0,0.45),0_0_48px_-12px_rgba(212,175,55,0.35)] ring-1 ring-[#ffb400]/30"
              aria-hidden
            >
              <img
                src="/logo.png"
                alt=""
                className="h-12 w-auto rounded-md object-contain"
                decoding="async"
              />
            </div>
            <div className="min-w-0">
              <p className="font-mono-technical text-base font-bold leading-none tracking-[0.22em] text-white">AUDAZ</p>
              <p className="font-mono-technical mt-0.5 text-[10px] font-semibold tracking-[0.38em] text-[#d4af37]">
                TACTICAL
              </p>
            </div>
          </div>
          <button
            type="button"
            className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white lg:hidden"
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

      <div className="relative z-[1] flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-white/10 bg-[#0a0a0a]/85 px-4 backdrop-blur-md lg:hidden">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-[#ffb400]"
            aria-expanded={mobileNavOpen}
            aria-controls="sidebar-nav"
            aria-label="Menüyü aç"
            onClick={() => setMobileNavOpen(true)}
          >
            <Menu className="size-5" strokeWidth={1.75} aria-hidden />
          </button>
          <img
            src="/logo.png"
            alt=""
            className="h-9 w-auto object-contain shadow-[0_0_20px_-4px_rgba(255,180,0,0.4)]"
            decoding="async"
          />
        </header>

        <main className="relative flex flex-1 flex-col overflow-auto">
          <div className="hidden border-b border-white/10 bg-black/20 px-4 py-2 backdrop-blur-md md:flex md:justify-end lg:px-8">
            <HudTicker />
          </div>
          <div className="flex-1 p-4 sm:p-6 lg:p-8">
            <AnimatePresence mode="wait">
              <Motion.div
                key={location.pathname}
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
