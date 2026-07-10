import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, MessageSquarePlus, Send } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { emitFirebaseError } from '../lib/firebaseErrorBus'
import {
  FEEDBACK_ISSUE_TYPES,
  submitFeedback,
} from '../lib/firestoreFeedback'

const inputClass =
  'w-full rounded border border-accent/25 bg-app-bg px-3 py-2.5 font-mono-technical text-sm text-app-text outline-none transition placeholder:text-app-text/45 focus:border-accent/55 focus:ring-1 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-50'

const labelClass =
  'mb-1.5 block font-mono-technical text-[10px] font-bold uppercase tracking-[0.24em] text-accent/80'

/** @typedef {(typeof FEEDBACK_ISSUE_TYPES)[number]} FeedbackIssueType */

/**
 * @param {{ className?: string; onSubmitted?: () => void; bare?: boolean }} [props]
 */
export default function FeedbackForm({ className = '', onSubmitted, bare = false }) {
  const { t } = useTranslation('common')
  const { user, userData } = useAuth()
  const [issueType, setIssueType] = useState(/** @type {FeedbackIssueType} */ ('Hata'))
  const [description, setDescription] = useState('')
  const [screenshotURL, setScreenshotURL] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(/** @type {{ type: 'ok' | 'err'; text: string } | null} */ (null))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!user?.uid) {
      setMsg({ type: 'err', text: t('feedback.authRequired') })
      return
    }

    setBusy(true)
    setMsg(null)
    try {
      await submitFeedback({
        issueType,
        description,
        screenshotURL,
        userId: user.uid,
        userEmail: user.email ?? userData?.email ?? '',
        callsign: userData?.callsign ?? user.displayName ?? '',
      })
      setDescription('')
      setScreenshotURL('')
      setIssueType('Hata')
      setMsg({ type: 'ok', text: t('feedback.success') })
      onSubmitted?.()
    } catch (err) {
      emitFirebaseError(err)
      setMsg({
        type: 'err',
        text: err instanceof Error ? err.message : t('feedback.submitFailed'),
      })
    } finally {
      setBusy(false)
    }
  }

  const formBody = (
    <form onSubmit={handleSubmit} className={bare ? 'space-y-5' : 'space-y-5 p-5'}>
      <div>
        <label htmlFor="feedback-issue-type" className={labelClass}>
          Bildirim türü
        </label>
        <select
          id="feedback-issue-type"
          value={issueType}
          disabled={busy}
          onChange={(e) => setIssueType(/** @type {FeedbackIssueType} */ (e.target.value))}
          className={`${inputClass} cursor-pointer`}
        >
          {FEEDBACK_ISSUE_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="feedback-description" className={labelClass}>
          Açıklama
        </label>
        <textarea
          id="feedback-description"
          rows={5}
          required
          maxLength={4000}
          disabled={busy}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Hata adımları, öneri detayı veya bug reproduksiyonu…"
          className={`${inputClass} min-h-[7rem] resize-y`}
        />
      </div>

      <div>
        <label htmlFor="feedback-screenshot" className={labelClass}>
          Ekran görüntüsü URL (opsiyonel)
        </label>
        <input
          id="feedback-screenshot"
          type="url"
          disabled={busy}
          value={screenshotURL}
          onChange={(e) => setScreenshotURL(e.target.value)}
          placeholder="https://…"
          className={inputClass}
          autoComplete="off"
        />
      </div>

      {msg ? (
        <p
          role="status"
          className={`font-mono-technical text-[10px] font-bold uppercase tracking-wider ${
            msg.type === 'ok' ? 'text-accent/90' : 'text-amber-400'
          }`}
        >
          {msg.text}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy || !description.trim() || !user?.uid}
        className="inline-flex w-full items-center justify-center gap-2 rounded border border-accent/45 bg-accent/10 px-4 py-2.5 font-mono-technical text-[10px] font-bold uppercase tracking-[0.22em] text-accent transition hover:border-accent/70 hover:bg-accent/15 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <Send className="size-4" strokeWidth={1.75} aria-hidden />
        )}
        {busy ? 'GÖNDERİLİYOR…' : 'GERİ BİLDİRİM GÖNDER'}
      </button>
    </form>
  )

  if (bare) {
    return (
      <section aria-label="Operatör geri bildirim formu" className={className}>
        {formBody}
      </section>
    )
  }

  return (
    <section
      aria-label="Operatör geri bildirim formu"
      className={[
        'relative overflow-hidden rounded-xl border border-accent/30 bg-app-bg shadow-[0_0_24px_-8px_color-mix(in_srgb,var(--accent-color)_35%,transparent)]]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className="pointer-events-none absolute left-2 top-2 h-3 w-3 border-l border-t border-accent/45" aria-hidden />
      <span className="pointer-events-none absolute right-2 top-2 h-3 w-3 border-r border-t border-accent/45" aria-hidden />
      <span className="pointer-events-none absolute bottom-2 left-2 h-3 w-3 border-b border-l border-accent/45" aria-hidden />
      <span className="pointer-events-none absolute bottom-2 right-2 h-3 w-3 border-b border-r border-accent/45" aria-hidden />

      <header className="border-b border-accent/15 bg-app-bg px-5 py-4">
        <div className="flex items-start gap-3">
          <MessageSquarePlus className="mt-0.5 size-5 shrink-0 text-accent" strokeWidth={1.75} aria-hidden />
          <div>
            <h2 className="font-mono-technical text-xs font-bold uppercase tracking-[0.28em] text-accent">
              OPERATÖR GERİ BİLDİRİM
            </h2>
            <p className="mt-1 font-mono-technical text-[9px] uppercase tracking-wider text-app-text/55">
              HUD · NOIR · SİSTEM RAPORU
            </p>
          </div>
        </div>
      </header>

      {formBody}
    </section>
  )
}
