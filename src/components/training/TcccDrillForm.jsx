import { useCallback, useMemo, useState } from 'react'
import TacticalPanel from '../ui/TacticalPanel'
import { useAuth } from '../../context/AuthContext'
import { TCCC_INITIAL_FORM } from '../../lib/tcccLogPayload'
import { submitTcccRecord } from '../../lib/tcccSubmit'
import {
  CASUALTY_TYPE_OPTIONS,
  INJURY_TYPE_OPTIONS,
  OUTCOME_OPTIONS,
  PROCEDURE_PERFORMED_OPTIONS,
  TCCC_CUSTOM,
  TCCC_PHASE_OPTIONS,
  TOURNIQUET_LOCATION_OPTIONS,
} from '../../lib/tcccOptions'
import { invNum, invStr } from '../../lib/inventoryIlws'
import { calculateTcccSuccessPercent } from '../../lib/trainingSuccessScore'
import SuccessScorePreview from './SuccessScorePreview'

const inputClass =
  'w-full rounded border border-[#00FF41]/30 bg-[#0A0A0A] px-2 py-2 font-mono-technical text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-[#00FF41]/60'

const selectClass =
  'dossier-blood-select w-full rounded border border-[#00FF41]/35 bg-[#0A0A0A] py-2 pl-2 pr-8 font-mono-technical text-[11px] uppercase text-white outline-none focus:border-[#00FF41]/60'

const textareaClass =
  'w-full min-h-[5rem] resize-y rounded border border-[#00FF41]/30 bg-[#0A0A0A] px-2 py-2 font-mono-technical text-sm leading-relaxed text-slate-100 outline-none placeholder:text-slate-600 focus:border-[#00FF41]/60'

const labelClass = 'font-mono-technical text-[8px] font-bold uppercase tracking-[0.22em] text-slate-500'

const toggleClass = (active) =>
  `flex cursor-pointer items-start gap-2.5 rounded border px-3 py-2.5 transition ${
    active
      ? 'border-[#00FF41]/50 bg-[#00FF41]/10 text-green-400'
      : 'border-white/10 text-zinc-300 hover:border-[#00FF41]/25 hover:text-zinc-100'
  }`

/**
 * @param {{
 *   addLog: (payload: Record<string, unknown>) => Promise<{ id: string }>
 * }} props
 */
