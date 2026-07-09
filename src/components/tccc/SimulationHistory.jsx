import { Fragment, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronUp, History } from 'lucide-react'
import { PENALTY_TCCC_BELOW_40 } from '../../lib/orsEngine'
import { healthT } from '../../lib/healthDisplayText'
import {
  filterSimulationLogs,
  formatSimulationTimestamp,
  formatOvertimeDebriefLine,
  formatSimulationTimingSec,
  getSimulationElapsedSec,
  getSimulationMode,
  getSimulationOvertimeSec,
  getSimulationRemainingSec,
  getSimulationSuccess,
  getStoredRejectionReasons,
  isOvertimeDebriefLine,
  isSimulationTimeoutFailure,
  reactionEfficiencyPercent,
  sortSimulationLogsNewestFirst,
} from '../../lib/simulationHistoryHelpers'

/** @typedef {'BAŞARILI' | 'BAŞARISIZ'} SimStatusLabel */

/** @param {unknown} v */
function toStr(v) {
  return typeof v === 'string' ? v : v == null ? '' : String(v)
}

/**
 * @param {Record<string, unknown>} row
 * @returns {SimStatusLabel}
 */
function getLogStatus(row) {
  const stored = toStr(row.tcccSimStatus).toUpperCase()
  if (stored === 'BAŞARISIZ' || stored === 'BASARISIZ') return 'BAŞARISIZ'
  if (stored === 'BAŞARILI' || stored === 'BASARILI') return 'BAŞARILI'
  return getSimulationSuccess(row) ? 'BAŞARILI' : 'BAŞARISIZ'
}

/**
 * @param {Record<string, unknown>} row
 */
function buildHistoryRow(row) {
  const id = toStr(row.id) || `sim-${getSimulationElapsedSec(row)}`
  const mode = getSimulationMode(row)
  const status = getLogStatus(row)
  const elapsedSec = getSimulationElapsedSec(row)
  const remainingSec = getSimulationRemainingSec(row)
  const overtimeSec = getSimulationOvertimeSec(row)
  const timedOut = isSimulationTimeoutFailure(row)
  const efficiency = reactionEfficiencyPercent(mode, elapsedSec)

  return {
    id,
    raw: row,
    mode,
    status,
    efficiency,
    elapsedSec,
    remainingSec,
    overtimeSec,
    timedOut,
    elapsedTime: formatSimulationTimingSec(elapsedSec),
    remainingTime: formatSimulationTimingSec(remainingSec),
    overtime: formatSimulationTimingSec(overtimeSec),
    timestampLabel: formatSimulationTimestamp(row.timestamp ?? row.updatedAt),
    rejectionReasons: getStoredRejectionReasons(row),
    failureFallback:
      toStr(row.medevacFailureReason).trim() || healthT('sim.history.failureFallback'),
  }
}

/**
 * @param {{ mode: 'medevac' | 'casevac' }} props
 */
function ModBadge({ mode }) {
  const isCasevac = mode === 'casevac'
  return (
    <span
      className={[
        'inline-block rounded border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider',
        isCasevac
          ? 'border-red-500/50 bg-red-950/40 text-red-300'
          : 'border-amber-500/50 bg-amber-950/40 text-amber-300',
      ].join(' ')}
    >
      {isCasevac ? 'CASEVAC' : 'MEDEVAC'}
    </span>
  )
}

/**
 * @param {{ status: SimStatusLabel }} props
 */
function StatusBadge({ status }) {
  const { t } = useTranslation('health')
  if (status === 'BAŞARILI') {
    return (
      <span className="rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 font-mono text-xs text-emerald-400">
        {t('sim.history.statusOk')}
      </span>
    )
  }
  return (
    <span className="sim-history-cold-hit rounded border border-red-500/40 bg-red-500/10 px-2 py-1 font-mono text-xs text-red-400">
      {t('sim.history.statusFail')}
    </span>
  )
}

/**
 * @param {{ status: SimStatusLabel; efficiency: number }} props
 */
