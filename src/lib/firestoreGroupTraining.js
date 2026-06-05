import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from './firebase'
import { safeOnSnapshot } from './firestoreSnapshot'

/** @typedef {'atis' | 'cqb' | 'fof' | 'vbss' | 'tccc' | 'egitim'} GroupTrainingDiscipline */

/**
 * @typedef {{
 *   targetType: string
 *   maxSeconds: number
 *   totalRounds: number
 *   totalAmmo?: number
 *   requiredHits?: number
 *   totalThreats?: number
 *   maxTargetSeconds?: number
 * }} GroupCriticalMetrics
 */

/**
 * @typedef {{
 *   templateId: string
 *   groupId: string
 *   instructorId: string
 *   discipline: GroupTrainingDiscipline
 *   drillName: string
 *   drillLevel?: number
 *   drillKey?: string
 *   isCustom?: boolean
 *   criticalMetrics: GroupCriticalMetrics
 *   isTimed?: boolean
 *   createdAt?: unknown
 * }} GroupTrainingTemplate
 */

/**
 * @typedef {{
 *   logId: string
 *   groupId: string
 *   operatorId: string
 *   templateId: string
 *   instructorId: string
 *   type: 'group_drill'
 *   score: number
 *   duration: number
 *   instructorNotes: string
 *   discipline: GroupTrainingDiscipline
 *   drillName: string
 *   criticalMetrics: GroupCriticalMetrics
 *   isTimed?: boolean
 *   timestamp?: unknown
 * }} GroupActivityLog
 */

export const GROUP_TRAINING_DISCIPLINE_OPTIONS = [
  { id: /** @type {GroupTrainingDiscipline} */ ('atis'), label: 'ATIŞ' },
  { id: 'cqb', label: 'CQB' },
  { id: 'fof', label: 'FoF' },
]

/**
 * @param {Record<string, unknown>} raw
 * @returns {GroupCriticalMetrics}
 */
export function normalizeCriticalMetrics(raw) {
  const cm = raw && typeof raw === 'object' ? raw : {}
  const totalAmmo = Math.max(1, Number(cm.totalAmmo ?? cm.totalRounds) || 1)
  const requiredHits = Math.min(
    totalAmmo,
    Math.max(1, Number(cm.requiredHits) || Math.ceil(totalAmmo * 0.6)),
  )
  return {
    targetType: typeof cm.targetType === 'string' ? cm.targetType : '',
    maxSeconds: Math.max(0, Number(cm.maxSeconds) || 0),
    totalRounds: totalAmmo,
    totalAmmo,
    requiredHits,
  }
}

/**
 * @param {Record<string, unknown>} raw
 * @returns {GroupCriticalMetrics}
 */
export function normalizeCqbCriticalMetrics(raw) {
  const cm = raw && typeof raw === 'object' ? raw : {}
  const totalThreats = Math.max(1, Number(cm.totalThreats ?? cm.totalRounds) || 1)
  const maxTargetSeconds = Math.max(0, Number(cm.maxTargetSeconds ?? cm.maxSeconds) || 0)
  return {
    targetType: typeof cm.targetType === 'string' ? cm.targetType : 'CQB ODA',
    maxSeconds: maxTargetSeconds,
    maxTargetSeconds,
    totalRounds: totalThreats,
    totalThreats,
  }
}

function assertDb() {
  if (!isFirebaseConfigured() || !db) {
    const e = new Error('Firebase yapılandırılmadı')
    e.code = 'failed-precondition'
    throw e
  }
}

/**
 * @param {unknown} raw
 * @returns {GroupTrainingDiscipline}
 */
export function normalizeGroupDiscipline(raw) {
  const s = String(raw ?? '').toLowerCase().trim()
  if (s === 'vbss' || s.includes('vbss') || s.includes('gemi')) return 'vbss'
  if (s === 'tccc' || s.includes('tccc') || s.includes('sihhiye')) return 'tccc'
  if (s === 'egitim' || s.includes('egitim') || s.includes('akademik')) return 'egitim'
  if (s === 'cqb' || s.includes('cqb') || s.includes('meskun')) return 'cqb'
  if (s === 'fof' || s.includes('fof')) return 'fof'
  return 'atis'
}

