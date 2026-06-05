import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity,
  ClipboardCheck,
  Droplets,
  Heart,
  Loader2,
  Stethoscope,
  Thermometer,
  Wind,
} from 'lucide-react'
import { createTcccEvaluation } from '../../../lib/firestoreTcccEvaluations'
import { emitFirebaseError } from '../../../lib/firebaseErrorBus'
import {
  TCCC_EVALUATION_INITIAL_FORM,
  TCCC_MARCH_ACTION_CHIPS,
  TCCC_MARCH_EVALUATION_PHASES,
  buildTcccEvaluationPayload,
  formHasAnyCriticalFail,
  resolveMarchPhaseScore,
  validateTcccEvaluationForm,
} from '../../../lib/tcccEvaluationPayload'
import InstructorGroupSelect from '../cleanTactical/InstructorGroupSelect'
import CleanFade from '../cleanTactical/CleanFade'
import { ctBtnPrimary, ctHelperText, ctMsgErr, ctMsgOk } from '../cleanTactical/tokens'

/** @typedef {import('../../../lib/firestoreGroups').TacticalGroup} TacticalGroup */
/** @typedef {import('../../../lib/firestoreInstructor').OperatorProfile} OperatorProfile */
/** @typedef {import('../../../lib/tcccEvaluationPayload').TcccMarchPhaseId} TcccMarchPhaseId */
/** @typedef {import('../../../lib/tcccEvaluationPayload').TcccMarchPhaseFormState} TcccMarchPhaseFormState */

const SEGMENT_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

const PHASE_ICONS = {
  m: Droplets,
  a: Wind,
  r: Activity,
  c: Heart,
  h: Thermometer,
}

const hudShell = 'font-mono rounded-lg border bg-zinc-950'
const hudLabel = 'text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500'
const hudInput =
  'w-full rounded border border-zinc-700/80 bg-zinc-900 px-3 py-2 font-mono text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-lime-500/50 focus:ring-1 focus:ring-lime-500/20'
const hudSelect =
  'w-full rounded border border-zinc-700/80 bg-zinc-900 px-3 py-2 font-mono text-sm text-zinc-100 outline-none focus:border-lime-500/50 focus:ring-1 focus:ring-lime-500/20'

/**
 * @param {{
 *   value: string
 *   onChange: (v: string) => void
 *   disabled?: boolean
 * }} props
 */
