import { useEffect, useMemo, useState } from 'react'
import { BookOpen, ChevronDown, ChevronUp, Loader2, Lock } from 'lucide-react'
import { subscribeGroupActivityLogs } from '../../lib/firestoreGroupTraining'
import { subscribeGroupVbssEvaluations } from '../../lib/firestoreVbssEvaluations'
import { subscribeGroupTcccEvaluations } from '../../lib/firestoreTcccEvaluations'
import {
  collectInstructorRecordNotes,
  filterInstructorGroupActivityLogs,
  formatInstructorRecordSummary,
  formatRecordTimestamp,
} from '../../lib/operatorGroupInstructorRecords'
import { formatGroupTrainingStatusLabelInstructor } from '../../lib/groupTrainingAssessment'
import { emitFirebaseError } from '../../lib/firebaseErrorBus'
import { VBSS_EVALUATION_PHASES } from '../../lib/vbssEvaluationPayload'
import { TCCC_MARCH_EVALUATION_PHASES } from '../../lib/tcccEvaluationPayload'

/** @typedef {import('../../lib/firestoreGroupTraining').GroupActivityLog} GroupActivityLog */
/** @typedef {import('../../lib/firestoreGroupTraining').GroupTrainingDiscipline} GroupTrainingDiscipline */
/** @typedef {import('../../lib/firestoreVbssEvaluations').VbssEvaluation} VbssEvaluation */
/** @typedef {import('../../lib/firestoreTcccEvaluations').TcccEvaluation} TcccEvaluation */

const DISCIPLINE_TITLES = {
  atis: 'ATIŞ',
  cqb: 'CQB',
  fof: 'FOF',
  vbss: 'VBSS',
  tccc: 'TCCC',
}

/**
 * @param {{
 *   discipline: GroupTrainingDiscipline
 *   groupId: string
 *   groupName?: string
 *   currentOperatorId?: string
 * }} props
 */
