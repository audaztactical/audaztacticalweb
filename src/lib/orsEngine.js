import { rowMillis } from './dashboardHudData.js'
import { ORS_DEFAULT_WINDOW_MS, aggregateRangeLogMetrics } from './progressAnalytics.js'
import { getAtisLogTimestampMs } from './atisLogRegistry'
import { getCqbLogTimestampMs } from './cqbLogRegistry'
import { getFofLogTimestampMs } from './fofLogRegistry'
import { getTcccLogTimestampMs } from './tcccLogRegistry'
import { getVbssLogTimestampMs } from './vbssLogRegistry'
import { summarizeSpeedAndSafetyPenalties } from './progressHudAnalytics.js'

/** Mühimmat / ammo satırlarını toplam miktar için eşleştir. */
const AMMO_KEYWORDS = ['mühimmat', 'ammo']

/** Toplam envanter birim eşiği (altı ceza). */
export const ORS_AMMO_THRESHOLD_UNITS = 100

/** Son 7 günde minimum antrenman sayısı (altı ceza). */
export const ORS_TRAINING_MIN_LAST7 = 3

/** Lojistik vs muharebe ağırlığı (range_logs verisi varken). */
export const ORS_LOGISTICAL_WEIGHT = 0.3
export const ORS_COMBAT_WEIGHT = 0.7

/** Disiplin bazlı muharebe hazırlığı ağırlıkları */
export const ORS_DISCIPLINE_WEIGHTS = {
  ATIS: 0.3,
  CQB: 0.25,
  TCCC: 0.3,
  FOF: 0.1,
  VBSS: 0.05,
}

const MS_HOUR = 3600000
const MS_DAY = 86400000
const MS_7D = 7 * MS_DAY
const MS_24H = 24 * MS_HOUR

const PENALTY_LOW_AMMO = 30
const PENALTY_LOW_TRAINING = 40
const PENALTY_INCIDENT = 20

const PENALTY_BLUE_ON_BLUE = 35
const PENALTY_MUZZLE_FLAGGING = 22
const PENALTY_FATAL_FUNNEL = 28
const PENALTY_SLOW_BREACH = 18
export const PENALTY_TCCC_BELOW_40 = 14
const BONUS_MEDEVAC_TRANSMISSION = 5
const PENALTY_SLOW_DRILL = 8
const PENALTY_LOW_ACCURACY_SESSION = 6

const MAX_COMBAT_PENALTY = 85

/** @param {Record<string, unknown>} row */
function rangeLogTimestampMs(row) {
  return Math.max(
    getAtisLogTimestampMs(row),
    getCqbLogTimestampMs(row),
    getFofLogTimestampMs(row),
    getTcccLogTimestampMs(row),
    getVbssLogTimestampMs(row)
  )
}

