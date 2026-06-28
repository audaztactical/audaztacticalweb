/* eslint-disable react-refresh/only-export-components -- ThemeProvider + hooks aynı modülde */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'
import { prepareAudazPatchPayload } from '../lib/audazFirestoreWrite'
import {
  audazThemeToCssClass,
  AUDAZ_THEME_CSS_CLASSES,
  DEFAULT_AUDAZ_SETTINGS,
  mergeAudazSettings,
  parseAudazSettings,
} from '../lib/audazSettings'
import { db, isFirebaseConfigured } from '../lib/firebase'
import { emitFirebaseError } from '../lib/firebaseErrorBus'
import { safeOnSnapshot } from '../lib/firestoreSnapshot'
import { setNotificationSoundEnabled } from '../lib/notificationSound'

/** @typedef {import('../lib/audazSettings').AudazTheme} AudazTheme */
/** @typedef {import('../lib/audazSettings').AudazUserSettings} AudazUserSettings */

/** @param {string} themeClass */
function applyRootThemeClass(themeClass) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  for (const cls of AUDAZ_THEME_CSS_CLASSES) {
    root.classList.remove(cls)
  }
  if (themeClass) root.classList.add(themeClass)
}

/** @type {React.Context<{
 *   theme: AudazTheme
 *   themeClass: string
 *   settings: AudazUserSettings
 *   loading: boolean
 *   saving: boolean
 *   error: unknown | null
 *   ready: boolean
 *   updateSettings: (patch: Partial<AudazUserSettings> & { notifications?: Partial<AudazUserSettings['notifications']> }) => Promise<AudazUserSettings>
 *   applyThemeImmediate: (theme: AudazTheme) => void
 *   setTheme: (theme: AudazTheme, options?: { persist?: boolean }) => Promise<void>
 * } | null>} */
const ThemeContext = createContext(null)

/**
 * Firestore users/{uid}.settings.theme dinler; html root class günceller.
 * @param {{ children: import('react').ReactNode }} props
 */
export function ThemeProvider({ children }) {
  const { user } = useAuth()
  const uid = user?.uid ?? null

  const [settings, setSettings] = useState(/** @type {AudazUserSettings} */ ({
    ...DEFAULT_AUDAZ_SETTINGS,
    notifications: { ...DEFAULT_AUDAZ_SETTINGS.notifications },
  }))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(/** @type {unknown | null} */ (null))
  const [themeOverride, setThemeOverride] = useState(/** @type {AudazTheme | null} */ (null))

  const settingsRef = useRef(settings)
  settingsRef.current = settings

  const activeTheme = themeOverride ?? settings.theme
  const themeClass = audazThemeToCssClass(activeTheme)

  useEffect(() => {
    applyRootThemeClass(themeClass)
  }, [themeClass])

  useEffect(() => {
    if (themeOverride && themeOverride === settings.theme) {
      setThemeOverride(null)
    }
  }, [settings.theme, themeOverride])

  useEffect(() => {
    if (!uid || !isFirebaseConfigured() || !db) {
      setSettings({
        ...DEFAULT_AUDAZ_SETTINGS,
        notifications: { ...DEFAULT_AUDAZ_SETTINGS.notifications },
      })
      setLoading(false)
      setError(null)
      setThemeOverride(null)
      return undefined
    }

    setLoading(true)

    const ref = doc(db, 'users', uid)
    const unsub = safeOnSnapshot(
      ref,
      (snap) => {
        const raw = snap.exists() ? snap.data()?.settings : null
        const parsed = parseAudazSettings(raw)
        setNotificationSoundEnabled(parsed.notifications.sound)
        setSettings(parsed)
        setLoading(false)
        setError(null)
      },
      (err) => {
        emitFirebaseError(err)
        setError(err)
        setLoading(false)
      },
    )

    return unsub
  }, [uid])

  const applyThemeImmediate = useCallback((/** @type {AudazTheme} */ theme) => {
    const cls = audazThemeToCssClass(theme)
    applyRootThemeClass(cls)
    setThemeOverride(theme)
    setSettings((prev) => ({ ...prev, theme }))
  }, [])

  const updateSettings = useCallback(
    async (
      /** @type {Partial<AudazUserSettings> & { notifications?: Partial<AudazUserSettings['notifications']> }} */ patch,
    ) => {
      if (!uid || !isFirebaseConfigured() || !db) {
        const e = new Error('Oturum gerekli')
        e.code = 'unauthenticated'
        throw e
      }

      const previous = settingsRef.current
      const merged = mergeAudazSettings(previous, patch)

      setSettings(merged)
      if (patch.notifications?.sound !== undefined) {
        setNotificationSoundEnabled(merged.notifications.sound)
      }
      if (patch.theme) {
        applyRootThemeClass(audazThemeToCssClass(merged.theme))
        setThemeOverride(merged.theme)
      }
      setSaving(true)
      setError(null)

      try {
        const payload = prepareAudazPatchPayload({
          settings: merged,
          updatedAt: serverTimestamp(),
        })

        await setDoc(doc(db, 'users', uid), payload, { merge: true })
        return merged
      } catch (err) {
        setSettings(previous)
        if (patch.theme) {
          applyRootThemeClass(audazThemeToCssClass(previous.theme))
          setThemeOverride(null)
        }
        setError(err)
        emitFirebaseError(err)
        throw err
      } finally {
        setSaving(false)
      }
    },
    [uid],
  )

  /**
   * Tema değiştir — DOM anında güncellenir; isteğe bağlı Firestore kalıcılığı.
   * @param {AudazTheme} theme
   * @param {{ persist?: boolean }} [options]
   */
  const setTheme = useCallback(
    async (theme, options = {}) => {
      const { persist = true } = options
      applyThemeImmediate(theme)
      if (!persist || !uid) return
      await updateSettings({ theme })
    },
    [applyThemeImmediate, updateSettings, uid],
  )

  const value = useMemo(
    () => ({
      theme: activeTheme,
      themeClass,
      settings,
      loading,
      saving,
      error,
      ready: Boolean(uid && isFirebaseConfigured()),
      updateSettings,
      applyThemeImmediate,
      setTheme,
    }),
    [
      activeTheme,
      themeClass,
      settings,
      loading,
      saving,
      error,
      uid,
      updateSettings,
      applyThemeImmediate,
      setTheme,
    ],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return ctx
}

/** @deprecated useTheme — geriye dönük alias */
export function useAudazSettingsFromTheme() {
  const { settings, loading, saving, error, ready, updateSettings } = useTheme()
  return { settings, loading, saving, error, ready, updateSettings }
}
