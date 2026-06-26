import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
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
import { useOperatorGroup } from '../../hooks/useOperatorGroup'
import IndividualTrainingSessionHeader from './IndividualTrainingSessionHeader'
import VbssObservedEvalForm from './VbssObservedEvalForm'
import VbssObservedEvalRegistry from './VbssObservedEvalRegistry'
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
          aria-label="VBSS terminal görünümü"
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
        <VbssObservedPdfPanel />
      ) : viewMode === 'entry' ? (
        addLog ? (
          <VbssObservedEvalForm addLog={addLog} hidePdfBanner onSubmitted={() => setViewMode('observed')} />
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
          <VbssObservedEvalRegistry logs={logs} loading={logsLoading} />
        </>
      ) : (
        <>
      <header className="border-b border-zinc-800 pb-3">
        <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">[ VBSS · GÖREV HUD ]</p>
        <h2 className="mt-1 text-lg font-semibold tracking-tight text-zinc-100 sm:text-xl">
          Gemi Operasyonu — Canlı Terminal
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-zinc-500">
          Eğitmen değerlendirmesi anlık yansır · operatör veri girişi yok
        </p>
      </header>

      {!isGroupMode ? (
        <AmberAlert label="[ GRUP MODU GEREKLİ ]">
          Canlı operasyon HUD&apos;u için üstteki eğitim tipini <strong>Grup</strong> olarak seçin. Eğitmen panelindeki
          Gemi Operasyonu değerlendirmesi yalnızca grup oturumunda bu ekrana akar.
        </AmberAlert>
      ) : groupLoading || operatorGroupLoading ? (
        <div className="flex min-h-[200px] items-center justify-center gap-2 text-zinc-400">
          <Loader2 className="size-5 animate-spin" aria-hidden />
          <span className="text-sm">Grup doğrulanıyor…</span>
        </div>
      ) : !isMember || !groupId ? (
        <AmberAlert label="[ GRUP ÜYELİĞİ ]">
          Canlı değerlendirme için bir taktik grubuna dahil olmalısınız.{' '}
          <Link to="/takim" className="font-bold text-accent underline-offset-2 hover:underline">
            Taktik Timim →
          </Link>
        </AmberAlert>
      ) : (
        <>
          {combinedError ? (
            <p className={ctMsgErr}>Veri kanalı kesildi · {combinedError}</p>
          ) : null}

          {/* Üst panel — canlı durum + kronometre */}
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
                  🔴 Canlı operasyon
                </span>
              </div>
              <p className="text-xs text-zinc-500">
                {syncLoading
                  ? 'Senkron bağlanıyor…'
                  : hasScores
                    ? 'Eğitmen değerlendirmesi alındı'
                    : 'Eğitmen değerlendirmesi bekleniyor'}
              </p>
              {latestEvaluation?.overallScore > 0 ? (
                <p className="mt-1 text-xs text-zinc-400">
                  Genel skor:{' '}
                  <span className="font-semibold tabular-nums text-zinc-100">
                    {latestEvaluation.overallScore}/10
                  </span>
                </p>
              ) : null}
            </div>

            <div className="flex flex-col items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950/60 px-4 py-3 sm:col-span-1">
              <span className="text-xs font-medium uppercase tracking-widest text-zinc-500">
                Operasyon süresi
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

            <div className="flex flex-col items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950/60 px-4 py-3 sm:col-span-1">
              <span className="text-xs font-medium uppercase tracking-widest text-zinc-500">
                Hedef operasyon süresi
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

          {/* Orta panel — safhalar */}
          <div className={`${ctBentoGrid} w-full min-w-0`}>
            {VBSS_EVALUATION_PHASES.map((meta, index) => {
              const score = getPhaseScore(latestEvaluation, meta.id)
              const Icon = PHASE_ICONS[meta.id]
              const pending = score == null

              return (
                <div key={meta.id} className={ctBentoSpan4}>
                  <BentoCard
                    title={meta.title}
                    description={meta.subtitle}
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
                        Değerlendirme bekleniyor…
                      </p>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-end justify-between gap-3">
                          <div>
                            <p className="text-xs font-medium text-zinc-500">Safha ortalaması</p>
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
                        />
                      </div>
                    )}
                  </BentoCard>
                </div>
              )
            })}
          </div>

          {/* Alt panel — gözlem notları */}
          <div className={`${ctCard} border-zinc-800/90`}>
            <header className="mb-4 flex items-center gap-2 border-b border-zinc-800 pb-3">
              <ClipboardList className="size-4 shrink-0 text-zinc-400" strokeWidth={1.5} aria-hidden />
              <div>
                <h3 className={ctCardTitle}>Gözlem notları</h3>
                <p className={ctCardDesc}>Eğitmen · operationalNotes · canlı</p>
              </div>
            </header>

            {!latestEvaluation ? (
              <p className="py-4 text-center text-sm italic text-zinc-500">
                Henüz gözlem notu yok — eğitmen kayıt yaptığında burada görünür.
              </p>
            ) : (
              <ul className="space-y-4">
                {VBSS_EVALUATION_PHASES.map((meta) => {
                  const note = getPhaseObservation(latestEvaluation, meta.id)
                  return (
                    <li
                      key={meta.id}
                      className="rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-2.5"
                    >
                      <p className="text-xs font-medium text-zinc-500">{meta.title}</p>
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
            Firestore · vbss_evaluations · onSnapshot
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
