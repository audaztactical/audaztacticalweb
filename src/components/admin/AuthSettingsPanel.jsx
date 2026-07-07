import { useEffect, useState } from 'react'
import { Loader2, ShieldCheck } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import {
  setEmailVerificationRequired,
  subscribeAuthAppSettings,
} from '../../lib/firestoreAppSettings'
import { emitFirebaseError } from '../../lib/firebaseErrorBus'
import { ADMIN_FORM_CARD, ADMIN_FORM_CARD_HEADER } from './adminUi'

/**
 * @param {{ onFeedback?: (type: 'ok' | 'err', text: string) => void }} props
 */
export default function AuthSettingsPanel({ onFeedback }) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [emailVerificationRequired, setRequired] = useState(true)
  const [savedFlash, setSavedFlash] = useState(false)

  useEffect(() => {
    const unsub = subscribeAuthAppSettings(
      (data) => {
        setRequired(data.emailVerificationRequired)
        setLoading(false)
      },
      (err) => {
        emitFirebaseError(err)
        setLoading(false)
      },
    )
    return unsub
  }, [])

  const handleToggle = async () => {
    if (!user?.uid || saving) return

    const next = !emailVerificationRequired
    setSaving(true)
    setSavedFlash(false)

    try {
      await setEmailVerificationRequired(next, user)
      setRequired(next)
      setSavedFlash(true)
      onFeedback?.('ok', next ? 'E-posta doğrulama zorunluluğu açıldı.' : 'E-posta doğrulama zorunluluğu kapatıldı.')
      setTimeout(() => setSavedFlash(false), 2500)
    } catch (err) {
      emitFirebaseError(err)
      onFeedback?.('err', 'Ayar kaydedilemedi. Admin yetkisini ve Firestore kurallarını kontrol edin.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={ADMIN_FORM_CARD}>
      <div className={ADMIN_FORM_CARD_HEADER}>
        <ShieldCheck className="size-4 text-accent" strokeWidth={1.5} aria-hidden />
        <p className="font-mono-technical text-[10px] font-bold uppercase tracking-widest text-accent">
          Kimlik doğrulama
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-4 text-app-text/55">
          <Loader2 className="size-4 animate-spin text-accent" aria-hidden />
          <span className="font-mono-technical text-xs uppercase tracking-wider">Ayarlar yükleniyor…</span>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-white/10 bg-black/40 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="font-mono-technical text-sm font-bold text-app-text">E-posta Doğrulama Zorunluluğu</p>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-app-text/55">
              {emailVerificationRequired
                ? 'Açık — şifre ile kayıt olan kullanıcılar doğrulanmadan uygulamaya giremez (/verify-email).'
                : 'Kapalı — doğrulanmamış e-posta ile de route koruması geçilir (test modu). Kayıt akışı değişmez.'}
            </p>
            {savedFlash ? (
              <p className="mt-2 font-mono-technical text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                Kaydedildi
              </p>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <button
              type="button"
              role="switch"
              aria-checked={emailVerificationRequired}
              aria-label="E-posta doğrulama zorunluluğu"
              disabled={saving}
              onClick={handleToggle}
              className={[
                'relative h-8 w-14 rounded-full border transition',
                emailVerificationRequired
                  ? 'border-emerald-500/50 bg-emerald-950/40'
                  : 'border-white/15 bg-black/60',
                saving ? 'cursor-wait opacity-60' : 'cursor-pointer',
              ].join(' ')}
            >
              <span
                className={[
                  'absolute top-0.5 size-7 rounded-full transition',
                  emailVerificationRequired
                    ? 'left-[calc(100%-1.875rem)] bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.45)]'
                    : 'left-0.5 bg-app-text/35',
                ].join(' ')}
                aria-hidden
              />
            </button>
            <span
              className={[
                'font-mono-technical text-[9px] font-bold uppercase tracking-[0.2em]',
                emailVerificationRequired ? 'text-emerald-300' : 'text-app-text/45',
              ].join(' ')}
            >
              {emailVerificationRequired ? 'Açık' : 'Kapalı'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
