import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion as Motion } from 'framer-motion'
import { X } from 'lucide-react'
import AmberAlert from '../common/AmberAlert'
import Input from '../common/Input'
import { useAuth } from '../../context/AuthContext'
import { useFirebaseErrorReporter } from '../../context/FirebaseErrorContext'
import { formatAuthErrorDisplay } from '../../lib/authErrorDisplay'
import { auth, isFirebaseConfigured } from '../../lib/firebase'
import { userRequiresEmailVerification } from '../../lib/authEmailVerification'
import { BETA_MIN_PASSWORD_LENGTH, resolveAuthEmailInput, validateBetaPassword } from '../../lib/betaAuth'
import { isPlatformInBetaPeriod } from '../../lib/registrationPolicy'
import Register from './Register'

export default function AuthModal({ open, onClose, initialMode = 'login', redirectTo = '/dashboard', registerTermsPreAccepted = false }) {
  const { t } = useTranslation('auth')
  const navigate = useNavigate()
  const { signInWithEmailPassword, registerWithEmailPassword } = useAuth()
  const { reportFirebaseError } = useFirebaseErrorReporter()

  const [mode, setMode] = useState(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) setMode(initialMode)
  }, [open, initialMode])

  const resetForm = () => {
    setEmail('')
    setPassword('')
    setError('')
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
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
              </Motion.div>
            </Motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  )
}
