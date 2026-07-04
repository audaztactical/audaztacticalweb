import { isAtisShootingLog, getAtisAccuracyPercent, getAtisDrillName, getAtisLogTimestampMs } from './atisLogRegistry'
import { isCqbLog, getCqbLogTimestampMs } from './cqbLogRegistry'
import { isFofLog, getFofLogTimestampMs, getFofScenarioType } from './fofLogRegistry'
import { isTcccLog, getTcccLogTimestampMs, getTcccPhase } from './tcccLogRegistry'
import { isVbssLog, getVbssLogTimestampMs, getVbssInsertionMethod, getVbssVesselType } from './vbssLogRegistry'
import { invNum, invStr } from './inventoryIlws'
import { getLogSuccessPercent } from './trainingSuccessScore'
import {
  getSimulationElapsedSec,
  getSimulationMode,
  getSimulationSuccess,
  isTcccSimulationLog,
  reactionEfficiencyPercent,
} from './simulationHistoryHelpers'
import { isTcccSimulationFailed } from './tcccSimHudAnalytics'
import {
  isObservedEvalLog,
  isUnverifiedObservedEval,
  getObservedEvalActivityTitle,
} from './observedEvalRegistry'

const CQB_CRITICAL_ERROR_IDS = new Set(['fatal_funnel_hang', 'muzzle_flagging'])

/** Geçme eşiği — açık BAŞARILI yoksa isabet / successPercent için (85 değil). */
export const PROGRESS_PASSING_SCORE_THRESHOLD = 50

/** @typedef {'all' | 'atis' | 'cqb' | 'tccc' | 'fof' | 'vbss'} DisciplineFilter */
/** @typedef {'7d' | '30d' | 'all'} TimeframeFilter */

/**
 * ISO string, Firestore Timestamp, or { seconds } map → epoch ms.
 * @param {unknown} ts
 */
export function resolveFirestoreTimestampMs(ts) {
  if (ts == null) return 0
  if (typeof ts === 'number' && Number.isFinite(ts)) {
    return ts > 1e12 ? Math.floor(ts) : Math.floor(ts * 1000)
  }
  if (typeof ts === 'object' && ts !== null) {
    const o = /** @type {Record<string, unknown>} */ (ts)
    if (typeof o.toMillis === 'function') {
      const ms = o.toMillis()
      return Number.isFinite(ms) ? ms : 0
    }
    if (typeof o.seconds === 'number') return Math.floor(o.seconds * 1000)
    if (typeof o._seconds === 'number') return Math.floor(o._seconds * 1000)
  }
  const s = invStr(ts)
  if (!s) return 0
  const parsed = Date.parse(s)
  return Number.isNaN(parsed) ? 0 : parsed
}

/**
 * @param {Record<string, unknown>} row
 */
export function getProgressLogTimestampMs(row) {
  const direct = Math.max(
    resolveFirestoreTimestampMs(row.timestamp),
    resolveFirestoreTimestampMs(row.updatedAt),
    resolveFirestoreTimestampMs(row.createdAt),
    resolveFirestoreTimestampMs(row.recordedAt),
  )

  return Math.max(
    direct,
    getAtisLogTimestampMs(row),
    getCqbLogTimestampMs(row),
    getTcccLogTimestampMs(row),
    getFofLogTimestampMs(row),
    getVbssLogTimestampMs(row),
  )
}

/**
 * @param {unknown} raw
 */
function normalizeProgressCategoryToken(raw) {
  return invStr(raw).toLowerCase().trim()
}

/**
 * @param {unknown} statusRaw
 */
function isExplicitProgressStatusSuccess(statusRaw) {
  const status = invStr(statusRaw).toUpperCase()
  if (!status || status === 'ACTIVE') return false
  if (status === 'SUCCESS' || status === 'BAŞARILI' || status === 'BASARILI') return true
  return status.includes('CLEAN') && status.includes('HIT') && !status.includes('COLD')
}

/**
 * @param {unknown} statusRaw
 */
function isExplicitProgressStatusFailure(statusRaw) {
  const status = invStr(statusRaw).toUpperCase()
  if (status === 'FAILURE' || status === 'FAILED' || status === 'FAIL') return true
  if (status === 'BAŞARISIZ' || status === 'BASARISIZ') return true
  return status.includes('COLD HIT')
}

/**
 * @param {Record<string, unknown>} row
 */
export function isAtisProgressLog(row) {
  if (isAtisShootingLog(row)) return true
  const op = normalizeProgressCategoryToken(row.operationCategory)
  if (op === 'atis' || op.includes('atış') || op.includes('atis')) return true
  const cat = normalizeProgressCategoryToken(row.category)
  if (cat === 'atis' || cat.includes('atış') || cat.includes('atis')) return true
  const disc = normalizeProgressCategoryToken(row.discipline)
  if (disc === 'atış' || disc.includes('atış') || disc.includes('atis')) return true
  const shoot = normalizeProgressCategoryToken(row.shootType)
  if (shoot.includes('atis') || shoot.includes('atış')) return true
  const kind = invStr(row.kind).toUpperCase()
  return kind.includes('ATIS')
}

