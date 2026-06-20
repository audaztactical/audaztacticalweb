import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import IntroOverlay from '../components/IntroOverlay'
import LandingHeroGraphic from '../components/landing/LandingHeroGraphic'
import LandingIntelNewsGrid from '../components/landing/LandingIntelNewsGrid'
import LandingRegisterPanel from '../components/landing/LandingRegisterPanel'
import { feedStatusLabel } from '../components/landing/landingNewsTeasers'
import { useAuth } from '../context/AuthContext'
import {
  consumeGoogleAuthRedirectPath,
  hasPendingGoogleAuthRedirectPath,
} from '../lib/googleAuth'
import { markIntroAsShown, shouldShowIntro } from '../lib/introStorage'

/** @typedef {import('../components/landing/landingNewsTeasers').FeedStatus} FeedStatus */

function resolveShowIntro(skipIntro) {
  if (skipIntro || hasPendingGoogleAuthRedirectPath()) return false
  return shouldShowIntro(false)
}

function HudStatusPill({ status }) {
  const active = status === 'live' || status === 'teaser'
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-sm border px-2 py-1 font-mono-technical text-[9px] uppercase tracking-wider',
        active
          ? 'border-emerald-500/30 bg-emerald-950/30 text-emerald-400/90'
          : 'border-white/10 bg-black/30 text-app-text/45',
      ].join(' ')}
    >
      <span
        className={[
          'size-1.5 rounded-full',
          status === 'syncing' ? 'animate-pulse bg-emerald-400/60' : 'bg-emerald-400 shadow-[0_0_6px_1px_rgba(52,211,153,0.6)]',
        ].join(' ')}
        aria-hidden
      />
      [STATUS: {feedStatusLabel(status)}]
    </span>
  )
}

