import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion as Motion } from 'framer-motion'
import { X } from 'lucide-react'
import AmberAlert from '../common/AmberAlert'
import Input from '../common/Input'
import { useAuth } from '../../context/AuthContext'
import { useFirebaseErrorReporter } from '../../context/FirebaseErrorContext'
import { formatAuthErrorDisplay, formatGoogleAuthAlert } from '../../lib/authErrorDisplay'
import { auth, isFirebaseConfigured } from '../../lib/firebase'
import { userRequiresEmailVerification } from '../../lib/authEmailVerification'
import { BETA_MIN_PASSWORD_LENGTH, resolveAuthEmailInput, validateBetaPassword } from '../../lib/betaAuth'
import { isPlatformInBetaPeriod } from '../../lib/registrationPolicy'
import Register from './Register'

function GoogleMark({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}

export default function AuthModal({ open, onClose, initialMode = 'login', redirectTo = '/dashboard', registerTermsPreAccepted = false }) {
  const { t } = useTranslation('auth')
  const navigate = useNavigate()
  const {
    signInWithGoogle,
    signInWithEmailPassword,
    registerWithEmailPassword,
  } = useAuth()
  const { reportFirebaseError } = useFirebaseErrorReporter()

  const [mode, setMode] = useState(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [oauthAlert, setOauthAlert] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) setMode(initialMode)
  }, [open, initialMode])

  const resetForm = () => {
    setEmail('')
    setPassword('')
    setError('')
    setOauthAlert(null)
    setFieldErrors({})
  }

  const validateLoginFields = () => {
    const fe = {}
    const loginId = email.trim()
    if (!loginId) {
      fe.email = t('validation.errLoginId')
    } else if (loginId.includes('@')) {
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginId)
      if (!emailOk) {
        fe.email = t('validation.errEmailInvalid')
      }
    } else if (loginId.length < 3) {
      fe.email = t('validation.errUsernameFormat')
    }

    const passwordCheck = validateBetaPassword(password)
    if (!passwordCheck.ok) {
      fe.password = t('validation.errPasswordPolicy', {
        message: t('validation.passwordMin', { min: BETA_MIN_PASSWORD_LENGTH }),
      })
    }
    setFieldErrors(fe)
    return Object.keys(fe).length === 0
  }

  const configured = isFirebaseConfigured() && auth

  const handleGoogleSignIn = async () => {
    if (!configured) {
      setError(t('errors.firebaseNotConfiguredEnv'))
      return
    }
    setError('')
    setOauthAlert(null)
    setFieldErrors({})
    setBusy(true)
    try {
      const nextPath = redirectTo.startsWith('/') ? redirectTo : `/${redirectTo}`
      const outcome = await signInWithGoogle(nextPath)

      if (outcome?.mode === 'popup' && outcome.credential?.user) {
        onClose?.()
        const dest = userRequiresEmailVerification(outcome.credential.user) ? '/verify-email' : nextPath
        navigate(dest, { replace: true })
      }
      // mode === 'redirect' → sayfa Google'a gider; dönüş GoogleAuthRedirectHandler + AuthContext'te
    } catch (err) {
      reportFirebaseError(err)

      if (import.meta.env.DEV) {
        console.error('[AUDAZ HUD · GOOGLE_AUTH · AuthModal]', {
          firebaseAuthErrorCode: err?.code ?? '',
          message: typeof err?.message === 'string' ? err.message : String(err ?? ''),
        })
      }

      const { title, body } = formatGoogleAuthAlert(err)
      setOauthAlert({ label: title, body })
    } finally {
      setBusy(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setOauthAlert(null)
    setFieldErrors({})

    if (!configured) {
      setError(t('errors.firebaseNotConfiguredEnv'))
      return
    }

    if (mode === 'login') {
      if (!validateLoginFields()) return
    } else {
      return
    }

    setBusy(true)
    try {
      const loginInput = email.trim()
      const authEmail = resolveAuthEmailInput(loginInput)
      const cred = await signInWithEmailPassword(authEmail, password)
      if (userRequiresEmailVerification(cred.user)) {
        onClose()
        resetForm()
        navigate('/verify-email', { replace: true })
        return
      }
      onClose()
      resetForm()
      const nextPath = redirectTo.startsWith('/') ? redirectTo : `/${redirectTo}`
      navigate(nextPath, { replace: true })
    } catch (err) {
      reportFirebaseError(err)
      const code = err?.code ?? ''
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        setError(formatAuthErrorDisplay(err, { coded: true }))
      } else if (code === 'auth/email-already-in-use') {
        setError(formatAuthErrorDisplay(err, { coded: true }))
      } else if (code === 'auth/invalid-email') {
        setFieldErrors((f) => ({ ...f, email: formatAuthErrorDisplay(err, { coded: true }) }))
      } else if (code === 'auth/weak-password') {
        setFieldErrors((f) => ({ ...f, password: formatAuthErrorDisplay(err, { coded: true }) }))
      } else if (code === 'username-already-in-use') {
        setFieldErrors((f) => ({
          ...f,
          usernameDraft: formatAuthErrorDisplay(err, { coded: true }),
        }))
      } else if (code === 'username-invalid') {
        setFieldErrors((f) => ({
          ...f,
          usernameDraft: formatAuthErrorDisplay(err, { coded: true }),
        }))
      } else if (err?.message?.includes('Firebase yapılandırılmadı') || err?.message?.includes('Firebase is not configured')) {
        setError(t('errors.firebaseNotConfiguredEnv'))
      } else {
        setError(formatAuthErrorDisplay(err))
      }
    } finally {
      setBusy(false)
    }
  }

  const isRegister = mode === 'register'

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <Motion.button
            type="button"
            className="absolute inset-0 bg-[#050608]/85"
            aria-label={t('chrome.close')}
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />

          <Motion.div
            className="relative max-h-[min(94vh,880px)] w-full max-w-xl overflow-y-auto overflow-x-hidden rounded-2xl border border-accent/35 bg-[#12151c] shadow-[0_24px_80px_-20px_rgba(0,0,0,0.85)] sm:max-w-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-modal-title"
            layout
            initial={{ opacity: 0, scale: 0.97, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 18 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,180,0,0.06)_0%,transparent_50%)]" />

              <Motion.div layout className="relative border-b border-white/10 px-6 pb-4 pt-6 sm:px-8">
                <button
                  type="button"
                  onClick={onClose}
                  className="absolute right-4 top-4 rounded-lg p-2 text-app-text/55 transition hover:bg-white/10 hover:text-app-text"
                  aria-label={t('chrome.closeModal')}
                >
                  <X className="size-5" strokeWidth={1.75} />
                </button>
                <div className="flex flex-col items-center gap-3 px-8 text-center">
                  <Motion.div layout className="relative">
                    <div
                      className="pointer-events-none absolute inset-[-10px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(255,180,0,0.2)_0%,transparent_72%)] blur-sm"
                      aria-hidden
                    />
                    <img
                      src="/logo.png"
                      alt=""
                      className="relative mx-auto h-20 w-auto object-contain shadow-[0_0_32px_-8px_rgba(255,180,0,0.5)]"
                      decoding="async"
                    />
                  </Motion.div>
                  <h2 id="auth-modal-title" className="font-display text-lg font-bold tracking-wide text-app-text">
                    {isRegister ? t('tabs.register') : t('tabs.login')}
                  </h2>
                </div>
              </Motion.div>

              <Motion.div layout className="relative px-6 pb-2 pt-4 sm:px-8">
                <div className="mb-5 flex rounded-lg border border-white/10 bg-black/40 p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login')
                      setError('')
                      setOauthAlert(null)
                      setFieldErrors({})
                    }}
                    className={[
                      'flex-1 rounded-md py-2 font-display text-sm font-semibold transition',
                      mode === 'login'
                        ? 'bg-accent/20 text-accent shadow-[0_0_20px_-8px_rgba(255,180,0,0.5)]'
                        : 'text-app-text/55 hover:text-app-text/90',
                    ].join(' ')}
                  >
                    {t('actions.switchToLogin')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('register')
                      setError('')
                      setOauthAlert(null)
                      setFieldErrors({})
                    }}
                    className={[
                      'flex-1 rounded-md py-2 font-display text-sm font-semibold transition',
                      mode === 'register'
                        ? 'bg-accent/20 text-accent shadow-[0_0_20px_-8px_rgba(255,180,0,0.5)]'
                        : 'text-app-text/55 hover:text-app-text/90',
                    ].join(' ')}
                  >
                    {t('actions.switchToRegister')}
                  </button>
                </div>

                <AnimatePresence mode="wait" initial={false}>
                  {isRegister ? (
                    <Motion.div
                      key="register"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      {error ? (
                        <div className="mb-3">
                          <AmberAlert>{error}</AmberAlert>
                        </div>
                      ) : null}
                      <Register
                        registerWithEmailPassword={registerWithEmailPassword}
                        disabled={busy || !configured}
                        initialTermsAccepted={registerTermsPreAccepted}
                        onSuccess={() => {
                          onClose()
                          resetForm()
                          navigate('/dashboard', { replace: true })
                        }}
                        onError={(message) => setError(message)}
                      />
                    </Motion.div>
                  ) : (
                    <Motion.form
                      key="login"
                      onSubmit={handleSubmit}
                      className="space-y-3 pb-6"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Input
                        variant="gold"
                        label={isPlatformInBetaPeriod() ? t('fields.loginIdOrEmail') : t('fields.email')}
                        id="auth-email"
                        type="text"
                        name="email"
                        autoComplete="username"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={isPlatformInBetaPeriod() ? t('placeholders.loginIdBeta') : t('placeholders.loginId')}
                        error={fieldErrors.email}
                        required
                      />

                      <Input
                        variant="gold"
                        label={t('fields.password')}
                        id="auth-password"
                        type="password"
                        name="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={t('placeholders.password', { min: BETA_MIN_PASSWORD_LENGTH })}
                        error={fieldErrors.password}
                        required
                      />
                      {isPlatformInBetaPeriod() ? (
                        <p className="font-mono-technical text-[9px] leading-relaxed text-app-text/50">
                          {t('hints.betaUsernameLogin')}
                        </p>
                      ) : null}

                      {error ? <AmberAlert>{error}</AmberAlert> : null}

                      <button
                        type="submit"
                        disabled={busy}
                        className="w-full rounded-lg border border-accent/50 bg-gradient-to-r from-accent/20 to-[#d4af37]/15 py-3.5 font-display text-sm font-bold uppercase tracking-[0.2em] text-accent shadow-[0_0_24px_-8px_rgba(255,180,0,0.45)] transition hover:border-accent/80 hover:from-accent/30 disabled:opacity-50"
                      >
                        {busy ? (
                          <span className="font-mono-technical tracking-widest">…</span>
                        ) : (
                          t('actions.login')
                        )}
                      </button>
                    </Motion.form>
                  )}
                </AnimatePresence>

                <Motion.div layout className="space-y-4 pb-6 pt-2">
                  <div className="flex items-center gap-3">
                    <span className="h-px flex-1 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
                    <span className="font-mono-technical text-[10px] font-semibold uppercase tracking-[0.35em] text-app-text/55">
                      {t('chrome.or')}
                    </span>
                    <span className="h-px flex-1 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
                  </div>

                  {oauthAlert ? (
                    <AmberAlert label={oauthAlert.label}>{oauthAlert.body}</AmberAlert>
                  ) : null}

                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={busy || !configured}
                    className="glass-card flex w-full items-center justify-center gap-3 rounded-xl border border-[#d4af37]/55 bg-white/[0.04] px-4 py-3.5 font-display text-[11px] font-bold uppercase tracking-[0.28em] text-app-text shadow-[inset_0_1px_0_rgba(255,180,0,0.12),0_8px_32px_-12px_rgba(0,0,0,0.5)] transition hover:border-accent/80 hover:bg-accent/[0.08] disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <GoogleMark className="size-5 shrink-0" />
                    <span className="text-[#f0e6d2]">{t('actions.googleSignInUpper')}</span>
                  </button>
                </Motion.div>
              </Motion.div>
            </Motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  )
}
