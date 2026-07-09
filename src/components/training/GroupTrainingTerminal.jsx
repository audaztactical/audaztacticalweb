import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Crosshair,
  Eye,
  History,
  Loader2,
  Radio,
  Timer,
  Users,
  XCircle,
} from 'lucide-react'
import AmberAlert from '../common/AmberAlert'
import Input from '../common/Input'
import Button from '../common/Button'
import TacticalPanel from '../ui/TacticalPanel'
import { useAuth } from '../../context/AuthContext'
import { useOperatorGroup } from '../../hooks/useOperatorGroup'
import {
  computeGroupTrainingAssessment,
  getOperatorSessionStatusStyles,
  getOperatorTrainingSessionStatus,
} from '../../lib/groupTrainingAssessment'
import {
  fetchGroupTrainingForOperator,
  subscribeGroupTrainingResults,
  subscribeGroupTrainings,
  submitTrainingResult,
} from '../../lib/firestoreGroupTrainings'
import { filterOperatorVisibleTrainings, isTrainingSessionExpired } from '../../lib/groupTrainingSessionAccess'
import { timestampToMs } from '../../lib/firestoreSnapshot'
import { emitFirebaseError } from '../../lib/firebaseErrorBus'
import {
  formatGroupTrainingAlertTimePart,
  formatGroupTrainingAssessmentLabel,
  formatGroupTrainingDateDisplay,
  formatGroupTrainingHitsSummary,
  formatGroupTrainingSessionStatusDisplay,
  formatGroupTrainingValidationMessage,
} from '../../lib/trainingDisplayText'

/** @typedef {import('../../lib/firestoreGroupTrainings').GroupTraining} GroupTraining */
/** @typedef {import('../../lib/firestoreGroupTrainings').TrainingResult} TrainingResult */

const hudLabel =
  'font-mono-technical text-[8px] font-bold uppercase tracking-[0.22em] text-app-text/55'
const hudReadonly =
  'rounded border border-accent/25 bg-app-bg px-3 py-2.5 font-mono-technical text-sm font-semibold tabular-nums text-accent'

/**
 * @param {TrainingResult} result
 * @param {GroupTraining} training
 */
function resolveResultAssessment(result, training) {
  return computeGroupTrainingAssessment({
    totalAmmo: training.totalAmmo,
    minPassScore: training.minPassScore,
    hits: result.hits,
    isTimed: training.isTimed,
    targetTimeSec: training.targetTimeSec,
    time: result.time,
  })
}

/**
 * @param {{
 *   training: GroupTraining
 *   results: TrainingResult[]
 *   currentUid: string
 *   selfOnly?: boolean
 * }} props
 */