/**
 * @param {Record<string, unknown>} row
 */
export function isCqbProgressLog(row) {
  if (isCqbLog(row)) return true
  const op = normalizeProgressCategoryToken(row.operationCategory)
  if (op === 'cqb') return true
  const cat = normalizeProgressCategoryToken(row.category)
  if (cat === 'cqb') return true
  const disc = invStr(row.discipline)
  if (disc.toUpperCase() === 'CQB') return true
  const discLower = normalizeProgressCategoryToken(row.discipline)
  return discLower.includes('yakın mesafe') || discLower.includes('cqb')
}

/**
 * @param {Record<string, unknown>} row
 */
export function isFofProgressLog(row) {
  if (isFofLog(row)) return true
  const op = normalizeProgressCategoryToken(row.operationCategory)
  if (op === 'fof') return true
  const cat = normalizeProgressCategoryToken(row.category)
  if (cat === 'fof') return true
  const disc = invStr(row.discipline)
  if (disc.toUpperCase() === 'FOF' || disc === 'FoF') return true
  const discLower = normalizeProgressCategoryToken(row.discipline)
  return discLower.includes('force-on-force') || discLower.includes('fof')
}

/** @typedef {'atis' | 'cqb' | 'fof' | 'tccc' | 'vbss'} ProgressCategoryId */

/**
 * @param {Record<string, unknown>} row
 * @param {ProgressCategoryId} category
 */
export function matchesProgressCategory(row, category) {
  if (category === 'atis') return isAtisProgressLog(row)
  if (category === 'cqb') return isCqbProgressLog(row)
  if (category === 'fof') return isFofProgressLog(row)
  if (category === 'tccc') return isTcccLog(row) || isTcccSimulationLog(row)
  if (category === 'vbss') return isVbssLog(row)
  return false
}

/**
 * @param {number} score
 */
function meetsProgressPassingScore(score) {
  return Number.isFinite(score) && score >= PROGRESS_PASSING_SCORE_THRESHOLD
}

/**
 * @param {unknown} raw
 */
function normalizeStoredPercent(raw) {
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 0) return null
  if (n > 0 && n <= 1) return Math.round(n * 1000) / 10
  if (n <= 100) return Math.round(n * 10) / 10
  return null
}

/**
 * Atış — isabetOrani / accuracy / hits-rounds (85 eşiği yok).
 * @param {Record<string, unknown>} row
 */
export function getAtisPerformanceScore(row) {
  const stored = normalizeStoredPercent(row.isabetOrani ?? row.isabet_orani ?? row.accuracy)
  if (stored != null) return stored
  return getAtisAccuracyPercent(row)
}

/**
 * @param {Record<string, unknown>} row
 */
export function getLogPerformanceScore(row) {
  if (isTcccSimulationLog(row)) {
    const status = invStr(row.tcccSimStatus ?? row.status).toUpperCase()
    if (status === 'BAŞARILI' || status === 'BASARILI') {
      const sp = getLogSuccessPercent(row)
      return sp != null ? sp : 100
    }
    if (status === 'BAŞARISIZ' || status === 'BASARISIZ') {
      const sp = getLogSuccessPercent(row)
      if (sp != null) return sp
    }
    if (isTcccSimulationSuccessful(row)) {
      const sp = getLogSuccessPercent(row)
      return sp != null ? sp : 100
    }
    const mode = getSimulationMode(row)
    const elapsed = getSimulationElapsedSec(row)
    return reactionEfficiencyPercent(mode, elapsed)
  }

  if (isAtisProgressLog(row)) return getAtisPerformanceScore(row)

  const sp = getLogSuccessPercent(row)
  if (sp != null) return sp

  if (isFofLog(row)) {
    const rounds = invNum(row.engagementRounds)
    const lethal = invNum(row.lethalHitsDelivered)
    const nonLethal = invNum(row.nonLethalHitsDelivered)
    if (rounds > 0) {
      return Math.min(100, Math.round(((lethal + nonLethal) / rounds) * 1000) / 10)
    }
  }

  return 0
}

/**
 * @param {Record<string, unknown>[]} logs
 */
export function averagePerformancePercent(logs) {
  if (!logs.length) return 0
  const scores = logs.map((row) => getLogPerformanceScore(row))
  const sum = scores.reduce((a, b) => a + b, 0)
  return Math.round((sum / scores.length) * 10) / 10
}

/**
 * @param {Record<string, unknown>} row
 */
function evaluateAtisLogSuccess(row) {
  if (row.success === true) return true
  if (row.success === false) return false

  const status = invStr(row.status).toUpperCase()
  if (status === 'SUCCESS' || status === 'BAŞARILI' || status === 'BASARILI') return true
  if (isExplicitProgressStatusFailure(status)) return false

  return meetsProgressPassingScore(getAtisPerformanceScore(row))
}

