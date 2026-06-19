import { useCallback, useMemo, useState } from 'react'
import TacticalPanel from '../ui/TacticalPanel'
import { useAuth } from '../../context/AuthContext'
import { VBSS_INITIAL_FORM } from '../../lib/vbssLogPayload'
import { submitVbssRecord } from '../../lib/vbssSubmit'
import { VBSS_TACTICAL_ERROR_OPTIONS } from '../../lib/vbssTacticalErrors'
import {
  BOARDING_POINT_OPTIONS,
  SEA_STATE_OPTIONS,
  THREAT_LEVEL_OPTIONS,
  VBSS_CUSTOM,
  VESSEL_TYPE_OPTIONS,
} from '../../lib/vbssOptions'
import { invNum, invStr } from '../../lib/inventoryIlws'
import { calculateVbssSuccessPercent } from '../../lib/trainingSuccessScore'
import SuccessScorePreview from './SuccessScorePreview'

const inputClass =
  'w-full rounded border border-accent/30 bg-app-bg px-2 py-2 font-mono-technical text-sm text-slate-100 outline-none placeholder:text-app-text/45 focus:border-accent/60'

const selectClass =
  'dossier-blood-select w-full rounded border border-accent/35 bg-app-bg py-2 pl-2 pr-8 font-mono-technical text-[11px] uppercase text-app-text outline-none focus:border-accent/60'

const textareaClass =
  'w-full min-h-[5rem] resize-y rounded border border-accent/30 bg-app-bg px-2 py-2 font-mono-technical text-sm leading-relaxed text-slate-100 outline-none placeholder:text-app-text/45 focus:border-accent/60'

const labelClass = 'font-mono-technical text-[8px] font-bold uppercase tracking-[0.22em] text-app-text/55'

const toggleClass = (active) =>
  `flex cursor-pointer items-start gap-2.5 rounded border px-3 py-2.5 transition ${
    active
      ? 'border-accent/50 bg-accent/10 text-green-400'
      : 'border-white/10 text-zinc-300 hover:border-accent/25 hover:text-zinc-100'
  }`

/**
 * @param {{
 *   addLog: (payload: Record<string, unknown>) => Promise<{ id: string }>
 * }} props
 */
