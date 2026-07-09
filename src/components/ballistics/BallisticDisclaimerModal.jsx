import { AlertTriangle } from 'lucide-react'
import { useTranslation } from 'react-i18next'

/**
 * Entry disclaimer — shown on every /balistik mount. No persistence (by design).
 * @param {{ open: boolean, onConfirm: () => void }} props
 */
export default function BallisticDisclaimerModal({ open, onConfirm }) {
  const { t } = useTranslation('ballistics')
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[400] flex items-end justify-center bg-black/80 p-3 backdrop-blur-[2px] sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="balistik-disclaimer-title"
      aria-describedby="balistik-disclaimer-body"
    >
      {/* Capture clicks — no dismiss on backdrop (ack required) */}
      <div className="absolute inset-0" aria-hidden />

      <div className="relative z-[1] w-full max-w-lg rounded-lg border border-amber-500/45 bg-[#0a0a0a] p-4 shadow-[0_0_40px_rgba(251,191,36,0.12),inset_0_1px_0_rgba(251,191,36,0.1)] sm:p-5">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded border border-amber-500/40 bg-amber-500/10">
            <AlertTriangle className="size-4 text-amber-400" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p
              id="balistik-disclaimer-title"
              className="font-mono-technical text-[11px] font-bold uppercase tracking-[0.24em] text-amber-400"
            >
              {t('disclaimer.title')}
            </p>
            <p
              id="balistik-disclaimer-body"
              className="mt-3 font-mono-technical text-[11px] leading-relaxed text-slate-200/90 sm:text-xs"
            >
              {t('disclaimer.body')}
            </p>
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            autoFocus
            onClick={onConfirm}
            className="w-full rounded border border-amber-500/50 bg-amber-500/15 px-4 py-2.5 font-mono-technical text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200 transition hover:border-amber-400/60 hover:bg-amber-500/25 sm:w-auto"
          >
            {t('disclaimer.confirmButton')}
          </button>
        </div>
      </div>
    </div>
  )
}