/**
 * @param {Record<string, unknown>} row
 */
function evaluateCqbLogSuccess(row) {
  if (row.success === true) return true
  if (row.success === false) return false

  const status = invStr(row.status).toUpperCase()
  if (status === 'SUCCESS' || status === 'BAŞARILI' || status === 'BASARILI') return true
  if (isExplicitProgressStatusFailure(status)) return false

  if (invStr(row.durum).toUpperCase() === 'RECKLESS') return false

  const sp = getLogSuccessPercent(row)
  if (sp != null) return meetsProgressPassingScore(sp)

  return false
}

/**
 * @param {Record<string, unknown>} row
 */
function evaluateFofLogSuccess(row) {
  if (row.success === true) return true
  if (row.success === false) return false
  if (row.blueOnBlue === true) return false

  const status = invStr(row.status).toUpperCase()
  if (status === 'SUCCESS' || status === 'BAŞARILI' || status === 'BASARILI') return true
  if (isExplicitProgressStatusFailure(status)) return false

  const sp = getLogSuccessPercent(row)
  if (sp != null) return meetsProgressPassingScore(sp)

  return meetsProgressPassingScore(getLogPerformanceScore(row))
}

/**
 * @param {Record<string, unknown>} row
 * @param {ProgressCategoryId} [category]
 */
export function evaluateCategoryLogSuccess(row, category) {
  if (category === 'atis' || (!category && isAtisProgressLog(row))) return evaluateAtisLogSuccess(row)
  if (category === 'cqb' || (!category && isCqbProgressLog(row))) return evaluateCqbLogSuccess(row)
  if (category === 'fof' || (!category && isFofProgressLog(row))) return evaluateFofLogSuccess(row)
  if (isTcccSimulationLog(row)) return isTcccSimulationSuccessful(row)
  return isTrainingLogSuccessful(row)
}

/**
 * @param {Record<string, unknown>} row
 * @returns {'ATIS' | 'CQB' | 'TCCC' | 'FOF' | 'VBSS' | 'OTHER'}
 */
export function getLogDisciplineTag(row) {
  if (isObservedEvalLog(row)) {
    if (String(row?.operationCategory ?? '').toLowerCase() === 'tccc') return 'TCCC'
    if (String(row?.operationCategory ?? '').toLowerCase() === 'vbss') return 'VBSS'
  }
  if (isTcccSimulationLog(row) || isTcccLog(row)) return 'TCCC'
  if (isAtisProgressLog(row)) return 'ATIS'
  if (isCqbProgressLog(row)) return 'CQB'
  if (isFofProgressLog(row)) return 'FOF'
  if (isVbssLog(row)) return 'VBSS'
  const kind = invStr(row.kind).toUpperCase()
  const cat = normalizeProgressCategoryToken(row.operationCategory)
  if (kind === 'FOF_DRILL' || cat === 'fof') return 'FOF'
  if (kind === 'VBSS_DRILL' || cat === 'vbss') return 'VBSS'
  if (cat === 'atis' || cat === 'cqb') return cat === 'atis' ? 'ATIS' : 'CQB'
  return 'OTHER'
}

/**
 * @param {Record<string, unknown>} row
 */
export function isTcccSimulationSuccessful(row) {
  const status = invStr(row.tcccSimStatus ?? row.status).toUpperCase()
  if (status === 'BAŞARILI' || status === 'BASARILI') return true
  if (status.includes('CLEAN') && status.includes('HIT') && !status.includes('COLD')) return true
  if (status === 'BAŞARISIZ' || status === 'BASARISIZ' || status.includes('COLD HIT')) return false
  if (typeof row.medevacTransmissionSuccess === 'boolean') return row.medevacTransmissionSuccess
  return getSimulationSuccess(row)
}

/**
 * Unified pass/fail for ATIS · CQB · FoF · TCCC drill/sim payloads.
 * @param {Record<string, unknown>} row
 */
export function isTrainingLogSuccessful(row) {
  if (isTcccSimulationLog(row)) return isTcccSimulationSuccessful(row)
  if (isAtisProgressLog(row)) return evaluateAtisLogSuccess(row)
  if (isCqbProgressLog(row)) return evaluateCqbLogSuccess(row)
  if (isFofProgressLog(row)) return evaluateFofLogSuccess(row)

  if (row.success === true) return true
  if (row.success === false) return false

  const status = invStr(row.tcccSimStatus ?? row.status)
  if (isExplicitProgressStatusFailure(status)) return false
  if (isExplicitProgressStatusSuccess(status)) return true

  if (row.successPercent != null && row.successPercent !== '') {
    return meetsProgressPassingScore(invNum(row.successPercent))
  }

  if (typeof row.medevacTransmissionSuccess === 'boolean') {
    return row.medevacTransmissionSuccess
  }

  return meetsProgressPassingScore(getLogPerformanceScore(row))
}

