import { getAtisRoundsAndHits, getAtisDrillName, isAtisShootingLog } from './atisLogRegistry'
import { isCqbLog } from './cqbLogRegistry'
import { isFofLog } from './fofLogRegistry'
import { isVbssLog } from './vbssLogRegistry'
import { invNum, invStr } from './inventoryIlws'
import {
  countLogCriticalErrors,
  getLogActivityTitle,
  getLogDisciplineTag,
} from './progressAnalytics'
import { getLogCompletionTimeSec, resolveLogFocusId } from './progressHudAnalytics'
import { formatProgressTacticalErrorLabel, progressT } from './progressDisplayText'
import { isTcccSimulationLog } from './simulationHistoryHelpers'
import { buildTcccHudTooltipModel, isTcccSimulationFailed } from './tcccSimHudAnalytics'

/** @param {Record<string, unknown>[]} logs */
export function buildLogsById(logs) {
  /** @type {Map<string, Record<string, unknown>} */
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
  const tag = getLogDisciplineTag(row)
  const labels = []
  if (row.blueOnBlue) labels.push(progressT('tooltips.blueOnBlue'))
  const errors = Array.isArray(row.tacticalErrors) ? row.tacticalErrors : []
  for (const raw of errors) {
    const id = invStr(raw).trim()
    if (!id) continue
    labels.push(formatProgressTacticalErrorLabel(id, tag).toUpperCase())
  }
  // Do NOT merge stored tacticalErrorsLabels (TR snapshots) — IDs + i18n only.
  const merged = [...new Set(labels)]
  return merged.length ? merged.join(' · ') : progressT('tooltips.cleanLane')
}

/** @param {Record<string, unknown> | null | undefined} row */
export function buildTacticalTooltipLines(row) {
  if (!row) {
    return [progressT('tooltips.dataNotFound')]
  }

  const tag = getLogDisciplineTag(row)
  const drill = getLogActivityTitle(row) || getAtisDrillName(row) || '—'
  const critical = hasCriticalViolation(row)
  const penalty = estimateLogOrsPenalty(row)
  const criticalStatus = critical ? progressT('tooltips.criticalYes') : progressT('tooltips.criticalClean')

  if (tag === 'ATIS' && isAtisShootingLog(row)) {
    const td = row.timingData && typeof row.timingData === 'object' ? row.timingData : {}
    const o = /** @type {Record<string, unknown>} */ (td)
    const first = invNum(o.firstShot)
    const split = invNum(o.split)
    const { totalRoundsFired, totalHits } = getAtisRoundsAndHits(row)
    return [
      progressT('tooltips.atis.drill', { drill }),
      progressT('tooltips.atis.firstShot', { sec: formatSec(first) }),
      progressT('tooltips.atis.split', { sec: formatSec(split) }),
      progressT('tooltips.atis.roundsHits', {
        rounds: totalRoundsFired || '—',
        hits: totalHits || '—',
      }),
      progressT('tooltips.atis.critical', { status: criticalStatus }),
    ]
  }

  if (isTcccSimulationLog(row)) {
    const model = buildTcccHudTooltipModel(row)
    const lines = [
      progressT('hud.tccc.opStatus', { status: model.statusLabel }),
      progressT('hud.tccc.totalTime', { time: model.elapsedTime }),
      progressT('hud.tccc.delayTime', { time: model.overtimeLabel }),
      progressT('hud.tccc.radioMode', { mode: model.simulationMode }),
      progressT('hud.tccc.efficiency', { value: model.efficiency }),
    ]
    if (model.failed && model.rejectionReasons.length > 0) {
      lines.push(progressT('hud.tccc.rejectionHeadingShort'))
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
        ? progressT('tooltips.ops.scenarioDuration')
        : tag === 'VBSS' || isVbssLog(row)
          ? progressT('tooltips.ops.boardingDuration')
          : progressT('tooltips.ops.operationDuration')
    return [
      progressT('tooltips.ops.durationLine', { label: opLabel, sec: formatSec(sec) }),
      progressT('tooltips.ops.sectorGap', { errors: formatTacticalErrorsList(row) }),
      progressT('tooltips.ops.penalty', { penalty }),
    ]
  }

  return [
    progressT('tooltips.generic.session', { drill }),
    progressT('tooltips.generic.discipline', { tag }),
    progressT('tooltips.generic.critical', { status: criticalStatus }),
    progressT('tooltips.generic.penalty', { penalty }),
  ]
}
