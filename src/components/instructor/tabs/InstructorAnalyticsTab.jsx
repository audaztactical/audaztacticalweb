import { useEffect, useMemo, useState } from 'react'
import { BarChart2, FileDown, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import ProgressHudPanels from '../../progress/ProgressHudPanels'
import GroupLeaderboard from '../GroupLeaderboard'
import GroupOperatorSuccessChart from '../GroupOperatorSuccessChart'
import GroupShooterRecordsTable from '../GroupShooterRecordsTable'
import { subscribeGroupActivityLogs } from '../../../lib/firestoreGroupTraining'
import {
  subscribeGroupTrainingResults,
  subscribeGroupTrainings,
} from '../../../lib/firestoreGroupTrainings'
import { mergeInstructorGroupAnalytics } from '../../../lib/instructorGroupAnalytics'
import {
  buildGroupAggregateTrend,
  groupLogsToProgressRows,
} from '../../../lib/groupActivityHud'
import { computeProgressStats, buildTrendSeries } from '../../../lib/progressAnalytics'
import { buildLogsById } from '../../../lib/progressTacticalTooltip'
import { emitFirebaseError } from '../../../lib/firebaseErrorBus'
import {
  formatInstructorDateTime,
  formatInstructorDrillName,
  instructorLocale,
  instructorT,
  labelInstructorDiscipline,
} from '../../../lib/instructorDisplayText'
import { exportInstructorAnalyticsPdf } from '../../../lib/instructorReportPdf'
import { pdfFormatPercent } from '../../../lib/pdfReportText'

/** @typedef {import('../../../lib/firestoreGroups').TacticalGroup} TacticalGroup */
/** @typedef {import('../../../lib/firestoreInstructor').OperatorProfile} OperatorProfile */
/** @typedef {import('../../../lib/firestoreGroupTraining').GroupActivityLog} GroupActivityLog */
/** @typedef {import('../../../lib/firestoreGroupTrainings').TrainingResult} TrainingResult */
/** @typedef {import('../../../lib/firestoreGroupTrainings').GroupTraining} GroupTraining */

const selectClass =
  'w-full rounded-sm border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-app-text outline-none focus:border-emerald-500/60'

/**
 * @param {import('recharts').TooltipProps<number, string>} props
 */
function GroupPerfTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  if (!row || typeof row !== 'object') return null
  const date =
    row.timestampMs > 0
      ? new Date(row.timestampMs).toLocaleString(instructorLocale(), {
          dateStyle: 'short',
          timeStyle: 'short',
        })
      : instructorT('common.emDash')
  const score = pdfFormatPercent(row.value)
  const drill = formatInstructorDrillName(row.drillName)
  const discipline = labelInstructorDiscipline(row.discipline || row.tag)

  return (
    <div className="max-w-[260px] rounded border border-emerald-800/60 bg-slate-950 px-3 py-2 font-mono text-[10px] text-app-text shadow-lg">
      <p className="text-emerald-400">{instructorT('analytics.tooltip.session', { index: String(row.label || '').replace('#', '') })}</p>
      <p className="mt-1 text-app-text/90">{instructorT('analytics.tooltip.date', { date })}</p>
      <p className="text-app-text/90">
        {instructorT('analytics.tooltip.operator', { callsign: row.callsign || '—' })}
      </p>
      <p className="text-app-text/90">{instructorT('analytics.tooltip.score', { score })}</p>
      <p className="text-app-text/90">
        {instructorT('analytics.tooltip.discipline', { discipline })}
      </p>
      <p className="mt-0.5 break-words text-app-text/70">
        {instructorT('analytics.tooltip.drill', { drill })}
      </p>
    </div>
  )
}

/**
 * @param {{
 *   groups: TacticalGroup[]
 *   operators: OperatorProfile[]
 *   instructorName?: string
 * }} props
 */
