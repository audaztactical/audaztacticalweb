/** @typedef {'±2G' | '±4G' | '±8G' | '±16G'} MpuGForceRange */
/** @typedef {'landscape' | 'portrait'} ScreenOrientationMode */

/**
 * @typedef {Object} TimerCalibrationSettings
 * @property {number} soundThreshold
 * @property {number} neopixelBrightness
 * @property {string} neopixelStatusColor
 * @property {MpuGForceRange} mpuGForceRange
 * @property {number} mpuOffsetX
 * @property {number} mpuOffsetY
 * @property {number} mpuOffsetYaw  yaw sıfır ofseti (derece)
 * @property {number | null} mpuCalibratedAt
 * @property {ScreenOrientationMode} screenOrientation
 * @property {number} screenDiagonalInches
 * @property {number} eyeScreenDistanceM
 */

export const TIMER_CALIBRATION_STORAGE_KEY = 'audaz.tactical-timer.calibration.v1'

/** Aynı sekmede hook örneklerini senkron tutmak için */
export const TIMER_CALIBRATION_CHANGED_EVENT = 'audaz:timer-calibration-changed'

/** Kalıcı akustik eşik (slider) — ayrı localStorage anahtarı */
export const ACOUSTIC_THRESHOLD_STORAGE_KEY = 'audaz_acoustic_threshold'

function emitTimerCalibrationChanged() {
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(TIMER_CALIBRATION_CHANGED_EVENT))
    }
  } catch {
    /* ignore */
  }
}

/** @type {TimerCalibrationSettings} */
export const DEFAULT_TIMER_CALIBRATION = {
  soundThreshold: 42,
  neopixelBrightness: 65,
  neopixelStatusColor: '#00ff41',
  mpuGForceRange: '±8G',
  mpuOffsetX: 0,
  mpuOffsetY: 0,
  mpuOffsetYaw: 0,
  mpuCalibratedAt: null,
  screenOrientation: 'portrait',
  screenDiagonalInches: 6.5,
  eyeScreenDistanceM: 1,
}

/** @type {MpuGForceRange[]} */
export const MPU_G_FORCE_OPTIONS = ['±2G', '±4G', '±8G', '±16G']

/** @type {ScreenOrientationMode[]} */
export const SCREEN_ORIENTATION_OPTIONS = ['portrait', 'landscape']

/** @type {readonly number[]} */
export const EYE_SCREEN_DISTANCE_PRESETS = Object.freeze([0.5, 1, 2, 3])

export const SCREEN_DIAGONAL_MIN_IN = 4
export const SCREEN_DIAGONAL_MAX_IN = 40
export const EYE_SCREEN_DISTANCE_MIN_M = 0.3
export const EYE_SCREEN_DISTANCE_MAX_M = 5

/** @type {{ id: string, hex: string, labelKey: string }[]} */
export const NEOPIXEL_STATUS_COLORS = [
  { id: 'ready', hex: '#00ff41', labelKey: 'calibration.neopixel.colors.ready' },
  { id: 'armed', hex: '#ffd700', labelKey: 'calibration.neopixel.colors.armed' },
  { id: 'alert', hex: '#ff4d4d', labelKey: 'calibration.neopixel.colors.alert' },
  { id: 'idle', hex: '#8a9bb0', labelKey: 'calibration.neopixel.colors.idle' },
]

export const SOUND_THRESHOLD_MIN = 0
export const SOUND_THRESHOLD_MAX = 100
export const NEOPIXEL_BRIGHTNESS_MIN = 0
export const NEOPIXEL_BRIGHTNESS_MAX = 100

/**
 * @param {unknown} raw
 * @returns {TimerCalibrationSettings}
 */
