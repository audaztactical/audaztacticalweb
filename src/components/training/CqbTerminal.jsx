import { useCallback, useMemo, useState } from 'react'
import { AlertTriangle, ChevronLeft } from 'lucide-react'
import cqbImg from '../../assets/cqb.png'
import { useAuth } from '../../context/AuthContext'
import { submitCqbRecord } from '../../lib/cqbSubmit'
import {
  BREACHING_TYPE_OPTIONS,
  CQB_CUSTOM,
  CQB_INITIAL_FORM,
  DOOR_STATE_OPTIONS,
  ENTRY_METHOD_OPTIONS,
  mergeTacticalErrorsForPayload,
  ROOM_TOPOLOGY_OPTIONS,
  TACTICAL_DECISION_OPTIONS,
  TACTICAL_ERROR_GROUPS,
  TEAM_SIZE_OPTIONS,
} from '../../lib/cqbOptions'
import { invNum, invStr } from '../../lib/inventoryIlws'
import { calculateCqbSuccessPercent } from '../../lib/trainingSuccessScore'
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
 *   group: import('../../lib/cqbOptions').TacticalErrorGroup
 *   selected: string[]
 *   onToggle: (id: string) => void
 * }} p
 */
function CqbErrorPhaseCell({ group, selected, onToggle }) {
  return (
    <TrainingPhaseBlock title={group.title}>
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
            <span className="font-mono-technical text-sm leading-snug">{preset.label}</span>
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
  const { user } = useAuth()
  const uid = user?.uid ?? ''

  const [form, setForm] = useState(CQB_INITIAL_FORM)
  const [viewMode, setViewMode] = useState(/** @type {CqbViewMode} */ ('form'))
  const [saving, setSaving] = useState(false)
  const [submitOk, setSubmitOk] = useState(false)
  const [submitError, setSubmitError] = useState(/** @type {string | null} */ (null))
  const [countError, setCountError] = useState(/** @type {string | null} */ (null))
  const [customErrorDraft, setCustomErrorDraft] = useState('')

  const showCustomRoom = form.roomTopology === CQB_CUSTOM
  const showCustomEntry = form.entryMethod === CQB_CUSTOM
  const showCustomBreach = form.breachingType === CQB_CUSTOM

  const threatNum = Math.max(0, Math.floor(invNum(form.threatCount)))
  const neutralizedNum = Math.max(0, Math.floor(invNum(form.neutralizedCount)))
  const neutralizedInvalid = neutralizedNum > threatNum

  const submitBlockedReason = useMemo(() => {
    if (saving) return null
    if (!uid) return 'OTURUM_GEREKLİ'
    if (!form.roomTopology) return 'ODA_TOPOLOJİSİ_GEREKLİ'
    if (showCustomRoom && !form.customRoomTopology.trim()) return 'ÖZEL_TOPOLOJİ_ADI_GEREKLİ'
    if (!form.entryMethod) return 'GİRİŞ_METODU_GEREKLİ'
    if (showCustomEntry && !form.customEntryMethod.trim()) return 'ÖZEL_GİRİŞ_METODU_GEREKLİ'
    if (!form.breachingType) return 'KIRMA_TİPİ_GEREKLİ'
    if (showCustomBreach && !form.customBreachingType.trim()) return 'ÖZEL_KIRMA_TİPİ_GEREKLİ'
    if (!form.doorState) return 'KAPI_DURUMU_GEREKLİ'
    if (!form.teamSize) return 'TAKIM_BOYUTU_GEREKLİ'
    if (neutralizedInvalid) return 'ETKİSİZ_SAYISI_TEHDİTİ_AŞAMAZ'
    const clearanceRaw = invStr(form.clearanceTimeMs).trim().replace(',', '.')
    const clearanceMs = clearanceRaw ? invNum(clearanceRaw) : NaN
    if (!clearanceRaw || !Number.isFinite(clearanceMs) || clearanceMs <= 0) {
      return 'CLEARANCE_TIME_SN_GEREKLİ'
    }
    const accuracyRaw = invStr(form.accuracyScore).trim().replace(',', '.')
    const accuracy = accuracyRaw ? invNum(accuracyRaw) : NaN
    if (!accuracyRaw || !Number.isFinite(accuracy) || accuracy < 0 || accuracy > 100) {
      return 'ACCURACY_SCORE_0_100_GEREKLİ'
    }
    const safetyRaw = invStr(form.safetyViolations).trim()
    const safety = safetyRaw === '' ? NaN : invNum(safetyRaw)
    if (!Number.isFinite(safety) || safety < 0) return 'GÜVENLİK_İHLALİ_SAYISI_GEREKLİ'
    if (!form.tacticalDecision) return 'TAKTİK_KARAR_GEREKLİ'
    return null
  }, [
    saving,
    uid,
    form.roomTopology,
    form.customRoomTopology,
    form.entryMethod,
    form.customEntryMethod,
    form.breachingType,
    form.customBreachingType,
    form.doorState,
    form.teamSize,
    showCustomRoom,
    showCustomEntry,
    showCustomBreach,
    neutralizedInvalid,
    form.clearanceTimeMs,
    form.accuracyScore,
    form.safetyViolations,
    form.tacticalDecision,
  ])

  const canSubmit = submitBlockedReason == null

  const patch = useCallback((/** @type {Partial<typeof CQB_INITIAL_FORM>} */ next) => {
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
    setCountError(capped ? 'ETKİSİZ_SAYISI_TEHDİTİ_AŞAMAZ · OTOMATİK_SINIRLANDI' : null)
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
        breachingType: form.breachingType,
        customBreachingType: form.customBreachingType,
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
      setForm({ ...CQB_INITIAL_FORM })
    } catch (err) {
      const code = err && typeof err === 'object' && 'code' in err ? String(err.code) : ''
      const message =
        err && typeof err === 'object' && 'message' in err && typeof err.message === 'string'
          ? err.message
          : ''
      const hint = code === 'permission-denied' ? ' · YETKİ / KURALLAR' : code ? ` · ${code}` : ''
      setSubmitError(`CQB_KAYIT_BAŞARISIZ · YENİDEN_DENE${hint}`)
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
          KATEGORİLERE DÖN
        </button>

        <div
          className="flex w-full gap-2 rounded border border-accent/25 bg-black/60 p-1 sm:w-auto"
          role="tablist"
          aria-label="CQB terminal görünümü"
        >
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'form'}
            onClick={() => setViewMode('form')}
            className={tabBtnClass(viewMode === 'form')}
          >
            CQB KAYIT FORMU
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'registry'}
            onClick={() => setViewMode('registry')}
            className={tabBtnClass(viewMode === 'registry')}
          >
            GEÇMİŞ CQB KAYITLARI
          </button>
        </div>
      </div>

      {viewMode === 'registry' ? (
        <CqbLogRegistry rangeLogs={rangeLogs} loading={logsLoading} />
      ) : !ready ? (
        <p className="font-mono-technical text-[10px] uppercase text-app-text/55">OTURUM_GEREKLİ</p>
      ) : listenError ? (
        <p className="rounded border border-red-500/40 bg-red-950/25 px-3 py-2 font-mono-technical text-[10px] text-red-300">
          VERİ_KANALI_KESİLDİ · YENİDEN_DENE
        </p>
      ) : (
        <TrainingTerminalLayout
          onSubmit={handleSubmit}
          left={
            <TrainingTerminalPanel title="OPERASYON KURULUMU · METRİKLER">
              <CqbSelectField
                legend="ODA TOPOLOJİSİ"
                value={form.roomTopology}
                options={ROOM_TOPOLOGY_OPTIONS}
                onChange={(v) => patch({ roomTopology: v, customRoomTopology: '' })}
                showCustom={showCustomRoom}
                customValue={form.customRoomTopology}
                onCustomChange={(v) => patch({ customRoomTopology: v })}
                customPlaceholder="Özel oda topolojisi…"
              />
              <CqbSelectField
                legend="GİRİŞ METODU"
                value={form.entryMethod}
                options={ENTRY_METHOD_OPTIONS}
                onChange={(v) => patch({ entryMethod: v, customEntryMethod: '' })}
                showCustom={showCustomEntry}
                customValue={form.customEntryMethod}
                onCustomChange={(v) => patch({ customEntryMethod: v })}
                customPlaceholder="Özel giriş metodu…"
              />
              <CqbSelectField
                legend="KIRMA TİPİ"
                value={form.breachingType}
                options={BREACHING_TYPE_OPTIONS}
                onChange={(v) => patch({ breachingType: v, customBreachingType: '' })}
                showCustom={showCustomBreach}
                customValue={form.customBreachingType}
                onCustomChange={(v) => patch({ customBreachingType: v })}
                customPlaceholder="Özel kırma tipi…"
              />
              <CqbSelectField
                legend="KAPI DURUMU"
                value={form.doorState}
                options={DOOR_STATE_OPTIONS}
                onChange={(v) => patch({ doorState: v })}
                showCustom={false}
                customValue=""
                onCustomChange={() => {}}
                customPlaceholder=""
              />
              <fieldset className="space-y-2">
                <legend className={labelClass}>TAKIM BOYUTU</legend>
                <select
                  className={selectClass}
                  value={form.teamSize}
                  onChange={(e) => patch({ teamSize: e.target.value })}
                  required
                >
                  <option value="">— TAKIM SEÇİN —</option>
                  {TEAM_SIZE_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
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
                <TrainingMetricField label="TEHDİT SAYISI">
                  <input
                    type="number"
                    min={0}
                    step={1}
                    className={`${inputClass} tabular-nums`}
                    value={form.threatCount}
                    onChange={(e) => onThreatChange(e.target.value)}
                  />
                </TrainingMetricField>
                <TrainingMetricField label="ETKİSİZ ALINAN">
                  <input
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
                <TrainingMetricField label="CLEARANCE TIME (SN)">
                  <input
                    type="number"
                    min={0.001}
                    step={0.01}
                    inputMode="decimal"
                    className={`${inputClass} tabular-nums`}
                    placeholder="30.00"
                    value={form.clearanceTimeMs}
                    onChange={(e) => patch({ clearanceTimeMs: e.target.value })}
                  />
                </TrainingMetricField>
                <TrainingMetricField label="ACCURACY SCORE (%)">
                  <input
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
                <TrainingMetricField label="SAFETY VIOLATIONS">
                  <input
                    type="number"
                    min={0}
                    step={1}
                    className={`${inputClass} tabular-nums`}
                    value={form.safetyViolations}
                    onChange={(e) => patch({ safetyViolations: e.target.value })}
                  />
                </TrainingMetricField>
                <TrainingMetricField label="TACTICAL DECISION" className="sm:col-span-1">
                  <select
                    className={selectClass}
                    value={form.tacticalDecision}
                    onChange={(e) => patch({ tacticalDecision: e.target.value })}
                    required
                  >
                    <option value="">— KARAR SEÇİN —</option>
                    {TACTICAL_DECISION_OPTIONS.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </TrainingMetricField>
              </TrainingMetricGrid>
              <TrainingVisualStage
                imageSrc={cqbImg}
                imageAlt="CQB"
                stats={
                  <>
                    <p>
                      TEHDİT / ETKİSİZ:{' '}
                      <span className="text-accent">
                        {threatNum} / {neutralizedNum}
                      </span>
                    </p>
                    <p className="mt-0.5 text-accent">HATA: {totalTacticalErrorCount} İŞARETLİ</p>
                  </>
                }
              />
            </TrainingTerminalPanel>
          }
          right={
            <TrainingTerminalPanel
              title="TAKTİK HATALAR · ANALİZ"
              titleClassName="text-app-text"
              corners="bottom"
              panelClassName="relative flex min-h-0 flex-col border-accent/25 bg-app-bg/95 p-0"
              bodyClassName="flex min-h-0 flex-1 flex-col space-y-4 p-4 sm:p-5"
            >
              <fieldset className="flex min-h-0 flex-1 flex-col space-y-3 overflow-hidden rounded border border-accent/20 bg-black/40 p-3">
                <legend className={`${labelClass} text-accent/80`}>
                  TAKTİK HATALAR · FAZ BAZLI
                </legend>

                {totalTacticalErrorCount > 0 ? (
                  <div className="flex flex-wrap gap-1.5 border-b border-accent/10 pb-2">
                    {form.tacticalErrors.map((id) => {
                      const preset = TACTICAL_ERROR_GROUPS.flatMap((g) => g.items).find(
                        (p) => p.id === id
                      )
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => toggleTacticalError(id)}
                          className="rounded border border-accent/45 bg-accent/10 px-2 py-0.5 font-mono-technical text-[7px] uppercase text-accent hover:bg-accent/20"
                        >
                          {preset?.label ?? id} ×
                        </button>
                      )
                    })}
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
                  ÖZEL HATA · custom_error
                </p>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="text"
                    className={`${inputClass} min-w-0 flex-1`}
                    placeholder="Örn. Yanlış el sinyali, geç holster…"
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
                    HATA_EKLE
                  </button>
                </div>
              </div>

              <label className="mt-auto block shrink-0 space-y-1">
                <span className={labelClass}>OPERASYON NOTU</span>
                <textarea
                  className={`${textareaClass} min-h-[4.5rem]`}
                  placeholder="Saha gözlemi, koordinasyon, #etiketler…"
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
              submitLabel="CQB_KAYDINI_ONAYLA"
              successMessage={submitOk ? 'CQB_KAYDI_AKTARILDI · RANGE_LOGS' : null}
              errorMessage={submitError}
            />
          }
        />
      )}

      <OperatorInstructorRecordsEmbed discipline="cqb" />
    </div>
  )
}
