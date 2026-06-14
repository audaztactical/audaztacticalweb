import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import {
  filterOperatorVisibleTrainings,
  isOperatorSessionAccessible,
  isTrainingSessionExpired,
  normalizeAllowedGroups,
  activeExpiresAtThreshold,
  resolveSessionExpiresAt,
} from './groupTrainingSessionAccess'
import {
  buildGroupTrainingResultMessage,
  computeGroupTrainingAssessment,
} from './groupTrainingAssessment'
import { buildGroupTrainingLink, sendNotificationSafe } from '../services/notificationService'
import { fetchGroupById } from './firestoreGroups'
import { trainingResultToSyntheticLog } from './instructorGroupAnalytics'
import { db, isFirebaseConfigured } from './firebase'
import { safeOnSnapshot, timestampToMs } from './firestoreSnapshot'

/** @typedef {'active' | 'completed'} GroupTrainingStatus */

/**
 * @typedef {{
 *   id: string
 *   groupId: string
 *   instructorId: string
 *   templateId: string | null
 *   trainingName: string
 *   level: string
 *   isTimed: boolean
 *   targetTimeSec?: number | null
 *   totalAmmo: number
 *   minPassScore: number
 *   createdAt?: unknown
 *   status: GroupTrainingStatus
 *   allowedGroups?: string[]
 *   expiresAt?: unknown
 * }} GroupTraining
 */

/**
 * @typedef {{
 *   id: string
 *   trainingId: string
 *   groupId: string
 *   operatorId: string
 *   operatorName: string
 *   hits: number
 *   time?: number | null
 *   isPassed: boolean
 *   hitsPassed?: boolean
 *   timePassed?: boolean
 *   statusResult?: import('./groupTrainingAssessment').GroupTrainingStatusResult | string
 *   isTimed?: boolean
 *   targetTimeSec?: number | null
 *   submittedAt?: unknown
 * }} TrainingResult
 */

function assertDb() {
  if (!isFirebaseConfigured() || !db) {
    const e = new Error('Firebase yapılandırılmadı')
    e.code = 'failed-precondition'
    throw e
  }
}

/**
 * @param {unknown} raw
 * @returns {GroupTraining | null}
 */
export function mapGroupTrainingDoc(raw, docId) {
  if (!raw || typeof raw !== 'object') return null
  const d = /** @type {Record<string, unknown>} */ (raw)
  const totalAmmo = Math.max(1, Number(d.totalAmmo) || 1)
  const minPassScore = Math.min(totalAmmo, Math.max(0, Number(d.minPassScore) || 0))
  const status = d.status === 'completed' ? 'completed' : 'active'
  const groupId = String(d.groupId ?? '')
  const allowedGroups = normalizeAllowedGroups(d.allowedGroups)
  return {
    id: typeof d.id === 'string' ? d.id : docId,
    groupId,
    instructorId: String(d.instructorId ?? ''),
    templateId: typeof d.templateId === 'string' && d.templateId.trim() ? d.templateId.trim() : null,
    trainingName: String(d.trainingName ?? 'Grup Eğitimi'),
    level: String(d.level ?? '').trim() || '—',
    isTimed: Boolean(d.isTimed),
    targetTimeSec:
      d.targetTimeSec != null && d.targetTimeSec !== '' && Number.isFinite(Number(d.targetTimeSec))
        ? Math.max(0, Number(d.targetTimeSec))
        : null,
    totalAmmo,
    minPassScore,
    createdAt: d.createdAt,
    status,
    allowedGroups: allowedGroups.length > 0 ? allowedGroups : groupId ? [groupId] : [],
    expiresAt: d.expiresAt ?? null,
  }
}

/**
 * @param {unknown} raw
 * @returns {TrainingResult | null}
 */