/** @deprecated Use isTrainingLogSuccessful */
export const isShootingLogSuccessful = isTrainingLogSuccessful

/**
 * @typedef {{
 *   atisRate: number
 *   cqbRate: number
 *   fofRate: number
 *   tcccSimRate: number
 *   globalSuccessRate: number
 *   totals: {
 *     atis: number
 *     cqb: number
 *     fof: number
 *     tcccSim: number
 *     successAtis: number
 *     successCqb: number
 *     successFof: number
 *     successTccc: number
 *   }
 * }} MultiCategorySuccessMetrics
 */

/**
 * Multi-category success aggregator (Atış · CQB · FoF · TCCC sim).
 * @param {Record<string, unknown>[]} logs
 * @returns {MultiCategorySuccessMetrics}
 */
export function computeMultiCategorySuccessMetrics(logs) {
  const shootingLogs = logs.filter((row) => !isTcccSimulationLog(row))
  const simulationLogs = logs.filter(isTcccSimulationLog)

  const atisLogs = shootingLogs.filter(isAtisProgressLog)
  const cqbLogs = shootingLogs.filter(isCqbProgressLog)
  const fofLogs = shootingLogs.filter(isFofProgressLog)

  const totalAtis = atisLogs.length
  const totalCqb = cqbLogs.length
  const totalFof = fofLogs.length
  const totalSimulationLogs = simulationLogs.length

  const successAtis = atisLogs.filter(evaluateAtisLogSuccess).length
  const successCqb = cqbLogs.filter(evaluateCqbLogSuccess).length
  const successFof = fofLogs.filter(evaluateFofLogSuccess).length
  const successfulTcccLogs = simulationLogs.filter(isTcccSimulationSuccessful).length

  const atisRate = totalAtis > 0 ? Math.round(averagePerformancePercent(atisLogs)) : 0
  const cqbRate = totalCqb > 0 ? Math.round(averagePerformancePercent(cqbLogs)) : 0
  const fofRate = totalFof > 0 ? Math.round(averagePerformancePercent(fofLogs)) : 0
  const tcccSimRate =
    totalSimulationLogs > 0 ? Math.round(averagePerformancePercent(simulationLogs)) : 0

  const globalSuccessRate = logs.length > 0 ? Math.round(averagePerformancePercent(logs)) : 0

  return {
    atisRate,
    cqbRate,
    fofRate,
    tcccSimRate,
    globalSuccessRate,
    totals: {
      atis: totalAtis,
      cqb: totalCqb,
      fof: totalFof,
      tcccSim: totalSimulationLogs,
      successAtis,
      successCqb,
      successFof,
      successTccc: successfulTcccLogs,
    },
  }
}

/**
 * Success % for the active discipline tab (uses full filtered log pool when tab filter already applied).
 * @param {Record<string, unknown>[]} logs
 * @param {DisciplineFilter} discipline
 */
export function computeActiveDisciplineSuccessRate(logs, discipline) {
  if (!logs.length) return 0

  const metrics = computeMultiCategorySuccessMetrics(logs)

  if (discipline === 'all') return metrics.globalSuccessRate

  const pool = logs.filter((row) => matchesDiscipline(row, discipline))
  const scoped = pool.length > 0 ? pool : logs

  return Math.round(averagePerformancePercent(scoped))
}

/**
 * Count-based GENEL BAŞARI ORANI across ATIS · CQB · FoF · TCCC sim.
 * @param {Record<string, unknown>[]} logs
 */
export function computeGlobalSuccessRate(logs) {
  return computeMultiCategorySuccessMetrics(logs).globalSuccessRate
}

/**
 * @param {Record<string, unknown>} row
 */
export function getLogSuccessOrAccuracy(row) {
  const score = getLogPerformanceScore(row)
  return Number.isFinite(score) ? score : null
}

/**
 * @param {Record<string, unknown>} row
 */
export function getLogAccuracyPercent(row) {
  if (isAtisProgressLog(row)) return getAtisPerformanceScore(row)
  const success = getLogSuccessPercent(row)
  if (success != null) return success
  if (isFofProgressLog(row)) {
    const rounds = invNum(row.engagementRounds)
    const lethal = invNum(row.lethalHitsDelivered)
    const nonLethal = invNum(row.nonLethalHitsDelivered)
    if (rounds > 0) {
      return Math.min(100, Math.round(((lethal + nonLethal) / rounds) * 1000) / 10)
    }
  }
  return null
}

/**
 * @param {Record<string, unknown>} row
 */
export function countLogCriticalErrors(row) {
  let count = 0
  if (row.blueOnBlue) count += 1

  const errors = Array.isArray(row.tacticalErrors) ? row.tacticalErrors : []
  for (const raw of errors) {
    const id = invStr(raw).trim()
    if (CQB_CRITICAL_ERROR_IDS.has(id) || id === 'slow_breach') count += 1
  }

  if (isTcccLog(row) || isTcccSimulationLog(row)) {
    const success = getLogSuccessPercent(row)
    if (isTcccSimulationFailed(row) || (success != null && success < 40)) count += 1
  }

  return count
}

