/**
 * Canlı / oturum analiz geri bildirimi — i18n anahtarları üretir (sabit dil metni yok).
 */

import { holdQualityBand } from './shotAnalysisEngines'

/** @typedef {'info' | 'ok' | 'warn' | 'crit'} FeedbackSeverity */

/**
 * @typedef {{
 *   statusKey: string
 *   tipKey: string
 *   severity: FeedbackSeverity
 *   params?: Record<string, string | number>
 * }} AnalysisFeedback
 */

/** Eski İngilizce öneri metinleri → anahtar (kayıtlı seans uyumu) */
const LEGACY_REC_MAP = Object.freeze({
  'Excellent trigger control.': 'excellent',
  'Reduce pre-shot movement.': 'flinchHigh',
  'Watch for anticipation before the break.': 'flinchMed',
  'Improve follow through.': 'follow',
  'Hold stability is inconsistent.': 'hold',
  'Tighten the aim path before the shot.': 'trace',
  'Build more consistent shot-to-shot scores.': 'consistency',
  'Solid fundamentals — keep drilling the weak link.': 'default',
})

/**
 * @param {import('i18next').TFunction} t
 * @param {string | null | undefined} rec  anahtar veya legacy İngilizce
 * @returns {string}
 */
export function translateShotRecommendation(t, rec) {
  const raw = String(rec || '').trim()
  if (!raw) return t('dryFire.feedback.empty')
  const key = LEGACY_REC_MAP[raw] || (/^[a-zA-Z+]+$/.test(raw) ? raw : null)
  if (key) {
    const path = `dryFire.feedback.shotRec.${key}`
    const translated = t(path)
    if (translated !== path) return translated
  }
  return raw
}

/**
 * @param {{
 *   holdQuality?: number
 *   holdCombinedRms?: number
 *   holdStdDev?: number
 *   holdMaxDev?: number
 * }} hold
 * @returns {AnalysisFeedback}
 */
export function resolveHoldFeedback(hold) {
  const q = Number(hold?.holdQuality) || 0
  const rms = Number(hold?.holdCombinedRms) || 0
  const std = Number(hold?.holdStdDev) || 0
  const peak = Number(hold?.holdMaxDev) || 0
  const band = holdQualityBand(q)

  if (q <= 0 && rms <= 0) {
    return {
      statusKey: 'dryFire.feedback.hold.statusIdle',
      tipKey: 'dryFire.feedback.hold.tipIdle',
      severity: 'info',
    }
  }

  if (band === 'loose' || rms >= 1.8 || peak >= 3.5) {
    return {
      statusKey: 'dryFire.feedback.hold.statusLoose',
      tipKey: 'dryFire.feedback.hold.tipLoose',
      severity: 'crit',
      params: { rms: rms.toFixed(2), std: std.toFixed(2), peak: peak.toFixed(2) },
    }
  }
  if (band === 'fair' || rms >= 1.0) {
    return {
      statusKey: 'dryFire.feedback.hold.statusFair',
      tipKey: 'dryFire.feedback.hold.tipFair',
      severity: 'warn',
      params: { rms: rms.toFixed(2), std: std.toFixed(2) },
    }
  }
  if (band === 'stable') {
    return {
      statusKey: 'dryFire.feedback.hold.statusStable',
      tipKey: 'dryFire.feedback.hold.tipStable',
      severity: 'ok',
      params: { rms: rms.toFixed(2) },
    }
  }
  return {
    statusKey: 'dryFire.feedback.hold.statusElite',
    tipKey: 'dryFire.feedback.hold.tipElite',
    severity: 'ok',
    params: { rms: rms.toFixed(2) },
  }
}

/**
 * @param {{
 *   traceRadius?: number
 *   traceAverage?: number
 *   tracePeak?: number
 *   pathLength?: number
 *   points?: unknown[]
 * }} trace
 * @returns {AnalysisFeedback}
 */
export function resolveTraceFeedback(trace) {
  const pts = Array.isArray(trace?.points) ? trace.points.length : 0
  const radius = Number(trace?.traceRadius) || 0
  const avg = Number(trace?.traceAverage) || 0
  const peak = Number(trace?.tracePeak) || 0

  if (pts < 2) {
    return {
      statusKey: 'dryFire.feedback.trace.statusIdle',
      tipKey: 'dryFire.feedback.trace.tipIdle',
      severity: 'info',
    }
  }
  if (peak >= 2.5 || radius >= 2.2) {
    return {
      statusKey: 'dryFire.feedback.trace.statusWide',
      tipKey: 'dryFire.feedback.trace.tipWide',
      severity: 'crit',
      params: { peak: peak.toFixed(2), radius: radius.toFixed(2) },
    }
  }
  if (avg >= 1.0 || radius >= 1.2) {
    return {
      statusKey: 'dryFire.feedback.trace.statusDrift',
      tipKey: 'dryFire.feedback.trace.tipDrift',
      severity: 'warn',
      params: { avg: avg.toFixed(2), radius: radius.toFixed(2) },
    }
  }
  return {
    statusKey: 'dryFire.feedback.trace.statusTight',
    tipKey: 'dryFire.feedback.trace.tipTight',
    severity: 'ok',
    params: { avg: avg.toFixed(2) },
  }
}

