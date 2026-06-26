import { collection, query, where } from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../../../lib/firebase'
import { mapGroupTrainingDoc } from '../../../lib/firestoreGroupTrainings'
import { safeOnSnapshot, timestampToMs } from '../../../lib/firestoreSnapshot'

/** @typedef {import('../../../lib/firestoreGroupTrainings').GroupTraining} GroupTraining */
/** @typedef {import('../../../lib/firestoreGroupTrainings').TrainingResult} TrainingResult */

/**
 * @param {unknown} ts
 */
export function timestampToDisplayMs(ts) {
  return timestampToMs(ts)
}

/**
 * @param {unknown} ts
 */
export function formatAtisSessionTimestamp(ts) {
  const ms = timestampToDisplayMs(ts)
  if (!ms) return '—'
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(ms))
}

/**
 * @param {GroupTraining} training
 * @param {TrainingResult[]} results
 */
export function resultsForTraining(training, results) {
  return results.filter((r) => r.trainingId === training.id)
}

/**
 * Vuruş / mühimmat yüzdesi ortalaması (tüm katılımcılar).
 * @param {GroupTraining} training
 * @param {TrainingResult[]} results
 */
export function computeSessionHitPercentAverage(training, results) {
  const rows = resultsForTraining(training, results)
  if (!rows.length) return 0
  const ammo = Math.max(1, training.totalAmmo || 1)
  const sum = rows.reduce((acc, r) => acc + (Math.min(ammo, Math.max(0, r.hits)) / ammo) * 100, 0)
  return Math.round((sum / rows.length) * 10) / 10
}

/**
 * @param {GroupTraining} training
 * @param {TrainingResult[]} results
 */
export function resolveSessionClosedAtMs(training, results) {
  const rows = resultsForTraining(training, results)
  let maxMs = 0
  for (const row of rows) {
    const ms = timestampToDisplayMs(row.submittedAt)
    if (ms > maxMs) maxMs = ms
  }
  if (maxMs) return maxMs
  return timestampToDisplayMs(training.expiresAt)
}

/**
 * @param {GroupTraining} training
 * @param {TrainingResult[]} results
 */
export function computeSessionDetailStats(training, results) {
  const rows = resultsForTraining(training, results)
  const ammo = Math.max(1, training.totalAmmo || 1)
  const percents = rows.map((r) => Math.round((Math.min(ammo, Math.max(0, r.hits)) / ammo) * 1000) / 10)

  if (!percents.length) {
    return { highest: 0, lowest: 0, average: 0 }
  }

  const sum = percents.reduce((a, b) => a + b, 0)
  return {
    highest: Math.max(...percents),
    lowest: Math.min(...percents),
    average: Math.round((sum / percents.length) * 10) / 10,
  }
}

/**
 * @param {string} groupId
 * @param {(rows: GroupTraining[]) => void} onData
 * @param {(err: unknown) => void} [onError]
 */
function subscribeGroupCompletedTrainings(groupId, onData, onError) {
  if (!isFirebaseConfigured() || !db || !groupId) {
    onData([])
    return () => {}
  }

  /** @type {GroupTraining[]} */
  let primaryRows = []
  /** @type {GroupTraining[]} */
  let allowedRows = []

  const emit = () => {
    const byId = new Map()
    ;[...primaryRows, ...allowedRows].forEach((row) => {
      if (row?.id && row.status === 'completed') byId.set(row.id, row)
    })
    const rows = [...byId.values()].sort(
      (a, b) => timestampToDisplayMs(b.createdAt) - timestampToDisplayMs(a.createdAt),
    )
    onData(rows)
  }

  const qPrimary = query(
    collection(db, 'group_trainings'),
    where('groupId', '==', groupId),
    where('status', '==', 'completed'),
  )

  const qAllowed = query(
    collection(db, 'group_trainings'),
    where('allowedGroups', 'array-contains', groupId),
    where('status', '==', 'completed'),
  )

  const unsubPrimary = safeOnSnapshot(
    qPrimary,
    (snap) => {
      primaryRows = snap.docs.map((d) => mapGroupTrainingDoc(d.data(), d.id)).filter(Boolean)
      emit()
    },
    (err) => onError?.(err),
  )

  const unsubAllowed = safeOnSnapshot(
    qAllowed,
    (snap) => {
      allowedRows = snap.docs.map((d) => mapGroupTrainingDoc(d.data(), d.id)).filter(Boolean)
      emit()
    },
    (err) => onError?.(err),
  )

  return () => {
    try {
      unsubPrimary()
    } catch {
      /* ignore */
    }
    try {
      unsubAllowed()
    } catch {
      /* ignore */
    }
  }
}

/**
 * Eğitmenin tüm grupları için birleşik tamamlanmış oturum feed'i.
 * @param {string[]} groupIds
 * @param {string} instructorId
 * @param {(rows: GroupTraining[]) => void} onData
 * @param {(err: unknown) => void} [onError]
 */
export function subscribeInstructorCompletedGroupTrainings(groupIds, instructorId, onData, onError) {
  if (!isFirebaseConfigured() || !db || !groupIds.length) {
    onData([])
    return () => {}
  }

  const instructorUid = String(instructorId ?? '').trim()
  /** @type {Map<string, GroupTraining[]>} */
  const buckets = new Map()

  const emitMerged = () => {
    const byId = new Map()
    for (const rows of buckets.values()) {
      for (const row of rows) {
        if (row?.id && row.instructorId === instructorUid) byId.set(row.id, row)
      }
    }
    const merged = [...byId.values()].sort(
      (a, b) => timestampToDisplayMs(b.createdAt) - timestampToDisplayMs(a.createdAt),
    )
    onData(merged)
  }

  const unsubs = groupIds.map((groupId) =>
    subscribeGroupCompletedTrainings(
      groupId,
      (rows) => {
        buckets.set(groupId, rows)
        emitMerged()
      },
      onError,
    ),
  )

  return () => {
    unsubs.forEach((off) => {
      try {
        off()
      } catch {
        /* ignore */
      }
    })
  }
}
