import { useCallback, useMemo, useState } from 'react'
import { AlertTriangle, ChevronLeft } from 'lucide-react'
import cqbImg from '../../assets/cqb.png'
import MatrixWireVisualizer from '../armory/MatrixWireVisualizer'
import TacticalPanel from '../ui/TacticalPanel'
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
  TACTICAL_ERROR_GROUPS,
  TEAM_SIZE_OPTIONS,
} from '../../lib/cqbOptions'
import { invNum, invStr } from '../../lib/inventoryIlws'
import { calculateCqbSuccessPercent } from '../../lib/trainingSuccessScore'
import CqbLogRegistry from './CqbLogRegistry'
import SuccessScorePreview from './SuccessScorePreview'
import TrainingSessionHeader from './TrainingSessionHeader'

const inputClass =
  'w-full rounded border border-[#00FF41]/30 bg-[#0A0A0A] px-2 py-2 font-mono-technical text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-[#00FF41]/60'

const selectClass =
  'dossier-blood-select w-full rounded border border-[#00FF41]/35 bg-[#0A0A0A] py-2 pl-2 pr-8 font-mono-technical text-[11px] uppercase text-white outline-none focus:border-[#00FF41]/60'

const textareaClass =
  'w-full min-h-[6rem] resize-y rounded border border-[#00FF41]/30 bg-[#0A0A0A] px-2 py-2 font-mono-technical text-sm leading-relaxed text-slate-100 outline-none placeholder:text-slate-600 focus:border-[#00FF41]/60'

const labelClass = 'font-mono-technical text-[8px] font-bold uppercase tracking-[0.22em] text-slate-500'

