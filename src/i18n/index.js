import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import trCommon from './locales/tr/common.json'
import enCommon from './locales/en/common.json'
import trDashboard from './locales/tr/dashboard.json'
import enDashboard from './locales/en/dashboard.json'
import trNav from './locales/tr/nav.json'
import enNav from './locales/en/nav.json'
import trProfile from './locales/tr/profile.json'
import enProfile from './locales/en/profile.json'
import trMessages from './locales/tr/messages.json'
import enMessages from './locales/en/messages.json'
import trAcademy from './locales/tr/academy.json'
import enAcademy from './locales/en/academy.json'

export const SUPPORTED_LANGUAGES = /** @type {const} */ (['tr', 'en'])

/**
 * Tarayıcı dili — localStorage kullanılmaz.
 * @returns {'tr' | 'en'}
 */
export function detectBrowserLanguage() {
  const raw = typeof navigator !== 'undefined' ? navigator.language?.toLowerCase() ?? 'en' : 'en'
  return raw.startsWith('tr') ? 'tr' : 'en'
}

const isDev = typeof import.meta !== 'undefined' && Boolean(import.meta.env?.DEV)

i18n.use(initReactI18next).init({
  resources: {
    tr: { common: trCommon, dashboard: trDashboard, nav: trNav, profile: trProfile, messages: trMessages, academy: trAcademy },
    en: { common: enCommon, dashboard: enDashboard, nav: enNav, profile: enProfile, messages: enMessages, academy: enAcademy },
  },
  lng: detectBrowserLanguage(),
  fallbackLng: 'en',
  supportedLngs: [...SUPPORTED_LANGUAGES],
  defaultNS: 'common',
  ns: ['common', 'dashboard', 'nav', 'profile', 'messages', 'academy'],
  interpolation: { escapeValue: false },
  ...(isDev
    ? {
        missingKeyHandler(lngs, ns, key) {
          const lng = Array.isArray(lngs) ? lngs[0] : lngs
          console.warn(`[i18n] Missing translation key "${ns}:${key}" (lng: ${lng})`)
        },
      }
    : {}),
})

export default i18n
