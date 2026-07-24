import { useTranslation } from 'react-i18next'
import { CheckCircle2, Shield } from 'lucide-react'

/**
 * Tam ekran — Silahı Kur talimat kartı (animasyonlu).
 * HAZIR → seans/arm başlar.
 *
 * @param {{
 *   open: boolean
 *   prepRackHeard?: boolean
 *   onReady: () => void
 * }} props
 */
export default function DryFirePrepOverlay({ open, prepRackHeard = false, onReady }) {
  const { t } = useTranslation('timer')

  if (!open) return null

  const steps = [
    t('dryFire.training.prep.steps.one'),
    t('dryFire.training.prep.steps.two'),
    t('dryFire.training.prep.steps.three'),
  ]

  return (
    <div
      className="absolute inset-0 z-[270] flex items-end justify-center bg-black/75 p-4 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dryfire-prep-title"
      data-dry-prep-overlay
    >
      <div
        className={[
          'relative w-full max-w-md overflow-hidden rounded-sm border border-[#facc15]/45 bg-[#0a0a0b]',
          'shadow-[0_0_48px_-12px_rgba(250,204,21,0.45)]',
          'animate-[dfPrepIn_380ms_cubic-bezier(0.22,1,0.36,1)_both]',
        ].join(' ')}
      >
        <span className="pointer-events-none absolute left-2 top-2 h-2.5 w-2.5 border-l border-t border-[#facc15]/50" />
        <span className="pointer-events-none absolute right-2 top-2 h-2.5 w-2.5 border-r border-t border-[#facc15]/50" />
        <span className="pointer-events-none absolute bottom-2 left-2 h-2.5 w-2.5 border-b border-l border-[#facc15]/40" />
        <span className="pointer-events-none absolute bottom-2 right-2 h-2.5 w-2.5 border-b border-r border-[#facc15]/40" />

        <div className="relative border-b border-[#facc15]/25 bg-[rgba(250,204,21,0.07)] px-4 py-4 sm:px-5">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-sm border border-[#facc15]/45 bg-[rgba(250,204,21,0.12)]">
              <Shield
                className="size-5 text-[#facc15] animate-[dfPrepPulse_1.8s_ease-in-out_infinite]"
                strokeWidth={1.5}
                aria-hidden
              />
            </span>
            <div className="min-w-0">
              <p
                id="dryfire-prep-title"
                className="font-mono-technical text-[10px] font-bold uppercase tracking-[0.28em] text-[#facc15]"
              >
                {t('dryFire.training.prep.title')}
              </p>
              <p className="mt-1.5 font-mono-technical text-[11px] leading-relaxed text-app-text/70">
                {prepRackHeard
                  ? t('dryFire.training.prep.rackHeard')
                  : t('dryFire.training.prep.body')}
              </p>
            </div>
          </div>
        </div>

        <div className="relative px-4 py-4 sm:px-5 sm:py-5">
          <ol className="space-y-2.5">
            {steps.map((label, i) => (
              <li
                key={label}
                className="flex items-start gap-3 rounded-sm border border-zinc-700/50 bg-zinc-950/80 px-3 py-2.5"
                style={{
                  animation: `dfPrepStep 420ms cubic-bezier(0.22,1,0.36,1) ${120 + i * 90}ms both`,
                }}
              >
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-sm border border-[#facc15]/40 font-mono-technical text-[10px] font-bold text-[#facc15]">
                  {i + 1}
                </span>
                <span className="min-w-0 font-mono-technical text-[11px] leading-snug text-app-text/80">
                  {label}
                </span>
              </li>
            ))}
          </ol>

          <button
            type="button"
            onClick={onReady}
            className={[
              'mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-sm border border-[#facc15]/60',
              'bg-[#facc15] px-3 font-mono-technical text-[11px] font-bold uppercase tracking-[0.22em] text-slate-950',
              'transition hover:bg-[#facc15]/90 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#facc15]/55',
              'animate-[dfPrepStep_480ms_cubic-bezier(0.22,1,0.36,1)_420ms_both]',
            ].join(' ')}
          >
            <CheckCircle2 className="size-4" strokeWidth={1.75} aria-hidden />
            {t('dryFire.training.prep.ready')}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes dfPrepIn {
          from { opacity: 0; transform: translateY(18px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes dfPrepStep {
          from { opacity: 0; transform: translateX(-10px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes dfPrepPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.55; }
        }
      `}</style>
    </div>
  )
}