/**
 * @param {Record<string, unknown>} row
 */
export function getLogActivityTitle(row) {
  if (isObservedEvalLog(row)) return getObservedEvalActivityTitle(row)
  const tag = getLogDisciplineTag(row)
  const drill = invStr(row.drillName ?? row.shootType).trim()
  if (drill) return drill
  if (tag === 'TCCC') return getTcccPhase(row) || 'TCCC DRILL'
  if (tag === 'CQB') return invStr(row.roomTopology).trim() || 'CQB DRILL'
  if (tag === 'ATIS') return getAtisDrillName(row)
  if (tag === 'FOF') return getFofScenarioType(row) || 'FOF DRILL'
  if (tag === 'VBSS') {
    const vessel = getVbssVesselType(row)
    const insertion = getVbssInsertionMethod(row)
    return [vessel, insertion].filter((p) => p && p !== '—').join(' · ') || 'VBSS DRILL'
  }
  return `${tag} OTURUMU`
}

/** @type {{ id: DisciplineFilter; label: string }[]} */
export const DISCIPLINE_OPTIONS = [
  { id: 'all', label: 'TÜM DİSİPLİNLER' },
  { id: 'atis', label: 'ATIŞ BECERİSİ (ATIS)' },
  { id: 'cqb', label: 'YAKIN MESAFE MUHAREBESİ (CQB)' },
  { id: 'tccc', label: 'TAKTİK SAĞLIK (TCCC)' },
  { id: 'fof', label: 'KUVVET KARŞILAŞMASI (FOF)' },
  { id: 'vbss', label: 'VBSS / MARITIME (VBSS)' },
]

/** @typedef {{ id: string; label: string; match: (row: Record<string, unknown>) => boolean }} SubTopicOption */

/** @type {Record<DisciplineFilter, SubTopicOption[]>} */
const FALLBACK_SUBTOPIC_OPTIONS = {
  all: [{ id: 'all', label: 'TÜM GÖREVLER', match: () => true }],
  atis: [
    { id: 'all', label: 'TÜM ATIŞ KONULARI', match: () => true },
    {
      id: 'basic_pistol',
      label: 'TEMEL TABANCA',
      match: (row) => {
        const name = getAtisDrillName(row).toLowerCase()
        return (
          name.includes('draw') ||
          name.includes('first shot') ||
          name.includes('ready') ||
          name.includes('tabanca')
        )
      },
    },
    {
      id: 'stress_shooting',
      label: 'STRES ATIŞI',
      match: (row) => {
        const name = getAtisDrillName(row).toLowerCase()
        const level = invNum(row.drillLevel)
        return level >= 3 || name.includes('mozambique') || name.includes('multi-target')
      },
    },
    {
      id: 'double_tap',
      label: 'DOUBLE TAP',
      match: (row) => getAtisDrillName(row).toLowerCase().includes('double'),
    },
  ],
  cqb: [
    { id: 'all', label: 'TÜM CQB GÖREVLERİ', match: () => true },
    {
      id: 'room_clear',
      label: 'ODA TEMİZLEME',
      match: (row) => invStr(row.roomTopology).length > 0,
    },
    {
      id: 'breach_entry',
      label: 'KIRMA & GİRİŞ',
      match: (row) =>
        invStr(row.breachingType).length > 0 || invStr(row.entryMethod).length > 0,
    },
  ],
  tccc: [
    { id: 'all', label: 'TÜM TCCC GÖREVLERİ', match: () => true },
    {
      id: 'ifak_speed',
      label: 'IFAK HIZI',
      match: (row) => {
        const note = invStr(row.operationNote).toLowerCase()
        return note.includes('ifak') || invStr(row.injuryToTqTime).length > 0
      },
    },
    {
      id: 'care_under_fire',
      label: 'ATEŞ ALTINDA BAKIM (CUF)',
      match: (row) => {
        const phase = getTcccPhase(row).toLowerCase()
        return phase.includes('cuf') || phase.includes('ateş altında')
      },
    },
    {
      id: 'medevac_9line',
      label: '9-LINE MEDEVAC',
      match: (row) => {
        const phase = getTcccPhase(row).toLowerCase()
        const note = invStr(row.operationNote).toLowerCase()
        return phase.includes('tevac') || phase.includes('tahliye') || note.includes('9-line') || note.includes('medevac')
      },
    },
  ],
  fof: [
    { id: 'all', label: 'TÜM FOF GÖREVLERİ', match: () => true },
    {
      id: 'rehine_kurtarma_simulasyon',
      label: 'REHİNE KURTARMA - SİMÜLASYON',
      match: (row) =>
        isFofLog(row) &&
        (invStr(row.scenarioTypeKey) === 'hostage_rescue' ||
          getFofScenarioType(row).toLowerCase().includes('rehine')),
    },
    {
      id: 'aktif_atici_active_shooter',
      label: 'AKTİF ATICI (ACTIVE SHOOTER) MÜDAHALE',
      match: (row) =>
        isFofLog(row) &&
        (invStr(row.scenarioTypeKey) === 'active_shooter' ||
          getFofScenarioType(row).toLowerCase().includes('nişancı') ||
          getFofScenarioType(row).toLowerCase().includes('shooter')),
    },
    {
      id: 'ekip_bazli_karsilasma_fof',
      label: 'EKİP BAZLI KARŞILAŞMA (FORCE ON FORCE)',
      match: (row) => isFofLog(row),
    },
  ],
  vbss: [
    { id: 'all', label: 'TÜM VBSS GÖREVLERİ', match: () => true },
    {
      id: 'kargo_konteyner_bot',
      label: 'KARGO / KONTEYNER GEMİSİ SIZMA (BOT)',
      match: (row) =>
        isVbssLog(row) &&
        (invStr(row.vesselTypeKey) === 'cargo_container' ||
          getVbssVesselType(row).toLowerCase().includes('kargo') ||
          getVbssVesselType(row).toLowerCase().includes('konteyner')),
    },
    {
      id: 'merdiven_kanca_vbss',
      label: 'MERDİVEN / KANCA İLE TIRMANMA (VBSS)',
      match: (row) =>
        isVbssLog(row) &&
        (invStr(row.insertionMethodKey) === 'hook_and_ladder_bot' ||
          getVbssInsertionMethod(row).toLowerCase().includes('kanca') ||
          getVbssInsertionMethod(row).toLowerCase().includes('merdiven')),
    },
    {
      id: 'dar_koridor_guverte',
      label: 'DAR KORİDOR VE GÜVERTE TEMİZLİĞİ',
      match: (row) => {
        if (!isVbssLog(row)) return false
        const blob = [
          invStr(row.drillName),
          invStr(row.shootType),
          invStr(row.operationNote),
        ]
          .join(' ')
          .toLowerCase()
        return blob.includes('koridor') || blob.includes('güverte') || blob.includes('guverte')
      },
    },
  ],
}

