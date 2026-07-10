import { useMemo, useState } from 'react'
import { Loader2, Search, User, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { buildInstructorSquadRoster } from '../../../lib/instructorRoster'
import InstructorGroupTrainingFeed from '../InstructorGroupTrainingFeed'

/** @typedef {import('../../../lib/firestoreGroups').TacticalGroup} TacticalGroup */
/** @typedef {import('../../../lib/firestoreInstructor').OperatorProfile} OperatorProfile */
/** @typedef {import('../../../lib/firestoreGroupTraining').GroupActivityLog} GroupActivityLog */
/** @typedef {import('../../../lib/instructorRoster').SquadRosterRow} SquadRosterRow */

const inputClass =
  'w-full rounded-sm border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-app-text outline-none focus:border-amber-500/60'

/**
 * @param {{
 *   groups: TacticalGroup[]
 *   operators: OperatorProfile[]
 *   activityLogs: GroupActivityLog[]
 *   loading?: boolean
 *   instructorName?: string
 * }} props
 */
export default function InstructorOperatorsTab({
  groups,
  operators,
  activityLogs,
  loading = false,
  instructorName = '',
}) {
  const { t } = useTranslation('instructor')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(/** @type {SquadRosterRow | null} */ (null))

  const roster = useMemo(
    () => buildInstructorSquadRoster(groups, operators, activityLogs),
    [groups, operators, activityLogs],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return roster
    return roster.filter((row) => {
      const hay = [row.callsign, row.username, row.email, ...row.groupNames].join(' ').toLowerCase()
      return hay.includes(q)
    })
  }, [roster, query])

  const feedGroupName =
    groups.length === 1 ? groups[0].groupName : groups.map((g) => g.groupName).join('+') || 'ALL'

  return (
    <div className="min-w-0 max-w-full space-y-4 overflow-x-hidden">
      <header className="rounded-xl border border-amber-900/25 bg-amber-950/10 px-4 py-3">
        <p className="font-mono text-[9px] font-bold uppercase tracking-[0.24em] text-amber-500">
          {t('operators.header')}
        </p>
        <p className="mt-1 font-mono text-[10px] uppercase text-app-text/55">{t('operators.subheader')}</p>
      </header>

      <InstructorGroupTrainingFeed
        logs={activityLogs}
        operators={operators}
        loading={loading}
        groupName={feedGroupName}
        instructorName={instructorName}
      />

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-amber-500/70" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('operators.searchPlaceholder')}
          className={`${inputClass} pl-10`}
        />
      </div>

      {loading ? (
        <p className="flex items-center gap-2 py-12 font-mono text-[10px] uppercase text-app-text/55">
          <Loader2 className="size-4 animate-spin text-amber-400" aria-hidden />
          {t('operators.loadingRoster')}
        </p>
      ) : filtered.length === 0 ? (
        <p className="py-12 text-center font-mono text-[10px] uppercase text-app-text/45">
          {roster.length === 0 ? t('operators.emptyRoster') : t('operators.emptyFilter')}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-amber-900/25">
          <table className="w-full min-w-[640px] border-collapse font-mono text-[10px] uppercase">
            <thead>
              <tr className="border-b border-slate-800 bg-black/40 text-left text-app-text/55">
                <th className="px-3 py-2">{t('operators.cols.callsign')}</th>
                <th className="px-3 py-2">{t('operators.cols.user')}</th>
                <th className="px-3 py-2">{t('operators.cols.groups')}</th>
                <th className="px-3 py-2">{t('operators.cols.sessions')}</th>
                <th className="px-3 py-2">{t('operators.cols.success')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr
                  key={row.uid}
                  className="cursor-pointer border-b border-slate-800/60 bg-slate-950/40 transition hover:bg-amber-950/20"
                  onClick={() => setSelected(row)}
                >
                  <td className="px-3 py-2.5 font-bold text-amber-200">{row.callsign}</td>
                  <td className="px-3 py-2.5 text-app-text/70">@{row.username || row.uid.slice(0, 8)}</td>
                  <td className="max-w-[200px] truncate px-3 py-2.5 text-app-text/55">
                    {row.groupNames.join(' · ')}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-sky-400">{row.totalSessions}</td>
                  <td className="px-3 py-2.5 font-bold tabular-nums text-emerald-400">%{row.overallSuccess}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-amber-600/40 bg-slate-950 p-5 shadow-[0_0_48px_-8px_rgba(255,180,0,0.35)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="mt-1 font-mono text-lg font-bold uppercase text-app-text">{selected.callsign}</h3>
                <p className="font-mono text-[10px] text-app-text/55">@{selected.username}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded border border-slate-700 p-1 text-app-text/70 hover:text-app-text"
                aria-label={t('operators.detail.close')}
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded border border-slate-800 bg-black/40 p-3">
                <p className="font-mono text-[8px] uppercase text-app-text/55">{t('operators.detail.sessions')}</p>
                <p className="mt-1 font-mono text-xl font-black text-sky-400">{selected.totalSessions}</p>
              </div>
              <div className="rounded border border-slate-800 bg-black/40 p-3">
                <p className="font-mono text-[8px] uppercase text-app-text/55">{t('operators.detail.success')}</p>
                <p className="mt-1 font-mono text-xl font-black text-emerald-400">%{selected.overallSuccess}</p>
              </div>
            </div>

            <div className="mt-4 rounded border border-amber-900/30 bg-amber-950/20 p-3">
              <p className="mb-2 flex items-center gap-1.5 font-mono text-[9px] font-bold uppercase text-amber-400">
                <User className="size-3.5" aria-hidden />
                {t('operators.detail.groups')}
              </p>
              <ul className="space-y-1 font-mono text-[10px] uppercase text-app-text/90">
                {selected.groupNames.map((name) => (
                  <li key={name}>• {name}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