export default function OperatorInstructorRecordsPanel({
  discipline,
  groupId,
  groupName,
  currentOperatorId = '',
}) {
  const [activityLogs, setActivityLogs] = useState(/** @type {GroupActivityLog[]} */ ([]))
  const [vbssRows, setVbssRows] = useState(/** @type {VbssEvaluation[]} */ ([]))
  const [tcccRows, setTcccRows] = useState(/** @type {TcccEvaluation[]} */ ([]))
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState('')

  const instructorLogs = useMemo(
    () => filterInstructorGroupActivityLogs(activityLogs, discipline),
    [activityLogs, discipline],
  )

  useEffect(() => {
    if (!groupId) {
      setActivityLogs([])
      setVbssRows([])
      setTcccRows([])
      setLoading(false)
      return undefined
    }

    setLoading(true)
    let pending = discipline === 'vbss' || discipline === 'tccc' ? 2 : 1
    const markReady = () => {
      pending -= 1
      if (pending <= 0) setLoading(false)
    }

    const unsubLogs = subscribeGroupActivityLogs(
      groupId,
      (rows) => {
        setActivityLogs(rows)
        markReady()
      },
      (err) => {
        emitFirebaseError(err)
        markReady()
      },
    )

    let unsubVbss = () => {}
    let unsubTccc = () => {}

    if (discipline === 'vbss') {
      unsubVbss = subscribeGroupVbssEvaluations(
        groupId,
        (rows) => {
          setVbssRows(rows)
          markReady()
        },
        (err) => {
          emitFirebaseError(err)
          markReady()
        },
      )
    } else if (discipline === 'tccc') {
      unsubTccc = subscribeGroupTcccEvaluations(
        groupId,
        (rows) => {
          setTcccRows(rows)
          markReady()
        },
        (err) => {
          emitFirebaseError(err)
          markReady()
        },
      )
    }

    return () => {
      unsubLogs()
      unsubVbss()
      unsubTccc()
    }
  }, [groupId, discipline])

  const resolveOperatorLabel = (operatorId, fallbackName = '') => {
    if (fallbackName.trim()) return fallbackName.trim()
    if (operatorId === currentOperatorId) return 'SİZ'
    return operatorId ? operatorId.slice(0, 8).toUpperCase() : '—'
  }

  const renderActivityRecord = (log) => {
    const open = expandedId === log.logId
    const { notes, infractions } = collectInstructorRecordNotes(log)
    const status = log.statusResult
      ? formatGroupTrainingStatusLabelInstructor(log.statusResult, log.isTargetMet === true)
      : log.isTargetMet
        ? 'Geçti'
        : '—'

    return (
      <article
        key={log.logId}
        className="rounded-lg border border-accent/15 bg-app-bg/80"
      >
        <button
          type="button"
          onClick={() => setExpandedId(open ? '' : log.logId)}
          className="flex w-full items-start justify-between gap-3 px-3 py-3 text-left"
        >
          <div className="min-w-0 flex-1">
            <p className="font-mono-technical text-[9px] uppercase text-app-text/55">
              {formatRecordTimestamp(log.timestamp)}
            </p>
            <p className="mt-1 truncate font-mono-technical text-sm font-bold text-amber-300">
              {log.drillName || 'Drill'}
            </p>
            <p className="mt-0.5 font-mono-technical text-[10px] uppercase text-app-text/70">
              {resolveOperatorLabel(log.operatorId)} · {formatInstructorRecordSummary(log)}
              {status !== '—' ? ` · ${status}` : ''}
            </p>
          </div>
          {open ? (
            <ChevronUp className="size-4 shrink-0 text-app-text/55" aria-hidden />
          ) : (
            <ChevronDown className="size-4 shrink-0 text-app-text/55" aria-hidden />
          )}
        </button>

        {open ? (
          <div className="space-y-2 border-t border-slate-800/80 px-3 py-3 font-mono-technical text-[10px] uppercase text-app-text/70">
            {log.duration != null && Number.isFinite(Number(log.duration)) ? (
              <p>
                <span className="text-app-text/55">Süre:</span> {Number(log.duration)} sn
              </p>
            ) : null}
            {log.statusResult ? (
              <p>
                <span className="text-app-text/55">Durum:</span> {log.statusResult}
              </p>
            ) : null}
            {notes.length ? (
              <div>
                <p className="text-app-text/55">Eğitmen notu</p>
                {notes.map((n) => (
                  <p key={n} className="mt-1 normal-case text-app-text/90">
                    {n}
                  </p>
                ))}
              </div>
            ) : null}
            {infractions.length ? (
              <div>
                <p className="text-app-text/55">İhlal / red gerekçesi</p>
                <ul className="mt-1 list-inside list-disc normal-case text-rose-300/90">
                  {infractions.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {!notes.length && !infractions.length ? (
              <p className="text-app-text/45">Ek not veya ihlal kaydı yok</p>
            ) : null}
          </div>
        ) : null}
      </article>
    )
  }

  const renderVbssRecord = (row) => {
    const open = expandedId === row.id
    return (
      <article key={row.id} className="rounded-lg border border-accent/15 bg-app-bg/80">
        <button
          type="button"
          onClick={() => setExpandedId(open ? '' : row.id)}
          className="flex w-full items-start justify-between gap-3 px-3 py-3 text-left"
        >
          <div className="min-w-0 flex-1">
            <p className="font-mono-technical text-[9px] uppercase text-app-text/55">
              {formatRecordTimestamp(row.createdAt)}
            </p>
            <p className="mt-1 font-mono-technical text-sm font-bold text-amber-300">
              VBSS Değerlendirme
            </p>
            <p className="mt-0.5 font-mono-technical text-[10px] uppercase text-app-text/70">
              {resolveOperatorLabel(row.operatorId, row.operatorName)} · Genel {row.overallScore}/10
            </p>
          </div>
          {open ? (
            <ChevronUp className="size-4 shrink-0 text-app-text/55" aria-hidden />
          ) : (
            <ChevronDown className="size-4 shrink-0 text-app-text/55" aria-hidden />
          )}
        </button>
        {open ? (
          <div className="space-y-2 border-t border-slate-800/80 px-3 py-3">
            {VBSS_EVALUATION_PHASES.map((phase) => {
              const p = row.phases?.[phase.id]
              const obs = p?.observation || row.operationalNotes?.[phase.id] || ''
              return (
                <div key={phase.id} className="font-mono-technical text-[10px] uppercase">
                  <p className="text-sky-400">
                    {phase.title ?? phase.label}: {p?.score ?? '—'}/10
                  </p>
                  {obs ? (
                    <p className="mt-0.5 normal-case text-app-text/90">{obs}</p>
                  ) : (
                    <p className="mt-0.5 text-app-text/45">Gözlem yok</p>
                  )}
                </div>
              )
            })}
          </div>
        ) : null}
      </article>
    )
  }

  const renderTcccRecord = (row) => {
    const open = expandedId === row.id
    return (
      <article key={row.id} className="rounded-lg border border-accent/15 bg-app-bg/80">
        <button
          type="button"
          onClick={() => setExpandedId(open ? '' : row.id)}
          className="flex w-full items-start justify-between gap-3 px-3 py-3 text-left"
        >
          <div className="min-w-0 flex-1">
            <p className="font-mono-technical text-[9px] uppercase text-app-text/55">
              {formatRecordTimestamp(row.createdAt)}
            </p>
            <p className="mt-1 font-mono-technical text-sm font-bold text-amber-300">
              MARCH Değerlendirme
            </p>
            <p className="mt-0.5 font-mono-technical text-[10px] uppercase text-app-text/70">
              {resolveOperatorLabel(row.operatorId, row.operatorName)} · Genel {row.overallScore}/10
              {row.casualtyStatus ? ` · ${row.casualtyStatus}` : ''}
            </p>
          </div>
          {open ? (
            <ChevronUp className="size-4 shrink-0 text-app-text/55" aria-hidden />
          ) : (
            <ChevronDown className="size-4 shrink-0 text-app-text/55" aria-hidden />
          )}
        </button>
        {open ? (
          <div className="space-y-2 border-t border-slate-800/80 px-3 py-3">
            {TCCC_MARCH_EVALUATION_PHASES.map((phase) => {
              const p = row.phases?.[phase.id] ?? row.marchScores?.[phase.id]
              const obs = p?.observation || row.operationalNotes?.[phase.id] || ''
              const critical = row.criticalFails?.[phase.id] || p?.criticalFail
              return (
                <div key={phase.id} className="font-mono-technical text-[10px] uppercase">
                  <p className={critical ? 'text-rose-400' : 'text-sky-400'}>
                    {phase.title ?? phase.label}: {p?.score ?? '—'}/10
                    {critical ? ' · KRİTİK HATA' : ''}
                  </p>
                  {obs ? (
                    <p className="mt-0.5 normal-case text-app-text/90">{obs}</p>
                  ) : (
                    <p className="mt-0.5 text-app-text/45">Gözlem yok</p>
                  )}
                </div>
              )
            })}
          </div>
        ) : null}
      </article>
    )
  }

  const recordCount =
    discipline === 'vbss'
      ? vbssRows.length
      : discipline === 'tccc'
        ? tcccRows.length
        : instructorLogs.length

  return (
    <section className="rounded-xl border border-accent/20 bg-app-bg/90 p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <p className="flex items-center gap-2 font-mono-technical text-[9px] font-bold uppercase tracking-[0.24em] text-accent">
          <BookOpen className="size-4" strokeWidth={1.5} aria-hidden />
          Eğitmen kayıtları · {DISCIPLINE_TITLES[discipline] ?? discipline.toUpperCase()}
        </p>
        <span className="inline-flex items-center gap-1 rounded border border-slate-700/80 px-2 py-0.5 font-mono-technical text-[8px] uppercase text-app-text/55">
          <Lock className="size-3" aria-hidden />
          Salt okunur
        </span>
        {groupName ? (
          <span className="font-mono-technical text-[9px] uppercase text-app-text/45">{groupName}</span>
        ) : null}
      </div>

      {loading ? (
        <p className="flex items-center gap-2 py-8 font-mono-technical text-[10px] uppercase text-app-text/55">
          <Loader2 className="size-4 animate-spin text-accent" aria-hidden />
          Eğitmen kayıtları yükleniyor…
        </p>
      ) : recordCount === 0 ? (
        <p className="py-8 text-center font-mono-technical text-[10px] uppercase text-app-text/45">
          Bu sektörde henüz eğitmen kaydı yok
        </p>
      ) : (
        <div className="space-y-2">
          {discipline === 'vbss'
            ? vbssRows.map(renderVbssRecord)
            : discipline === 'tccc'
              ? tcccRows.map(renderTcccRecord)
              : instructorLogs.map(renderActivityRecord)}
        </div>
      )}
    </section>
  )
}