export function mapTrainingResultDoc(raw, docId) {
  if (!raw || typeof raw !== 'object') return null
  const d = /** @type {Record<string, unknown>} */ (raw)
  const hits = Math.max(0, Number(d.hits) || 0)
  const minPassScore = Math.max(0, Number(d.minPassScore) || 0)
  const totalAmmo = Math.max(hits, minPassScore, Number(d.totalAmmo) || 0)
  const isTimed = Boolean(d.isTimed)
  const targetTimeSec =
    d.targetTimeSec != null && d.targetTimeSec !== '' && Number.isFinite(Number(d.targetTimeSec))
      ? Math.max(0, Number(d.targetTimeSec))
      : null
  const timeVal = d.time
  const time = timeVal == null || timeVal === '' ? null : Math.max(0, Number(timeVal) || 0)

  const storedStatus =
    typeof d.statusResult === 'string' && d.statusResult.trim() ? d.statusResult.trim() : undefined

  const assessment = computeGroupTrainingAssessment({
    totalAmmo,
    minPassScore,
    hits,
    isTimed,
    targetTimeSec,
    time,
  })

  const canEvaluateTime = isTimed && targetTimeSec != null && targetTimeSec > 0
  const isPassed =
    storedStatus || canEvaluateTime
      ? assessment.isPassed
      : typeof d.isPassed === 'boolean'
        ? d.isPassed
        : assessment.isPassed

  return {
    id: typeof d.id === 'string' ? d.id : docId,
    trainingId: String(d.trainingId ?? ''),
    groupId: String(d.groupId ?? ''),
    operatorId: String(d.operatorId ?? ''),
    operatorName: String(d.operatorName ?? 'Operatör'),
    hits,
    time,
    isPassed,
    hitsPassed:
      typeof d.hitsPassed === 'boolean' ? d.hitsPassed : assessment.hitsPassed,
    timePassed:
      typeof d.timePassed === 'boolean' ? d.timePassed : assessment.timePassed,
    statusResult: storedStatus ?? assessment.statusResult,
    isTimed,
    targetTimeSec,
    submittedAt: d.submittedAt,
  }
}

/**
 * Eğitmen yeni grup eğitimi açar.
 * @param {{
 *   groupId: string
 *   instructorId: string
 *   templateId?: string | null
 *   trainingName: string
 *   level?: string
 *   isTimed: boolean
 *   totalAmmo: number
 *   minPassScore: number
 *   allowedGroups?: string[]
 *   sessionDurationHours?: number
 *   sessionDurationMinutes?: number
 *   expiryDate?: string | Date | null
 * }} input
 */
export async function createGroupTraining(input) {
  assertDb()
  const groupId = String(input.groupId ?? '').trim()
  const instructorId = String(input.instructorId ?? '').trim()
  const trainingName = String(input.trainingName ?? '').trim()
  const level = String(input.level ?? '').trim() || '—'
  const templateId =
    typeof input.templateId === 'string' && input.templateId.trim() ? input.templateId.trim() : null
  if (!groupId || !instructorId || !trainingName) {
    const e = new Error('Grup, eğitmen ve eğitim adı zorunludur.')
    e.code = 'failed-precondition'
    throw e
  }

  const allowedGroups = normalizeAllowedGroups(input.allowedGroups)
  const resolvedAllowedGroups = allowedGroups.length > 0 ? allowedGroups : [groupId]
  const expiresAt = resolveSessionExpiresAt(input)

  const totalAmmo = Math.max(1, Math.min(999, Number(input.totalAmmo) || 1))
  const minPassScore = Math.min(totalAmmo, Math.max(0, Number(input.minPassScore) || 0))
  const timed = Boolean(input.isTimed)
  const targetRaw = input.targetTimeSec
  const targetTimeSec =
    timed && targetRaw != null && targetRaw !== ''
      ? Math.max(0.01, Number(targetRaw) || 0)
      : null

  const ref = doc(collection(db, 'group_trainings'))
  const payload = {
    id: ref.id,
    groupId,
    instructorId,
    templateId,
    trainingName,
    level,
    isTimed: timed,
    targetTimeSec,
    totalAmmo,
    minPassScore,
    status: /** @type {GroupTrainingStatus} */ ('active'),
    allowedGroups: resolvedAllowedGroups,
    expiresAt,
    createdAt: serverTimestamp(),
  }
  await setDoc(ref, payload)

  const group = await fetchGroupById(groupId)
  const members = Array.isArray(group?.members) ? group.members : []
  await Promise.all(
    members
      .filter((memberUid) => typeof memberUid === 'string' && memberUid !== instructorId)
      .map((memberUid) =>
        sendNotificationSafe({
          recipientId: memberUid,
          senderId: instructorId,
          type: 'TRAINING',
          title: 'Yeni grup eğitimi',
          message: `"${trainingName}" eğitimi aktif — antrenman modülünden katılın.`,
          link: buildGroupTrainingLink(ref.id),
          targetId: ref.id,
        }),
      ),
  )

  return { ...payload, createdAt: null, expiresAt }
}

/** @type {Set<string>} */
const expiringTrainingIds = new Set()

/**
 * Süresi dolmuş aktif oturumları arka planda kapatır.
 * @param {GroupTraining[]} trainings
 */
