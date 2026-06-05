import { useEffect, useMemo, useRef, useState } from 'react'
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
import { VBSS_EVALUATION_PHASES } from '../../lib/vbssEvaluationPayload'
import { useOperatorGroup } from '../../hooks/useOperatorGroup'
import TrainingSessionHeader from './TrainingSessionHeader'

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
  if (!p || typeof p.score !== 'number') return null
  return p.score
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
 * }} props
 */
export default function VbssTerminal({ onBack, ready, listenError }) {
  const { user } = useAuth()
  const uid = user?.uid ?? ''
  const { trainingType, membership, isMember, groupLoading } = useTrainingSession()
  const { loading: operatorGroupLoading } = useOperatorGroup()

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
      <div className="space-y-4">
        <TrainingSessionHeader />
        <p className="font-mono-technical text-[10px] uppercase text-zinc-500">Oturum gerekli</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <TrainingSessionHeader />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={onBack} className={ctBackBtn}>
          <ArrowLeft className="size-3.5" aria-hidden />
          Kategorilere dön
        </button>
        {isGroupMode && membership?.groupName ? (
          <p className="flex items-center gap-2 text-xs font-medium text-zinc-500">
            <Users className="size-3.5 shrink-0" aria-hidden />
            {membership.groupName}
          </p>
        ) : null}
      </div>

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
          Canlı değerlendirme için bir taktik grubuna dahil olmalısınız (Başarılar → Gruba Katıl).
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
          <div className={ctBentoGrid}>
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
                      <div className="flex items-end justify-between gap-3">
                        <div>
                          <p className="text-xs font-medium text-zinc-500">Skor</p>
                          <p className="font-mono text-4xl font-bold tabular-nums text-zinc-100">
                            {score}
                            <span className="text-lg font-medium text-zinc-500">/10</span>
                          </p>
                        </div>
                        <div
                          className="h-12 w-12 rounded-full border border-emerald-500/30 bg-emerald-500/10"
                          style={{
                            background: `conic-gradient(rgb(52 211 153 / 0.55) ${score * 36}deg, rgb(39 39 42 / 0.4) 0deg)`,
                          }}
                          aria-hidden
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
    </div>
  )
}
