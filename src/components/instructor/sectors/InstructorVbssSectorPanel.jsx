import { useCallback, useEffect, useMemo, useState } from 'react'
import { Anchor, ClipboardCheck, Loader2, Ship } from 'lucide-react'
import { createVbssEvaluation } from '../../../lib/firestoreVbssEvaluations'
import { emitFirebaseError } from '../../../lib/firebaseErrorBus'
import {
  VBSS_EVALUATION_INITIAL_FORM,
  VBSS_EVALUATION_PHASES,
  VBSS_SCORE_OPTIONS,
  buildVbssEvaluationPayload,
  validateVbssEvaluationForm,
} from '../../../lib/vbssEvaluationPayload'
import BentoCard from '../cleanTactical/BentoCard'
import InstructorGroupSelect from '../cleanTactical/InstructorGroupSelect'
import CleanFade from '../cleanTactical/CleanFade'
import {
  ctBentoGrid,
  ctBentoSpan12,
  ctBentoSpan6,
  ctBtnPrimary,
  ctHelperText,
  ctInput,
  ctLabel,
  ctMsgErr,
  ctMsgOk,
  ctSelect,
} from '../cleanTactical/tokens'

/** @typedef {import('../../../lib/firestoreGroups').TacticalGroup} TacticalGroup */
/** @typedef {import('../../../lib/firestoreInstructor').OperatorProfile} OperatorProfile */
/** @typedef {import('../../../lib/vbssEvaluationPayload').VbssPhaseId} VbssPhaseId */

/**
 * @param {{
 *   phaseId: VbssPhaseId
 *   title: string
 *   subtitle: string
 *   score: string
 *   observation: string
 *   onScoreChange: (v: string) => void
 *   onObservationChange: (v: string) => void
 * }} props
 */
