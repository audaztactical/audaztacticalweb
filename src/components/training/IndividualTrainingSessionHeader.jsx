import { User } from 'lucide-react'
import { useTranslation } from 'react-i18next'

/** Bireysel sektörlerde gösterilir — grup eğitimi verisi içermez. */
export default function IndividualTrainingSessionHeader() {
  const { t } = useTranslation('training')

  return (
    <div className="rounded-lg border border-accent/25 bg-app-bg/90 px-3 py-2.5 sm:px-4 sm:py-3">
      <div className="flex items-center gap-2.5">
        <User className="size-3.5 shrink-0 text-accent/80" strokeWidth={1.75} aria-hidden />
        <div className="min-w-0">
          <p className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.32em] text-accent/80">
            [ {t('common.terminal.individualMode.kicker')} ]
          </p>
          <p className="mt-0.5 font-mono-technical text-[9px] uppercase text-app-text/55">
            {t('common.terminal.individualMode.hint')}
          </p>
        </div>
      </div>
    </div>
  )
}
