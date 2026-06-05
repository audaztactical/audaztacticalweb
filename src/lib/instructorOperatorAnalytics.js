import { averagePerformancePercent } from './progressAnalytics'
import { getSimulationSuccess, isTcccSimulationLog } from './simulationHistoryHelpers'

/**
 * @param {Record<string, unknown>[]} logs — updatedAt desc önerilir
 */
export function summarizeOperatorLogs(logs) {
  const sessions = logs.length
  const avgHitRate = logs.length ? Math.round(averagePerformancePercent(logs)) : 0

  const sims = logs.filter(isTcccSimulationLog)
  let tcccStatus = 'VERİ YOK'
  if (sims.length > 0) {
    tcccStatus = getSimulationSuccess(sims[0]) ? 'UYUMLU' : 'İHLAL'
  }

  return { sessions, avgHitRate, tcccStatus }
}