/**
 * @param {import('firebase/firestore').QueryDocumentSnapshot} snap
 */
function mapTemplateDoc(snap) {
  const d = snap.data()
  const cm = d.criticalMetrics && typeof d.criticalMetrics === 'object' ? d.criticalMetrics : {}
  return {
    templateId: snap.id,
    groupId: typeof d.groupId === 'string' ? d.groupId : '',
    instructorId: typeof d.instructorId === 'string' ? d.instructorId : '',
    discipline: normalizeGroupDiscipline(d.discipline),
    drillName: typeof d.drillName === 'string' ? d.drillName : '',
    drillLevel: Number(d.drillLevel) || 1,
    drillKey: typeof d.drillKey === 'string' ? d.drillKey : '',
    isCustom: d.isCustom === true,
    isTimed: d.isTimed !== false,
    criticalMetrics: normalizeCriticalMetrics(cm),
    createdAt: d.createdAt ?? null,
  }
}

/**
 * @param {import('firebase/firestore').QueryDocumentSnapshot} snap
 */
function mapActivityDoc(snap) {
  const d = snap.data()
  const cm = d.criticalMetrics && typeof d.criticalMetrics === 'object' ? d.criticalMetrics : {}
  return {
    logId: snap.id,
    groupId: typeof d.groupId === 'string' ? d.groupId : '',
    operatorId: typeof d.operatorId === 'string' ? d.operatorId : '',
    templateId: typeof d.templateId === 'string' ? d.templateId : '',
    instructorId: typeof d.instructorId === 'string' ? d.instructorId : '',
    type: typeof d.type === 'string' ? d.type : 'group_drill',
    trainingType: typeof d.trainingType === 'string' ? d.trainingType : '',
    operatorSubmitted: d.operatorSubmitted === true,
    sourceDomain: typeof d.sourceDomain === 'string' ? d.sourceDomain : '',
    sourceLogId: typeof d.sourceLogId === 'string' ? d.sourceLogId : '',
    groupName: typeof d.groupName === 'string' ? d.groupName : '',
    score: Number(d.score) || 0,
    atisShotsFired: Number(d.atisShotsFired) || 0,
    atisHits: Number(d.atisHits) || 0,
    accuracyPercent: Number(d.accuracyPercent) || 0,
    isTimed: d.isTimed !== false,
    duration: d.isTimed === false || d.duration == null ? null : Number(d.duration) || 0,
    instructorNotes: typeof d.instructorNotes === 'string' ? d.instructorNotes : '',
    infractions: Array.isArray(d.infractions) ? d.infractions.filter((x) => typeof x === 'string') : [],
    discipline: normalizeGroupDiscipline(d.discipline),
    drillName: typeof d.drillName === 'string' ? d.drillName : '',
    drillLevel: Number(d.drillLevel) || 1,
    drillKey: typeof d.drillKey === 'string' ? d.drillKey : '',
    criticalMetrics: normalizeCriticalMetrics(cm),
    isTargetMet: d.isTargetMet === true,
    statusResult: typeof d.statusResult === 'string' ? d.statusResult : '',
    cqbSuccessStatus: typeof d.cqbSuccessStatus === 'string' ? d.cqbSuccessStatus : '',
    isThreatCleared: d.isThreatCleared === true,
    hasNoTacticalViolations: d.hasNoTacticalViolations === true,
    isTimeValid: d.isTimeValid === true,
    eliminatedThreats: Number(d.eliminatedThreats) || 0,
    cqbTotalThreats: Number(d.cqbTotalThreats) || 0,
    rejectionReasons: Array.isArray(d.rejectionReasons)
      ? d.rejectionReasons.filter((x) => typeof x === 'string')
      : [],
    cqbInfractions:
      d.cqbInfractions && typeof d.cqbInfractions === 'object' ? d.cqbInfractions : null,
    instructorInfractions: Array.isArray(d.instructorInfractions)
      ? d.instructorInfractions.filter((x) => typeof x === 'string')
      : [],
    cqbSetup: d.cqbSetup && typeof d.cqbSetup === 'object' ? d.cqbSetup : null,
    roomTopology: typeof d.roomTopology === 'string' ? d.roomTopology : '',
    entryMethod: typeof d.entryMethod === 'string' ? d.entryMethod : '',
    breachingType: typeof d.breachingType === 'string' ? d.breachingType : '',
    doorState: typeof d.doorState === 'string' ? d.doorState : '',
    maxAllowedSeconds: Number(d.maxAllowedSeconds) || 0,
    timestamp: d.timestamp ?? d.createdAt ?? null,
  }
}

