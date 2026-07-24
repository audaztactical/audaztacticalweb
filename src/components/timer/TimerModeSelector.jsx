import { useTranslation } from 'react-i18next'
import TimerModeCard from './TimerModeCard'
import { TIMER_MODES } from './timerModes'

/**
 * @param {{
 *   onModeSelect: (mode: import('./timerModes').TimerModeDef) => void
 * }} props
 */
export default function TimerModeSelector({ onModeSelect }) {
  const { t } = useTranslation('timer')

  return (
    <div className="space-y-5">
      <div>
        <p className="font-mono text-[8px] font-bold uppercase tracking-[0.28em] text-[#facc15]/80">
          {t('hub.kicker')}
        </p>
        <p className="mt-1 font-mono text-xs text-app-text/70">{t('hub.hint')}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-4 md:gap-5">
        {TIMER_MODES.map((mode) => (
          <TimerModeCard
            key={mode.id}
            title={t(mode.titleKey)}
            description={t(mode.descriptionKey)}
            opsCode={mode.opsCode}
            icon={mode.icon}
            available={mode.available}
            stubLabel={t('placeholder.title')}
            activeLabel={t('calibration.mpu.guide.active')}
            onSelect={() => onModeSelect(mode)}
          />
        ))}
      </div>
    </div>
  )
}