function ReactionPerformanceCell({ status, efficiency }) {
  const { t } = useTranslation('health')
  if (status === 'BAŞARILI') {
    return (
      <span className="font-mono text-xs font-bold tabular-nums tracking-wide text-emerald-400">
        {t('sim.history.speed', { pct: efficiency })}
      </span>
    )
  }
  return (
    <span className="font-mono text-xs font-bold tabular-nums tracking-wide text-red-500">
      {t('sim.history.orsPenalty', { penalty: PENALTY_TCCC_BELOW_40 })}
    </span>
  )
}

/**
 * @param {{
 *   status: SimStatusLabel
 *   elapsedTime: string
 *   remainingTime: string
 *   overtime: string
 *   timedOut: boolean
 *   overtimeSec: number
 * }} props
 */
function OperationTimingLine({ status, elapsedTime, remainingTime, overtime, timedOut, overtimeSec }) {
  const { t } = useTranslation('health')
  const isTimeoutFailure = status === 'BAŞARISIZ' && (timedOut || overtimeSec > 0)

  return (
    <p className="font-mono text-xs uppercase text-app-text/70">
      <span className="text-amber-600/90">{t('sim.history.hat10')}</span>
      {status === 'BAŞARILI' ? (
        <span className="ml-2 font-mono text-xs text-emerald-400">
          {t('sim.history.timingOk', { elapsed: elapsedTime, remaining: remainingTime })}
        </span>
      ) : isTimeoutFailure ? (
        <span className="ml-2 font-mono text-xs text-red-500">
          {t('sim.history.timingOvertime', { elapsed: elapsedTime, overtime })}
        </span>
      ) : (
        <span className="ml-2 font-mono text-xs text-red-400">
          {t('sim.history.timingOk', { elapsed: elapsedTime, remaining: remainingTime })}
        </span>
      )}
    </p>
  )
}

function SimulationDebriefLog({
  status,
  rejectionReasons,
  failureFallback = '',
  elapsedTime,
  remainingTime,
  overtime: _overtime,
  overtimeSec,
  timedOut: _timedOut,
}) {
  const { t } = useTranslation('health')

  if (status === 'BAŞARILI') {
    return (
      <div className="mt-4 rounded border border-emerald-500/40 bg-emerald-950/30 p-3 text-left">
        <p className="mb-2 font-mono text-xs uppercase text-emerald-300/90">
          <span className="text-emerald-500/80">{t('sim.history.hat10')}</span>
          <span className="ml-2 font-mono text-xs text-emerald-400">
            {t('sim.history.timingOk', { elapsed: elapsedTime, remaining: remainingTime })}
          </span>
        </p>
        <p className="text-xs font-mono uppercase leading-relaxed text-emerald-400">
          {t('sim.history.successDebrief')}
        </p>
      </div>
    )
  }

  const fallbackReason = failureFallback || t('sim.history.failureFallback')
  const baseLines =
    rejectionReasons.length > 0
      ? [...rejectionReasons]
      : [t('sim.history.generalErrorPrefix', { reason: fallbackReason })]

  if (overtimeSec > 0) {
    const overtimeLine = formatOvertimeDebriefLine(overtimeSec)
    if (!baseLines.some((r) => isOvertimeDebriefLine(r))) {
      baseLines.push(overtimeLine)
    }
  }

  const lines = baseLines

  return (
    <div
      className="sim-history-cold-hit mt-4 animate-pulse rounded border border-red-500/40 bg-red-950/30 p-3 text-left"
      role="region"
      aria-label={t('sim.history.failDebriefAria')}
    >
      <p className="mb-2 text-xs font-mono font-bold uppercase leading-relaxed text-red-400">
        {t('sim.history.failDebriefHeading')}
      </p>
      <div className="max-h-40 space-y-1.5 overflow-y-auto pr-1">
        {lines.map((reason, idx) => (
          <p
            key={`debrief-${idx}-${reason.slice(0, 24)}`}
            className="text-xs font-mono uppercase leading-relaxed text-red-400"
          >
            {reason.startsWith('•') ? reason : `• ${reason}`}
          </p>
        ))}
      </div>
    </div>
  )
}