function GroupTrainingDetailPanel({ training, results, currentUid, selfOnly = false }) {
  const { t } = useTranslation('training')
  const trainingResults = results.filter((r) => r.trainingId === training.id)
  const myResult = trainingResults.find((r) => r.operatorId === currentUid) ?? null
  const isActive = training.status === 'active'
  const myAssessment = myResult ? resolveResultAssessment(myResult, training) : null

  return (
    <div className="w-full min-w-0 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <TacticalPanel className="p-3">
          <p className={hudLabel}>{t('sectors.grup-egitimi.detail.status')}</p>
          <p className={hudReadonly}>
            {isActive
              ? t('sectors.grup-egitimi.detail.statusActive')
              : t('sectors.grup-egitimi.detail.statusCompleted')}
          </p>
        </TacticalPanel>
        <TacticalPanel className="p-3">
          <p className={hudLabel}>{t('sectors.grup-egitimi.detail.ammo')}</p>
          <p className={hudReadonly}>{training.totalAmmo}</p>
        </TacticalPanel>
        <TacticalPanel className="p-3">
          <p className={hudLabel}>{t('sectors.grup-egitimi.detail.passThreshold')}</p>
          <p className={hudReadonly}>{training.minPassScore}</p>
        </TacticalPanel>
        <TacticalPanel className="p-3">
          <p className={hudLabel}>{t('sectors.grup-egitimi.detail.date')}</p>
          <p className="font-mono-technical text-xs text-accent">
            {formatGroupTrainingDateDisplay(training.createdAt)}
          </p>
        </TacticalPanel>
      </div>

      {myResult && myAssessment ? (
        <TacticalPanel className="p-4">
          <p className={hudLabel}>{t('sectors.grup-egitimi.detail.yourStatus')}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <span className="font-mono-technical text-sm text-app-text">
              {formatGroupTrainingHitsSummary({
                hits: myResult.hits,
                total: training.totalAmmo,
                isTimed: training.isTimed,
                time: myResult.time,
                targetTimeSec: training.targetTimeSec,
              })}
            </span>
            <span
              className={[
                'inline-flex items-center gap-1 rounded border px-2 py-0.5 font-mono-technical text-[9px] font-bold uppercase',
                myAssessment.isPassed
                  ? 'border-lime-500/40 bg-lime-950/30 text-lime-400'
                  : myAssessment.statusResult === 'SÜRE İHLALİ'
                    ? 'border-amber-500/40 bg-amber-950/30 text-amber-400'
                    : 'border-red-500/40 bg-red-950/30 text-red-400',
              ].join(' ')}
            >
              {myAssessment.isPassed ? (
                <CheckCircle2 className="size-3" aria-hidden />
              ) : (
                <XCircle className="size-3" aria-hidden />
              )}
              {formatGroupTrainingAssessmentLabel(myAssessment.statusResult, myAssessment.isPassed)}
            </span>
          </div>
          {!myAssessment.isPassed ? (
            <p className="mt-2 font-mono-technical text-[9px] uppercase text-app-text/55">
              {myAssessment.statusResult === 'SÜRE İHLALİ'
                ? t('sectors.grup-egitimi.detail.timeViolationHint')
                : t('sectors.grup-egitimi.detail.insufficientHitsHint')}
            </p>
          ) : null}
        </TacticalPanel>
      ) : (
        <TacticalPanel className="p-4">
          <p className="font-mono-technical text-xs text-app-text/55">
            {isActive
              ? t('sectors.grup-egitimi.detail.noResultActive')
              : t('sectors.grup-egitimi.detail.noResultInactive')}
          </p>
        </TacticalPanel>
      )}

      {!selfOnly ? (
        <TacticalPanel className="overflow-hidden p-0">
          <div className="border-b border-accent/15 px-4 py-2.5">
            <p className="font-mono-technical text-[9px] font-bold uppercase tracking-[0.28em] text-accent/80">
              {t('sectors.grup-egitimi.detail.groupResultsTitle')}
            </p>
          </div>
          {trainingResults.length === 0 ? (
            <p className="px-4 py-6 text-center font-mono-technical text-xs text-app-text/55">
              {t('sectors.grup-egitimi.detail.noResultsYet')}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[28rem] text-left font-mono-technical text-[10px]">
                <thead className="border-b border-white/10 bg-black/40 text-app-text/55">
                  <tr>
                    <th className="px-3 py-2 font-bold uppercase tracking-wider">
                      {t('sectors.grup-egitimi.detail.table.operator')}
                    </th>
                    <th className="px-3 py-2 font-bold uppercase tracking-wider">
                      {t('sectors.grup-egitimi.detail.table.hits')}
                    </th>
                    <th className="px-3 py-2 font-bold uppercase tracking-wider">
                      {t('sectors.grup-egitimi.detail.table.time')}
                    </th>
                    <th className="px-3 py-2 font-bold uppercase tracking-wider">
                      {t('sectors.grup-egitimi.detail.table.result')}
                    </th>
                    <th className="px-3 py-2 font-bold uppercase tracking-wider">
                      {t('sectors.grup-egitimi.detail.table.date')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {trainingResults.map((row) => {
                    const rowAssessment = resolveResultAssessment(row, training)
                    const rowLabel = formatGroupTrainingAssessmentLabel(
                      rowAssessment.statusResult,
                      rowAssessment.isPassed,
                    )
                    return (
                      <tr
                        key={row.id}
                        className={row.operatorId === currentUid ? 'bg-accent/[0.06]' : 'text-app-text/90'}
                      >
                        <td className="px-3 py-2.5">
                          {row.operatorName}
                          {row.operatorId === currentUid ? (
                            <span className="ml-1 text-accent/70">
                              {t('sectors.grup-egitimi.detail.table.you')}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-3 py-2.5 tabular-nums">
                          {row.hits}/{training.totalAmmo}
                        </td>
                        <td className="px-3 py-2.5 tabular-nums">
                          {training.isTimed && row.time != null ? `${row.time}s` : '—'}
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={
                              rowAssessment.isPassed
                                ? 'text-lime-400'
                                : rowAssessment.statusResult === 'SÜRE İHLALİ'
                                  ? 'text-amber-400'
                                  : 'text-red-400'
                            }
                          >
                            {rowLabel}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-app-text/55">
                          {formatGroupTrainingDateDisplay(row.submittedAt)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TacticalPanel>
      ) : null}
    </div>
  )
}

/**
 * @param {{ onBack: () => void, initialTrainingId?: string }} props
 */
export default function GroupTrainingTerminal({ onBack, initialTrainingId = '' }) {
  const { t } = useTranslation('training')
  const { user, userData } = useAuth()
  const { membership, isMember, loading: groupLoading } = useOperatorGroup()

  const [tab, setTab] = useState(/** @type {'live' | 'history'} */ ('live'))
  const [trainings, setTrainings] = useState(/** @type {GroupTraining[]} */ ([]))
  const [results, setResults] = useState(/** @type {TrainingResult[]} */ ([]))
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState('')
  const [detailId, setDetailId] = useState('')
  const [hits, setHits] = useState('')
  const [timeSec, setTimeSec] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [deepLinkBlocked, setDeepLinkBlocked] = useState(/** @type {string | null} */ (null))

  const operatorName = (userData?.callsign || user?.displayName || 'Operatör').trim()
  const uid = user?.uid ?? ''
  const groupId = membership?.groupId ?? ''

  const accessibleTrainings = useMemo(
    () =>
      filterOperatorVisibleTrainings(trainings, groupId, {
        includeCompleted: true,
        includeExpired: true,
      }),
    [trainings, groupId],
  )

  const activeTrainings = useMemo(
    () =>
      filterOperatorVisibleTrainings(trainings, groupId, {
        includeCompleted: false,
        includeExpired: false,
      }).filter((tr) => tr.status === 'active'),
    [trainings, groupId],
  )

  const openActiveTrainings = useMemo(
    () =>
      activeTrainings.filter(
        (tr) => getOperatorTrainingSessionStatus(tr, results, uid).key === 'open',
      ),
    [activeTrainings, results, uid],
  )

  const historyTrainings = useMemo(
    () => accessibleTrainings.filter((tr) => tr.status === 'completed'),
    [accessibleTrainings],
  )

  const selected = useMemo(
    () => accessibleTrainings.find((tr) => tr.id === selectedId) ?? null,
    [accessibleTrainings, selectedId],
  )

  const selectedSessionStatus = useMemo(() => {
    if (!selected) return null
    return getOperatorTrainingSessionStatus(selected, results, uid)
  }, [selected, results, uid])

  const myResultForSelected = useMemo(() => {
    if (!selectedId || !uid) return null
    return results.find((r) => r.trainingId === selectedId && r.operatorId === uid) ?? null
  }, [results, selectedId, uid])

  const mySelectedAssessment = useMemo(() => {
    if (!selected || !myResultForSelected) return null
    return resolveResultAssessment(myResultForSelected, selected)
  }, [selected, myResultForSelected])

  useEffect(() => {
    if (!isMember || !groupId) {
      setTrainings([])
      setResults([])
      setLoading(false)
      return undefined
    }

    let active = true
    setLoading(true)

    const unsubTrainings = subscribeGroupTrainings(
      groupId,
      (rows) => {
        if (!active) return
        setTrainings(rows)
        setLoading(false)
      },
      (err) => {
        if (!active) return
        emitFirebaseError(err)
        setLoading(false)
      },
      { nonExpiredOnly: false },
    )

    const unsubResults = subscribeGroupTrainingResults(
      groupId,
      (rows) => {
        if (!active) return
        setResults(rows)
      },
      (err) => {
        if (!active) return
        emitFirebaseError(err)
      },
    )

    return () => {
      active = false
      unsubTrainings()
      unsubResults()
    }
  }, [isMember, groupId])

  useEffect(() => {
    const preferredId = String(initialTrainingId ?? '').trim()
    if (!preferredId || loading) return

    const applyDeepLink = async () => {
      setDeepLinkBlocked(null)
      let training = accessibleTrainings.find((tr) => tr.id === preferredId) ?? null
      if (!training) {
        try {
          training = await fetchGroupTrainingForOperator(preferredId, groupId)
          if (!training) {
            setDeepLinkBlocked(t('sectors.grup-egitimi.deepLink.notFound'))
            return
          }
          setTrainings((prev) => {
            if (prev.some((tr) => tr.id === training.id)) return prev
            return [training, ...prev].sort(
              (a, b) => timestampToMs(b.createdAt) - timestampToMs(a.createdAt),
            )
          })
        } catch {
          setDeepLinkBlocked(t('sectors.grup-egitimi.deepLink.verifyFailed'))
          return
        }
      }

      if (!training) return

      setDetailId(training.id)
      if (training.status === 'active') {
        setTab('live')
        setSelectedId(training.id)
      } else {
        setTab('history')
      }
    }

    void applyDeepLink()
  }, [initialTrainingId, accessibleTrainings, loading, groupId, t])

  useEffect(() => {
    setHits('')
    setTimeSec('')
    setMsg('')
  }, [selectedId])

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault()
      if (!selected || !uid || selected.status !== 'active') return
      if (isTrainingSessionExpired(selected)) {
        setMsg(formatGroupTrainingValidationMessage('sessionExpired'))
        return
      }
      if (myResultForSelected) {
        setMsg(formatGroupTrainingValidationMessage('alreadySubmitted'))
        return
      }

      const hitsNum = Number(hits)
      if (!Number.isFinite(hitsNum) || hitsNum < 0 || hitsNum > selected.totalAmmo) {
        setMsg(formatGroupTrainingValidationMessage('hitsRange', { max: selected.totalAmmo }))
        return
      }

      setBusy(true)
      setMsg('')
      try {
        await submitTrainingResult({
          training: selected,
          operatorId: uid,
          operatorName,
          hits: hitsNum,
          time: selected.isTimed ? Number(timeSec) : null,
        })
        const assessment = computeGroupTrainingAssessment({
          totalAmmo: selected.totalAmmo,
          minPassScore: selected.minPassScore,
          hits: hitsNum,
          isTimed: selected.isTimed,
          targetTimeSec: selected.targetTimeSec,
          time: selected.isTimed ? Number(timeSec) : null,
        })
        setMsg(
          t('sectors.grup-egitimi.messages.submitSuccess', {
            status: formatGroupTrainingAssessmentLabel(assessment.statusResult, assessment.isPassed),
          }),
        )
        setHits('')
        setTimeSec('')
      } catch (err) {
        emitFirebaseError(err)
        setMsg(err instanceof Error ? err.message : formatGroupTrainingValidationMessage('submitFailed'))
      } finally {
        setBusy(false)
      }
    },
    [selected, uid, operatorName, hits, timeSec, myResultForSelected, t],
  )

  const toggleHistoryDetail = useCallback((/** @type {string} */ trainingId) => {
    setDetailId((prev) => (prev === trainingId ? '' : trainingId))
  }, [])

  if (groupLoading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center gap-2 text-accent">
        <Loader2 className="size-5 animate-spin" aria-hidden />
        <span className="font-mono-technical text-xs uppercase tracking-widest">
          {t('sectors.grup-egitimi.loading.verifyingGroup')}
        </span>
      </div>
    )
  }

  if (!isMember || !groupId) {
    return (
      <div className="w-full min-w-0 space-y-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 font-mono-technical text-[10px] uppercase tracking-widest text-app-text/55 hover:text-accent"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {t('common.terminal.backToCategories')}
        </button>
        <AmberAlert label={t('sectors.grup-egitimi.groupRequired.alertLabel')}>
          {t('sectors.grup-egitimi.groupRequired.body')}{' '}
          <Link to="/ayarlar" className="font-bold text-accent underline-offset-2 hover:underline">
            {t('sectors.grup-egitimi.groupRequired.settingsLink')}
          </Link>
        </AmberAlert>
      </div>
    )
  }

  return (
    <div className="w-full min-w-0 space-y-5">
      {deepLinkBlocked ? (
        <AmberAlert label={t('sectors.grup-egitimi.deepLink.accessDeniedLabel')}>
          {deepLinkBlocked}
        </AmberAlert>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 font-mono-technical text-[10px] uppercase tracking-widest text-app-text/55 transition hover:text-accent"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {t('common.terminal.backToCategories')}
        </button>
        <p className="flex items-center gap-2 font-mono-technical text-[10px] uppercase tracking-widest text-accent/80">
          <Users className="size-4" aria-hidden />
          {membership.groupName ?? membership.groupId}
        </p>
      </div>

      <header className="border-b border-accent/15 pb-3">
        <p className="font-mono-technical text-[10px] font-semibold uppercase tracking-[0.32em] text-accent/85">
          {t('sectors.grup-egitimi.header.kicker')}
        </p>
        <h2 className="font-display mt-1 text-lg font-bold tracking-[0.1em] text-app-text">
          {t('sectors.grup-egitimi.header.title')}
        </h2>
        <p className="mt-1 font-mono-technical text-[9px] uppercase text-app-text/55">
          {t('sectors.grup-egitimi.header.subtitle')}
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab('live')}
          className={[
            'inline-flex items-center gap-2 rounded border px-3 py-2 font-mono-technical text-[9px] font-bold uppercase tracking-wider transition',
            tab === 'live'
              ? 'border-accent/50 bg-accent/10 text-accent'
              : 'border-white/10 text-app-text/55 hover:border-accent/30 hover:text-accent',
          ].join(' ')}
        >
          <Radio className="size-3.5" aria-hidden />
          {t('sectors.grup-egitimi.tabs.live')}
          {openActiveTrainings.length > 0 ? (
            <span className="rounded bg-lime-500 px-1.5 py-0.5 text-[8px] text-black">
              {openActiveTrainings.length}
            </span>
          ) : null}
        </button>
        <button
          type="button"
          onClick={() => setTab('history')}
          className={[
            'inline-flex items-center gap-2 rounded border px-3 py-2 font-mono-technical text-[9px] font-bold uppercase tracking-wider transition',
            tab === 'history'
              ? 'border-accent/50 bg-accent/10 text-accent'
              : 'border-white/10 text-app-text/55 hover:border-accent/30 hover:text-accent',
          ].join(' ')}
        >
          <History className="size-3.5" aria-hidden />
          {t('sectors.grup-egitimi.tabs.history')}
        </button>
      </div>

      {loading ? (
        <p className="flex items-center gap-2 font-mono-technical text-xs text-app-text/55">
          <Loader2 className="size-4 animate-spin text-accent" aria-hidden />
          {t('sectors.grup-egitimi.loading.data')}
        </p>
      ) : tab === 'live' ? (
        <div className="space-y-4">
          <TacticalPanel className="p-4 sm:p-5">
            <p className={hudLabel}>{t('sectors.grup-egitimi.live.activeSessions')}</p>
            {activeTrainings.length === 0 ? (
              <p className="mt-2 rounded border border-amber-500/30 bg-amber-950/20 px-3 py-2 font-mono-technical text-xs text-amber-200/90">
                {t('sectors.grup-egitimi.live.noActive')}
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {activeTrainings.map((training) => {
                  const sessionStatus = getOperatorTrainingSessionStatus(training, results, uid)
                  const sessionDisplay = formatGroupTrainingSessionStatusDisplay(sessionStatus.key)
                  const styles = getOperatorSessionStatusStyles(sessionStatus.key)
                  const isSelected = selectedId === training.id
                  const isClosedForMe = sessionStatus.key === 'closed_for_me'

                  return (
                    <li key={training.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(training.id)}
                        className={[
                          'flex w-full items-start justify-between gap-3 rounded-lg border px-3 py-3 text-left transition',
                          isSelected ? styles.rowSelected : styles.row,
                          isClosedForMe ? 'opacity-85' : '',
                        ].join(' ')}
                      >
                        <span className="min-w-0">
                          <span
                            className={[
                              'block font-mono-technical text-sm font-semibold',
                              isClosedForMe ? 'text-zinc-400' : 'text-app-text',
                            ].join(' ')}
                          >
                            {training.trainingName}
                          </span>
                          <span className="mt-0.5 block font-mono-technical text-[9px] uppercase text-app-text/55">
                            {training.level && training.level !== '—' ? `${training.level} · ` : ''}
                            {training.isTimed ? `${t('sectors.grup-egitimi.live.timed')} · ` : ''}
                            {formatGroupTrainingDateDisplay(training.createdAt)}
                          </span>
                          <span className="mt-1 block font-mono-technical text-[8px] uppercase tracking-wide text-app-text/45">
                            {sessionDisplay.hint}
                          </span>
                        </span>
                        <span
                          className={[
                            'shrink-0 rounded border px-2 py-0.5 font-mono-technical text-[8px] font-bold uppercase tracking-wider',
                            styles.badge,
                          ].join(' ')}
                        >
                          {sessionDisplay.label}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </TacticalPanel>

          {selected && selected.status === 'active' ? (
            <>
              <GroupTrainingDetailPanel training={selected} results={results} currentUid={uid} />

              {selectedSessionStatus?.key === 'closed_for_me' && myResultForSelected && mySelectedAssessment ? (
                <AmberAlert label={t('sectors.grup-egitimi.alerts.sessionClosed.label')}>
                  {t('sectors.grup-egitimi.alerts.sessionClosed.body', {
                    hits: myResultForSelected.hits,
                    total: selected.totalAmmo,
                    timePart: formatGroupTrainingAlertTimePart(
                      selected.isTimed,
                      myResultForSelected.time,
                    ),
                    status: formatGroupTrainingAssessmentLabel(
                      mySelectedAssessment.statusResult,
                      mySelectedAssessment.isPassed,
                    ),
                  })}
                </AmberAlert>
              ) : myResultForSelected && mySelectedAssessment ? (
                <AmberAlert label={t('sectors.grup-egitimi.alerts.recordExists.label')}>
                  {t('sectors.grup-egitimi.alerts.recordExists.body', {
                    hits: myResultForSelected.hits,
                    total: selected.totalAmmo,
                    timePart: formatGroupTrainingAlertTimePart(
                      selected.isTimed,
                      myResultForSelected.time,
                    ),
                    status: formatGroupTrainingAssessmentLabel(
                      mySelectedAssessment.statusResult,
                      mySelectedAssessment.isPassed,
                    ),
                  })}
                </AmberAlert>
              ) : selectedSessionStatus?.key === 'open' ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <TacticalPanel className="p-4 sm:p-5">
                    <div className="flex items-center gap-2 text-accent">
                      <Crosshair className="size-5" strokeWidth={1.5} aria-hidden />
                      <span className="font-display text-xs font-bold uppercase tracking-widest">
                        {t('sectors.grup-egitimi.form.scoreEntry')}
                      </span>
                    </div>

                    <div className="mt-4 space-y-3">
                      <Input
                        variant="gold"
                        label={t('sectors.grup-egitimi.form.hitsLabel')}
                        id="grp-hits"
                        type="number"
                        min={0}
                        max={selected.totalAmmo}
                        value={hits}
                        onChange={(e) => setHits(e.target.value)}
                        placeholder={t('sectors.grup-egitimi.form.hitsPlaceholder', {
                          max: selected.totalAmmo,
                        })}
                        required
                        disabled={busy}
                      />

                      {selected.isTimed ? (
                        <div className="flex items-start gap-2">
                          <Timer className="mt-2 size-4 shrink-0 text-accent/80" aria-hidden />
                          <Input
                            variant="gold"
                            label={t('sectors.grup-egitimi.form.timeLabel')}
                            id="grp-time"
                            type="number"
                            min={0}
                            step="0.01"
                            value={timeSec}
                            onChange={(e) => setTimeSec(e.target.value)}
                            placeholder={t('sectors.grup-egitimi.form.timePlaceholder')}
                            required
                            disabled={busy}
                          />
                        </div>
                      ) : null}
                    </div>

                    {msg ? (
                      <p className="mt-3 font-mono-technical text-xs text-accent/90">{msg}</p>
                    ) : null}

                    <Button type="submit" variant="primary" className="mt-4 w-full" disabled={busy}>
                      {busy
                        ? t('sectors.grup-egitimi.form.submitting')
                        : t('sectors.grup-egitimi.form.submit')}
                    </Button>
                  </TacticalPanel>
                </form>
              ) : null}
            </>
          ) : null}
        </div>
      ) : (
        <div className="space-y-4">
          {historyTrainings.length === 0 ? (
            <TacticalPanel className="p-6 text-center">
              <p className="font-mono-technical text-xs text-app-text/55">
                {t('sectors.grup-egitimi.history.empty')}
              </p>
            </TacticalPanel>
          ) : (
            <TacticalPanel className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[32rem] text-left font-mono-technical text-[10px]">
                  <thead className="border-b border-white/10 bg-black/40 text-app-text/55">
                    <tr>
                      <th className="px-3 py-2 font-bold uppercase tracking-wider">
                        {t('sectors.grup-egitimi.history.table.training')}
                      </th>
                      <th className="px-3 py-2 font-bold uppercase tracking-wider">
                        {t('sectors.grup-egitimi.history.table.status')}
                      </th>
                      <th className="px-3 py-2 font-bold uppercase tracking-wider">
                        {t('sectors.grup-egitimi.history.table.date')}
                      </th>
                      <th className="px-3 py-2 font-bold uppercase tracking-wider">
                        {t('sectors.grup-egitimi.history.table.yourResult')}
                      </th>
                      <th className="px-3 py-2 font-bold uppercase tracking-wider">
                        {t('sectors.grup-egitimi.history.table.participation')}
                      </th>
                      <th className="px-3 py-2 font-bold uppercase tracking-wider" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {historyTrainings.map((training) => {
                      const mine = results.find((r) => r.trainingId === training.id && r.operatorId === uid)
                      const mineAssessment = mine ? resolveResultAssessment(mine, training) : null
                      const count = results.filter((r) => r.trainingId === training.id).length
                      const sessionStatus = getOperatorTrainingSessionStatus(training, results, uid)
                      const sessionDisplay = formatGroupTrainingSessionStatusDisplay(sessionStatus.key)
                      const sessionStyles = getOperatorSessionStatusStyles(sessionStatus.key)
                      const isExpanded = detailId === training.id
                      return (
                        <Fragment key={training.id}>
                          <tr
                            className={[
                              isExpanded
                                ? 'border-l-2 border-amber-500/70 bg-amber-950/20 shadow-[inset_0_0_0_1px_rgba(245,158,11,0.12)]'
                                : '',
                              !isExpanded && sessionStatus.key === 'closed_for_me'
                                ? 'bg-zinc-950/45 text-zinc-400'
                                : '',
                              !isExpanded && sessionStatus.key === 'completed'
                                ? 'bg-slate-950/35 text-app-text/70'
                                : '',
                              !isExpanded && sessionStatus.key === 'open' ? 'text-app-text/90' : '',
                            ].join(' ')}
                          >
                            <td className="px-3 py-2.5">
                              <span className="font-semibold text-app-text">{training.trainingName}</span>
                              {training.level && training.level !== '—' ? (
                                <span className="mt-0.5 block text-app-text/55">{training.level}</span>
                              ) : null}
                            </td>
                            <td className="px-3 py-2.5">
                              <span
                                className={[
                                  'inline-flex rounded border px-2 py-0.5 font-mono-technical text-[8px] font-bold uppercase tracking-wider',
                                  sessionStyles.badge,
                                ].join(' ')}
                              >
                                {sessionDisplay.label}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-app-text/55">
                              {formatGroupTrainingDateDisplay(training.createdAt)}
                            </td>
                            <td className="px-3 py-2.5">
                              {mine && mineAssessment ? (
                                <span
                                  className={
                                    mineAssessment.isPassed
                                      ? 'text-lime-400'
                                      : mineAssessment.statusResult === 'SÜRE İHLALİ'
                                        ? 'text-amber-400'
                                        : 'text-red-400'
                                  }
                                >
                                  {t('sectors.grup-egitimi.history.resultLine', {
                                    hits: mine.hits,
                                    total: training.totalAmmo,
                                    status: formatGroupTrainingAssessmentLabel(
                                      mineAssessment.statusResult,
                                      mineAssessment.isPassed,
                                    ),
                                  })}
                                </span>
                              ) : (
                                <span className="text-app-text/45">—</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 tabular-nums">
                              {t('sectors.grup-egitimi.history.table.operators', { count })}
                            </td>
                            <td className="px-3 py-2.5">
                              <button
                                type="button"
                                onClick={() => toggleHistoryDetail(training.id)}
                                aria-expanded={isExpanded}
                                aria-controls={`grp-history-detail-${training.id}`}
                                className={[
                                  'inline-flex items-center gap-1 rounded border px-2 py-1 text-[9px] uppercase tracking-wider transition',
                                  isExpanded
                                    ? 'border-amber-500/50 bg-amber-950/30 text-amber-300'
                                    : 'border-white/10 text-app-text/70 hover:border-accent/40 hover:text-accent',
                                ].join(' ')}
                              >
                                <Eye className="size-3" aria-hidden />
                                {t('sectors.grup-egitimi.history.table.detail')}
                                <ChevronDown
                                  className={[
                                    'size-3 transition-transform duration-200',
                                    isExpanded ? 'rotate-180' : '',
                                  ].join(' ')}
                                  aria-hidden
                                />
                              </button>
                            </td>
                          </tr>
                          {isExpanded ? (
                            <tr className="bg-black/35">
                              <td
                                id={`grp-history-detail-${training.id}`}
                                colSpan={6}
                                className="border-l-2 border-b border-amber-500/70 border-b-amber-500/20 px-4 py-4"
                              >
                                <p className="mb-3 font-mono-technical text-[9px] font-bold uppercase tracking-[0.28em] text-amber-400/85">
                                  {t('sectors.grup-egitimi.history.detailTitle', {
                                    name: training.trainingName,
                                  })}
                                </p>
                                <GroupTrainingDetailPanel
                                  training={training}
                                  results={results}
                                  currentUid={uid}
                                  selfOnly
                                />
                              </td>
                            </tr>
                          ) : null}
                        </Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </TacticalPanel>
          )}
        </div>
      )}
    </div>
  )
}
