import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import trCommon from './locales/tr/common.json'
import enCommon from './locales/en/common.json'
import trDashboard from './locales/tr/dashboard.json'
import enDashboard from './locales/en/dashboard.json'

export const SUPPORTED_LANGUAGES = /** @type {const} */ (['tr', 'en'])

/**
 * Tarayıcı dili — localStorage kullanılmaz.
 * @returns {'tr' | 'en'}
 */
export function detectBrowserLanguage() {
  const raw = typeof navigator !== 'undefined' ? navigator.language?.toLowerCase() ?? 'en' : 'en'
  return raw.startsWith('tr') ? 'tr' : 'en'
}

i18n.use(initReactI18next).init({
  resources: {
    tr: { common: trCommon, dashboard: trDashboard },
    en: { common: enCommon, dashboard: enDashboard },
  },
  lng: detectBrowserLanguage(),
  fallbackLng: 'en',
  supportedLngs: [...SUPPORTED_LANGUAGES],
  defaultNS: 'common',
  ns: ['common', 'dashboard'],
  interpolation: { escapeValue: false },
})

export default i18n