const DISCIPLINE_ALL_LABELS = {
  all: 'TÜM GÖREVLER',
  atis: 'TÜM ATIŞ KONULARI',
  cqb: 'TÜM CQB GÖREVLERİ',
  tccc: 'TÜM TCCC GÖREVLERİ',
  fof: 'TÜM FOF GÖREVLERİ',
  vbss: 'TÜM VBSS GÖREVLERİ',
}

/** FOF/VBSS: Firestore + varsayılan şablon birlikte listelenir */
const MERGE_FALLBACK_DISCIPLINES = new Set(/** @type {DisciplineFilter[]} */ (['fof', 'vbss']))

/**
 * Firestore range_logs kaydından görünen görev/konu etiketi (drillName / shootType).
 * @param {Record<string, unknown>} row
 */
export function getLogTopicLabel(row) {
  const drill = invStr(row.drillName ?? row.shootType).trim()
  if (drill && drill !== '—') return drill

  const tag = getLogDisciplineTag(row)
  if (tag === 'ATIS') {
    const atis = getAtisDrillName(row)
    return atis !== '—' ? atis : ''
  }
  if (tag === 'CQB') return invStr(row.roomTopology).trim()
  if (tag === 'TCCC') return getTcccPhase(row) !== '—' ? getTcccPhase(row) : ''
  if (tag === 'FOF') {
    const scenario = getFofScenarioType(row)
    return scenario !== '—' ? scenario : ''
  }
  if (tag === 'VBSS') {
    const vessel = getVbssVesselType(row)
    const insertion = getVbssInsertionMethod(row)
    const parts = [vessel, insertion].filter((p) => p && p !== '—')
    return parts.length ? parts.join(' · ') : ''
  }
  return ''
}

/**
 * @param {string} label
 */
export function slugTopicId(label) {
  const base = label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 96)
  return base || 'topic_unknown'
}

/**
 * @param {Record<string, unknown>} row
 */
export function getLogTopicId(row) {
  return slugTopicId(getLogTopicLabel(row))
}

/**
 * Ana disipline göre alt görev listesi — önce canlı Firestore loglarından, yoksa fallback şablon.
 * @param {Record<string, unknown>[]} logs
 * @param {DisciplineFilter} discipline
 * @returns {SubTopicOption[]}
 */