/** @param {unknown} v */
function toNum(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

/** @param {number} score */
function clampScore(score) {
  return Math.max(0, Math.min(100, Math.round(score)))
}

/** @param {unknown} row */
export function isAmmoLikeRow(row) {
  const cat = String(row?.category ?? '').toLowerCase()
  const name = String(row?.name ?? '').toLowerCase()
  return AMMO_KEYWORDS.some((k) => cat.includes(k) || name.includes(k))
}

/**
 * @param {Record<string, unknown>[]} inventory
 */
export function totalAmmoUnits(inventory) {
  let sum = 0
  for (const row of inventory) {
    if (!isAmmoLikeRow(row)) continue
    sum += Math.max(0, Math.floor(toNum(row.quantity)))
  }
  return sum
}

/**
 * @param {Record<string, unknown>[]} trainings
 * @param {number} nowMs
 */
export function countTrainingsLast7Days(trainings, nowMs) {
  const cutoff = nowMs - MS_7D
  let n = 0
  for (const row of trainings) {
    const ms = rowMillis(row)
    if (ms >= cutoff && ms <= nowMs) n++
  }
  return n
}

/**
 * @param {Record<string, unknown>[]} health
 */
export function getLatestIncident(health) {
  const incidents = health.filter((row) => String(row?.kind ?? '') === 'incident')
  if (incidents.length === 0) return null
  let best = incidents[0]
  let bestMs = rowMillis(best)
  for (let i = 1; i < incidents.length; i++) {
    const row = incidents[i]
    const ms = rowMillis(row)
    if (ms >= bestMs) {
      bestMs = ms
      best = row
    }
  }
  return best
}

/**
 * @param {Record<string, unknown> | null} incident
 * @param {number} nowMs
 */
export function incidentPenaltyApplies(incident, nowMs) {
  if (!incident) return { applies: false, within24h: false, highSeverity: false, severity: 0 }
  const t = rowMillis(incident)
  if (t <= 0) return { applies: false, within24h: false, highSeverity: false, severity: 0 }
  const within24h = nowMs - t < MS_24H
  const severity = Math.max(0, Math.floor(toNum(incident.severity)))
  const highSeverity = severity >= 4
  return {
    applies: within24h || highSeverity,
    within24h,
    highSeverity,
    severity,
  }
}

/**
 * Lojistik / envanter / olay cezaları (100 taban).
 * @param {{
 *   inventory: Record<string, unknown>[],
 *   trainings: Record<string, unknown>[],
 *   health: Record<string, unknown>[],
 *   nowMs?: number,
 *   ammoThreshold?: number,
 *   trainingMin?: number,
 * }} p
 */
export function computeLogisticalORS(p) {
  const {
    inventory = [],
    trainings = [],
    health = [],
    nowMs = Date.now(),
    ammoThreshold = ORS_AMMO_THRESHOLD_UNITS,
    trainingMin = ORS_TRAINING_MIN_LAST7,
  } = p

  /** @type {{ code: string, delta: number, detail: string }[]} */
  const penalties = []

  let score = 100

  const ammoTotal = totalAmmoUnits(inventory)
  if (ammoTotal < ammoThreshold) {
    score -= PENALTY_LOW_AMMO
    penalties.push({
      code: 'HATA_KODU: MÜHİMMAT EŞİK ALTINDA',
      delta: -PENALTY_LOW_AMMO,
      detail: `Σ_MHM ${ammoTotal}/${ammoThreshold}`,
    })
  }

  const train7 = countTrainingsLast7Days(trainings, nowMs)
  if (train7 < trainingMin) {
    score -= PENALTY_LOW_TRAINING
    penalties.push({
      code: 'HATA_KODU: YAKINDA EĞİTİM KAYDI YOK',
      delta: -PENALTY_LOW_TRAINING,
      detail: `7G_SAY ${train7}/${trainingMin}`,
    })
  }

  const latest = getLatestIncident(health)
  const inc = incidentPenaltyApplies(latest, nowMs)
  if (latest && inc.applies) {
    score -= PENALTY_INCIDENT
    const bits = [
      inc.within24h ? 'T-24H' : '',
      inc.highSeverity ? `SEV_${inc.severity}` : '',
    ]
      .filter(Boolean)
      .join(' · ')
    penalties.push({
      code: 'HATA_KODU: OLAY_ALANI HAZIRLIK',
      delta: -PENALTY_INCIDENT,
      detail: bits || 'OLAY_IX',
    })
  }

  return {
    score: clampScore(score),
    penalties,
    meta: {
      ammoTotal,
      ammoThreshold,
      trainingsLast7: train7,
      trainingMin,
      latestIncidentMs: latest ? rowMillis(latest) : 0,
      incidentFlags: inc,
    },
  }
}

/**
 * range_logs üzerinden ağırlıklı muharebe hazırlığı (0–100).
 * @param {Record<string, unknown>[]} rangeLogs
 * @param {{ nowMs?: number, windowMs?: number }} [opts]
 */
export function computeCombatReadinessFromLogs(rangeLogs, opts = {}) {
  const nowMs = opts.nowMs ?? Date.now()
  const windowMs = opts.windowMs ?? ORS_DEFAULT_WINDOW_MS
  const metrics = aggregateRangeLogMetrics(rangeLogs, { nowMs, windowMs })

  if (metrics.sessionCount === 0) {
    return {
      score: 0,
      hasData: false,
      penalties: [],
      meta: { ...metrics, baseScore: 0, penaltyTotal: 0 },
    }
  }

  /** @type {{ code: string; delta: number; detail: string }[]} */
  const penalties = []
  const { safety, disciplines } = metrics

  let activeWeightSum = 0
  let weightedSum = 0

  for (const [key, weight] of Object.entries(ORS_DISCIPLINE_WEIGHTS)) {
    const bucket = disciplines[/** @type {keyof typeof disciplines} */ (key)]
    if (bucket?.average != null && bucket.sessions > 0) {
      activeWeightSum += weight
      weightedSum += weight * bucket.average
    }
  }

  const baseScore = activeWeightSum > 0 ? weightedSum / activeWeightSum : 50

  let penaltyTotal = 0

  if (safety.blueOnBlue > 0) {
    const delta = safety.blueOnBlue * PENALTY_BLUE_ON_BLUE
    penaltyTotal += delta
    penalties.push({
      code: 'HATA_KODU: MAVİ-MAVİ (FOF)',
      delta: -delta,
      detail: `SAY ${safety.blueOnBlue}`,
    })
  }

  if (safety.muzzleFlagging > 0) {
    const delta = safety.muzzleFlagging * PENALTY_MUZZLE_FLAGGING
    penaltyTotal += delta
    penalties.push({
      code: 'HATA_KODU: NAMLU FLAG (CQB)',
      delta: -delta,
      detail: `SAY ${safety.muzzleFlagging}`,
    })
  }

  if (safety.fatalFunnelHang > 0) {
    const delta = safety.fatalFunnelHang * PENALTY_FATAL_FUNNEL
    penaltyTotal += delta
    penalties.push({
      code: 'HATA_KODU: ÖLÜM HUNİSİ (CQB)',
      delta: -delta,
      detail: `SAY ${safety.fatalFunnelHang}`,
    })
  }

  if (safety.tcccBelow40 > 0) {
    const delta = safety.tcccBelow40 * PENALTY_TCCC_BELOW_40
    penaltyTotal += delta
    penalties.push({
      code: 'HATA_KODU: TCCC EŞİK ALTINDA',
      delta: -delta,
      detail: `<40% · ${safety.tcccBelow40} OTURUM`,
    })
  }

  const slowBreach = safety.slowBreach ?? 0
  if (slowBreach > 0) {
    const delta = slowBreach * PENALTY_SLOW_BREACH
    penaltyTotal += delta
    penalties.push({
      code: 'HATA_KODU: YAVAŞ KIRMA (CQB)',
      delta: -delta,
      detail: `SAY ${slowBreach}`,
    })
  }

  const recentForSpeed = rangeLogs.filter((row) => rangeLogTimestampMs(row) >= nowMs - windowMs)
  const speedSafety = summarizeSpeedAndSafetyPenalties(recentForSpeed)

  if (speedSafety.slowDrillCount > 0) {
    const delta = speedSafety.slowDrillCount * PENALTY_SLOW_DRILL
    penaltyTotal += delta
    penalties.push({
      code: 'HATA_KODU: YAVAŞ TAMAMLAMA',
      delta: -delta,
      detail: `OTURUM ${speedSafety.slowDrillCount}`,
    })
  }

  if (speedSafety.lowAccuracyCount > 0) {
    const delta = speedSafety.lowAccuracyCount * PENALTY_LOW_ACCURACY_SESSION
    penaltyTotal += delta
    penalties.push({
      code: 'HATA_KODU: DÜŞÜK İSABET',
      delta: -delta,
      detail: `OTURUM ${speedSafety.lowAccuracyCount}`,
    })
  }

  penaltyTotal = Math.min(MAX_COMBAT_PENALTY, penaltyTotal)

  let medevacBoost = 0
  for (const row of rangeLogs) {
    if (rangeLogTimestampMs(row) < nowMs - windowMs) continue
    const isEvacSim = row.medevacSim === true || row.casevacSim === true
    if (!isEvacSim || !row.medevacTransmissionSuccess) continue
    const sp = Number(row.successPercent)
    if (Number.isFinite(sp) && sp >= 85) medevacBoost += 1
  }
  const bonus =
    medevacBoost > 0
      ? Math.min(12, medevacBoost * BONUS_MEDEVAC_TRANSMISSION)
      : 0

  const score = clampScore(baseScore - penaltyTotal + bonus)

  return {
    score,
    hasData: true,
    penalties,
    meta: {
      ...metrics,
      baseScore: Math.round(baseScore * 10) / 10,
      penaltyTotal,
      medevacBoost,
      medevacBonus: bonus,
      activeWeightSum,
    },
  }
}

/**
 * Birleşik Operasyonel Hazırlık Skoru (lojistik + muharebe).
 * @param {{
 *   inventory?: Record<string, unknown>[],
 *   trainings?: Record<string, unknown>[],
 *   health?: Record<string, unknown>[],
 *   rangeLogs?: Record<string, unknown>[],
 *   nowMs?: number,
 *   ammoThreshold?: number,
 *   trainingMin?: number,
 *   combatWindowMs?: number,
 *   logisticalWeight?: number,
 *   combatWeight?: number,
 * }} p
 */
export function computeORS(p) {
  const {
    inventory = [],
    trainings = [],
    health = [],
    rangeLogs = [],
    nowMs = Date.now(),
    ammoThreshold = ORS_AMMO_THRESHOLD_UNITS,
    trainingMin = ORS_TRAINING_MIN_LAST7,
    combatWindowMs = ORS_DEFAULT_WINDOW_MS,
    logisticalWeight = ORS_LOGISTICAL_WEIGHT,
    combatWeight = ORS_COMBAT_WEIGHT,
  } = p

  const logistical = computeLogisticalORS({
    inventory,
    trainings,
    health,
    nowMs,
    ammoThreshold,
    trainingMin,
  })

  const combat = computeCombatReadinessFromLogs(rangeLogs, { nowMs, windowMs: combatWindowMs })

  /** @type {{ code: string; delta: number; detail: string }[]} */
  const penalties = [...logistical.penalties]

  let score = logistical.score

  if (combat.hasData) {
    score = clampScore(logistical.score * logisticalWeight + combat.score * combatWeight)
    penalties.push(...combat.penalties)
  }

  return {
    score,
    penalties,
    meta: {
      ...logistical.meta,
      logisticalScore: logistical.score,
      combatScore: combat.hasData ? combat.score : null,
      combatHasData: combat.hasData,
      combatMeta: combat.meta,
    },
  }
}
