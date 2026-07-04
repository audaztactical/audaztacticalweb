import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ClipboardList,
  Droplets,
  Heart,
  Loader2,
  Radio,
  Thermometer,
  Users,
  Wind,
} from 'lucide-react'
import AmberAlert from '../common/AmberAlert'
import BentoCard from '../instructor/cleanTactical/BentoCard'
import {
  ctBackBtn,
  ctCard,
  ctCardDesc,
  ctCardTitle,
  ctHelperText,
  ctMsgErr,
  ctStatusFail,
} from '../instructor/cleanTactical/tokens'
import { useAuth } from '../../context/AuthContext'
import { useTrainingSession } from '../../context/TrainingSessionContext'
import { TRAINING_TYPE_GROUP } from '../../lib/trainingGroupFields'
import { subscribeOperatorTcccEvaluations } from '../../lib/firestoreTcccEvaluations'
import { emitFirebaseError } from '../../lib/firebaseErrorBus'
import { TCCC_MARCH_ACTION_CHIPS, TCCC_MARCH_EVALUATION_PHASES, TCCC_PHASE_SUB_CRITERIA } from '../../lib/tcccEvaluationPayload'
import { readStoredPhaseScore } from '../../lib/evaluationSubScores'
import { PhaseSubScoresDisplay } from './PhaseSubCriteriaFields'
import { useOperatorGroup } from '../../hooks/useOperatorGroup'
import IndividualTrainingSessionHeader from './IndividualTrainingSessionHeader'
import TcccObservedEvalForm from './TcccObservedEvalForm'
import TcccObservedEvalRegistry from './TcccObservedEvalRegistry'
import TcccObservedPdfPanel from './TcccObservedPdfPanel'

/** @typedef {'hud' | 'pdf' | 'entry' | 'observed'} TcccViewMode */

/** @typedef {import('../../lib/firestoreTcccEvaluations').TcccEvaluation} TcccEvaluation */
/** @typedef {import('../../lib/tcccEvaluationPayload').TcccMarchPhaseId} TcccMarchPhaseId */

const PHASE_ICONS = {
  m: Droplets,
  a: Wind,
  r: Activity,
  c: Heart,
  h: Thermometer,
}

/**
 * @param {number} totalSec
 */
