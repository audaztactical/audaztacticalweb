import { Fragment, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, History } from 'lucide-react'
import { PENALTY_TCCC_BELOW_40 } from '../../lib/orsEngine'
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
      toStr(row.medevacFailureReason).trim() || 'TRANSMISSION FAILURE · AYRINTI ARŞİVLENMEDİ',
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
  if (status === 'BAŞARILI') {
    return (
      <span className="rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 font-mono text-xs text-emerald-400">
        BAŞARILI / CLEAN HIT
      </span>
    )
  }
  return (
    <span className="sim-history-cold-hit rounded border border-red-500/40 bg-red-500/10 px-2 py-1 font-mono text-xs text-red-400">
      BAŞARISIZ / COLD HIT
    </span>
  )
}

/**
 * @param {{ status: SimStatusLabel; efficiency: number }} props
 */
function ReactionPerformanceCell({ status, efficiency }) {
  if (status === 'BAŞARILI') {
    return (
      <span className="font-mono text-xs font-bold tabular-nums tracking-wide text-emerald-400">
        {efficiency}% HIZ
      </span>
    )
  }
  return (
    <span className="font-mono text-xs font-bold tabular-nums tracking-wide text-red-500">
      -{PENALTY_TCCC_BELOW_40} ORS
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
  const isTimeoutFailure = status === 'BAŞARISIZ' && (timedOut || overtimeSec > 0)

  return (
    <p className="font-mono text-xs uppercase text-app-text/70">
      <span className="text-amber-600/90">HAT 10 - OPERASYON SÜRESİ:</span>
      {status === 'BAŞARILI' ? (
        <span className="ml-2 font-mono text-xs text-emerald-400">
          {elapsedTime} SN / KALAN SÜRE: {remainingTime} SN
        </span>
      ) : isTimeoutFailure ? (
        <span className="ml-2 font-mono text-xs text-red-500">
          {elapsedTime} SN / [🚨 GECİKME: -{overtime} SANİYE]
        </span>
      ) : (
        <span className="ml-2 font-mono text-xs text-red-400">
          {elapsedTime} SN / KALAN SÜRE: {remainingTime} SN
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
  if (status === 'BAŞARILI') {
    return (
      <div className="mt-4 rounded border border-emerald-500/40 bg-emerald-950/30 p-3 text-left">
        <p className="mb-2 font-mono text-xs uppercase text-emerald-300/90">
          <span className="text-emerald-500/80">HAT 10 - OPERASYON SÜRESİ:</span>
          <span className="ml-2 font-mono text-xs text-emerald-400">
            {elapsedTime} SN / KALAN SÜRE: {remainingTime} SN
          </span>
        </p>
        <p className="text-xs font-mono uppercase leading-relaxed text-emerald-400">
          ⚡ [ PROTOKOL DOĞRULANDI ]: TELSİZ RAPORU VE LOJİSTİK VERİLER EKSİKSİZ UYGULANDI. TAHLİYE TEMİZ
          BAŞARILDI.
        </p>
      </div>
    )
  }

  const baseLines =
    rejectionReasons.length > 0
      ? [...rejectionReasons]
      : [`• [GENEL HATA]: ${failureFallback || 'TRANSMISSION FAILURE'}`]

  if (overtimeSec > 0) {
    const overtimeLine = formatOvertimeDebriefLine(overtimeSec)
    if (!baseLines.some((r) => r.includes('KRİTİK GECİKME'))) {
      baseLines.push(overtimeLine)
    }
  }

  const lines = baseLines

  return (
    <div
      className="sim-history-cold-hit mt-4 animate-pulse rounded border border-red-500/40 bg-red-950/30 p-3 text-left"
      role="region"
      aria-label="Sistem tahliye reddi gerekçeleri"
    >
      <p className="mb-2 text-xs font-mono font-bold uppercase leading-relaxed text-red-400">
        [ ⚠️ SİSTEM TAHLİYE REDDİ GEREKÇELERİ / MISSION CRITICAL ERRORS ]
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
      <p className="mb-3 font-bold uppercase tracking-wider text-emerald-500/90">[ TÜM DETAYLAR / GÖNDERİLEN YÜK ]</p>

      <div className="min-w-0 space-y-3 overflow-hidden">
      {mode === 'medevac' ? (
        <>
          <DetailBlock title="9-LINE RAPOR (FIRESTORE)">
            {nineLine && typeof nineLine === 'object' ? (
              <NineLineDetail
                rawNineLine={/** @type {Record<string, unknown>} */ (nineLine)}
                simForm={medevacSimForm}
                {...timingProps}
              />
            ) : (
              <p className="text-app-text/55">Kayıtlı 9-Line yükü yok.</p>
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
          <DetailBlock title="CASEVAC MIST RAPORU">
            {mist && typeof mist === 'object' ? (
              <MistDetail mist={/** @type {Record<string, unknown>} */ (mist)} {...timingProps} />
            ) : (
              <p className="text-app-text/55">Kayıtlı MIST yükü yok.</p>
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
          <span className="text-app-text/45">OPERASYON NOTU: </span>
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
  return text || 'VERİ YOK'
}

/** @param {unknown} obj */
function parseHat3Precedence(obj) {
  if (!obj || typeof obj !== 'object') return 'VERİ YOK'

  /** @type {Record<string, string>} */
  const labels = {
    urgent: 'ACİL (URGENT)',
    urgentSurge: 'ÖNCELİKLİ ACİL (URGENT-SURGE)',
    priority: 'ÖNCELİKLİ (PRIORITY)',
    routine: 'RUTİN (ROUTINE)',
    convenience: 'KOLAYLIK (CONVENIENCE)',
  }

  const o = /** @type {Record<string, unknown>} */ (obj)
  const parts = []

  for (const [key, label] of Object.entries(labels)) {
    const count = parsePositiveCount(o[key])
    if (count > 0) parts.push(`${count} X ${label}`)
  }

  return parts.length > 0 ? parts.join(', ') : 'VERİ YOK'
}

/** @param {unknown} val */
function parseHat4Equipment(val) {
  /** @type {Record<string, string>} */
  const boolLabels = {
    hoist: 'VİNÇ',
    ventilator: 'SOLUNUM CİHAZI',
    oxygen: 'KURTARMA EKİPMANI',
    extraction: 'KURTARMA EKİPMANI',
    litter: 'SEDYE',
  }

  if (Array.isArray(val)) {
    const parts = val
      .map((item) => boolLabels[toStr(item).trim()] ?? toStr(item).trim().toUpperCase())
      .filter(Boolean)
    return parts.length > 0 ? parts.join(', ') : 'YOK'
  }

  if (!val || typeof val !== 'object') return 'YOK'

  const o = /** @type {Record<string, unknown>} */ (val)
  const parts = []

  for (const [key, label] of Object.entries(boolLabels)) {
    if (isTruthyFlag(o[key])) parts.push(label)
  }

  return parts.length > 0 ? [...new Set(parts)].join(', ') : 'YOK'
}

/** @param {unknown} obj */
function parseHat5Transport(obj) {
  if (!obj || typeof obj !== 'object') return 'VERİ YOK'

  /** @type {Record<string, string>} */
  const labels = {
    litter: 'SEDYE (LITTER)',
    ambulatory: 'AYAKTA (AMBULATORY)',
  }

  const o = /** @type {Record<string, unknown>} */ (obj)
  const parts = []

  for (const [key, label] of Object.entries(labels)) {
    const count = parsePositiveCount(o[key])
    if (count > 0) parts.push(`${count} X ${label}`)
  }

  return parts.length > 0 ? parts.join(', ') : 'VERİ YOK'
}

/** @param {unknown} obj */
function parseHat7Marking(obj) {
  if (!obj || typeof obj !== 'object') return 'YOK'

  const o = /** @type {Record<string, unknown>} */ (obj)
  const method = toStr(o.method).trim().toLowerCase()

  if (!method || method === 'none') return 'YOK'

  /** @type {Record<string, string>} */
  const methodLabels = {
    panels: 'PANEL',
    pyrotechnic: 'FİŞEK',
    strobe: 'FİŞEK',
    smoke: 'SİS BOMBASI',
  }

  /** @type {Record<string, string>} */
  const smokeColors = {
    green: 'YEŞİL',
    red: 'KIRMIZI',
    yellow: 'SARI',
    purple: 'MOR',
    violet: 'MOR',
  }

  if (method === 'smoke') {
    const colorKey = toStr(o.smokeColor).trim().toLowerCase()
    const colorLabel = smokeColors[colorKey] || (colorKey ? colorKey.toUpperCase() : '')
    return colorLabel ? `SİS BOMBASI (${colorLabel})` : 'SİS BOMBASI'
  }

  return methodLabels[method] || method.toUpperCase()
}

/** @param {unknown} value */
function parseHat6Security(value) {
  const key = toStr(value).trim().toLowerCase()
  if (!key) return 'VERİ YOK'

  /** @type {Record<string, string>} */
  const labels = {
    no_enemy: 'N · DÜŞMAN YOK',
    no_troops: 'N · DÜŞMAN YOK',
    possible_enemy: 'P · MUHTEMEL DÜŞMAN',
    no_threat: 'P · MUHTEMEL DÜŞMAN',
    enemy_area: 'E · BÖLGEDE DÜŞMAN VAR',
    armed_escort: 'X · SİLAHLI ESKORT GEREKLİ',
    hot_lz: 'X · SICAK LZ / SİLAHLI ESKORT',
  }

  return labels[key] || key.toUpperCase()
}

/** @param {unknown} value */
function parseHat8Nationality(value) {
  const key = toStr(value).trim().toLowerCase()
  if (!key) return 'VERİ YOK'

  /** @type {Record<string, string>} */
  const labels = {
    us_nato: 'A · DOST ASKER (NATO)',
    friendly: 'A · DOST ASKER',
    non_nato: 'B · YABANCI ASKER',
    allied: 'B · MÜTEFFİK ASKER',
    civilian: 'C · SİVİL',
    epw: 'D · SAVAŞ ESİRİ',
    pow: 'D · SAVAŞ ESİRİ',
    military: 'A · ASKERİ PERSONEL',
    non_combatant: 'C · SİVİL / SAVAŞ DIŞI',
  }

  return labels[key] || key.toUpperCase()
}

const HAT9_CBRN_KEYS = new Set(['none', 'chemical', 'biological', 'radiological', 'nuclear'])
const HAT9_TERRAIN_KEYS = new Set(['flat', 'obstacles', 'urban'])

/** @type {Record<string, string>} */
const HAT9_CBRN_LABELS = {
  none: 'KBRN TEHDİDİ YOK',
  chemical: 'KİMYASAL TEHDİT (C)',
  biological: 'BİYOLOJİK TEHDİT (B)',
  radiological: 'RADYOLOJİK TEHDİT (R)',
  nuclear: 'NÜKLEER TEHDİT (N)',
}

/** @type {Record<string, string>} */
const HAT9_TERRAIN_LABELS = {
  flat: 'DÜZ ARAZİ (FLAT)',
  obstacles: 'ARAZİ ENGELLİ',
  urban: 'KENTSEL / YAPI İÇİ ALAN',
}

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
    if (!text) return 'VERİ YOK'

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

  if (!cbrn && !terrain) return 'VERİ YOK'

  if ((cbrn === 'none' || !cbrn) && terrain === 'flat') {
    return 'KBRN TEHDİDİ YOK / DÜZ ARAZİ (FLAT)'
  }
  if (cbrn === 'none' && !terrain) {
    return 'KBRN TEHDİDİ YOK / DÜZ ARAZİ (FLAT)'
  }

  const cbrnLabel = HAT9_CBRN_LABELS[cbrn] || (cbrn ? cbrn.toUpperCase() : 'KBRN BİLGİSİ YOK')
  const terrainLabel =
    HAT9_TERRAIN_LABELS[terrain] || (terrain ? terrain.toUpperCase() : 'ARAZİ BİLGİSİ YOK')

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
  const nineLine = normalizeNineLinePayload(rawNineLine)

  return (
    <ul className="list-none space-y-1">
      <NineLineReadoutRow label="HAT 1 · MGRS:" value={formatNineLineText(nineLine.line1_pickupGrid)} />
      <NineLineReadoutRow
        label="HAT 2 · FREKANS/ÇAĞRI:"
        value={formatNineLineText(nineLine.line2_radioFreqCallsign)}
      />
      <NineLineReadoutRow
        label="HAT 3 · ACİLİYET:"
        value={parseHat3Precedence(nineLine.line3_patientsPrecedence)}
      />
      <NineLineReadoutRow
        label="HAT 4 · EKİPMAN:"
        value={parseHat4Equipment(nineLine.line4_medicalEquipment)}
      />
      <NineLineReadoutRow
        label="HAT 5 · TAŞIMA:"
        value={parseHat5Transport(nineLine.line5_patientsType)}
      />
      <NineLineReadoutRow
        label="HAT 6 · GÜVENLİK:"
        value={parseHat6Security(nineLine.line6_pickupSecurity)}
      />
      <NineLineReadoutRow
        label="HAT 7 · İŞARET:"
        value={parseHat7Marking(nineLine.line7_lzMarking)}
      />
      <NineLineReadoutRow
        label="HAT 8 · UYRUK:"
        value={parseHat8Nationality(nineLine.line8_patientNationality)}
      />
      <NineLineReadoutRow
        label="HAT 9 · KBRN/ARAZİ:"
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
  const m = mist.mist && typeof mist.mist === 'object' ? mist.mist : mist
  return (
    <ul className="list-none space-y-1 text-app-text/70">
      <li>
        <span className="text-red-500/90">YARALI SAYISI:</span> {toStr(mist.casualtyCount) || '—'}
      </li>
      <li>
        <span className="text-red-500/90">M · METRIC:</span>{' '}
        {m && typeof m === 'object' && Array.isArray(m.metric)
          ? m.metric.join(', ')
          : toStr(m?.metric) || '—'}
      </li>
      <li>
        <span className="text-red-500/90">I · INJURY:</span> {toStr(m?.injurySite) || '—'}
      </li>
      <li>
        <span className="text-red-500/90">S · SIGNS:</span> {toStr(m?.vitals) || '—'}
      </li>
      <li>
        <span className="text-red-500/90">T · TREATMENT:</span>{' '}
        {m && typeof m === 'object' && Array.isArray(m.treatment)
          ? m.treatment.join(', ')
          : toStr(m?.treatment) || '—'}
      </li>
      <li>
        <span className="text-red-500/90">ÇAĞRI / FREKANS:</span> {toStr(mist.pickupCallsign) || '—'}
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
  const [expandedId, setExpandedId] = useState(/** @type {string | null} */ (null))

  const tableRows = useMemo(() => {
    const filtered = sortSimulationLogsNewestFirst(filterSimulationLogs(rangeLogs))
    return filtered.map((row) => buildHistoryRow(row))
  }, [rangeLogs])

  if (loading && tableRows.length === 0) {
    return (
      <p className="py-12 text-center font-mono text-[10px] uppercase tracking-wider text-app-text/45">
        SİMÜLASYON ARŞİVİ YÜKLENİYOR…
      </p>
    )
  }

  if (tableRows.length === 0) {
    return (
      <div className="flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-emerald-500/25 bg-slate-950/60">
        <History className="size-10 text-emerald-500/25" aria-hidden />
        <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-app-text/45">
          SİMÜLASYON GEÇMİŞ KAYDI YOK
        </p>
        <p className="mt-1 max-w-md text-center font-mono text-[9px] uppercase text-slate-700">
          MEDEVAC 9-LINE VEYA CASEVAC MIST OTURUMU TAMAMLAYIN
        </p>
      </div>
    )
  }

  return (
    <section aria-label="Simülasyon geçmiş kayıtları" className="space-y-3">
      <p className="font-mono text-[10px] uppercase tracking-wider text-app-text/55">
        TAKTİK DEBRİEF LOG · {tableRows.length} KAYIT
      </p>

      <div className="overflow-x-auto rounded-xl border border-emerald-500/25 bg-slate-950/80 shadow-[0_0_24px_rgb(16,185,129,0.08)]">
        <table className="w-full min-w-[640px] border-collapse font-mono text-[10px]">
          <thead>
            <tr className="border-b border-emerald-500/30 bg-slate-900/90 text-left uppercase tracking-wider text-emerald-500/80">
              <th className="px-3 py-2.5 font-bold">MOD</th>
              <th className="px-3 py-2.5 font-bold">TARİH / SAAT</th>
              <th className="px-3 py-2.5 font-bold">DURUM</th>
              <th className="px-3 py-2.5 font-bold">REAKSİYON PERFORMANSI</th>
              <th className="px-3 py-2.5 font-bold text-center">DETAYLAR</th>
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
                            KAPAT
                          </>
                        ) : (
                          <>
                            <ChevronDown className="size-4" aria-hidden />
                            AÇ
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