export default function LandingPage() {
  const { user, loading, googleRedirectResolving, profileLoading, userData, registrationInProgress } =
    useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const skipIntro = location.state?.skipIntro === true
  const [showIntro, setShowIntro] = useState(() => resolveShowIntro(skipIntro))
  const [feedStatus, setFeedStatus] = useState(/** @type {FeedStatus} */ ('syncing'))
  const [panelMode, setPanelMode] = useState(/** @type {'register' | 'login'} */ ('register'))

  const dismissIntro = useCallback(() => {
    setShowIntro(false)
  }, [])

  const handleFeedStatus = useCallback((status) => {
    setFeedStatus(status)
  }, [])

  const scrollToPanel = useCallback((mode = 'register') => {
    if (mode === 'login') setShowIntro(false)
    setPanelMode(mode)
    requestAnimationFrame(() => {
      document.getElementById('operasyon-paneli')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [])

  useEffect(() => {
    setShowIntro(resolveShowIntro(location.state?.skipIntro === true))
  }, [location.key, location.state?.skipIntro])

  useEffect(() => {
    if (!hasPendingGoogleAuthRedirectPath()) return
    markIntroAsShown()
    setShowIntro(false)
  }, [])

  useEffect(() => {
    if (!showIntro) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [showIntro])

  useEffect(() => {
    if (!location.state?.openAuth) return
    scrollToPanel('login')
  }, [location.state?.openAuth, scrollToPanel])

  useEffect(() => {
    if (loading || googleRedirectResolving || registrationInProgress || !user || showIntro) return
    // Profil henüz yoksa (yarım kayıt) dashboard'a atlama
    if (profileLoading || !userData?.username?.trim()) return
    // Karargâh'a Dön (skipIntro) ile bilinçli ziyaret — landing'de kal
    if (location.state?.skipIntro === true) return
    const target = hasPendingGoogleAuthRedirectPath()
      ? consumeGoogleAuthRedirectPath()
      : '/dashboard'
    navigate(target, { replace: true })
  }, [
    user,
    loading,
    googleRedirectResolving,
    registrationInProgress,
    profileLoading,
    userData?.username,
    navigate,
    showIntro,
    location.state?.skipIntro,
  ])

  return (
    <div className="relative min-h-dvh bg-[#0a0b0d] text-slate-100">
      {showIntro ? <IntroOverlay onFinish={() => setShowIntro(false)} /> : null}

      <div
        className="pointer-events-none fixed inset-0 opacity-30"
        style={{
          backgroundImage: `
            linear-gradient(rgba(52,211,153,0.07) 1px, transparent 1px),
            linear-gradient(90deg, rgba(52,211,153,0.07) 1px, transparent 1px),
            linear-gradient(rgba(255,170,0,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,170,0,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '64px 64px, 64px 64px, 16px 16px, 16px 16px',
        }}
        aria-hidden
      />
      <div className="app-atmosphere" aria-hidden />

      <header className="relative z-10 border-b border-emerald-500/15 bg-black/50 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link
            to="/"
            state={{ skipIntro: true }}
            className="flex items-center gap-3 transition-opacity hover:opacity-90"
            aria-label="Ana sayfa"
          >
            <img
              src="/logo.png"
              alt=""
              className="h-10 w-auto shrink-0 object-contain"
              decoding="async"
            />
            <div>
              <p className="font-display text-lg font-bold tracking-[0.15em] text-app-text">AUDAZ</p>
              <p className="font-display text-[10px] font-semibold tracking-[0.4em] text-accent">TACTICAL</p>
            </div>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3">
            {googleRedirectResolving ? (
              <span className="font-mono-technical text-[9px] uppercase tracking-wider text-emerald-400/70">
                [ GOOGLE · SYNC ]
              </span>
            ) : null}
            {!loading && user ? (
              <Link
                to="/dashboard"
                className="rounded-lg border border-accent/40 bg-accent/10 px-4 py-2 font-display text-sm font-bold text-accent transition hover:bg-accent/20"
              >
                Panele git
              </Link>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => scrollToPanel('login')}
                  className="rounded-lg border border-white/15 px-3 py-2 font-display text-sm font-semibold text-app-text/90 transition hover:border-white/25 hover:bg-white/5 sm:px-4"
                >
                  Giriş Yap
                </button>
                <button
                  type="button"
                  onClick={() => scrollToPanel('register')}
                  className="rounded-lg border border-accent/50 bg-accent/15 px-3 py-2 font-display text-sm font-bold text-accent shadow-[0_0_20px_-8px_rgba(255,180,0,0.45)] transition hover:bg-accent/25 sm:px-4"
                >
                  Hemen Katıl
                </button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="relative z-10">
        {/* Hero + operasyon grid */}
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
          <div className="text-center lg:text-left">
            <p className="font-mono-technical text-xs font-semibold uppercase tracking-[0.4em] text-emerald-400/90">
              <span className="text-app-text/30">[ </span>
              OPERASYONEL PLATFORM
              <span className="text-app-text/30"> ]</span>
            </p>
            <h1 className="font-display mt-3 text-2xl font-bold leading-tight tracking-tight text-app-text sm:mt-4 sm:text-4xl md:text-5xl lg:text-6xl">
              AUDAZ <span className="text-accent">TACTICAL</span>
            </h1>
            <p className="mt-3 text-base text-app-text/75 sm:mt-4 sm:text-lg md:text-xl">Sınırlarını Dijitalleştir</p>
          </div>

          <div
            className={[
              'mt-10 grid items-start gap-8 lg:gap-10',
              user ? 'grid-cols-1' : 'lg:grid-cols-[1.15fr_0.85fr]',
            ].join(' ')}
          >
            <LandingHeroGraphic expanded={Boolean(user)} />
            {!user ? (
              <LandingRegisterPanel initialMode={panelMode} onDismissIntro={dismissIntro} />
            ) : null}
          </div>
        </section>

        {/* HABER AKIŞI / DOKTRİN + haber teaser ızgarası */}
        <section className="border-t border-emerald-500/10 bg-black/25 py-14">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-3xl">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="font-display text-sm font-bold uppercase tracking-[0.25em] text-accent">
                    HABER AKIŞI / DOKTRİN
                  </h2>
                  <HudStatusPill status={feedStatus} />
                </div>
                <p className="mt-3 text-sm leading-relaxed text-app-text/60">
                  Güvenlik stratejileri ve sahadan bilgiler; sadece üye konsolunda şifrelenmiş tam erişimle.
                </p>
              </div>
            </div>
            <LandingIntelNewsGrid onStatusChange={handleFeedStatus} />
          </div>
        </section>

        <footer className="border-t border-white/10 py-8 text-center">
          <p className="font-mono-technical text-[10px] uppercase tracking-widest text-app-text/45">
            © AUDAZ TACTICAL – YETKİLİ KULLANIM
          </p>
        </footer>
      </main>
    </div>
  )
}
