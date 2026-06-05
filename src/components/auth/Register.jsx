import { useState } from 'react'
import AmberAlert from '../common/AmberAlert'
import Input from '../common/Input'
import {
  INSTRUCTOR_TOKEN_INVALID_MESSAGE,
  normalizeInstructorInviteToken,
  validateInstructorInviteToken,
} from '../../lib/firestoreInstructorTokens'
import {
  normalizeUsername,
  isUsernameAvailable,
  isValidUsernameNormalized,
} from '../../lib/firestoreUsers'

export { INSTRUCTOR_TOKEN_INVALID_MESSAGE }

const BLOOD_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', '0+', '0-']
const STATUS_OPTIONS = ['Sivil', 'Askeri', 'Emniyet']

/**
 * Kayıt öncesi eğitmen davetiye doğrulaması — Auth kullanıcısı oluşturulmadan önce çalışır.
 * @param {string} rawCode
 */
export async function verifyInstructorInviteBeforeSignup(rawCode) {
  const trimmed = String(rawCode ?? '').trim()
  if (!trimmed) {
    return { ok: true, instructorInviteCode: '' }
  }

  const check = await validateInstructorInviteToken(trimmed)
  if (!check.valid) {
    return { ok: false, error: INSTRUCTOR_TOKEN_INVALID_MESSAGE }
  }

  return { ok: true, instructorInviteCode: check.token }
}

/**
 * @param {{
 *   registerWithEmailPassword: (payload: {
 *     email: string
 *     password: string
 *     username: string
 *     callsign: string
 *     bloodType: string
 *     status: string
 *     instructorInviteCode?: string
 *   }) => Promise<unknown>
 *   onSuccess: () => void
 *   onError: (message: string, fieldErrors?: Record<string, string>) => void
 *   disabled?: boolean
 * }} props
 */
