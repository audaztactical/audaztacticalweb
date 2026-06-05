import { useCallback, useMemo, useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import egitimImg from '../../assets/egitim.png'
import MatrixWireVisualizer from '../armory/MatrixWireVisualizer'
import TacticalPanel from '../ui/TacticalPanel'
import { useAuth } from '../../context/AuthContext'
import { EGITIM_INITIAL_FORM } from '../../lib/egitimLogPayload'
import { submitEgitimPlan } from '../../lib/egitimSubmit'
import {
  DIFFICULTY_LEVEL_OPTIONS,
  EGITIM_CUSTOM,
  TRAINING_FOCUS_OPTIONS,
} from '../../lib/egitimOptions'
import { invNum } from '../../lib/inventoryIlws'
import EgitimLogRegistry from './EgitimLogRegistry'
import TacticalRangeSandbox from './TacticalRangeSandbox'
import TrainingSessionHeader from './TrainingSessionHeader'

const inputClass =
  'w-full rounded border border-[#00FF41]/30 bg-[#0A0A0A] px-2 py-2 font-mono-technical text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-[#00FF41]/60'

const selectClass =
  'dossier-blood-select w-full rounded border border-[#00FF41]/35 bg-[#0A0A0A] py-2 pl-2 pr-8 font-mono-technical text-[11px] uppercase text-white outline-none focus:border-[#00FF41]/60'

const operationNoteTextareaClass =
  'block h-full min-h-0 w-full resize-none rounded border border-[#00FF41]/30 bg-[#0A0A0A] px-2 py-2 font-mono-technical text-sm leading-relaxed text-slate-100 outline-none placeholder:text-slate-600 focus:border-[#00FF41]/60'

const labelClass = 'font-mono-technical text-[8px] font-bold uppercase tracking-[0.22em] text-slate-500'

const toggleClass = (active) =>
  `flex cursor-pointer items-start gap-2.5 rounded border px-3 py-2.5 transition ${
    active
      ? 'border-[#00FF41]/50 bg-[#00FF41]/10 text-green-400'
      : 'border-white/10 text-zinc-300 hover:border-[#00FF41]/25 hover:text-zinc-100'
  }`

/** @typedef {'form' | 'sandbox' | 'registry'} EgitimViewMode */

/**
 * @param {{
 *   legend: string
 *   value: string
 *   options: import('../../lib/egitimOptions').EgitimOption[]
 *   onChange: (value: string) => void
 *   showCustom: boolean
 *   customValue: string
 *   onCustomChange: (value: string) => void
 *   customPlaceholder: string
 * }} p
 */
function EgitimSelectField({
  legend,
  value,
  options,
  onChange,
  showCustom,
  customValue,
  onCustomChange,
  customPlaceholder,
}) {
  return (
    <fieldset className="space-y-2">
      <legend className={labelClass}>{legend}</legend>
      <select className={selectClass} value={value} onChange={(e) => onChange(e.target.value)} required>
        <option value="">— SEÇİN —</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
      {showCustom ? (
        <input
          className={inputClass}
          placeholder={customPlaceholder}
          value={customValue}
          onChange={(e) => onCustomChange(e.target.value)}
          required
        />
      ) : null}
    </fieldset>
  )
}

/**
 * @param {{
 *   trainingPlans: Record<string, unknown>[]
 *   onBack: () => void
 *   addPlan: (payload: Record<string, unknown>) => Promise<{ id: string }>
 *   updatePlan: (id: string, patch: Record<string, unknown>) => Promise<unknown>
 *   ready: boolean
 *   plansLoading?: boolean
 *   listenError: Error | null
 * }} props
 */
export default function EgitimTerminal({
  trainingPlans,
  onBack,
  addPlan,
  updatePlan,
  ready,
  plansLoading = false,
  listenError,
}) {
  const { user } = useAuth()
  const uid = user?.uid ?? ''

  const [form, setForm] = useState(EGITIM_INITIAL_FORM)
  const [viewMode, setViewMode] = useState(/** @type {EgitimViewMode} */ ('form'))
  const [saving, setSaving] = useState(false)
  const [submitOk, setSubmitOk] = useState(false)
  const [submitError, setSubmitError] = useState(/** @type {string | null} */ (null))
  const [sandboxBlueprint, setSandboxBlueprint] = useState(
    /** @type {import('../../lib/egitimLogRegistry').SandboxLayoutBlueprint | null} */ (null)
  )
  const [sandboxReadOnly, setSandboxReadOnly] = useState(true)
  const [sandboxEditingPlan, setSandboxEditingPlan] = useState(
    /** @type {Record<string, unknown> | null} */ (null)
  )

  const showCustomFocus = form.trainingFocus === EGITIM_CUSTOM

  const logisticsCount = [
    form.weaponsReady,
    form.ammoAllocated,
    form.ppeChecked,
    form.tcccKitReady,
  ].filter(Boolean).length

  const focusLabel = useMemo(() => {
    const opt = TRAINING_FOCUS_OPTIONS.find((o) => o.id === form.trainingFocus)
    if (form.trainingFocus === EGITIM_CUSTOM) return form.customTrainingFocus.trim() || 'Özel odak'
    return opt?.label ?? '—'
  }, [form.trainingFocus, form.customTrainingFocus])

  const difficultyLabel = useMemo(() => {
    return DIFFICULTY_LEVEL_OPTIONS.find((o) => o.id === form.difficultyLevel)?.label ?? '—'
  }, [form.difficultyLevel])

  const durationMin = Math.max(0, Math.round(invNum(form.estimatedDuration)))

  const submitBlockedReason = useMemo(() => {
    if (saving) return null
    if (!uid) return 'OTURUM_GEREKLİ'
    if (!form.trainingFocus) return 'EĞİTİM_ODAĞI_GEREKLİ'
    if (showCustomFocus && !form.customTrainingFocus.trim()) return 'ÖZEL_EĞİTİM_ODAĞI_GEREKLİ'
    if (!form.difficultyLevel) return 'ZORLUK_SEVİYESİ_GEREKLİ'
    if (!form.targetDate.trim()) return 'HEDEF_TARİH_GEREKLİ'
    if (!form.estimatedDuration.trim()) return 'TAHMİNİ_SÜRE_GEREKLİ'
    return null
  }, [
    saving,
    uid,
    form.trainingFocus,
    form.customTrainingFocus,
    form.difficultyLevel,
    form.targetDate,
    form.estimatedDuration,
    showCustomFocus,
  ])

  const canSubmit = submitBlockedReason == null

  const patch = useCallback((/** @type {Partial<typeof EGITIM_INITIAL_FORM>} */ next) => {
    setForm((f) => ({ ...f, ...next }))
    setSubmitOk(false)
    setSubmitError(null)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmit || !uid) return

    setSaving(true)
    setSubmitOk(false)
    setSubmitError(null)
    try {
      await submitEgitimPlan({
        addPlan,
        userId: uid,
        trainingFocus: form.trainingFocus,
        customTrainingFocus: form.customTrainingFocus,
        targetDate: form.targetDate,
        estimatedDuration: form.estimatedDuration,
        difficultyLevel: form.difficultyLevel,
        weaponsReady: form.weaponsReady,
        ammoAllocated: form.ammoAllocated,
        ppeChecked: form.ppeChecked,
        tcccKitReady: form.tcccKitReady,
        status: form.status,
        operationNote: form.operationNote,
      })
      setSubmitOk(true)
      setForm({ ...EGITIM_INITIAL_FORM })
    } catch (err) {
      const code = err && typeof err === 'object' && 'code' in err ? String(err.code) : ''
      const hint = code === 'permission-denied' ? ' · YETKİ / KURALLAR' : code ? ` · ${code}` : ''
      setSubmitError(`EĞİTİM_PLANI_BAŞARISIZ · YENİDEN_DENE${hint}`)
      if (import.meta.env.DEV && err && typeof err === 'object' && 'message' in err) {
        console.error('[EgitimTerminal]', err)
      }
    } finally {
      setSaving(false)
    }
  }

  const tabBtnClass = (active) =>
    `flex-1 rounded border py-2 font-mono-technical text-[9px] font-bold uppercase tracking-wider transition sm:flex-none sm:px-5 ${
      active
        ? 'border-[#00FF41]/60 bg-[#00FF41]/15 text-[#00FF41] shadow-[0_0_16px_rgba(0,255,65,0.25)]'
        : 'border-white/15 text-slate-500 hover:border-[#00FF41]/35 hover:text-slate-300'
    }`

  return (
    <div className="space-y-4">
      <TrainingSessionHeader />
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex w-fit items-center gap-2 rounded border border-[#ffb400]/50 bg-[#ffb400]/12 px-3 py-2 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-[#ffb400] transition hover:bg-[#ffb400]/20"
        >
          <ChevronLeft className="size-3.5" aria-hidden />
          KATEGORİLERE DÖN
        </button>

        <div
          className="flex w-full gap-2 rounded border border-[#00FF41]/25 bg-black/60 p-1 sm:w-auto"
          role="tablist"
          aria-label="Eğitim terminal görünümü"
        >
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'form'}
            onClick={() => setViewMode('form')}
            className={tabBtnClass(viewMode === 'form')}
          >
            EĞİTİM PLANLAMA FORMU
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'sandbox'}
            onClick={() => {
              setSandboxBlueprint(null)
              setSandboxEditingPlan(null)
              setSandboxReadOnly(false)
              setViewMode('sandbox')
            }}
            className={tabBtnClass(viewMode === 'sandbox')}
          >
            TAKTİK SANDBOX
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'registry'}
            onClick={() => setViewMode('registry')}
            className={tabBtnClass(viewMode === 'registry')}
          >
            PLANLANAN EĞİTİMLER TAKVİMİ
          </button>
        </div>
      </div>

      {viewMode === 'registry' ? (
        <EgitimLogRegistry
          trainingPlans={trainingPlans}
          loading={plansLoading}
          onOpenInSandbox={(blueprint, row) => {
            setSandboxBlueprint({
              objects: blueprint.objects.map((o) => ({ ...o })),
              tacticalArrows: blueprint.tacticalArrows.map((a) => ({ ...a })),
              drawnShapes: blueprint.drawnShapes.map((s) => ({ ...s })),
            })
            setSandboxEditingPlan(row)
            setSandboxReadOnly(false)
            setViewMode('sandbox')
          }}
        />
      ) : viewMode === 'sandbox' ? (
        !ready ? (
          <p className="font-mono-technical text-[10px] uppercase text-slate-500">OTURUM_GEREKLİ</p>
        ) : listenError ? (
          <p className="rounded border border-red-500/40 bg-red-950/25 px-3 py-2 font-mono-technical text-[10px] text-red-300">
            VERİ_KANALI_KESİLDİ · YENİDEN_DENE
          </p>
        ) : (
          <TacticalRangeSandbox
            userId={uid}
            addPlan={addPlan}
            updatePlan={updatePlan}
            editingPlanId={
              sandboxEditingPlan?.id != null ? String(sandboxEditingPlan.id) : null
            }
            editingPlan={sandboxEditingPlan}
            layoutBlueprint={sandboxBlueprint}
            readOnly={sandboxReadOnly}
          />
        )
      ) : !ready ? (
        <p className="font-mono-technical text-[10px] uppercase text-slate-500">OTURUM_GEREKLİ</p>
      ) : listenError ? (
        <p className="rounded border border-red-500/40 bg-red-950/25 px-3 py-2 font-mono-technical text-[10px] text-red-300">
          VERİ_KANALI_KESİLDİ · YENİDEN_DENE
        </p>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="grid gap-4 lg:grid-cols-2 lg:items-stretch lg:[&>*]:min-h-0"
        >
          <TacticalPanel className="relative flex h-full min-h-0 flex-col overflow-hidden border-[#00FF41]/20 bg-[#0a0a0a]/95 p-0">
            <span className="pointer-events-none absolute left-2 top-2 z-10 h-4 w-4 border-l border-t border-[#00FF41]/40" />
            <span className="pointer-events-none absolute right-2 top-2 z-10 h-4 w-4 border-r border-t border-[#00FF41]/40" />
            <p className="shrink-0 border-b border-[#00FF41]/15 bg-[#080808] px-4 py-2 font-mono-technical text-[9px] font-bold uppercase tracking-[0.28em] text-[#00FF41]/90">
              EĞİTİM KURULUM · TAKVİM METRİKLERİ
            </p>

            <div className="grid min-h-0 flex-1 grid-rows-[auto_auto_auto_auto_1fr] gap-3 p-4 sm:p-5">
              <EgitimSelectField
                legend="EĞİTİM ODAĞI"
                value={form.trainingFocus}
                options={TRAINING_FOCUS_OPTIONS}
                onChange={(v) => patch({ trainingFocus: v, customTrainingFocus: '' })}
                showCustom={showCustomFocus}
                customValue={form.customTrainingFocus}
                onCustomChange={(v) => patch({ customTrainingFocus: v })}
                customPlaceholder="Özel eğitim odağı / disiplin…"
              />
              <EgitimSelectField
                legend="ZORLUK / STRES SEVİYESİ"
                value={form.difficultyLevel}
                options={DIFFICULTY_LEVEL_OPTIONS}
                onChange={(v) => patch({ difficultyLevel: v })}
                showCustom={false}
                customValue=""
                onCustomChange={() => {}}
                customPlaceholder=""
              />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block space-y-1">
                  <span className={labelClass}>HEDEF TARİH / SAAT</span>
                  <input
                    type="datetime-local"
                    className={`${inputClass} tabular-nums`}
                    value={form.targetDate}
                    onChange={(e) => patch({ targetDate: e.target.value })}
                    required
                  />
                </label>
                <label className="block space-y-1">
                  <span className={labelClass}>TAHMİNİ SÜRE (DK)</span>
                  <input
                    type="number"
                    min={0}
                    step={5}
                    inputMode="numeric"
                    className={`${inputClass} tabular-nums`}
                    placeholder="120"
                    value={form.estimatedDuration}
                    onChange={(e) => patch({ estimatedDuration: e.target.value })}
                    required
                  />
                </label>
              </div>

              <div className="flex min-h-0 flex-col justify-end border border-[#00FF41]/20 bg-[#050805] p-3">
                <p className="mb-2 font-mono-technical text-[7px] font-bold uppercase tracking-[0.22em] text-[#00FF41]/75">
                  TAKTİK PLAN ÖZETİ
                </p>
                <div className="space-y-1.5 font-mono-technical text-[9px] uppercase leading-relaxed text-slate-400">
                  <p>
                    ODAK: <span className="text-slate-100">{focusLabel}</span>
                  </p>
                  <p>
                    ZORLUK: <span className="text-[#ffb400]">{difficultyLabel}</span>
                  </p>
                  <p>
                    SÜRE: <span className="text-[#5ec8ff]">{durationMin > 0 ? `${durationMin} dk` : '—'}</span>
                  </p>
                  <p>
                    LOJİSTİK: <span className="text-[#00FF41]">{logisticsCount} / 4</span>
                    {' · '}
                    DURUM: <span className="text-slate-200">PLANLANDI</span>
                  </p>
                </div>
                <div className="mt-3 border-t border-[#00FF41]/12 pt-3 max-lg:hidden">
                  <MatrixWireVisualizer
                    hubMode
                    variant="cartridge"
                    imageSrc={egitimImg}
                    imageAlt="Eğitim"
                    label=""
                  />
                </div>
              </div>
            </div>
          </TacticalPanel>

          <TacticalPanel className="relative flex h-full min-h-0 flex-col border-[#00FF41]/25 bg-[#0a0a0a]/95 p-0">
            <span className="pointer-events-none absolute bottom-2 left-2 z-10 h-4 w-4 border-b border-l border-[#00FF41]/40" />
            <span className="pointer-events-none absolute bottom-2 right-2 z-10 h-4 w-4 border-b border-r border-[#00FF41]/40" />
            <p className="shrink-0 border-b border-[#00FF41]/15 bg-[#080808] px-4 py-2 font-mono-technical text-[9px] font-bold uppercase tracking-[0.28em] text-white">
              LOJİSTİK · EĞİTİM HEDEFLERİ
            </p>

            <div className="grid min-h-0 flex-1 grid-rows-[auto_1fr] gap-3 p-4 sm:p-5">
              <div className="min-h-0 shrink-0 space-y-3">
                <p className="font-mono text-xs tracking-wider text-green-500/70">
                  // LOJİSTİK VE KAYNAK GEREKSİNİMLERİ
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className={toggleClass(form.weaponsReady)}>
                    <input
                      type="checkbox"
                      className="mt-1 size-4 shrink-0 accent-[#00FF41]"
                      checked={form.weaponsReady}
                      onChange={(e) => patch({ weaponsReady: e.target.checked })}
                    />
                    <span className="font-mono-technical text-sm leading-snug">
                      Silah Bakım / Emniyet Kontrolü
                    </span>
                  </label>
                  <label className={toggleClass(form.ammoAllocated)}>
                    <input
                      type="checkbox"
                      className="mt-1 size-4 shrink-0 accent-[#00FF41]"
                      checked={form.ammoAllocated}
                      onChange={(e) => patch({ ammoAllocated: e.target.checked })}
                    />
                    <span className="font-mono-technical text-sm leading-snug">
                      Mühimmat / Şarjör Tahsisi
                    </span>
                  </label>
                  <label className={toggleClass(form.ppeChecked)}>
                    <input
                      type="checkbox"
                      className="mt-1 size-4 shrink-0 accent-[#00FF41]"
                      checked={form.ppeChecked}
                      onChange={(e) => patch({ ppeChecked: e.target.checked })}
                    />
                    <span className="font-mono-technical text-sm leading-snug">
                      Balistik / Koruyucu Donanım
                    </span>
                  </label>
                  <label className={toggleClass(form.tcccKitReady)}>
                    <input
                      type="checkbox"
                      className="mt-1 size-4 shrink-0 accent-[#00FF41]"
                      checked={form.tcccKitReady}
                      onChange={(e) => patch({ tcccKitReady: e.target.checked })}
                    />
                    <span className="font-mono-technical text-sm leading-snug">
                      Sıhhiye / Acil Müdahale Çantası
                    </span>
                  </label>
                </div>
              </div>

              <div className="grid min-h-0 grid-rows-[auto_1fr] gap-1 border-t border-[#00FF41]/12 pt-2">
                <label
                  htmlFor="egitim-operation-note"
                  className="block shrink-0 font-mono text-xs tracking-wider text-green-500/70"
                >
                  // OPERASYON NOTU / EĞİTİM HEDEFLERİ
                </label>
                <textarea
                  id="egitim-operation-note"
                  className={operationNoteTextareaClass}
                  placeholder="Öğrenme çıktıları, KPI, koç notları, sahne güvenliği…"
                  value={form.operationNote}
                  onChange={(e) => patch({ operationNote: e.target.value })}
                  maxLength={2000}
                />
              </div>
            </div>
          </TacticalPanel>

          <div className="space-y-3 lg:col-span-2">
            {submitOk ? (
              <p className="rounded border border-[#00FF41]/40 bg-[#00FF41]/10 px-3 py-2 text-center font-mono-technical text-[9px] font-bold uppercase text-[#00FF41]">
                EĞİTİM_PLANI_AKTARILDI · TRAININGS
              </p>
            ) : null}
            {submitError ? (
              <p className="rounded border border-red-500/40 bg-red-950/25 px-3 py-2 text-center font-mono-technical text-[9px] font-bold uppercase text-red-300">
                {submitError}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2 rounded border border-[#00FF41]/15 bg-black/40 p-3">
              {submitBlockedReason && !saving ? (
                <p className="w-full rounded border border-amber-500/35 bg-amber-950/20 px-3 py-2 font-mono-technical text-[9px] font-bold uppercase text-amber-300/95">
                  {submitBlockedReason}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={saving || !canSubmit}
                className="w-full rounded border border-[#00FF41]/55 bg-[#00FF41]/12 py-2.5 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-[#00FF41] shadow-[0_0_20px_rgba(0,255,65,0.2)] hover:bg-[#00FF41]/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving ? 'AKTARILIYOR…' : 'EĞİTİM_PLANINI_ONAYLA'}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}
