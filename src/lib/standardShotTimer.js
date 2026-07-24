/**
 * Standart Atış (shot timer) — saf yardımcılar.
 */

/** @typedef {'random' | 'fixed'} ArmDelayMode */

export const ARM_DELAY_RANDOM_MIN_MS = 2000
export const ARM_DELAY_RANDOM_MAX_MS = 4000
export const ARM_DELAY_FIXED_MIN_SEC = 0.5
export const ARM_DELAY_FIXED_MAX_SEC = 15
export const ARM_DELAY_FIXED_DEFAULT_SEC = 3
export const ARM_DELAY_FIXED_STEP_SEC = 0.1

/**
 * @param {number} sec
 * @returns {number}
 */
export function clampFixedDelaySec(sec) {
  const n = Number(sec)
  if (!Number.isFinite(n)) return ARM_DELAY_FIXED_DEFAULT_SEC
  return Math.min(
    ARM_DELAY_FIXED_MAX_SEC,
    Math.max(ARM_DELAY_FIXED_MIN_SEC, Math.round(n / ARM_DELAY_FIXED_STEP_SEC) * ARM_DELAY_FIXED_STEP_SEC),
  )
}

/**
 * @returns {number} ms — 2000…4000
 */
export function randomArmDelayMs() {
  const span = ARM_DELAY_RANDOM_MAX_MS - ARM_DELAY_RANDOM_MIN_MS
  return ARM_DELAY_RANDOM_MIN_MS + Math.floor(Math.random() * (span + 1))
}

/**
 * Başlat gecikmesi — moda göre rastgele aralık veya sabit saniye.
 * @param {ArmDelayMode} mode
 * @param {number} [fixedSeconds]
 * @returns {number} ms
 */
export function resolveArmDelayMs(mode, fixedSeconds = ARM_DELAY_FIXED_DEFAULT_SEC) {
  if (mode === 'fixed') {
    return Math.round(clampFixedDelaySec(fixedSeconds) * 1000)
  }
  return randomArmDelayMs()
}

/**
 * @param {number} ms
 * @returns {string} 0.000 sn
 */
export function formatShotSeconds(ms) {
  const n = Math.max(0, Number(ms) || 0)
  return (n / 1000).toFixed(3)
}

/**
 * @param {number} ms
 * @returns {string} 000 ms
 */
export function formatShotMillis(ms) {
  const n = Math.max(0, Math.round(Number(ms) || 0))
  return `${n}`
}

/**
 * @param {number[]} shotTimesMs — go sinyalinden itibaren mutlak süreler (sıralı)
 */
export function buildSplitRows(shotTimesMs) {
  /** @type {{ index: number, absoluteMs: number, splitMs: number }[]} */
  const rows = []
  for (let i = 1; i < shotTimesMs.length; i++) {
    rows.push({
      index: i,
      absoluteMs: shotTimesMs[i],
      splitMs: shotTimesMs[i] - shotTimesMs[i - 1],
    })
  }
  return rows
}

/**
 * @param {number[]} shotTimesMs
 */
export function computeShotSummary(shotTimesMs) {
  if (!shotTimesMs.length) {
    return {
      reactionMs: null,
      totalMs: null,
      avgSplitMs: null,
      bestSplitMs: null,
      splitCount: 0,
    }
  }
  const reactionMs = shotTimesMs[0]
  const totalMs = shotTimesMs[shotTimesMs.length - 1]
  const splits = buildSplitRows(shotTimesMs).map((r) => r.splitMs)
  const avgSplitMs =
    splits.length > 0 ? splits.reduce((a, b) => a + b, 0) / splits.length : null
  const bestSplitMs = splits.length > 0 ? Math.min(...splits) : null
  return {
    reactionMs,
    totalMs,
    avgSplitMs,
    bestSplitMs,
    splitCount: splits.length,
  }
}
