/**
 * @param {{
 *   totalAmmo: number
 *   requiredHits: number
 *   actualHits: number
 *   isTimed: boolean
 *   durationSeconds?: number | null
 *   maxPassingSeconds?: number
 * }} input
 */
export function computeAtisTacticalAssessment(input) {
  const totalAmmo = Math.max(1, Number(input.totalAmmo) || 1)
  const requiredHits = Math.min(totalAmmo, Math.max(1, Number(input.requiredHits) || 1))
  const actualHits = Math.min(totalAmmo, Math.max(0, Number(input.actualHits) || 0))
  const isTimed = input.isTimed !== false
  const maxPassingSeconds = Math.max(0, Number(input.maxPassingSeconds) || 0)
  const durationSeconds =
    isTimed && input.durationSeconds != null && Number.isFinite(Number(input.durationSeconds))
      ? Math.max(0, Number(input.durationSeconds))
      : null

  const accuracyPercentage = Math.round((actualHits / totalAmmo) * 100)
  const hitsMet = actualHits >= requiredHits
  const timeViolation =
    isTimed && maxPassingSeconds > 0 && durationSeconds != null && durationSeconds > maxPassingSeconds
  const isTargetMet = hitsMet && (!isTimed || !timeViolation)

  let statusResult = 'BAŞARILI'
  if (!isTargetMet) {
    statusResult = !hitsMet ? 'YETERSİZ İSABET' : 'SÜRE İHLALİ'
  }

  return {
    totalAmmo,
    requiredHits,
    actualHits,
    accuracyPercentage,
    hitsMet,
    timeViolation,
    isTargetMet,
    statusResult,
  }
}

/**
 * @param {import('./firestoreGroupTraining').GroupCriticalMetrics | Record<string, unknown>} cm
 */
export function normalizeAtisDrillBaselines(cm) {
  const raw = cm && typeof cm === 'object' ? cm : {}
  const totalAmmo = Math.max(1, Number(raw.totalAmmo ?? raw.totalRounds) || 1)
  const requiredHits = Math.min(
    totalAmmo,
    Math.max(1, Number(raw.requiredHits) || Math.ceil(totalAmmo * 0.6)),
  )
  return {
    targetType: typeof raw.targetType === 'string' ? raw.targetType : '',
    maxSeconds: Math.max(0, Number(raw.maxSeconds) || 0),
    maxPassingSeconds: Math.max(0, Number(raw.maxSeconds) || 0),
    totalAmmo,
    totalRounds: totalAmmo,
    requiredHits,
  }
}
