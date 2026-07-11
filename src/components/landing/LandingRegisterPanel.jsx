import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Loader2, Scale } from 'lucide-react'
import Input from '../common/Input'
import LegalDisclaimer from '../LegalDisclaimer'
import { useAuth } from '../../context/AuthContext'
import {
  formatAuthErrorDisplay,
  formatGoogleAuthErrorDisplay,
} from '../../lib/authErrorDisplay'
import { BETA_MIN_PASSWORD_LENGTH, resolveAuthEmailInput, validateBetaPassword } from '../../lib/betaAuth'
import { auth, isFirebaseConfigured } from '../../lib/firebase'
import { isPlatformInBetaPeriod } from '../../lib/registrationPolicy'
import {
  isUsernameAvailable,
  isValidUsernameNormalized,
  normalizeUsername,
} from '../../lib/firestoreUsers'
import { LEGAL_PROTOCOL_COUNT } from '../../data/legalProtocols'

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

/**
 * @param {{ initialMode?: 'register' | 'login'; onDismissIntro?: () => void }} props
 */
export default function LandingRegisterPanel({ initialMode = 'register', onDismissIntro }) {
  const { t } = useTranslation('auth')
  const { t: tCommon } = useTranslation('common')
  const navigate = useNavigate()
  const { registerWithEmailPassword, recordRegistrationConsents, signInWithEmailPassword, signInWithGoogle } =
    useAuth()
  const betaMode = isPlatformInBetaPeriod()
  const configured = isFirebaseConfigured() && auth

  const [mode, setMode] = useState(/** @type {'register' | 'login'} */ (initialMode))

  useEffect(() => {
    setMode(initialMode)
  }, [initialMode])
  const [callsign, setCallsign] = useState('')
  const [email, setEmail] = useState('')
  const [usernameDraft, setUsernameDraft] = useState('')
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [ageDeclared, setAgeDeclared] = useState(false)
  const [legalOpen, setLegalOpen] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)
  const [checkingUsername, setCheckingUsername] = useState(false)

  const validateRegister = async () => {
    const fe = {}
    setFormError('')

    if (!callsign.trim()) {
      fe.callsign = t('validation.callsignRequired')
    }

    const mail = email.trim()
    if (!mail) {
      fe.email = t('validation.emailRequired')
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
      fe.email = t('validation.emailInvalid')
    }

    const normalized = normalizeUsername(usernameDraft)
    if (!normalized) {
      fe.usernameDraft = t('validation.usernameRequired')
    } else if (!isValidUsernameNormalized(normalized)) {
      fe.usernameDraft = t('validation.usernameFormat')
    } else {
      setCheckingUsername(true)
      try {
        const free = await isUsernameAvailable(normalized)
        if (!free) fe.usernameDraft = t('validation.usernameTaken')
      } catch {
        fe.usernameDraft = t('validation.usernameCheckFailed')
      } finally {
        setCheckingUsername(false)
      }
    }

    if (!validateBetaPassword(password).ok) {
      fe.password = t('validation.passwordMinShort', { min: BETA_MIN_PASSWORD_LENGTH })
    }

    if (!termsAccepted) {
      setFormError(t('legal.mustAccept', { count: LEGAL_PROTOCOL_COUNT }))
    }

    if (!ageDeclared) {
      setFormError((prev) => prev || tCommon('legal.ageDeclaration.required'))
    }

    setFieldErrors(fe)
    return Object.keys(fe).length === 0 && termsAccepted && ageDeclared
  }

  const validateLogin = () => {
    const fe = {}
    setFormError('')
    const id = loginId.trim()
    if (!id) fe.loginId = t('validation.loginIdRequired')
    if (!password || !validateBetaPassword(password).ok) {
      fe.password = t('validation.passwordMinShort', { min: BETA_MIN_PASSWORD_LENGTH })
    }
    setFieldErrors(fe)
    return Object.keys(fe).length === 0
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    if (!termsAccepted) {
      setLegalOpen(true)
      setFormError(t('legal.mustAccept', { count: LEGAL_PROTOCOL_COUNT }))
      return
    }

    if (!ageDeclared) {
      setFormError(tCommon('legal.ageDeclaration.required'))
      return
    }

    const ok = await validateRegister()
    if (!ok) return

    setBusy(true)
    try {
      const normalizedUsername = normalizeUsername(usernameDraft)
      const authEmail = email.trim()
      const authPassword = password

      await registerWithEmailPassword({
        email: authEmail,
        password: authPassword,
        username: normalizedUsername,
        callsign: callsign.trim(),
        bloodType: '',
        status: betaMode ? 'Beta' : 'Sivil',
        role: 'member',
        accountStatus: 'active',
      })
      try {
        await recordRegistrationConsents()
      } catch {
        /* profil güncellemesi opsiyonel */
      }
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const code = err?.code ?? ''
      if (code === 'auth/email-already-in-use') {
        setFormError(formatAuthErrorDisplay(err, { emailOrUsername: true }))
      } else if (code === 'username-already-in-use') {
        setFieldErrors((f) => ({ ...f, usernameDraft: t('validation.usernameTaken') }))
      } else if (code === 'permission-denied' || String(code).includes('permission')) {
        setFormError(t('errors.permissionDenied'))
      } else {
        setFormError(formatAuthErrorDisplay(err))
      }
    } finally {
      setBusy(false)
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!validateLogin()) return

    setBusy(true)
    try {
      const id = loginId.trim()
      const authEmail = resolveAuthEmailInput(id)

      await signInWithEmailPassword(authEmail, password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setFormError(formatAuthErrorDisplay(err))
    } finally {
      setBusy(false)
    }
  }

  const handleGoogleSignIn = async () => {
    if (!configured) {
      setFormError(t('errors.firebaseNotConfigured'))
      return
    }

    onDismissIntro?.()
    setFormError('')
    setBusy(true)
    try {
      const outcome = await signInWithGoogle('/dashboard')
      if (outcome?.mode === 'popup' && outcome.credential?.user) {
        navigate('/dashboard', { replace: true })
      }
    } catch (err) {
      setFormError(formatGoogleAuthErrorDisplay(err))
    } finally {
      setBusy(false)
    }
  }

  const submitBusy = busy || checkingUsername

  const registerButtonLabel = checkingUsername
    ? t('actions.checkingUsername')
    : busy
      ? t('actions.registering')
      : t('actions.register')

  return (
    <div
      id="operasyon-paneli"
      className="rounded-sm border border-emerald-500/20 bg-black/25 p-5 backdrop-blur-sm sm:p-6"
    >
      <div className="mb-5 flex rounded-sm border border-white/10 bg-black/40 p-0.5">
        <button
          type="button"
          onClick={() => {
            setMode('register')
            setFormError('')
            setFieldErrors({})
          }}
          className={[
            'flex-1 rounded-sm py-2 font-mono-technical text-[10px] font-bold uppercase tracking-wider transition',
            mode === 'register'
              ? 'bg-emerald-500/15 text-emerald-400'
              : 'text-app-text/50 hover:text-app-text/80',
          ].join(' ')}
        >
          {t('tabs.register')}
        </button>
        <button
          type="button"
          onClick={() => {
            onDismissIntro?.()
            setMode('login')
            setFormError('')
            setFieldErrors({})
          }}
          className={[
            'flex-1 rounded-sm py-2 font-mono-technical text-[10px] font-bold uppercase tracking-wider transition',
            mode === 'login'
              ? 'bg-emerald-500/15 text-emerald-400'
              : 'text-app-text/50 hover:text-app-text/80',
          ].join(' ')}
        >
          {t('tabs.login')}
        </button>
      </div>

      {mode === 'register' ? (
        <form onSubmit={(e) => void handleRegister(e)} className="space-y-3">
          <p className="font-mono-technical text-[9px] uppercase tracking-[0.2em] text-emerald-400/80">
            {t('chrome.enrolment')}
          </p>

          <Input
            variant="gold"
            label={t('fields.callsign')}
            name="callsign"
            autoComplete="nickname"
            value={callsign}
            onChange={(e) => setCallsign(e.target.value.toUpperCase())}
            placeholder={t('placeholders.callsign')}
            error={fieldErrors.callsign}
            required
          />
          <Input
            variant="gold"
            label={t('fields.email')}
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value.trim())}
            placeholder={t('placeholders.email')}
            error={fieldErrors.email}
            required
          />
          <Input
            variant="gold"
            label={t('fields.username')}
            name="username"
            autoComplete="username"
            value={usernameDraft}
            onChange={(e) =>
              setUsernameDraft(e.target.value.toLowerCase().replace(/[^a-z0-9_\s]/g, ''))
            }
            placeholder={t('placeholders.username')}
            error={fieldErrors.usernameDraft}
            required
          />
          <Input
            variant="gold"
            label={t('fields.password')}
            name="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('placeholders.password', { min: BETA_MIN_PASSWORD_LENGTH })}
            error={fieldErrors.password}
            required
          />

          {checkingUsername ? (
            <p className="font-mono-technical text-[9px] text-app-text/45" aria-live="polite">
              {t('actions.verifyingUsername')}
            </p>
          ) : null}

          <div className="rounded-sm border border-emerald-500/20 bg-black/30 px-3 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono-technical text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  {t('legal.panelTitle')}
                </p>
                <p className="mt-1.5 font-sans text-xs leading-relaxed text-app-text/60">
                  {termsAccepted
                    ? t('legal.accepted')
                    : t('legal.requiredHint', { count: LEGAL_PROTOCOL_COUNT })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLegalOpen(true)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-sm border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 font-mono-technical text-[10px] font-bold uppercase tracking-wider text-emerald-400 transition hover:bg-emerald-500/18"
              >
                <Scale className="size-3.5" aria-hidden />
                {termsAccepted ? t('legal.readAgain') : t('legal.readProtocol')}
              </button>
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-sm border border-emerald-500/20 bg-black/30 px-3 py-3">
            <input
              type="checkbox"
              className="mt-1 size-4 shrink-0 accent-emerald-400"
              checked={ageDeclared}
              disabled={submitBusy}
              onChange={(e) => setAgeDeclared(e.target.checked)}
            />
            <span className="font-sans text-xs leading-relaxed text-app-text/80">
              {tCommon('legal.ageDeclaration.checkbox')}
            </span>
          </label>

          {formError ? (
            <p className="font-mono-technical text-[10px] text-accent/90">{formError}</p>
          ) : null}

          <button
            type="submit"
            disabled={submitBusy || !termsAccepted || !ageDeclared}
            className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-sm border border-emerald-500/55 bg-emerald-500/15 py-3 font-mono-technical text-xs font-bold uppercase tracking-[0.16em] text-emerald-400 transition hover:bg-emerald-500/22 disabled:cursor-not-allowed disabled:border-white/15 disabled:bg-black/35 disabled:text-app-text/50"
          >
            {submitBusy ? (
              <>
                <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                <span>{registerButtonLabel}</span>
              </>
            ) : (
              t('actions.register')
            )}
          </button>
          {betaMode ? (
            <p className="font-mono-technical text-[8px] uppercase tracking-wider text-app-text/40">
              {t('hints.betaNoEmailVerify')}
            </p>
          ) : null}

          <LegalDisclaimer
            open={legalOpen}
            persist={false}
            onClose={() => setLegalOpen(false)}
            onConfirmed={() => {
              setTermsAccepted(true)
              setLegalOpen(false)
              setFormError('')
            }}
          />
        </form>
      ) : (
        <div className="space-y-3">
          <form onSubmit={(e) => void handleLogin(e)} className="space-y-3">
            <p className="font-mono-technical text-[9px] uppercase tracking-[0.2em] text-emerald-400/80">
              {t('chrome.secureChannel')}
            </p>

            <Input
              variant="gold"
              label={t('fields.loginId')}
              name="loginId"
              autoComplete="username"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              placeholder={betaMode ? t('placeholders.loginIdBeta') : t('placeholders.loginId')}
              error={fieldErrors.loginId}
              required
            />
            <Input
              variant="gold"
              label={t('fields.password')}
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('placeholders.password', { min: BETA_MIN_PASSWORD_LENGTH })}
              error={fieldErrors.password}
              required
            />

            {formError ? (
              <p className="font-mono-technical text-[10px] text-accent/90">{formError}</p>
            ) : null}

            <button
              type="submit"
              disabled={submitBusy}
              className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-sm border border-emerald-500/55 bg-emerald-500/15 py-3 font-mono-technical text-xs font-bold uppercase tracking-[0.16em] text-emerald-400 transition hover:bg-emerald-500/22 disabled:cursor-not-allowed disabled:border-white/15 disabled:bg-black/35 disabled:text-app-text/50"
            >
              {busy ? (
                <>
                  <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                  <span>{t('actions.signingIn')}</span>
                </>
              ) : (
                t('actions.login')
              )}
            </button>
          </form>

          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <span className="font-mono-technical text-[9px] uppercase tracking-[0.25em] text-app-text/45">
              {t('chrome.or')}
            </span>
            <span className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>

          <button
            type="button"
            onClick={() => void handleGoogleSignIn()}
            disabled={submitBusy || !configured}
            className="flex w-full items-center justify-center gap-2.5 rounded-sm border border-white/15 bg-black/30 py-3 font-display text-[10px] font-bold uppercase tracking-[0.18em] text-app-text/90 transition hover:border-emerald-500/35 hover:bg-emerald-950/25 disabled:opacity-45"
          >
            <GoogleMark className="size-4 shrink-0" />
            {t('actions.googleSignIn')}
          </button>
        </div>
      )}
    </div>
  )
}
