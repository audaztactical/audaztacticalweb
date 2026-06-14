import { useMemo, useState } from 'react'
import { ClipboardList, Loader2 } from 'lucide-react'
import { computeGroupLogHitPercent } from '../../lib/groupActivityHud'
import { formatGroupTrainingStatusLabelInstructor } from '../../lib/groupTrainingAssessment'

/** @typedef {import('../../lib/firestoreGroupTraining').GroupActivityLog} GroupActivityLog */
/** @typedef {import('../../lib/firestoreInstructor').OperatorProfile} OperatorProfile */

const DISCIPLINE_LABELS = {
  atis: 'ATIŞ',
  cqb: 'CQB',
  fof: 'FoF',
  vbss: 'VBSS',
  tccc: 'TCCC',
  egitim: 'EĞİTİM',
}

/**
 * @param {unknown} ts
 */
function formatLogTime(ts) {
  if (ts && typeof ts === 'object' && 'toDate' in ts && typeof ts.toDate === 'function') {
    return ts.toDate().toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })
  }
  const ms = Date.parse(String(ts ?? ''))
  if (!ms) return '—'
  return new Date(ms).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })
}

/**
 * @param {GroupActivityLog} log
 */
function resolveSourceLabel(log) {
  if (log.sourceDomain === 'group_trainings' || log.type === 'group_training_result') return 'GRP-07'
  if (log.sourceDomain === 'trainings') return 'TRAININGS'
  if (log.sourceDomain === 'range_logs') return 'RANGE'
  if (log.type === 'operator_group_feed' || log.operatorSubmitted) return 'OPERATÖR'
  return 'EĞİTMEN'
}

/**
 * @param {GroupActivityLog} log
 */
function resolveHitsDisplay(log) {
  if (log.discipline === 'atis') {
    const shots = Math.max(1, log.atisShotsFired || log.criticalMetrics?.totalRounds || 1)
    const hits = Math.min(shots, Math.max(0, log.atisHits || log.score))
    return `${hits}/${shots}`
  }
  if (log.discipline === 'cqb') {
    const total = Math.max(1, log.cqbTotalThreats || log.criticalMetrics?.totalThreats || 1)
    const elim = Math.min(total, log.eliminatedThreats ?? log.score ?? 0)
    return `${elim}/${total}`
  }
  return `${log.score}%`
}

/**
 * @param {GroupActivityLog} log
 */
function resolveStatusLabel(log) {
  if (log.statusResult) {
    return formatGroupTrainingStatusLabelInstructor(log.statusResult, log.isTargetMet === true)
  }
  const pct = computeGroupLogHitPercent(log)
  return pct >= 50 ? 'Geçti' : 'Kaldı'
}

const selectClass =
  'w-full rounded-sm border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-slate-200 outline-none focus:border-emerald-500/60'

/**
 * @param {{
 *   logs: GroupActivityLog[]
 *   operators: OperatorProfile[]
 *   loading?: boolean
 *   maxRows?: number
 * }} props
 */
export default function GroupShooterRecordsTable({ logs, operators, loading = false, maxRows = 80 }) {
  const [operatorFilter, setOperatorFilter] = useState('')

  const operatorMap = useMemo(() => {
    const map = new Map()
    operators.forEach((op) => map.set(op.uid, op))
    return map
  }, [operators])

  const shootersInLogs = useMemo(() => {
    const ids = [...new Set(logs.map((l) => l.operatorId).filter(Boolean))]
    return ids
      .map((uid) => {
        const op = operatorMap.get(uid)
        return { uid, label: op?.callsign || op?.username || uid.slice(0, 8) }
      })
      .sort((a, b) => a.label.localeCompare(b.label, 'tr'))
  }, [logs, operatorMap])

  const visibleRows = useMemo(() => {
    const filtered = operatorFilter ? logs.filter((l) => l.operatorId === operatorFilter) : logs
    return filtered.slice(0, maxRows)
  }, [logs, operatorFilter, maxRows])

  return (
    <section className="rounded-xl border border-emerald-900/35 bg-slate-950/90 p-4">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-400">
          <ClipboardList className="size-4 shrink-0" strokeWidth={1.5} aria-hidden />
          [ TÜM ATICI KAYITLARI · CANLI ]
        </p>
        <label className="w-full space-y-1 sm:max-w-[220px]">
          <span className="font-mono text-[9px] font-bold uppercase text-slate-500">Operatör Filtre</span>
          <select
            className={selectClass}
            value={operatorFilter}
            onChange={(e) => setOperatorFilter(e.target.value)}
          >
            <option value="">TÜM ATICILAR</option>
            {shootersInLogs.map((s) => (
              <option key={s.uid} value={s.uid}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading ? (
        <p className="flex items-center justify-center gap-2 py-12 font-mono text-[10px] uppercase text-slate-500">
          <Loader2 className="size-4 animate-spin text-emerald-400" aria-hidden />
          Kayıt akışı senkronize ediliyor…
        </p>
      ) : visibleRows.length === 0 ? (
        <p className="py-10 text-center font-mono text-[10px] uppercase text-slate-600">
          Bu grupta henüz atıcı kaydı yok
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] border-collapse font-mono text-[10px] uppercase">
            <thead>
              <tr className="border-b border-slate-800 text-left text-slate-500">
                <th className="px-2 py-2">Zaman</th>
                <th className="px-2 py-2">Callsign</th>
                <th className="px-2 py-2">Kayıt</th>
                <th className="px-2 py-2">Disiplin</th>
                <th className="px-2 py-2">İsabet</th>
                <th className="px-2 py-2">Başarı</th>
                <th className="px-2 py-2">Süre</th>
                <th className="px-2 py-2">Durum</th>
                <th className="px-2 py-2">Kaynak</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((log) => {
                const op = operatorMap.get(log.operatorId)
                const callsign = op?.callsign || op?.username || log.operatorId.slice(0, 8)
                const discipline = DISCIPLINE_LABELS[log.discipline] ?? String(log.discipline).toUpperCase()
                const successPct = computeGroupLogHitPercent(log)
                const status = resolveStatusLabel(log)
                const passed = status === 'Geçti' || log.isTargetMet === true

                return (
                  <tr key={log.logId} className="border-b border-slate-800/60 text-slate-300">
                    <td className="px-2 py-2 tabular-nums text-slate-500">{formatLogTime(log.timestamp)}</td>
                    <td className="px-2 py-2 font-bold text-amber-300">{callsign}</td>
                    <td className="max-w-[200px] truncate px-2 py-2" title={log.drillName}>
                      {log.drillName || '—'}
                    </td>
                    <td className="px-2 py-2 text-sky-400">{discipline}</td>
                    <td className="px-2 py-2 tabular-nums">{resolveHitsDisplay(log)}</td>
                    <td className="px-2 py-2 tabular-nums text-emerald-400">%{successPct}</td>
                    <td className="px-2 py-2 tabular-nums text-amber-400/90">
                      {log.duration != null && Number.isFinite(Number(log.duration))
                        ? `${Number(log.duration)} sn`
                        : '—'}
                    </td>
                    <td
                      className={[
                        'px-2 py-2 font-bold',
                        passed ? 'text-emerald-400' : 'text-rose-400/90',
                      ].join(' ')}
                    >
                      {status}
                    </td>
                    <td className="px-2 py-2 text-slate-500">{resolveSourceLabel(log)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {logs.length > maxRows ? (
            <p className="mt-2 text-center font-mono text-[9px] uppercase text-slate-600">
              Son {maxRows} kayıt gösteriliyor · Toplam {logs.length}
            </p>
          ) : null}
        </div>
      )}
    </section>
  )
}