export function buildSubTopicOptions(logs, discipline) {
  const allLabel = DISCIPLINE_ALL_LABELS[discipline] ?? DISCIPLINE_ALL_LABELS.all

  if (discipline === 'all') {
    return [{ id: 'all', label: allLabel, match: () => true }]
  }

  /** @type {SubTopicOption[]} */
  const options = [{ id: 'all', label: allLabel, match: () => true }]
  const seen = new Set(['all'])
  /** @type {Map<string, string>} */
  const topicById = new Map()

  for (const row of logs) {
    if (!matchesDiscipline(row, discipline)) continue
    const label = getLogTopicLabel(row)
    if (!label) continue
    const id = getLogTopicId(row)
    if (seen.has(id)) continue
    seen.add(id)
    topicById.set(id, label)
  }

  const sorted = [...topicById.entries()].sort((a, b) =>
    a[1].localeCompare(b[1], 'tr', { sensitivity: 'base' })
  )

  for (const [id, label] of sorted) {
    options.push({
      id,
      label,
      match: (row) => matchesDiscipline(row, discipline) && getLogTopicId(row) === id,
    })
  }

  const fallback = FALLBACK_SUBTOPIC_OPTIONS[discipline] ?? []
  const mergeFallback = sorted.length === 0 || MERGE_FALLBACK_DISCIPLINES.has(discipline)
  if (mergeFallback) {
    for (const fb of fallback) {
      if (fb.id === 'all' || seen.has(fb.id)) continue
      seen.add(fb.id)
      options.push(fb)
    }
  } else if (sorted.length === 0 && fallback.length > 0) {
    return fallback
  }

  return options
}

/**
 * @param {DisciplineFilter} discipline
 * @param {Record<string, unknown>[]} [logs]
 */
export function getSubTopicsForDiscipline(discipline, logs = []) {
  return buildSubTopicOptions(logs, discipline)
}

/**
 * @param {Record<string, unknown>} row
 * @param {DisciplineFilter} discipline
 */
function matchesDiscipline(row, discipline) {
  if (discipline === 'all') return true
  if (discipline === 'atis') return isAtisProgressLog(row)
  if (discipline === 'cqb') return isCqbProgressLog(row)
  if (discipline === 'tccc') return isTcccLog(row) || isTcccSimulationLog(row) || (isObservedEvalLog(row) && String(row?.operationCategory ?? '').toLowerCase() === 'tccc')
  if (discipline === 'fof') return isFofProgressLog(row)
  if (discipline === 'vbss') return isVbssLog(row) || (isObservedEvalLog(row) && String(row?.operationCategory ?? '').toLowerCase() === 'vbss')
  return false
}

/**
 * @param {Record<string, unknown>[]} logs
 * @param {{ discipline: DisciplineFilter; subTopic: string; timeframe: TimeframeFilter }} filters
 * @param {SubTopicOption[]} [topicOptions]
 */
export function filterProgressLogs(logs, { discipline, subTopic, timeframe }, topicOptions) {
  const now = Date.now()
  const cutoffMs =
    timeframe === '7d'
      ? now - 7 * 24 * 60 * 60 * 1000
      : timeframe === '30d'
        ? now - 30 * 24 * 60 * 60 * 1000
        : 0

  const topics = topicOptions ?? buildSubTopicOptions(logs, discipline)
  const effectiveSubTopic = discipline === 'all' ? 'all' : subTopic
  const topicMatcher = topics.find((t) => t.id === effectiveSubTopic)?.match ?? (() => true)

  return logs.filter((row) => {
    if (!matchesDiscipline(row, discipline)) return false
    if (!topicMatcher(row)) return false
    if (cutoffMs > 0) {
      const ms = getProgressLogTimestampMs(row)
      if (ms > 0 && ms < cutoffMs) return false
    }
    return true
  })
}

/**
 * @param {Record<string, unknown>[]} logs
 * @param {{ activeDiscipline?: DisciplineFilter }} [opts]
 */
export function computeProgressStats(logs, opts = {}) {
  const activeDiscipline = opts.activeDiscipline ?? 'all'
  const categoryMetrics = computeMultiCategorySuccessMetrics(logs)
  const tabSuccessRate = computeActiveDisciplineSuccessRate(logs, activeDiscipline)

  if (logs.length === 0) {
    return {
      overallSuccess: 0,
      tabSuccessRate: 0,
      disciplineSuccess: {
        atis: 0,
        cqb: 0,
        fof: 0,
        tccc: 0,
      },
      categoryTotals: categoryMetrics.totals,
      totalEvents: 0,
      avgAccuracy: 0,
      criticalErrors: 0,
    }
  }

  const accuracyValues = []
  let criticalErrors = 0

  for (const row of logs) {
    criticalErrors += countLogCriticalErrors(row)
    const accuracy = getLogAccuracyPercent(row)
    if (accuracy != null) accuracyValues.push(accuracy)
  }

  const avgAccuracy =
    accuracyValues.length > 0
      ? Math.round((accuracyValues.reduce((a, b) => a + b, 0) / accuracyValues.length) * 10) / 10
      : 0

  return {
    overallSuccess:
      activeDiscipline === 'all' ? categoryMetrics.globalSuccessRate : tabSuccessRate,
    tabSuccessRate,
    disciplineSuccess: {
      atis: categoryMetrics.atisRate,
      cqb: categoryMetrics.cqbRate,
      fof: categoryMetrics.fofRate,
      tccc: categoryMetrics.tcccSimRate,
    },
    categoryTotals: categoryMetrics.totals,
    totalEvents: logs.length,
    avgAccuracy,
    criticalErrors,
  }
}