export default function TcccDrillForm({ addLog }) {
  const { user } = useAuth()
  const uid = user?.uid ?? ''

  const [form, setForm] = useState(TCCC_INITIAL_FORM)
  const [saving, setSaving] = useState(false)
  const [submitOk, setSubmitOk] = useState(false)
  const [submitError, setSubmitError] = useState(/** @type {string | null} */ (null))

  const showCustomPhase = form.tcccPhase === TCCC_CUSTOM
  const showCustomTqLoc = form.tourniquetLocation === TCCC_CUSTOM

  const interventionSec = useMemo(() => {
    const text = invStr(form.interventionTime).trim().replace(',', '.')
    if (!text) return null
    const n = invNum(text)
    return Number.isFinite(n) && n > 0 ? n : null
  }, [form.interventionTime])

  const submitBlockedReason = useMemo(() => {
    if (saving) return null
    if (!uid) return 'OTURUM_GEREKLİ'
    if (!form.casualtyType) return 'CASUALTY_TYPE_GEREKLİ'
    if (interventionSec == null) return 'INTERVENTION_TIME_ZORUNLU · SN > 0'
    if (!form.procedures.length) return 'PROCEDURE_PERFORMED_GEREKLİ'
    if (!form.outcome) return 'OUTCOME_GEREKLİ'
    if (!form.tcccPhase) return 'TCCC_FAZI_GEREKLİ'
    if (showCustomPhase && !form.customTcccPhase.trim()) return 'ÖZEL_FAZ_GEREKLİ'
    if (!form.injuryType) return 'YARALANMA_TİPİ_GEREKLİ'
    if (!form.tourniquetLocation) return 'TURNİKE_KONUMU_GEREKLİ'
    if (showCustomTqLoc && !form.customTourniquetLocation.trim()) return 'ÖZEL_KONUM_GEREKLİ'
    return null
  }, [
    saving,
    uid,
    form.casualtyType,
    form.procedures,
    form.outcome,
    form.tcccPhase,
    form.customTcccPhase,
    form.injuryType,
    form.tourniquetLocation,
    form.customTourniquetLocation,
    showCustomPhase,
    showCustomTqLoc,
    interventionSec,
  ])

  const canSubmit = submitBlockedReason == null

  const previewSuccessPercent = useMemo(() => {
    const evacRaw = invStr(form.evacWaitingTime).trim().replace(',', '.')
    const evac = evacRaw ? invNum(evacRaw) : null
    const proc = form.procedures
    return calculateTcccSuccessPercent({
      injuryType: form.injuryType,
      injuryToTqTimeSec: interventionSec,
      tourniquetApplied: proc.includes('tourniquet') || form.tourniquetApplied,
      woundPacking: proc.includes('bandage') || form.woundPacking,
      npaInserted: proc.includes('airway') || form.npaInserted,
      chestSealApplied: form.chestSealApplied,
      needleDecompression: form.needleDecompression,
      hypothermiaBlanket: form.hypothermiaBlanket,
      evacWaitingTimeMin: evac != null && Number.isFinite(evac) ? evac : null,
      operationNote: form.operationNote,
    })
  }, [form, interventionSec])

  const patch = useCallback((/** @type {Partial<typeof TCCC_INITIAL_FORM>} */ next) => {
    setForm((f) => ({ ...f, ...next }))
    setSubmitOk(false)
    setSubmitError(null)
  }, [])

  const toggleProcedure = (/** @type {string} */ procId) => {
    setForm((f) => {
      const prev = Array.isArray(f.procedures) ? f.procedures : []
      const has = prev.includes(procId)
      const procedures = has ? prev.filter((id) => id !== procId) : [...prev, procId]
      const tourniquetApplied = procedures.includes('tourniquet')
      const woundPacking = procedures.includes('bandage')
      const npaInserted = procedures.includes('airway')
      return { ...f, procedures, tourniquetApplied, woundPacking, npaInserted }
    })
    setSubmitOk(false)
    setSubmitError(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmit || !uid) return

    setSaving(true)
    setSubmitOk(false)
    setSubmitError(null)
    try {
      await submitTcccRecord({
        addLog,
        userId: uid,
        casualtyType: form.casualtyType,
        interventionTime: form.interventionTime,
        outcome: form.outcome,
        procedures: form.procedures,
        tcccPhase: form.tcccPhase,
        customTcccPhase: form.customTcccPhase,
        injuryType: form.injuryType,
        injuryToTqTime: form.interventionTime,
        evacWaitingTime: form.evacWaitingTime,
        systolicBp: form.systolicBp,
        tourniquetLocation: form.tourniquetLocation,
        customTourniquetLocation: form.customTourniquetLocation,
        tourniquetApplied: form.tourniquetApplied,
        woundPacking: form.woundPacking,
        npaInserted: form.npaInserted,
        chestSealApplied: form.chestSealApplied,
        needleDecompression: form.needleDecompression,
        hypothermiaBlanket: form.hypothermiaBlanket,
        operationNote: form.operationNote,
      })
      setSubmitOk(true)
      setForm({ ...TCCC_INITIAL_FORM })
    } catch (err) {
      const code = err && typeof err === 'object' && 'code' in err ? String(err.code) : ''
      setSubmitError(`TCCC_KAYIT_BAŞARISIZ · YENİDEN_DENE${code ? ` · ${code}` : ''}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-2">
      <TacticalPanel className="relative border-[#00FF41]/20 bg-[#0a0a0a]/95 p-0">
        <p className="border-b border-[#00FF41]/15 bg-[#080808] px-4 py-2 font-mono-technical text-[9px] font-bold uppercase tracking-[0.28em] text-[#00FF41]/90">
          TCCC METRİKLERİ · KLİNİK & TAKTİK
        </p>
        <div className="space-y-4 p-4">
          <fieldset className="space-y-2">
            <legend className={labelClass}>CASUALTY TYPE *</legend>
            <select
              className={selectClass}
              value={form.casualtyType}
              onChange={(e) => patch({ casualtyType: e.target.value })}
              required
            >
              <option value="">— YARALI TİPİ —</option>
              {CASUALTY_TYPE_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </fieldset>

          <label className="block space-y-1">
            <span className={labelClass}>INTERVENTION TIME (SN) *</span>
            <input
              type="number"
              min={0.01}
              step={0.01}
              required
              className={`${inputClass} tabular-nums`}
              placeholder="12.50"
              value={form.interventionTime}
              onChange={(e) => patch({ interventionTime: e.target.value })}
            />
          </label>

          <fieldset className="space-y-2">
            <legend className={labelClass}>PROCEDURE PERFORMED *</legend>
            {PROCEDURE_PERFORMED_OPTIONS.map((opt) => (
              <label key={opt.id} className={toggleClass(form.procedures.includes(opt.id))}>
                <input
                  type="checkbox"
                  className="mt-1 size-4 accent-[#00FF41]"
                  checked={form.procedures.includes(opt.id)}
                  onChange={() => toggleProcedure(opt.id)}
                />
                <span className="font-mono-technical text-sm">{opt.label}</span>
              </label>
            ))}
          </fieldset>

          <fieldset className="space-y-2">
            <legend className={labelClass}>OUTCOME *</legend>
            <select
              className={selectClass}
              value={form.outcome}
              onChange={(e) => patch({ outcome: e.target.value })}
              required
            >
              <option value="">— SONUÇ —</option>
              {OUTCOME_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </fieldset>
        </div>
      </TacticalPanel>

      <TacticalPanel className="relative border-[#00FF41]/25 bg-[#0a0a0a]/95 p-0">
        <p className="border-b border-[#00FF41]/15 bg-[#080808] px-4 py-2 font-mono-technical text-[9px] font-bold uppercase tracking-[0.28em] text-white">
          MARCH · EK KLİNİK VERİ
        </p>
        <div className="space-y-4 p-4">
          <fieldset className="space-y-2">
            <legend className={labelClass}>TCCC FAZI *</legend>
            <select
              className={selectClass}
              value={form.tcccPhase}
              onChange={(e) => patch({ tcccPhase: e.target.value, customTcccPhase: '' })}
              required
            >
              <option value="">— FAZ —</option>
              {TCCC_PHASE_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
            {showCustomPhase ? (
              <input
                className={inputClass}
                placeholder="Özel faz…"
                value={form.customTcccPhase}
                onChange={(e) => patch({ customTcccPhase: e.target.value })}
                required
              />
            ) : null}
          </fieldset>

          <fieldset className="space-y-2">
            <legend className={labelClass}>YARALANMA TİPİ *</legend>
            <select
              className={selectClass}
              value={form.injuryType}
              onChange={(e) => patch({ injuryType: e.target.value })}
              required
            >
              <option value="">— YARALANMA —</option>
              {INJURY_TYPE_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className={labelClass}>TURNİKE KONUMU *</legend>
            <select
              className={selectClass}
              value={form.tourniquetLocation}
              onChange={(e) => patch({ tourniquetLocation: e.target.value, customTourniquetLocation: '' })}
              required
            >
              <option value="">— KONUM —</option>
              {TOURNIQUET_LOCATION_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
            {showCustomTqLoc ? (
              <input
                className={inputClass}
                placeholder="Özel konum…"
                value={form.customTourniquetLocation}
                onChange={(e) => patch({ customTourniquetLocation: e.target.value })}
                required
              />
            ) : null}
          </fieldset>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className={labelClass}>TAHLİYE BEKLEME (DK)</span>
              <input
                type="number"
                min={0}
                step={0.1}
                className={`${inputClass} tabular-nums`}
                value={form.evacWaitingTime}
                onChange={(e) => patch({ evacWaitingTime: e.target.value })}
              />
            </label>
            <label className="block space-y-1">
              <span className={labelClass}>SİSTOLİK BP</span>
              <input
                type="number"
                min={0}
                step={1}
                className={`${inputClass} tabular-nums`}
                value={form.systolicBp}
                onChange={(e) => patch({ systolicBp: e.target.value })}
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              ['chestSealApplied', 'Göğüs mührü'],
              ['needleDecompression', 'İğne dekompresyon'],
              ['hypothermiaBlanket', 'Hipotermi battaniyesi'],
            ].map(([key, label]) => (
              <label key={key} className={toggleClass(form[key])}>
                <input
                  type="checkbox"
                  className="size-4 accent-[#00FF41]"
                  checked={form[key]}
                  onChange={(e) => patch({ [key]: e.target.checked })}
                />
                <span className="font-mono-technical text-[10px]">{label}</span>
              </label>
            ))}
          </div>

          <label className="block space-y-1">
            <span className={labelClass}>OPERASYON NOTU</span>
            <textarea
              className={textareaClass}
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
            TCCC_KAYDI_AKTARILDI · TCCC_LOGS
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
            className="w-full rounded border border-[#00FF41]/55 bg-[#00FF41]/12 py-2.5 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-[#00FF41] hover:bg-[#00FF41]/20 disabled:opacity-40"
          >
            {saving ? 'AKTARILIYOR…' : 'TCCC_KAYDINI_ONAYLA'}
          </button>
        </div>
      </div>
    </form>
  )
}
