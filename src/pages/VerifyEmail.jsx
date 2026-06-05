import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { reload, sendEmailVerification, signOut } from 'firebase/auth'
import { Mail, RefreshCw } from 'lucide-react'
import AmberAlert from '../components/common/AmberAlert'
import { useAuth } from '../context/AuthContext'
import { useFirebaseErrorReporter } from '../context/FirebaseErrorContext'
import { auth } from '../lib/firebase'

export default function VerifyEmail() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { reportFirebaseError } = useFirebaseErrorReporter()
  const [busy, setBusy] = useState(false)
  const [resendMsg, setResendMsg] = useState('')

  const email = user?.email ?? ''

  const handleResend = async () => {
    if (!user || !auth) return
    setBusy(true)
    setResendMsg('')
    try {
      await sendEmailVerification(user)
      setResendMsg('Doğrulama bağlantısı gönderildi. Gelen kutunuzu kontrol edin.')
    } catch (e) {
      reportFirebaseError(e)
      setResendMsg(typeof e?.message === 'string' ? e.message : 'Gönderilemedi.')
    } finally {
      setBusy(false)
    }
  }

  const handleRecheck = async () => {
    if (!auth?.currentUser) return
    setBusy(true)
    try {
      await reload(auth.currentUser)
      if (auth.currentUser.emailVerified) {
        navigate('/dashboard', { replace: true })
      } else {
        setResendMsg('Henüz doğrulanmadı. Bağlantıya tıkladıktan sonra tekrar deneyin.')
      }
    } catch (e) {
      reportFirebaseError(e)
    } finally {
      setBusy(false)
    }
  }

  const handleSignOut = async () => {
    if (!auth) return
    await signOut(auth)
    navigate('/', { replace: true })
  }

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center bg-[#0a0b0d] px-4 py-16">
      <div className="app-atmosphere pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative w-full max-w-lg space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl border border-[#ffb400]/35 bg-[#ffb400]/10 shadow-[0_0_40px_-12px_rgba(255,180,0,0.45)]">
            <Mail className="size-7 text-[#ffb400]" strokeWidth={1.5} aria-hidden />
          </div>
          <h1 className="font-display text-2xl font-bold tracking-wide text-white sm:text-3xl">
            Lütfen E-postanızı Doğrulayın
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            Hesabınızı güvenceye almak için gönderdiğimiz bağlantıya tıklayın. Doğrulama tamamlanana kadar panel erişimi
            kapalıdır.
          </p>
          {email ? (
            <p className="mt-4 font-mono-technical text-xs text-[#d4af37]/90">{email}</p>
          ) : null}
        </div>

        <AmberAlert label="[ SEC_ERR_EMAIL_NOT_VERIFIED ]">
          E-posta adresiniz henüz doğrulanmadı. Gelen kutunuzu ve spam klasörünü kontrol edin.
        </AmberAlert>

        {resendMsg ? (
          <p className="text-center font-mono-technical text-xs text-slate-400">{resendMsg}</p>
        ) : null}

        <div className="glass-card flex flex-col gap-3 p-5 sm:p-6">
          <button
            type="button"
            disabled={busy || !user}
            onClick={handleResend}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#ffb400]/45 bg-[#ffb400]/10 py-3 font-display text-sm font-bold uppercase tracking-[0.15em] text-[#ffb400] transition hover:border-[#ffb400]/70 hover:bg-[#ffb400]/15 disabled:opacity-50"
          >
            Doğrulama e-postasını tekrar gönder
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={handleRecheck}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 py-3 font-mono-technical text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:border-white/25 hover:bg-white/10 disabled:opacity-50"
          >
            <RefreshCw className="size-4" strokeWidth={1.75} aria-hidden />
            Doğruladım — yenile
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full py-2 font-mono-technical text-[11px] uppercase tracking-widest text-slate-500 underline-offset-4 hover:text-slate-400 hover:underline"
          >
            Farklı hesap ile giriş
          </button>
        </div>
      </div>
    </div>
  )
}
