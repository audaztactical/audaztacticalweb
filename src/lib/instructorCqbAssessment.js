import { collectInstructorInfractions } from './instructorCqbMatrix'

/**
 * @param {import('./firestoreGroupTraining').GroupCriticalMetrics | Record<string, unknown>} cm
 */
export function normalizeCqbDrillBaselines(cm) {
  const raw = cm && typeof cm === 'object' ? cm : {}
  const totalThreats = Math.max(1, Number(raw.totalThreats ?? raw.totalRounds) || 1)
  const maxTargetSeconds = Math.max(0, Number(raw.maxTargetSeconds ?? raw.maxSeconds) || 0)
  return {
    targetType: typeof raw.targetType === 'string' ? raw.targetType : 'CQB ODA',
    maxSeconds: maxTargetSeconds,
    maxTargetSeconds,
    maxAllowedSeconds: maxTargetSeconds,
    totalRounds: totalThreats,
    totalThreats,
  }
}

/**
 * @param {{
 *   tehditSayisi: number
 *   etkisizAlinan: number
 *   temizlikSuresi?: number | null
 *   maxAllowedSeconds?: number
 *   isTimed?: boolean
 *   infractionFlags?: Record<string, boolean>
 * }} input
 */
export function computeCqbMissionAssessment(input) {
  const tehditSayisi = Math.max(1, Number(input.tehditSayisi) || 1)
  const etkisizAlinan = Math.min(tehditSayisi, Math.max(0, Number(input.etkisizAlinan) || 0))
  const isTimed = input.isTimed !== false
  const maxAllowedSeconds = Math.max(0, Number(input.maxAllowedSeconds) || 0)
  const temizlikSuresi =
    isTimed && input.temizlikSuresi != null && Number.isFinite(Number(input.temizlikSuresi))
      ? Math.max(0, Number(input.temizlikSuresi))
      : null

  const instructorInfractions = collectInstructorInfractions(input.infractionFlags ?? {})
  const rejectionReasons = [...instructorInfractions]

  const threatsCleared = etkisizAlinan === tehditSayisi
  const isTimeValid =
    !isTimed || maxAllowedSeconds <= 0 || (temizlikSuresi != null && temizlikSuresi <= maxAllowedSeconds)

  const statusResult =
    threatsCleared && instructorInfractions.length === 0 && isTimeValid ? 'BAŞARILI' : 'BAŞARISIZ'

  return {
    tehditSayisi,
    etkisizAlinan,
    temizlikSuresi,
    maxAllowedSeconds,
    instructorInfractions,
    rejectionReasons,
    isThreatCleared: threatsCleared,
    hasNoTacticalViolations: instructorInfractions.length === 0,
    isTimeValid,
    statusResult,
    cqbSuccessStatus: statusResult,
  }
}
