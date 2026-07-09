import { useCallback, useMemo, useState } from 'react'
import { AlertTriangle, ChevronLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import cqbImg from '../../assets/cqb.png'
import { useAuth } from '../../context/AuthContext'
import { submitCqbRecord } from '../../lib/cqbSubmit'
import {
  BREACHING_TYPE_OPTIONS,
  CQB_BREACHING_NA,
  CQB_CUSTOM,
  CQB_DOOR_OPEN,
  createCqbInitialForm,
  DOOR_STATE_OPTIONS,
  ENTRY_METHOD_OPTIONS,
  mergeTacticalErrorsForPayload,
  ROOM_TOPOLOGY_OPTIONS,
  TACTICAL_DECISION_OPTIONS,
  TACTICAL_ERROR_GROUPS,
  TEAM_SIZE_OPTIONS,
} from '../../lib/cqbOptions'
import { evaluateCqbSubmitBlockedReason, resolveCqbBreachingTypeForDoor } from '../../lib/cqbFormValidation'
import { invNum, invStr } from '../../lib/inventoryIlws'
import { trainingNumberInputProps } from '../../lib/trainingNumberInput'
import { calculateCqbSuccessPercent } from '../../lib/trainingSuccessScore'
import {
  formatCqbOptionLabel,
  formatCqbSubmitBlockedReason,
  formatCqbTacticalErrorGroupTitle,
  formatCqbTacticalErrorLabel,
} from '../../lib/trainingDisplayText'
import CqbLogRegistry from './CqbLogRegistry'
import OperatorInstructorRecordsEmbed from './OperatorInstructorRecordsEmbed'
import IndividualTrainingSessionHeader from './IndividualTrainingSessionHeader'
import TrainingTerminalLayout from './layout/TrainingTerminalLayout'
import TrainingTerminalPanel from './layout/TrainingTerminalPanel'
import TrainingMetricGrid, { TrainingMetricField } from './layout/TrainingMetricGrid'
import TrainingPhaseBlock from './layout/TrainingPhaseBlock'
import TrainingVisualStage from './layout/TrainingVisualStage'
import TrainingStatusBar from './layout/TrainingStatusBar'
import {
  errorCheckClass,
  inputClass,
  labelClass,
  selectClass,
  textareaClass,
} from './layout/trainingTerminalTokens'

const numberInputProps = trainingNumberInputProps()

/** @typedef {'form' | 'registry'} CqbViewMode */

/**
 * @param {{
 *   legend: string
 *   value: string
 *   options: import('../../lib/cqbOptions').CqbOption[]
 *   onChange: (value: string) => void
 *   showCustom: boolean
 *   customValue: string
 *   onCustomChange: (value: string) => void
 *   customPlaceholder: string
 * }} p
 */
function CqbSelectField({
  legend,
  value,
  options,
  onChange,
  showCustom,
  customValue,
  onCustomChange,
  customPlaceholder,
  selectPlaceholder,
}) {
  return (
    <fieldset className="space-y-2">
      <legend className={labelClass}>{legend}</legend>
      <select className={selectClass} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{selectPlaceholder}</option>
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
        />
      ) : null}
    </fieldset>
  )
}

/**
 * @param {{
 *   group: import('../../lib/cqbOptions').TacticalErrorGroup
 *   selected: string[]
 *   onToggle: (id: string) => void
 * }} p
 */
function CqbErrorPhaseCell({ group, selected, onToggle }) {
  return (
    <TrainingPhaseBlock title={formatCqbTacticalErrorGroupTitle(group.id)}>
      {group.items.map((preset) => {
        const checked = selected.includes(preset.id)
        return (
          <label key={preset.id} className={errorCheckClass(checked)}>
            <input
              type="checkbox"
              className="mt-1 size-4 shrink-0 accent-accent"
              checked={checked}
              onChange={() => onToggle(preset.id)}
            />
            <span className="font-mono-technical text-sm leading-snug">
              {formatCqbTacticalErrorLabel(preset.id)}
            </span>
          </label>
        )
      })}
    </TrainingPhaseBlock>
  )
}

