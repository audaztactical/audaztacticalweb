import { serverTimestamp } from 'firebase/firestore'
import { invStr } from './inventoryIlws'
import { roundSuccessPercent } from './trainingSuccessScore'

/** @typedef {'atis' | 'cqb' | 'fof'} InstructorDisciplineKey */

export const INSTRUCTOR_DISCIPLINE_OPTIONS = [
  { id: /** @type {InstructorDisciplineKey} */ ('atis'), label: 'ATIŞ BECERİSİ' },
  { id: 'cqb', label: 'CQB (MESKÛN MAHAL)' },
  { id: 'fof', label: 'FoF (KARŞILIKLI ÇATIŞMA)' },
]

export const INSTRUCTOR_INFRACTION_OPTIONS = [
  { id: 'weapon_handling_error', label: 'SİLAH İŞLEME HATASI' },
  { id: 'cover_exposure', label: 'SIĞINAK İHLALİ / AÇIKTA KALMA' },
  { id: 'slow_muzzle_transition', label: 'YAVAŞ NAMLU GEÇİŞİ' },
]

/**
 * @param {{
 *   operatorId: string
 *   instructorId: string
 *   instructorName: string
 *   discipline: InstructorDisciplineKey
 *   score: number
 *   drillSeconds: number
 *   infractions: string[]
 *   commentary: string
 * }} input
 */
export function buildInstructorRangeLogPayload({
  operatorId,
  instructorId,
  instructorName,
  discipline,
  score,
  drillSeconds,
  infractions,
  commentary,
}) {
  const pct = roundSuccessPercent(score)
  const sec = Math.max(0, Number(drillSeconds) || 0)
  const note = invStr(commentary).trim()
  const errors = Array.isArray(infractions) ? infractions.filter((id) => invStr(id).trim()) : []
  const passed = pct >= 50

  const base = {
    source: 'instructor_manual',
    instructorAssessment: true,
    operatorId,
    instructorId,
    instructorName: invStr(instructorName).trim() || 'EĞİTMEN',
    operationCategory: discipline,
    discipline,
    successPercent: pct,
    success: passed,
    status: passed ? 'SUCCESS' : 'FAILURE',
    drillDurationSec: sec,
    clearingTimeSec: discipline === 'cqb' ? sec : null,
    tacticalErrors: errors,
    operationNote: note || null,
    instructorInfractionLabels: errors.map(
      (id) => INSTRUCTOR_INFRACTION_OPTIONS.find((o) => o.id === id)?.label ?? id,
    ),
    timestamp: serverTimestamp(),
    recordedAt: serverTimestamp(),
  }

  if (discipline === 'atis') {
    return {
      ...base,
      kind: 'ATIS_DRILL',
      shootType: 'INSTRUCTOR_ATIS',
      drillName: 'EĞİTMEN MANUEL ATIŞ DEĞERLENDİRMESİ',
      isabetOrani: pct,
      accuracy: pct,
      totalRoundsFired: 0,
      totalHits: 0,
    }
  }

  if (discipline === 'cqb') {
    return {
      ...base,
      kind: 'CQB_DRILL',
      roomTopology: 'EĞİTMEN DEĞERLENDİRMESİ',
      entryMethod: 'MANUEL',
      breachingType: 'MANUEL',
      doorState: '—',
      teamSize: '—',
      threatCount: 0,
      neutralizedCount: 0,
    }
  }

  return {
    ...base,
    kind: 'FOF_DRILL',
    scenarioType: 'EĞİTMEN MANUEL FoF DEĞERLENDİRMESİ',
    engagementRounds: 0,
    lethalHitsDelivered: 0,
    nonLethalHitsDelivered: 0,
  }
}

/**
 * @param {Record<string, unknown>} rangePayload
 */
export function buildInstructorAuditPayload(rangePayload) {
  return {
    ...rangePayload,
    auditType: 'instructor_assessment',
    createdAt: serverTimestamp(),
  }
}
