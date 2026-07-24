/**
 * Kuru Tetik zamanlayıcı sabitleri — Standart Atış gecikme yardımcılarını paylaşır.
 */

export {
  ARM_DELAY_FIXED_DEFAULT_SEC,
  ARM_DELAY_FIXED_MAX_SEC,
  ARM_DELAY_FIXED_MIN_SEC,
  ARM_DELAY_FIXED_STEP_SEC,
  ARM_DELAY_RANDOM_MAX_MS,
  ARM_DELAY_RANDOM_MIN_MS,
  buildSplitRows,
  clampFixedDelaySec,
  computeShotSummary,
  formatShotMillis,
  formatShotSeconds,
  randomArmDelayMs,
  resolveArmDelayMs,
} from './standardShotTimer'

export const PAR_TIME_MIN_SEC = 0
export const PAR_TIME_MAX_SEC = 30
export const PAR_TIME_STEP_SEC = 0.1
export const PAR_TIME_DEFAULT_SEC = 0

/**
 * @param {number} sec
 * @returns {number} 0 = kapalı
 */
export function clampParTimeSec(sec) {
  const n = Number(sec)
  if (!Number.isFinite(n) || n <= 0) return 0
  const stepped = Math.round(n / PAR_TIME_STEP_SEC) * PAR_TIME_STEP_SEC
  return Math.min(PAR_TIME_MAX_SEC, Math.max(PAR_TIME_MIN_SEC, stepped))
}
