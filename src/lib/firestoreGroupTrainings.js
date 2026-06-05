import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
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
  return {
    id: typeof d.id === 'string' ? d.id : docId,
    groupId: String(d.groupId ?? ''),
    instructorId: String(d.instructorId ?? ''),
    templateId: typeof d.templateId === 'string' && d.templateId.trim() ? d.templateId.trim() : null,
    trainingName: String(d.trainingName ?? 'Grup Eğitimi'),
    level: String(d.level ?? '').trim() || '—',
    isTimed: Boolean(d.isTimed),
    totalAmmo,
    minPassScore,
    createdAt: d.createdAt,
    status,
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
  const minPass = Number(d.minPassScore)
  const isPassed =
    typeof d.isPassed === 'boolean'
      ? d.isPassed
      : !Number.isNaN(minPass)
        ? hits >= minPass
        : Boolean(d.isPassed)
  const timeVal = d.time
  return {
    id: typeof d.id === 'string' ? d.id : docId,
    trainingId: String(d.trainingId ?? ''),
    groupId: String(d.groupId ?? ''),
    operatorId: String(d.operatorId ?? ''),
    operatorName: String(d.operatorName ?? 'Operatör'),
    hits,
    time: timeVal == null || timeVal === '' ? null : Math.max(0, Number(timeVal) || 0),
    isPassed,
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
    createdAt: serverTimestamp(),
  }
  await setDoc(ref, payload)
  return { ...payload, createdAt: null }
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

  const q = query(collection(db, 'group_trainings'), where('groupId', '==', gid))
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => mapGroupTrainingDoc(d.data(), d.id))
    .filter((row) => row && row.status === 'active')
    .sort((a, b) => timestampToMs(b.createdAt) - timestampToMs(a.createdAt))
}

/**
 * Aktif grup eğitimlerini canlı dinler (operatör listesi).
 * @param {string} groupId
 * @param {(trainings: GroupTraining[]) => void} onData
 * @param {(err: unknown) => void} [onError]
 */
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

  const q = query(collection(db, 'group_trainings'), where('groupId', '==', gid))

  return safeOnSnapshot(
    q,
    (snap) => {
      const rows = snap.docs
        .map((d) => mapGroupTrainingDoc(d.data(), d.id))
        .filter((row) => row && row.status === 'active')
        .sort((a, b) => timestampToMs(b.createdAt) - timestampToMs(a.createdAt))
      onData(rows)
    },
    (err) => onError?.(err),
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
 * Eğitimi tamamlandı olarak işaretler.
 * @param {string} trainingId
 */
export async function completeGroupTraining(trainingId) {
  assertDb()
  const id = String(trainingId ?? '').trim()
  if (!id) return
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

  const totalAmmo = training.totalAmmo
  const hits = Math.min(totalAmmo, Math.max(0, Number(input.hits) || 0))
  const minPassScore = training.minPassScore
  const isPassed = hits >= minPassScore

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

  const ref = doc(collection(db, 'training_results'))
  const payload = {
    id: ref.id,
    trainingId: training.id,
    groupId: training.groupId,
    operatorId,
    operatorName: String(input.operatorName ?? 'Operatör').trim() || 'Operatör',
    hits,
    time,
    minPassScore,
    isPassed,
    submittedAt: serverTimestamp(),
  }
  await setDoc(ref, payload)
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
