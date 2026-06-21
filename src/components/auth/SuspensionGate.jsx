import { useEffect, useState } from 'react'
import { Loader2, MessageSquareWarning, ShieldAlert } from 'lucide-react'
import { signOut } from 'firebase/auth'
import { isAccountSuspended } from '../../lib/authRoles'
import {
  formatFeedbackTimestamp,
  hasTimedSuspensionEnd,
  submitSuspensionAppeal,
  subscribeAppealForSuspension,
} from '../../lib/firestoreSuspensionAppeals'
import { auth } from '../../lib/firebase'
import { useAuth } from '../../context/AuthContext'

/**
 * Askıya alınmış hesap — tam ekran blok (çıkış + itiraz hariç).
 */
export default function SuspensionGate({ children }) {
  const { user, userData, loading, profileLoading } = useAuth()
  const [appealMessage, setAppealMessage] = useState('')
  const [appealBusy, setAppealBusy] = useState(false)
  const [appealError, setAppealError] = useState('')
  const [currentAppeal, setCurrentAppeal] = useState(
    /** @type {import('../../lib/firestoreSuspensionAppeals').SuspensionAppealRecord | null} */ (null),
  )
  const [appealLoading, setAppealLoading] = useState(false)

  const suspended = Boolean(user && isAccountSuspended(userData))
  const reason = String(userData?.suspensionReason ?? '').trim()
  const suspendedUntil = userData?.suspendedUntil ?? null
  const timedEnd = hasTimedSuspensionEnd(suspendedUntil)
  const untilLabel = timedEnd ? formatFeedbackTimestamp(suspendedUntil) : null
  const adminReply = String(currentAppeal?.adminReply ?? '').trim()

  useEffect(() => {
    if (!suspended || !user?.uid) {
      setCurrentAppeal(null)
      setAppealLoading(false)
      return undefined
    }

    setAppealLoading(true)
    const unsub = subscribeAppealForSuspension(
      user.uid,
      reason,
      suspendedUntil,
      (appeal) => {
        setCurrentAppeal(appeal)
        setAppealLoading(false)
      },
      () => {
        setAppealLoading(false)
      },
    )

    return unsub
  }, [suspended, user?.uid, reason, suspendedUntil])

  if (loading || profileLoading) {
    return children
  }

  if (!suspended) {
    return children
  }

  const handleSignOut = async () => {
    if (auth) await signOut(auth)
  }

  const handleSubmitAppeal = async () => {
    if (!user?.uid || currentAppeal) return
    setAppealBusy(true)
    setAppealError('')
    try {
      await submitSuspensionAppeal({
        userId: user.uid,
        userEmail: user.email ?? userData?.email ?? '',
        message: appealMessage,
        suspensionReason: reason,
        suspendedUntil,
      })
      setAppealMessage('')
    } catch (err) {
      setAppealError(err instanceof Error ? err.message : 'İtiraz gönderilemedi.')
    } finally {
      setAppealBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto bg-[#050607] p-6">
      <div className="my-auto w-full max-w-lg rounded-xl border border-orange-500/40 bg-gradient-to-b from-orange-950/30 to-black/80 p-8 shadow-[0_0_60px_-12px_rgba(251,146,60,0.35)]">
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

        <div className="mt-5 rounded-lg border border-red-500/30 bg-red-950/25 px-4 py-3">
          <p className="font-mono-technical text-[10px] font-bold uppercase tracking-wider text-red-400">
            Sebep
          </p>
          <p className="mt-1 text-sm text-red-200/90">{reason || 'Sebep belirtilmedi.'}</p>
        </div>

        {timedEnd && untilLabel ? (
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
          className="mt-6 w-full rounded-lg border border-white/15 bg-black/50 px-4 py-3 font-mono-technical text-[11px] font-bold uppercase tracking-wider text-app-text/80 transition hover:border-accent/40 hover:text-accent"
        >
          Çıkış Yap
        </button>

        <div className="mt-6 border-t border-orange-500/20 pt-6">
          <div className="mb-3 flex items-center gap-2">
            <MessageSquareWarning className="size-4 text-orange-400/90" aria-hidden />
            <p className="font-mono-technical text-[10px] font-bold uppercase tracking-wider text-orange-300/90">
              İtiraz
            </p>
          </div>

          {appealLoading ? (
            <p className="flex items-center gap-2 font-mono-technical text-xs text-app-text/55">
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              İtiraz durumu kontrol ediliyor…
            </p>
          ) : adminReply ? (
            <div className="rounded-lg border border-accent/30 bg-accent/5 px-4 py-3">
              <p className="font-mono-technical text-[10px] font-bold uppercase tracking-wider text-accent">
                Yöneticinin Yanıtı
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-app-text/90">{adminReply}</p>
              {currentAppeal?.repliedAt ? (
                <p className="mt-2 font-mono-technical text-[10px] text-app-text/50">
                  — {formatFeedbackTimestamp(currentAppeal.repliedAt)}
                </p>
              ) : null}
            </div>
          ) : currentAppeal ? (
            <p className="rounded-lg border border-accent/25 bg-accent/5 px-4 py-3 font-mono-technical text-xs leading-relaxed text-accent/90">
              İtirazınız iletildi
              {currentAppeal.createdAt
                ? `, ${formatFeedbackTimestamp(currentAppeal.createdAt)} tarihinde gönderildi`
                : ''}
              . İnceleme sonucu size bildirilecektir.
            </p>
          ) : (
            <>
              <p className="text-sm text-app-text/60">
                Bu karara itiraz etmek istiyorsanız aşağıya yazabilirsiniz.
              </p>
              <textarea
                rows={4}
                value={appealMessage}
                onChange={(e) => setAppealMessage(e.target.value)}
                placeholder="İtiraz mesajınız…"
                disabled={appealBusy}
                className="mt-3 w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2.5 text-sm text-app-text placeholder:text-app-text/40 focus:border-orange-500/40 focus:outline-none focus:ring-1 focus:ring-orange-500/25 disabled:opacity-50"
              />
              {appealError ? (
                <p className="mt-2 text-xs text-red-400">{appealError}</p>
              ) : null}
              <button
                type="button"
                disabled={appealBusy || !appealMessage.trim()}
                onClick={() => void handleSubmitAppeal()}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-orange-500/40 bg-orange-950/30 px-4 py-2.5 font-mono-technical text-[11px] font-bold uppercase tracking-wider text-orange-200 transition hover:bg-orange-950/45 disabled:opacity-50"
              >
                {appealBusy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                İtirazını Gönder
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
