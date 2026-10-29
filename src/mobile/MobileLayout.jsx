import { useEffect, useRef, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion as Motion } from 'framer-motion'
import { signOut } from 'firebase/auth'
import { Menu } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { auth } from '../lib/firebase'
import { isNeuralPreviewEnabled } from '../lib/neural/neuralPreview'
import NotificationDropdown from '../components/notifications/NotificationDropdown'
import LanguageSwitcher from '../components/shared/LanguageSwitcher'
import BottomTabBar from './BottomTabBar'
import MobileNavMenu from './MobileNavMenu'
import { useNavUi } from '../hooks/useNavLabels'

export default function MobileLayout() {
  const { user } = useAuth()
  const navUi = useNavUi()
  const location = useLocation()
  const [navMenuOpen, setNavMenuOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const chromeTopRef = useRef(/** @type {HTMLElement|null} */ (null))

  const neuralOnly =
    (location.pathname === '/dashboard' || location.pathname === '/dashboard/') &&
    isNeuralPreviewEnabled()

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

  useEffect(() => {
    const el = chromeTopRef.current
    if (!neuralOnly || !el) {
      document.documentElement.style.removeProperty('--ob-chrome-top')
      return undefined
    }
    const apply = () => {
      document.documentElement.style.setProperty(
        '--ob-chrome-top',
        `${Math.round(el.getBoundingClientRect().height)}px`,
      )
    }
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(el)
    return () => {
      ro.disconnect()
      document.documentElement.style.removeProperty('--ob-chrome-top')
    }
  }, [neuralOnly])

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
      className={[
        'mobile-app-shell native-layout relative z-[1] flex h-dvh min-h-0 flex-col overflow-hidden text-slate-100',
        neuralOnly ? 'ob-neural-mode' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ backgroundColor: '#0a0a0a' }}
    >
      <div className="app-atmosphere" aria-hidden />

      <header
        ref={chromeTopRef}
        className={[
          'mobile-app-header sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 px-3',
          neuralOnly
            ? 'ob-neural-chrome border-b border-white/10 bg-black/35 backdrop-blur-md'
            : 'border-b border-white/10 bg-app-bg/90 backdrop-blur-md',
        ].join(' ')}
      >
        <button
          type="button"
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-white/10 bg-white/5 text-accent"
          aria-expanded={navMenuOpen}
          aria-label={navUi.moduleMenuAria}
          onClick={() => setNavMenuOpen(true)}
        >
          <Menu className="size-5" strokeWidth={1.75} aria-hidden />
        </button>

        <Link to="/dashboard" className="flex min-w-0 flex-1 justify-center" aria-label={navUi.homeAria}>
          <img src="/logo.png" alt="AUDAZ Tactical" className="h-9 w-auto object-contain" decoding="async" />
        </Link>

        <div className="flex shrink-0 items-center gap-1.5">
          <LanguageSwitcher />
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
        className={[
          'mobile-app-main relative flex min-h-0 flex-1 flex-col overflow-x-hidden overscroll-y-contain',
          neuralOnly ? 'overflow-hidden' : 'overflow-y-auto',
        ].join(' ')}
        data-app-scroll-root
      >
        <div className={['flex min-h-0 flex-1 flex-col', neuralOnly ? 'p-0' : 'p-4'].join(' ')}>
          <AnimatePresence mode="wait">
            <Motion.div
              key={location.pathname}
              className="flex min-h-0 flex-1 flex-col"
              initial={neuralOnly ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={neuralOnly ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              <Outlet />
            </Motion.div>
          </AnimatePresence>
        </div>
      </main>

      {neuralOnly ? null : <BottomTabBar />}
    </div>
  )
}
