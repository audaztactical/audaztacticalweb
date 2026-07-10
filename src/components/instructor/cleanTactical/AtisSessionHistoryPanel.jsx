import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, History, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
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
import { ctBtnSecondary, ctInput, ctLabel } from './tokens'

/** @typedef {import('../../../lib/firestoreGroups').TacticalGroup} TacticalGroup */
/** @typedef {import('../../../lib/firestoreInstructor').OperatorProfile} OperatorProfile */
/** @typedef {import('../../../lib/firestoreGroupTrainings').GroupTraining} GroupTraining */
/** @typedef {import('../../../lib/firestoreGroupTrainings').TrainingResult} TrainingResult */

const PAGE_SIZE = 10

/**
 * @param {string} dateStr YYYY-MM-DD
 * @param {'start' | 'end'} edge
 */
function dateInputToMs(dateStr, edge) {
  const trimmed = String(dateStr ?? '').trim()
  if (!trimmed) return null
  const ms = Date.parse(`${trimmed}T${edge === 'start' ? '00:00:00' : '23:59:59.999'}`)
  return Number.isFinite(ms) ? ms : null
}

/**
 * @param {{
 *   groups: TacticalGroup[]
 *   operators: OperatorProfile[]
 *   instructorId: string
 * }} props
 */
export default function AtisSessionHistoryPanel({ groups, operators, instructorId }) {
  const { t } = useTranslation('instructor')
  const { user, userData } = useAuth()
  const accent = resolveSectorAccent('atis')

  const [completedTrainings, setCompletedTrainings] = useState(/** @type {GroupTraining[]} */ ([]))
  const [allResults, setAllResults] = useState(/** @type {TrainingResult[]} */ ([]))
  const [loading, setLoading] = useState(false)
  const [expandedId, setExpandedId] = useState('')
  const [page, setPage] = useState(1)
  const [drillFilter, setDrillFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const groupIds = useMemo(() => groups.map((g) => g.groupId).filter(Boolean), [groups])

  const groupNameById = useMemo(() => {
    const map = new Map()
    for (const g of groups) map.set(g.groupId, g.groupName)
    return map
  }, [groups])

  const instructorFallback = t('education.shared.instructor')
  const operatorFallback = t('education.shared.operator')

  const callsignByUid = useMemo(() => {
    /** @type {Map<string, string>} */
    const map = new Map()
    const selfCallsign = (userData?.callsign || user?.displayName || instructorFallback).trim()
    if (instructorId) map.set(instructorId, selfCallsign)
    for (const op of operators) {
      map.set(op.uid, (op.callsign || op.username || operatorFallback).trim())
    }
    return map
  }, [operators, instructorId, user, userData, instructorFallback, operatorFallback])

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

  const drillOptions = useMemo(() => {
    const names = new Set(
      completedTrainings
        .map((s) => s.trainingName?.trim())
        .filter((name) => typeof name === 'string' && name.length > 0),
    )
    return [...names].sort((a, b) => a.localeCompare(b, 'tr'))
  }, [completedTrainings])

  const filteredSessions = useMemo(() => {
    const q = drillFilter.trim().toLowerCase()
    const fromMs = dateInputToMs(dateFrom, 'start')
    const toMs = dateInputToMs(dateTo, 'end')

    return completedTrainings.filter((session) => {
      if (q && !String(session.trainingName ?? '').toLowerCase().includes(q)) return false
      const openMs = timestampToDisplayMs(session.createdAt)
      if (fromMs != null && openMs < fromMs) return false
      if (toMs != null && openMs > toMs) return false
      return true
    })
  }, [completedTrainings, drillFilter, dateFrom, dateTo])

  const totalPages = Math.max(1, Math.ceil(filteredSessions.length / PAGE_SIZE))

  const safePage = Math.min(page, totalPages)

  const paginatedSessions = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE
    return filteredSessions.slice(start, start + PAGE_SIZE)
  }, [filteredSessions, safePage])

  const rangeStart = filteredSessions.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1
  const rangeEnd = Math.min(safePage * PAGE_SIZE, filteredSessions.length)

  const hasActiveFilters = Boolean(drillFilter.trim() || dateFrom || dateTo)

  useEffect(() => {
    setPage(1)
  }, [drillFilter, dateFrom, dateTo])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const clearFilters = () => {
    setDrillFilter('')
    setDateFrom('')
    setDateTo('')
    setPage(1)
    setExpandedId('')
  }

  const toggleExpanded = (trainingId) => {
    setExpandedId((prev) => (prev === trainingId ? '' : trainingId))
  }

  return (
    <CleanFade>
      <div className={`overflow-hidden rounded-lg border ${accent.panelBorder} bg-black/40`}>
        <div className="flex items-center gap-2 border-b border-amber-500/20 bg-amber-950/15 px-3 py-2">
          <History className={`size-3.5 ${accent.icon}`} strokeWidth={1.5} aria-hidden />
          <p className={`font-mono-technical text-[9px] font-bold uppercase tracking-[0.22em] ${accent.title}`}>
            {t('education.atis.history.title')}
          </p>
          <span className="ml-auto font-mono-technical text-[9px] tabular-nums text-app-text/45">
            {t('education.atis.history.closedCount', { count: filteredSessions.length })}
          </span>
        </div>

        <div className="border-b border-amber-900/20 bg-black/25 px-3 py-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block space-y-1 sm:col-span-2 lg:col-span-1">
              <span className={ctLabel}>{t('education.atis.history.drillName')}</span>
              <input
                type="search"
                list="atis-history-drill-options"
                value={drillFilter}
                onChange={(e) => setDrillFilter(e.target.value)}
                placeholder={t('education.atis.history.filterPlaceholder')}
                className={`${ctInput} font-mono-technical text-[11px] uppercase`}
              />
              <datalist id="atis-history-drill-options">
                {drillOptions.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </label>
            <label className="block space-y-1">
              <span className={ctLabel}>{t('education.atis.history.startDate')}</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className={`${ctInput} font-mono-technical text-[11px] tabular-nums`}
              />
            </label>
            <label className="block space-y-1">
              <span className={ctLabel}>{t('education.atis.history.endDate')}</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className={`${ctInput} font-mono-technical text-[11px] tabular-nums`}
              />
            </label>
            <div className="flex items-end">
              <button
                type="button"
                onClick={clearFilters}
                disabled={!hasActiveFilters}
                className={`${ctBtnSecondary} w-full font-mono-technical text-[10px] uppercase tracking-wider disabled:opacity-40`}
              >
                {t('education.atis.history.clearFilter')}
              </button>
            </div>
          </div>
        </div>

        {loading && completedTrainings.length === 0 ? (
          <div className={icEmptyCell}>
            <Loader2 className="mx-auto size-5 animate-spin text-amber-400" aria-hidden />
            <p className={`${icEmptyTitle} mt-3`}>{t('education.atis.history.loading')}</p>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className={icEmptyCell}>
            <p className={icEmptyTitle}>
              {hasActiveFilters
                ? t('education.atis.history.emptyFiltered')
                : t('education.atis.history.empty')}
            </p>
            <p className={icEmptyDesc}>
              {hasActiveFilters
                ? t('education.atis.history.emptyFilteredHint')
                : t('education.atis.history.emptyHint')}
            </p>
          </div>
        ) : (
          <>
          <div className="divide-y divide-amber-900/20">
            {paginatedSessions.map((session) => {
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
                      <span className="block text-[8px] text-app-text/40">
                        {t('education.atis.history.opened')}
                      </span>
                      {formatAtisSessionTimestamp(session.createdAt)}
                    </div>
                    <div className="font-mono-technical text-[9px] uppercase text-app-text/55">
                      <span className="block text-[8px] text-app-text/40">
                        {t('education.atis.history.closed')}
                      </span>
                      {closedMs ? formatAtisSessionTimestamp(closedMs) : '—'}
                    </div>
                    <div className="font-mono-technical text-[10px] tabular-nums text-sky-400">
                      <span className="block text-[8px] uppercase text-app-text/40">
                        {t('education.atis.history.participant')}
                      </span>
                      {participantCount}
                    </div>
                    <div className="font-mono-technical text-[10px] tabular-nums text-emerald-400">
                      <span className="block text-[8px] uppercase text-app-text/40">
                        {t('education.atis.history.avgSuccess')}
                      </span>
                      %{successAvg}
                    </div>
                    <div className="font-mono-technical text-[9px] uppercase text-amber-200/80">
                      <span className="block text-[8px] text-app-text/40">
                        {t('education.atis.history.instructor')}
                      </span>
                      {instructorLabel}
                    </div>
                  </button>

                  {isExpanded ? (
                    <div className="border-t border-amber-900/25 bg-black/35 px-3 py-4">
                      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded border border-slate-800 bg-black/40 p-2.5">
                          <p className="font-mono-technical text-[8px] uppercase text-app-text/45">
                            {t('education.shared.drill')}
                          </p>
                          <p className="mt-1 font-mono-technical text-[10px] uppercase text-app-text">
                            {session.trainingName}
                          </p>
                          <p className="font-mono-technical text-[9px] text-app-text/55">{session.level}</p>
                        </div>
                        <div className="rounded border border-slate-800 bg-black/40 p-2.5">
                          <p className="font-mono-technical text-[8px] uppercase text-app-text/45">
                            {t('education.atis.history.ammoThreshold')}
                          </p>
                          <p className="mt-1 font-mono-technical text-sm tabular-nums text-amber-300">
                            {session.totalAmmo} / {session.minPassScore}
                          </p>
                          {session.isTimed && session.targetTimeSec != null ? (
                            <p className="font-mono-technical text-[9px] text-app-text/55">
                              {t('education.atis.history.targetSec', { sec: session.targetTimeSec })}
                            </p>
                          ) : (
                            <p className="font-mono-technical text-[9px] text-app-text/55">
                              {t('education.atis.history.freeDuration')}
                            </p>
                          )}
                        </div>
                        <div className="rounded border border-slate-800 bg-black/40 p-2.5">
                          <p className="font-mono-technical text-[8px] uppercase text-app-text/45">
                            {t('education.atis.history.scoreRange')}
                          </p>
                          <p className="mt-1 font-mono-technical text-[10px] tabular-nums text-app-text">
                            %{stats.lowest} – %{stats.highest}
                          </p>
                          <p className="font-mono-technical text-[9px] text-emerald-400/90">
                            {t('education.atis.history.avgPercent', { percent: stats.average })}
                          </p>
                        </div>
                        <div className="rounded border border-slate-800 bg-black/40 p-2.5">
                          <p className="font-mono-technical text-[8px] uppercase text-app-text/45">
                            {t('education.atis.history.groupInstructor')}
                          </p>
                          <p className="mt-1 font-mono-technical text-[10px] uppercase text-app-text">{groupLabel}</p>
                          <p className="font-mono-technical text-[9px] text-amber-200/80">{instructorLabel}</p>
                        </div>
                      </div>

                      {sessionResults.length === 0 ? (
                        <p className={icEmptyDesc}>{t('education.atis.history.noResults')}</p>
                      ) : (
                        <div className={icTableWrap}>
                          <table className={icTable}>
                            <thead>
                              <tr>
                                <th className={icTh}>{t('education.atis.history.colOperator')}</th>
                                <th className={icTh}>{t('education.atis.history.colHits')}</th>
                                <th className={icTh}>{t('education.atis.history.colDuration')}</th>
                                <th className={icTh}>{t('education.atis.history.colStatus')}</th>
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

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-amber-900/25 bg-black/30 px-3 py-2.5">
            <p className="font-mono-technical text-[9px] uppercase tabular-nums text-app-text/55">
              {filteredSessions.length === 0
                ? t('education.atis.history.zeroSessions')
                : t('education.atis.history.rangeSessions', {
                    total: filteredSessions.length,
                    start: rangeStart,
                    end: rangeEnd,
                  })}
              {' · '}
              {t('education.atis.history.page', { page: safePage, totalPages })}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className={`${ctBtnSecondary} inline-flex items-center gap-1 px-2 py-1 font-mono-technical text-[9px] uppercase disabled:opacity-40`}
              >
                <ChevronLeft className="size-3.5" aria-hidden />
                {t('education.atis.history.prev')}
              </button>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className={`${ctBtnSecondary} inline-flex items-center gap-1 px-2 py-1 font-mono-technical text-[9px] uppercase disabled:opacity-40`}
              >
                {t('education.atis.history.next')}
                <ChevronRight className="size-3.5" aria-hidden />
              </button>
            </div>
          </div>
          </>
        )}
      </div>
    </CleanFade>
  )
}