export default function InstructorAnalyticsTab({ groups, operators, instructorName = '' }) {
  const { t } = useTranslation('instructor')
  const [focusMode, setFocusMode] = useState(/** @type {'group' | 'operator'} */ ('group'))
  const [groupId, setGroupId] = useState('')
  const [operatorId, setOperatorId] = useState('')
  const [activityLogs, setActivityLogs] = useState(/** @type {GroupActivityLog[]} */ ([]))
  const [trainingResults, setTrainingResults] = useState(/** @type {TrainingResult[]} */ ([]))
  const [groupTrainings, setGroupTrainings] = useState(/** @type {GroupTraining[]} */ ([]))
  const [logsLoading, setLogsLoading] = useState(false)
  const [pdfBusy, setPdfBusy] = useState(false)
  const [hudExpandedPanel, setHudExpandedPanel] = useState(
    /** @type {'MATRIX' | 'RADAR' | 'WAVE' | 'TCCC' | 'TREND' | null} */ (null),
  )

  const activeGroup = useMemo(() => groups.find((g) => g.groupId === groupId) ?? null, [groups, groupId])

  const groupMembers = useMemo(() => {
    if (!activeGroup) return []
    const set = new Set(activeGroup.members)
    return operators.filter((op) => set.has(op.uid))
  }, [activeGroup, operators])

  const opMap = useMemo(() => {
    const map = new Map()
    operators.forEach((op) => map.set(op.uid, op))
    return map
  }, [operators])

  useEffect(() => {
    if (groups.length > 0 && !groupId) setGroupId(groups[0].groupId)
  }, [groups, groupId])

  useEffect(() => {
    if (groupMembers.length > 0 && !operatorId) setOperatorId(groupMembers[0].uid)
  }, [groupMembers, operatorId])

  useEffect(() => {
    if (!groupId) {
      setActivityLogs([])
      setTrainingResults([])
      setGroupTrainings([])
      return undefined
    }

    setLogsLoading(true)
    let pending = 3

    const markReady = () => {
      pending -= 1
      if (pending <= 0) setLogsLoading(false)
    }

    const unsubActivity = subscribeGroupActivityLogs(
      groupId,
      (next) => {
        setActivityLogs(next)
        markReady()
      },
      (err) => {
        emitFirebaseError(err)
        markReady()
      },
    )

    const unsubResults = subscribeGroupTrainingResults(
      groupId,
      (next) => {
        setTrainingResults(next)
        markReady()
      },
      (err) => {
        emitFirebaseError(err)
        markReady()
      },
    )

    const unsubTrainings = subscribeGroupTrainings(
      groupId,
      (next) => {
        setGroupTrainings(next)
        markReady()
      },
      (err) => {
        emitFirebaseError(err)
        markReady()
      },
      { autoCloseExpired: true },
    )

    return () => {
      unsubActivity()
      unsubResults()
      unsubTrainings()
    }
  }, [groupId])

  const logs = useMemo(
    () => mergeInstructorGroupAnalytics(activityLogs, trainingResults, groupTrainings),
    [activityLogs, trainingResults, groupTrainings],
  )

  const aggregateTrend = useMemo(
    () =>
      buildGroupAggregateTrend(logs, 16, {
        resolveCallsign: (uid) => {
          const op = opMap.get(uid)
          return op?.callsign || op?.username || uid.slice(0, 8)
        },
      }),
    [logs, opMap],
  )

  const operatorHudLogs = useMemo(
    () => groupLogsToProgressRows(logs, operatorId || null),
    [logs, operatorId],
  )

  const hudStats = useMemo(
    () => computeProgressStats(operatorHudLogs, { activeDiscipline: 'all' }),
    [operatorHudLogs],
  )

  const hudTrendSeries = useMemo(() => {
    const bars = buildTrendSeries(operatorHudLogs, 8)
    const byId = buildLogsById(operatorHudLogs)
    return bars.map((bar) => ({ ...bar, logRow: byId.get(bar.id) ?? null }))
  }, [operatorHudLogs])

  const handleAnalyticsPdf = async () => {
    if (pdfBusy) return
    setPdfBusy(true)
    try {
      await exportInstructorAnalyticsPdf({
        logs,
        operators,
        group: activeGroup,
        instructorName,
      })
    } catch (err) {
      console.error(err)
    } finally {
      setPdfBusy(false)
    }
  }

  const tabBtn = (id, label) => {
    const active = focusMode === id
    return (
      <button
        type="button"
        onClick={() => setFocusMode(id)}
        className={[
          'flex-1 rounded border py-2 font-mono text-[9px] font-bold uppercase tracking-wider transition',
          active
            ? 'border-emerald-500/60 bg-emerald-950/40 text-emerald-300'
            : 'border-slate-800 text-app-text/55 hover:border-emerald-800/40',
        ].join(' ')}
      >
        {label}
      </button>
    )
  }

  return (
    <div className="min-w-0 max-w-full space-y-4 overflow-x-hidden">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex w-full max-w-md gap-2 rounded border border-slate-800 bg-black/40 p-1">
          {tabBtn('group', t('analytics.focusGroup'))}
          {tabBtn('operator', t('analytics.focusOperator'))}
        </div>
        <div className="flex w-full flex-col gap-2 sm:max-w-xs sm:items-stretch">
          <label className="w-full space-y-1">
            <span className="font-mono text-[9px] font-bold uppercase text-app-text/55">
              {t('analytics.groupLabel')}
            </span>
            <select className={selectClass} value={groupId} onChange={(e) => setGroupId(e.target.value)}>
              {groups.map((g) => (
                <option key={g.groupId} value={g.groupId}>
                  {g.groupName}
                </option>
              ))}
            </select>
          </label>
          {focusMode === 'group' ? (
            <button
              type="button"
              onClick={handleAnalyticsPdf}
              disabled={pdfBusy || logsLoading}
              className="inline-flex items-center justify-center gap-1.5 rounded border border-emerald-700/50 bg-emerald-950/40 px-3 py-2 font-mono text-[9px] font-bold uppercase tracking-wider text-emerald-300 disabled:opacity-50"
            >
              <FileDown className="size-3.5" aria-hidden />
              {pdfBusy ? t('analytics.pdfBusy') : t('analytics.pdfButton')}
            </button>
          ) : null}
        </div>
      </div>

      {focusMode === 'group' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <section className="min-w-0 overflow-x-hidden rounded-xl border border-emerald-900/35 bg-slate-950/90 p-3 sm:p-4">
              <p className="mb-3 flex items-center gap-2 font-mono text-[10px] font-bold uppercase text-emerald-400">
                <BarChart2 className="size-4 shrink-0" aria-hidden />
                {t('analytics.curveTitle')}
              </p>
              {logsLoading ? (
                <p className="flex items-center gap-2 py-16 font-mono text-[10px] uppercase text-app-text/55">
                  <Loader2 className="size-4 animate-spin text-emerald-400" aria-hidden />
                  {t('analytics.curveLoading')}
                </p>
              ) : aggregateTrend.length === 0 ? (
                <p className="py-16 text-center font-mono text-[10px] uppercase text-app-text/45">
                  {t('analytics.curveEmpty')}
                </p>
              ) : (
                <div className="relative h-[280px] min-h-[280px] w-full min-w-0">
                  <ResponsiveContainer
                    width="100%"
                    height={280}
                    minWidth={0}
                    debounce={50}
                    initialDimension={{ width: 480, height: 280 }}
                  >
                    <AreaChart data={aggregateTrend}>
                      <defs>
                        <linearGradient id="groupPerfFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#34d399" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                      <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 10 }} />
                      <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
                      <Tooltip content={<GroupPerfTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#34d399"
                        fill="url(#groupPerfFill)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>
            <GroupLeaderboard
              groups={groups.filter((g) => g.groupId === groupId)}
              operators={operators}
              logs={logs}
              hideGroupSelect
            />
          </div>
          <GroupOperatorSuccessChart group={activeGroup} operators={operators} logs={logs} />
          <GroupShooterRecordsTable logs={logs} operators={operators} loading={logsLoading} />
        </div>
      ) : (
        <div className="space-y-4">
          <label className="block max-w-xs space-y-1">
            <span className="font-mono text-[9px] font-bold uppercase text-app-text/55">
              {t('analytics.operatorLabel')}
            </span>
            <select className={selectClass} value={operatorId} onChange={(e) => setOperatorId(e.target.value)}>
              {groupMembers.map((op) => (
                <option key={op.uid} value={op.uid}>
                  {op.callsign || op.username}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: t('analytics.kpi.overall'), value: `%${hudStats.overallSuccess}` },
              { label: t('analytics.kpi.atis'), value: `%${hudStats.disciplineSuccess.atis}` },
              { label: t('analytics.kpi.cqb'), value: `%${hudStats.disciplineSuccess.cqb}` },
              { label: t('analytics.kpi.fof'), value: `%${hudStats.disciplineSuccess.fof}` },
            ].map((kpi) => (
              <div key={kpi.label} className="rounded border border-slate-800 bg-black/35 px-2.5 py-2">
                <p className="font-mono text-[8px] uppercase text-app-text/55">{kpi.label}</p>
                <p className="mt-1 font-mono text-lg font-black text-emerald-400">{kpi.value}</p>
              </div>
            ))}
          </div>

          <GroupShooterRecordsTable
            logs={logs.filter((l) => l.operatorId === operatorId)}
            operators={groupMembers}
            loading={logsLoading}
            maxRows={40}
          />

          <div className="min-h-[min(48vh,480px)] rounded-xl border border-emerald-900/30 bg-slate-950/60 p-2">
            {logsLoading ? (
              <p className="flex items-center justify-center gap-2 py-20 font-mono text-[10px] uppercase text-app-text/55">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                {t('analytics.hudLoading')}
              </p>
            ) : operatorHudLogs.length === 0 ? (
              <p className="flex h-40 items-center justify-center font-mono text-[10px] uppercase text-app-text/45">
                {t('analytics.hudEmpty')}
              </p>
            ) : (
              <ProgressHudPanels
                logs={operatorHudLogs}
                focusedLogId={null}
                radarLogs={operatorHudLogs}
                expandedPanel={hudExpandedPanel}
                onExpandedPanelChange={setHudExpandedPanel}
                trendSeries={hudTrendSeries}
                barsAnimate
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

void formatInstructorDateTime
