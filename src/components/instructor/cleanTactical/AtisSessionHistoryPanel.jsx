import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, History, Loader2 } from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import { subscribeInstructorMergedGroupTrainingResults } from '../../../lib/firestoreGroupTrainings'
import {
  computeGroupTrainingAssessment,
  formatGroupTrainingStatusLabelInstructor,
} from '../../../lib/groupTrainingAssessment'
import { emitFirebaseError } from '../../../lib/firebaseErrorBus'
import CleanFade from './CleanFade'
import {
  computeSessionDetailStats,
  computeSessionHitPercentAverage,
  formatAtisSessionTimestamp,
  resolveSessionClosedAtMs,
  resultsForTraining,
  subscribeInstructorCompletedGroupTrainings,
  timestampToDisplayMs,
} from './atisSessionHistory'
import {
  icEmptyCell,
  icEmptyDesc,
  icEmptyTitle,
  icStatusFail,
  icStatusOk,
  icStatusWarn,
  icTable,
  icTableWrap,
  icTd,
  icTh,
  icTrHover,
  resolveSectorAccent,
} from '../layout/instructorCommandTokens'

/** @typedef {import('../../../lib/firestoreGroups').TacticalGroup} TacticalGroup */
/** @typedef {import('../../../lib/firestoreInstructor').OperatorProfile} OperatorProfile */
/** @typedef {import('../../../lib/firestoreGroupTrainings').GroupTraining} GroupTraining */
/** @typedef {import('../../../lib/firestoreGroupTrainings').TrainingResult} TrainingResult */

/**
 * @param {{
 *   groups: TacticalGroup[]
 *   operators: OperatorProfile[]
 *   instructorId: string
 * }} props
 */
