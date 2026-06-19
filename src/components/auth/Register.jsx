import { useEffect, useState } from 'react'
import { Scale } from 'lucide-react'
import Input from '../common/Input'
import LegalDisclaimer from '../LegalDisclaimer'
import { useAuth } from '../../context/AuthContext'
import { isPlatformInBetaPeriod } from '../../lib/registrationPolicy'
import { validateBetaPassword } from '../../lib/betaAuth'
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
  const { agreeToTerms } = useAuth()
  const betaMode = isPlatformInBetaPeriod()
  const [email, setEmail] = useState('')
  const [usernameDraft, setUsernameDraft] = useState('')
  const [callsign, setCallsign] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [checkingUsername, setCheckingUsername] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(initialTermsAccepted)
  const [legalOpen, setLegalOpen] = useState(false)

  useEffect(() => {
    if (initialTermsAccepted) setTermsAccepted(true)
  }, [initialTermsAccepted])

  const validateRegisterStatic = async () => {
    const fe = {}

    if (!callsign.trim()) {
      fe.callsign = 'ERR: Callsign zorunlu (FIELD_CALLSIGN)'
    }

    const mail = email.trim()
    if (!mail) {
      fe.email = 'ERR: E-posta zorunlu (FIELD_EMAIL)'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
      fe.email = 'ERR: Geçerli bir e-posta girin (VALIDATION_EMAIL)'
    }

    const normalized = normalizeUsername(usernameDraft)
    if (!normalized) {
      fe.usernameDraft = 'ERR: Operatör kullanıcı adı zorunlu (FIELD_USERNAME)'
    } else if (!isValidUsernameNormalized(normalized)) {
      fe.usernameDraft =
        'ERR: 3–24 karakter; yalnızca a-z, 0-9 ve _ (otomatik küçük harfe çevrilir) (RULE_USERNAME)'
    } else {
      setCheckingUsername(true)
      try {
        const free = await isUsernameAvailable(normalized)
        if (!free) {
          fe.usernameDraft = 'ERR: Bu kullanıcı adı alınmış (USERNAME_TAKEN)'
        }
      } catch {
        fe.usernameDraft = 'ERR: Kullanıcı adı doğrulanamadı — tekrar deneyin.'
      } finally {
        setCheckingUsername(false)
      }
    }

    if (!validateBetaPassword(password).ok) {
      fe.password = 'ERR: Şifre min. 6 karakter (POLICY_AUTH_01)'
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
        await agreeToTerms()
      } catch {
        /* Kayıt tamam; protokol onayı ayarlardan tekrarlanabilir */
      }
      onSuccess()
    } catch (err) {
      const code = err?.code ?? ''
      if (code === 'auth/email-already-in-use') {
        onError('AUTH_FAIL: Bu e-posta zaten kayıtlı (EMAIL_IN_USE)')
      } else if (code === 'auth/invalid-email') {
        onError('Geçersiz e-posta adresi — kontrol edin.')
      } else if (code === 'auth/weak-password') {
        onError('ERR: Şifre politikası — farklı bir kullanıcı adı deneyin.')
      } else if (code === 'username-already-in-use') {
        setFieldErrors((f) => ({
          ...f,
          usernameDraft: 'ERR: Bu kullanıcı adı alınmış (USERNAME_TAKEN)',
        }))
      } else if (code === 'username-invalid') {
        setFieldErrors((f) => ({
          ...f,
          usernameDraft: 'ERR: Geçersiz kullanıcı adı formatı (RULE_USERNAME)',
        }))
      } else {
        onError(
          typeof err?.message === 'string' ? err.message : 'Kayıt tamamlanamadı.',
          undefined,
        )
      }
    } finally {
      setBusy(false)
    }
  }

  const formDisabled = disabled || busy || checkingUsername
  const canSubmit = termsAccepted

  return (
    <form onSubmit={handleSubmit} className="space-y-3 pb-6">
      {betaMode ? (
        <div className="rounded-lg border border-lime-500/35 bg-lime-950/25 px-4 py-3.5">
          <p className="font-mono-technical text-xs font-bold uppercase tracking-wider text-lime-300">
            Beta Test — Operatör kaydı
          </p>
          <p className="mt-1.5 font-sans text-sm leading-relaxed text-zinc-300">
            Callsign, e-posta, kullanıcı adı ve şifre ile kayıt olun. Beta döneminde e-posta doğrulaması
            zorunlu değildir; kayıt sonrası doğrudan Dashboard&apos;a yönlendirilirsiniz.
          </p>
        </div>
      ) : null}

      <Input
        variant="gold"
        label="Callsign (Kod adı)"
        name="callsign"
        autoComplete="nickname"
        value={callsign}
        onChange={(e) => setCallsign(e.target.value.toUpperCase())}
        placeholder="ÖRN: WOLF-1"
        error={fieldErrors.callsign}
        required
      />
      <Input
        variant="gold"
        label="E-posta"
        name="email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value.trim())}
        placeholder="operatör@kurum.tr"
        error={fieldErrors.email}
        required
      />
      <Input
        variant="gold"
        label="Operatör kullanıcı adı (benzersiz)"
        name="username"
        autoComplete="username"
        value={usernameDraft}
        onChange={(e) => setUsernameDraft(e.target.value.toLowerCase().replace(/[^a-z0-9_\s]/g, ''))}
        placeholder="örn: wolf_alpha"
        hint="İngilizce harf ve rakamlar; boşluk alt çizgiye döner."
        error={fieldErrors.usernameDraft}
        required
      />

      <Input
        variant="gold"
        label="Şifre"
        name="password"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="En az 6 karakter"
        error={fieldErrors.password}
        required
      />

      {checkingUsername ? (
        <p className="text-center font-mono-technical text-[10px] text-app-text/55">
          kullanıcı adı doğrulanıyor...
        </p>
      ) : null}

      <div className="rounded-lg border border-accent/25 bg-[#0a0d12] px-4 py-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono-technical text-xs font-bold uppercase tracking-wider text-accent">
              Operasyonel ve Hukuki Protokol
            </p>
            <p className="mt-1.5 font-sans text-sm leading-relaxed text-zinc-400">
              {termsAccepted
                ? 'Protokol onaylandı — kayıt tamamlanabilir.'
                : 'Kayıt için 46 maddelik protokolü okuyup onaylayın.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setLegalOpen(true)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded border border-accent/45 bg-accent/10 px-4 py-2.5 font-mono-technical text-[11px] font-bold uppercase tracking-wider text-accent transition hover:bg-accent/18"
          >
            <Scale className="size-3.5" aria-hidden />
            {termsAccepted ? 'Yeniden Oku' : 'Protokolü Oku'}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={formDisabled || !canSubmit}
        className="w-full rounded-lg border border-accent/50 bg-gradient-to-r from-accent/20 to-[#d4af37]/15 py-3.5 font-display text-sm font-bold uppercase tracking-[0.2em] text-accent shadow-[0_0_24px_-8px_rgba(255,180,0,0.45)] transition hover:border-accent/80 hover:from-accent/30 disabled:opacity-50"
      >
        {busy ? (
          <span className="font-mono-technical tracking-widest">…</span>
        ) : (
          'OPERATÖRÜ KAYDET'
        )}
      </button>
      <p className="text-center font-mono-technical text-[9px] uppercase tracking-[0.35em] text-app-text/45">
        {betaMode ? 'BETA ENROLMENT // DASHBOARD_READY' : 'ENROLMENT // SECURE_CHANNEL'}
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
