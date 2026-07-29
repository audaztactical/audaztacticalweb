import { useTranslation } from 'react-i18next'

/**
 * @param {{
 *   statusKey: string
 *   tipKey: string
 *   severity?: 'info' | 'ok' | 'warn' | 'crit'
 *   params?: Record<string, string | number>
 *   className?: string
 * }} props
 */
export default function AnalysisFeedbackBox({
  statusKey,
  tipKey,
  severity = 'info',
  params,
  className = '',
}) {
  const { t } = useTranslation('timer')

  const tone =
    severity === 'ok'
      ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-200'
      : severity === 'warn'
        ? 'border-amber-500/40 bg-amber-500/10 text-amber-100'
        : severity === 'crit'
          ? 'border-rose-500/40 bg-rose-500/10 text-rose-100'
          : 'border-slate-600/50 bg-slate-900/80 text-zinc-300'

  return (
    <div className={['px-2 py-1.5', className].join(' ')}>
      <div className={['rounded-sm border px-2.5 py-2', tone].join(' ')}>
        <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-inherit">
          {t(statusKey, params)}
        </p>
        <p className="mt-1 font-mono text-xs leading-snug text-inherit opacity-95 sm:text-sm sm:leading-relaxed">
          {t(tipKey, params)}
        </p>
      </div>
    </div>
  )
}