export default function Register({
  registerWithEmailPassword,
  onSuccess,
  onError,
  disabled = false,
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [usernameDraft, setUsernameDraft] = useState('')
  const [callsign, setCallsign] = useState('')
  const [bloodType, setBloodType] = useState('')
  const [status, setStatus] = useState('Sivil')
  const [instructorInviteCode, setInstructorInviteCode] = useState('')
  const [showInstructorInvite, setShowInstructorInvite] = useState(false)
  const [instructorTokenError, setInstructorTokenError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [checkingUsername, setCheckingUsername] = useState(false)

  const validateRegisterStatic = async () => {
    const fe = {}
    setInstructorTokenError('')

    if (!callsign.trim()) {
      fe.callsign = 'ERR: Callsign zorunlu (FIELD_CALLSIGN)'
    }
    if (!bloodType) {
      fe.bloodType = 'ERR: Kan grubu seçimi gerekli (FIELD_BLOOD)'
    }
    if (!status) {
      fe.status = 'ERR: Statü seçimi gerekli (FIELD_STATUS)'
    }
    if (password.length < 6) {
      fe.password = 'ERR: Şifre min. 6 karakter (POLICY_AUTH_01)'
    }
    if (password !== confirm) {
      fe.confirm = 'ERR: Şifre eşleşmiyor (FIELD_CONFIRM)'
    }
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    if (!emailOk) {
      fe.email = 'ERR: Geçersiz e-posta formatı (VALIDATION_EMAIL)'
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

    setFieldErrors(fe)
    return Object.keys(fe).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setInstructorTokenError('')
    setFieldErrors({})

    const okStatic = await validateRegisterStatic()
    if (!okStatic) return

    setBusy(true)
    try {
      let invitePayload = ''
      if (showInstructorInvite && instructorInviteCode.trim()) {
        const verify = await verifyInstructorInviteBeforeSignup(instructorInviteCode)
        if (!verify.ok) {
          setInstructorTokenError(verify.error ?? INSTRUCTOR_TOKEN_INVALID_MESSAGE)
          return
        }
        invitePayload = verify.instructorInviteCode ?? ''
      }

      const normalizedUsername = normalizeUsername(usernameDraft)
      await registerWithEmailPassword({
        email: email.trim(),
        password,
        username: normalizedUsername,
        callsign: callsign.trim(),
        bloodType,
        status,
        instructorInviteCode: invitePayload,
      })
      onSuccess()
    } catch (err) {
      const code = err?.code ?? ''
      if (code === 'instructor-token-invalid') {
        setInstructorTokenError(INSTRUCTOR_TOKEN_INVALID_MESSAGE)
        return
      }
      if (code === 'auth/email-already-in-use') {
        onError('AUTH_FAIL: E-posta kayıtlı (ERR_EMAIL_IN_USE)')
      } else if (code === 'auth/invalid-email') {
        setFieldErrors((f) => ({ ...f, email: 'ERR: Geçersiz e-posta (AUTH_INVALID_EMAIL)' }))
      } else if (code === 'auth/weak-password') {
        setFieldErrors((f) => ({ ...f, password: 'ERR: Şifre zayıf — min. 6 karakter (AUTH_WEAK_PASSWORD)' }))
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

  return (
    <form onSubmit={handleSubmit} className="space-y-3 pb-6">
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
        label="Kan grubu"
        name="bloodType"
        select
        value={bloodType}
        onChange={(e) => setBloodType(e.target.value)}
        error={fieldErrors.bloodType}
        required
      >
        <option value="">— Seçin —</option>
        {BLOOD_OPTIONS.map((b) => (
          <option key={b} value={b}>
            {b}
          </option>
        ))}
      </Input>
      <Input
        variant="gold"
        label="Statü"
        name="status"
        select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        error={fieldErrors.status}
        required
      >
        {STATUS_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </Input>

      <div className="rounded-lg border border-amber-900/35 bg-amber-950/15 p-3">
        <label className="flex cursor-pointer items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-wider text-amber-400/90">
          <input
            type="checkbox"
            className="size-3.5 accent-amber-500"
            checked={showInstructorInvite}
            onChange={(e) => {
              setShowInstructorInvite(e.target.checked)
              if (!e.target.checked) {
                setInstructorInviteCode('')
                setInstructorTokenError('')
              }
            }}
          />
          Eğitmen davetiye kodu (varsa)
        </label>
        {showInstructorInvite ? (
          <div className="mt-2 space-y-2">
            <input
              type="text"
              value={instructorInviteCode}
              onChange={(e) =>
                setInstructorInviteCode(normalizeInstructorInviteToken(e.target.value))
              }
              placeholder="AUDAZ-XXXX-XXXX"
              autoComplete="off"
              className="h-11 w-full rounded-lg border border-amber-500/30 bg-black/50 px-3 font-mono text-sm uppercase tracking-widest text-amber-100 outline-none focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/20"
              aria-label="Eğitmen davetiye kodu"
            />
            {instructorTokenError ? (
              <p className="font-mono text-[10px] font-bold uppercase leading-relaxed text-red-400">
                {instructorTokenError}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <Input
        variant="gold"
        label="E-posta"
        id="register-email"
        type="email"
        name="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="operatör@kurum.tr"
        error={fieldErrors.email}
        required
      />
      <Input
        variant="gold"
        label="Şifre"
        id="register-password"
        type="password"
        name="password"
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="••••••••"
        error={fieldErrors.password}
        required
      />
      <Input
        variant="gold"
        label="Şifre tekrar"
        id="register-confirm"
        type="password"
        name="confirm"
        autoComplete="new-password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder="••••••••"
        error={fieldErrors.confirm}
        required
      />

      {checkingUsername ? (
        <p className="text-center font-mono-technical text-[10px] text-slate-500">
          kullanıcı adı doğrulanıyor...
        </p>
      ) : null}

      <button
        type="submit"
        disabled={formDisabled}
        className="w-full rounded-lg border border-[#ffb400]/50 bg-gradient-to-r from-[#ffb400]/20 to-[#d4af37]/15 py-3.5 font-display text-sm font-bold uppercase tracking-[0.2em] text-[#ffb400] shadow-[0_0_24px_-8px_rgba(255,180,0,0.45)] transition hover:border-[#ffb400]/80 hover:from-[#ffb400]/30 disabled:opacity-50"
      >
        {busy ? (
          <span className="font-mono-technical tracking-widest">…</span>
        ) : (
          'OPERATÖRÜ KAYDET'
        )}
      </button>
      <p className="text-center font-mono-technical text-[9px] uppercase tracking-[0.35em] text-slate-600">
        ENROLMENT // SECURE_CHANNEL
      </p>
    </form>
  )
}