function formatInterventionTime(totalSec) {
  const safe = Math.max(0, totalSec)
  const m = Math.floor(safe / 60)
  const s = Math.floor(safe % 60)
  const cs = Math.floor((safe % 1) * 10)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${cs}`
}

/**
 * @param {TcccEvaluation | null} evaluation
 * @param {TcccMarchPhaseId} phaseId
 */
function getMarchPhase(evaluation, phaseId) {
  if (!evaluation) return null
  return evaluation.phases?.[phaseId] ?? evaluation.marchScores?.[phaseId] ?? null
}

/**
 * @param {TcccEvaluation | null} evaluation
 * @param {TcccMarchPhaseId} phaseId
 */
function getMarchScore(evaluation, phaseId) {
  const p = getMarchPhase(evaluation, phaseId)
  return readStoredPhaseScore(p)
}

/**
 * @param {TcccEvaluation | null} evaluation
 * @param {TcccMarchPhaseId} phaseId
 */
function isMarchCriticalFail(evaluation, phaseId) {
  if (!evaluation) return false
  if (evaluation.criticalFails?.[phaseId]) return true
  return Boolean(getMarchPhase(evaluation, phaseId)?.criticalFail)
}

/**
 * @param {TcccEvaluation | null} evaluation
 * @param {TcccMarchPhaseId} phaseId
 */
function getMarchObservation(evaluation, phaseId) {
  if (!evaluation) return ''
  const fromPhase = getMarchPhase(evaluation, phaseId)?.observation
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
export default function TcccTerminal({
  onBack,
  ready,
  listenError,
  logs = [],
  logsLoading = false,
  logsReady = true,
  logsListenError = null,
  addLog,
}) {
  const { user } = useAuth()
  const uid = user?.uid ?? ''
  const { trainingType, membership, isMember, groupLoading } = useTrainingSession()
  const { loading: operatorGroupLoading } = useOperatorGroup()

  const [viewMode, setViewMode] = useState(/** @type {TcccViewMode} */ ('hud'))

  const isGroupMode = trainingType === TRAINING_TYPE_GROUP
  const groupId = membership?.groupId ?? ''
  const syncEnabled = isGroupMode && isMember && Boolean(groupId) && Boolean(uid)

  const [evaluations, setEvaluations] = useState(/** @type {TcccEvaluation[]} */ ([]))
  const [syncLoading, setSyncLoading] = useState(true)
  const [syncError, setSyncError] = useState(/** @type {string | null} */ (null))
  const [elapsedSec, setElapsedSec] = useState(0)

  const latestEvaluation = evaluations[0] ?? null
  const targetSec = latestEvaluation?.isTimed ? latestEvaluation.targetInterventionSec : null
  const hasScores =
    latestEvaluation != null &&
    TCCC_MARCH_EVALUATION_PHASES.every((m) => getMarchScore(latestEvaluation, m.id) != null)

  const criticalCount = useMemo(() => {
    if (!latestEvaluation) return 0
    return TCCC_MARCH_EVALUATION_PHASES.filter((m) => isMarchCriticalFail(latestEvaluation, m.id)).length
  }, [latestEvaluation])

  const casualtyUnstable =
    latestEvaluation?.casualtyStatus === 'EKS_KIA' || criticalCount > 0

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

    const unsub = subscribeOperatorTcccEvaluations(
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
        setSyncError(err instanceof Error ? err.message : 'Senkronizasyon kesildi.')
        setSyncLoading(false)
      },
    )

    return () => {
      active = false
      unsub()
    }
  }, [syncEnabled, groupId, uid])

  useEffect(() => {
    if (!syncEnabled) {
      setElapsedSec(0)
      return undefined
    }

    const started = performance.now()
    const id = window.setInterval(() => {
      setElapsedSec((performance.now() - started) / 1000)
    }, 100)

    return () => window.clearInterval(id)
  }, [syncEnabled])

  const targetLabel = useMemo(() => {
    if (targetSec == null || targetSec <= 0) return '—'
    return formatInterventionTime(targetSec)
  }, [targetSec])

  const elapsedLabel = formatInterventionTime(elapsedSec)
  const overTarget = targetSec != null && targetSec > 0 && elapsedSec > targetSec
  const combinedError = listenError?.message ?? syncError

  if (!ready) {
    return (
      <div className="w-full min-w-0 max-w-none space-y-4">
        <IndividualTrainingSessionHeader />
        <p className="font-mono-technical text-[10px] uppercase text-zinc-500">Oturum gerekli</p>
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
          Kategorilere dön
        </button>

        <div
          className="flex w-full flex-wrap gap-1.5 rounded border border-accent/25 bg-black/60 p-1 sm:w-auto"
          role="tablist"
          aria-label="TCCC terminal görünümü"
        >
          <button type="button" role="tab" aria-selected={viewMode === 'hud'} onClick={() => setViewMode('hud')} className={tabBtnClassCompact(viewMode === 'hud')}>
            CANLI HUD
          </button>
          <button type="button" role="tab" aria-selected={viewMode === 'pdf'} onClick={() => setViewMode('pdf')} className={tabBtnClassCompact(viewMode === 'pdf')}>
            PDF FORMU
          </button>
          <button type="button" role="tab" aria-selected={viewMode === 'entry'} onClick={() => setViewMode('entry')} className={tabBtnClassCompact(viewMode === 'entry')}>
            KAYIT GİR
          </button>
          <button type="button" role="tab" aria-selected={viewMode === 'observed'} onClick={() => setViewMode('observed')} className={tabBtnClassCompact(viewMode === 'observed')}>
            KAYITLARIM
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
        <TcccObservedPdfPanel />
      ) : viewMode === 'entry' ? (
        addLog ? (
          <TcccObservedEvalForm addLog={addLog} hidePdfBanner onSubmitted={() => setViewMode('observed')} />
        ) : (
          <p className={ctMsgErr}>Kayıt kanalı hazır değil.</p>
        )
      ) : viewMode === 'observed' ? (
        <>
          {!logsReady ? (
            <p className="font-mono-technical text-[10px] uppercase text-app-text/55">KAYIT_KANALI_SENKRON…</p>
          ) : logsListenError ? (
            <p className={ctMsgErr}>Kayıt kanalı kesildi · {logsListenError.message}</p>
          ) : null}
          <TcccObservedEvalRegistry logs={logs} loading={logsLoading} />
        </>
      ) : (
        <>
      <header className="border-b border-zinc-800 pb-3">
        <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">[ TCCC · MARCH HUD ]</p>
        <h2 className="mt-1 text-lg font-semibold tracking-tight text-zinc-100 sm:text-xl">
          Taktik Tıbbi Değerlendirme — Canlı Terminal
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-zinc-500">
          Eğitmen MARCH skorları ve kritik hatalar anlık yansır · operatör veri girişi yok
        </p>
      </header>

      {!isGroupMode ? (
        <AmberAlert label="[ GRUP MODU GEREKLİ ]">
          Canlı MARCH HUD için üstteki eğitim tipini <strong>Grup</strong> olarak seçin. Eğitmen değerlendirmesi
          yalnızca grup oturumunda bu ekrana akar.
        </AmberAlert>
      ) : groupLoading || operatorGroupLoading ? (
        <div className="flex min-h-[200px] items-center justify-center gap-2 text-zinc-400">
          <Loader2 className="size-5 animate-spin" aria-hidden />
          <span className="text-sm">Grup doğrulanıyor…</span>
        </div>
      ) : !isMember || !groupId ? (
        <AmberAlert label="[ GRUP ÜYELİĞİ ]">
          Canlı değerlendirme için bir taktik grubuna dahil olmalısınız.{' '}
          <Link to="/ayarlar" className="font-bold text-accent underline-offset-2 hover:underline">
            Taktik Timim →
          </Link>
        </AmberAlert>
      ) : (
        <>
          {combinedError ? (
            <p className={ctMsgErr}>Veri kanalı kesildi · {combinedError}</p>
          ) : null}

          <div
            className={[
              'mb-1 flex items-center justify-between gap-3 rounded border px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-[0.18em]',
              casualtyUnstable
                ? 'border-red-500/50 bg-red-900/50 text-red-500'
                : 'border-lime-500/30 bg-lime-900/30 text-lime-400',
            ].join(' ')}
            aria-live="polite"
          >
            <span>Yaralı durumu (casualty status)</span>
            <span>{casualtyUnstable ? 'EKS / K.İ.A' : 'STABİL'}</span>
          </div>

          <div className={`${ctCard} grid gap-4 border-zinc-800/90 sm:grid-cols-3`} aria-live="polite">
            <div className="flex flex-col justify-center gap-1">
              <div className="flex items-center gap-2">
                <span className="relative flex size-2.5 shrink-0" aria-hidden>
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-500/70 opacity-75" />
                  <span className="relative inline-flex size-2.5 rounded-full bg-red-500" />
                </span>
                <span className="text-sm font-semibold uppercase tracking-wide text-red-400">
                  🔴 Canlı müdahale
                </span>
              </div>
              <p className="text-xs text-zinc-500">
                {syncLoading
                  ? 'Senkron bağlanıyor…'
                  : hasScores
                    ? 'MARCH değerlendirmesi alındı'
                    : 'Eğitmen değerlendirmesi bekleniyor'}
              </p>
              {latestEvaluation ? (
                <p className="mt-1 text-xs text-zinc-400">
                  Genel skor:{' '}
                  <span className="font-semibold tabular-nums text-zinc-100">
                    {latestEvaluation.overallScore}/10
                  </span>
                  {criticalCount > 0 ? (
                    <span className="ml-2 text-red-400">· {criticalCount} kritik hata</span>
                  ) : null}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950/60 px-4 py-3">
              <span className="text-xs font-medium uppercase tracking-widest text-zinc-500">
                Müdahale süresi
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
                Kronometre aktif
              </p>
            </div>

            <div className="flex flex-col items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950/60 px-4 py-3">
              <span className="text-xs font-medium uppercase tracking-widest text-zinc-500">
                Müdahale hedef süresi
              </span>
              <p className="mt-1 font-mono text-3xl font-bold tabular-nums tracking-tight text-emerald-400/90">
                {targetLabel}
              </p>
              <p className={ctHelperText}>
                {latestEvaluation?.isTimed
                  ? 'Eğitmenin belirlediği hedef süre (sn)'
                  : 'Zamanlı oturum tanımlanmadı'}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {TCCC_MARCH_EVALUATION_PHASES.map((meta, index) => {
              const score = getMarchScore(latestEvaluation, meta.id)
              const critical = isMarchCriticalFail(latestEvaluation, meta.id)
              const pending = score == null
              const Icon = PHASE_ICONS[meta.id]

              return (
                <BentoCard
                  key={meta.id}
                  title={meta.title}
                  description={meta.subtitle}
                  icon={Icon}
                  delay={index * 0.03}
                  className={
                    critical
                      ? 'border-red-900/50 bg-gradient-to-b from-red-950/30 to-zinc-900/80'
                      : pending
                        ? 'border-zinc-800/80'
                        : 'border-emerald-900/35 bg-gradient-to-b from-zinc-900/80 to-emerald-950/15'
                  }
                  action={
                    critical ? (
                      <span className={ctStatusFail}>
                        <AlertTriangle className="mr-1 inline size-3" aria-hidden />
                        Kritik
                      </span>
                    ) : null
                  }
                >
                  <div className="mb-2 flex size-7 items-center justify-center rounded-md border border-zinc-700 bg-zinc-950 font-mono text-xs font-bold text-zinc-200">
                    {meta.letter}
                  </div>
                  {pending ? (
                    <p className="py-4 text-center text-sm italic text-zinc-500">
                      Değerlendirme bekleniyor…
                    </p>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-end justify-between gap-2">
                        <div>
                          <p className="text-xs font-medium text-zinc-500">Safha ortalaması</p>
                          <p
                            className={`font-mono text-2xl font-bold tabular-nums ${
                              critical ? 'text-red-400' : 'text-zinc-100'
                            }`}
                          >
                            {score}
                            <span className="text-base font-medium text-zinc-500">/10</span>
                          </p>
                        </div>
                        {critical ? (
                          <AlertTriangle className="size-7 shrink-0 text-red-400/90" aria-hidden />
                        ) : (
                          <div
                            className="size-9 shrink-0 rounded-full border border-emerald-500/30"
                            style={{
                              background: `conic-gradient(rgb(52 211 153 / 0.55) ${(score ?? 0) * 36}deg, rgb(39 39 42 / 0.4) 0deg)`,
                            }}
                            aria-hidden
                          />
                        )}
                      </div>
                      <PhaseSubScoresDisplay
                        phaseData={getMarchPhase(latestEvaluation, meta.id)}
                        criteria={TCCC_PHASE_SUB_CRITERIA[meta.id]}
                        maxScore={10}
                        compact
                      />
                    </div>
                  )}
                </BentoCard>
              )
            })}
          </div>

          <div className={`${ctCard} border-zinc-800/90`}>
            <header className="mb-4 flex items-center gap-2 border-b border-zinc-800 pb-3">
              <ClipboardList className="size-4 shrink-0 text-zinc-400" strokeWidth={1.5} aria-hidden />
              <div>
                <h3 className={ctCardTitle}>Gözlem notları</h3>
                <p className={ctCardDesc}>Eğitmen · MARCH operationalNotes · canlı</p>
              </div>
            </header>

            {!latestEvaluation ? (
              <p className="py-4 text-center text-sm italic text-zinc-500">
                Henüz gözlem notu yok — eğitmen kayıt yaptığında burada görünür.
              </p>
            ) : (
              <ul className="space-y-3">
                {TCCC_MARCH_EVALUATION_PHASES.map((meta) => {
                  const note = getMarchObservation(latestEvaluation, meta.id)
                  const critical = isMarchCriticalFail(latestEvaluation, meta.id)
                  const chipIds =
                    latestEvaluation.marchActionChips?.[meta.id] ??
                    getMarchPhase(latestEvaluation, meta.id)?.actionChips ??
                    []
                  const chipLabels = TCCC_MARCH_ACTION_CHIPS[meta.id]
                    .filter((c) => chipIds.includes(c.id))
                    .map((c) => c.label)
                  return (
                    <li
                      key={meta.id}
                      className={`rounded-lg border px-3 py-2.5 ${
                        critical ? 'border-red-900/40 bg-red-950/20' : 'border-zinc-800 bg-zinc-950/50'
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-zinc-400">{meta.letter}</span>
                        <p className="text-xs font-medium text-zinc-500">{meta.title}</p>
                        {critical ? (
                          <span className={ctStatusFail}>
                            <AlertTriangle className="mr-1 inline size-3" aria-hidden />
                            Kritik hata
                          </span>
                        ) : null}
                      </div>
                      {chipLabels.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {chipLabels.map((label) => (
                            <span
                              key={label}
                              className="rounded border border-lime-500/40 bg-zinc-900 px-2 py-0.5 font-mono text-[10px] text-lime-400"
                            >
                              {label}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      <p className="mt-1 text-sm leading-relaxed text-zinc-300">
                        {note || (
                          <span className="italic text-zinc-600">Bu safha için not girilmedi.</span>
                        )}
                      </p>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <p className="text-center text-xs text-zinc-600">
            Firestore · tccc_evaluations · onSnapshot
            {latestEvaluation ? ` · oturum ${latestEvaluation.id.slice(0, 8)}` : ''}
          </p>
        </>
      )}
        </>
      )}
      </div>
    </div>
  )
}
