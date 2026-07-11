import { useTranslation } from 'react-i18next'
import { useLanguagePreference } from '../../context/LanguagePreferenceContext'
import { useCompactShell } from '../../hooks/useCompactShell'
import { SUPPORTED_LANGUAGES } from '../../i18n'

/**
 * Dil seçici — lg+ / masaüstü: kayan pill; kompakt kabuk / mobil: tek dokunuşla toggle.
 * @param {{ compact?: boolean }} [props] — true ise her zaman mobil toggle (MobileLayout vb.)
 */
export default function LanguageSwitcher({ compact = false }) {
  const { t } = useTranslation('common')
  const { language, setLanguage } = useLanguagePreference()
  const shellCompact = useCompactShell()
  const mobileMode = compact || shellCompact

  const activeIndex = Math.max(0, SUPPORTED_LANGUAGES.indexOf(/** @type {'tr' | 'en'} */ (language)))
  const nextLang = language === 'tr' ? 'en' : 'tr'

  if (mobileMode) {
    return (
      <button
        type="button"
        onClick={() => void setLanguage(nextLang)}
        aria-label={nextLang === 'en' ? t('language.switchToEn') : t('language.switchToTr')}
        title={nextLang === 'en' ? t('language.switchToEn') : t('language.switchToTr')}
        className={[
          'inline-flex min-h-9 min-w-9 items-center justify-center rounded-full border border-white/14',
          'bg-black/50 font-mono-technical text-[10px] font-bold uppercase tracking-[0.18em] text-accent',
          'shadow-[inset_0_0_12px_rgba(132,204,22,0.1)] transition',
          'hover:border-accent/40 hover:bg-accent/10',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent/60',
          'active:scale-[0.96]',
        ].join(' ')}
      >
        {t(`language.${language}`)}
      </button>
    )
  }

  return (
    <div
      className={[
        'relative inline-grid grid-cols-2 items-stretch rounded-full border border-white/14',
        'bg-black/55 p-0.5 font-mono-technical text-[10px] uppercase tracking-[0.18em]',
        'shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
      ].join(' ')}
      role="group"
      aria-label={t('language.switchAria')}
    >
      <span
        aria-hidden
        className={[
          'pointer-events-none absolute inset-y-0.5 left-0.5 z-0 w-[calc(50%-2px)] rounded-full',
          'border border-accent/35 bg-accent/18',
          'shadow-[0_0_14px_-4px_rgba(132,204,22,0.55),inset_0_0_10px_rgba(132,204,22,0.12)]',
          'transition-transform duration-200 ease-out will-change-transform',
        ].join(' ')}
        style={{ transform: `translateX(${activeIndex * 100}%)` }}
      />

      {SUPPORTED_LANGUAGES.map((lang) => {
        const active = language === lang
        return (
          <button
            key={lang}
            type="button"
            onClick={() => void setLanguage(lang)}
            aria-pressed={active}
            aria-label={
              active
                ? t(`language.${lang}`)
                : lang === 'en'
                  ? t('language.switchToEn')
                  : t('language.switchToTr')
            }
            className={[
              'relative z-10 min-w-[2.5rem] rounded-full px-3 py-1.5 transition-colors duration-200',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent/60',
              active
                ? 'font-bold text-accent'
                : 'font-semibold text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300',
            ].join(' ')}
          >
            {t(`language.${lang}`)}
          </button>
        )
      })}
    </div>
  )
}