/**
 * @param {{
 *   instructorId: string
 *   groupId: string
 *   discipline: GroupTrainingDiscipline
 *   drillName: string
 *   targetType?: string
 *   maxSeconds: number
 *   totalRounds?: number
 *   totalAmmo?: number
 *   requiredHits?: number
 *   totalThreats?: number
 *   maxTargetSeconds?: number
 *   drillLevel?: number
 *   drillKey?: string
 *   isCustom?: boolean
 *   isTimed?: boolean
 * }} input
 */
export async function createGroupTrainingTemplate(input) {
  assertDb()
  const { instructorId, groupId } = input
  if (!instructorId || !groupId) throw new Error('Grup ve eğitmen kimliği gerekli')

  const name = String(input.drillName ?? '').trim()
  if (!name) throw new Error('Drill adı zorunlu')

  const drillLevel = Math.min(3, Math.max(1, Number(input.drillLevel) || 1))
  const discipline = normalizeGroupDiscipline(input.discipline)
  const isTimed = input.isTimed !== false

  /** @type {GroupCriticalMetrics} */
  let criticalMetrics
  if (discipline === 'cqb') {
    const totalThreats = Math.max(1, Number(input.totalThreats ?? input.totalRounds) || 1)
    criticalMetrics = normalizeCqbCriticalMetrics({
      targetType: String(input.targetType ?? 'CQB ODA').trim(),
      maxTargetSeconds: isTimed ? Math.max(0, Number(input.maxTargetSeconds ?? input.maxSeconds) || 0) : 0,
      totalThreats,
    })
  } else {
    const totalAmmo = Math.max(1, Number(input.totalAmmo ?? input.totalRounds) || 1)
    const requiredHits = Number(input.requiredHits) || 0
    if (requiredHits > totalAmmo) {
      throw new Error('Geçer vuruş sayısı mühimmat sayısından fazla olamaz')
    }
    if (requiredHits < 1) throw new Error('Geçer vuruş sayısı en az 1 olmalı')
    criticalMetrics = normalizeCriticalMetrics({
      targetType: String(input.targetType ?? 'IPSC / Silüet').trim(),
      maxSeconds: isTimed === false ? 0 : Math.max(0, Number(input.maxSeconds) || 0),
      totalAmmo,
      requiredHits,
    })
  }

  const ref = doc(collection(db, 'group_training_templates'))
  const payload = {
    templateId: ref.id,
    groupId,
    instructorId,
    discipline,
    drillName: name,
    drillLevel,
    drillKey: typeof input.drillKey === 'string' ? input.drillKey : `custom-${ref.id}`,
    isCustom: input.isCustom !== false,
    isTimed,
    criticalMetrics,
    createdAt: serverTimestamp(),
  }

  await setDoc(ref, payload)
  return { ...payload, templateId: ref.id }
}

/**
 * @param {string} groupId
 * @param {(templates: GroupTrainingTemplate[]) => void} onTemplates
 * @param {(error: unknown) => void} [onError]
 */