/**
 * @param {{
 *   status: SimStatusLabel
 *   rejectionReasons: string[]
 *   failureFallback: string
 *   raw: Record<string, unknown>
 * }} log
 */
function SimulationDetailPanel({ log }) {
  const { t } = useTranslation('health')
  const row = log.raw
  const mode = getSimulationMode(row)
  const nineLine = row.medevacNineLine
  const mist = row.casevacMist
  const medevacSimForm = row.medevacSimForm
  const timingProps = {
    status: log.status,
    elapsedTime: log.elapsedTime,
    remainingTime: log.remainingTime,
    overtime: log.overtime,
    overtimeSec: log.overtimeSec,
    timedOut: log.timedOut,
  }

  return (
    <div className="border-t border-emerald-500/20 bg-slate-950/80 px-4 py-4 font-mono text-[10px] leading-relaxed text-app-text/90">
      <p className="mb-3 font-bold uppercase tracking-wider text-emerald-500/90">{t('sim.history.allDetails')}</p>

      <div className="min-w-0 space-y-3 overflow-hidden">
      {mode === 'medevac' ? (
        <>
          <DetailBlock title={t('sim.history.nineLineTitle')}>
            {nineLine && typeof nineLine === 'object' ? (
              <NineLineDetail
                rawNineLine={/** @type {Record<string, unknown>} */ (nineLine)}
                simForm={medevacSimForm}
                {...timingProps}
              />
            ) : (
              <p className="text-app-text/55">{t('sim.history.noNineLine')}</p>
            )}
            <SimulationDebriefLog
              status={log.status}
              rejectionReasons={log.rejectionReasons}
              failureFallback={log.failureFallback}
              {...timingProps}
            />
          </DetailBlock>
        </>
      ) : (
        <>
          <DetailBlock title={t('sim.history.mistTitle')}>
            {mist && typeof mist === 'object' ? (
              <MistDetail mist={/** @type {Record<string, unknown>} */ (mist)} {...timingProps} />
            ) : (
              <p className="text-app-text/55">{t('sim.history.noMist')}</p>
            )}
            <SimulationDebriefLog
              status={log.status}
              rejectionReasons={log.rejectionReasons}
              failureFallback={log.failureFallback}
              {...timingProps}
            />
          </DetailBlock>
        </>
      )}

      {toStr(row.operationNote) ? (
        <p className="text-app-text/55">
          <span className="text-app-text/45">{t('sim.history.operationNote')}</span>
          {toStr(row.operationNote)}
        </p>
      ) : null}
      </div>
    </div>
  )
}

/**
 * @param {{ title: string; children: import('react').ReactNode }} props
 */
function DetailBlock({ title, children }) {
  return (
    <div>
      <p className="mb-1.5 text-[9px] font-bold uppercase tracking-wider text-app-text/55">{title}</p>
      {children}
    </div>
  )
}

/** @param {unknown} value */
function parsePositiveCount(value) {
  const n = Math.floor(Number(value))
  return Number.isFinite(n) && n > 0 ? n : 0
}

/** @param {unknown} value */
function isTruthyFlag(value) {
  if (value === true) return true
  if (value === false) return false
  const s = toStr(value).trim().toLowerCase()
  if (!s) return false
  if (s === 'true' || s === '1' || s === 'yes' || s === 'evet') return true
  return parsePositiveCount(value) > 0
}

/** @param {unknown} raw */
function normalizeNineLinePayload(raw) {
  if (!raw || typeof raw !== 'object') return {}
  const o = /** @type {Record<string, unknown>} */ (raw)
  const nested = o.medevacNineLine
  if (nested && typeof nested === 'object') {
    return /** @type {Record<string, unknown>} */ (nested)
  }
  return o
}

