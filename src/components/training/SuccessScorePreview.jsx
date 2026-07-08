import { useTranslation } from 'react-i18next'

/**
 * Live başarı oranı önizlemesi — kayıt öncesi payload ile aynı skor algoritması.
 * @param {{ percent: number; compromised?: boolean }} props
 */
export default function SuccessScorePreview({ percent, compromised = false }) {
  const { t } = useTranslation('training')
  const tone = compromised
    ? 'border-red-500/40 bg-red-950/20 text-red-400'
    : 'border-accent/40 bg-accent/10 text-accent'

  return (
    <p
      className={`w-full rounded border px-3 py-2.5 text-center font-mono-technical text-[9px] font-bold uppercase tracking-[0.2em] ${tone}`}
    >
      <span className="text-app-text/55">{t('common.terminal.successRate')} · </span>
      <span className="text-sm tabular-nums tracking-normal">{percent}%</span>
      {compromised ? (
        <span className="mt-1 block text-[8px] font-bold text-red-300/90">
          {t('common.terminal.criticalViolation')}
        </span>
      ) : null}
    </p>
  )
}
