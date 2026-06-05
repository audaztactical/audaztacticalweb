import { useMemo } from 'react'
import { Activity, Loader2 } from 'lucide-react'
import { filterOperatorGroupTrainingLogs } from '../../lib/firestoreGroupTraining'

/** @typedef {import('../../lib/firestoreGroupTraining').GroupActivityLog} GroupActivityLog */
/** @typedef {import('../../lib/firestoreInstructor').OperatorProfile} OperatorProfile */

const DISCIPLINE_LABELS = {
  atis: 'ATIŞ',
  cqb: 'CQB',
  fof: 'FOF',
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
 * @param {{
 *   logs: GroupActivityLog[]
 *   operators: OperatorProfile[]
 *   loading?: boolean
 *   maxRows?: number
 * }} props
 */
export default function InstructorGroupTrainingFeed({ logs, operators, loading = false, maxRows = 24 }) {
  const operatorMap = useMemo(() => {
    const map = new Map()
    operators.forEach((op) => map.set(op.uid, op))
    return map
  }, [operators])

  const groupLogs = useMemo(() => filterOperatorGroupTrainingLogs(logs).slice(0, maxRows), [logs, maxRows])

  return (
    <section className="rounded-xl border border-[#00FF41]/20 bg-[#050805]/90 p-4">
      <p className="mb-3 flex items-center gap-2 font-mono-technical text-[9px] font-bold uppercase tracking-[0.24em] text-[#00FF41]">
        <Activity className="size-4" strokeWidth={1.5} aria-hidden />
        Grup Eğitimi Aktivite Feed · GROUP · Canlı
      </p>

      {loading ? (
        <p className="flex items-center gap-2 py-6 font-mono text-[10px] uppercase text-slate-500">
          <Loader2 className="size-4 animate-spin text-[#00FF41]" aria-hidden />
          Feed senkronize ediliyor…
        </p>
      ) : groupLogs.length === 0 ? (
        <p className="py-6 text-center font-mono text-[10px] uppercase text-slate-600">
          Henüz grup eğitimi kaydı yok · Operatörler antrenman modülünden &quot;Grup Eğitimi&quot; seçerek loglayabilir
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse font-mono text-[10px] uppercase">
            <thead>
              <tr className="border-b border-slate-800 text-left text-slate-500">
                <th className="px-2 py-2">Zaman</th>
                <th className="px-2 py-2">Operatör</th>
                <th className="px-2 py-2">Disiplin</th>
                <th className="px-2 py-2">Kayıt</th>
                <th className="px-2 py-2">Skor</th>
                <th className="px-2 py-2">Kaynak</th>
              </tr>
            </thead>
            <tbody>
              {groupLogs.map((log) => {
                const op = operatorMap.get(log.operatorId)
                const callsign = op?.callsign || op?.username || log.operatorId.slice(0, 8)
                const discipline = DISCIPLINE_LABELS[log.discipline] ?? log.discipline.toUpperCase()
                const source =
                  log.sourceDomain === 'trainings'
                    ? 'TRAININGS'
                    : log.sourceDomain === 'range_logs'
                      ? 'RANGE_LOGS'
                      : log.type === 'operator_group_feed'
                        ? 'OPERATÖR'
                        : 'EĞİTMEN'

                return (
                  <tr key={log.logId} className="border-b border-slate-800/60 text-slate-300">
                    <td className="px-2 py-2 tabular-nums text-slate-500">{formatLogTime(log.timestamp)}</td>
                    <td className="px-2 py-2 font-bold text-[#ffb400]">{callsign}</td>
                    <td className="px-2 py-2 text-[#00FF41]">{discipline}</td>
                    <td className="max-w-[180px] truncate px-2 py-2" title={log.drillName}>
                      {log.drillName || '—'}
                    </td>
                    <td className="px-2 py-2 tabular-nums text-emerald-400">{log.score}%</td>
                    <td className="px-2 py-2 text-slate-500">{source}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