export function subscribeGroupTrainingTemplates(groupId, onTemplates, onError) {
  if (!isFirebaseConfigured() || !db || !groupId) return () => {}

  const q = query(
    collection(db, 'group_training_templates'),
    where('groupId', '==', groupId),
    orderBy('createdAt', 'desc'),
  )

  return safeOnSnapshot(
    q,
    (snap) => {
      const templates = snap.docs.map(mapTemplateDoc)
      onTemplates(templates)
    },
    (err) => onError?.(err),
  )
}

/**
 * @param {{
 *   groupId: string
 *   operatorId: string
 *   templateId: string
 *   instructorId: string
 *   score: number
 *   duration: number
 *   instructorNotes?: string
 *   template: GroupTrainingTemplate
 * }} input
 */
export async function submitGroupActivityLog(input) {
  assertDb()
  const { groupId, operatorId, templateId, instructorId, template } = input
  if (!groupId || !operatorId || !templateId || !instructorId) {
    throw new Error('Grup, operatör ve şablon gerekli')
  }

  const score = Math.max(0, Number(input.score) || 0)
  const duration = Math.max(0, Number(input.duration) || 0)
  const rounds = template.criticalMetrics.totalRounds || 1
  if (score > rounds) throw new Error(`Vuruş sayısı en fazla ${rounds} olabilir`)

  const ref = doc(collection(db, 'group_activity_logs'))
  const payload = {
    logId: ref.id,
    groupId,
    operatorId,
    templateId,
    instructorId,
    type: 'group_drill',
    score,
    duration,
    instructorNotes: String(input.instructorNotes ?? '').trim(),
    discipline: template.discipline,
    drillName: template.drillName,
    criticalMetrics: { ...template.criticalMetrics },
    timestamp: serverTimestamp(),
  }

  await setDoc(ref, payload)
  return { ...payload, logId: ref.id }
}

/**
 * ATIŞ sektörü — atış sayısı / isabet / süre ile grup akademik kaydı.
 * @param {{
 *   groupId: string
 *   operatorId: string
 *   instructorId: string
 *   templateId: string
 *   drillName: string
 *   drillKey?: string
 *   drillLevel?: number
 *   criticalMetrics: GroupCriticalMetrics
 *   totalAmmo: number
 *   requiredHits: number
 *   actualHits: number
 *   duration?: number | null
 *   isTimed?: boolean
 *   accuracyPercentage: number
 *   isTargetMet: boolean
 *   statusResult: string
 *   instructorNotes?: string
 * }} input
 */
export async function submitGroupAtisActivityLog(input) {
  assertDb()
  const { groupId, operatorId, instructorId, templateId } = input
  if (!groupId || !operatorId || !instructorId || !templateId) {
    throw new Error('Grup, operatör ve drill seçimi gerekli')
  }

  const totalAmmo = Math.max(1, Number(input.totalAmmo) || 1)
  const actualHits = Math.min(totalAmmo, Math.max(0, Number(input.actualHits) || 0))
  const isTimed = input.isTimed !== false
  const duration = isTimed ? Math.max(0, Number(input.duration) || 0) : null
  if (isTimed && (duration == null || !Number.isFinite(duration))) {
    throw new Error('Süreli drill için geçen süre zorunlu')
  }

  const ref = doc(collection(db, 'group_activity_logs'))
  const payload = {
    logId: ref.id,
    groupId,
    operatorId,
    templateId,
    instructorId,
    type: 'group_drill',
    discipline: 'atis',
    drillName: String(input.drillName ?? '').trim(),
    drillKey: typeof input.drillKey === 'string' ? input.drillKey : '',
    drillLevel: Math.min(3, Math.max(1, Number(input.drillLevel) || 1)),
    score: actualHits,
    atisShotsFired: totalAmmo,
    atisHits: actualHits,
    accuracyPercent: Number(input.accuracyPercentage) || 0,
    isTargetMet: input.isTargetMet === true,
    statusResult: String(input.statusResult ?? '').trim(),
    isTimed,
    duration,
    instructorNotes: String(input.instructorNotes ?? '').trim(),
    criticalMetrics: normalizeCriticalMetrics(input.criticalMetrics),
    timestamp: serverTimestamp(),
  }

  await setDoc(ref, payload)
  return { ...payload, logId: ref.id }
}

