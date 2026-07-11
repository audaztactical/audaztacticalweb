import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion as Motion } from 'framer-motion'
import { Loader2, Shield, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { emitFirebaseError } from '../../lib/firebaseErrorBus'
import { updateUserWelcomeModalDismissed } from '../../lib/firestoreUsers'
import { WELCOME_MODAL_VERSION } from '../../lib/welcomeModal'

/**
 * @param {{
 *   open: boolean
 *   readOnly?: boolean
 *   onClose?: () => void
 *   onDismissed?: (payload: { neverShowAgain: boolean }) => void
 * }} props
 */
export default function WelcomeOperatorModal({ open, readOnly = false, onClose, onDismissed }) {
  const { t } = useTranslation('welcome')
  const { user } = useAuth()
  const [ack, setAck] = useState(false)
  const [neverShow, setNeverShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) {
      setAck(false)
      setNeverShow(false)
      setBusy(false)
      setError('')
    }
  }, [open])

  const handleCloseReadOnly = () => {
    if (busy) return
    onClose?.()
  }

  const handleConfirm = useCallback(async () => {
    if (readOnly || !ack || busy) return

    setBusy(true)
    setError('')

    try {
      if (!user?.uid) {
        setError(t('errors.authRequired'))
        return
      }

      await updateUserWelcomeModalDismissed(user.uid, {
        neverShowAgain: neverShow,
        version: WELCOME_MODAL_VERSION,
      })
      onDismissed?.({ neverShowAgain: neverShow })
      onClose?.()
    } catch (err) {
      emitFirebaseError(err)
      setError(err instanceof Error ? err.message : t('errors.saveFailed'))
    } finally {
      setBusy(false)
    }
  }, [ack, busy, neverShow, onClose, onDismissed, readOnly, t, user?.uid])

  const prohibited = t('sections.rules.prohibited', { returnObjects: true })
  const prohibitedList = Array.isArray(prohibited) ? prohibited : []

  return (
    <AnimatePresence>
      {open ? (
        <Motion.div
          className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 lg:p-8"
          role="presentation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-[#050608]/90"
            aria-label={t('closeAria')}
            onClick={readOnly ? handleCloseReadOnly : undefined}
            tabIndex={readOnly ? 0 : -1}
          />

          <Motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="welcome-operator-title"
            className="relative flex max-h-[min(94vh,920px)] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-accent/40 bg-[#12151c] shadow-[0_24px_80px_-20px_rgba(0,0,0,0.85)] lg:max-w-4xl"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          >
            <span className="pointer-events-none absolute left-2 top-2 h-3 w-3 border-l border-t border-accent/45" aria-hidden />
            <span className="pointer-events-none absolute right-2 top-2 h-3 w-3 border-r border-t border-accent/45" aria-hidden />
            <span className="pointer-events-none absolute bottom-2 left-2 h-3 w-3 border-b border-l border-accent/45" aria-hidden />
            <span className="pointer-events-none absolute bottom-2 right-2 h-3 w-3 border-b border-r border-accent/45" aria-hidden />

            <header className="flex shrink-0 items-start justify-between gap-3 border-b border-accent/20 bg-[#0f1218] px-5 py-4 sm:px-6">
              <div className="flex min-w-0 items-start gap-3">
                <Shield className="mt-1 size-6 shrink-0 text-accent" strokeWidth={1.75} aria-hidden />
                <h2
                  id="welcome-operator-title"
                  className="font-mono-technical text-sm font-bold uppercase tracking-[0.2em] text-accent sm:text-base"
                >
                  {t('title')}
                </h2>
              </div>
              {readOnly ? (
                <button
                  type="button"
                  onClick={handleCloseReadOnly}
                  disabled={busy}
                  className="rounded border border-accent/20 p-1.5 text-app-text/55 transition hover:border-accent/40 hover:text-accent disabled:opacity-40"
                  aria-label={t('closeAria')}
                >
                  <X className="size-4" aria-hidden />
                </button>
              ) : null}
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6 lg:py-6">
              <div className="space-y-6 font-sans text-[13px] leading-[1.65] text-zinc-200 sm:text-sm sm:leading-relaxed">
                <p>{t('intro')}</p>
                <p className="text-zinc-400">{t('introContinue')}</p>

                <section className="rounded-lg border border-zinc-700/80 bg-[#0a0d12] px-4 py-3.5">
                  <h3 className="font-mono-technical text-[11px] font-bold uppercase tracking-[0.18em] text-accent">
                    {t('sections.firearms.title')}
                  </h3>
                  <p className="mt-2">{t('sections.firearms.body')}</p>
                </section>

                <section className="rounded-lg border border-zinc-700/80 bg-[#0a0d12] px-4 py-3.5">
                  <h3 className="font-mono-technical text-[11px] font-bold uppercase tracking-[0.18em] text-accent">
                    {t('sections.personnel.title')}
                  </h3>
                  <p className="mt-2">{t('sections.personnel.body')}</p>
                </section>

                <section className="rounded-lg border border-zinc-700/80 bg-[#0a0d12] px-4 py-3.5">
                  <h3 className="font-mono-technical text-[11px] font-bold uppercase tracking-[0.18em] text-accent">
                    {t('sections.rules.title')}
                  </h3>
                  <p className="mt-2">{t('sections.rules.lead')}</p>

                  <p className="mt-4 font-mono-technical text-[10px] font-bold uppercase tracking-wider text-amber-400/90">
                    {t('sections.rules.prohibitedTitle')}
                  </p>
                  <ul className="mt-2 list-disc space-y-1.5 pl-5 text-zinc-300">
                    {prohibitedList.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>

                  <p className="mt-4 font-mono-technical text-[10px] font-bold uppercase tracking-wider text-amber-400/90">
                    {t('sections.rules.reportTitle')}
                  </p>
                  <p className="mt-1.5">{t('sections.rules.reportBody')}</p>

                  <p className="mt-4 font-mono-technical text-[10px] font-bold uppercase tracking-wider text-amber-400/90">
                    {t('sections.rules.enforcementTitle')}
                  </p>
                  <p className="mt-1.5">{t('sections.rules.enforcementBody')}</p>

                  <p className="mt-4 font-mono-technical text-[10px] font-bold uppercase tracking-wider text-amber-400/90">
                    {t('sections.rules.responsibilityTitle')}
                  </p>
                  <p className="mt-1.5">{t('sections.rules.responsibilityBody')}</p>
                </section>

                <p className="font-mono-technical text-[11px] uppercase tracking-wider text-zinc-500">
                  {t('footer')}
                </p>
              </div>
            </div>

            <footer className="shrink-0 space-y-3 border-t border-accent/20 bg-[#0f1218] px-5 py-4 sm:px-6">
              {!readOnly ? (
                <>
                  <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-accent/25 bg-[#0a0d12] px-4 py-3">
                    <input
                      type="checkbox"
                      className="mt-1 size-4 shrink-0 accent-accent"
                      checked={ack}
                      disabled={busy}
                      onChange={(e) => setAck(e.target.checked)}
                    />
                    <span className="font-sans text-xs leading-relaxed text-zinc-200 sm:text-sm">
                      {t('ack')}
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/10 bg-[#0a0d12] px-4 py-3">
                    <input
                      type="checkbox"
                      className="mt-1 size-4 shrink-0 accent-accent"
                      checked={neverShow}
                      disabled={busy}
                      onChange={(e) => setNeverShow(e.target.checked)}
                    />
                    <span className="font-sans text-xs leading-relaxed text-zinc-300 sm:text-sm">
                      {t('neverShow')}
                    </span>
                  </label>
                </>
              ) : null}

              {error ? (
                <p className="font-mono-technical text-[10px] font-bold uppercase text-red-400">{error}</p>
              ) : null}

              <div className="flex justify-end">
                {readOnly ? (
                  <button
                    type="button"
                    onClick={handleCloseReadOnly}
                    className="rounded border border-accent/55 bg-accent/12 px-5 py-2.5 font-mono-technical text-[10px] font-bold uppercase tracking-wider text-accent transition hover:bg-accent/20"
                  >
                    {t('close')}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleConfirm()}
                    disabled={!ack || busy}
                    className="inline-flex items-center justify-center gap-2 rounded border border-accent/55 bg-accent/12 px-5 py-2.5 font-mono-technical text-[10px] font-bold uppercase tracking-wider text-accent transition hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {busy ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" aria-hidden />
                        {t('saving')}
                      </>
                    ) : (
                      t('close')
                    )}
                  </button>
                )}
              </div>
            </footer>
          </Motion.div>
        </Motion.div>
      ) : null}
    </AnimatePresence>
  )
}
