import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Anchor, ArrowLeft, ClipboardList, Loader2, Radio, Ship, Users } from 'lucide-react'
import AmberAlert from '../common/AmberAlert'
import BentoCard from '../instructor/cleanTactical/BentoCard'
import {
  ctBackBtn,
  ctBentoGrid,
  ctBentoSpan4,
  ctCard,
  ctCardDesc,
  ctCardTitle,
  ctHelperText,
  ctMsgErr,
} from '../instructor/cleanTactical/tokens'
import { useAuth } from '../../context/AuthContext'
import { useTrainingSession } from '../../context/TrainingSessionContext'
import { TRAINING_TYPE_GROUP } from '../../lib/trainingGroupFields'
import { subscribeOperatorVbssEvaluations } from '../../lib/firestoreVbssEvaluations'
import { emitFirebaseError } from '../../lib/firebaseErrorBus'
import { VBSS_EVALUATION_PHASES, VBSS_PHASE_SUB_CRITERIA } from '../../lib/vbssEvaluationPayload'
import { readStoredPhaseScore } from '../../lib/evaluationSubScores'
import { PhaseSubScoresDisplay } from './PhaseSubCriteriaFields'
import {
  formatObservedEvalPhaseTitle,
  formatObservedEvalPhaseSubtitle,
} from '../../lib/trainingDisplayText'
import { useOperatorGroup } from '../../hooks/useOperatorGroup'
import IndividualTrainingSessionHeader from './IndividualTrainingSessionHeader'
import VbssObservedEvalForm from './VbssObservedEvalForm'
import VbssLogRegistry from './VbssLogRegistry'
import VbssObservedPdfPanel from './VbssObservedPdfPanel'

/** @typedef {'hud' | 'pdf' | 'entry' | 'observed'} VbssViewMode */

/** @typedef {import('../../lib/firestoreVbssEvaluations').VbssEvaluation} VbssEvaluation */
/** @typedef {import('../../lib/vbssEvaluationPayload').VbssPhaseId} VbssPhaseId */

const PHASE_ICONS = {
  boarding: Anchor,
  clearing: Ship,
  control: ClipboardList,
}

/**
 * @param {number} totalSec
 */