/** @param {unknown} value */
function formatNineLineText(value) {
  const text = toStr(value).trim()
  return text || healthT('sim.history.noData')
}

/** @param {string} ns @param {unknown} value */
function translateMistOption(ns, value) {
  const key = toStr(value).trim()
  if (!key) return ''
  const i18nKey = `sim.options.${ns}.${key}`
  const translated = healthT(i18nKey)
  return translated === i18nKey ? key : translated
}

/** @param {string} ns @param {unknown} value */
function translateMistIdList(ns, value) {
  if (Array.isArray(value)) {
    const parts = value.map((id) => translateMistOption(ns, id)).filter(Boolean)
    return parts.length > 0 ? parts.join(', ') : null
  }
  const single = translateMistOption(ns, value)
  return single || null
}

/** @param {unknown} obj */
function parseHat3Precedence(obj) {
  if (!obj || typeof obj !== 'object') return healthT('sim.history.noData')

  /** @type {string[]} */
  const keys = ['urgent', 'urgentSurge', 'priority', 'routine', 'convenience']

  const o = /** @type {Record<string, unknown>} */ (obj)
  const parts = []

  for (const key of keys) {
    const count = parsePositiveCount(o[key])
    if (count > 0) {
      parts.push(
        healthT('sim.history.countX', {
          count,
          label: healthT(`sim.history.precedence.${key}`),
        }),
      )
    }
  }

  return parts.length > 0 ? parts.join(', ') : healthT('sim.history.noData')
}

/** @param {unknown} val */
function parseHat4Equipment(val) {
  /** @type {string[]} */
  const boolKeys = ['hoist', 'ventilator', 'oxygen', 'extraction', 'litter']

  if (Array.isArray(val)) {
    const parts = val
      .map((item) => {
        const k = toStr(item).trim()
        const label = healthT(`sim.history.equipment.${k}`)
        return label === `sim.history.equipment.${k}` ? k.toUpperCase() : label
      })
      .filter(Boolean)
    return parts.length > 0 ? parts.join(', ') : healthT('sim.history.none')
  }

  if (!val || typeof val !== 'object') return healthT('sim.history.none')

  const o = /** @type {Record<string, unknown>} */ (val)
  const parts = []

  for (const key of boolKeys) {
    if (isTruthyFlag(o[key])) parts.push(healthT(`sim.history.equipment.${key}`))
  }

  return parts.length > 0 ? [...new Set(parts)].join(', ') : healthT('sim.history.none')
}

/** @param {unknown} obj */
function parseHat5Transport(obj) {
  if (!obj || typeof obj !== 'object') return healthT('sim.history.noData')

  /** @type {string[]} */
  const keys = ['litter', 'ambulatory']

  const o = /** @type {Record<string, unknown>} */ (obj)
  const parts = []

  for (const key of keys) {
    const count = parsePositiveCount(o[key])
    if (count > 0) {
      parts.push(
        healthT('sim.history.countX', {
          count,
          label: healthT(`sim.history.transport.${key}`),
        }),
      )
    }
  }

  return parts.length > 0 ? parts.join(', ') : healthT('sim.history.noData')
}

/** @param {unknown} obj */
function parseHat7Marking(obj) {
  if (!obj || typeof obj !== 'object') return healthT('sim.history.none')

  const o = /** @type {Record<string, unknown>} */ (obj)
  const method = toStr(o.method).trim().toLowerCase()

  if (!method || method === 'none') return healthT('sim.history.none')

  if (method === 'smoke') {
    const colorKey = toStr(o.smokeColor).trim().toLowerCase()
    const colorLabelKey = `sim.history.smokeColor.${colorKey}`
    const colorLabel =
      colorKey && healthT(colorLabelKey) !== colorLabelKey
        ? healthT(colorLabelKey)
        : colorKey
          ? colorKey.toUpperCase()
          : ''
    return colorLabel
      ? healthT('sim.history.marking.smokeWithColor', { color: colorLabel })
      : healthT('sim.history.marking.smoke')
  }

  const methodLabelKey = `sim.history.marking.${method}`
  const methodLabel = healthT(methodLabelKey)
  return methodLabel !== methodLabelKey ? methodLabel : method.toUpperCase()
}

