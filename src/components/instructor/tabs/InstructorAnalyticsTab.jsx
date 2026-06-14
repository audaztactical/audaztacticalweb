import { useEffect, useMemo, useState } from 'react'
import { BarChart2, Loader2 } from 'lucide-react'
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

/** @typedef {import('../../../lib/firestoreGroups').TacticalGroup} TacticalGroup */
/** @typedef {import('../../../lib/firestoreInstructor').OperatorProfile} OperatorProfile */
/** @typedef {import('../../../lib/firestoreGroupTraining').GroupActivityLog} GroupActivityLog */
/** @typedef {import('../../../lib/firestoreGroupTrainings').TrainingResult} TrainingResult */
/** @typedef {import('../../../lib/firestoreGroupTrainings').GroupTraining} GroupTraining */

const selectClass =
  'w-full rounded-sm border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-slate-200 outline-none focus:border-emerald-500/60'

/**
 * @param {{
 *   groups: TacticalGroup[]
 *   operators: OperatorProfile[]
 * }} props
 */
export default function InstructorAnalyticsTab({ groups, operators }) {
  const [focusMode, setFocusMode] = useState(/** @type {'group' | 'operator'} */ ('group'))
  const [groupId, setGroupId] = useState('')
  const [operatorId, setOperatorId] = useState('')
  const [activityLogs, setActivityLogs] = useState(/** @type {GroupActivityLog[]} */ ([]))
  const [trainingResults, setTrainingResults] = useState(/** @type {TrainingResult[]} */ ([]))
  const [groupTrainings, setGroupTrainings] = useState(/** @type {GroupTraining[]} */ ([]))
  const [logsLoading, setLogsLoading] = useState(false)
  const [hudExpandedPanel, setHudExpandedPanel] = useState(
    /** @type {'MATRIX' | 'RADAR' | 'WAVE' | 'TCCC' | 'TREND' | null} */ (null),
  )

  const activeGroup = useMemo(() => groups.find((g) => g.groupId === groupId) ?? null, [groups, groupId])

  const groupMembers = useMemo(() => {
    if (!activeGroup) return []
    const set = new Set(activeGroup.members)
    return operators.filter((op) => set.has(op.uid))
  }, [activeGroup, operators])

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

  const aggregateTrend = useMemo(() => buildGroupAggregateTrend(logs, 16), [logs])

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
            : 'border-slate-800 text-slate-500 hover:border-emerald-800/40',
        ].join(' ')}
      >
        {label}
      </button>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex w-full max-w-md gap-2 rounded border border-slate-800 bg-black/40 p-1">
          {tabBtn('group', 'GRUP ODAĞI')}
          {tabBtn('operator', 'OPERATÖR ODAĞI')}
        </div>
        <label className="w-full space-y-1 sm:max-w-xs">
          <span className="font-mono text-[9px] font-bold uppercase text-slate-500">Grup</span>
          <select className={selectClass} value={groupId} onChange={(e) => setGroupId(e.target.value)}>
            {groups.map((g) => (
              <option key={g.groupId} value={g.groupId}>
                {g.groupName}
              </option>
            ))}
          </select>
        </label>
      </div>

      {focusMode === 'group' ? (
        <div className="space-y-4">
        <div className="grid gap-4 xl:grid-cols-2">
          <section className="rounded-xl border border-emerald-900/35 bg-slate-950/90 p-4">
            <p className="mb-3 flex items-center gap-2 font-mono text-[10px] font-bold uppercase text-emerald-400">
              <BarChart2 className="size-4" aria-hidden />
              Grup Performans Eğrisi
            </p>
            {logsLoading ? (
              <p className="flex items-center gap-2 py-16 font-mono text-[10px] uppercase text-slate-500">
                <Loader2 className="size-4 animate-spin text-emerald-400" aria-hidden />
                Veri akışı…
              </p>
            ) : aggregateTrend.length === 0 ? (
              <p className="py-16 text-center font-mono text-[10px] uppercase text-slate-600">KAYIT YOK</p>
            ) : (
              <div className="h-[280px] min-h-[280px] w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={280}>
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
                    <Tooltip
                      contentStyle={{
                        background: '#0f172a',
                        border: '1px solid #065f46',
                        fontFamily: 'monospace',
                        fontSize: 10,
                      }}
                    />
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
            <span className="font-mono text-[9px] font-bold uppercase text-slate-500">Operatör</span>
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
              { label: 'GENEL', value: `%${hudStats.overallSuccess}` },
              { label: 'ATIŞ', value: `%${hudStats.disciplineSuccess.atis}` },
              { label: 'CQB', value: `%${hudStats.disciplineSuccess.cqb}` },
              { label: 'FoF', value: `%${hudStats.disciplineSuccess.fof}` },
            ].map((kpi) => (
              <div key={kpi.label} className="rounded border border-slate-800 bg-black/35 px-2.5 py-2">
                <p className="font-mono text-[8px] uppercase text-slate-500">{kpi.label}</p>
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
              <p className="flex items-center justify-center gap-2 py-20 font-mono text-[10px] uppercase text-slate-500">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                HUD senkron…
              </p>
            ) : operatorHudLogs.length === 0 ? (
              <p className="flex h-40 items-center justify-center font-mono text-[10px] uppercase text-slate-600">
                AKADEMİK KAYIT YOK
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
