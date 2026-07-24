import { useCallback, useEffect, useRef, useState } from 'react'
import {
  DEFAULT_TIMER_CALIBRATION,
  loadTimerCalibration,
  normalizeTimerCalibration,
  saveTimerCalibration,
  TIMER_CALIBRATION_CHANGED_EVENT,
  TIMER_CALIBRATION_STORAGE_KEY,
} from '../lib/timerCalibrationSettings'

/**
 * Timer kalibrasyon ayarları — local state + localStorage (MPU offset dahil kalıcı).
 * Aynı sekmedeki tüm hook örnekleri CustomEvent ile senkron kalır.
 */
export function useTimerCalibration() {
  const [settings, setSettings] = useState(() => loadTimerCalibration())
  const [hydrated, setHydrated] = useState(false)
  const settingsRef = useRef(settings)
  settingsRef.current = settings

  useEffect(() => {
    setSettings(loadTimerCalibration())
    setHydrated(true)
  }, [])

  // localStorage + aynı sekme senkronu (Ayarlar ↔ Kuru Tetik)
  useEffect(() => {
    const reload = () => setSettings(loadTimerCalibration())

    const onStorage = (/** @type {StorageEvent} */ e) => {
      if (e.key === TIMER_CALIBRATION_STORAGE_KEY || e.key === null) reload()
    }
    const onLocal = () => reload()

    window.addEventListener('storage', onStorage)
    window.addEventListener(TIMER_CALIBRATION_CHANGED_EVENT, onLocal)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(TIMER_CALIBRATION_CHANGED_EVENT, onLocal)
    }
  }, [])

  /** Yalnızca bellek — Kaydet ile kalıcı olur */
  const updateSettings = useCallback(
    (/** @type {Partial<import('../lib/timerCalibrationSettings').TimerCalibrationSettings>} */ patch) => {
      setSettings((prev) => normalizeTimerCalibration({ ...prev, ...patch }))
    },
    [],
  )

  /**
   * Anında localStorage'a yazar (MPU Sıfırla / Kalibre Et vb.).
   * @param {Partial<import('../lib/timerCalibrationSettings').TimerCalibrationSettings>} patch
   */
  const persistPatch = useCallback((patch) => {
    const saved = saveTimerCalibration({ ...settingsRef.current, ...patch })
    setSettings(saved)
    return saved
  }, [])

  const persistAndSync = useCallback(() => {
    const saved = saveTimerCalibration(settingsRef.current)
    setSettings(saved)
    return saved
  }, [])

  const resetDefaults = useCallback(() => {
    const next = saveTimerCalibration({ ...DEFAULT_TIMER_CALIBRATION })
    setSettings(next)
    return next
  }, [])

  return {
    settings,
    hydrated,
    updateSettings,
    persistPatch,
    persistAndSync,
    resetDefaults,
  }
}
