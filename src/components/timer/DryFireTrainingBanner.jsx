import { useTranslation } from 'react-i18next'
import { CheckCircle2, Crosshair, RefreshCw, Shield } from 'lucide-react'

/**
 * Prep / atış / kurulum senaryo şeridi.
 * @param {{
 *   scenario: import('../../lib/dryFireTrainingMachine').DryFireScenarioPhase
 *   prepRackHeard?: boolean
 *   onConfirmRacked?: () => void
 *   onRestartSafety?: () => void
 * }} props
 */
export default function DryFireTrainingBanner({
  scenario,
  prepRackHeard = false,
  onConfirmRacked,
  onRestartSafety,
}) {
  const { t } = useTranslation('timer')

  if (scenario === 'safety' || scenario === 'idle') return null

  const isPrep = scenario === 'prep'
  const isShot = scenario === 'live_shot'
  const isRack = scenario === 'live_rack'

  return (
    <div
      className={[
        'rounded-sm border px-3 py-2.5',
        isPrep
          ? 'border-[#facc15]/40 bg-[#facc15]/08'
          : isRack
            ? 'border-sky-400/40 bg-sky-500/10'
            : 'border-emerald-500/40 bg-emerald-500/10',
      ].join(' ')}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex items-start gap-2.5">
          {isPrep ? (
            <Shield className="mt-0.5 size-4 shrink-0 text-[#facc15]" strokeWidth={1.5} aria-hidden />
          ) : isRack ? (
            <RefreshCw className="mt-0.5 size-4 shrink-0 text-sky-300" strokeWidth={1.5} aria-hidden />
          ) : (
            <Crosshair className="mt-0.5 size-4 shrink-0 text-emerald-300" strokeWidth={1.5} aria-hidden />
          )}
          <div className="min-w-0">
            <p
              className={[
                'font-mono-technical text-[9px] font-bold uppercase tracking-[0.2em]',
                isPrep ? 'text-[#facc15]' : isRack ? 'text-sky-300' : 'text-emerald-300',
              ].join(' ')}
            >
              {isPrep
                ? t('dryFire.training.prep.title')
                : isRack
                  ? t('dryFire.training.cycle.rackTitle')
                  : t('dryFire.training.cycle.shotTitle')}
            </p>
            <p className="mt-1 font-mono-technical text-[10px] leading-relaxed text-app-text/65">
              {isPrep
                ? prepRackHeard
                  ? t('dryFire.training.prep.rackHeard')
                  : t('dryFire.training.prep.body')
                : isRack
                  ? t('dryFire.training.cycle.rackBody')
                  : t('dryFire.training.cycle.shotBody')}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isPrep ? (
            <button
              type="button"
              onClick={onConfirmRacked}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-sm border border-[#facc15]/50 bg-[#facc15]/12 px-2.5 font-mono-technical text-[8px] font-bold uppercase tracking-[0.16em] text-[#facc15] transition hover:bg-[#facc15]/18"
            >
              <CheckCircle2 className="size-3.5" strokeWidth={1.5} aria-hidden />
              {t('dryFire.training.prep.confirmRacked')}
            </button>
          ) : null}
          {onRestartSafety ? (
            <button
              type="button"
              onClick={onRestartSafety}
              className="inline-flex min-h-9 items-center rounded-sm border border-zinc-600/50 px-2.5 font-mono-technical text-[8px] uppercase tracking-[0.14em] text-zinc-400 transition hover:border-zinc-500 hover:text-zinc-200"
            >
              {t('dryFire.training.restartSafety')}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
