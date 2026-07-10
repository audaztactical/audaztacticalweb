import i18n from '../i18n'
import { instructorT } from './instructorDisplayText'

/** @typedef {'BAŞARILI' | 'YETERSİZ İSABET' | 'SÜRE İHLALİ'} GroupTrainingStatusResult */

/**
 * @param {{
 *   totalAmmo?: number
 *   minPassScore?: number
 *   hits?: number
 *   isTimed?: boolean
 *   targetTimeSec?: number | null
 *   time?: number | null
 * }} input
 */
export function computeGroupTrainingAssessment(input) {
  const totalAmmo = Math.max(1, Number(input.totalAmmo) || 1)
  const minPassScore = Math.min(totalAmmo, Math.max(0, Number(input.minPassScore) || 0))
  const hits = Math.min(totalAmmo, Math.max(0, Number(input.hits) || 0))
  const isTimed = Boolean(input.isTimed)
  const targetRaw = input.targetTimeSec
  const targetTimeSec =
    targetRaw != null && targetRaw !== '' && Number.isFinite(Number(targetRaw))
      ? Math.max(0, Number(targetRaw))
      : null
  const time =
    input.time != null && input.time !== '' && Number.isFinite(Number(input.time))
      ? Math.max(0, Number(input.time))
      : null

  const hitsPassed = hits >= minPassScore
  const timePassed =
    !isTimed || targetTimeSec == null || targetTimeSec <= 0 || (time != null && time <= targetTimeSec)
  const isPassed = hitsPassed && timePassed

  /** @type {GroupTrainingStatusResult} */
  let statusResult = 'BAŞARILI'
  if (!isPassed) {
    statusResult = !hitsPassed ? 'YETERSİZ İSABET' : 'SÜRE İHLALİ'
  }

  return {
    totalAmmo,
    minPassScore,
    hits,
    isTimed,
    targetTimeSec,
    time,
    hitsPassed,
    timePassed,
    isPassed,
    statusResult,
  }
}

/**
 * @param {string} [lng]
 * @returns {'tr' | 'en'}
 */
function resolveLng(lng) {
  if (lng === 'en' || lng === 'tr') return lng
  return i18n.language?.startsWith('en') ? 'en' : 'tr'
}

/**
 * @param {GroupTrainingStatusResult | string | undefined} statusResult
 * @param {boolean} [isPassed]
 * @param {string} [lng]
 * @returns {string}
 */
export function formatGroupTrainingStatusLabel(statusResult, isPassed = false, lng) {
  const language = resolveLng(lng)
  if (isPassed || statusResult === 'BAŞARILI') {
    return i18n.t('sectors.grup-egitimi.assessment.passed', { ns: 'training', lng: language })
  }
  if (statusResult === 'SÜRE İHLALİ') {
    return i18n.t('sectors.grup-egitimi.assessment.timeFailed', { ns: 'training', lng: language })
  }
  return i18n.t('sectors.grup-egitimi.assessment.failed', { ns: 'training', lng: language })
}

/**
 * @param {GroupTrainingStatusResult | string | undefined} statusResult
 * @param {boolean} [isPassed]
 * @returns {string}
 */
export function formatGroupTrainingStatusLabelInstructor(statusResult, isPassed = false) {
  if (isPassed || statusResult === 'BAŞARILI') return instructorT('status.passed')
  if (statusResult === 'SÜRE İHLALİ') return instructorT('status.timeFailed')
  return instructorT('status.failed')
}

/** @typedef {'open' | 'closed_for_me' | 'completed'} OperatorTrainingSessionKey */

/**
 * Operatörün oturum görünüm durumu (global tamamlanma + bireysel katılım).
 * Display labels: use formatGroupTrainingSessionStatusDisplay(key) in UI.
 * @param {{ status?: string, id: string }} training
 * @param {{ trainingId: string, operatorId: string }[]} results
 * @param {string} operatorId
 */
export function getOperatorTrainingSessionStatus(training, results, operatorId) {
  const participated = results.some(
    (r) => r.trainingId === training.id && r.operatorId === operatorId,
  )

  if (training.status === 'completed') {
    return { key: /** @type {OperatorTrainingSessionKey} */ ('completed') }
  }

  if (participated) {
    return { key: /** @type {OperatorTrainingSessionKey} */ ('closed_for_me') }
  }

  return { key: /** @type {OperatorTrainingSessionKey} */ ('open') }
}

/**
 * @param {OperatorTrainingSessionKey} key
 */
export function getOperatorSessionStatusStyles(key) {
  if (key === 'open') {
    return {
      row: 'border-lime-500/35 bg-lime-950/15 hover:border-lime-500/55',
      rowSelected: 'border-lime-500/55 bg-lime-950/25 ring-1 ring-lime-500/30',
      badge: 'border-lime-500/40 bg-lime-950/30 text-lime-400',
      text: 'text-lime-400',
    }
  }

  if (key === 'closed_for_me') {
    return {
      row: 'border-zinc-700/55 bg-zinc-950/70 hover:border-zinc-600/70',
      rowSelected: 'border-zinc-600/70 bg-zinc-900/80 ring-1 ring-zinc-600/40',
      badge: 'border-zinc-600/50 bg-zinc-900/80 text-zinc-400',
      text: 'text-zinc-400',
    }
  }

  return {
    row: 'border-slate-700/45 bg-slate-950/45 hover:border-slate-600/55',
    rowSelected: 'border-slate-600/60 bg-slate-900/55 ring-1 ring-slate-600/35',
    badge: 'border-slate-600/45 bg-slate-900/60 text-app-text/55',
    text: 'text-app-text/55',
  }
}

/**
 * Push / in-app notification body for a group training result.
 * Uses recipient language when `lng` is provided (default: current i18n / TR).
 * @param {{
 *   trainingName: string
 *   hits: number
 *   totalAmmo: number
 *   time?: number | null
 *   isTimed?: boolean
 *   statusResult?: string
 *   isPassed?: boolean
 * }} input
 * @param {string} [lng]
 * @returns {string}
 */
export function buildGroupTrainingResultMessage(input, lng) {
  const language = resolveLng(lng)
  const label = formatGroupTrainingStatusLabel(input.statusResult, input.isPassed, language)
  const timePart =
    input.isTimed && input.time != null
      ? i18n.t('sectors.grup-egitimi.push.timePart', {
          ns: 'training',
          lng: language,
          time: input.time,
        })
      : ''
  const reasonPart =
    input.statusResult === 'SÜRE İHLALİ'
      ? i18n.t('sectors.grup-egitimi.push.reasonOverTime', { ns: 'training', lng: language })
      : input.statusResult === 'YETERSİZ İSABET'
        ? i18n.t('sectors.grup-egitimi.push.reasonUnderHits', { ns: 'training', lng: language })
        : ''

  return i18n.t('sectors.grup-egitimi.push.resultBody', {
    ns: 'training',
    lng: language,
    trainingName: input.trainingName,
    hits: input.hits,
    totalAmmo: input.totalAmmo,
    hitsUnit: i18n.t('sectors.grup-egitimi.push.hitsUnit', { ns: 'training', lng: language }),
    timePart,
    label,
    reasonPart,
  })
}
