import { useCallback, useMemo, useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import fofImg from '../../assets/fof.png'
import MatrixWireVisualizer from '../armory/MatrixWireVisualizer'
import TacticalPanel from '../ui/TacticalPanel'
import { useAuth } from '../../context/AuthContext'
import { FOF_INITIAL_FORM } from '../../lib/fofLogPayload'
import { FOF_TACTICAL_ERROR_OPTIONS } from '../../lib/fofTacticalErrors'
import { submitFofRecord } from '../../lib/fofSubmit'
import {
  ENGAGEMENT_TYPE_OPTIONS,
  FOF_CUSTOM,
  SCENARIO_TYPE_OPTIONS,
  SIM_SYSTEM_OPTIONS,
} from '../../lib/fofOptions'
import { invNum, invStr } from '../../lib/inventoryIlws'
import { calculateFofSuccessPercent } from '../../lib/trainingSuccessScore'
import {
  formatFofOptionLabel,
  formatFofSubmitBlockedReason,
  formatFofTacticalErrorLabel,
} from '../../lib/trainingDisplayText'
import FofLogRegistry from './FofLogRegistry'
import OperatorInstructorRecordsEmbed from './OperatorInstructorRecordsEmbed'
import SuccessScorePreview from './SuccessScorePreview'
import IndividualTrainingSessionHeader from './IndividualTrainingSessionHeader'

const inputClass =
  'w-full rounded border border-accent/30 bg-app-bg px-2 py-2 font-mono-technical text-sm text-slate-100 outline-none placeholder:text-app-text/45 focus:border-accent/60'

const selectClass =
  'dossier-blood-select w-full rounded border border-accent/35 bg-app-bg py-2 pl-2 pr-8 font-mono-technical text-[11px] uppercase text-app-text outline-none focus:border-accent/60'

const textareaClass =
  'w-full min-h-[6rem] resize-y rounded border border-accent/30 bg-app-bg px-2 py-2 font-mono-technical text-sm leading-relaxed text-slate-100 outline-none placeholder:text-app-text/45 focus:border-accent/60'

const labelClass = 'font-mono-technical text-[8px] font-bold uppercase tracking-[0.22em] text-app-text/55'

const toggleClass = (active) =>
  `flex cursor-pointer items-start gap-2.5 rounded border px-3 py-2.5 transition ${
    active
      ? 'border-accent/50 bg-accent/10 text-green-400'
      : 'border-white/10 text-zinc-300 hover:border-accent/25 hover:text-zinc-100'
  }`

/** @typedef {'form' | 'registry'} FofViewMode */

/**
 * @param {{
 *   legend: string
 *   value: string
 *   options: import('../../lib/fofOptions').FofOption[]
 *   onChange: (value: string) => void
 *   showCustom: boolean
 *   customValue: string
 *   onCustomChange: (value: string) => void
 *   customPlaceholder: string
 * }} p
 */
function FofSelectField({
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
      <select className={selectClass} value={value} onChange={(e) => onChange(e.target.value)} required>
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
          required
        />
      ) : null}
    </fieldset>
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
export default function FofTerminal({ rangeLogs, onBack, addLog, ready, logsLoading = false, listenError }) {
  const { t } = useTranslation('training')
  const { user } = useAuth()
  const uid = user?.uid ?? ''

  const [form, setForm] = useState(FOF_INITIAL_FORM)
  const [viewMode, setViewMode] = useState(/** @type {FofViewMode} */ ('form'))
  const [saving, setSaving] = useState(false)
  const [submitOk, setSubmitOk] = useState(false)
  const [submitError, setSubmitError] = useState(/** @type {string | null} */ (null))

  const showCustomScenario = form.scenarioType === FOF_CUSTOM
  const showCustomSim = form.simSystem === FOF_CUSTOM

  const opforNum = Math.max(0, Math.floor(invNum(form.opforCount)))
  const hitsTakenNum = Math.max(0, Math.floor(invNum(form.hitsTaken)))
  const lethalNum = Math.max(0, Math.floor(invNum(form.lethalHitsDelivered)))
  const nonLethalNum = Math.max(0, Math.floor(invNum(form.nonLethalHitsDelivered)))
  const friendlyCasNum = Math.max(0, Math.floor(invNum(form.friendlyCasualties)))

  const durationSec = useMemo(() => {
    const text = invStr(form.scenarioDuration).trim().replace(',', '.')
    if (!text) return null
    const n = invNum(text)
    return Number.isFinite(n) && n > 0 ? n : null
  }, [form.scenarioDuration])

  const engagementRoundsNum = Math.max(0, Math.floor(invNum(form.engagementRounds)))

  const submitBlockedReasonKey = useMemo(() => {
    if (saving) return null
    if (!uid) return { key: 'sessionRequired' }
    if (!form.scenarioType) return { key: 'scenarioRequired' }
    if (showCustomScenario && !form.customScenarioType.trim()) return { key: 'customScenarioRequired' }
    if (!form.simSystem) return { key: 'simSystemRequired' }
    if (showCustomSim && !form.customSimSystem.trim()) return { key: 'customSimRequired' }
    if (durationSec == null) return { key: 'durationRequired' }
    if (engagementRoundsNum <= 0) return { key: 'roundsRequired' }
    if (!form.engagementType) return { key: 'engagementRequired' }
    const accuracyRaw = invStr(form.decisionAccuracy).trim().replace(',', '.')
    const accuracy = accuracyRaw ? invNum(accuracyRaw) : NaN
    if (!accuracyRaw || !Number.isFinite(accuracy) || accuracy < 0 || accuracy > 100) {
      return { key: 'accuracyRequired' }
    }
    if (!form.debriefNotes.trim()) return { key: 'debriefRequired' }
    return null
  }, [
    saving,
    uid,
    form.scenarioType,
    form.customScenarioType,
    form.simSystem,
    form.customSimSystem,
    showCustomScenario,
    showCustomSim,
    durationSec,
    engagementRoundsNum,
    form.engagementType,
    form.decisionAccuracy,
    form.debriefNotes,
  ])

  const submitBlockedReason = formatFofSubmitBlockedReason(submitBlockedReasonKey)
  const canSubmit = submitBlockedReasonKey == null

  const hitTakenPreview = useMemo(() => {
    const delivered = lethalNum + nonLethalNum
    return `${delivered}:${hitsTakenNum}`
  }, [lethalNum, nonLethalNum, hitsTakenNum])

  const previewSuccessPercent = useMemo(() => {
    const coverRaw = invStr(form.coverUtilizationPercent).trim().replace(',', '.')
    const coverNum = coverRaw ? invNum(coverRaw) : null
    const cover =
      coverNum != null && Number.isFinite(coverNum) && coverNum >= 0 ? coverNum : null
    const blueOnBlue =
      form.blueOnBlue || (Array.isArray(form.tacticalErrors) && form.tacticalErrors.includes('blue_on_blue'))
    return calculateFofSuccessPercent({
      blueOnBlue,
      hitsTaken: hitsTakenNum,
      opforCount: opforNum,
      lethalHitsDelivered: lethalNum,
      nonLethalHitsDelivered: nonLethalNum,
      engagementRounds: engagementRoundsNum,
      coverUtilizationPercent: cover,
      selfTcccApplied: form.selfTcccApplied,
      tacticalErrors: form.tacticalErrors,
    })
  }, [
    form.blueOnBlue,
    form.tacticalErrors,
    form.coverUtilizationPercent,
    form.selfTcccApplied,
    hitsTakenNum,
    opforNum,
    lethalNum,
    nonLethalNum,
    engagementRoundsNum,
  ])

  const toggleFofTacticalError = (/** @type {string} */ errorId) => {
    setForm((f) => {
      const prev = Array.isArray(f.tacticalErrors) ? f.tacticalErrors : []
      const has = prev.includes(errorId)
      const tacticalErrors = has ? prev.filter((id) => id !== errorId) : [...prev, errorId]
      const blueOnBlue =
        errorId === 'blue_on_blue' ? !has : tacticalErrors.includes('blue_on_blue')
      return { ...f, tacticalErrors, blueOnBlue }
    })
    setSubmitOk(false)
    setSubmitError(null)
  }

  const patch = useCallback((/** @type {Partial<typeof FOF_INITIAL_FORM>} */ next) => {
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
      await submitFofRecord({
        addLog,
        userId: uid,
        scenarioType: form.scenarioType,
        customScenarioType: form.customScenarioType,
        simSystem: form.simSystem,
        customSimSystem: form.customSimSystem,
        engagementType: form.engagementType,
        opforCount: opforNum,
        scenarioDuration: form.scenarioDuration,
        engagementRounds: engagementRoundsNum,
        tacticalErrors: form.tacticalErrors,
        coverUtilizationPercent: form.coverUtilizationPercent,
        hitsTaken: hitsTakenNum,
        lethalHitsDelivered: lethalNum,
        nonLethalHitsDelivered: nonLethalNum,
        timeToFirstEngagement: form.timeToFirstEngagement,
        friendlyCasualties: friendlyCasNum,
        decisionAccuracy: form.decisionAccuracy,
        blueOnBlue: form.blueOnBlue,
        selfTcccApplied: form.selfTcccApplied,
        operationNote: form.operationNote,
        debriefNotes: form.debriefNotes,
      })
      setSubmitOk(true)
      setForm({ ...FOF_INITIAL_FORM })
    } catch (err) {
      const code = err && typeof err === 'object' && 'code' in err ? String(err.code) : ''
      const message =
        err && typeof err === 'object' && 'message' in err && typeof err.message === 'string'
          ? err.message
          : ''
      const hint =
        code === 'permission-denied'
          ? t('sectors.fof.messages.permissionDenied')
          : code
            ? ` · ${code}`
            : ''
      setSubmitError(t('sectors.fof.messages.submitFailed', { hint }))
      if (import.meta.env.DEV && message) {
        console.error('[FofTerminal]', err)
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
          aria-label={t('sectors.fof.tabs.aria')}
        >
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'form'}
            onClick={() => setViewMode('form')}
            className={tabBtnClass(viewMode === 'form')}
          >
            {t('sectors.fof.tabs.form')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'registry'}
            onClick={() => setViewMode('registry')}
            className={tabBtnClass(viewMode === 'registry')}
          >
            {t('sectors.fof.tabs.registry')}
          </button>
        </div>
      </div>

      {viewMode === 'registry' ? (
        <FofLogRegistry rangeLogs={rangeLogs} loading={logsLoading} />
      ) : !ready ? (
        <p className="font-mono-technical text-[10px] uppercase text-app-text/55">
          {t('sectors.fof.validation.sessionRequired')}
        </p>
      ) : listenError ? (
        <p className="rounded border border-red-500/40 bg-red-950/25 px-3 py-2 font-mono-technical text-[10px] text-red-300">
          {t('sectors.fof.validation.channelDisconnected')}
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-2 lg:items-stretch">
          <TacticalPanel className="relative flex flex-col overflow-hidden border-accent/20 bg-app-bg/95 p-0">
            <span className="pointer-events-none absolute left-2 top-2 z-10 h-4 w-4 border-l border-t border-accent/40" />
            <span className="pointer-events-none absolute right-2 top-2 z-10 h-4 w-4 border-r border-t border-accent/40" />
            <p className="border-b border-accent/15 bg-app-bg px-4 py-2 font-mono-technical text-[9px] font-bold uppercase tracking-[0.28em] text-accent/90">
              {t('sectors.fof.panels.setup')}
            </p>

            <div className="flex flex-1 flex-col space-y-4 p-4 sm:p-5">
              <FofSelectField
                legend={t('sectors.fof.form.scenarioType')}
                value={form.scenarioType}
                options={SCENARIO_TYPE_OPTIONS.map((o) => ({
                  id: o.id,
                  label: formatFofOptionLabel('scenarioType', o.id, o.label),
                }))}
                onChange={(v) => patch({ scenarioType: v, customScenarioType: '' })}
                showCustom={showCustomScenario}
                customValue={form.customScenarioType}
                onCustomChange={(v) => patch({ customScenarioType: v })}
                customPlaceholder={t('sectors.fof.form.customScenarioType')}
                selectPlaceholder={t('sectors.fof.form.selectPlaceholder')}
              />
              <FofSelectField
                legend={t('sectors.fof.form.simSystem')}
                value={form.simSystem}
                options={SIM_SYSTEM_OPTIONS.map((o) => ({
                  id: o.id,
                  label: formatFofOptionLabel('simSystem', o.id, o.label),
                }))}
                onChange={(v) => patch({ simSystem: v, customSimSystem: '' })}
                showCustom={showCustomSim}
                customValue={form.customSimSystem}
                onCustomChange={(v) => patch({ customSimSystem: v })}
                customPlaceholder={t('sectors.fof.form.customSimSystem')}
                selectPlaceholder={t('sectors.fof.form.selectPlaceholder')}
              />
              <fieldset className="space-y-2">
                <legend className={labelClass}>{t('sectors.fof.form.engagementType')} *</legend>
                <select
                  className={selectClass}
                  value={form.engagementType}
                  onChange={(e) => patch({ engagementType: e.target.value })}
                  required
                >
                  <option value="">{t('sectors.fof.form.engagementPlaceholder')}</option>
                  {ENGAGEMENT_TYPE_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>
                      {formatFofOptionLabel('engagementType', o.id, o.label)}
                    </option>
                  ))}
                </select>
              </fieldset>

              <div className="rounded border border-accent/20 bg-black/40 p-3">
                <p className="mb-3 font-mono-technical text-[7px] font-bold uppercase tracking-[0.2em] text-accent/80">
                  {t('common.terminal.fieldMetrics')}
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <label className="block space-y-1">
                    <span className={labelClass}>{t('sectors.fof.form.opforCount')}</span>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      className={`${inputClass} tabular-nums`}
                      value={form.opforCount}
                      onChange={(e) => patch({ opforCount: e.target.value })}
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className={labelClass}>{t('sectors.fof.form.scenarioDuration')} *</span>
                    <input
                      type="number"
                      min={0.01}
                      step={0.01}
                      inputMode="decimal"
                      required
                      className={`${inputClass} tabular-nums`}
                      placeholder="120"
                      value={form.scenarioDuration}
                      onChange={(e) => patch({ scenarioDuration: e.target.value })}
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className={labelClass}>{t('sectors.fof.form.engagementRounds')} *</span>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      required
                      className={`${inputClass} tabular-nums`}
                      placeholder="24"
                      value={form.engagementRounds}
                      onChange={(e) => patch({ engagementRounds: e.target.value })}
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className={labelClass}>{t('sectors.fof.form.decisionAccuracy')} *</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      inputMode="decimal"
                      required
                      className={`${inputClass} tabular-nums`}
                      placeholder="82"
                      value={form.decisionAccuracy}
                      onChange={(e) => patch({ decisionAccuracy: e.target.value })}
                    />
                  </label>
                </div>
                <p className="mt-2 font-mono-technical text-[7px] uppercase text-app-text/55">
                  {t('sectors.fof.form.hitTakenRatioPreview', { ratio: hitTakenPreview })}
                </p>
              </div>

              <div className="mt-auto hidden border-t border-accent/12 pt-3 lg:block">
                <MatrixWireVisualizer hubMode variant="cartridge" imageSrc={fofImg} imageAlt={t('sectors.fof.preview.imageAlt')} label="" />
                <div className="mt-2 font-mono-technical text-[8px] uppercase text-app-text/55">
                  <p>
                    {t('sectors.fof.preview.opfor', { count: opforNum })}
                    {' · '}
                    {t('sectors.fof.preview.hitsTaken', { count: hitsTakenNum })}
                  </p>
                  <p className="mt-0.5 text-[#5ec8ff]">
                    {t('sectors.fof.preview.lethalNonLethal', {
                      lethal: lethalNum,
                      nonLethal: nonLethalNum,
                    })}
                  </p>
                </div>
              </div>
            </div>
          </TacticalPanel>

          <TacticalPanel className="relative flex min-h-0 flex-col border-accent/25 bg-app-bg/95 p-0">
            <span className="pointer-events-none absolute bottom-2 left-2 z-10 h-4 w-4 border-b border-l border-accent/40" />
            <span className="pointer-events-none absolute bottom-2 right-2 z-10 h-4 w-4 border-b border-r border-accent/40" />
            <p className="border-b border-accent/15 bg-app-bg px-4 py-2 font-mono-technical text-[9px] font-bold uppercase tracking-[0.28em] text-app-text">
              {t('sectors.fof.panels.combatAnalysis')}
            </p>

            <div className="flex min-h-0 flex-1 flex-col space-y-4 p-4 sm:p-5">
              <div className="rounded border border-accent/20 bg-black/40 p-3">
                <p className="mb-3 border-b border-amber-500/20 pb-2 font-mono-technical text-xs font-bold uppercase tracking-widest text-amber-500">
                  {t('sectors.fof.panels.combatMetrics')}
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <label className="block space-y-1">
                    <span className={labelClass}>{t('sectors.fof.form.hitsTaken')}</span>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      className={`${inputClass} tabular-nums`}
                      value={form.hitsTaken}
                      onChange={(e) => patch({ hitsTaken: e.target.value })}
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className={labelClass}>{t('sectors.fof.form.lethalHits')}</span>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      className={`${inputClass} tabular-nums`}
                      value={form.lethalHitsDelivered}
                      onChange={(e) => patch({ lethalHitsDelivered: e.target.value })}
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className={labelClass}>{t('sectors.fof.form.nonLethalHits')}</span>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      className={`${inputClass} tabular-nums`}
                      value={form.nonLethalHitsDelivered}
                      onChange={(e) => patch({ nonLethalHitsDelivered: e.target.value })}
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className={labelClass}>{t('sectors.fof.form.friendlyCasualties')}</span>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      className={`${inputClass} tabular-nums`}
                      value={form.friendlyCasualties}
                      onChange={(e) => patch({ friendlyCasualties: e.target.value })}
                    />
                  </label>
                  <label className="block space-y-1 sm:col-span-2">
                    <span className={labelClass}>{t('sectors.fof.form.timeToFirstEngagement')}</span>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      inputMode="decimal"
                      className={`${inputClass} tabular-nums`}
                      placeholder="1.20"
                      value={form.timeToFirstEngagement}
                      onChange={(e) => patch({ timeToFirstEngagement: e.target.value })}
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className={labelClass}>{t('sectors.fof.form.coverUtilization')}</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      inputMode="decimal"
                      className={`${inputClass} tabular-nums`}
                      placeholder="75"
                      value={form.coverUtilizationPercent}
                      onChange={(e) => patch({ coverUtilizationPercent: e.target.value })}
                    />
                  </label>
                  <label className="col-span-2 block space-y-1 sm:col-span-2">
                    <span className={labelClass}>{t('sectors.fof.form.hitTakenRatio')}</span>
                    <input
                      type="text"
                      readOnly
                      className={`${inputClass} tabular-nums text-accent`}
                      value={hitTakenPreview}
                    />
                  </label>
                </div>
              </div>

              <div className="shrink-0 space-y-3 rounded border border-red-500/25 bg-red-950/10 p-3">
                <p className="font-mono-technical text-xs font-bold uppercase tracking-widest text-red-400/90">
                  {t('sectors.fof.panels.tacticalErrors')}
                </p>
                {FOF_TACTICAL_ERROR_OPTIONS.map((opt) => {
                  const checked =
                    form.tacticalErrors.includes(opt.id) ||
                    (opt.id === 'blue_on_blue' && form.blueOnBlue)
                  return (
                    <label key={opt.id} className={toggleClass(checked)}>
                      <input
                        type="checkbox"
                        className="mt-1 size-4 shrink-0 accent-red-500"
                        checked={checked}
                        onChange={() => toggleFofTacticalError(opt.id)}
                      />
                      <span className="font-mono-technical text-sm leading-snug">
                        {formatFofTacticalErrorLabel(opt.id)}
                      </span>
                    </label>
                  )
                })}
                <label className={toggleClass(form.selfTcccApplied)}>
                  <input
                    type="checkbox"
                    className="mt-1 size-4 shrink-0 accent-accent"
                    checked={form.selfTcccApplied}
                    onChange={(e) => patch({ selfTcccApplied: e.target.checked })}
                  />
                  <span className="font-mono-technical text-sm leading-snug">
                    {t('sectors.fof.form.selfTcccApplied')}
                  </span>
                </label>
              </div>

              <label className="mt-auto block shrink-0 space-y-1">
                <span className={labelClass}>{t('sectors.fof.form.operationNote')}</span>
                <textarea
                  className={`${textareaClass} min-h-[4rem]`}
                  placeholder={t('sectors.fof.form.operationNotePlaceholder')}
                  value={form.operationNote}
                  onChange={(e) => patch({ operationNote: e.target.value })}
                  rows={3}
                  maxLength={2000}
                />
              </label>
              <label className="block shrink-0 space-y-1">
                <span className={labelClass}>{t('sectors.fof.form.debriefNotes')} *</span>
                <textarea
                  className={`${textareaClass} min-h-[5rem]`}
                  placeholder={t('sectors.fof.form.debriefNotesPlaceholder')}
                  value={form.debriefNotes}
                  onChange={(e) => patch({ debriefNotes: e.target.value })}
                  rows={4}
                  maxLength={2000}
                  required
                />
              </label>
            </div>
          </TacticalPanel>

          <div className="space-y-3 lg:col-span-2">
            {submitOk ? (
              <p className="rounded border border-accent/40 bg-accent/10 px-3 py-2 text-center font-mono-technical text-[9px] font-bold uppercase text-accent">
                {t('sectors.fof.messages.submitSuccess')}
              </p>
            ) : null}
            {submitError ? (
              <p className="rounded border border-red-500/40 bg-red-950/25 px-3 py-2 text-center font-mono-technical text-[9px] font-bold uppercase text-red-300">
                {submitError}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2 rounded border border-accent/15 bg-black/40 p-3">
              <SuccessScorePreview
                percent={previewSuccessPercent}
                compromised={
                  form.blueOnBlue ||
                  (Array.isArray(form.tacticalErrors) && form.tacticalErrors.includes('blue_on_blue'))
                }
              />
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
                {saving ? t('common.terminal.saving') : t('sectors.fof.form.submit')}
              </button>
            </div>
          </div>
        </form>
      )}

      <OperatorInstructorRecordsEmbed discipline="fof" />
    </div>
  )
}
