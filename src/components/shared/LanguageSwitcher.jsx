import { useTranslation } from 'react-i18next'
import { useLanguagePreference } from '../../context/LanguagePreferenceContext'
import { SUPPORTED_LANGUAGES } from '../../i18n'

/**
 * HUD şeridinde TR | EN dil seçici — mono terminal estetiği.
 */
export default function LanguageSwitcher({ compact = false }) {
  const { t } = useTranslation('common')
  const { language, setLanguage } = useLanguagePreference()

  return (
    <div
      className={[
        'inline-flex items-center rounded border border-white/12 bg-black/35 font-mono-technical uppercase tracking-[0.18em]',
        compact ? 'h-8 text-[9px]' : 'h-9 text-[10px]',
      ].join(' ')}
      role="group"
      aria-label={t('language.switchAria')}
    >
      {SUPPORTED_LANGUAGES.map((lang) => {
        const active = language === lang
        return (
          <button
            key={lang}
            type="button"
            onClick={() => void setLanguage(lang)}
            aria-pressed={active}
            className={[
              'min-w-[2.25rem] px-2 transition-colors',
              compact ? 'py-1' : 'py-1.5',
              active
                ? 'bg-accent/15 font-bold text-accent shadow-[inset_0_0_12px_rgba(132,204,22,0.12)]'
                : 'text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300',
            ].join(' ')}
          >
            {t(`language.${lang}`)}
          </button>
        )
      })}
    </div>
  )
}
