import { useCallback, useMemo, useState } from 'react'
import { trainingNumberInputProps } from '../../lib/trainingNumberInput'
import { ChevronLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
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
import {
  formatEgitimOptionLabel,
  formatEgitimSubmitBlockedReason,
  formatEgitimSubmitError,
} from '../../lib/trainingDisplayText'
import EgitimLogRegistry from './EgitimLogRegistry'
import TacticalRangeSandbox from './TacticalRangeSandbox'
import IndividualTrainingSessionHeader from './IndividualTrainingSessionHeader'

const inputClass =
  'w-full rounded border border-accent/30 bg-app-bg px-2 py-2 font-mono-technical text-sm text-slate-100 outline-none placeholder:text-app-text/45 focus:border-accent/60'

const selectClass =
  'dossier-blood-select w-full rounded border border-accent/35 bg-app-bg py-2 pl-2 pr-8 font-mono-technical text-[11px] uppercase text-app-text outline-none focus:border-accent/60'

const operationNoteTextareaClass =
  'block h-full min-h-0 w-full resize-none rounded border border-accent/30 bg-app-bg px-2 py-2 font-mono-technical text-sm leading-relaxed text-slate-100 outline-none placeholder:text-app-text/45 focus:border-accent/60'

const labelClass = 'font-mono-technical text-[8px] font-bold uppercase tracking-[0.22em] text-app-text/55'

const toggleClass = (active) =>
  `flex cursor-pointer items-start gap-2.5 rounded border px-3 py-2.5 transition ${
    active
      ? 'border-accent/50 bg-accent/10 text-green-400'
      : 'border-white/10 text-zinc-300 hover:border-accent/25 hover:text-zinc-100'
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
 *   selectPlaceholder: string
 *   formatOption: (id: string, label: string) => string
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
  selectPlaceholder,
  formatOption,
}) {
  return (
    <fieldset className="space-y-2">
      <legend className={labelClass}>{legend}</legend>
      <select className={selectClass} value={value} onChange={(e) => onChange(e.target.value)} required>
        <option value="">{selectPlaceholder}</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {formatOption(o.id, o.label)}
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
const numberInputProps = trainingNumberInputProps()

export default function EgitimTerminal({
  trainingPlans,
  onBack,
  addPlan,
  updatePlan,
  ready,
  plansLoading = false,
  listenError,
}) {
  const { t } = useTranslation('training')
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
    if (form.trainingFocus === EGITIM_CUSTOM) {
      return (
        form.customTrainingFocus.trim() ||
        t('sectors.egitim.options.trainingFocus.customFocus')
      )
    }
    const opt = TRAINING_FOCUS_OPTIONS.find((o) => o.id === form.trainingFocus)
    return formatEgitimOptionLabel('trainingFocus', form.trainingFocus, opt?.label ?? '—')
  }, [form.trainingFocus, form.customTrainingFocus, t])

  const difficultyLabel = useMemo(() => {
    const opt = DIFFICULTY_LEVEL_OPTIONS.find((o) => o.id === form.difficultyLevel)
    return formatEgitimOptionLabel('difficultyLevel', form.difficultyLevel, opt?.label ?? '—')
  }, [form.difficultyLevel])

  const durationMin = Math.max(0, Math.round(invNum(form.estimatedDuration)))

  const durationSummary = useMemo(() => {
    if (durationMin <= 0) return '—'
    return t('sectors.egitim.history.durationMinutes', { count: durationMin })
  }, [durationMin, t])

  const submitBlockedReasonKey = useMemo(() => {
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

  const submitBlockedReason = formatEgitimSubmitBlockedReason(submitBlockedReasonKey)
  const canSubmit = submitBlockedReasonKey == null

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
      setSubmitError(formatEgitimSubmitError('SUBMIT_FAILED', code))
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
        ? 'border-accent/60 bg-accent/15 text-accent shadow-[0_0_24px_-8px_color-mix(in_srgb,var(--accent-color)_35%,transparent)]]'
        : 'border-white/15 text-app-text/55 hover:border-accent/35 hover:text-app-text/90'
    }`

  return (
    <div className="w-full min-w-0 space-y-4">
      <IndividualTrainingSessionHeader />
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex w-fit items-center gap-2 rounded border border-accent/50 bg-accent/12 px-3 py-2 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-accent transition hover:bg-accent/20"
        >
          <ChevronLeft className="size-3.5" aria-hidden />
          {t('common.terminal.backToCategories')}
        </button>

        <div
          className="flex w-full gap-2 rounded border border-accent/25 bg-black/60 p-1 sm:w-auto"
          role="tablist"
          aria-label={t('sectors.egitim.tabs.aria')}
        >
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'form'}
            onClick={() => setViewMode('form')}
            className={tabBtnClass(viewMode === 'form')}
          >
            {t('sectors.egitim.tabs.form')}
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
            {t('sectors.egitim.tabs.sandbox')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'registry'}
            onClick={() => setViewMode('registry')}
            className={tabBtnClass(viewMode === 'registry')}
          >
            {t('sectors.egitim.tabs.registry')}
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
          <p className="font-mono-technical text-[10px] uppercase text-app-text/55">
            {t('sectors.egitim.session.required')}
          </p>
        ) : listenError ? (
          <p className="rounded border border-red-500/40 bg-red-950/25 px-3 py-2 font-mono-technical text-[10px] text-red-300">
            {t('sectors.egitim.session.channelDisconnected')}
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
        <p className="font-mono-technical text-[10px] uppercase text-app-text/55">
          {t('sectors.egitim.session.required')}
        </p>
      ) : listenError ? (
        <p className="rounded border border-red-500/40 bg-red-950/25 px-3 py-2 font-mono-technical text-[10px] text-red-300">
          {t('sectors.egitim.session.channelDisconnected')}
        </p>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="grid gap-4 lg:grid-cols-2 lg:items-stretch lg:[&>*]:min-h-0"
        >
          <TacticalPanel className="relative flex h-full min-h-0 flex-col overflow-hidden border-accent/20 bg-app-bg/95 p-0">
            <span className="pointer-events-none absolute left-2 top-2 z-10 h-4 w-4 border-l border-t border-accent/40" />
            <span className="pointer-events-none absolute right-2 top-2 z-10 h-4 w-4 border-r border-t border-accent/40" />
            <p className="shrink-0 border-b border-accent/15 bg-app-bg px-4 py-2 font-mono-technical text-[9px] font-bold uppercase tracking-[0.28em] text-accent/90">
              {t('sectors.egitim.form.metricsPanel')}
            </p>

            <div className="grid min-h-0 flex-1 grid-rows-[auto_auto_auto_auto_1fr] gap-3 p-4 sm:p-5">
              <EgitimSelectField
                legend={t('sectors.egitim.form.trainingFocus')}
                value={form.trainingFocus}
                options={TRAINING_FOCUS_OPTIONS}
                onChange={(v) => patch({ trainingFocus: v, customTrainingFocus: '' })}
                showCustom={showCustomFocus}
                customValue={form.customTrainingFocus}
                onCustomChange={(v) => patch({ customTrainingFocus: v })}
                customPlaceholder={t('sectors.egitim.form.customTrainingFocusPlaceholder')}
                selectPlaceholder={t('sectors.egitim.form.selectPlaceholder')}
                formatOption={(id, label) => formatEgitimOptionLabel('trainingFocus', id, label)}
              />
              <EgitimSelectField
                legend={t('sectors.egitim.form.difficultyLevel')}
                value={form.difficultyLevel}
                options={DIFFICULTY_LEVEL_OPTIONS}
                onChange={(v) => patch({ difficultyLevel: v })}
                showCustom={false}
                customValue=""
                onCustomChange={() => {}}
                customPlaceholder=""
                selectPlaceholder={t('sectors.egitim.form.selectPlaceholder')}
                formatOption={(id, label) => formatEgitimOptionLabel('difficultyLevel', id, label)}
              />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block space-y-1">
                  <span className={labelClass}>{t('sectors.egitim.form.targetDate')}</span>
                  <input
                    type="datetime-local"
                    className={`${inputClass} tabular-nums`}
                    value={form.targetDate}
                    onChange={(e) => patch({ targetDate: e.target.value })}
                    required
                  />
                </label>
                <label className="block space-y-1">
                  <span className={labelClass}>{t('sectors.egitim.form.estimatedDuration')}</span>
                  <input
                    {...numberInputProps}
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

              <div className="flex min-h-0 flex-col justify-end border border-accent/20 bg-app-bg p-3">
                <p className="mb-2 font-mono-technical text-[7px] font-bold uppercase tracking-[0.22em] text-accent/75">
                  {t('sectors.egitim.form.tacticalPlanSummary')}
                </p>
                <div className="space-y-1.5 font-mono-technical text-[9px] uppercase leading-relaxed text-app-text/70">
                  <p>
                    {t('sectors.egitim.form.summaryFocus', { value: focusLabel })}
                  </p>
                  <p>
                    {t('sectors.egitim.form.summaryDifficulty', { value: difficultyLabel })}
                  </p>
                  <p>
                    {t('sectors.egitim.form.summaryDuration', { value: durationSummary })}
                  </p>
                  <p>
                    {t('sectors.egitim.form.summaryLogistics', { count: logisticsCount })}
                    {' · '}
                    {t('sectors.egitim.form.summaryStatus', {
                      status: t('sectors.egitim.form.statusPlanned'),
                    })}
                  </p>
                </div>
                <div className="mt-3 border-t border-accent/12 pt-3 max-lg:hidden">
                  <MatrixWireVisualizer
                    hubMode
                    variant="cartridge"
                    imageSrc={egitimImg}
                    imageAlt={t('sectors.egitim.form.imageAlt')}
                    label=""
                  />
                </div>
              </div>
            </div>
          </TacticalPanel>

          <TacticalPanel className="relative flex h-full min-h-0 flex-col border-accent/25 bg-app-bg/95 p-0">
            <span className="pointer-events-none absolute bottom-2 left-2 z-10 h-4 w-4 border-b border-l border-accent/40" />
            <span className="pointer-events-none absolute bottom-2 right-2 z-10 h-4 w-4 border-b border-r border-accent/40" />
            <p className="shrink-0 border-b border-accent/15 bg-app-bg px-4 py-2 font-mono-technical text-[9px] font-bold uppercase tracking-[0.28em] text-app-text">
              {t('sectors.egitim.form.logisticsPanel')}
            </p>

            <div className="grid min-h-0 flex-1 grid-rows-[auto_1fr] gap-3 p-4 sm:p-5">
              <div className="min-h-0 shrink-0 space-y-3">
                <p className="font-mono text-xs tracking-wider text-green-500/70">
                  {t('sectors.egitim.form.logisticsSection')}
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(
                    [
                      ['weaponsReady', form.weaponsReady],
                      ['ammoAllocated', form.ammoAllocated],
                      ['ppeChecked', form.ppeChecked],
                      ['tcccKitReady', form.tcccKitReady],
                    ]
                  ).map(([key, checked]) => (
                    <label key={key} className={toggleClass(checked)}>
                      <input
                        type="checkbox"
                        className="mt-1 size-4 shrink-0 accent-accent"
                        checked={checked}
                        onChange={(e) => patch({ [key]: e.target.checked })}
                      />
                      <span className="font-mono-technical text-sm leading-snug">
                        {t(`sectors.egitim.form.toggles.${key}`)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid min-h-0 grid-rows-[auto_1fr] gap-1 border-t border-accent/12 pt-2">
                <label
                  htmlFor="egitim-operation-note"
                  className="block shrink-0 font-mono text-xs tracking-wider text-green-500/70"
                >
                  {t('sectors.egitim.form.operationNoteSection')}
                </label>
                <textarea
                  id="egitim-operation-note"
                  className={operationNoteTextareaClass}
                  placeholder={t('sectors.egitim.form.operationNotePlaceholder')}
                  value={form.operationNote}
                  onChange={(e) => patch({ operationNote: e.target.value })}
                  maxLength={2000}
                />
              </div>
            </div>
          </TacticalPanel>

          <div className="space-y-3 lg:col-span-2">
            {submitOk ? (
              <p className="rounded border border-accent/40 bg-accent/10 px-3 py-2 text-center font-mono-technical text-[9px] font-bold uppercase text-accent">
                {t('sectors.egitim.messages.submitSuccess')}
              </p>
            ) : null}
            {submitError ? (
              <p className="rounded border border-red-500/40 bg-red-950/25 px-3 py-2 text-center font-mono-technical text-[9px] font-bold uppercase text-red-300">
                {submitError}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2 rounded border border-accent/15 bg-black/40 p-3">
              {submitBlockedReason && !saving ? (
                <p className="w-full rounded border border-amber-500/35 bg-amber-950/20 px-3 py-2 font-mono-technical text-[9px] font-bold uppercase text-amber-300/95">
                  {submitBlockedReason}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={saving || !canSubmit}
                className="w-full rounded border border-accent/55 bg-accent/12 py-2.5 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-accent shadow-[0_0_24px_-8px_color-mix(in_srgb,var(--accent-color)_35%,transparent)]] hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving ? t('sectors.egitim.form.submitting') : t('sectors.egitim.form.submit')}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}