/**
 * CQB sektörü — tehdit temizleme, süre ve taktik ihlal kaydı.
 * @param {{
 *   groupId: string
 *   operatorId: string
 *   instructorId: string
 *   templateId: string
 *   drillName: string
 *   drillKey?: string
 *   drillLevel?: number
 *   criticalMetrics: GroupCriticalMetrics
 *   totalThreats: number
 *   eliminatedThreats: number
 *   duration?: number | null
 *   isTimed?: boolean
 *   isThreatCleared: boolean
 *   hasNoTacticalViolations: boolean
 *   isTimeValid: boolean
 *   cqbSuccessStatus?: string
 *   statusResult: string
 *   rejectionReasons: string[]
 *   instructorInfractions: string[]
 *   cqbInfractions?: Record<string, boolean>
 *   cqbSetup?: Record<string, string>
 *   roomTopology?: string
 *   entryMethod?: string
 *   breachingType?: string
 *   doorState?: string
 *   maxAllowedSeconds?: number
 *   instructorNotes?: string
 * }} input
 */
export async function submitGroupCqbActivityLog(input) {
  assertDb()
  const { groupId, operatorId, instructorId } = input
  if (!groupId || !operatorId || !instructorId) {
    throw new Error('Grup ve operatör seçimi gerekli')
  }

  const totalThreats = Math.max(1, Number(input.totalThreats) || 1)
  const eliminatedThreats = Math.min(totalThreats, Math.max(0, Number(input.eliminatedThreats) || 0))
  const isTimed = input.isTimed !== false
  const duration = isTimed ? Math.max(0, Number(input.duration) || 0) : null
  if (isTimed && (duration == null || !Number.isFinite(duration))) {
    throw new Error('Süreli CQB drill için temizlik süresi zorunlu')
  }

  const instructorInfractions = Array.isArray(input.instructorInfractions)
    ? input.instructorInfractions.filter((x) => typeof x === 'string')
    : []
  const rejectionReasons = Array.isArray(input.rejectionReasons)
    ? input.rejectionReasons.filter((x) => typeof x === 'string')
    : instructorInfractions

  const statusResult = String(input.statusResult ?? input.cqbSuccessStatus ?? '').trim()
  const templateId = String(input.templateId ?? 'cqb-audit-v2').trim()

  const ref = doc(collection(db, 'group_activity_logs'))
  const payload = {
    logId: ref.id,
    groupId,
    operatorId,
    templateId,
    instructorId,
    type: 'group_drill',
    discipline: 'cqb',
    drillName: String(input.drillName ?? '').trim(),
    drillKey: typeof input.drillKey === 'string' ? input.drillKey : 'cqb-audit',
    drillLevel: Math.min(3, Math.max(1, Number(input.drillLevel) || 1)),
    score: eliminatedThreats,
    eliminatedThreats,
    cqbTotalThreats: totalThreats,
    tehditSayisi: totalThreats,
    etkisizAlinan: eliminatedThreats,
    temizlikSuresi: duration,
    maxAllowedSeconds: Math.max(0, Number(input.maxAllowedSeconds) || 0),
    isThreatCleared: input.isThreatCleared === true,
    hasNoTacticalViolations: input.hasNoTacticalViolations === true,
    isTimeValid: input.isTimeValid === true,
    statusResult,
    cqbSuccessStatus: statusResult,
    instructorInfractions,
    rejectionReasons,
    cqbInfractions: input.cqbInfractions ?? {},
    infractions: rejectionReasons,
    cqbSetup: input.cqbSetup ?? null,
    roomTopology: String(input.roomTopology ?? '').trim(),
    entryMethod: String(input.entryMethod ?? '').trim(),
    breachingType: String(input.breachingType ?? '').trim(),
    doorState: String(input.doorState ?? '').trim(),
    isTimed,
    duration,
    instructorNotes: String(input.instructorNotes ?? '').trim(),
    criticalMetrics: normalizeCqbCriticalMetrics({
      ...input.criticalMetrics,
      totalThreats,
      maxTargetSeconds: input.maxAllowedSeconds ?? input.criticalMetrics?.maxTargetSeconds,
    }),
    timestamp: serverTimestamp(),
  }

  await setDoc(ref, payload)
  return { ...payload, logId: ref.id }
}

