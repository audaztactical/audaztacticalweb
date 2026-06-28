import { useCallback, useEffect, useRef, useState } from 'react'
import { Bell, Loader2, Moon, Palette, Settings2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { AUDAZ_THEME_OPTIONS, mergeAudazSettings } from '../lib/audazSettings'
import { clearUserFcmToken, getPushRegistrationErrorMessage, registerUserPushNotifications, syncPushTopicSubscriptions, syncUserFcmTokenIfPermitted } from '../lib/fcm'
import { emitFirebaseError } from '../lib/firebaseErrorBus'

/** @typedef {import('../lib/audazSettings').AudazUserSettings} AudazUserSettings */

const DEBOUNCE_MS = 500
const SAVED_HIDE_MS = 2000

/** @typedef {'idle' | 'saving' | 'saved' | 'error'} SaveStatus */

const inputClass =
  'w-full rounded border border-accent/25 bg-app-bg px-3 py-2.5 font-mono-technical text-sm text-app-text outline-none transition focus:border-accent/55 focus:ring-1 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-50'

const labelClass =
  'mb-1.5 block font-mono-technical text-[10px] font-bold uppercase tracking-[0.24em] text-accent/80'

/** @type {{ key: keyof AudazUserSettings['notifications']; label: string; hint: string }[]} */
const NOTIFICATION_TOGGLES = [
  { key: 'muhabere', label: 'Muhabere', hint: 'DM ve kanal mesaj bildirimleri' },
  { key: 'training', label: 'Antrenman', hint: 'Atış günlüğü ve eğitim hatırlatmaları' },
  { key: 'intel', label: 'İstihbarat', hint: 'Taktik akış ve erken uyarı' },
  { key: 'academy', label: 'Akademi', hint: 'Doktrin ve eğitim içerikleri' },
]

/**
 * @param {(...args: never[]) => void} fn
 * @param {number} waitMs
 */
function debounce(fn, waitMs) {
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let timer
  /** @param {Parameters<typeof fn>} args */
  const debounced = (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), waitMs)
  }
  debounced.cancel = () => clearTimeout(timer)
  return debounced
}

/**
 * @param {{
 *   enabled: boolean
 *   label: string
 *   hint: string
 *   disabled?: boolean
 *   onChange: (next: boolean) => void
 * }} props
 */
function HudToggle({ enabled, label, hint, disabled = false, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded border border-accent/12 bg-app-bg px-3 py-3">
      <div className="min-w-0">
        <p className="font-mono-technical text-xs font-bold uppercase tracking-wider text-app-text">
          {label}
        </p>
        <p className="mt-0.5 font-mono-technical text-[9px] uppercase tracking-wide text-app-text/55">
          {hint}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!enabled)}
        className={[
          'relative h-7 w-12 shrink-0 rounded-full border transition',
          enabled
            ? 'border-accent/60 bg-accent/20'
            : 'border-app-text/20 bg-app-bg',
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        ].join(' ')}
      >
        <span
          className={[
            'absolute top-0.5 size-5 rounded-full transition',
            enabled
              ? 'left-[calc(100%-1.375rem)] bg-accent shadow-[0_0_8px_color-mix(in_srgb,var(--accent-color)_55%,transparent)]'
              : 'left-0.5 bg-app-text/35',
          ].join(' ')}
          aria-hidden
        />
      </button>
    </div>
  )
}

/**
 * @param {{ status: SaveStatus }} props
 */
function AutoSaveStatusIndicator({ status }) {
  if (status === 'idle') return null

  const config = {
    saving: {
      text: 'KAYDEDİLİYOR…',
      className:
        'border-amber-500/45 bg-amber-950/35 text-amber-300 shadow-[0_0_20px_-6px_rgba(251,191,36,0.45)]',
      pulse: true,
    },
    saved: {
      text: 'KAYDEDİLDİ',
      className:
        'border-accent/40 bg-accent/10 text-accent shadow-[0_0_20px_-6px_color-mix(in_srgb,var(--accent-color)_35%,transparent)]',
      pulse: false,
    },
    error: {
      text: 'KAYIT HATASI',
      className:
        'border-red-500/50 bg-red-950/40 text-red-400 shadow-[0_0_20px_-6px_rgba(239,68,68,0.4)]',
      pulse: false,
    },
  }[status]

  if (!config) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className={[
        'flex items-center justify-center gap-2 rounded border px-4 py-2.5 font-mono-technical text-[10px] font-bold uppercase tracking-[0.28em] transition-all',
        config.className,
        config.pulse ? 'animate-pulse' : '',
      ].join(' ')}
    >
      {status === 'saving' ? (
        <Loader2 className="size-3.5 shrink-0 animate-spin text-amber-400" aria-hidden />
      ) : (
        <span
          className={[
            'size-1.5 shrink-0 rounded-full',
            status === 'saved' ? 'bg-accent shadow-[0_0_6px_var(--accent-color)]' : 'bg-red-500',
          ].join(' ')}
          aria-hidden
        />
      )}
      {config.text}
    </div>
  )
}