const errorCheckClass = (checked) =>
  `flex cursor-pointer items-start gap-2.5 rounded border px-2.5 py-2 transition ${
    checked
      ? 'border-[#00FF41]/50 bg-[#00FF41]/10 text-green-400'
      : 'border-white/10 text-zinc-300 hover:border-[#00FF41]/25 hover:text-zinc-100'
  }`

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
    <div className="rounded border border-white/8 bg-[#080808]/80 p-3">
      <p className="mb-3 border-b border-amber-500/20 pb-2 font-mono-technical text-xs font-bold uppercase tracking-widest text-amber-500">
        {group.title}
      </p>
      <div className="space-y-3">
        {group.items.map((preset) => {
          const checked = selected.includes(preset.id)
          return (
            <label key={preset.id} className={errorCheckClass(checked)}>
              <input
                type="checkbox"
                className="mt-1 size-4 shrink-0 accent-[#00FF41]"
                checked={checked}
                onChange={() => onToggle(preset.id)}
              />
              <span className="font-mono-technical text-sm leading-snug">{preset.label}</span>
            </label>
          )
        })}
      </div>
    </div>
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
    const clearingRaw = invStr(form.clearingTime).trim().replace(',', '.')
    const clearingSec = clearingRaw ? invNum(clearingRaw) : NaN
    if (!clearingRaw || !Number.isFinite(clearingSec) || clearingSec <= 0) {
      return 'TAMAMLAMA_SÜRESİ_SN_GEREKLİ'
    }
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
    form.clearingTime,
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
    const clearingRaw = invStr(form.clearingTime).trim().replace(',', '.')
    const clearingSec = clearingRaw ? invNum(clearingRaw) : null
    const clearingTimeSec =
      clearingSec != null && Number.isFinite(clearingSec) && clearingSec >= 0 ? clearingSec : null
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
    form.clearingTime,
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
        clearingTime: form.clearingTime,
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
        <p className="font-mono-technical text-[10px] uppercase text-slate-500">OTURUM_GEREKLİ</p>
      ) : listenError ? (
        <p className="rounded border border-red-500/40 bg-red-950/25 px-3 py-2 font-mono-technical text-[10px] text-red-300">
          VERİ_KANALI_KESİLDİ · YENİDEN_DENE
        </p>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="grid gap-4 lg:grid-cols-2 lg:items-stretch"
        >
          <TacticalPanel className="relative flex flex-col overflow-hidden border-[#00FF41]/20 bg-[#0a0a0a]/95 p-0">
            <span className="pointer-events-none absolute left-2 top-2 z-10 h-4 w-4 border-l border-t border-[#00FF41]/40" />
            <span className="pointer-events-none absolute right-2 top-2 z-10 h-4 w-4 border-r border-t border-[#00FF41]/40" />
            <p className="border-b border-[#00FF41]/15 bg-[#080808] px-4 py-2 font-mono-technical text-[9px] font-bold uppercase tracking-[0.28em] text-[#00FF41]/90">
              OPERASYON KURULUMU · METRİKLER
            </p>

            <div className="flex flex-1 flex-col space-y-4 p-4 sm:p-5">
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
              <div className="rounded border border-[#00FF41]/20 bg-black/40 p-3">
                <p className="mb-3 font-mono-technical text-[7px] font-bold uppercase tracking-[0.2em] text-[#00FF41]/80">
                  SAHA METRİKLERİ
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <label className="block space-y-1">
                    <span className={labelClass}>TEHDİT SAYISI</span>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      className={`${inputClass} tabular-nums`}
                      value={form.threatCount}
                      onChange={(e) => onThreatChange(e.target.value)}
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className={labelClass}>ETKİSİZ ALINAN</span>
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
                  </label>
                  <label className="block space-y-1">
                    <span className={labelClass}>TEMİZLİK SÜRESİ (SN)</span>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      inputMode="decimal"
                      className={`${inputClass} tabular-nums`}
                      placeholder="4.20"
                      value={form.clearingTime}
                      onChange={(e) => patch({ clearingTime: e.target.value })}
                    />
                  </label>
                </div>
                {countError ? (
                  <p className="mt-2 flex items-center gap-1.5 font-mono-technical text-[8px] font-bold uppercase text-red-400">
                    <AlertTriangle className="size-3 shrink-0" aria-hidden />
                    {countError}
                  </p>
                ) : null}
              </div>
              <div className="mt-auto hidden border-t border-[#00FF41]/12 pt-3 lg:block">
                <MatrixWireVisualizer hubMode variant="reddot" imageSrc={cqbImg} imageAlt="CQB" label="" />
                <div className="mt-2 font-mono-technical text-[8px] uppercase text-slate-500">
                  <p>
                    TEHDİT / ETKİSİZ:{' '}
                    <span className="text-[#00FF41]">
                      {threatNum} / {neutralizedNum}
                    </span>
                  </p>
                  <p className="mt-0.5 text-[#ffb400]">HATA: {totalTacticalErrorCount} İŞARETLİ</p>
                </div>
              </div>
            </div>
          </TacticalPanel>

          <TacticalPanel className="relative flex min-h-0 flex-col border-[#00FF41]/25 bg-[#0a0a0a]/95 p-0">
            <span className="pointer-events-none absolute bottom-2 left-2 z-10 h-4 w-4 border-b border-l border-[#00FF41]/40" />
            <span className="pointer-events-none absolute bottom-2 right-2 z-10 h-4 w-4 border-b border-r border-[#00FF41]/40" />
            <p className="border-b border-[#00FF41]/15 bg-[#080808] px-4 py-2 font-mono-technical text-[9px] font-bold uppercase tracking-[0.28em] text-white">
              TAKTİK HATALAR · ANALİZ
            </p>

            <div className="flex min-h-0 flex-1 flex-col space-y-4 p-4 sm:p-5">
              <fieldset className="flex min-h-0 flex-1 flex-col space-y-3 overflow-hidden rounded border border-[#00FF41]/20 bg-black/40 p-3">
                <legend className={`${labelClass} text-[#00FF41]/80`}>
                  TAKTİK HATALAR · FAZ BAZLI
                </legend>

                {totalTacticalErrorCount > 0 ? (
                  <div className="flex flex-wrap gap-1.5 border-b border-[#00FF41]/10 pb-2">
                    {form.tacticalErrors.map((id) => {
                      const preset = TACTICAL_ERROR_GROUPS.flatMap((g) => g.items).find(
                        (p) => p.id === id
                      )
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => toggleTacticalError(id)}
                          className="rounded border border-[#00FF41]/45 bg-[#00FF41]/10 px-2 py-0.5 font-mono-technical text-[7px] uppercase text-[#00FF41] hover:bg-[#00FF41]/20"
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
            </div>
          </TacticalPanel>

          <div className="space-y-3 lg:col-span-2">
            {submitOk ? (
              <p className="rounded border border-[#00FF41]/40 bg-[#00FF41]/10 px-3 py-2 text-center font-mono-technical text-[9px] font-bold uppercase text-[#00FF41]">
                CQB_KAYDI_AKTARILDI · RANGE_LOGS
              </p>
            ) : null}
            {submitError ? (
              <p className="rounded border border-red-500/40 bg-red-950/25 px-3 py-2 text-center font-mono-technical text-[9px] font-bold uppercase text-red-300">
                {submitError}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2 rounded border border-[#00FF41]/15 bg-black/40 p-3">
              <SuccessScorePreview percent={previewSuccessPercent} />
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
                {saving ? 'AKTARILIYOR…' : 'CQB_KAYDINI_ONAYLA'}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}