/**
 * Şablonsuz doğrudan eğitim kaydı (Eğitim sekmesi).
 * @param {{
 *   groupId: string
 *   operatorId: string
 *   instructorId: string
 *   discipline: GroupTrainingDiscipline
 *   drillName: string
 *   score: number
 *   duration: number
 *   totalRounds?: number
 *   maxSeconds?: number
 *   targetType?: string
 *   infractions?: string[]
 *   instructorNotes?: string
 * }} input
 */
export async function submitGroupActivityLogDirect(input) {
  assertDb()
  const { groupId, operatorId, instructorId } = input
  if (!groupId || !operatorId || !instructorId) {
    throw new Error('Grup, operatör ve eğitmen gerekli')
  }

  const drillName = String(input.drillName ?? '').trim()
  if (!drillName) throw new Error('Drill adı zorunlu')

  const score = Math.max(0, Number(input.score) || 0)
  const duration = Math.max(0, Number(input.duration) || 0)
  const totalRounds = Math.max(1, Number(input.totalRounds) || 10)
  if (score > totalRounds) throw new Error(`Vuruş sayısı en fazla ${totalRounds} olabilir`)

  const infractions = Array.isArray(input.infractions)
    ? input.infractions.filter((x) => typeof x === 'string' && x.trim())
    : []

  const ref = doc(collection(db, 'group_activity_logs'))
  const payload = {
    logId: ref.id,
    groupId,
    operatorId,
    templateId: 'manual',
    instructorId,
    type: 'group_drill',
    score,
    duration,
    instructorNotes: String(input.instructorNotes ?? '').trim(),
    infractions,
    discipline: normalizeGroupDiscipline(input.discipline),
    drillName,
    criticalMetrics: {
      targetType: String(input.targetType ?? '').trim(),
      maxSeconds: Math.max(0, Number(input.maxSeconds) || 0),
      totalRounds,
    },
    timestamp: serverTimestamp(),
  }

  await setDoc(ref, payload)
  return { ...payload, logId: ref.id }
}

/**
 * FoF eğitmen terminali değerlendirmesi → group_activity_logs.
 * @param {{
 *   groupId: string
 *   operatorId: string
 *   instructorId: string
 *   scenarioType: string
 *   oodaCycle: number
 *   tacticalCommunication: number
 *   coverManagement: number
 *   hitStatus: string
 *   penalties: Record<string, boolean>
 *   finalScore: number
 *   passed: boolean
 *   instantFail: boolean
 *   failReason?: string | null
 *   aarNotes?: string
 * }} input
 */
