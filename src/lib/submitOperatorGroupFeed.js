import { collection, doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db, isFirebaseConfigured } from './firebase'
import { invNum, invStr } from './inventoryIlws'
import { TRAINING_TYPE_GROUP } from './trainingGroupFields'

/**
 * @param {Record<string, unknown>} payload
 */
function resolveDiscipline(payload) {
  const cat = invStr(payload.operationCategory).toLowerCase()
  if (cat) return cat
  const kind = invStr(payload.kind).toUpperCase()
  if (kind.includes('ATIS')) return 'atis'
  if (kind.includes('CQB')) return 'cqb'
  if (kind.includes('FOF')) return 'fof'
  if (kind.includes('VBSS')) return 'vbss'
  if (kind.includes('TCCC')) return 'tccc'
  if (kind.includes('TRAINING') || kind.includes('EGITIM')) return 'egitim'
  return 'atis'
}

/**
 * @param {Record<string, unknown>} payload
 */
function resolveDrillName(payload) {
  return (
    invStr(payload.drillName).trim() ||
    invStr(payload.scenarioType).trim() ||
    invStr(payload.shootType).trim() ||
    invStr(payload.roomTopology).trim() ||
    invStr(payload.trainingFocusLabel).trim() ||
    invStr(payload.kind).trim() ||
    'Grup Eğitimi'
  )
}

/**
 * @param {Record<string, unknown>} payload
 */
function resolveScore(payload) {
  const accuracy = invNum(payload.accuracy ?? payload.isabetOrani ?? payload.successPercent)
  if (Number.isFinite(accuracy) && accuracy >= 0) return Math.round(accuracy)
  const rounds = Math.max(1, invNum(payload.totalRoundsFired ?? payload.roundsTotal ?? payload.engagementRounds) || 1)
  const hits = Math.max(0, invNum(payload.totalHits ?? payload.hits ?? payload.lethalHitsDelivered) || 0)
  return Math.round((Math.min(rounds, hits) / rounds) * 100)
}

/**
 * @param {Record<string, unknown>} payload
 */
function resolveDuration(payload) {
  const td = payload.timingData
  if (td && typeof td === 'object' && td.total != null) {
    const n = invNum(td.total)
    if (Number.isFinite(n) && n >= 0) return n
  }
  const clearing = invNum(payload.clearingTimeSec ?? payload.drillDurationSec)
  if (Number.isFinite(clearing) && clearing >= 0) return clearing
  return null
}

/**
 * Operatör GROUP kaydı sonrası eğitmen paneli özet feed'i.
 * @param {{
 *   groupId: string
 *   instructorId: string
 *   operatorId: string
 *   groupName?: string | null
 *   sourceDomain: 'range_logs' | 'trainings'
 *   sourceLogId: string
 *   payload: Record<string, unknown>
 * }} input
 */
export async function writeOperatorGroupActivityFeed(input) {
  if (!isFirebaseConfigured() || !db) return null

  const { groupId, instructorId, operatorId, sourceLogId, payload } = input
  if (!groupId || !instructorId || !operatorId || !sourceLogId) return null

  const discipline = resolveDiscipline(payload)
  const drillName = resolveDrillName(payload)
  const score = resolveScore(payload)
  const duration = resolveDuration(payload)
  const operationNote = invStr(payload.operationNote).trim()

  const ref = doc(collection(db, 'group_activity_logs'))
  const feed = {
    logId: ref.id,
    groupId,
    instructorId,
    operatorId,
    templateId: `operator-${sourceLogId}`,
    type: 'operator_group_feed',
    trainingType: TRAINING_TYPE_GROUP,
    sourceDomain: input.sourceDomain,
    sourceLogId,
    operatorSubmitted: true,
    discipline,
    drillName,
    score,
    accuracyPercent: score,
    successPercent: score,
    duration,
    isTimed: duration != null,
    instructorNotes: operationNote || null,
    groupName: input.groupName ?? null,
    kind: payload.kind ?? null,
    operationCategory: payload.operationCategory ?? discipline,
    statusResult: score >= 50 ? 'BAŞARILI' : 'BAŞARISIZ',
    passed: score >= 50,
    timestamp: serverTimestamp(),
  }

  await setDoc(ref, feed)
  return { logId: ref.id, feed }
}
