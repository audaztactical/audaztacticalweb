import { Timer } from 'lucide-react'
import { useTranslation } from 'react-i18next'

/**
 * Boş durum — seçilen mod henüz aktif değil.
 * @param {{
 *   modeTitle?: string
 *   opsCode?: string
 * }} props
 */
export default function TimerModePlaceholder({ modeTitle = '', opsCode = 'TMR-00' }) {
  const { t } = useTranslation('timer')

  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-accent/18 bg-app-bg/80 px-6 py-16 text-center shadow-[inset_0_1px_0_rgba(0,255,65,0.06)] sm:py-20">
      <div className="flex size-14 items-center justify-center rounded-sm border border-accent/25 bg-accent/[0.06]">
        <Timer className="size-7 text-accent/65" strokeWidth={1.25} aria-hidden />
      </div>
      <p className="mt-5 font-mono-technical text-[8px] font-bold uppercase tracking-[0.32em] text-accent/70">
        [ {t('placeholder.kicker')} · {opsCode} ]
      </p>
      {modeTitle ? (
        <p className="mt-2 font-display text-sm font-bold uppercase tracking-[0.2em] text-app-text/80">
          {modeTitle}
        </p>
      ) : null}
      <h2 className="font-display mt-3 text-lg font-bold tracking-[0.1em] text-app-text sm:text-xl">
        {t('placeholder.title')}
      </h2>
      <p className="mt-2 max-w-md font-mono-technical text-[10px] leading-relaxed text-app-text/55 sm:text-[11px]">
        {t('placeholder.subtitle')}
      </p>
    </div>
  )
}
