import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion as Motion } from 'framer-motion'
import { Loader2, Scale, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  LEGAL_PROTOCOL_COUNT,
  LEGAL_PROTOCOL_FINAL_NOTE,
  LEGAL_PROTOCOLS,
} from '../data/legalProtocols'
import { emitFirebaseError } from '../lib/firebaseErrorBus'

const CHECKBOX_LABEL =
  'Yukarıdaki 46 maddelik Operasyonel ve Hukuki Protokolü okudum, anladım ve kabul ediyorum.'

/**
 * Operasyonel ve Hukuki Protokol onay modali.
 * @param {{
 *   open: boolean
 *   onClose?: () => void
 *   onConfirmed?: () => void
 *   persist?: boolean
 *   dismissible?: boolean
 *   title?: string
 * }} props
 */
export default function LegalDisclaimer({
  open,
  onClose,
  onConfirmed,
  persist = true,
  dismissible = true,
  title = 'OPERASYONEL VE HUKUKİ PROTOKOL',
}) {
  const { t } = useTranslation('common')
  const { user, agreeToTerms } = useAuth()
  const [checked, setChecked] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) {
      setChecked(false)
      setBusy(false)
      setError('')
    }
  }, [open])

  const handleConfirm = useCallback(async () => {
    if (!checked || busy) return

    setBusy(true)
    setError('')

    try {
      if (persist) {
        if (!user?.uid) {
          setError(t('legal.authRequired'))
          return
        }
        await agreeToTerms()
      }
      onConfirmed?.()
    } catch (err) {
      emitFirebaseError(err)
      setError(err instanceof Error ? err.message : t('legal.saveFailed'))
    } finally {
      setBusy(false)
    }
  }, [agreeToTerms, busy, checked, onConfirmed, persist, t, user?.uid])

  const handleClose = () => {
    if (busy || !dismissible) return
    onClose?.()
  }

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
            aria-label="Modali kapat"
            onClick={handleClose}
            tabIndex={dismissible ? 0 : -1}
          />

          <Motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="legal-disclaimer-title"
            className="relative flex max-h-[min(94vh,920px)] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-accent/40 bg-[#12151c] shadow-[0_24px_80px_-20px_rgba(0,0,0,0.85)] lg:max-w-5xl xl:max-w-6xl"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          >
            <span className="pointer-events-none absolute left-2 top-2 h-3 w-3 border-l border-t border-accent/45" aria-hidden />
            <span className="pointer-events-none absolute right-2 top-2 h-3 w-3 border-r border-t border-accent/45" aria-hidden />
            <span className="pointer-events-none absolute bottom-2 left-2 h-3 w-3 border-b border-l border-accent/45" aria-hidden />
            <span className="pointer-events-none absolute bottom-2 right-2 h-3 w-3 border-b border-r border-accent/45" aria-hidden />

            <header className="flex shrink-0 items-start justify-between gap-3 border-b border-accent/20 bg-[#0f1218] px-5 py-4 sm:px-6 lg:px-8">
              <div className="flex min-w-0 items-start gap-3">
                <Scale className="mt-1 size-6 shrink-0 text-accent" strokeWidth={1.75} aria-hidden />
                <div className="min-w-0">
                  <h2
                    id="legal-disclaimer-title"
                    className="font-mono-technical text-sm font-bold uppercase tracking-[0.2em] text-accent sm:text-base"
                  >
                    {title}
                  </h2>
                  <p className="mt-1.5 font-mono-technical text-[11px] uppercase tracking-wider text-zinc-400 sm:text-xs">
                    {LEGAL_PROTOCOL_COUNT} MADDE · OPERATÖR UYUMLULUK PAKETİ
                  </p>
                </div>
              </div>
              {dismissible ? (
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={busy}
                  className="rounded border border-accent/20 p-1.5 text-app-text/55 transition hover:border-accent/40 hover:text-accent disabled:opacity-40"
                  aria-label="Kapat"
                >
                  <X className="size-4" aria-hidden />
                </button>
              ) : null}
            </header>

            <div
              className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6 lg:px-8 lg:py-6"
              tabIndex={0}
              aria-label="Protokol maddeleri"
            >
              <div className="space-y-8">
                {LEGAL_PROTOCOLS.map((block) => (
                  <section key={block.section}>
                    <h3 className="mb-4 font-mono-technical text-xs font-bold uppercase leading-snug tracking-wider text-accent sm:text-sm">
                      {block.section}
                    </h3>
                    <ol className="grid grid-cols-1 gap-3 xl:grid-cols-2 xl:gap-x-5">
                      {block.items.map((item) => (
                        <li
                          key={item.id}
                          className="rounded-lg border border-zinc-700/80 bg-[#0a0d12] px-4 py-3"
                        >
                          <span className="font-mono-technical text-xs font-bold tabular-nums text-accent">
                            Madde {String(item.id).padStart(2, '0')}
                          </span>
                          <p className="mt-2 font-sans text-[13px] leading-[1.65] text-zinc-200 sm:text-sm sm:leading-relaxed">
                            {item.text}
                          </p>
                        </li>
                      ))}
                    </ol>
                  </section>
                ))}
                <aside className="rounded-lg border border-accent/25 bg-[#0a0d12] px-4 py-4 xl:col-span-2">
                  <p className="font-sans text-[13px] leading-[1.65] text-zinc-300 sm:text-sm sm:leading-relaxed">
                    {LEGAL_PROTOCOL_FINAL_NOTE}
                  </p>
                </aside>
              </div>
            </div>

            <footer className="shrink-0 space-y-3 border-t border-accent/20 bg-[#0f1218] px-5 py-4 sm:px-6 lg:px-8">
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-accent/25 bg-[#0a0d12] px-4 py-3.5">
                <input
                  type="checkbox"
                  className="mt-1 size-4 shrink-0 accent-accent"
                  checked={checked}
                  disabled={busy}
                  onChange={(e) => setChecked(e.target.checked)}
                />
                <span className="font-sans text-xs leading-relaxed text-zinc-200 sm:text-sm">
                  {CHECKBOX_LABEL}
                </span>
              </label>

              {error ? (
                <p className="font-mono-technical text-[10px] font-bold uppercase text-red-400">
                  {error}
                </p>
              ) : null}

              <div className="flex flex-wrap items-center justify-end gap-2">
                {dismissible ? (
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={busy}
                    className="rounded border border-accent/20 px-4 py-2.5 font-mono-technical text-[10px] font-bold uppercase tracking-wider text-app-text/70 transition hover:border-accent/40 hover:text-app-text disabled:opacity-40"
                  >
                    Vazgeç
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => void handleConfirm()}
                  disabled={!checked || busy}
                  className="inline-flex items-center justify-center gap-2 rounded border border-accent/55 bg-accent/12 px-5 py-2.5 font-mono-technical text-[10px] font-bold uppercase tracking-wider text-accent shadow-[0_0_20px_-8px_color-mix(in_srgb,var(--accent-color)_35%,transparent)] transition hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busy ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" aria-hidden />
                      Kaydediliyor…
                    </>
                  ) : (
                    'Onayla'
                  )}
                </button>
              </div>
            </footer>
          </Motion.div>
        </Motion.div>
      ) : null}
    </AnimatePresence>
  )
}

export { CHECKBOX_LABEL }