function VbssPhaseCard({
  phaseId,
  title,
  subtitle,
  score,
  observation,
  onScoreChange,
  onObservationChange,
}) {
  return (
    <BentoCard
      title={title}
      description={subtitle}
      icon={phaseId === 'boarding' ? Anchor : phaseId === 'clearing' ? Ship : ClipboardCheck}
      className="border-zinc-800/90"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1.5" htmlFor={`vbss-score-${phaseId}`}>
          <span className={ctLabel}>Skor (0–10)</span>
          <select
            id={`vbss-score-${phaseId}`}
            className={ctSelect}
            value={score}
            onChange={(e) => onScoreChange(e.target.value)}
            required
          >
            <option value="">Seçin</option>
            {VBSS_SCORE_OPTIONS.map((n) => (
              <option key={n} value={String(n)}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1.5 sm:col-span-2" htmlFor={`vbss-note-${phaseId}`}>
          <span className={ctLabel}>Gözlem notu</span>
          <textarea
            id={`vbss-note-${phaseId}`}
            className={`${ctInput} min-h-[4.5rem] resize-y`}
            value={observation}
            onChange={(e) => onObservationChange(e.target.value)}
            placeholder="Kısa taktik gözlem…"
          />
        </label>
      </div>
    </BentoCard>
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
export default function InstructorVbssSectorPanel({
  groups,
  operators,
  instructorId,
  activeGroupId,
  onActiveGroupIdChange,
}) {
  const [form, setForm] = useState(VBSS_EVALUATION_INITIAL_FORM)
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

  useEffect(() => {
    if (groupMembers.length > 0 && !form.operatorId) {
      setForm((prev) => ({ ...prev, operatorId: groupMembers[0].uid }))
    }
  }, [groupMembers, form.operatorId])

  const patchForm = useCallback((/** @type {Partial<typeof form>} */ next) => {
    setForm((prev) => ({ ...prev, ...next }))
  }, [])

  const patchPhase = useCallback(
    (/** @type {VbssPhaseId} */ id, /** @type {Partial<{ score: string; observation: string }>} */ next) => {
      setForm((prev) => ({
        ...prev,
        [id]: { ...prev[id], ...next },
      }))
    },
    [],
  )

  const handleTimedChange = useCallback((checked) => {
    setForm((prev) => ({
      ...prev,
      isTimed: checked,
      targetOperationSec: checked ? prev.targetOperationSec || '300' : '',
    }))
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMsg('')
    if (!activeGroupId || !instructorId) return

    const validation = validateVbssEvaluationForm(form)
    if (validation) {
      setMsg(validation)
      return
    }

    setSaving(true)
    try {
      const payload = buildVbssEvaluationPayload({
        form,
        groupId: activeGroupId,
        instructorId,
        operatorName:
          selectedOperator?.callsign || selectedOperator?.username || form.operatorId.slice(0, 8),
      })
      await createVbssEvaluation(payload)
      setMsg('VBSS değerlendirmesi kaydedildi.')
      setForm({ ...VBSS_EVALUATION_INITIAL_FORM, operatorId: form.operatorId })
    } catch (err) {
      emitFirebaseError(err)
      setMsg(err instanceof Error ? err.message : 'Kayıt başarısız.')
    } finally {
      setSaving(false)
    }
  }

  if (!activeGroup) {
    return <p className="py-12 text-center text-sm text-zinc-500">Aktif grup seçin</p>
  }

  const msgOk = msg.includes('kaydedildi')

  return (
    <CleanFade className="space-y-5">
      <InstructorGroupSelect
        groups={groups}
        value={activeGroupId}
        onChange={(id) => {
          onActiveGroupIdChange(id)
          setForm(VBSS_EVALUATION_INITIAL_FORM)
          setMsg('')
        }}
        className="max-w-xs"
      />

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className={ctBentoGrid}>
          <div className={ctBentoSpan12}>
            <BentoCard
              title="Operasyonel metrikler"
              description="Gemi operasyonu değerlendirme — operatör ve süre"
              icon={Ship}
            >
              <div className="grid gap-4 lg:grid-cols-2">
                <label className="block space-y-1.5" htmlFor="vbss-operator">
                  <span className={ctLabel}>Değerlendirilecek operatör</span>
                  <select
                    id="vbss-operator"
                    className={ctSelect}
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

                <div className="flex flex-col gap-3 sm:justify-end">
                  <label className="flex shrink-0 cursor-pointer items-center gap-2.5 rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-2.5">
                    <input
                      type="checkbox"
                      className="size-4 rounded border-zinc-600 accent-zinc-300"
                      checked={form.isTimed}
                      onChange={(e) => handleTimedChange(e.target.checked)}
                    />
                    <span className="text-sm text-zinc-400">Zamanlı oturum</span>
                  </label>

                  {form.isTimed ? (
                    <label className="block space-y-1.5" htmlFor="vbss-target-op-sec">
                      <span className={ctLabel}>Hedef Operasyon Süresi</span>
                      <input
                        id="vbss-target-op-sec"
                        type="number"
                        min={0.01}
                        step={1}
                        className={`${ctInput} tabular-nums`}
                        value={form.targetOperationSec}
                        onChange={(e) => patchForm({ targetOperationSec: e.target.value })}
                        placeholder="örn. 300"
                        required
                      />
                      <p className={ctHelperText}>Saniye cinsinden hedef tamamlama süresi.</p>
                    </label>
                  ) : null}
                </div>
              </div>
            </BentoCard>
          </div>

          {VBSS_EVALUATION_PHASES.map((meta) => (
            <div key={meta.id} className={ctBentoSpan6}>
              <VbssPhaseCard
                phaseId={meta.id}
                title={meta.title}
                subtitle={meta.subtitle}
                score={form[meta.id].score}
                observation={form[meta.id].observation}
                onScoreChange={(v) => patchPhase(meta.id, { score: v })}
                onObservationChange={(v) => patchPhase(meta.id, { observation: v })}
              />
            </div>
          ))}

          <div className={`${ctBentoSpan12} flex flex-col gap-3 border-t border-zinc-800 pt-4`}>
            {msg ? <p className={msgOk ? ctMsgOk : ctMsgErr}>{msg}</p> : null}
            <button type="submit" disabled={saving || groupMembers.length === 0} className={ctBtnPrimary}>
              {saving ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <ClipboardCheck className="size-4" aria-hidden />
              )}
              Değerlendirmeyi kaydet
            </button>
            <p className={ctHelperText}>
              Kayıt hedefi: Firestore · vbss_evaluations · operasyonel puanlar ve notlar
            </p>
          </div>
        </div>
      </form>
    </CleanFade>
  )
}