/**
 * @param {{
 *   complete?: boolean
 *   capturingPost?: boolean
 *   triggerTimestamp?: number | null
 *   preCount?: number
 *   postCount?: number
 * }} shot
 * @param {{ holdCombinedRms?: number, holdQuality?: number }} [hold]
 * @returns {AnalysisFeedback}
 */
export function resolveShotEventFeedback(shot, hold) {
  if (shot?.capturingPost) {
    return {
      statusKey: 'dryFire.feedback.shot.statusCapturing',
      tipKey: 'dryFire.feedback.shot.tipCapturing',
      severity: 'info',
    }
  }
  if (!shot?.triggerTimestamp) {
    return {
      statusKey: 'dryFire.feedback.shot.statusIdle',
      tipKey: 'dryFire.feedback.shot.tipIdle',
      severity: 'info',
    }
  }
  if (!shot.complete) {
    return {
      statusKey: 'dryFire.feedback.shot.statusPartial',
      tipKey: 'dryFire.feedback.shot.tipPartial',
      severity: 'warn',
      params: { pre: shot.preCount ?? 0, post: shot.postCount ?? 0 },
    }
  }

  const rms = Number(hold?.holdCombinedRms) || 0
  const q = Number(hold?.holdQuality) || 0
  if (q < 55 || rms >= 1.6) {
    return {
      statusKey: 'dryFire.feedback.shot.statusFlinchHold',
      tipKey: 'dryFire.feedback.shot.tipFlinchHold',
      severity: 'crit',
    }
  }
  if (q < 75) {
    return {
      statusKey: 'dryFire.feedback.shot.statusBreath',
      tipKey: 'dryFire.feedback.shot.tipBreath',
      severity: 'warn',
    }
  }
  return {
    statusKey: 'dryFire.feedback.shot.statusClean',
    tipKey: 'dryFire.feedback.shot.tipClean',
    severity: 'ok',
  }
}

/**
 * @param {{
 *   shotCount?: number
 *   averageScore?: number
 *   consistency?: number
 *   grade?: string
 *   lastRecommendation?: string
 * }} session
 * @returns {AnalysisFeedback}
 */
export function resolveSessionFeedback(session) {
  const n = Number(session?.shotCount) || 0
  if (n < 1) {
    return {
      statusKey: 'dryFire.feedback.session.statusIdle',
      tipKey: 'dryFire.feedback.session.tipIdle',
      severity: 'info',
    }
  }
  const avg = Number(session?.averageScore) || 0
  const cons = Number(session?.consistency) || 0
  if (cons > 0 && cons < 55) {
    return {
      statusKey: 'dryFire.feedback.session.statusInconsistent',
      tipKey: 'dryFire.feedback.session.tipInconsistent',
      severity: 'warn',
      params: { consistency: cons.toFixed(0), avg: avg.toFixed(0) },
    }
  }
  if (avg < 60) {
    return {
      statusKey: 'dryFire.feedback.session.statusLow',
      tipKey: 'dryFire.feedback.session.tipLow',
      severity: 'crit',
      params: { avg: avg.toFixed(0), grade: session?.grade || '—' },
    }
  }
  if (avg >= 85 && cons >= 75) {
    return {
      statusKey: 'dryFire.feedback.session.statusStrong',
      tipKey: 'dryFire.feedback.session.tipStrong',
      severity: 'ok',
      params: { avg: avg.toFixed(0), grade: session?.grade || '—' },
    }
  }
  return {
    statusKey: 'dryFire.feedback.session.statusBuilding',
    tipKey: 'dryFire.feedback.session.tipBuilding',
    severity: 'info',
    params: { avg: avg.toFixed(0), n },
  }
}

/**
 * Radar / grupman paneli için kısa özet.
 * @param {{ avgFlinch?: number, groupRadius?: number, hitCount?: number }} group
 * @returns {AnalysisFeedback}
 */
export function resolveGroupingFeedback(group) {
  const n = Number(group?.hitCount) || 0
  if (n < 1) {
    return {
      statusKey: 'dryFire.feedback.group.statusIdle',
      tipKey: 'dryFire.feedback.group.tipIdle',
      severity: 'info',
    }
  }
  const flinch = Number(group?.avgFlinch) || 0
  const radius = Number(group?.groupRadius) || 0
  if (flinch >= 55 || radius >= 0.45) {
    return {
      statusKey: 'dryFire.feedback.group.statusOpen',
      tipKey: 'dryFire.feedback.group.tipOpen',
      severity: 'crit',
      params: { flinch: flinch.toFixed(0), radius: radius.toFixed(2) },
    }
  }
  if (flinch >= 30 || radius >= 0.25) {
    return {
      statusKey: 'dryFire.feedback.group.statusModerate',
      tipKey: 'dryFire.feedback.group.tipModerate',
      severity: 'warn',
      params: { flinch: flinch.toFixed(0) },
    }
  }
  return {
    statusKey: 'dryFire.feedback.group.statusTight',
    tipKey: 'dryFire.feedback.group.tipTight',
    severity: 'ok',
    params: { n },
  }
}
