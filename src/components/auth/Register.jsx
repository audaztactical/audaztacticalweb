import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Scale } from 'lucide-react'
import Input from '../common/Input'
import LegalDisclaimer from '../LegalDisclaimer'
import { useAuth } from '../../context/AuthContext'
import { formatAuthErrorDisplay } from '../../lib/authErrorDisplay'
import { isPlatformInBetaPeriod } from '../../lib/registrationPolicy'
import { BETA_MIN_PASSWORD_LENGTH, validateBetaPassword } from '../../lib/betaAuth'
import { LEGAL_PROTOCOL_COUNT } from '../../data/legalProtocols'
import {
  normalizeUsername,
  isUsernameAvailable,
  isValidUsernameNormalized,
} from '../../lib/firestoreUsers'

/**
 * @param {{
 *   registerWithEmailPassword: (payload: {
 *     email: string
 *     password: string
 *     username: string
 *     callsign: string
 *     bloodType?: string
 *     status?: string
 *     role?: string
 *     accountStatus?: string
 *   }) => Promise<unknown>
 *   onSuccess: () => void
 *   onError: (message: string, fieldErrors?: Record<string, string>) => void
 *   disabled?: boolean
 *   initialTermsAccepted?: boolean
 * }} props
 */
export default function Register({
  registerWithEmailPassword,
  onSuccess,
  onError,
  disabled = false,
  initialTermsAccepted = false,
}) {
  const { t } = useTranslation('auth')
  const { t: tCommon } = useTranslation('common')
  const { recordRegistrationConsents } = useAuth()
  const betaMode = isPlatformInBetaPeriod()
  const [email, setEmail] = useState('')
  const [usernameDraft, setUsernameDraft] = useState('')
  const [callsign, setCallsign] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [checkingUsername, setCheckingUsername] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(initialTermsAccepted)
  const [ageDeclared, setAgeDeclared] = useState(false)
  const [legalOpen, setLegalOpen] = useState(false)

  useEffect(() => {
    if (initialTermsAccepted) setTermsAccepted(true)
  }, [initialTermsAccepted])

  const validateRegisterStatic = async () => {
    const fe = {}

    if (!callsign.trim()) {
      fe.callsign = t('validation.errCallsign')
    }

    const mail = email.trim()
    if (!mail) {
      fe.email = t('validation.errEmailRequired')
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
      fe.email = t('validation.errEmailInvalid')
    }

    const normalized = normalizeUsername(usernameDraft)
    if (!normalized) {
      fe.usernameDraft = t('validation.errUsernameRequired')
    } else if (!isValidUsernameNormalized(normalized)) {
      fe.usernameDraft = t('validation.errUsernameFormat')
    } else {
      setCheckingUsername(true)
      try {
        const free = await isUsernameAvailable(normalized)
        if (!free) {
          fe.usernameDraft = t('validation.errUsernameTaken')
        }
      } catch {
        fe.usernameDraft = t('validation.usernameCheckFailed')
      } finally {
        setCheckingUsername(false)
      }
    }

    if (!validateBetaPassword(password).ok) {
      fe.password = t('validation.errPasswordPolicy', {
        message: t('validation.passwordMin', { min: BETA_MIN_PASSWORD_LENGTH }),
      })
    }

    setFieldErrors(fe)
    return Object.keys(fe).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFieldErrors({})

    const okStatic = await validateRegisterStatic()
    if (!okStatic) return

    if (!termsAccepted) {
      setLegalOpen(true)
      return
    }

    if (!ageDeclared) {
      onError(tCommon('legal.ageDeclaration.required'))
      return
    }

    setBusy(true)
    try {
      const normalizedUsername = normalizeUsername(usernameDraft)
      const authEmail = email.trim()

      await registerWithEmailPassword({
        email: authEmail,
        password,
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
        /* Kayıt tamam; protokol onayı ayarlardan tekrarlanabilir */
      }
      onSuccess()
    } catch (err) {
      const code = err?.code ?? ''
      if (code === 'auth/email-already-in-use') {
        onError(formatAuthErrorDisplay(err, { emailOrUsername: true }))
      } else if (code === 'auth/invalid-email') {
        onError(formatAuthErrorDisplay(err))
      } else if (code === 'auth/weak-password') {
        onError(t('errors.errPasswordUsernameHint'))
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
      } else {
        onError(
          formatAuthErrorDisplay(err),
          undefined,
        )
      }
    } finally {
      setBusy(false)
    }
  }

  const formDisabled = disabled || busy || checkingUsername
  const canSubmit = termsAccepted && ageDeclared

  return (
    <form onSubmit={handleSubmit} className="space-y-3 pb-6">
      {betaMode ? (
        <div className="rounded-lg border border-lime-500/35 bg-lime-950/25 px-4 py-3.5">
          <p className="font-mono-technical text-xs font-bold uppercase tracking-wider text-lime-300">
            {t('hints.betaBannerTitle')}
          </p>
          <p className="mt-1.5 font-sans text-sm leading-relaxed text-zinc-300">
            {t('hints.betaBannerBody')}
          </p>
        </div>
      ) : null}

      <Input
        variant="gold"
        label={t('fields.callsignFull')}
        name="callsign"
        autoComplete="nickname"
        value={callsign}
        onChange={(e) => setCallsign(e.target.value.toUpperCase())}
        placeholder={t('placeholders.callsignExample')}
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
        label={t('fields.usernameUnique')}
        name="username"
        autoComplete="username"
        value={usernameDraft}
        onChange={(e) => setUsernameDraft(e.target.value.toLowerCase().replace(/[^a-z0-9_\s]/g, ''))}
        placeholder={t('placeholders.usernameExample')}
        hint={t('hints.usernameChars')}
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
        <p className="text-center font-mono-technical text-[10px] text-app-text/55">
          {t('actions.verifyingUsername')}
        </p>
      ) : null}

      <div className="rounded-lg border border-accent/25 bg-[#0a0d12] px-4 py-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono-technical text-xs font-bold uppercase tracking-wider text-accent">
              {t('legal.panelTitle')}
            </p>
            <p className="mt-1.5 font-sans text-sm leading-relaxed text-zinc-400">
              {termsAccepted
                ? t('legal.accepted')
                : t('legal.requiredHint', { count: LEGAL_PROTOCOL_COUNT })}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setLegalOpen(true)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded border border-accent/45 bg-accent/10 px-4 py-2.5 font-mono-technical text-[11px] font-bold uppercase tracking-wider text-accent transition hover:bg-accent/18"
          >
            <Scale className="size-3.5" aria-hidden />
            {termsAccepted ? t('legal.readAgain') : t('legal.readProtocol')}
          </button>
        </div>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-accent/25 bg-[#0a0d12] px-4 py-3.5">
        <input
          type="checkbox"
          className="mt-1 size-4 shrink-0 accent-accent"
          checked={ageDeclared}
          disabled={formDisabled}
          onChange={(e) => setAgeDeclared(e.target.checked)}
        />
        <span className="font-sans text-xs leading-relaxed text-zinc-200 sm:text-sm">
          {tCommon('legal.ageDeclaration.checkbox')}
        </span>
      </label>

      <button
        type="submit"
        disabled={formDisabled || !canSubmit}
        className="w-full rounded-lg border border-accent/50 bg-gradient-to-r from-accent/20 to-[#d4af37]/15 py-3.5 font-display text-sm font-bold uppercase tracking-[0.2em] text-accent shadow-[0_0_24px_-8px_rgba(255,180,0,0.45)] transition hover:border-accent/80 hover:from-accent/30 disabled:opacity-50"
      >
        {busy ? (
          <span className="font-mono-technical tracking-widest">…</span>
        ) : (
          t('actions.registerUpper')
        )}
      </button>
      <p className="text-center font-mono-technical text-[9px] uppercase tracking-[0.35em] text-app-text/45">
        {betaMode ? t('hints.enrolmentFooter') : t('hints.secureFooter')}
      </p>

      <LegalDisclaimer
        open={legalOpen}
        persist={false}
        onClose={() => setLegalOpen(false)}
        onConfirmed={() => {
          setTermsAccepted(true)
          setLegalOpen(false)
        }}
      />
    </form>
  )
}
