import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Lock, Play, Shield } from 'lucide-react'
import AuthModal from '../components/auth/AuthModal'
import HeroSlider from '../components/HeroSlider'
import IntroOverlay from '../components/IntroOverlay'
import { useAuth } from '../context/AuthContext'
import { fetchPublicDoctrineTeasers } from '../lib/firestoreDoctrines'
import { shouldShowIntro } from '../lib/introStorage'

const VIDEO_PLACEHOLDERS = [
  { id: '1', title: 'Temel silah güvenliği', duration: '12:04' },
  { id: '2', title: 'Gece görüş düzeni', duration: '08:41' },
  { id: '3', title: 'TCCC saha özeti', duration: '15:22' },
  { id: '4', title: 'Mesafe kestirimi', duration: '06:15' },
]

export default function LandingPage() {
  const { user, loading, googleRedirectResolving, googleAuthError, clearGoogleAuthError } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState('login')
  const [doctrines, setDoctrines] = useState([])
  const [doctrinesLoading, setDoctrinesLoading] = useState(true)
  const [doctrinesError, setDoctrinesError] = useState(false)
  const skipIntro = location.state?.skipIntro === true
  const [showIntro, setShowIntro] = useState(() => shouldShowIntro(skipIntro))

  const redirectTo =
    typeof location.state?.from === 'string' && location.state.from !== '/'
      ? location.state.from
      : '/dashboard'

  useEffect(() => {
    if (!location.state?.openAuth) return
    setAuthOpen(true)
    setAuthMode('login')
    navigate(location.pathname, { replace: true, state: { from: location.state?.from } })
  }, [location.key, location.pathname, location.state?.openAuth, navigate])

  useEffect(() => {
    setShowIntro(shouldShowIntro(location.state?.skipIntro === true))
  }, [location.key, location.state?.skipIntro])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setDoctrinesLoading(true)
      setDoctrinesError(false)
      try {
        const rows = await fetchPublicDoctrineTeasers(8)
        if (!cancelled) setDoctrines(rows)
      } catch {
        if (!cancelled) {
          setDoctrines([])
          setDoctrinesError(true)
        }
      } finally {
        if (!cancelled) setDoctrinesLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!showIntro) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [showIntro])

  return (
    <div className="relative min-h-dvh bg-[#0a0b0d] text-slate-100">
      {showIntro ? <IntroOverlay onFinish={() => setShowIntro(false)} /> : null}

      <div className="app-atmosphere" aria-hidden />

      <header className="relative z-10 border-b border-white/10 bg-black/40 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
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
              <p className="font-display text-lg font-bold tracking-[0.15em] text-white">AUDAZ</p>
              <p className="font-display text-[10px] font-semibold tracking-[0.4em] text-[#d4af37]">TACTICAL</p>
            </div>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3">
            {!loading && !googleRedirectResolving && user ? (
              <Link
                to="/dashboard"
                className="rounded-lg border border-[#ffb400]/40 bg-[#ffb400]/10 px-4 py-2 font-display text-sm font-bold text-[#ffb400] transition hover:bg-[#ffb400]/20"
              >
                Panele git
              </Link>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login')
                    setAuthOpen(true)
                  }}
                  className="rounded-lg border border-white/15 px-3 py-2 font-display text-sm font-semibold text-slate-300 transition hover:border-white/25 hover:bg-white/5 sm:px-4"
                >
                  Giriş Yap
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register')
                    setAuthOpen(true)
                  }}
                  className="rounded-lg border border-[#ffb400]/50 bg-[#ffb400]/15 px-3 py-2 font-display text-sm font-bold text-[#ffb400] shadow-[0_0_20px_-8px_rgba(255,180,0,0.45)] transition hover:bg-[#ffb400]/25 sm:px-4"
                >
                  Hemen Katıl
                </button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="relative z-10">
        {googleRedirectResolving ? (
          <div
            className="mx-auto max-w-6xl px-4 pt-6 sm:px-6"
            role="status"
            aria-live="polite"
          >
            <p className="rounded-lg border border-[#ffb400]/30 bg-[#ffb400]/10 px-4 py-3 font-mono-technical text-sm text-[#ffb400]">
              Google oturumu doğrulanıyor…
            </p>
          </div>
        ) : null}
        {googleAuthError ? (
          <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6">
            <div className="rounded-lg border border-orange-500/40 bg-orange-950/30 px-4 py-3 text-sm text-orange-100/95">
              <p className="font-mono-technical text-xs font-semibold uppercase tracking-widest text-orange-300">
                Google girişi tamamlanamadı
              </p>
              <p className="mt-1">
                {googleAuthError.code ? `${googleAuthError.code} — ` : ''}
                {googleAuthError.message}
              </p>
              <button
                type="button"
                onClick={clearGoogleAuthError}
                className="mt-2 text-xs text-orange-200/80 underline hover:text-orange-100"
              >
                Kapat
              </button>
            </div>
          </div>
        ) : null}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="max-w-3xl">
            <p className="font-mono-technical text-xs font-semibold uppercase tracking-[0.4em] text-[#ffb400]">
              <span className="text-white/30">[ </span>
              OPERASYONEL PLATFORM
              <span className="text-white/30"> ]</span>
            </p>
            <div className="relative mt-6 inline-flex">
              <div
                className="pointer-events-none absolute inset-[-12px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(255,180,0,0.22)_0%,transparent_70%)] blur-md"
                aria-hidden
              />
              <img
                src="/logo.png"
                alt="AUDAZ TACTICAL"
                className="relative h-32 w-auto max-w-full object-contain transition-transform duration-300 ease-out hover:scale-105"
                decoding="async"
              />
            </div>
            <h1 className="font-display mt-6 text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl md:text-6xl">
              AUDAZ <span className="text-[#ffb400]">TACTICAL</span>
            </h1>
            <p className="mt-6 text-lg text-slate-400 sm:text-xl">Sınırlarını Dijitalleştir</p>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-500">
              Doktrin, eğitim ve operasyonel araçlar tek güvenli çatı altında. Üye olarak tam içeriğe ve modüllere
              erişin.
            </p>
            {!user ? (
              <div className="mt-10 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register')
                    setAuthOpen(true)
                  }}
                  className="rounded-lg border border-[#ffb400]/55 bg-gradient-to-r from-[#ffb400]/25 to-[#d4af37]/15 px-8 py-3.5 font-display text-sm font-bold uppercase tracking-widest text-[#ffb400] shadow-[0_0_32px_-10px_rgba(255,180,0,0.5)] transition hover:border-[#ffb400] hover:from-[#ffb400]/35"
                >
                  Hemen Katıl
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login')
                    setAuthOpen(true)
                  }}
                  className="rounded-lg border border-white/15 px-6 py-3.5 font-display text-sm font-semibold text-slate-300 transition hover:bg-white/5"
                >
                  Zaten üye misin?
                </button>
              </div>
            ) : null}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-20">
          <HeroSlider />
        </section>

        <section className="border-t border-white/10 bg-black/20 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="font-display text-sm font-bold uppercase tracking-[0.25em] text-[#ffb400]">
                  Doktrin önizleme
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Yalnızca <span className="font-mono-technical text-[#d4af37]">isPublic: true</span> kayıtlar ve{' '}
                  <span className="text-slate-400">teaser</span> metinleri gösterilir.
                </p>
              </div>
              <Shield className="size-8 text-[#ffb400]/40" strokeWidth={1.25} aria-hidden />
            </div>

            {doctrinesLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="glass-card h-40 animate-pulse bg-white/[0.02]" />
                ))}
              </div>
            ) : doctrinesError ? (
              <p className="rounded-lg border border-orange-500/30 bg-orange-950/20 px-4 py-3 font-mono-technical text-sm text-orange-200/90">
                Doktrinler yüklenemedi. Firestore kurallarını ve koleksiyon adını (<code className="text-[#ffb400]">doktrinler</code>)
                kontrol edin.
              </p>
            ) : doctrines.length === 0 ? (
              <p className="font-mono-technical text-sm text-slate-500">
                Henüz herkese açık doktrin yok. Konsolda örnek belge:{' '}
                <code className="text-[#d4af37]">isPublic: true</code>, <code className="text-[#d4af37]">title</code>,{' '}
                <code className="text-[#d4af37]">teaser</code>
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {doctrines.map((d) => (
                  <article key={d.id} className="glass-card group relative flex flex-col overflow-hidden p-5">
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#ffb400]/[0.04] to-transparent opacity-0 transition group-hover:opacity-100" />
                    <h3 className="font-display text-lg font-bold text-white">{d.title}</h3>
                    <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-slate-400">
                      {d.teaser || 'Özet henüz eklenmemiş.'}
                    </p>
                    <div className="mt-5 flex items-center gap-2 border-t border-white/10 pt-4">
                      <Lock className="size-4 shrink-0 text-[#ffb400]" strokeWidth={1.75} aria-hidden />
                      <p className="font-mono-technical text-[11px] font-medium uppercase tracking-wide text-[#d4af37]/90">
                        Tamamını okumak için üye ol
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="font-display text-sm font-bold uppercase tracking-[0.25em] text-[#ffb400]">
              Taktik eğitim videoları
            </h2>
            <p className="mt-2 text-sm text-slate-500">Önizleme ızgarası — içerik yakında bağlanacak.</p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {VIDEO_PLACEHOLDERS.map((v) => (
                <div
                  key={v.id}
                  className="glass-card overflow-hidden transition hover:border-[#ffb400]/35 hover:shadow-[0_0_28px_-10px_rgba(255,180,0,0.35)]"
                >
                  <div className="relative flex aspect-video items-center justify-center bg-gradient-to-br from-white/[0.06] to-black/80">
                    <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,180,0,0.05)_50%,transparent_100%)]" />
                    <Play className="relative size-12 text-[#ffb400]/80" strokeWidth={1.25} fill="currentColor" fillOpacity={0.15} aria-hidden />
                    <span className="absolute bottom-2 right-2 rounded bg-black/70 px-2 py-0.5 font-mono-technical text-[10px] text-[#ffb400]">
                      {v.duration}
                    </span>
                  </div>
                  <div className="p-4">
                    <p className="font-display text-sm font-semibold text-slate-200">{v.title}</p>
                    <p className="mt-1 font-mono-technical text-[10px] uppercase tracking-wider text-slate-600">
                      Üyelere tam erişim
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <footer className="border-t border-white/10 py-8 text-center">
          <p className="font-mono-technical text-[10px] uppercase tracking-widest text-slate-600">
            © AUDAZ TACTICAL — Yetkili kullanım
          </p>
        </footer>
      </main>

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        initialMode={authMode}
        redirectTo={redirectTo}
      />
    </div>
  )
}