/**
 * @param {Record<string, unknown>[]} logs
 * @param {number} [maxBars]
 */
export function buildTrendSeries(logs, maxBars = 8) {
  const sorted = [...logs].sort((a, b) => getProgressLogTimestampMs(a) - getProgressLogTimestampMs(b))
  const slice = sorted.slice(-maxBars)
  return slice.map((row, index) => ({
    id: invStr(row.id) || `${getProgressLogTimestampMs(row)}` || `trend-${index}`,
    label: `#${index + 1}`,
    value: getLogSuccessOrAccuracy(row) ?? 0,
    tag: getLogDisciplineTag(row),
  }))
}

/**
 * @param {Record<string, unknown>[]} logs
 * @param {number} [limit]
 */
export function buildActivityFeed(logs, limit = 24) {
  return [...logs]
    .sort((a, b) => getProgressLogTimestampMs(b) - getProgressLogTimestampMs(a))
    .slice(0, limit)
    .map((row) => ({
      id: invStr(row.id) || `${getProgressLogTimestampMs(row)}`,
      tag: getLogDisciplineTag(row),
      title: getLogActivityTitle(row),
      timestampMs: getProgressLogTimestampMs(row),
      success: getLogSuccessOrAccuracy(row),
      unverified: isUnverifiedObservedEval(row),
    }))
}

/** Varsayılan ORS penceresi — son 30 gün range_logs */
export const ORS_DEFAULT_WINDOW_MS = 30 * 24 * 60 * 60 * 1000

/**
 * ORS motoru için disiplin bazlı özet + güvenlik ihlalleri.
 * @param {Record<string, unknown>[]} logs
 * @param {{ nowMs?: number, windowMs?: number }} [opts]
 */
export function aggregateRangeLogMetrics(logs, opts = {}) {
  const nowMs = opts.nowMs ?? Date.now()
  const windowMs = opts.windowMs ?? ORS_DEFAULT_WINDOW_MS
  const cutoff = nowMs - windowMs

  const recent = logs.filter((row) => getProgressLogTimestampMs(row) >= cutoff)

  /** @type {Record<'ATIS' | 'CQB' | 'TCCC' | 'FOF' | 'VBSS', { scores: number[]; sessions: number }>} */
  const disciplines = {
    ATIS: { scores: [], sessions: 0 },
    CQB: { scores: [], sessions: 0 },
    TCCC: { scores: [], sessions: 0 },
    FOF: { scores: [], sessions: 0 },
    VBSS: { scores: [], sessions: 0 },
  }

  let blueOnBlue = 0
  let muzzleFlagging = 0
  let fatalFunnelHang = 0
  let slowBreach = 0
  let tcccBelow40 = 0
  let totalCriticalErrors = 0

  for (const row of recent) {
    if (isObservedEvalLog(row)) continue
    const tag = getLogDisciplineTag(row)
    totalCriticalErrors += countLogCriticalErrors(row)

    const metric = getLogSuccessOrAccuracy(row) ?? getLogAccuracyPercent(row)
    if (metric != null && tag in disciplines) {
      disciplines[/** @type {keyof typeof disciplines} */ (tag)].scores.push(metric)
      disciplines[/** @type {keyof typeof disciplines} */ (tag)].sessions += 1
    } else if (tag in disciplines && (isCqbProgressLog(row) || isFofProgressLog(row))) {
      disciplines[/** @type {keyof typeof disciplines} */ (tag)].scores.push(
        isTrainingLogSuccessful(row) ? 100 : 0,
      )
      disciplines[/** @type {keyof typeof disciplines} */ (tag)].sessions += 1
    }

    if (row.blueOnBlue) blueOnBlue += 1

    const errors = Array.isArray(row.tacticalErrors) ? row.tacticalErrors : []
    for (const raw of errors) {
      const id = invStr(raw).trim()
      if (id === 'muzzle_flagging') muzzleFlagging += 1
      if (id === 'fatal_funnel_hang') fatalFunnelHang += 1
      if (id === 'slow_breach' || id === 'breaching_delay') slowBreach += 1
      if (id === 'poor_corner_piercing') fatalFunnelHang += 1
    }

    if (tag === 'TCCC' && !isTcccSimulationLog(row)) {
      const sp = getLogSuccessPercent(row)
      if (sp != null && sp < 40) tcccBelow40 += 1
    }
  }

  /** @param {number[]} scores */
  const average = (scores) =>
    scores.length
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
      : null

  return {
    sessionCount: recent.length,
    windowMs,
    disciplines: Object.fromEntries(
      Object.entries(disciplines).map(([key, bucket]) => [
        key,
        { sessions: bucket.sessions, average: average(bucket.scores) },
      ])
    ),
    safety: {
      blueOnBlue,
      muzzleFlagging,
      fatalFunnelHang,
      slowBreach,
      tcccBelow40,
      totalCriticalErrors,
    },
  }
}
