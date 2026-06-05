import { getAtisRoundsAndHits, getAtisDrillName, isAtisShootingLog } from './atisLogRegistry'
import { isCqbLog } from './cqbLogRegistry'
import { isFofLog } from './fofLogRegistry'
import { isVbssLog } from './vbssLogRegistry'
import { labelTacticalError } from './cqbOptions'
import { invNum, invStr } from './inventoryIlws'
import {
  countLogCriticalErrors,
  getLogActivityTitle,
  getLogDisciplineTag,
} from './progressAnalytics'
import { getLogCompletionTimeSec, resolveLogFocusId } from './progressHudAnalytics'
import { isTcccSimulationLog } from './simulationHistoryHelpers'
import { buildTcccHudTooltipModel, isTcccSimulationFailed } from './tcccSimHudAnalytics'

/** @param {Record<string, unknown>[]} logs */
export function buildLogsById(logs) {
  /** @type {Map<string, Record<string, unknown>>} */
  const map = new Map()
  for (const row of logs) {
    map.set(resolveLogFocusId(row), row)
  }
  return map
}

/** @param {Record<string, unknown>} row */
function formatSec(val) {
  if (val == null || !Number.isFinite(val) || val <= 0) return '—'
  return `${Number(val).toFixed(2)}`
}

/** @param {Record<string, unknown>} row */
export function estimateLogOrsPenalty(row) {
  let penalty = 0
  if (row.blueOnBlue) penalty += 14
  const errors = Array.isArray(row.tacticalErrors) ? row.tacticalErrors : []
  for (const raw of errors) {
    const id = invStr(raw).trim()
    if (!id) continue
    if (id === 'muzzle_flagging' || id === 'blue_on_blue') penalty += 14
    else if (id === 'fatal_funnel_hang' || id === 'poor_corner_piercing') penalty += 10
    else penalty += 7
  }
  const tag = getLogDisciplineTag(row)
  if (tag === 'TCCC' || isTcccSimulationLog(row)) {
    const sp = invNum(row.successPercent)
    if (isTcccSimulationFailed(row) || (sp > 0 && sp < 40)) penalty += 14
  }
  return penalty
}

/** @param {Record<string, unknown>} row */
function hasCriticalViolation(row) {
  return countLogCriticalErrors(row) > 0 || Boolean(row.blueOnBlue)
}

/** @param {Record<string, unknown>} row */
function formatTacticalErrorsList(row) {
  const labels = []
  if (row.blueOnBlue) labels.push('MAVİ-MAVİ')
  const errors = Array.isArray(row.tacticalErrors) ? row.tacticalErrors : []
  for (const raw of errors) {
    const id = invStr(raw).trim()
    if (!id) continue
    labels.push(labelTacticalError(id).toUpperCase())
  }
  const fromLabels = Array.isArray(row.tacticalErrorsLabels)
    ? row.tacticalErrorsLabels.map((l) => invStr(l).trim()).filter(Boolean)
    : []
  const merged = [...new Set([...labels, ...fromLabels])]
  return merged.length ? merged.join(' · ') : 'TEMİZ HAT'
}

/** @param {Record<string, unknown> | null | undefined} row */
export function buildTacticalTooltipLines(row) {
  if (!row) {
    return ['VERİ BULUNAMADI']
  }

  const tag = getLogDisciplineTag(row)
  const drill = getLogActivityTitle(row) || getAtisDrillName(row) || '—'
  const critical = hasCriticalViolation(row)
  const penalty = estimateLogOrsPenalty(row)

  if (tag === 'ATIS' && isAtisShootingLog(row)) {
    const td = row.timingData && typeof row.timingData === 'object' ? row.timingData : {}
    const o = /** @type {Record<string, unknown>} */ (td)
    const first = invNum(o.firstShot)
    const split = invNum(o.split)
    const { totalRoundsFired, totalHits } = getAtisRoundsAndHits(row)
    return [
      `• HEDEF ID / DRILL: ${drill}`,
      `• REAKSİYON / İLK ATIŞ: ${formatSec(first)} sn`,
      `• SPLIT (ATIŞ ARASI) SÜRE: ${formatSec(split)} sn`,
      `• ATILAN / VURULAN: ${totalRoundsFired || '—'} / ${totalHits || '—'}`,
      `• KRİTİK İHLAL: ${critical ? '⚠️ VAR' : '✅ TEMİZ'}`,
    ]
  }

  if (isTcccSimulationLog(row)) {
    const model = buildTcccHudTooltipModel(row)
    const lines = [
      `• OPERASYON DURUMU: ${model.statusLabel}`,
      `• TOPLAM SÜRE: ${model.elapsedTime} SN`,
      `• GECİKME SÜRESİ: ${model.overtimeLabel}`,
      `• TELSİZ MODU: ${model.simulationMode}`,
      `• REAKSİYON VERİMLİLİĞİ: %${model.efficiency}`,
    ]
    if (model.failed && model.rejectionReasons.length > 0) {
      lines.push('• İHLAL / RED GEREKÇELERİ:')
      for (const reason of model.rejectionReasons) {
        lines.push(`  ${reason.startsWith('•') ? reason : `• ${reason}`}`)
      }
    }
    return lines
  }

  if (tag === 'CQB' || tag === 'FOF' || tag === 'VBSS' || isCqbLog(row) || isFofLog(row) || isVbssLog(row)) {
    const sec = getLogCompletionTimeSec(row)
    const opLabel =
      tag === 'FOF' || isFofLog(row)
        ? 'SENARYO SÜRESİ'
        : tag === 'VBSS' || isVbssLog(row)
          ? 'BOARDING SÜRESİ'
          : 'OPERASYON SÜRESİ'
    return [
      `• ${opLabel}: ${formatSec(sec)} sn`,
      `• SEKTÖR BOŞLUĞU / İHLAL: ${formatTacticalErrorsList(row)}`,
      `• CEZA ETKİSİ: -${penalty} ORS`,
    ]
  }

  return [
    `• OTURUM: ${drill}`,
    `• DİSİPLİN: ${tag}`,
    `• KRİTİK İHLAL: ${critical ? '⚠️ VAR' : '✅ TEMİZ'}`,
    `• CEZA ETKİSİ: -${penalty} ORS`,
  ]
}