export function normalizeTimerCalibration(raw) {
  const src = raw && typeof raw === 'object' ? /** @type {Record<string, unknown>} */ (raw) : {}
  const sound = Number(src.soundThreshold)
  const bright = Number(src.neopixelBrightness)
  const color = typeof src.neopixelStatusColor === 'string' ? src.neopixelStatusColor.trim() : ''
  const range = /** @type {MpuGForceRange | string} */ (src.mpuGForceRange)
  const ox = Number(src.mpuOffsetX)
  const oy = Number(src.mpuOffsetY)
  const oYaw = Number(src.mpuOffsetYaw)
  const calAt = Number(src.mpuCalibratedAt)
  const orientation =
    src.screenOrientation === 'landscape' || src.screenOrientation === 'portrait'
      ? src.screenOrientation
      : DEFAULT_TIMER_CALIBRATION.screenOrientation
  const diag = Number(src.screenDiagonalInches)
  const eye = Number(src.eyeScreenDistanceM)

  return {
    soundThreshold: Number.isFinite(sound)
      ? Math.min(SOUND_THRESHOLD_MAX, Math.max(SOUND_THRESHOLD_MIN, Math.round(sound)))
      : DEFAULT_TIMER_CALIBRATION.soundThreshold,
    neopixelBrightness: Number.isFinite(bright)
      ? Math.min(NEOPIXEL_BRIGHTNESS_MAX, Math.max(NEOPIXEL_BRIGHTNESS_MIN, Math.round(bright)))
      : DEFAULT_TIMER_CALIBRATION.neopixelBrightness,
    neopixelStatusColor:
      NEOPIXEL_STATUS_COLORS.some((c) => c.hex === color)
        ? color
        : DEFAULT_TIMER_CALIBRATION.neopixelStatusColor,
    mpuGForceRange: MPU_G_FORCE_OPTIONS.includes(/** @type {MpuGForceRange} */ (range))
      ? /** @type {MpuGForceRange} */ (range)
      : DEFAULT_TIMER_CALIBRATION.mpuGForceRange,
    mpuOffsetX: Number.isFinite(ox) ? Math.min(16, Math.max(-16, ox)) : 0,
    mpuOffsetY: Number.isFinite(oy) ? Math.min(16, Math.max(-16, oy)) : 0,
    mpuOffsetYaw: Number.isFinite(oYaw) ? Math.min(180, Math.max(-180, oYaw)) : 0,
    mpuCalibratedAt: Number.isFinite(calAt) && calAt > 0 ? calAt : null,
    screenOrientation: orientation,
    screenDiagonalInches: Number.isFinite(diag)
      ? Math.min(SCREEN_DIAGONAL_MAX_IN, Math.max(SCREEN_DIAGONAL_MIN_IN, Math.round(diag * 10) / 10))
      : DEFAULT_TIMER_CALIBRATION.screenDiagonalInches,
    eyeScreenDistanceM: Number.isFinite(eye)
      ? Math.min(EYE_SCREEN_DISTANCE_MAX_M, Math.max(EYE_SCREEN_DISTANCE_MIN_M, Math.round(eye * 100) / 100))
      : DEFAULT_TIMER_CALIBRATION.eyeScreenDistanceM,
  }
}

/**
 * @param {unknown} raw
 * @returns {number}
 */
export function clampSoundThresholdValue(raw) {
  const n = Math.round(Number(raw))
  if (!Number.isFinite(n)) return DEFAULT_TIMER_CALIBRATION.soundThreshold
  return Math.min(SOUND_THRESHOLD_MAX, Math.max(SOUND_THRESHOLD_MIN, n))
}

/**
 * Kayıtlı akustik eşik — `audaz_acoustic_threshold`.
 * @returns {number | null}
 */
export function loadAcousticThreshold() {
  try {
    if (typeof localStorage === 'undefined') return null
    const raw = localStorage.getItem(ACOUSTIC_THRESHOLD_STORAGE_KEY)
    if (raw == null || raw === '') return null
    return clampSoundThresholdValue(raw)
  } catch {
    return null
  }
}

/**
 * @param {number} value
 * @returns {number}
 */
export function saveAcousticThreshold(value) {
  const next = clampSoundThresholdValue(value)
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(ACOUSTIC_THRESHOLD_STORAGE_KEY, String(next))
    }
  } catch {
    /* quota / private mode */
  }
  return next
}

/**
 * @returns {TimerCalibrationSettings}
 */
export function loadTimerCalibration() {
  try {
    if (typeof localStorage === 'undefined') return { ...DEFAULT_TIMER_CALIBRATION }
    const raw = localStorage.getItem(TIMER_CALIBRATION_STORAGE_KEY)
    const base = raw
      ? normalizeTimerCalibration(JSON.parse(raw))
      : { ...DEFAULT_TIMER_CALIBRATION }
    const acoustic = loadAcousticThreshold()
    if (acoustic != null) {
      return normalizeTimerCalibration({ ...base, soundThreshold: acoustic })
    }
    return base
  } catch {
    return { ...DEFAULT_TIMER_CALIBRATION }
  }
}

/**
 * @param {TimerCalibrationSettings} settings
 */
export function saveTimerCalibration(settings) {
  const next = normalizeTimerCalibration(settings)
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(TIMER_CALIBRATION_STORAGE_KEY, JSON.stringify(next))
      localStorage.setItem(ACOUSTIC_THRESHOLD_STORAGE_KEY, String(next.soundThreshold))
    }
  } catch {
    /* quota / private mode */
  }
  emitTimerCalibrationChanged()
  return next
}

export function isWebSerialSupported() {
  return typeof navigator !== 'undefined' && 'serial' in navigator
}
