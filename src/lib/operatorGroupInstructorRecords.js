import { computeGroupLogHitPercent } from './groupActivityHud'

/** @typedef {import('./firestoreGroupTraining').GroupActivityLog} GroupActivityLog */
/** @typedef {import('./firestoreGroupTraining').GroupTrainingDiscipline} GroupTrainingDiscipline */

/**
 * Eğitmen tarafından girilen akademik kayıtlar (operatör feed hariç).
 * @param {GroupActivityLog[]} logs
 * @param {GroupTrainingDiscipline} discipline
 */
export function filterInstructorGroupActivityLogs(logs, discipline) {
  return logs.filter(
    (log) =>
      log.type === 'group_drill' &&
      log.discipline === discipline &&
      log.type !== 'operator_group_feed',
  )
}

/**
 * @param {unknown} ts
 */
export function formatRecordTimestamp(ts) {
  if (ts && typeof ts === 'object' && 'toDate' in ts && typeof ts.toDate === 'function') {
    return ts.toDate().toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })
  }
  const ms = Date.parse(String(ts ?? ''))
  if (!ms) return '—'
  return new Date(ms).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })
}

/**
 * @param {GroupActivityLog} log
 */
export function formatInstructorRecordSummary(log) {
  const pct = computeGroupLogHitPercent(log)
  if (log.discipline === 'atis') {
    const shots = Math.max(1, log.atisShotsFired || log.criticalMetrics?.totalRounds || 1)
    const hits = Math.min(shots, Math.max(0, log.atisHits ?? log.score))
    return `${hits}/${shots} · %${pct}`
  }
  if (log.discipline === 'cqb') {
    const total = Math.max(1, log.cqbTotalThreats || log.criticalMetrics?.totalThreats || 1)
    const elim = Math.min(total, log.eliminatedThreats ?? log.score ?? 0)
    return `${elim}/${total} tehdit · %${pct}`
  }
  return `%${pct}`
}

/**
 * @param {GroupActivityLog} log
 */
export function collectInstructorRecordNotes(log) {
  const notes = []
  const main = String(log.instructorNotes ?? '').trim()
  if (main) notes.push(main)

  const infractions = [
    ...(Array.isArray(log.rejectionReasons) ? log.rejectionReasons : []),
    ...(Array.isArray(log.instructorInfractions) ? log.instructorInfractions : []),
    ...(Array.isArray(log.infractions) ? log.infractions : []),
  ].filter((x, i, arr) => typeof x === 'string' && x.trim() && arr.indexOf(x) === i)

  return { notes, infractions }
}
