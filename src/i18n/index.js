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
import trForum from './locales/tr/forum.json'
import enForum from './locales/en/forum.json'
import trIntel from './locales/tr/intel.json'
import enIntel from './locales/en/intel.json'
import trTraining from './locales/tr/training.json'
import enTraining from './locales/en/training.json'
import trTrainingPdf from './locales/tr/training-pdf.json'
import enTrainingPdf from './locales/en/training-pdf.json'
import trHealth from './locales/tr/health.json'
import enHealth from './locales/en/health.json'
import trHealthPdf from './locales/tr/health-pdf.json'
import enHealthPdf from './locales/en/health-pdf.json'
import trArmory from './locales/tr/armory.json'
import enArmory from './locales/en/armory.json'
import trBallistics from './locales/tr/ballistics.json'
import enBallistics from './locales/en/ballistics.json'
import trBallisticsPdf from './locales/tr/ballistics-pdf.json'
import enBallisticsPdf from './locales/en/ballistics-pdf.json'
import trProgress from './locales/tr/progress.json'
import enProgress from './locales/en/progress.json'

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
    tr: { common: trCommon, dashboard: trDashboard, nav: trNav, profile: trProfile, messages: trMessages, academy: trAcademy, forum: trForum, intel: trIntel, training: trTraining, 'training-pdf': trTrainingPdf, health: trHealth, 'health-pdf': trHealthPdf, armory: trArmory, ballistics: trBallistics, 'ballistics-pdf': trBallisticsPdf, progress: trProgress },
    en: { common: enCommon, dashboard: enDashboard, nav: enNav, profile: enProfile, messages: enMessages, academy: enAcademy, forum: enForum, intel: enIntel, training: enTraining, 'training-pdf': enTrainingPdf, health: enHealth, 'health-pdf': enHealthPdf, armory: enArmory, ballistics: enBallistics, 'ballistics-pdf': enBallisticsPdf, progress: enProgress },
  },
  lng: detectBrowserLanguage(),
  fallbackLng: 'en',
  supportedLngs: [...SUPPORTED_LANGUAGES],
  defaultNS: 'common',
  ns: ['common', 'dashboard', 'nav', 'profile', 'messages', 'academy', 'forum', 'intel', 'training', 'training-pdf', 'health', 'health-pdf', 'armory', 'ballistics', 'ballistics-pdf', 'progress'],
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

/** @param {unknown} lng */
export function normalizeAppLanguage(lng) {
  return String(lng ?? '').toLowerCase().startsWith('tr') ? 'tr' : 'en'
}

/** CSS text-transform: uppercase locale kuralları için <html lang> senkronu. */
export function syncDocumentLanguage(lng) {
  if (typeof document === 'undefined') return
  document.documentElement.lang = normalizeAppLanguage(lng)
}

syncDocumentLanguage(i18n.language)
i18n.on('languageChanged', syncDocumentLanguage)

export default i18n
