import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { KeyRound, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { callRedeemAccessCode } from '../lib/cloudFunctions'
import { normalizeAccessCode } from '../lib/firestoreAccessCodes'
import { emitFirebaseError } from '../lib/firebaseErrorBus'

const inputClass =
  'w-full rounded border border-accent/25 bg-app-bg px-3 py-2.5 font-mono-technical text-sm uppercase tracking-wider text-app-text outline-none transition focus:border-accent/55 focus:ring-1 focus:ring-accent/20'

/**
 * @param {{ className?: string; bare?: boolean }} [props]
 */
export default function AccessCodeRedeemPanel({ className = '', bare = false }) {
  const { t } = useTranslation('common')
  const { user, refreshUserProfile } = useAuth()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')
    setSuccess(false)

    if (!user?.uid) {
      setMessage(t('accessCode.authRequired'))
      return
    }

    const normalized = normalizeAccessCode(code)
    if (normalized.length < 8) {
      setMessage(t('accessCode.invalidCode'))
      return
    }

    setBusy(true)
    try {
      const result = await callRedeemAccessCode(normalized)
      const planLabel =
        result.plan === 'pro_instructor'
          ? t('accessCode.planProInstructor')
          : t('accessCode.planPremium')
      setSuccess(true)
      setMessage(t('accessCode.success', { plan: planLabel }))
      setCode('')
      if (typeof refreshUserProfile === 'function') {
        await refreshUserProfile()
      }
    } catch (err) {
      emitFirebaseError(err)
      const errCode = String(/** @type {{ code?: string }} */ (err)?.code ?? '')
      if (errCode.includes('already-exists')) {
        setMessage(t('accessCode.alreadyUsed'))
      } else if (errCode.includes('not-found')) {
        setMessage(t('accessCode.notFound'))
      } else if (errCode.includes('resource-exhausted')) {
        setMessage(t('accessCode.exhausted'))
      } else if (errCode.includes('failed-precondition')) {
        setMessage(err instanceof Error ? err.message : t('accessCode.unavailable'))
      } else {
        setMessage(err instanceof Error ? err.message : t('accessCode.failed'))
      }
    } finally {
      setBusy(false)
    }
  }

  if (!user) {
    return null
  }

  const content = (
    <>
      {!bare ? (
        <p className="mb-3 flex items-center gap-2 font-mono-technical text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
          <KeyRound className="size-4 shrink-0" strokeWidth={1.5} aria-hidden />
          [ ERİŞİM KODU KULLAN ]
        </p>
      ) : null}
      <p className={`font-mono-technical text-[9px] uppercase leading-relaxed text-app-text/55 ${bare ? 'mb-3' : 'mb-4'}`}>
        Admin tarafından verilen Premium veya Pro-Eğitmen erişim kodunu girin. Kod, hesabınızın
        planını yükseltir — grup üyeliği ile karıştırmayın.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="min-w-0 flex-1 space-y-1.5">
          <span className="font-mono-technical text-[9px] font-bold uppercase text-app-text/55">
            Erişim Kodu
          </span>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(normalizeAccessCode(e.target.value))}
            placeholder="PREM-XXXX-XXXX"
            className={inputClass}
            autoComplete="off"
            required
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex h-[42px] shrink-0 items-center justify-center gap-2 rounded border border-accent/45 bg-accent/10 px-5 font-mono-technical text-[10px] font-bold uppercase tracking-wider text-accent transition hover:border-accent/70 hover:bg-accent/15 disabled:opacity-50"
        >
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          Uygula
        </button>
      </form>
      {message ? (
        <p
          className={[
            'mt-3 font-mono-technical text-[10px] font-bold uppercase leading-relaxed',
            success ? 'text-accent' : 'text-red-400',
          ].join(' ')}
        >
          {message}
        </p>
      ) : null}
    </>
  )

  if (bare) {
    return <div className={className}>{content}</div>
  }

  return (
    <section
      className={[
        'rounded-xl border border-accent/30 bg-app-bg p-4 shadow-[0_0_32px_-12px_color-mix(in_srgb,var(--accent-color)_18%,transparent)]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {content}
    </section>
  )
}