/** @param {unknown} value */
function parseHat6Security(value) {
  const key = toStr(value).trim().toLowerCase()
  if (!key) return healthT('sim.history.noData')

  const labelKey = `sim.history.security.${key}`
  const label = healthT(labelKey)
  return label !== labelKey ? label : key.toUpperCase()
}

/** @param {unknown} value */
function parseHat8Nationality(value) {
  const key = toStr(value).trim().toLowerCase()
  if (!key) return healthT('sim.history.noData')

  const labelKey = `sim.history.nationality.${key}`
  const label = healthT(labelKey)
  return label !== labelKey ? label : key.toUpperCase()
}

const HAT9_CBRN_KEYS = new Set(['none', 'chemical', 'biological', 'radiological', 'nuclear'])
const HAT9_TERRAIN_KEYS = new Set(['flat', 'obstacles', 'urban'])

/**
 * @param {unknown} cbrnTerrainRaw
 * @param {unknown} [simForm]
 */
function parseHat9CbrnTerrain(cbrnTerrainRaw, simForm) {
  let cbrn = ''
  let terrain = ''

  if (simForm && typeof simForm === 'object') {
    const f = /** @type {Record<string, unknown>} */ (simForm)
    cbrn = toStr(f.line9_cbrn).trim().toLowerCase()
    terrain = toStr(f.line9_terrain).trim().toLowerCase()
  }

  if (!cbrn && !terrain) {
    const text = toStr(cbrnTerrainRaw).trim()
    if (!text) return healthT('sim.history.noData')

    const parts = text
      .split(/\s*[·•–—]\s*|\s+-\s+/i)
      .map((p) => p.trim().toLowerCase())
      .filter(Boolean)

    for (const part of parts) {
      if (HAT9_CBRN_KEYS.has(part) && !cbrn) cbrn = part
      else if (HAT9_TERRAIN_KEYS.has(part) && !terrain) terrain = part
    }

    if (parts.length === 1) {
      const only = parts[0]
      if (HAT9_CBRN_KEYS.has(only)) cbrn = only
      else if (HAT9_TERRAIN_KEYS.has(only)) terrain = only
    }
  }

  if (!cbrn && !terrain) return healthT('sim.history.noData')

  if ((cbrn === 'none' || !cbrn) && terrain === 'flat') {
    return healthT('sim.history.hat9NoneFlat')
  }
  if (cbrn === 'none' && !terrain) {
    return healthT('sim.history.hat9NoneFlat')
  }

  const cbrnLabelKey = cbrn ? `sim.history.cbrn.${cbrn}` : ''
  const cbrnLabel = cbrnLabelKey
    ? healthT(cbrnLabelKey) !== cbrnLabelKey
      ? healthT(cbrnLabelKey)
      : cbrn.toUpperCase()
    : healthT('sim.history.cbrn.unknown')
  const terrainLabelKey = terrain ? `sim.history.terrain.${terrain}` : ''
  const terrainLabel = terrainLabelKey
    ? healthT(terrainLabelKey) !== terrainLabelKey
      ? healthT(terrainLabelKey)
      : terrain.toUpperCase()
    : healthT('sim.history.terrain.unknown')

  return `${cbrnLabel} / ${terrainLabel}`
}

/**
 * @param {{ label: string; value: string }} props
 */
function NineLineReadoutRow({ label, value }) {
  return (
    <li className="text-app-text/70">
      <span className="text-amber-600/90">{label}</span>
      <span className="ml-2 font-mono text-xs text-amber-400">{value}</span>
    </li>
  )
}

/**
 * @param {{
 *   rawNineLine: Record<string, unknown>
 *   simForm?: unknown
 *   elapsedTime: string
 *   remainingTime: string
 *   overtime: string
 *   overtimeSec: number
 *   timedOut: boolean
 *   status: SimStatusLabel
 * }} props
 */
