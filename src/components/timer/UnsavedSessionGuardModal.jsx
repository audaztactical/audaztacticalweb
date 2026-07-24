import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { AlertTriangle } from 'lucide-react'

/**
 * Kaydedilmemiş Standart Atış oturumu — onay diyaloğu.
 * @param {{
 *   open: boolean
 *   onCancel: () => void
 *   onConfirm: () => void
 * }} props
 */
export default function UnsavedSessionGuardModal({ open, onCancel, onConfirm }) {
  const { t } = useTranslation('timer')

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  useEffect(() => {
    if (!open || typeof document === 'undefined') return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-[260] flex items-end justify-center bg-black/80 p-3 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="unsaved-session-guard-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label={t('standardShot.unsavedGuard.closeAria')}
        onClick={onCancel}
      />
      <div className="relative z-[1] w-full max-w-md overflow-hidden rounded-sm border border-[#facc15]/50 bg-[#0a0a0b] shadow-[0_0_40px_-12px_rgba(250,204,21,0.35)]">
        <div
          className="pointer-events-none absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(250,204,21,0.07) 1px, transparent 1px), linear-gradient(to bottom, rgba(250,204,21,0.07) 1px, transparent 1px)',
            backgroundSize: '12px 12px',
          }}
          aria-hidden
        />
        <span className="pointer-events-none absolute left-2 top-2 h-3 w-3 border-l border-t border-[#facc15]/55" />
        <span className="pointer-events-none absolute right-2 top-2 h-3 w-3 border-r border-t border-[#facc15]/55" />
        <span className="pointer-events-none absolute bottom-2 left-2 h-3 w-3 border-b border-l border-[#facc15]/55" />
        <span className="pointer-events-none absolute bottom-2 right-2 h-3 w-3 border-b border-r border-[#facc15]/55" />

        <div className="relative z-[1] px-4 py-5 sm:px-5 sm:py-6">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-sm border border-[#facc15]/40 bg-[rgba(250,204,21,0.1)]">
              <AlertTriangle className="size-4 text-[#facc15]" strokeWidth={1.5} aria-hidden />
            </span>
            <div className="min-w-0">
              <p
                id="unsaved-session-guard-title"
                className="font-mono-technical text-[10px] font-bold uppercase tracking-[0.28em] text-[#facc15]"
              >
                {t('standardShot.unsavedGuard.title')}
              </p>
              <p className="mt-3 font-mono-technical text-[11px] leading-relaxed text-app-text/75">
                {t('standardShot.unsavedGuard.body')}
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex min-h-11 touch-manipulation items-center justify-center rounded-sm border border-zinc-600/60 bg-zinc-900/50 px-3 py-2.5 font-mono-technical text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-300 transition hover:border-zinc-500 hover:bg-zinc-800/60 active:scale-[0.99]"
            >
              {t('standardShot.unsavedGuard.cancel')}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="inline-flex min-h-11 touch-manipulation items-center justify-center rounded-sm border border-[#facc15]/55 bg-[rgba(250,204,21,0.12)] px-3 py-2.5 font-mono-technical text-[9px] font-bold uppercase tracking-[0.16em] text-[#facc15] transition hover:bg-[rgba(250,204,21,0.2)] active:scale-[0.99]"
            >
              {t('standardShot.unsavedGuard.discard')}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
