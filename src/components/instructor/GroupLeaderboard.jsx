import { useEffect, useMemo, useState } from 'react'
import { Loader2, Trophy } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { buildGroupLeaderboard } from '../../lib/firestoreGroups'
import { buildLiveGroupLeaderboard } from '../../lib/instructorGroupAnalytics'
import { emitFirebaseError } from '../../lib/firebaseErrorBus'

/** @typedef {import('../../lib/firestoreGroups').TacticalGroup} TacticalGroup */
/** @typedef {import('../../lib/firestoreInstructor').OperatorProfile} OperatorProfile */
/** @typedef {import('../../lib/groupLeaderboard').GroupLeaderboardRow} GroupLeaderboardRow */
/** @typedef {import('../../lib/firestoreGroupTraining').GroupActivityLog} GroupActivityLog */

const RANK_STYLES = [
  'border-amber-400/70 bg-gradient-to-r from-amber-950/50 to-slate-950/80 shadow-[0_0_20px_-4px_rgba(251,191,36,0.45)]',
  'border-slate-300/50 bg-gradient-to-r from-slate-800/40 to-slate-950/80 shadow-[0_0_16px_-6px_rgba(203,213,225,0.25)]',
  'border-amber-700/55 bg-gradient-to-r from-amber-950/30 to-slate-950/80 shadow-[0_0_14px_-6px_rgba(180,83,9,0.3)]',
]

/**
 * @param {{
 *   groups: TacticalGroup[]
 *   operators: OperatorProfile[]
 *   logs?: GroupActivityLog[]
 *   hideGroupSelect?: boolean
 * }} props
 */
export default function GroupLeaderboard({ groups, operators, logs, hideGroupSelect = false }) {
  const { t } = useTranslation('instructor')
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [rows, setRows] = useState(/** @type {GroupLeaderboardRow[]} */ ([]))
  const [loading, setLoading] = useState(false)

  const selectedGroup = useMemo(
    () => groups.find((g) => g.groupId === selectedGroupId) ?? null,
    [groups, selectedGroupId],
  )

  const liveRows = useMemo(() => {
    if (!selectedGroup || !logs) return null
    return buildLiveGroupLeaderboard(selectedGroup, operators, logs)
  }, [selectedGroup, operators, logs])

  useEffect(() => {
    if (groups.length > 0 && !selectedGroupId) {
      setSelectedGroupId(groups[0].groupId)
    }
  }, [groups, selectedGroupId])

  useEffect(() => {
    if (liveRows) {
      setRows(liveRows)
      setLoading(false)
      return undefined
    }

    if (!selectedGroup) {
      setRows([])
      return undefined
    }

    let cancelled = false
    setLoading(true)

    buildGroupLeaderboard(selectedGroup, operators)
      .then((result) => {
        if (!cancelled) setRows(result)
      })
      .catch((err) => {
        emitFirebaseError(err)
        if (!cancelled) setRows([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [selectedGroup, operators, liveRows])

  return (
    <section className="min-w-0 max-w-full overflow-x-hidden rounded-xl border border-emerald-900/35 bg-slate-950/90 p-3 sm:p-4">
      <p className="mb-3 flex flex-wrap items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-400">
        <Trophy className="size-4 shrink-0" strokeWidth={1.5} aria-hidden />
        <span className="min-w-0 break-words">{t('leaderboard.title')}</span>
        {logs ? (
          <span className="ml-auto rounded border border-emerald-800/50 px-1.5 py-0.5 text-[8px] text-emerald-500">
            {t('leaderboard.liveBadge')}
          </span>
        ) : null}
      </p>

      {!hideGroupSelect ? (
        <label className="mb-4 block space-y-1.5">
          <span className="font-mono text-[9px] font-bold uppercase text-app-text/55">
            {t('leaderboard.selectGroup')}
          </span>
          <select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            disabled={groups.length === 0}
            className="w-full rounded-sm border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-app-text outline-none focus:border-emerald-500/60"
          >
            {groups.length === 0 ? (
              <option value="">{t('leaderboard.noGroups')}</option>
            ) : (
              groups.map((g) => (
                <option key={g.groupId} value={g.groupId}>
                  {t('leaderboard.memberCount', { name: g.groupName, count: g.members.length })}
                </option>
              ))
            )}
          </select>
        </label>
      ) : null}

      {loading ? (
        <p className="flex items-center justify-center gap-2 py-10 font-mono text-[10px] uppercase text-app-text/55">
          <Loader2 className="size-4 animate-spin text-emerald-400" aria-hidden />
          {t('leaderboard.loading')}
        </p>
      ) : rows.length === 0 ? (
        <p className="py-8 text-center font-mono text-[10px] uppercase text-app-text/45">
          {selectedGroup?.members.length ? t('leaderboard.emptyMetrics') : t('leaderboard.emptyMembers')}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse font-mono text-[10px] uppercase">
            <thead>
              <tr className="border-b border-slate-800 text-left text-app-text/55">
                <th className="px-2 py-2">{t('leaderboard.cols.rank')}</th>
                <th className="px-2 py-2">{t('leaderboard.cols.callsign')}</th>
                <th className="px-2 py-2">{t('leaderboard.cols.totalDrills')}</th>
                <th className="px-2 py-2">{t('leaderboard.cols.atisAvg')}</th>
                <th className="px-2 py-2">{t('leaderboard.cols.cqbSpeed')}</th>
                <th className="px-2 py-2">{t('leaderboard.cols.overall')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const rank = idx + 1
                const podium = rank <= 3 ? RANK_STYLES[rank - 1] : 'border-slate-800/80 bg-slate-900/30'
                return (
                  <tr key={row.uid} className={`border ${podium}`}>
                    <td className="px-2 py-2.5 font-black tabular-nums text-amber-300">{rank}</td>
                    <td className="px-2 py-2.5 font-bold text-app-text">{row.callsign}</td>
                    <td className="px-2 py-2.5 tabular-nums text-app-text/70">{row.totalDrills}</td>
                    <td className="px-2 py-2.5 tabular-nums text-sky-400">%{row.atisAverage}</td>
                    <td className="px-2 py-2.5 tabular-nums text-amber-400/90">
                      {row.cqbSpeedSec != null ? row.cqbSpeedSec : '—'}
                    </td>
                    <td className="px-2 py-2.5 font-bold tabular-nums text-emerald-400">%{row.overallSuccess}</td>
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
