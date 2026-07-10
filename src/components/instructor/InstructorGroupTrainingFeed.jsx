import { useMemo, useState } from 'react'
import { Activity, FileDown, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { filterOperatorGroupTrainingLogs } from '../../lib/firestoreGroupTraining'
import {
  formatInstructorDateTime,
  formatInstructorDrillName,
  labelInstructorDiscipline,
  labelInstructorSource,
} from '../../lib/instructorDisplayText'
import { exportInstructorFeedPdf } from '../../lib/instructorReportPdf'

/** @typedef {import('../../lib/firestoreGroupTraining').GroupActivityLog} GroupActivityLog */
/** @typedef {import('../../lib/firestoreInstructor').OperatorProfile} OperatorProfile */

/**
 * @param {GroupActivityLog} log
 */
function resolveFeedSourceKey(log) {
  if (log.sourceDomain === 'trainings') return 'trainings'
  if (log.sourceDomain === 'range_logs') return 'range_logs'
  if (log.type === 'operator_group_feed' || log.operatorSubmitted) return 'operator'
  return 'instructor'
}

/**
 * @param {{
 *   logs: GroupActivityLog[]
 *   operators: OperatorProfile[]
 *   loading?: boolean
 *   maxRows?: number
 *   groupName?: string
 *   instructorName?: string
 * }} props
 */
export default function InstructorGroupTrainingFeed({
  logs,
  operators,
  loading = false,
  maxRows = 24,
  groupName = '',
  instructorName = '',
}) {
  const { t } = useTranslation('instructor')
  const [pdfBusy, setPdfBusy] = useState(false)

  const operatorMap = useMemo(() => {
    const map = new Map()
    operators.forEach((op) => map.set(op.uid, op))
    return map
  }, [operators])

  const groupLogs = useMemo(
    () => filterOperatorGroupTrainingLogs(logs).slice(0, maxRows),
    [logs, maxRows],
  )

  const handlePdf = async () => {
    if (pdfBusy) return
    setPdfBusy(true)
    try {
      await exportInstructorFeedPdf({
        logs,
        operators,
        groupName: groupName || 'ALL',
        instructorName,
      })
    } catch (err) {
      console.error(err)
    } finally {
      setPdfBusy(false)
    }
  }

  return (
    <section className="min-w-0 max-w-full overflow-x-hidden rounded-xl border border-accent/20 bg-app-bg/90 p-3 sm:p-4">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex min-w-0 items-center gap-2 font-mono-technical text-[9px] font-bold uppercase tracking-[0.24em] text-accent">
          <Activity className="size-4 shrink-0" strokeWidth={1.5} aria-hidden />
          <span className="min-w-0 break-words">{t('feed.title')}</span>
        </p>
        <button
          type="button"
          onClick={handlePdf}
          disabled={pdfBusy || loading}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded border border-emerald-700/50 bg-emerald-950/40 px-3 py-1.5 font-mono text-[9px] font-bold uppercase tracking-wider text-emerald-300 disabled:opacity-50"
        >
          <FileDown className="size-3.5" aria-hidden />
          {pdfBusy ? t('feed.pdfBusy') : t('feed.pdfButton')}
        </button>
      </div>

      {loading ? (
        <p className="flex items-center gap-2 py-6 font-mono text-[10px] uppercase text-app-text/55">
          <Loader2 className="size-4 animate-spin text-accent" aria-hidden />
          {t('feed.loading')}
        </p>
      ) : groupLogs.length === 0 ? (
        <p className="py-6 text-center font-mono text-[10px] uppercase text-app-text/45">{t('feed.empty')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse font-mono text-[10px] uppercase">
            <thead>
              <tr className="border-b border-slate-800 text-left text-app-text/55">
                <th className="px-2 py-2">{t('feed.cols.time')}</th>
                <th className="px-2 py-2">{t('feed.cols.operator')}</th>
                <th className="px-2 py-2">{t('feed.cols.discipline')}</th>
                <th className="px-2 py-2">{t('feed.cols.record')}</th>
                <th className="px-2 py-2">{t('feed.cols.score')}</th>
                <th className="px-2 py-2">{t('feed.cols.source')}</th>
              </tr>
            </thead>
            <tbody>
              {groupLogs.map((log) => {
                const op = operatorMap.get(log.operatorId)
                const callsign = op?.callsign || op?.username || log.operatorId.slice(0, 8)
                const drill = formatInstructorDrillName(log.drillName, log.templateId)

                return (
                  <tr key={log.logId} className="border-b border-slate-800/60 text-app-text/90">
                    <td className="px-2 py-2 tabular-nums text-app-text/55">
                      {formatInstructorDateTime(log.timestamp)}
                    </td>
                    <td className="px-2 py-2 font-bold text-accent">{callsign}</td>
                    <td className="px-2 py-2 text-accent">{labelInstructorDiscipline(log.discipline)}</td>
                    <td className="max-w-[180px] truncate px-2 py-2" title={drill}>
                      {drill}
                    </td>
                    <td className="px-2 py-2 tabular-nums text-emerald-400">{log.score}%</td>
                    <td className="px-2 py-2 text-app-text/55">
                      {labelInstructorSource(resolveFeedSourceKey(log))}
                    </td>
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
