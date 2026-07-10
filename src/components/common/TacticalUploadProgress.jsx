import { useTranslation } from 'react-i18next'

/**
 * Tactical HUD yükleme çubuğu — neon green accent, obsidian zemin.
 * @param {{ progress: number, label?: string, error?: string | null, className?: string }} props
 */
export default function TacticalUploadProgress({ progress, label, error = null, className = '' }) {
  const { t } = useTranslation('common')
  const resolvedLabel = label ?? t('storage.progress.defaultLabel')
  const pct = Math.min(100, Math.max(0, Math.round(progress)))
  const hasError = Boolean(error?.trim())

  return (
    <div className={['space-y-1.5', className].filter(Boolean).join(' ')} role="status" aria-live="polite">
      <div className="flex items-center justify-between gap-2 font-mono-technical text-[8px] uppercase tracking-[0.22em] text-emerald-400/85">
        <span>[ {hasError ? 'SYNC_FAULT' : resolvedLabel} ]</span>
        <span className={['tabular-nums', hasError ? 'text-amber-400' : 'text-emerald-300'].join(' ')}>
          {hasError ? 'ERR' : `${pct}%`}
        </span>
      </div>
      <div
        className={[
          'relative h-1.5 overflow-hidden rounded-sm border bg-black/60',
          hasError ? 'border-amber-500/35' : 'border-emerald-500/25',
        ].join(' ')}
      >
        <div
          className={[
            'h-full transition-[width] duration-200 ease-out',
            hasError
              ? 'w-full bg-gradient-to-r from-amber-700/80 via-amber-500/70 to-amber-400/60'
              : 'bg-gradient-to-r from-emerald-600/90 via-emerald-400 to-lime-300 shadow-[0_0_12px_rgba(52,211,153,0.55)]',
          ].join(' ')}
          style={{ width: hasError ? '100%' : `${pct}%` }}
        />
        {!hasError ? (
          <span
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                'repeating-linear-gradient(90deg, transparent, transparent 6px, rgba(52,211,153,0.15) 6px, rgba(52,211,153,0.15) 8px)',
            }}
            aria-hidden
          />
        ) : null}
      </div>
      {hasError ? (
        <p className="font-mono-technical text-[7px] uppercase tracking-wider text-amber-400/90">[ {error} ]</p>
      ) : (
        <p className="font-mono-technical text-[7px] uppercase tracking-wider text-app-text/40">
          {t('storage.progress.syncHint')}
        </p>
      )}
    </div>
  )
}