export async function closeExpiredGroupTrainings(trainings) {
  const expiredActive = trainings.filter(
    (t) => t.status === 'active' && isTrainingSessionExpired(t) && !expiringTrainingIds.has(t.id),
  )
  if (!expiredActive.length) return

  await Promise.all(
    expiredActive.map(async (training) => {
      expiringTrainingIds.add(training.id)
      try {
        await completeGroupTraining(training.id)
      } catch {
        expiringTrainingIds.delete(training.id)
      }
    }),
  )
}

/**
 * groupId veya allowedGroups üzerinden oturumları birleştirir.
 * @param {string} groupId
 * @param {(rows: GroupTraining[]) => void} onData
 * @param {(err: unknown) => void} [onError]
 * @param {{ nonExpiredOnly?: boolean }} [opts]
 */
function subscribeMergedGroupTrainings(groupId, onData, onError, opts = {}) {
  const { nonExpiredOnly = true } = opts
  const now = activeExpiresAtThreshold()

  /** @type {GroupTraining[]} */
  let primaryRows = []
  /** @type {GroupTraining[]} */
  let allowedRows = []

  const emit = () => {
    const byId = new Map()
    ;[...primaryRows, ...allowedRows].forEach((row) => {
      if (row) byId.set(row.id, row)
    })
    const rows = [...byId.values()].sort(
      (a, b) => timestampToMs(b.createdAt) - timestampToMs(a.createdAt),
    )
    onData(rows)
  }

  const qPrimary = nonExpiredOnly
    ? query(
        collection(db, 'group_trainings'),
        where('groupId', '==', groupId),
        where('expiresAt', '>', now),
      )
    : query(collection(db, 'group_trainings'), where('groupId', '==', groupId))

  const qAllowed = nonExpiredOnly
    ? query(
        collection(db, 'group_trainings'),
        where('allowedGroups', 'array-contains', groupId),
        where('expiresAt', '>', now),
      )
    : query(
        collection(db, 'group_trainings'),
        where('allowedGroups', 'array-contains', groupId),
      )

  const unsubPrimary = safeOnSnapshot(
    qPrimary,
    (snap) => {
      primaryRows = snap.docs
        .map((d) => mapGroupTrainingDoc(d.data(), d.id))
        .filter(Boolean)
      emit()
    },
    (err) => onError?.(err),
  )

  const unsubAllowed = safeOnSnapshot(
    qAllowed,
    (snap) => {
      allowedRows = snap.docs
        .map((d) => mapGroupTrainingDoc(d.data(), d.id))
        .filter(Boolean)
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
 * Grubun aktif eğitimlerini getirir.
 * @param {string} groupId
 * @returns {Promise<GroupTraining[]>}
 */
export async function fetchActiveGroupTrainings(groupId) {
  assertDb()
  const gid = String(groupId ?? '').trim()
  if (!gid) return []

  const now = activeExpiresAtThreshold()
  const [primarySnap, allowedSnap] = await Promise.all([
    getDocs(
      query(
        collection(db, 'group_trainings'),
        where('groupId', '==', gid),
        where('expiresAt', '>', now),
      ),
    ),
    getDocs(
      query(
        collection(db, 'group_trainings'),
        where('allowedGroups', 'array-contains', gid),
        where('expiresAt', '>', now),
      ),
    ),
  ])

  const byId = new Map()
  ;[...primarySnap.docs, ...allowedSnap.docs].forEach((d) => {
    const row = mapGroupTrainingDoc(d.data(), d.id)
    if (row && row.status === 'active') byId.set(row.id, row)
  })

  return [...byId.values()].sort((a, b) => timestampToMs(b.createdAt) - timestampToMs(a.createdAt))
}

/**
 * Aktif grup eğitimlerini canlı dinler (operatör listesi).
 * @param {string} groupId
 * @param {(trainings: GroupTraining[]) => void} onData
 * @param {(err: unknown) => void} [onError]
 */
/**
 * Grubun tüm grup eğitimlerini canlı dinler (aktif + tamamlanan).
 * @param {string} groupId
 * @param {(trainings: GroupTraining[]) => void} onData
 * @param {(err: unknown) => void} [onError]
 */
export function subscribeGroupTrainings(groupId, onData, onError) {
  if (!isFirebaseConfigured() || !db) {
    onData([])
    return () => {}
  }
  const gid = String(groupId ?? '').trim()
  if (!gid) {
    onData([])
    return () => {}
  }

  return subscribeMergedGroupTrainings(
    gid,
    (rows) => {
      onData(rows)
      void closeExpiredGroupTrainings(rows)
    },
    onError,
    { nonExpiredOnly: true },
  )
}

/**
 * Tek grup eğitimini kimliğe göre getirir.
 * @param {string} trainingId
 * @returns {Promise<GroupTraining | null>}
 */
export async function fetchGroupTrainingById(trainingId) {
  assertDb()
  const id = String(trainingId ?? '').trim()
  if (!id) return null

  const snap = await getDoc(doc(db, 'group_trainings', id))
  if (!snap.exists()) return null
  return mapGroupTrainingDoc(snap.data(), snap.id)
}

/**
 * Operatör deep-link / güvenlik: grup + süre kontrolü.
 * @param {string} trainingId
 * @param {string | null | undefined} operatorGroupId
 * @returns {Promise<GroupTraining | null>}
 */
export async function fetchGroupTrainingForOperator(trainingId, operatorGroupId) {
  const training = await fetchGroupTrainingById(trainingId)
  if (!training) return null
  if (!isOperatorSessionAccessible(training, operatorGroupId)) return null
  return training
}

export function subscribeActiveGroupTrainings(groupId, onData, onError) {
  if (!isFirebaseConfigured() || !db) {
    onData([])
    return () => {}
  }
  const gid = String(groupId ?? '').trim()
  if (!gid) {
    onData([])
    return () => {}
  }

  return subscribeMergedGroupTrainings(
    gid,
    (rows) => {
      const active = rows.filter((row) => row.status === 'active')
      onData(active)
      void closeExpiredGroupTrainings(rows)
    },
    onError,
    { nonExpiredOnly: true },
  )
}

/**
 * Eğitmen — seçili grubun aktif eğitimlerini dinler.
 * @param {string} groupId
 * @param {string} instructorId
 */
export function subscribeInstructorActiveGroupTrainings(groupId, instructorId, onData, onError) {
  return subscribeActiveGroupTrainings(groupId, (rows) => {
    onData(rows.filter((t) => t.instructorId === instructorId))
  }, onError)
}

/**
 * Oturum kapanınca training_results → group_activity_logs arşivi (analitik feed).
 * @param {string} trainingId
 */
async function archiveGroupTrainingResultsToActivityLogs(trainingId) {
  assertDb()
  const id = String(trainingId ?? '').trim()
  if (!id) return

  const training = await fetchGroupTrainingById(id)
  if (!training) return

  const q = query(collection(db, 'training_results'), where('trainingId', '==', id))
  const snap = await getDocs(q)

  await Promise.all(
    snap.docs.map(async (resultDoc) => {
      const result = mapTrainingResultDoc(resultDoc.data(), resultDoc.id)
      if (!result) return

      const synthetic = trainingResultToSyntheticLog(result, training)
      const archiveId = `archive-${result.id}`
      const ref = doc(db, 'group_activity_logs', archiveId)
      await setDoc(
        ref,
        {
          ...synthetic,
          logId: archiveId,
          archivedFromTraining: id,
          timestamp: result.submittedAt ?? serverTimestamp(),
        },
        { merge: true },
      )
    }),
  )
}

/**
 * Eğitimi tamamlandı olarak işaretler.
 * @param {string} trainingId
 */
export async function completeGroupTraining(trainingId) {
  assertDb()
  const id = String(trainingId ?? '').trim()
  if (!id) return
  await archiveGroupTrainingResultsToActivityLogs(id)
  await updateDoc(doc(db, 'group_trainings', id), { status: 'completed' })
}

/**
 * Operatör sonuç gönderir.
 * @param {{
 *   training: GroupTraining
 *   operatorId: string
 *   operatorName: string
 *   hits: number
 *   time?: number | null
 * }} input
 */
export async function submitTrainingResult(input) {
  assertDb()
  const training = input.training
  const operatorId = String(input.operatorId ?? '').trim()
  if (!training?.id || !operatorId) {
    const e = new Error('Eğitim ve operatör kimliği gerekli.')
    e.code = 'failed-precondition'
    throw e
  }

  if (training.status !== 'active') {
    const e = new Error('Bu oturum artık aktif değil.')
    e.code = 'failed-precondition'
    throw e
  }
  if (isTrainingSessionExpired(training)) {
    const e = new Error('Oturum süresi dolmuş — sonuç gönderilemez.')
    e.code = 'failed-precondition'
    throw e
  }

  const totalAmmo = training.totalAmmo
  const hits = Math.min(totalAmmo, Math.max(0, Number(input.hits) || 0))
  const minPassScore = training.minPassScore

  let time = null
  if (training.isTimed) {
    const t = Number(input.time)
    if (!Number.isFinite(t) || t < 0) {
      const e = new Error('Zamanlı eğitimde süre (saniye) zorunludur.')
      e.code = 'failed-precondition'
      throw e
    }
    time = t
  }

  const assessment = computeGroupTrainingAssessment({
    totalAmmo,
    minPassScore,
    hits,
    isTimed: training.isTimed,
    targetTimeSec: training.targetTimeSec,
    time,
  })

  const operatorName = String(input.operatorName ?? 'Operatör').trim() || 'Operatör'

  const ref = doc(collection(db, 'training_results'))
  const payload = {
    id: ref.id,
    trainingId: training.id,
    groupId: training.groupId,
    operatorId,
    operatorName,
    hits,
    time,
    totalAmmo,
    minPassScore,
    isTimed: training.isTimed,
    targetTimeSec: training.targetTimeSec ?? null,
    hitsPassed: assessment.hitsPassed,
    timePassed: assessment.timePassed,
    statusResult: assessment.statusResult,
    isPassed: assessment.isPassed,
    submittedAt: serverTimestamp(),
  }
  await setDoc(ref, payload)

  const resultMessage = buildGroupTrainingResultMessage({
    trainingName: training.trainingName,
    hits,
    totalAmmo,
    time,
    isTimed: training.isTimed,
    statusResult: assessment.statusResult,
    isPassed: assessment.isPassed,
  })

  await Promise.all([
    sendNotificationSafe({
      recipientId: operatorId,
      senderId: training.instructorId,
      type: 'SYSTEM',
      title: 'Grup eğitimi sonucunuz',
      message: resultMessage,
      link: buildGroupTrainingLink(training.id),
      targetId: training.id,
    }),
    training.instructorId && training.instructorId !== operatorId
      ? sendNotificationSafe({
          recipientId: training.instructorId,
          senderId: operatorId,
          type: 'SYSTEM',
          title: 'Yeni grup eğitimi sonucu',
          message: `${operatorName}: ${resultMessage}`,
          link: buildGroupTrainingLink(training.id),
          targetId: training.id,
        })
      : Promise.resolve(null),
  ])

  return payload
}

/**
 * Eğitim sonuçlarını canlı dinler (eğitmen HUD).
 * @param {string} trainingId
 * @param {(results: TrainingResult[]) => void} onData
 * @param {(err: unknown) => void} [onError]
 */
export function subscribeTrainingResults(trainingId, onData, onError) {
  if (!isFirebaseConfigured() || !db) {
    onData([])
    return () => {}
  }
  const tid = String(trainingId ?? '').trim()
  if (!tid) {
    onData([])
    return () => {}
  }

  const q = query(collection(db, 'training_results'), where('trainingId', '==', tid))

  return safeOnSnapshot(
    q,
    (snap) => {
      const rows = snap.docs
        .map((d) => mapTrainingResultDoc(d.data(), d.id))
        .filter(Boolean)
        .sort((a, b) => timestampToMs(b.submittedAt) - timestampToMs(a.submittedAt))
      onData(rows)
    },
    (err) => onError?.(err),
  )
}

/**
 * Operatörün bu eğitime daha önce gönderdiği sonucu var mı?
 * @param {string} trainingId
 * @param {string} operatorId
 */
/**
 * Grubun tüm eğitim sonuçlarını canlı dinler (salt okunur operatör görünümü).
 * @param {string} groupId
 * @param {(results: TrainingResult[]) => void} onData
 * @param {(err: unknown) => void} [onError]
 */
export function subscribeGroupTrainingResults(groupId, onData, onError) {
  if (!isFirebaseConfigured() || !db) {
    onData([])
    return () => {}
  }
  const gid = String(groupId ?? '').trim()
  if (!gid) {
    onData([])
    return () => {}
  }

  const q = query(collection(db, 'training_results'), where('groupId', '==', gid))

  return safeOnSnapshot(
    q,
    (snap) => {
      const rows = snap.docs
        .map((d) => mapTrainingResultDoc(d.data(), d.id))
        .filter(Boolean)
        .sort((a, b) => timestampToMs(b.submittedAt) - timestampToMs(a.submittedAt))
      onData(rows)
    },
    (err) => onError?.(err),
  )
}

export async function fetchOperatorTrainingResult(trainingId, operatorId) {
  assertDb()
  const q = query(
    collection(db, 'training_results'),
    where('trainingId', '==', String(trainingId)),
    where('operatorId', '==', String(operatorId)),
  )
  const snap = await getDocs(q)
  if (snap.empty) return null
  const d = snap.docs[0]
  return mapTrainingResultDoc(d.data(), d.id)
}