function NineLineDetail({ rawNineLine, simForm, ...timingProps }) {
  const { t } = useTranslation('health')
  const nineLine = normalizeNineLinePayload(rawNineLine)

  return (
    <ul className="list-none space-y-1">
      <NineLineReadoutRow label={t('sim.history.hat1')} value={formatNineLineText(nineLine.line1_pickupGrid)} />
      <NineLineReadoutRow
        label={t('sim.history.hat2')}
        value={formatNineLineText(nineLine.line2_radioFreqCallsign)}
      />
      <NineLineReadoutRow
        label={t('sim.history.hat3')}
        value={parseHat3Precedence(nineLine.line3_patientsPrecedence)}
      />
      <NineLineReadoutRow
        label={t('sim.history.hat4')}
        value={parseHat4Equipment(nineLine.line4_medicalEquipment)}
      />
      <NineLineReadoutRow
        label={t('sim.history.hat5')}
        value={parseHat5Transport(nineLine.line5_patientsType)}
      />
      <NineLineReadoutRow
        label={t('sim.history.hat6')}
        value={parseHat6Security(nineLine.line6_pickupSecurity)}
      />
      <NineLineReadoutRow
        label={t('sim.history.hat7')}
        value={parseHat7Marking(nineLine.line7_lzMarking)}
      />
      <NineLineReadoutRow
        label={t('sim.history.hat8')}
        value={parseHat8Nationality(nineLine.line8_patientNationality)}
      />
      <NineLineReadoutRow
        label={t('sim.history.hat9')}
        value={parseHat9CbrnTerrain(nineLine.line9_cbrnTerrain, simForm)}
      />
      <li>
        <OperationTimingLine {...timingProps} />
      </li>
    </ul>
  )
}

/**
 * @param {{
 *   mist: Record<string, unknown>
 *   elapsedTime: string
 *   remainingTime: string
 *   overtime: string
 *   overtimeSec: number
 *   timedOut: boolean
 *   status: SimStatusLabel
 * }} props
 */
function MistDetail({ mist, ...timingProps }) {
  const { t } = useTranslation('health')
  const emDash = t('common.emDash')
  const m = mist.mist && typeof mist.mist === 'object' ? mist.mist : mist

  const metricDisplay =
    (translateMistIdList('mistMetric', m && typeof m === 'object' ? m.metric : null) ??
      toStr(m?.metric)) ||
    emDash
  const injuryDisplay =
    (translateMistIdList('mistInjury', m && typeof m === 'object' ? m.injurySite : null) ??
      toStr(m?.injurySite)) ||
    emDash
  const vitalsDisplay =
    (translateMistIdList('mistVitals', m && typeof m === 'object' ? m.vitals : null) ??
      toStr(m?.vitals)) ||
    emDash
  const treatmentDisplay =
    (translateMistIdList('mistTreatment', m && typeof m === 'object' ? m.treatment : null) ??
      toStr(m?.treatment)) ||
    emDash

  return (
    <ul className="list-none space-y-1 text-app-text/70">
      <li>
        <span className="text-red-500/90">{t('sim.history.mistCount')}</span>{' '}
        {toStr(mist.casualtyCount) || emDash}
      </li>
      <li>
        <span className="text-red-500/90">{t('sim.history.mistM')}</span> {metricDisplay}
      </li>
      <li>
        <span className="text-red-500/90">{t('sim.history.mistI')}</span> {injuryDisplay}
      </li>
      <li>
        <span className="text-red-500/90">{t('sim.history.mistS')}</span> {vitalsDisplay}
      </li>
      <li>
        <span className="text-red-500/90">{t('sim.history.mistT')}</span> {treatmentDisplay}
      </li>
      <li>
        <span className="text-red-500/90">{t('sim.history.mistCall')}</span>{' '}
        {toStr(mist.pickupCallsign) || emDash}
      </li>
      <li>
        <OperationTimingLine {...timingProps} />
      </li>
    </ul>
  )
}

