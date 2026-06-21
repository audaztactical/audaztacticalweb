import { ShieldAlert } from 'lucide-react'
import { signOut } from 'firebase/auth'
import { isAccountSuspended } from '../../lib/authRoles'
import { formatFeedbackTimestamp } from '../../lib/firestoreFeedback'
import { auth } from '../../lib/firebase'
import { useAuth } from '../../context/AuthContext'

/**
 * Askıya alınmış hesap — tam ekran blok (çıkış hariç).
 * Süre dolmuşsa geçişe izin verir (kurallar ile uyumlu).
 */
export default function SuspensionGate({ children }) {
  const { user, userData, loading, profileLoading } = useAuth()

  if (loading || profileLoading) {
    return children
  }

  if (!user || !isAccountSuspended(userData)) {
    return children
  }

  const reason = String(userData?.suspensionReason ?? '').trim()
  const untilLabel = userData?.suspendedUntil
    ? formatFeedbackTimestamp(userData.suspendedUntil)
    : null

  const handleSignOut = async () => {
    if (auth) await signOut(auth)
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#050607] p-6">
      <div className="w-full max-w-lg rounded-xl border border-orange-500/40 bg-gradient-to-b from-orange-950/30 to-black/80 p-8 shadow-[0_0_60px_-12px_rgba(251,146,60,0.35)]">
        <div className="mb-5 flex items-center gap-3">
          <ShieldAlert className="size-8 text-orange-400" strokeWidth={1.5} aria-hidden />
          <p className="font-mono-technical text-[10px] font-bold uppercase tracking-[0.3em] text-orange-400">
            [ ERİŞİM ASKIYA ALINDI ]
          </p>
        </div>
        <h1 className="font-display text-2xl font-bold uppercase tracking-wide text-app-text">
          Hesabınız Askıya Alındı
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-app-text/70">
          Platform erişiminiz geçici olarak durduruldu. Bu süre zarfında uygulama modüllerine erişemezsiniz.
        </p>
        {reason ? (
          <div className="mt-5 rounded-lg border border-red-500/30 bg-red-950/25 px-4 py-3">
            <p className="font-mono-technical text-[10px] font-bold uppercase tracking-wider text-red-400">
              Sebep
            </p>
            <p className="mt-1 text-sm text-red-200/90">{reason}</p>
          </div>
        ) : null}
        {untilLabel ? (
          <p className="mt-4 font-mono-technical text-xs text-app-text/55">
            Askı kaldırılma tarihi:{' '}
            <span className="text-orange-300">{untilLabel}</span>
          </p>
        ) : (
          <p className="mt-4 font-mono-technical text-xs text-orange-300/80">
            Süresiz askı — yönetici tarafından kaldırılana kadar erişim kapalı.
          </p>
        )}
        <button
          type="button"
          onClick={() => void handleSignOut()}
          className="mt-8 w-full rounded-lg border border-white/15 bg-black/50 px-4 py-3 font-mono-technical text-[11px] font-bold uppercase tracking-wider text-app-text/80 transition hover:border-accent/40 hover:text-accent"
        >
          Çıkış Yap
        </button>
      </div>
    </div>
  )
}
