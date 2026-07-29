import {
  SOUND_THRESHOLD_MAX,
  SOUND_THRESHOLD_MIN,
} from './timerCalibrationSettings'

/** @typedef {'dryFire' | 'airsoft' | 'liveFire'} MicTestModeId */
/** @typedef {'line' | 'bars' | 'mirror' | 'dots' | 'heatmap' | 'pulse'} MicWaveStyle */

/**
 * @typedef {Object} MicThresholdTestSettings
 * @property {MicTestModeId} activeMode
 * @property {number} dryFire
 * @property {number} airsoft
 * @property {number} liveFire
 * @property {MicWaveStyle} waveStyle
 */

/** Ayrı kalıcı depo — ana kalibrasyon `soundThreshold` ile karışmaz */
export const MIC_THRESHOLD_TEST_STORAGE_KEY = 'audaz.mic-threshold-test.v1'

/** @type {MicThresholdTestSettings} */
export const DEFAULT_MIC_THRESHOLD_TEST = {
  activeMode: 'liveFire',
  dryFire: 18,
  airsoft: 35,
  liveFire: 72,
  waveStyle: 'line',
}

/** @type {readonly MicTestModeId[]} */
export const MIC_TEST_MODE_IDS = Object.freeze(['dryFire', 'airsoft', 'liveFire'])

/** @type {readonly MicWaveStyle[]} */
export const MIC_WAVE_STYLE_IDS = Object.freeze([
  'line',
  'bars',
  'mirror',
  'dots',
  'heatmap',
  'pulse',
])

/**
 * @param {unknown} raw
 * @returns {MicWaveStyle}
 */
export function normalizeMicWaveStyle(raw) {
  return MIC_WAVE_STYLE_IDS.includes(/** @type {MicWaveStyle} */ (raw))
    ? /** @type {MicWaveStyle} */ (raw)
    : DEFAULT_MIC_THRESHOLD_TEST.waveStyle
}

/**
 * @param {unknown} raw
 * @returns {number}
 */
export function clampMicTestThreshold(raw) {
  const n = Math.round(Number(raw))
  if (!Number.isFinite(n)) return SOUND_THRESHOLD_MIN
  return Math.min(SOUND_THRESHOLD_MAX, Math.max(SOUND_THRESHOLD_MIN, n))
}

/**
 * @param {unknown} raw
 * @returns {MicThresholdTestSettings}
 */
export function normalizeMicThresholdTest(raw) {
  const src = raw && typeof raw === 'object' ? /** @type {Record<string, unknown>} */ (raw) : {}
  const mode = src.activeMode
  return {
    activeMode:
      mode === 'dryFire' || mode === 'airsoft' || mode === 'liveFire'
        ? mode
        : DEFAULT_MIC_THRESHOLD_TEST.activeMode,
    dryFire: clampMicTestThreshold(src.dryFire ?? DEFAULT_MIC_THRESHOLD_TEST.dryFire),
    airsoft: clampMicTestThreshold(src.airsoft ?? DEFAULT_MIC_THRESHOLD_TEST.airsoft),
    liveFire: clampMicTestThreshold(src.liveFire ?? DEFAULT_MIC_THRESHOLD_TEST.liveFire),
    waveStyle: normalizeMicWaveStyle(src.waveStyle),
  }
}

/**
 * @returns {MicThresholdTestSettings}
 */
export function loadMicThresholdTest() {
  try {
    const raw = localStorage.getItem(MIC_THRESHOLD_TEST_STORAGE_KEY)
    if (!raw) return { ...DEFAULT_MIC_THRESHOLD_TEST }
    return normalizeMicThresholdTest(JSON.parse(raw))
  } catch {
    return { ...DEFAULT_MIC_THRESHOLD_TEST }
  }
}

/**
 * @param {Partial<MicThresholdTestSettings>} patch
 * @returns {MicThresholdTestSettings}
 */
export function saveMicThresholdTest(patch) {
  const next = normalizeMicThresholdTest({ ...loadMicThresholdTest(), ...patch })
  try {
    localStorage.setItem(MIC_THRESHOLD_TEST_STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
  return next
}

/**
 * @param {MicThresholdTestSettings} settings
 * @returns {number}
 */
export function getActiveMicTestThreshold(settings) {
  const s = normalizeMicThresholdTest(settings)
  if (s.activeMode === 'dryFire') return s.dryFire
  if (s.activeMode === 'airsoft') return s.airsoft
  return s.liveFire
}
