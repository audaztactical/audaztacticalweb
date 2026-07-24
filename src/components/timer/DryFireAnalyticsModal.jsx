import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Activity, X } from 'lucide-react'
import DryFireAnalytics from './DryFireAnalytics'

/**
 * Flinch / titreşim analizi — tam ekran modalı.
 * Veri toplama modal dışında da devam eder; bu sadece görünüm.
 * @param {{
 *   open: boolean
 *   onClose: () => void
 *   hits: import('../../lib/dryFireHits').DryFireHit[]
 *   reactionTimesMs?: number[]
 *   lastDrawMs?: number | null
 * }} props
 */
export default function DryFireAnalyticsModal({
  open,
  onClose,
  hits,
  reactionTimesMs = [],
  lastDrawMs = null,
}) {
  const { t } = useTranslation('timer')

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open, onClose])

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
      className="fixed inset-0 z-[270] flex items-end justify-center bg-black/80 p-3 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dryfire-analytics-modal-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="relative flex max-h-[min(92dvh,52rem)] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.85)]">
        <span
          className="pointer-events-none absolute left-2 top-2 h-3 w-3 border-l border-t border-slate-600/70"
          aria-hidden
        />
        <span
          className="pointer-events-none absolute right-2 top-2 h-3 w-3 border-r border-t border-slate-600/70"
          aria-hidden
        />

        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-800 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p
              id="dryfire-analytics-modal-title"
              className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-[#facc15]"
            >
              <Activity className="size-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
              {t('dryFire.analytics.kicker')}
            </p>
            <p className="mt-1 font-mono text-[9px] text-app-text/45">
              {t('dryFire.analytics.modalHint')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('dryFire.analytics.close')}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-slate-700 bg-slate-900 text-app-text/70 transition hover:border-[#facc15]/40 hover:text-[#facc15] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#facc15]/55"
          >
            <X className="size-4" strokeWidth={1.75} aria-hidden />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 sm:py-5">
          <DryFireAnalytics hits={hits} reactionTimesMs={reactionTimesMs} lastDrawMs={lastDrawMs} />
        </div>
      </div>
    </div>,
    document.body,
  )
}