/**
 * @param {{
 *   rangeLogs: Record<string, unknown>[]
 *   onBack: () => void
 *   addLog: (payload: Record<string, unknown>) => Promise<{ id: string }>
 *   ready: boolean
 *   logsLoading?: boolean
 *   listenError: Error | null
 * }} props
 */
export default function CqbTerminal({ rangeLogs, onBack, addLog, ready, logsLoading = false, listenError }) {
  const { t } = useTranslation('training')
  const { user } = useAuth()
  const uid = user?.uid ?? ''

  const [form, setForm] = useState(createCqbInitialForm)
  const [viewMode, setViewMode] = useState(/** @type {CqbViewMode} */ ('form'))
  const [saving, setSaving] = useState(false)
  const [submitOk, setSubmitOk] = useState(false)
  const [submitError, setSubmitError] = useState(/** @type {string | null} */ (null))
  const [countError, setCountError] = useState(/** @type {string | null} */ (null))
  const [customErrorDraft, setCustomErrorDraft] = useState('')

  const showCustomRoom = form.roomTopology === CQB_CUSTOM
  const showCustomEntry = form.entryMethod === CQB_CUSTOM
  const isDoorOpen = form.doorState === CQB_DOOR_OPEN
  const showCustomBreach = !isDoorOpen && form.breachingType === CQB_CUSTOM

  const threatNum = Math.max(0, Math.floor(invNum(form.threatCount)))
  const neutralizedNum = Math.max(0, Math.floor(invNum(form.neutralizedCount)))
  const neutralizedInvalid = neutralizedNum > threatNum

  const submitBlockedReasonKey = useMemo(
    () =>
      evaluateCqbSubmitBlockedReason(form, {
        uid,
        saving,
        threatNum,
        neutralizedNum,
      }),
    [
      form,
      uid,
      saving,
      threatNum,
      neutralizedNum,
    ],
  )

  const submitBlockedReason = formatCqbSubmitBlockedReason(submitBlockedReasonKey)
  const canSubmit = submitBlockedReasonKey == null

  const patch = useCallback((/** @type {Partial<ReturnType<typeof createCqbInitialForm>>} */ next) => {
    setForm((f) => ({ ...f, ...next }))
    setSubmitOk(false)
    setSubmitError(null)
    setCountError(null)
  }, [])

  const toggleTacticalError = (/** @type {string} */ errorId) => {
    setForm((f) => {
      const has = f.tacticalErrors.includes(errorId)
      const tacticalErrors = has
        ? f.tacticalErrors.filter((id) => id !== errorId)
        : [...f.tacticalErrors, errorId]
      return { ...f, tacticalErrors }
    })
    setSubmitOk(false)
  }

  const addCustomTacticalError = () => {
    const text = customErrorDraft.trim()
    if (!text) return
    setForm((f) => {
      if (f.customTacticalErrors.some((t) => t.toLowerCase() === text.toLowerCase())) return f
      return { ...f, customTacticalErrors: [...f.customTacticalErrors, text] }
    })
    setCustomErrorDraft('')
    setSubmitOk(false)
  }

  const removeCustomTacticalError = (/** @type {string} */ text) => {
    setForm((f) => ({
      ...f,
      customTacticalErrors: f.customTacticalErrors.filter((t) => t !== text),
    }))
    setSubmitOk(false)
  }

  const totalTacticalErrorCount = form.tacticalErrors.length + form.customTacticalErrors.length

  const previewSuccessPercent = useMemo(() => {
    const clearanceRaw = invStr(form.clearanceTimeMs).trim().replace(',', '.')
    const clearanceVal = clearanceRaw ? invNum(clearanceRaw) : null
    const clearingTimeSec =
      clearanceVal != null && Number.isFinite(clearanceVal) && clearanceVal > 0
        ? clearanceVal >= 1000
          ? clearanceVal / 1000
          : clearanceVal
        : null
    return calculateCqbSuccessPercent({
      threatCount: threatNum,
      neutralizedCount: neutralizedNum,
      clearingTimeSec,
      tacticalErrors: mergeTacticalErrorsForPayload(
        form.tacticalErrors,
        form.customTacticalErrors
      ),
    })
  }, [
    form.clearanceTimeMs,
    form.tacticalErrors,
    form.customTacticalErrors,
    threatNum,
    neutralizedNum,
  ])

  const onNeutralizedChange = (value) => {
    const threats = Math.max(0, Math.floor(invNum(form.threatCount)))
    let neutralized = Math.max(0, Math.floor(invNum(value)))
    let capped = false
    if (neutralized > threats) {
      neutralized = threats
      capped = true
    }
    patch({ neutralizedCount: String(neutralized) })
    setCountError(capped ? t('sectors.cqb.validation.neutralizedAutoCapped') : null)
  }

  const onThreatChange = (value) => {
    const threats = Math.max(0, Math.floor(invNum(value)))
    let neutralized = Math.max(0, Math.floor(invNum(form.neutralizedCount)))
    if (neutralized > threats) neutralized = threats
    patch({ threatCount: value, neutralizedCount: String(neutralized) })
    setCountError(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmit || !uid) return

    setSaving(true)
    setSubmitOk(false)
    setSubmitError(null)
    try {
      await submitCqbRecord({
        addLog,
        userId: uid,
        roomTopology: form.roomTopology,
        customRoomTopology: form.customRoomTopology,
        entryMethod: form.entryMethod,
        customEntryMethod: form.customEntryMethod,
        breachingType: isDoorOpen ? CQB_BREACHING_NA : form.breachingType,
        customBreachingType: isDoorOpen ? '' : form.customBreachingType,
        doorState: form.doorState,
        teamSize: form.teamSize,
        threatCount: threatNum,
        neutralizedCount: neutralizedNum,
        clearanceTimeMs: form.clearanceTimeMs,
        accuracyScore: form.accuracyScore,
        safetyViolations: form.safetyViolations,
        tacticalDecision: form.tacticalDecision,
        tacticalErrors: mergeTacticalErrorsForPayload(
          form.tacticalErrors,
          form.customTacticalErrors
        ),
        operationNote: form.operationNote,
      })
      setSubmitOk(true)
      setCustomErrorDraft('')
      setForm(createCqbInitialForm())
    } catch (err) {
      const code = err && typeof err === 'object' && 'code' in err ? String(err.code) : ''
      const message =
        err && typeof err === 'object' && 'message' in err && typeof err.message === 'string'
          ? err.message
          : ''
      const hint =
        code === 'permission-denied'
          ? t('sectors.cqb.messages.permissionDenied')
          : code
            ? ` · ${code}`
            : ''
      setSubmitError(t('sectors.cqb.messages.submitFailed', { hint }))
      if (import.meta.env.DEV && message) {
        console.error('[CqbTerminal]', err)
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
    <div className="space-y-4">
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
          aria-label={t('sectors.cqb.tabs.aria')}
        >
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'form'}
            onClick={() => setViewMode('form')}
            className={tabBtnClass(viewMode === 'form')}
          >
            {t('sectors.cqb.tabs.form')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'registry'}
            onClick={() => setViewMode('registry')}
            className={tabBtnClass(viewMode === 'registry')}
          >
            {t('sectors.cqb.tabs.registry')}
          </button>
        </div>
      </div>

      {viewMode === 'registry' ? (
        <CqbLogRegistry rangeLogs={rangeLogs} loading={logsLoading} />
      ) : !ready ? (
        <p className="font-mono-technical text-[10px] uppercase text-app-text/55">
          {t('sectors.cqb.validation.sessionRequired')}
        </p>
      ) : listenError ? (
        <p className="rounded border border-red-500/40 bg-red-950/25 px-3 py-2 font-mono-technical text-[10px] text-red-300">
          {t('sectors.cqb.validation.channelDisconnected')}
        </p>
      ) : (
        <TrainingTerminalLayout
          onSubmit={handleSubmit}
          noValidate
          left={
            <TrainingTerminalPanel title={t('sectors.cqb.panels.setup')}>
              <CqbSelectField
                legend={t('sectors.cqb.form.roomTopology')}
                value={form.roomTopology}
                options={ROOM_TOPOLOGY_OPTIONS.map((o) => ({
                  id: o.id,
                  label: formatCqbOptionLabel('roomTopology', o.id, o.label),
                }))}
                onChange={(v) => patch({ roomTopology: v, customRoomTopology: '' })}
                showCustom={showCustomRoom}
                customValue={form.customRoomTopology}
                onCustomChange={(v) => patch({ customRoomTopology: v })}
                customPlaceholder={t('sectors.cqb.form.customRoomTopology')}
                selectPlaceholder={t('sectors.cqb.form.selectPlaceholder')}
              />
              <CqbSelectField
                legend={t('sectors.cqb.form.entryMethod')}
                value={form.entryMethod}
                options={ENTRY_METHOD_OPTIONS.map((o) => ({
                  id: o.id,
                  label: formatCqbOptionLabel('entryMethod', o.id, o.label),
                }))}
                onChange={(v) => patch({ entryMethod: v, customEntryMethod: '' })}
                showCustom={showCustomEntry}
                customValue={form.customEntryMethod}
                onCustomChange={(v) => patch({ customEntryMethod: v })}
                customPlaceholder={t('sectors.cqb.form.customEntryMethod')}
                selectPlaceholder={t('sectors.cqb.form.selectPlaceholder')}
              />
              <CqbSelectField
                legend={t('sectors.cqb.form.doorState')}
                value={form.doorState}
                options={DOOR_STATE_OPTIONS.map((o) => ({
                  id: o.id,
                  label: formatCqbOptionLabel('doorState', o.id, o.label),
                }))}
                onChange={(v) =>
                  patch({
                    doorState: v,
                    breachingType: resolveCqbBreachingTypeForDoor(v, form.breachingType),
                    customBreachingType: v === CQB_DOOR_OPEN ? '' : form.customBreachingType,
                  })
                }
                showCustom={false}
                customValue=""
                onCustomChange={() => {}}
                customPlaceholder=""
                selectPlaceholder={t('sectors.cqb.form.selectPlaceholder')}
              />
              {isDoorOpen ? (
                <fieldset className="space-y-2">
                  <legend className={labelClass}>{t('sectors.cqb.form.breachingType')}</legend>
                  <select className={selectClass} value={CQB_BREACHING_NA} disabled>
                    <option value={CQB_BREACHING_NA}>
                      {formatCqbOptionLabel('breachingType', CQB_BREACHING_NA, '—')}
                    </option>
                  </select>
                  <p className="font-mono-technical text-[8px] uppercase tracking-wide text-app-text/55">
                    {t('sectors.cqb.form.breachingOpenDoorHint')}
                  </p>
                </fieldset>
              ) : (
                <CqbSelectField
                  legend={t('sectors.cqb.form.breachingType')}
                  value={form.breachingType}
                  options={BREACHING_TYPE_OPTIONS.map((o) => ({
                    id: o.id,
                    label: formatCqbOptionLabel('breachingType', o.id, o.label),
                  }))}
                  onChange={(v) => patch({ breachingType: v, customBreachingType: '' })}
                  showCustom={showCustomBreach}
                  customValue={form.customBreachingType}
                  onCustomChange={(v) => patch({ customBreachingType: v })}
                  customPlaceholder={t('sectors.cqb.form.customBreachingType')}
                  selectPlaceholder={t('sectors.cqb.form.selectPlaceholder')}
                />
              )}
              <fieldset className="space-y-2">
                <legend className={labelClass}>{t('sectors.cqb.form.teamSize')}</legend>
                <select
                  className={selectClass}
                  value={form.teamSize}
                  onChange={(e) => patch({ teamSize: e.target.value })}
                >
                  <option value="">{t('sectors.cqb.form.teamPlaceholder')}</option>
                  {TEAM_SIZE_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>
                      {formatCqbOptionLabel('teamSize', o.id, o.label)}
                    </option>
                  ))}
                </select>
              </fieldset>
              <TrainingMetricGrid
                footer={
                  countError ? (
                    <p className="mt-2 flex items-center gap-1.5 font-mono-technical text-[8px] font-bold uppercase text-red-400">
                      <AlertTriangle className="size-3 shrink-0" aria-hidden />
                      {countError}
                    </p>
                  ) : null
                }
              >
                <TrainingMetricField label={t('sectors.cqb.form.threatCount')}>
                  <input
                    {...numberInputProps}
                    type="number"
                    min={0}
                    step={1}
                    className={`${inputClass} tabular-nums`}
                    value={form.threatCount}
                    onChange={(e) => onThreatChange(e.target.value)}
                  />
                </TrainingMetricField>
                <TrainingMetricField label={t('sectors.cqb.form.neutralizedCount')}>
                  <input
                    {...numberInputProps}
                    type="number"
                    min={0}
                    step={1}
                    className={
                      neutralizedInvalid || countError
                        ? 'w-full rounded border border-red-500/55 bg-red-950/20 px-2 py-2 font-mono-technical text-sm text-red-200 outline-none tabular-nums'
                        : `${inputClass} tabular-nums`
                    }
                    value={form.neutralizedCount}
                    onChange={(e) => onNeutralizedChange(e.target.value)}
                  />
                </TrainingMetricField>
                <TrainingMetricField label={t('sectors.cqb.form.clearanceTime')}>
                  <input
                    {...numberInputProps}
                    type="number"
                    min={0.01}
                    step={0.01}
                    inputMode="decimal"
                    className={`${inputClass} tabular-nums`}
                    placeholder="30.00"
                    value={form.clearanceTimeMs}
                    onChange={(e) => patch({ clearanceTimeMs: e.target.value })}
                  />
                </TrainingMetricField>
                <TrainingMetricField label={t('sectors.cqb.form.accuracyScore')}>
                  <input
                    {...numberInputProps}
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    inputMode="decimal"
                    className={`${inputClass} tabular-nums`}
                    placeholder="85"
                    value={form.accuracyScore}
                    onChange={(e) => patch({ accuracyScore: e.target.value })}
                  />
                </TrainingMetricField>
                <TrainingMetricField label={t('sectors.cqb.form.safetyViolations')}>
                  <input
                    {...numberInputProps}
                    type="number"
                    min={0}
                    step={1}
                    className={`${inputClass} tabular-nums`}
                    value={form.safetyViolations}
                    onChange={(e) => patch({ safetyViolations: e.target.value })}
                  />
                </TrainingMetricField>
                <TrainingMetricField label={t('sectors.cqb.form.tacticalDecision')} className="sm:col-span-1">
                  <select
                    className={selectClass}
                    value={form.tacticalDecision}
                    onChange={(e) => patch({ tacticalDecision: e.target.value })}
                  >
                    <option value="">{t('sectors.cqb.form.decisionPlaceholder')}</option>
                    {TACTICAL_DECISION_OPTIONS.map((o) => (
                      <option key={o.id} value={o.id}>
                        {formatCqbOptionLabel('tacticalDecision', o.id, o.label)}
                      </option>
                    ))}
                  </select>
                </TrainingMetricField>
              </TrainingMetricGrid>
              <TrainingVisualStage
                imageSrc={cqbImg}
                imageAlt={t('sectors.cqb.preview.imageAlt')}
                stats={
                  <>
                    <p>
                      {t('sectors.cqb.preview.threatNeutralized', {
                        threats: threatNum,
                        neutralized: neutralizedNum,
                      })}
                    </p>
                    <p className="mt-0.5 text-accent">
                      {t('sectors.cqb.preview.errorsMarked', { count: totalTacticalErrorCount })}
                    </p>
                  </>
                }
              />
            </TrainingTerminalPanel>
          }
          right={
            <TrainingTerminalPanel
              title={t('sectors.cqb.panels.tacticalErrors')}
              titleClassName="text-app-text"
              corners="bottom"
              panelClassName="relative flex min-h-0 flex-col border-accent/25 bg-app-bg/95 p-0"
              bodyClassName="flex min-h-0 flex-1 flex-col space-y-4 p-4 sm:p-5"
            >
              <fieldset className="flex min-h-0 flex-1 flex-col space-y-3 overflow-hidden rounded border border-accent/20 bg-black/40 p-3">
                <legend className={`${labelClass} text-accent/80`}>
                  {t('sectors.cqb.panels.errorsByPhase')}
                </legend>

                {totalTacticalErrorCount > 0 ? (
                  <div className="flex flex-wrap gap-1.5 border-b border-accent/10 pb-2">
                    {form.tacticalErrors.map((id) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => toggleTacticalError(id)}
                          className="rounded border border-accent/45 bg-accent/10 px-2 py-0.5 font-mono-technical text-[7px] uppercase text-accent hover:bg-accent/20"
                        >
                          {formatCqbTacticalErrorLabel(id)} ×
                        </button>
                      ))}
                    {form.customTacticalErrors.map((text) => (
                      <button
                        key={text}
                        type="button"
                        onClick={() => removeCustomTacticalError(text)}
                        className="rounded border border-amber-500/45 bg-amber-950/30 px-2 py-0.5 font-mono-technical text-[7px] uppercase text-amber-200 hover:bg-amber-500/15"
                      >
                        {text} ×
                      </button>
                    ))}
                  </div>
                ) : null}

                <div className="grid min-h-0 flex-1 grid-cols-2 gap-4 overflow-y-auto pr-0.5 sm:max-h-[min(32rem,42vh)] lg:max-h-[min(36rem,48vh)]">
                  {TACTICAL_ERROR_GROUPS.map((group) => (
                    <CqbErrorPhaseCell
                      key={group.id}
                      group={group}
                      selected={form.tacticalErrors}
                      onToggle={toggleTacticalError}
                    />
                  ))}
                </div>
              </fieldset>

              <div className="shrink-0 rounded border border-amber-500/25 bg-amber-950/15 p-2.5">
                <p className="mb-2 font-mono-technical text-[7px] font-bold uppercase tracking-[0.18em] text-amber-400/90">
                  {t('sectors.cqb.errors.customTitle')}
                </p>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="text"
                    className={`${inputClass} min-w-0 flex-1`}
                    placeholder={t('sectors.cqb.errors.customPlaceholder')}
                    value={customErrorDraft}
                    onChange={(e) => setCustomErrorDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addCustomTacticalError()
                      }
                    }}
                    maxLength={120}
                  />
                  <button
                    type="button"
                    onClick={addCustomTacticalError}
                    disabled={!customErrorDraft.trim()}
                    className="shrink-0 rounded border border-amber-500/50 bg-amber-500/10 px-3 py-2 font-mono-technical text-[8px] font-bold uppercase text-amber-200 hover:bg-amber-500/20 disabled:opacity-40"
                  >
                    {t('sectors.cqb.errors.addError')}
                  </button>
                </div>
              </div>

              <label className="mt-auto block shrink-0 space-y-1">
                <span className={labelClass}>{t('sectors.cqb.form.operationNote')}</span>
                <textarea
                  className={`${textareaClass} min-h-[4.5rem]`}
                  placeholder={t('sectors.cqb.form.operationNotePlaceholder')}
                  value={form.operationNote}
                  onChange={(e) => patch({ operationNote: e.target.value })}
                  rows={3}
                  maxLength={2000}
                />
              </label>
            </TrainingTerminalPanel>
          }
          footer={
            <TrainingStatusBar
              successPercent={previewSuccessPercent}
              submitBlockedReason={submitBlockedReason}
              saving={saving}
              canSubmit={canSubmit}
              submitLabel={t('sectors.cqb.form.submit')}
              successMessage={submitOk ? t('sectors.cqb.messages.submitSuccess') : null}
              errorMessage={submitError}
            />
          }
        />
      )}

      <OperatorInstructorRecordsEmbed discipline="cqb" />
    </div>
  )
}