export async function submitGroupFofActivityLog(input) {
  assertDb()
  const { groupId, operatorId, instructorId } = input
  if (!groupId || !operatorId || !instructorId) {
    throw new Error('Grup ve operatör seçimi gerekli')
  }

  const finalScore = Math.max(0, Math.min(100, Math.round(Number(input.finalScore) || 0)))
  const scenarioType = String(input.scenarioType ?? '').trim() || 'FoF Senaryo'
  const penalties = input.penalties && typeof input.penalties === 'object' ? input.penalties : {}
  const activePenalties = Object.entries(penalties)
    .filter(([, v]) => v === true)
    .map(([k]) => k)

  const ref = doc(collection(db, 'group_activity_logs'))
  const payload = {
    logId: ref.id,
    groupId,
    operatorId,
    templateId: 'fof-instructor-terminal',
    instructorId,
    type: 'group_drill',
    discipline: 'fof',
    drillName: scenarioType,
    drillKey: 'fof-instructor-v1',
    scenarioType,
    score: finalScore,
    finalScore,
    accuracyPercent: finalScore,
    successPercent: finalScore,
    passed: input.passed === true,
    instantFail: input.instantFail === true,
    failReason: input.failReason ?? null,
    statusResult: finalScore >= 50 && !input.instantFail ? 'BAŞARILI' : 'BAŞARISIZ',
    oodaCycle: Math.min(5, Math.max(1, Number(input.oodaCycle) || 3)),
    tacticalCommunication: Math.min(5, Math.max(1, Number(input.tacticalCommunication) || 3)),
    coverManagement: Math.min(5, Math.max(1, Number(input.coverManagement) || 3)),
    hitStatus: String(input.hitStatus ?? 'TEMİZ'),
    fofPenalties: penalties,
    infractions: activePenalties,
    instructorInfractions: activePenalties,
    rejectionReasons: input.instantFail && input.failReason ? [String(input.failReason)] : activePenalties,
    instructorNotes: String(input.aarNotes ?? '').trim(),
    isTimed: false,
    duration: null,
    criticalMetrics: {
      targetType: scenarioType,
      maxSeconds: 0,
      totalRounds: 0,
    },
    timestamp: serverTimestamp(),
  }

  await setDoc(ref, payload)
  return { ...payload, logId: ref.id }
}

/**
 * @param {string} groupId
 * @param {number} [maxEntries]
 */
export async function fetchGroupActivityLogsByGroup(groupId, maxEntries = 200) {
  assertDb()
  if (!groupId) return []

  const q = query(
    collection(db, 'group_activity_logs'),
    where('groupId', '==', groupId),
    orderBy('timestamp', 'desc'),
    limit(maxEntries),
  )
  const snap = await getDocs(q)
  return snap.docs.map(mapActivityDoc)
}

/**
 * @param {string} groupId
 * @param {(logs: GroupActivityLog[]) => void} onLogs
 * @param {(error: unknown) => void} [onError]
 */
export function subscribeGroupActivityLogs(groupId, onLogs, onError) {
  if (!isFirebaseConfigured() || !db || !groupId) return () => {}

  const q = query(
    collection(db, 'group_activity_logs'),
    where('groupId', '==', groupId),
    orderBy('timestamp', 'desc'),
    limit(200),
  )

  return safeOnSnapshot(
    q,
    (snap) => onLogs(snap.docs.map(mapActivityDoc)),
    (err) => onError?.(err),
  )
}

/**
 * @param {unknown} ts
 */
function resolveActivityLogMs(ts) {
  if (ts && typeof ts === 'object' && 'toMillis' in ts && typeof ts.toMillis === 'function') {
    return ts.toMillis()
  }
  return Date.parse(String(ts ?? '')) || 0
}

/**
 * @param {import('./firestoreGroupTraining').GroupActivityLog[]} logs
 */
export function filterOperatorGroupTrainingLogs(logs) {
  return logs.filter(
    (log) =>
      log.trainingType === 'GROUP' ||
      log.type === 'operator_group_feed' ||
      log.operatorSubmitted === true,
  )
}

/**
 * Eğitmenin tüm grupları için birleşik gerçek zamanlı aktivite feed'i.
 * @param {string[]} groupIds
 * @param {(logs: GroupActivityLog[]) => void} onLogs
 * @param {(error: unknown) => void} [onError]
 */
export function subscribeInstructorMergedGroupActivityLogs(groupIds, onLogs, onError) {
  if (!isFirebaseConfigured() || !db || !groupIds.length) {
    onLogs([])
    return () => {}
  }

  /** @type {Map<string, GroupActivityLog[]>} */
  const buckets = new Map()

  const emitMerged = () => {
    const merged = [...buckets.values()].flat()
    merged.sort((a, b) => resolveActivityLogMs(b.timestamp) - resolveActivityLogMs(a.timestamp))
    onLogs(merged.slice(0, 240))
  }

  const unsubs = groupIds.map((groupId) =>
    subscribeGroupActivityLogs(
      groupId,
      (logs) => {
        buckets.set(groupId, logs)
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