export default function AtisSessionHistoryPanel({ groups, operators, instructorId }) {
  const { user, userData } = useAuth()
  const accent = resolveSectorAccent('atis')

  const [completedTrainings, setCompletedTrainings] = useState(/** @type {GroupTraining[]} */ ([]))
  const [allResults, setAllResults] = useState(/** @type {TrainingResult[]} */ ([]))
  const [loading, setLoading] = useState(false)
  const [expandedId, setExpandedId] = useState('')

  const groupIds = useMemo(() => groups.map((g) => g.groupId).filter(Boolean), [groups])

  const groupNameById = useMemo(() => {
    const map = new Map()
    for (const g of groups) map.set(g.groupId, g.groupName)
    return map
  }, [groups])

  const callsignByUid = useMemo(() => {
    /** @type {Map<string, string>} */
    const map = new Map()
    const selfCallsign = (userData?.callsign || user?.displayName || 'Eğitmen').trim()
    if (instructorId) map.set(instructorId, selfCallsign)
    for (const op of operators) {
      map.set(op.uid, (op.callsign || op.username || 'Operatör').trim())
    }
    return map
  }, [operators, instructorId, user, userData])

  useEffect(() => {
    if (!groupIds.length || !instructorId) {
      setCompletedTrainings([])
      setLoading(false)
      return undefined
    }

    let active = true
    setLoading(true)
    let pending = 2

    const markReady = () => {
      pending -= 1
      if (pending <= 0 && active) setLoading(false)
    }

    const unsubCompleted = subscribeInstructorCompletedGroupTrainings(
      groupIds,
      instructorId,
      (rows) => {
        if (!active) return
        setCompletedTrainings(rows)
        markReady()
      },
      (err) => {
        if (!active) return
        emitFirebaseError(err)
        markReady()
      },
    )

    const unsubResults = subscribeInstructorMergedGroupTrainingResults(
      groupIds,
      (rows) => {
        if (!active) return
        setAllResults(rows)
        markReady()
      },
      (err) => {
        if (!active) return
        emitFirebaseError(err)
        markReady()
      },
    )

    return () => {
      active = false
      unsubCompleted()
      unsubResults()
    }
  }, [groupIds, instructorId])

  const toggleExpanded = (trainingId) => {
    setExpandedId((prev) => (prev === trainingId ? '' : trainingId))
  }

  return (
    <CleanFade>
      <div className={`overflow-hidden rounded-lg border ${accent.panelBorder} bg-black/40`}>
        <div className="flex items-center gap-2 border-b border-amber-500/20 bg-amber-950/15 px-3 py-2">
          <History className={`size-3.5 ${accent.icon}`} strokeWidth={1.5} aria-hidden />
          <p className={`font-mono-technical text-[9px] font-bold uppercase tracking-[0.22em] ${accent.title}`}>
            Oturum geçmişi
          </p>
          <span className="ml-auto font-mono-technical text-[9px] tabular-nums text-app-text/45">
            {completedTrainings.length} KAPALI
          </span>
        </div>

        {loading && completedTrainings.length === 0 ? (
          <div className={icEmptyCell}>
            <Loader2 className="mx-auto size-5 animate-spin text-amber-400" aria-hidden />
            <p className={`${icEmptyTitle} mt-3`}>Geçmiş oturumlar yükleniyor</p>
          </div>
        ) : completedTrainings.length === 0 ? (
          <div className={icEmptyCell}>
            <p className={icEmptyTitle}>Tamamlanmış oturum yok</p>
            <p className={icEmptyDesc}>Kapatılan RNG-01 oturumları burada arşivlenir</p>
          </div>
        ) : (
          <div className="divide-y divide-amber-900/20">
            {completedTrainings.map((session) => {
              const sessionResults = resultsForTraining(session, allResults)
              const participantCount = sessionResults.length
              const successAvg = computeSessionHitPercentAverage(session, allResults)
              const closedMs = resolveSessionClosedAtMs(session, allResults)
              const isExpanded = expandedId === session.id
              const stats = computeSessionDetailStats(session, allResults)
              const instructorLabel =
                callsignByUid.get(session.instructorId) || session.instructorId.slice(0, 8)
              const groupLabel = groupNameById.get(session.groupId) || session.groupId.slice(0, 8)

              return (
                <div key={session.id} className="bg-black/20">
                  <button
                    type="button"
                    onClick={() => toggleExpanded(session.id)}
                    className={[
                      'flex w-full flex-wrap items-center gap-x-4 gap-y-2 px-3 py-3 text-left transition',
                      icTrHover,
                      isExpanded ? 'bg-amber-950/25' : '',
                    ].join(' ')}
                    aria-expanded={isExpanded}
                  >
                    <ChevronDown
                      className={[
                        'size-4 shrink-0 text-amber-400/80 transition-transform',
                        isExpanded ? 'rotate-180' : '',
                      ].join(' ')}
                      aria-hidden
                    />
                    <div className="min-w-[140px] flex-1">
                      <p className="font-mono-technical text-[11px] font-bold uppercase text-app-text">
                        {session.trainingName}
                      </p>
                      <p className="font-mono-technical text-[9px] uppercase text-app-text/50">
                        {session.level || '—'} · {groupLabel}
                      </p>
                    </div>
                    <div className="font-mono-technical text-[9px] uppercase text-app-text/55">
                      <span className="block text-[8px] text-app-text/40">Açılış</span>
                      {formatAtisSessionTimestamp(session.createdAt)}
                    </div>
                    <div className="font-mono-technical text-[9px] uppercase text-app-text/55">
                      <span className="block text-[8px] text-app-text/40">Kapanış</span>
                      {closedMs ? formatAtisSessionTimestamp(closedMs) : '—'}
                    </div>
                    <div className="font-mono-technical text-[10px] tabular-nums text-sky-400">
                      <span className="block text-[8px] uppercase text-app-text/40">Katılımcı</span>
                      {participantCount}
                    </div>
                    <div className="font-mono-technical text-[10px] tabular-nums text-emerald-400">
                      <span className="block text-[8px] uppercase text-app-text/40">Başarı ort.</span>
                      %{successAvg}
                    </div>
                    <div className="font-mono-technical text-[9px] uppercase text-amber-200/80">
                      <span className="block text-[8px] text-app-text/40">Eğitmen</span>
                      {instructorLabel}
                    </div>
                  </button>

                  {isExpanded ? (
                    <div className="border-t border-amber-900/25 bg-black/35 px-3 py-4">
                      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded border border-slate-800 bg-black/40 p-2.5">
                          <p className="font-mono-technical text-[8px] uppercase text-app-text/45">Drill</p>
                          <p className="mt-1 font-mono-technical text-[10px] uppercase text-app-text">
                            {session.trainingName}
                          </p>
                          <p className="font-mono-technical text-[9px] text-app-text/55">{session.level}</p>
                        </div>
                        <div className="rounded border border-slate-800 bg-black/40 p-2.5">
                          <p className="font-mono-technical text-[8px] uppercase text-app-text/45">Mühimmat / baraj</p>
                          <p className="mt-1 font-mono-technical text-sm tabular-nums text-amber-300">
                            {session.totalAmmo} / {session.minPassScore}
                          </p>
                          {session.isTimed && session.targetTimeSec != null ? (
                            <p className="font-mono-technical text-[9px] text-app-text/55">
                              Hedef {session.targetTimeSec}s
                            </p>
                          ) : (
                            <p className="font-mono-technical text-[9px] text-app-text/55">Serbest süre</p>
                          )}
                        </div>
                        <div className="rounded border border-slate-800 bg-black/40 p-2.5">
                          <p className="font-mono-technical text-[8px] uppercase text-app-text/45">Skor aralığı</p>
                          <p className="mt-1 font-mono-technical text-[10px] tabular-nums text-app-text">
                            %{stats.lowest} – %{stats.highest}
                          </p>
                          <p className="font-mono-technical text-[9px] text-emerald-400/90">
                            Ort. %{stats.average}
                          </p>
                        </div>
                        <div className="rounded border border-slate-800 bg-black/40 p-2.5">
                          <p className="font-mono-technical text-[8px] uppercase text-app-text/45">Grup · eğitmen</p>
                          <p className="mt-1 font-mono-technical text-[10px] uppercase text-app-text">{groupLabel}</p>
                          <p className="font-mono-technical text-[9px] text-amber-200/80">{instructorLabel}</p>
                        </div>
                      </div>

                      {sessionResults.length === 0 ? (
                        <p className={icEmptyDesc}>Bu oturumda kayıtlı katılımcı sonucu yok</p>
                      ) : (
                        <div className={icTableWrap}>
                          <table className={icTable}>
                            <thead>
                              <tr>
                                <th className={icTh}>Operatör</th>
                                <th className={icTh}>Vuruş</th>
                                <th className={icTh}>Süre</th>
                                <th className={icTh}>Durum</th>
                              </tr>
                            </thead>
                            <tbody>
                              {[...sessionResults]
                                .sort(
                                  (a, b) =>
                                    timestampToDisplayMs(a.submittedAt) - timestampToDisplayMs(b.submittedAt),
                                )
                                .map((row) => {
                                  const assessment = computeGroupTrainingAssessment({
                                    totalAmmo: session.totalAmmo,
                                    minPassScore: session.minPassScore,
                                    hits: row.hits,
                                    isTimed: session.isTimed,
                                    targetTimeSec: session.targetTimeSec,
                                    time: row.time,
                                  })
                                  const label = formatGroupTrainingStatusLabelInstructor(
                                    row.statusResult ?? assessment.statusResult,
                                    assessment.isPassed,
                                  )
                                  const statusClass = assessment.isPassed
                                    ? icStatusOk
                                    : assessment.statusResult === 'SÜRE İHLALİ'
                                      ? icStatusWarn
                                      : icStatusFail
                                  const operatorLabel =
                                    row.operatorName ||
                                    callsignByUid.get(row.operatorId) ||
                                    row.operatorId.slice(0, 8)

                                  return (
                                    <tr key={row.id} className={icTrHover}>
                                      <td className={`${icTd} font-mono-technical text-[11px] uppercase text-app-text`}>
                                        {operatorLabel}
                                      </td>
                                      <td className={`${icTd} tabular-nums font-mono-technical text-[11px] text-app-text`}>
                                        {row.hits} / {session.totalAmmo}
                                      </td>
                                      <td className={`${icTd} tabular-nums font-mono-technical text-[11px] text-app-text/55`}>
                                        {row.time != null ? `${row.time}s` : '—'}
                                      </td>
                                      <td className={icTd}>
                                        <span className={statusClass}>{label}</span>
                                      </td>
                                    </tr>
                                  )
                                })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </CleanFade>
  )
}
