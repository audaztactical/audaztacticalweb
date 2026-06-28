/** @typedef {'dark' | 'light' | 'obsidian'} AudazTheme */

/** @typedef {{
 *   muhabere: boolean
 *   training: boolean
 *   intel: boolean
 *   academy: boolean
 *   push: boolean
 * }} AudazNotificationSettings */

/** @typedef {{
 *   theme: AudazTheme
 *   notifications: AudazNotificationSettings
 * }} AudazUserSettings */

/** @readonly */
export const DEFAULT_AUDAZ_SETTINGS = /** @type {AudazUserSettings} */ ({
  theme: 'dark',
  notifications: {
    muhabere: true,
    training: true,
    intel: true,
    academy: true,
    push: false,
  },
})

/** @readonly */
export const AUDAZ_THEME_OPTIONS = /** @type {const} */ ([
  { value: 'dark', label: 'Koyu (Noir)', cssClass: 'theme-noir' },
  { value: 'light', label: 'Açık (HUD)', cssClass: 'theme-hud' },
  { value: 'obsidian', label: 'Obsidian (Matrix)', cssClass: 'theme-matrix' },
])

/** @readonly */
export const AUDAZ_THEME_CSS_CLASSES = AUDAZ_THEME_OPTIONS.map((o) => o.cssClass)

/**
 * @param {AudazTheme | string | undefined | null} theme
 * @returns {string}
 */
export function audazThemeToCssClass(theme) {
  const match = AUDAZ_THEME_OPTIONS.find((o) => o.value === theme)
  return match?.cssClass ?? 'theme-noir'
}

/**
 * @param {unknown} raw
 * @returns {AudazUserSettings}
 */
export function parseAudazSettings(raw) {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_AUDAZ_SETTINGS, notifications: { ...DEFAULT_AUDAZ_SETTINGS.notifications } }

  const data = /** @type {Record<string, unknown>} */ (raw)
  const notificationsRaw =
    data.notifications && typeof data.notifications === 'object'
      ? /** @type {Record<string, unknown>} */ (data.notifications)
      : {}

  const themeRaw = String(data.theme ?? DEFAULT_AUDAZ_SETTINGS.theme)
  const theme = AUDAZ_THEME_OPTIONS.some((o) => o.value === themeRaw)
    ? /** @type {AudazTheme} */ (themeRaw)
    : DEFAULT_AUDAZ_SETTINGS.theme

  return {
    theme,
    notifications: {
      muhabere:
        typeof notificationsRaw.muhabere === 'boolean'
          ? notificationsRaw.muhabere
          : DEFAULT_AUDAZ_SETTINGS.notifications.muhabere,
      training:
        typeof notificationsRaw.training === 'boolean'
          ? notificationsRaw.training
          : DEFAULT_AUDAZ_SETTINGS.notifications.training,
      intel:
        typeof notificationsRaw.intel === 'boolean'
          ? notificationsRaw.intel
          : DEFAULT_AUDAZ_SETTINGS.notifications.intel,
      academy:
        typeof notificationsRaw.academy === 'boolean'
          ? notificationsRaw.academy
          : DEFAULT_AUDAZ_SETTINGS.notifications.academy,
      push:
        typeof notificationsRaw.push === 'boolean'
          ? notificationsRaw.push
          : DEFAULT_AUDAZ_SETTINGS.notifications.push,
    },
  }
}

/**
 * @param {AudazUserSettings} base
 * @param {Partial<AudazUserSettings> & { notifications?: Partial<AudazNotificationSettings> }} patch
 * @returns {AudazUserSettings}
 */
export function mergeAudazSettings(base, patch) {
  return {
    theme: patch.theme ?? base.theme,
    notifications: {
      ...base.notifications,
      ...(patch.notifications ?? {}),
    },
  }
}

/**
 * @param {AudazUserSettings} a
 * @param {AudazUserSettings} b
 */
export function audazSettingsEqual(a, b) {
  return (
    a.theme === b.theme &&
    a.notifications.muhabere === b.notifications.muhabere &&
    a.notifications.training === b.notifications.training &&
    a.notifications.intel === b.notifications.intel &&
    a.notifications.academy === b.notifications.academy &&
    a.notifications.push === b.notifications.push
  )
}
