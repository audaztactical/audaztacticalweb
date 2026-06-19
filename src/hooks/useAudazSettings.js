import { useAudazSettingsFromTheme } from '../contexts/ThemeContext'

/** users/{uid}.settings — ThemeProvider üzerinden paylaşımlı state. */
export function useAudazSettings() {
  return useAudazSettingsFromTheme()
}