/**
 * @param {{
 *   rangeLogs: Record<string, unknown>[]
 *   loading?: boolean
 * }} props
 */
export default function SimulationHistory({ rangeLogs, loading = false }) {
  const { t } = useTranslation('health')
  const [expandedId, setExpandedId] = useState(/** @type {string | null} */ (null))

  const tableRows = useMemo(() => {
    const filtered = sortSimulationLogsNewestFirst(filterSimulationLogs(rangeLogs))
    return filtered.map((row) => buildHistoryRow(row))
  }, [rangeLogs])

  if (loading && tableRows.length === 0) {
    return (
      <p className="py-12 text-center font-mono text-[10px] uppercase tracking-wider text-app-text/45">
        {t('sim.history.loading')}
      </p>
    )
  }

  if (tableRows.length === 0) {
    return (
      <div className="flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-emerald-500/25 bg-slate-950/60">
        <History className="size-10 text-emerald-500/25" aria-hidden />
        <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-app-text/45">
          {t('sim.history.empty')}
        </p>
        <p className="mt-1 max-w-md text-center font-mono text-[9px] uppercase text-slate-700">
          {t('sim.history.emptyHint')}
        </p>
      </div>
    )
  }

  return (
    <section aria-label={t('sim.history.aria')} className="space-y-3">
      <p className="font-mono text-[10px] uppercase tracking-wider text-app-text/55">
        {t('sim.history.title', { count: tableRows.length })}
      </p>

      <div className="overflow-x-auto rounded-xl border border-emerald-500/25 bg-slate-950/80 shadow-[0_0_24px_rgb(16,185,129,0.08)]">
        <table className="w-full min-w-[640px] border-collapse font-mono text-[10px]">
          <thead>
            <tr className="border-b border-emerald-500/30 bg-slate-900/90 text-left uppercase tracking-wider text-emerald-500/80">
              <th className="px-3 py-2.5 font-bold">{t('sim.history.colMode')}</th>
              <th className="px-3 py-2.5 font-bold">{t('sim.history.colDate')}</th>
              <th className="px-3 py-2.5 font-bold">{t('sim.history.colStatus')}</th>
              <th className="px-3 py-2.5 font-bold">{t('sim.history.colReaction')}</th>
              <th className="px-3 py-2.5 font-bold text-center">{t('sim.history.colDetails')}</th>
            </tr>
          </thead>
          <tbody>
            {tableRows.map((log) => {
              const open = expandedId === log.id
              const toggle = () => setExpandedId(open ? null : log.id)

              return (
                <Fragment key={log.id}>
                  <tr
                    className={[
                      'cursor-pointer border-b border-slate-800/80 transition-colors',
                      open ? 'bg-emerald-950/20' : 'hover:bg-slate-900/60',
                      log.status === 'BAŞARISIZ' ? 'sim-history-row-fail' : '',
                    ].join(' ')}
                    onClick={toggle}
                  >
                    <td className="px-3 py-3 align-middle">
                      <ModBadge mode={log.mode} />
                    </td>
                    <td className="px-3 py-3 align-middle text-app-text/70">{log.timestampLabel}</td>
                    <td className="px-3 py-3 align-middle">
                      <StatusBadge status={log.status} />
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <ReactionPerformanceCell status={log.status} efficiency={log.efficiency} />
                    </td>
                    <td className="px-3 py-3 align-middle text-center text-app-text/55">
                      <span className="inline-flex items-center justify-center gap-1 font-mono text-[9px] uppercase tracking-wider">
                        {open ? (
                          <>
                            <ChevronUp className="size-4" aria-hidden />
                            {t('sim.history.close')}
                          </>
                        ) : (
                          <>
                            <ChevronDown className="size-4" aria-hidden />
                            {t('sim.history.open')}
                          </>
                        )}
                      </span>
                    </td>
                  </tr>
                  {open ? (
                    <tr>
                      <td colSpan={5} className="p-0">
                        <SimulationDetailPanel log={log} />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
