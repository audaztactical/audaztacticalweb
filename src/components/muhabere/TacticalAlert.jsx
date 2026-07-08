import { Loader2, ShieldAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'

/**
 * Taktik onay penceresi — Taktik Muhabere uyarıları.
 * @param {{
 *   open: boolean
 *   title?: string
 *   message: string
 *   confirmLabel?: string
 *   cancelLabel?: string
 *   busy?: boolean
 *   onConfirm: () => void
 *   onCancel: () => void
 * }} props
 */
export default function TacticalAlert({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  busy = false,
  onConfirm,
  onCancel,
}) {
  const { t } = useTranslation('messages')

  if (!open) return null

  const resolvedTitle = title ?? t('tacticalAlert.defaultTitle')
  const resolvedConfirm = confirmLabel ?? t('tacticalAlert.confirm')
  const resolvedCancel = cancelLabel ?? t('tacticalAlert.cancel')

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-4 font-mono backdrop-blur-sm"
      role="presentation"
      onClick={busy ? undefined : onCancel}
    >
      <div
        className="w-full max-w-sm rounded-md border border-amber-500/45 bg-zinc-950 shadow-[0_0_40px_rgba(255,180,0,0.12)]"
        role="alertdialog"
        aria-labelledby="tactical-alert-title"
        aria-describedby="tactical-alert-message"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center gap-2 border-b border-zinc-800 px-4 py-3">
          <ShieldAlert className="size-4 shrink-0 text-amber-400" strokeWidth={2} aria-hidden />
          <h2 id="tactical-alert-title" className="min-w-0 truncate text-xs font-bold uppercase tracking-[0.2em] text-amber-400">
            {resolvedTitle}
          </h2>
        </header>

        <p id="tactical-alert-message" className="px-4 py-4 text-xs leading-relaxed text-zinc-300">
          {message}
        </p>

        <div className="flex gap-2 border-t border-zinc-800 px-4 py-3">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="min-w-0 flex-1 truncate rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-40"
          >
            {resolvedCancel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="min-w-0 flex-1 truncate rounded-md border border-amber-500/40 bg-amber-950/40 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-amber-300 transition hover:bg-amber-900/50 disabled:opacity-40"
          >
            {busy ? (
              <span className="inline-flex items-center justify-center gap-1.5">
                <Loader2 className="size-3 animate-spin" aria-hidden />
                {t('tacticalAlert.processing')}
              </span>
            ) : (
              resolvedConfirm
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