function formatOperationTime(totalSec) {
  const safe = Math.max(0, totalSec)
  const m = Math.floor(safe / 60)
  const s = Math.floor(safe % 60)
  const cs = Math.floor((safe % 1) * 10)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${cs}`
}

/**
 * @param {VbssEvaluation | null} evaluation
 * @param {VbssPhaseId} phaseId
 */
function getPhaseScore(evaluation, phaseId) {
  if (!evaluation) return null
  const p = evaluation.phases?.[phaseId] ?? evaluation.operationalScores?.[phaseId]
  return readStoredPhaseScore(p)
}

/**
 * @param {VbssEvaluation | null} evaluation
 * @param {VbssPhaseId} phaseId
 */
function getPhaseObservation(evaluation, phaseId) {
  if (!evaluation) return ''
  const fromPhase = evaluation.phases?.[phaseId]?.observation
  if (fromPhase && String(fromPhase).trim()) return String(fromPhase).trim()
  return String(evaluation.operationalNotes?.[phaseId] ?? '').trim()
}

/**
 * @param {{
 *   onBack: () => void
 *   ready: boolean
 *   listenError: Error | null
 *   logs?: Record<string, unknown>[]
 *   logsLoading?: boolean
 *   logsReady?: boolean
 *   logsListenError?: Error | null
 *   addLog?: (payload: Record<string, unknown>) => Promise<{ id: string }>
 * }} props
 */
export default function VbssTerminal({
  onBack,
  ready,
  listenError,
  logs = [],
  logsLoading = false,
  logsReady = true,
  logsListenError = null,
  addLog,
}) {
  const { t } = useTranslation('training')
  const { user } = useAuth()
  const uid = user?.uid ?? ''
  const { trainingType, membership, isMember, groupLoading } = useTrainingSession()
  const { loading: operatorGroupLoading } = useOperatorGroup()

  const [viewMode, setViewMode] = useState(/** @type {VbssViewMode} */ ('hud'))

  const isGroupMode = trainingType === TRAINING_TYPE_GROUP
  const groupId = membership?.groupId ?? ''
  const syncEnabled = isGroupMode && isMember && Boolean(groupId) && Boolean(uid)

  const [evaluations, setEvaluations] = useState(/** @type {VbssEvaluation[]} */ ([]))
  const [syncLoading, setSyncLoading] = useState(true)
  const [syncError, setSyncError] = useState(/** @type {string | null} */ (null))
  const [elapsedSec, setElapsedSec] = useState(0)
  const chronStartedRef = useRef(false)

  const latestEvaluation = evaluations[0] ?? null
  const targetSec = latestEvaluation?.isTimed ? latestEvaluation.targetOperationSec : null
  const hasScores = latestEvaluation != null && VBSS_EVALUATION_PHASES.every((m) => getPhaseScore(latestEvaluation, m.id) != null)

  useEffect(() => {
    if (!syncEnabled) {
      setEvaluations([])
      setSyncLoading(false)
      setSyncError(null)
      return undefined
    }

    let active = true
    setSyncLoading(true)
    setSyncError(null)

    const unsub = subscribeOperatorVbssEvaluations(
      groupId,
      uid,
      (rows) => {
        if (!active) return
        setEvaluations(rows)
        setSyncLoading(false)
      },
      (err) => {
        if (!active) return
        emitFirebaseError(err)
        setSyncError(err instanceof Error ? err.message : t('sectors.vbss.hud.syncDisconnected'))
        setSyncLoading(false)
      },
    )

    return () => {
      active = false
      unsub()
    }
  }, [syncEnabled, groupId, uid, t])

  useEffect(() => {
    if (!syncEnabled) {
      chronStartedRef.current = false
      setElapsedSec(0)
      return undefined
    }

    chronStartedRef.current = true
    const started = performance.now()
    const id = window.setInterval(() => {
      setElapsedSec((performance.now() - started) / 1000)
    }, 100)

    return () => window.clearInterval(id)
  }, [syncEnabled])

  const targetLabel = useMemo(() => {
    if (targetSec == null || targetSec <= 0) return '—'
    return formatOperationTime(targetSec)
  }, [targetSec])

  const elapsedLabel = formatOperationTime(elapsedSec)
  const overTarget = targetSec != null && targetSec > 0 && elapsedSec > targetSec

  const combinedError = listenError?.message ?? syncError

  if (!ready) {
    return (
      <div className="w-full min-w-0 max-w-none space-y-4">
        <IndividualTrainingSessionHeader />
        <p className="font-mono-technical text-[10px] uppercase text-zinc-500">
          {t('sectors.vbss.hud.sessionRequired')}
        </p>
      </div>
    )
  }

  const tabBtnClassCompact = (active) =>
    `rounded border px-2 py-2 font-mono-technical text-[8px] font-bold uppercase tracking-wider transition sm:px-3 sm:text-[9px] ${
      active
        ? 'border-accent/60 bg-accent/15 text-accent'
        : 'border-white/15 text-app-text/55 hover:border-accent/35 hover:text-app-text/90'
    }`

  return (
    <div className="w-full min-w-0 max-w-none space-y-4">
      <IndividualTrainingSessionHeader />

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <button type="button" onClick={onBack} className={ctBackBtn}>
          <ArrowLeft className="size-3.5" aria-hidden />
          {t('common.terminal.backToCategories')}
        </button>

        <div
          className="flex w-full flex-wrap gap-1.5 rounded border border-accent/25 bg-black/60 p-1 sm:w-auto"
          role="tablist"
          aria-label={t('sectors.vbss.tabs.aria')}
        >
          <button type="button" role="tab" aria-selected={viewMode === 'hud'} onClick={() => setViewMode('hud')} className={tabBtnClassCompact(viewMode === 'hud')}>
            {t('sectors.vbss.tabs.hud')}
          </button>
          <button type="button" role="tab" aria-selected={viewMode === 'pdf'} onClick={() => setViewMode('pdf')} className={tabBtnClassCompact(viewMode === 'pdf')}>
            {t('sectors.vbss.tabs.pdf')}
          </button>
          <button type="button" role="tab" aria-selected={viewMode === 'entry'} onClick={() => setViewMode('entry')} className={tabBtnClassCompact(viewMode === 'entry')}>
            {t('sectors.vbss.tabs.entry')}
          </button>
          <button type="button" role="tab" aria-selected={viewMode === 'observed'} onClick={() => setViewMode('observed')} className={tabBtnClassCompact(viewMode === 'observed')}>
            {t('sectors.vbss.tabs.observed')}
          </button>
        </div>

        {isGroupMode && membership?.groupName ? (
          <p className="flex items-center gap-2 text-xs font-medium text-zinc-500 sm:ml-auto">
            <Users className="size-3.5 shrink-0" aria-hidden />
            {membership.groupName}
          </p>
        ) : null}
      </div>

      <div className="w-full min-w-0 max-w-none">
      {viewMode === 'pdf' ? (
        <VbssObservedPdfPanel />
      ) : viewMode === 'entry' ? (
        addLog ? (
          <VbssObservedEvalForm addLog={addLog} hidePdfBanner onSubmitted={() => setViewMode('observed')} />
        ) : (
          <p className={ctMsgErr}>{t('sectors.vbss.hud.logChannelNotReady')}</p>
        )
      ) : viewMode === 'observed' ? (
        <>
          {!logsReady ? (
            <p className="font-mono-technical text-[10px] uppercase text-app-text/55">
              {t('sectors.vbss.hud.logChannelSyncing')}
            </p>
          ) : logsListenError ? (
            <p className={ctMsgErr}>
              {t('sectors.vbss.hud.logChannelDisconnected', { message: logsListenError.message })}
            </p>
          ) : null}
          <VbssLogRegistry logs={logs} loading={logsLoading} />
        </>
      ) : (
        <>
      <header className="border-b border-zinc-800 pb-3">
        <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">{t('sectors.vbss.hud.kicker')}</p>
        <h2 className="mt-1 text-lg font-semibold tracking-tight text-zinc-100 sm:text-xl">
          {t('sectors.vbss.hud.title')}
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-zinc-500">{t('sectors.vbss.hud.subtitle')}</p>
      </header>

      {!isGroupMode ? (
        <AmberAlert label={t('sectors.vbss.hud.groupModeRequired.label')}>
          {t('sectors.vbss.hud.groupModeRequired.body')}
        </AmberAlert>
      ) : groupLoading || operatorGroupLoading ? (
        <div className="flex min-h-[200px] items-center justify-center gap-2 text-zinc-400">
          <Loader2 className="size-5 animate-spin" aria-hidden />
          <span className="text-sm">{t('sectors.vbss.hud.groupVerifying')}</span>
        </div>
      ) : !isMember || !groupId ? (
        <AmberAlert label={t('sectors.vbss.hud.groupMembership.label')}>
          {t('sectors.vbss.hud.groupMembership.body')}{' '}
          <Link to="/ayarlar" className="font-bold text-accent underline-offset-2 hover:underline">
            {t('sectors.vbss.hud.groupMembership.settingsLink')}
          </Link>
        </AmberAlert>
      ) : (
        <>
          {combinedError ? (
            <p className={ctMsgErr}>
              {t('sectors.vbss.hud.dataChannelDisconnected', { message: combinedError })}
            </p>
          ) : null}

          <div
            className={`${ctCard} grid gap-4 border-zinc-800/90 sm:grid-cols-3`}
            aria-live="polite"
          >
            <div className="flex flex-col justify-center gap-1 sm:col-span-1">
              <div className="flex items-center gap-2">
                <span
                  className="relative flex size-2.5 shrink-0"
                  aria-hidden
                >
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-500/70 opacity-75" />
                  <span className="relative inline-flex size-2.5 rounded-full bg-red-500" />
                </span>
                <span className="text-sm font-semibold uppercase tracking-wide text-red-400">
                  {t('sectors.vbss.hud.liveOperation')}
                </span>
              </div>
              <p className="text-xs text-zinc-500">
                {syncLoading
                  ? t('sectors.vbss.hud.syncConnecting')
                  : hasScores
                    ? t('sectors.vbss.hud.evalReceived')
                    : t('sectors.vbss.hud.evalPending')}
              </p>
              {latestEvaluation?.overallScore > 0 ? (
                <p className="mt-1 text-xs text-zinc-400">
                  {t('sectors.vbss.hud.overallScore', { score: latestEvaluation.overallScore })}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950/60 px-4 py-3 sm:col-span-1">
              <span className="text-xs font-medium uppercase tracking-widest text-zinc-500">
                {t('sectors.vbss.hud.operationDuration')}
              </span>
              <p
                className={`mt-1 font-mono text-3xl font-bold tabular-nums tracking-tight ${
                  overTarget ? 'text-amber-400' : 'text-zinc-100'
                }`}
              >
                {elapsedLabel}
              </p>
              <p className="mt-1 flex items-center gap-1 text-xs text-zinc-500">
                <Radio className="size-3" strokeWidth={1.5} aria-hidden />
                {t('sectors.vbss.hud.chronoActive')}
              </p>
            </div>

            <div className="flex flex-col items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950/60 px-4 py-3 sm:col-span-1">
              <span className="text-xs font-medium uppercase tracking-widest text-zinc-500">
                {t('sectors.vbss.hud.targetDuration')}
              </span>
              <p className="mt-1 font-mono text-3xl font-bold tabular-nums tracking-tight text-emerald-400/90">
                {targetLabel}
              </p>
              <p className={ctHelperText}>
                {latestEvaluation?.isTimed
                  ? t('sectors.vbss.hud.targetDurationHint')
                  : t('sectors.vbss.hud.noTimedSession')}
              </p>
            </div>
          </div>

          <div className={`${ctBentoGrid} w-full min-w-0`}>
            {VBSS_EVALUATION_PHASES.map((meta, index) => {
              const score = getPhaseScore(latestEvaluation, meta.id)
              const Icon = PHASE_ICONS[meta.id]
              const pending = score == null
              const phaseTitle = formatObservedEvalPhaseTitle('vbss', meta.id, meta.title)
              const phaseSubtitle = formatObservedEvalPhaseSubtitle('vbss', meta.id, meta.subtitle)

              return (
                <div key={meta.id} className={ctBentoSpan4}>
                  <BentoCard
                    title={phaseTitle}
                    description={phaseSubtitle}
                    icon={Icon}
                    delay={index * 0.04}
                    className={
                      pending
                        ? 'border-zinc-800/80'
                        : 'border-emerald-900/40 bg-gradient-to-b from-zinc-900/80 to-emerald-950/20'
                    }
                  >
                    {pending ? (
                      <p className="py-6 text-center text-sm italic text-zinc-500">
                        {t('sectors.vbss.hud.phasePending')}
                      </p>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-end justify-between gap-3">
                          <div>
                            <p className="text-xs font-medium text-zinc-500">{t('sectors.vbss.hud.phaseAverage')}</p>
                            <p className="font-mono text-3xl font-bold tabular-nums text-zinc-100">
                              {score}
                              <span className="text-lg font-medium text-zinc-500">/10</span>
                            </p>
                          </div>
                          <div
                            className="h-12 w-12 rounded-full border border-emerald-500/30 bg-emerald-500/10"
                            style={{
                              background: `conic-gradient(rgb(52 211 153 / 0.55) ${(score ?? 0) * 36}deg, rgb(39 39 42 / 0.4) 0deg)`,
                            }}
                            aria-hidden
                          />
                        </div>
                        <PhaseSubScoresDisplay
                          phaseData={latestEvaluation?.phases?.[meta.id] ?? latestEvaluation?.operationalScores?.[meta.id]}
                          criteria={VBSS_PHASE_SUB_CRITERIA[meta.id]}
                          maxScore={10}
                          compact
                          discipline="vbss"
                          phaseId={meta.id}
                        />
                      </div>
                    )}
                  </BentoCard>
                </div>
              )
            })}
          </div>

          <div className={`${ctCard} border-zinc-800/90`}>
            <header className="mb-4 flex items-center gap-2 border-b border-zinc-800 pb-3">
              <ClipboardList className="size-4 shrink-0 text-zinc-400" strokeWidth={1.5} aria-hidden />
              <div>
                <h3 className={ctCardTitle}>{t('sectors.vbss.hud.observationNotes.title')}</h3>
                <p className={ctCardDesc}>{t('sectors.vbss.hud.observationNotes.desc')}</p>
              </div>
            </header>

            {!latestEvaluation ? (
              <p className="py-4 text-center text-sm italic text-zinc-500">
                {t('sectors.vbss.hud.observationNotes.empty')}
              </p>
            ) : (
              <ul className="space-y-4">
                {VBSS_EVALUATION_PHASES.map((meta) => {
                  const note = getPhaseObservation(latestEvaluation, meta.id)
                  const phaseTitle = formatObservedEvalPhaseTitle('vbss', meta.id, meta.title)
                  return (
                    <li
                      key={meta.id}
                      className="rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-2.5"
                    >
                      <p className="text-xs font-medium text-zinc-500">{phaseTitle}</p>
                      <p className="mt-1 text-sm leading-relaxed text-zinc-300">
                        {note || (
                          <span className="italic text-zinc-600">
                            {t('sectors.vbss.hud.observationNotes.noNoteForPhase')}
                          </span>
                        )}
                      </p>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <p className="text-center text-xs text-zinc-600">
            {t('sectors.vbss.hud.firestoreMeta')}
            {latestEvaluation
              ? t('sectors.vbss.hud.firestoreSession', { id: latestEvaluation.id.slice(0, 8) })
              : ''}
          </p>
        </>
      )}
        </>
      )}
      </div>
    </div>
  )
}