/**
 * @param {{ className?: string }} [props]
 */
export default function SettingsPanel({ className = '' }) {
  const { user } = useAuth()
  const { settings, loading, saving, ready, updateSettings, setTheme } = useTheme()
  const [draft, setDraft] = useState(settings)
  const [saveStatus, setSaveStatus] = useState(/** @type {SaveStatus} */ ('idle'))
  const [pushRegistering, setPushRegistering] = useState(false)
  const [pushError, setPushError] = useState('')

  const draftRef = useRef(settings)
  const hideSavedTimerRef = useRef(/** @type {ReturnType<typeof setTimeout> | undefined} */ (undefined))
  const persistRef = useRef(/** @type {(next: AudazUserSettings) => Promise<void>} */ (async () => {}))
  const settingsSyncBlockedRef = useRef(false)

  draftRef.current = draft

  useEffect(() => {
    if (settingsSyncBlockedRef.current) return
    setDraft(settings)
    draftRef.current = settings
  }, [settings])

  const clearSavedHideTimer = useCallback(() => {
    if (hideSavedTimerRef.current) {
      clearTimeout(hideSavedTimerRef.current)
      hideSavedTimerRef.current = undefined
    }
  }, [])

  const scheduleSavedHide = useCallback(() => {
    clearSavedHideTimer()
    hideSavedTimerRef.current = setTimeout(() => {
      setSaveStatus('idle')
    }, SAVED_HIDE_MS)
  }, [clearSavedHideTimer])

  persistRef.current = async (/** @type {AudazUserSettings} */ next) => {
    clearSavedHideTimer()
    setSaveStatus('saving')
    try {
      await updateSettings(next)
      setSaveStatus('saved')
      scheduleSavedHide()
    } catch (err) {
      setSaveStatus('error')
      emitFirebaseError(err)
    }
  }

  const debouncedPersistRef = useRef(
    debounce((/** @type {AudazUserSettings} */ next) => {
      void persistRef.current(next)
    }, DEBOUNCE_MS),
  )

  useEffect(() => {
    const debounced = debouncedPersistRef.current
    return () => {
      debounced.cancel()
      clearSavedHideTimer()
    }
  }, [clearSavedHideTimer])

  const handleChange = useCallback(
    (/** @type {AudazUserSettings} */ newData) => {
      setDraft(newData)
      draftRef.current = newData

      if (saveStatus === 'error') {
        setSaveStatus('idle')
      }

      debouncedPersistRef.current(newData)
    },
    [saveStatus],
  )

  const handlePatch = useCallback(
    (/** @type {Partial<AudazUserSettings> & { notifications?: Partial<AudazUserSettings['notifications']> }} */ patch) => {
      const next = mergeAudazSettings(draftRef.current, patch)
      handleChange(next)
    },
    [handleChange],
  )

  const handlePushToggle = useCallback(
    async (next) => {
      const uid = user?.uid
      if (!uid || pushRegistering) return

      setPushError('')

      if (next) {
        settingsSyncBlockedRef.current = true
        setPushRegistering(true)
        try {
          const result = await registerUserPushNotifications(uid)
          if (result.ok) {
            handlePatch({ notifications: { push: true } })
            void syncUserFcmTokenIfPermitted(uid).then((tokenResult) => {
              if (tokenResult.ok && tokenResult.token) {
                void syncPushTopicSubscriptions(tokenResult.token, {
                  intel: draftRef.current.notifications.intel !== false,
                })
              }
            })
          } else {
            setPushError(getPushRegistrationErrorMessage(result.reason))
          }
        } catch {
          setPushError(getPushRegistrationErrorMessage('error'))
        } finally {
          settingsSyncBlockedRef.current = false
          setPushRegistering(false)
        }
        return
      }

      handlePatch({ notifications: { push: false } })
      try {
        await clearUserFcmToken(uid)
      } catch {
        /* sessiz */
      }
    },
    [handlePatch, pushRegistering, user?.uid],
  )

  const handleThemeChange = useCallback(
    async (/** @type {AudazUserSettings['theme']} */ theme) => {
      const next = mergeAudazSettings(draftRef.current, { theme })
      setDraft(next)
      draftRef.current = next

      if (saveStatus === 'error') {
        setSaveStatus('idle')
      }

      clearSavedHideTimer()
      setSaveStatus('saving')
      try {
        await setTheme(theme, { persist: true })
        setSaveStatus('saved')
        scheduleSavedHide()
      } catch (err) {
        setSaveStatus('error')
        emitFirebaseError(err)
      }
    },
    [clearSavedHideTimer, saveStatus, scheduleSavedHide, setTheme],
  )

  const controlsDisabled = saving || saveStatus === 'saving' || pushRegistering

  if (loading) {
    return (
      <section
        className={[
          'flex min-h-[280px] items-center justify-center rounded-xl border border-accent/20 bg-app-bg',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <Loader2 className="size-6 animate-spin text-accent/70" aria-hidden />
        <span className="sr-only">Ayarlar yükleniyor</span>
      </section>
    )
  }

  if (!ready) {
    return (
      <section
        className={[
          'rounded-xl border border-accent/20 bg-app-bg px-5 py-8 text-center',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <p className="font-mono-technical text-[10px] uppercase tracking-wider text-app-text/55">
          Ayarları yönetmek için oturum açın.
        </p>
      </section>
    )
  }

  return (
    <section
      aria-label="Operatör ayarları"
      className={[
        'relative overflow-hidden rounded-xl border border-accent/30 bg-app-bg shadow-[0_0_40px_-12px_color-mix(in_srgb,var(--accent-color)_12%,transparent)]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className="pointer-events-none absolute left-2 top-2 h-3 w-3 border-l border-t border-accent/45" aria-hidden />
      <span className="pointer-events-none absolute right-2 top-2 h-3 w-3 border-r border-t border-accent/45" aria-hidden />
      <span className="pointer-events-none absolute bottom-2 left-2 h-3 w-3 border-b border-l border-accent/45" aria-hidden />
      <span className="pointer-events-none absolute bottom-2 right-2 h-3 w-3 border-b border-r border-accent/45" aria-hidden />

      <header className="border-b border-accent/15 bg-app-bg px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <Settings2 className="mt-0.5 size-5 shrink-0 text-accent" strokeWidth={1.75} aria-hidden />
            <div>
              <h2 className="font-mono-technical text-xs font-bold uppercase tracking-[0.28em] text-accent">
                OPERATÖR TERCİHLERİ
              </h2>
              <p className="mt-1 font-mono-technical text-[9px] uppercase tracking-wider text-app-text/55">
                AUTO-SAVE · {DEBOUNCE_MS}MS DEBOUNCE · FIRESTORE
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="space-y-6 p-5">
        <div>
          <label htmlFor="audaz-theme" className={labelClass}>
            <span className="inline-flex items-center gap-1.5">
              <Palette className="size-3.5" aria-hidden />
              Tema
            </span>
          </label>
          <select
            id="audaz-theme"
            value={draft.theme}
            disabled={controlsDisabled}
            onChange={(e) => {
              void handleThemeChange(/** @type {AudazUserSettings['theme']} */ (e.target.value))
            }}
            className={`${inputClass} cursor-pointer`}
          >
            {AUDAZ_THEME_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <p className="mt-1.5 font-mono-technical text-[9px] uppercase tracking-wide text-app-text/45">
            {draft.theme === 'obsidian' ? (
              <span className="inline-flex items-center gap-1 text-accent/70">
                <Moon className="size-3" aria-hidden /> Obsidian HUD aktif profili
              </span>
            ) : (
              'Arayüz renk profili — cihazlar arası senkron'
            )}
          </p>
        </div>

        <div className="space-y-3">
          <p className={labelClass}>
            <span className="inline-flex items-center gap-1.5">
              <Bell className="size-3.5" aria-hidden />
              Bildirimler
            </span>
          </p>
          {NOTIFICATION_TOGGLES.map((item) => (
            <HudToggle
              key={item.key}
              label={item.label}
              hint={item.hint}
              enabled={draft.notifications[item.key]}
              disabled={controlsDisabled}
              onChange={(next) => {
                handlePatch({ notifications: { [item.key]: next } })
              }}
            />
          ))}
          <HudToggle
            label="Push bildirimleri"
            hint={
              pushRegistering
                ? 'Tarayıcı izni ve FCM token alınıyor…'
                : 'Site kapalıyken tarayıcı bildirimi (izin gerekir)'
            }
            enabled={draft.notifications.push}
            disabled={controlsDisabled}
            onChange={(next) => {
              void handlePushToggle(next)
            }}
          />
          {pushRegistering ? (
            <p className="flex items-center gap-2 font-mono-technical text-[9px] uppercase tracking-wide text-amber-400/80">
              <Loader2 className="size-3 animate-spin" aria-hidden />
              Push etkinleştiriliyor…
            </p>
          ) : null}
          {pushError ? (
            <p
              role="alert"
              className="rounded border border-red-500/35 bg-red-950/25 px-3 py-2 font-mono-technical text-[10px] leading-relaxed text-red-300/95"
            >
              {pushError}
            </p>
          ) : null}
        </div>

        <AutoSaveStatusIndicator status={saveStatus} />

        {saveStatus === 'error' ? (
          <p className="font-mono-technical text-[9px] uppercase leading-relaxed text-red-400/90">
            Senkronizasyon başarısız — değişikliği tekrar deneyin veya ağ bağlantınızı kontrol edin.
          </p>
        ) : null}
      </div>
    </section>
  )
}