export default function VbssDrillForm({ addLog }) {
  const { user } = useAuth()
  const uid = user?.uid ?? ''

  const [form, setForm] = useState(VBSS_INITIAL_FORM)
  const [saving, setSaving] = useState(false)
  const [submitOk, setSubmitOk] = useState(false)
  const [submitError, setSubmitError] = useState(/** @type {string | null} */ (null))

  const showCustomBoarding = form.boardingPoint === VBSS_CUSTOM
  const showCustomVessel = form.vesselType === VBSS_CUSTOM
  const showCustomSea = form.seaState === VBSS_CUSTOM

  const searchDurationSec = useMemo(() => {
    const text = invStr(form.searchDuration).trim().replace(',', '.')
    if (!text) return null
    const n = invNum(text)
    return Number.isFinite(n) && n > 0 ? n : null
  }, [form.searchDuration])

  const submitBlockedReason = useMemo(() => {
    if (saving) return null
    if (!uid) return 'OTURUM_GEREKLİ'
    if (!form.boardingPoint) return 'BOARDING_POINT_GEREKLİ'
    if (showCustomBoarding && !form.customBoardingPoint.trim()) return 'ÖZEL_GİRİŞ_NOKTASI_GEREKLİ'
    if (!form.vesselType) return 'VESSEL_TYPE_GEREKLİ'
    if (showCustomVessel && !form.customVesselType.trim()) return 'ÖZEL_GEMİ_TİPİ_GEREKLİ'
    if (searchDurationSec == null) return 'SEARCH_DURATION_ZORUNLU · SN > 0'
    if (!form.threatLevel) return 'THREAT_LEVEL_GEREKLİ'
    if (!form.seaState) return 'DENİZ_DURUMU_GEREKLİ'
    if (showCustomSea && !form.customSeaState.trim()) return 'ÖZEL_DENİZ_DURUMU_GEREKLİ'
    return null
  }, [
    saving,
    uid,
    form.boardingPoint,
    form.customBoardingPoint,
    form.vesselType,
    form.customVesselType,
    form.threatLevel,
    form.seaState,
    form.customSeaState,
    showCustomBoarding,
    showCustomVessel,
    showCustomSea,
    searchDurationSec,
  ])

  const canSubmit = submitBlockedReason == null

  const previewSuccessPercent = useMemo(() => {
    const parseSec = (raw) => {
      const text = invStr(raw).trim().replace(',', '.')
      if (!text) return null
      const n = invNum(text)
      return Number.isFinite(n) && n >= 0 ? n : null
    }
    return calculateVbssSuccessPercent({
      boardingTimeSec: parseSec(form.boardingTime),
      bridgeControlTimeSec: parseSec(form.bridgeControlTime),
      engineRoomControlTimeSec: parseSec(form.engineRoomControlTime),
      commsBlackoutSuccess: form.commsBlackoutSuccess,
      scuttlingAttempt: form.scuttlingAttempt,
      contrabandFound: form.contrabandFound,
      biometricCheck: form.biometricCheck,
      tacticalErrors: form.tacticalErrors,
    })
  }, [form])

  const patch = useCallback((/** @type {Partial<typeof VBSS_INITIAL_FORM>} */ next) => {
    setForm((f) => ({ ...f, ...next }))
    setSubmitOk(false)
    setSubmitError(null)
  }, [])

  const toggleTacticalError = (/** @type {string} */ errorId) => {
    setForm((f) => {
      const prev = Array.isArray(f.tacticalErrors) ? f.tacticalErrors : []
      const has = prev.includes(errorId)
      return { ...f, tacticalErrors: has ? prev.filter((id) => id !== errorId) : [...prev, errorId] }
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
      await submitVbssRecord({
        addLog,
        userId: uid,
        boardingPoint: form.boardingPoint,
        customBoardingPoint: form.customBoardingPoint,
        searchDuration: form.searchDuration,
        threatLevel: form.threatLevel,
        boardingTime: form.boardingTime,
        bridgeControlTime: form.bridgeControlTime,
        engineRoomControlTime: form.engineRoomControlTime,
        containmentTime: form.containmentTime,
        vesselType: form.vesselType,
        customVesselType: form.customVesselType,
        seaState: form.seaState,
        customSeaState: form.customSeaState,
        vesselSpeed: form.vesselSpeed,
        crewCount: Math.max(0, Math.floor(invNum(form.crewCount))),
        contrabandFound: form.contrabandFound,
        biometricCheck: form.biometricCheck,
        scuttlingAttempt: form.scuttlingAttempt,
        commsBlackoutSuccess: form.commsBlackoutSuccess,
        tacticalErrors: form.tacticalErrors,
        operationNote: form.operationNote,
      })
      setSubmitOk(true)
      setForm({ ...VBSS_INITIAL_FORM })
    } catch (err) {
      const code = err && typeof err === 'object' && 'code' in err ? String(err.code) : ''
      setSubmitError(`VBSS_KAYIT_BAŞARISIZ · YENİDEN_DENE${code ? ` · ${code}` : ''}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-2">
      <TacticalPanel className="relative border-accent/20 bg-app-bg/95 p-0">
        <p className="border-b border-accent/15 bg-app-bg px-4 py-2 font-mono-technical text-[9px] font-bold uppercase tracking-[0.28em] text-accent/90">
          VBSS METRİKLERİ · DENİZ OPERASYONU
        </p>
        <div className="space-y-4 p-4">
          <fieldset className="space-y-2">
            <legend className={labelClass}>BOARDING POINT *</legend>
            <select
              className={selectClass}
              value={form.boardingPoint}
              onChange={(e) => patch({ boardingPoint: e.target.value, customBoardingPoint: '' })}
              required
            >
              <option value="">— GİRİŞ NOKTASI —</option>
              {BOARDING_POINT_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
            {showCustomBoarding ? (
              <input
                className={inputClass}
                placeholder="Özel giriş noktası…"
                value={form.customBoardingPoint}
                onChange={(e) => patch({ customBoardingPoint: e.target.value })}
                required
              />
            ) : null}
          </fieldset>

          <fieldset className="space-y-2">
            <legend className={labelClass}>VESSEL TYPE *</legend>
            <select
              className={selectClass}
              value={form.vesselType}
              onChange={(e) => patch({ vesselType: e.target.value, customVesselType: '' })}
              required
            >
              <option value="">— GEMİ TİPİ —</option>
              {VESSEL_TYPE_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
            {showCustomVessel ? (
              <input
                className={inputClass}
                placeholder="Özel gemi tipi…"
                value={form.customVesselType}
                onChange={(e) => patch({ customVesselType: e.target.value })}
                required
              />
            ) : null}
          </fieldset>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className={labelClass}>SEARCH DURATION (SN) *</span>
              <input
                type="number"
                min={0.01}
                step={0.01}
                required
                className={`${inputClass} tabular-nums`}
                placeholder="45.50"
                value={form.searchDuration}
                onChange={(e) => patch({ searchDuration: e.target.value })}
              />
            </label>
            <label className="block space-y-1">
              <span className={labelClass}>THREAT LEVEL *</span>
              <select
                className={selectClass}
                value={form.threatLevel}
                onChange={(e) => patch({ threatLevel: e.target.value })}
                required
              >
                <option value="">— TEHDİT —</option>
                {THREAT_LEVEL_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <fieldset className="space-y-2">
            <legend className={labelClass}>DENİZ DURUMU *</legend>
            <select
              className={selectClass}
              value={form.seaState}
              onChange={(e) => patch({ seaState: e.target.value, customSeaState: '' })}
              required
            >
              <option value="">— DENİZ DURUMU —</option>
              {SEA_STATE_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
            {showCustomSea ? (
              <input
                className={inputClass}
                placeholder="Özel deniz durumu…"
                value={form.customSeaState}
                onChange={(e) => patch({ customSeaState: e.target.value })}
                required
              />
            ) : null}
          </fieldset>
        </div>
      </TacticalPanel>

      <TacticalPanel className="relative border-accent/25 bg-app-bg/95 p-0">
        <p className="border-b border-accent/15 bg-app-bg px-4 py-2 font-mono-technical text-[9px] font-bold uppercase tracking-[0.28em] text-app-text">
          TAKTİK SÜRELER · EK METRİKLER
        </p>
        <div className="space-y-4 p-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              ['boardingTime', 'GEMİYE ÇIKIŞ (SN)'],
              ['bridgeControlTime', 'KÖPRÜÜSTÜ (SN)'],
              ['engineRoomControlTime', 'MAKİNE D. (SN)'],
              ['containmentTime', 'EMNİYET (SN)'],
            ].map(([key, label]) => (
              <label key={key} className="block space-y-1">
                <span className={labelClass}>{label}</span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  className={`${inputClass} tabular-nums`}
                  value={form[key]}
                  onChange={(e) => patch({ [key]: e.target.value })}
                />
              </label>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className={labelClass}>GEMİ HIZI (KT)</span>
              <input
                type="number"
                min={0}
                step={0.1}
                className={`${inputClass} tabular-nums`}
                value={form.vesselSpeed}
                onChange={(e) => patch({ vesselSpeed: e.target.value })}
              />
            </label>
            <label className="block space-y-1">
              <span className={labelClass}>MÜRETTEBAT</span>
              <input
                type="number"
                min={0}
                step={1}
                className={`${inputClass} tabular-nums`}
                value={form.crewCount}
                onChange={(e) => patch({ crewCount: e.target.value })}
              />
            </label>
          </div>

          <div className="space-y-2 rounded border border-red-500/25 bg-red-950/10 p-3">
            <p className="font-mono-technical text-[8px] font-bold uppercase text-red-400/90">
              TAKTİK HATALAR
            </p>
            {VBSS_TACTICAL_ERROR_OPTIONS.map((opt) => (
              <label key={opt.id} className={toggleClass(form.tacticalErrors.includes(opt.id))}>
                <input
                  type="checkbox"
                  className="mt-1 size-4 accent-red-500"
                  checked={form.tacticalErrors.includes(opt.id)}
                  onChange={() => toggleTacticalError(opt.id)}
                />
                <span className="font-mono-technical text-xs leading-snug">{opt.label}</span>
              </label>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              ['contrabandFound', 'Kaçak malzeme'],
              ['biometricCheck', 'Biyometrik kimlik'],
              ['scuttlingAttempt', 'Batırma girişimi'],
              ['commsBlackoutSuccess', 'Telsiz kör etme'],
            ].map(([key, label]) => (
              <label key={key} className={toggleClass(form[key])}>
                <input
                  type="checkbox"
                  className="size-4 accent-accent"
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
          <p className="rounded border border-accent/40 bg-accent/10 px-3 py-2 text-center font-mono-technical text-[9px] font-bold uppercase text-accent">
            VBSS_KAYDI_AKTARILDI · VBSS_LOGS
          </p>
        ) : null}
        {submitError ? (
          <p className="rounded border border-red-500/40 bg-red-950/25 px-3 py-2 text-center font-mono-technical text-[9px] font-bold uppercase text-red-300">
            {submitError}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2 rounded border border-accent/15 bg-black/40 p-3">
          <SuccessScorePreview percent={previewSuccessPercent} />
          {submitBlockedReason && !saving ? (
            <p className="w-full rounded border border-amber-500/35 bg-amber-950/20 px-3 py-2 font-mono-technical text-[9px] font-bold uppercase text-amber-300/95">
              {submitBlockedReason}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={saving || !canSubmit}
            className="w-full rounded border border-accent/55 bg-accent/12 py-2.5 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-accent hover:bg-accent/20 disabled:opacity-40"
          >
            {saving ? 'AKTARILIYOR…' : 'VBSS_KAYDINI_ONAYLA'}
          </button>
        </div>
      </div>
    </form>
  )
}