function SegmentedScoreBar({ value, onChange, disabled = false }) {
  const selected = disabled ? 0 : Number(value) || 0

  return (
    <div className="space-y-1.5" role="group" aria-label="Skor 1–10">
      <p className={hudLabel}>Performans skoru</p>
      <div className="flex gap-1">
        {SEGMENT_VALUES.map((n) => {
          const filled = selected >= n
          return (
            <button
              key={n}
              type="button"
              disabled={disabled}
              aria-pressed={selected === n}
              aria-label={`Skor ${n}`}
              onClick={() => onChange(String(n))}
              className={[
                'h-8 min-w-0 flex-1 rounded-sm border font-mono text-[11px] font-bold tabular-nums transition',
                filled
                  ? 'border-lime-400 bg-lime-500 text-zinc-950 shadow-[0_0_12px_rgba(132,204,22,0.35)]'
                  : 'border-zinc-700 bg-zinc-800 text-zinc-600 hover:border-zinc-600',
                disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer',
              ].join(' ')}
            >
              {n}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/**
 * @param {{
 *   phaseId: TcccMarchPhaseId
 *   actions: TcccMarchPhaseFormState['actions']
 *   onToggle: (chipId: string) => void
 * }} props
 */
function MarchActionChips({ phaseId, actions, onToggle }) {
  const chips = TCCC_MARCH_ACTION_CHIPS[phaseId]

  return (
    <div className="space-y-1.5">
      <p className={hudLabel}>Taktik müdahale</p>
      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => {
          const active = Boolean(actions[chip.id])
          return (
            <button
              key={chip.id}
              type="button"
              aria-pressed={active}
              onClick={() => onToggle(chip.id)}
              className={[
                'rounded border px-2.5 py-1.5 font-mono text-[11px] leading-snug transition',
                active
                  ? 'border-lime-500 bg-zinc-800 text-lime-400 shadow-[0_0_10px_rgba(132,204,22,0.2)]'
                  : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600',
              ].join(' ')}
            >
              {chip.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/**
 * @param {{
 *   active: boolean
 *   onChange: (v: boolean) => void
 * }} props
 */
function KillSwitch({ active, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      aria-label="Kritik hata K.İ.A"
      onClick={() => onChange(!active)}
      className={[
        'shrink-0 rounded border px-2.5 py-1.5 font-mono text-[9px] font-bold uppercase tracking-wider transition',
        active
          ? 'border-red-500 bg-red-950/80 text-red-400 shadow-[0_0_16px_rgba(239,68,68,0.35)]'
          : 'border-zinc-700 bg-zinc-900 text-zinc-500 hover:border-zinc-600 hover:text-zinc-400',
      ].join(' ')}
    >
      {active ? '■ K.İ.A AKTİF' : '○ KRİTİK HATA (K.İ.A)'}
    </button>
  )
}

/**
 * @param {{ unstable: boolean }} props
 */
function CasualtyStatusBar({ unstable }) {
  return (
    <div
      className={[
        'flex items-center justify-between gap-3 rounded border px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-[0.18em]',
        unstable
          ? 'border-red-500/50 bg-red-900/50 text-red-500'
          : 'border-lime-500/30 bg-lime-900/30 text-lime-400',
      ].join(' ')}
      aria-live="polite"
    >
      <span>Yaralı durumu (casualty status)</span>
      <span className="tabular-nums">{unstable ? 'EKS / K.İ.A' : 'STABİL'}</span>
    </div>
  )
}

/**
 * @param {{
 *   phaseId: TcccMarchPhaseId
 *   letter: string
 *   title: string
 *   subtitle: string
 *   phase: TcccMarchPhaseFormState
 *   onScoreChange: (v: string) => void
 *   onObservationChange: (v: string) => void
 *   onCriticalFailChange: (v: boolean) => void
 *   onActionToggle: (chipId: string) => void
 * }} props
 */
function TcccMarchHudCard({
  phaseId,
  letter,
  title,
  subtitle,
  phase,
  onScoreChange,
  onObservationChange,
  onCriticalFailChange,
  onActionToggle,
}) {
  const Icon = PHASE_ICONS[phaseId]
  const { criticalFail, score, observation, actions } = phase
  const effectiveScore = resolveMarchPhaseScore(phase)

  return (
    <article
      className={[
        hudShell,
        'relative flex flex-col gap-4 p-4 shadow-[inset_0_1px_0_rgba(132,204,22,0.06)]',
        criticalFail ? 'border-red-500/70' : 'border-zinc-800/90',
      ].join(' ')}
    >
      <span
        className="pointer-events-none absolute left-0 top-0 h-8 w-8 border-l border-t border-lime-500/25"
        aria-hidden
      />
      <span
        className="pointer-events-none absolute bottom-0 right-0 h-8 w-8 border-b border-r border-lime-500/25"
        aria-hidden
      />

      <header className="flex items-start justify-between gap-3 border-b border-zinc-800/80 pb-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded border border-zinc-700 bg-zinc-900 font-mono text-sm font-bold text-lime-400/90">
            {letter}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Icon className="size-3.5 shrink-0 text-zinc-500" strokeWidth={1.5} aria-hidden />
              <h3 className="truncate font-mono text-xs font-bold uppercase tracking-wide text-zinc-100">
                {title}
              </h3>
            </div>
            <p className="mt-0.5 font-mono text-[10px] leading-snug text-zinc-500">{subtitle}</p>
          </div>
        </div>
        <KillSwitch active={criticalFail} onChange={onCriticalFailChange} />
      </header>

      <SegmentedScoreBar
        value={criticalFail ? '0' : score}
        onChange={onScoreChange}
        disabled={criticalFail}
      />

      <p className="font-mono text-[10px] text-zinc-600">
        Etkin skor:{' '}
        <span className={criticalFail ? 'font-bold text-red-400' : 'font-bold text-lime-400/90'}>
          {effectiveScore}
        </span>
        <span className="text-zinc-600"> /10</span>
      </p>

      <MarchActionChips phaseId={phaseId} actions={actions} onToggle={onActionToggle} />

      <label className="block space-y-1.5" htmlFor={`tccc-note-${phaseId}`}>
        <span className={hudLabel}>Gözlem notu</span>
        <textarea
          id={`tccc-note-${phaseId}`}
          className={`${hudInput} min-h-[4.25rem] resize-y`}
          value={observation}
          onChange={(e) => onObservationChange(e.target.value)}
          placeholder="// MARCH müdahale gözlemi…"
        />
      </label>
    </article>
  )
}

/**
 * @param {{
 *   groups: TacticalGroup[]
 *   operators: OperatorProfile[]
 *   instructorId: string
 *   activeGroupId: string
 *   onActiveGroupIdChange: (id: string) => void
 * }} props
 */
export default function InstructorTcccSectorPanel({
  groups,
  operators,
  instructorId,
  activeGroupId,
  onActiveGroupIdChange,
}) {
  const [form, setForm] = useState(TCCC_EVALUATION_INITIAL_FORM)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const activeGroup = useMemo(
    () => groups.find((g) => g.groupId === activeGroupId) ?? null,
    [groups, activeGroupId],
  )

  const groupMembers = useMemo(() => {
    if (!activeGroup) return []
    const set = new Set(activeGroup.members)
    return operators.filter((op) => set.has(op.uid))
  }, [activeGroup, operators])

  const selectedOperator = useMemo(
    () => groupMembers.find((op) => op.uid === form.operatorId) ?? null,
    [groupMembers, form.operatorId],
  )

  const operatorLabel =
    selectedOperator?.callsign || selectedOperator?.username || form.operatorId.slice(0, 8) || '—'

  const casualtyUnstable = formHasAnyCriticalFail(form)

  useEffect(() => {
    if (groupMembers.length > 0 && !form.operatorId) {
      setForm((prev) => ({ ...prev, operatorId: groupMembers[0].uid }))
    }
  }, [groupMembers, form.operatorId])

  const patchForm = useCallback((/** @type {Partial<typeof form>} */ next) => {
    setForm((prev) => ({ ...prev, ...next }))
  }, [])

  const patchPhase = useCallback(
    (/** @type {TcccMarchPhaseId} */ id, /** @type {Partial<TcccMarchPhaseFormState>} */ next) => {
      setForm((prev) => ({
        ...prev,
        [id]: { ...prev[id], ...next },
      }))
    },
    [],
  )

  const handleCriticalFailChange = useCallback((/** @type {TcccMarchPhaseId} */ id, /** @type {boolean} */ checked) => {
    setForm((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        criticalFail: checked,
        score: checked ? '0' : prev[id].score === '0' ? '' : prev[id].score,
      },
    }))
  }, [])

  const handleActionToggle = useCallback((/** @type {TcccMarchPhaseId} */ id, /** @type {string} */ chipId) => {
    setForm((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        actions: {
          ...prev[id].actions,
          [chipId]: !prev[id].actions[chipId],
        },
      },
    }))
  }, [])

  const handleTimedChange = useCallback((checked) => {
    setForm((prev) => ({
      ...prev,
      isTimed: checked,
      targetInterventionSec: checked ? prev.targetInterventionSec || '180' : '',
    }))
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMsg('')
    if (!activeGroupId || !instructorId) return

    const validation = validateTcccEvaluationForm(form)
    if (validation) {
      setMsg(validation)
      return
    }

    setSaving(true)
    try {
      const payload = buildTcccEvaluationPayload({
        form,
        groupId: activeGroupId,
        instructorId,
        operatorName: operatorLabel,
      })
      await createTcccEvaluation(payload)
      setMsg('TCCC MARCH telemetrisi kaydedildi.')
      setForm({ ...TCCC_EVALUATION_INITIAL_FORM, operatorId: form.operatorId })
    } catch (err) {
      emitFirebaseError(err)
      setMsg(err instanceof Error ? err.message : 'Kayıt başarısız.')
    } finally {
      setSaving(false)
    }
  }

  if (!activeGroup) {
    return <p className="py-12 text-center font-mono text-sm text-zinc-500">Aktif grup seçin</p>
  }

  const msgOk = msg.includes('kaydedildi')

  return (
    <CleanFade className="space-y-5 font-mono">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-lime-500/80">
            [ DİJİTAL TCCC KARTI · TELEMETRİ ]
          </p>
          <p className="mt-1 text-xs text-zinc-500">Eğitmen MARCH değerlendirme · HUD giriş</p>
        </div>
        <InstructorGroupSelect
          groups={groups}
          value={activeGroupId}
          onChange={(id) => {
            onActiveGroupIdChange(id)
            setForm(TCCC_EVALUATION_INITIAL_FORM)
            setMsg('')
          }}
          className="max-w-xs"
        />
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <section
          className={`${hudShell} border-zinc-800/90 p-4 shadow-[inset_0_0_24px_rgba(0,0,0,0.35)]`}
        >
          <header className="mb-4 flex items-center gap-2 border-b border-zinc-800 pb-3">
            <Stethoscope className="size-4 text-lime-500/70" strokeWidth={1.5} aria-hidden />
            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-200">
                Müdahale telemetrisi
              </h2>
              <p className="text-[10px] text-zinc-500">Operatör · zamanlı müdahale · canlı durum</p>
            </div>
          </header>

          <div className="grid gap-4 lg:grid-cols-2">
            <label className="block space-y-1.5" htmlFor="tccc-operator">
              <span className={hudLabel}>Değerlendirilecek operatör</span>
              <select
                id="tccc-operator"
                className={hudSelect}
                value={form.operatorId}
                onChange={(e) => patchForm({ operatorId: e.target.value })}
                required
                disabled={groupMembers.length === 0}
              >
                {groupMembers.length === 0 ? (
                  <option value="">Grupta üye yok</option>
                ) : (
                  groupMembers.map((op) => (
                    <option key={op.uid} value={op.uid}>
                      {op.callsign || op.username || op.uid.slice(0, 8)}
                    </option>
                  ))
                )}
              </select>
            </label>

            <div className="flex flex-col justify-end gap-3">
              <label className="flex cursor-pointer items-center gap-2.5 rounded border border-zinc-800 bg-zinc-900/80 px-3 py-2.5">
                <input
                  type="checkbox"
                  className="size-4 rounded border-zinc-600 accent-lime-500"
                  checked={form.isTimed}
                  onChange={(e) => handleTimedChange(e.target.checked)}
                />
                <span className="text-[11px] uppercase tracking-wide text-zinc-400">Zamanlı oturum</span>
              </label>
              {form.isTimed ? (
                <label className="block space-y-1.5" htmlFor="tccc-target-intervention-sec">
                  <span className={hudLabel}>Müdahale hedef süresi (sn)</span>
                  <input
                    id="tccc-target-intervention-sec"
                    type="number"
                    min={0.01}
                    step={1}
                    className={`${hudInput} tabular-nums`}
                    value={form.targetInterventionSec}
                    onChange={(e) => patchForm({ targetInterventionSec: e.target.value })}
                    placeholder="180"
                    required
                  />
                </label>
              ) : null}
            </div>
          </div>

          {form.operatorId ? (
            <div className="mt-4 space-y-2">
              <p className={hudLabel}>
                Hedef · <span className="text-zinc-300">{operatorLabel}</span>
              </p>
              <CasualtyStatusBar unstable={casualtyUnstable} />
            </div>
          ) : null}
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          {TCCC_MARCH_EVALUATION_PHASES.map((meta) => (
            <TcccMarchHudCard
              key={meta.id}
              phaseId={meta.id}
              letter={meta.letter}
              title={meta.title}
              subtitle={meta.subtitle}
              phase={form[meta.id]}
              onScoreChange={(v) => patchPhase(meta.id, { score: v })}
              onObservationChange={(v) => patchPhase(meta.id, { observation: v })}
              onCriticalFailChange={(v) => handleCriticalFailChange(meta.id, v)}
              onActionToggle={(chipId) => handleActionToggle(meta.id, chipId)}
            />
          ))}
        </div>

        <footer className="flex flex-col gap-3 border-t border-zinc-800 pt-4">
          {msg ? <p className={msgOk ? ctMsgOk : ctMsgErr}>{msg}</p> : null}
          <button
            type="submit"
            disabled={saving || groupMembers.length === 0}
            className={`${ctBtnPrimary} font-mono uppercase tracking-wide`}
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <ClipboardCheck className="size-4" aria-hidden />
            )}
            Telemetriyi kaydet · tccc_evaluations
          </button>
          <p className={ctHelperText}>MARCH skorları · action chips · K.İ.A · casualtyStatus</p>
        </footer>
      </form>
    </CleanFade>
  )
}
