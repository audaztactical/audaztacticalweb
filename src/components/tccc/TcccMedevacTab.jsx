import { useMemo, useState } from 'react'
import { Radio, Send, Shield } from 'lucide-react'
import { buildMedevac9LinePayload, buildTacevacLogPayload } from '../../lib/medevacPayload'
import {
  MEDEVAC_NINE_LINE_INITIAL,
  MEDEVAC_SECURITY_OPTION_IDS,
  TACEVAC_EXTRACTION_VEHICLE_OPTIONS,
  TACEVAC_INITIAL_FORM,
  TACEVAC_WEAPON_PROFILE_IDS,
} from '../../lib/tcccHealthConstants'
import {
  evacOptionsFromMap,
  getEvacLocale,
} from '../../lib/tcccEvacLocales'

const MEDEVAC_EQUIPMENT_IDS = ['hoist', 'ventilator', 'oxygen']
const MEDEVAC_LZ_MARKING_IDS = ['smoke', 'strobe', 'ir_strobe', 'panels']
const MEDEVAC_SMOKE_COLOR_IDS = ['purple', 'yellow', 'green', 'red', 'white']
const MEDEVAC_PATIENT_STATUS_IDS = ['friendly', 'allied', 'pow', 'civilian']
const MEDEVAC_CBRN_IDS = ['none', 'nuclear', 'biological', 'chemical']
const TACEVAC_FIRE_IDS = ['cold_lz', 'hot_lz']
const TACEVAC_CAS_IDS = ['cas', 'indirect_fire']

const fieldClass =
  'w-full rounded border border-[#00FF41]/20 bg-black/60 px-3 py-2 font-mono-technical text-xs text-[#00FF41] placeholder:text-slate-600 focus:border-[#00FF41]/50 focus:outline-none focus:ring-1 focus:ring-[#00FF41]/20'

const tacevacFieldClass =
  'w-full rounded border border-[#ffb400]/20 bg-black/60 px-3 py-2 font-mono-technical text-xs text-[#ffb400] placeholder:text-slate-600 focus:border-[#ffb400]/50 focus:outline-none focus:ring-1 focus:ring-[#ffb400]/20'

const labelClass = 'font-mono-technical text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500'

/** @typedef {'medevac' | 'tacevac'} EvacMode */
/** @typedef {import('../../lib/tcccEvacLocales').TcccEvacLocale} TcccEvacLocale */

/**
 * @param {{
 *   options: { id: string; label: string }[]
 *   value: string
 *   onSelect: (id: string) => void
 *   name: string
 *   disabled?: boolean
 *   accent?: 'green' | 'amber'
 * }} props
 */
function TokenRow({ options, value, onSelect, name, disabled = false, accent = 'green' }) {
  const onCls =
    accent === 'amber'
      ? 'border-[#ffb400]/55 bg-[#ffb400]/12 text-[#ffb400]'
      : 'border-[#00FF41]/55 bg-[#00FF41]/12 text-[#00FF41]'
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label={name}>
      {options.map((opt) => {
        const on = value === opt.id
        return (
          <button
            key={opt.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(opt.id)}
            className={[
              'rounded border px-2 py-1 font-mono-technical text-[8px] font-bold uppercase tracking-wider transition',
              on ? onCls : 'border-white/12 bg-black/40 text-slate-500',
            ].join(' ')}
            aria-pressed={on}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

/**
 * @param {{
 *   L: ReturnType<typeof getEvacLocale>
 *   form: typeof MEDEVAC_NINE_LINE_INITIAL
 *   patch: (p: Partial<typeof MEDEVAC_NINE_LINE_INITIAL>) => void
 *   disabled?: boolean
 * }} props
 */
function MedevacNineLinePanel({ L, form, patch, disabled = false }) {
  const m = L.medevac

  const equipmentOptions = useMemo(
    () => evacOptionsFromMap(MEDEVAC_EQUIPMENT_IDS, m.equipment),
    [m.equipment]
  )
  const securityOptions = useMemo(
    () => evacOptionsFromMap(MEDEVAC_SECURITY_OPTION_IDS, m.security),
    [m.security]
  )
  const lzMarkingOptions = useMemo(
    () => evacOptionsFromMap(MEDEVAC_LZ_MARKING_IDS, m.lzMarking),
    [m.lzMarking]
  )
  const smokeColorOptions = useMemo(
    () => evacOptionsFromMap(MEDEVAC_SMOKE_COLOR_IDS, m.smokeColor),
    [m.smokeColor]
  )
  const patientStatusOptions = useMemo(
    () => evacOptionsFromMap(MEDEVAC_PATIENT_STATUS_IDS, m.patientStatus),
    [m.patientStatus]
  )
  const cbrnOptions = useMemo(() => evacOptionsFromMap(MEDEVAC_CBRN_IDS, m.cbrn), [m.cbrn])

  const hasEquipment = MEDEVAC_EQUIPMENT_IDS.some((id) => form.line4_medicalEquipment[id])

  const toggleEquipment = (/** @type {string} */ id) => {
    const key = /** @type {'hoist'|'ventilator'|'oxygen'} */ (id)
    patch({
      line4_medicalEquipment: {
        ...form.line4_medicalEquipment,
        [key]: !form.line4_medicalEquipment[key],
      },
    })
  }

  const appendCbrnToken = (/** @type {string} */ id) => {
    const label = m.cbrn[id] ?? id
    const current = form.line9_cbrnTerrain.trim()
    const tag = `KBRN: ${label}`
    if (current.includes(tag)) return
    patch({ line9_cbrnTerrain: current ? `${current} · ${tag}` : tag })
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <p className="lg:col-span-2 font-mono-technical text-[10px] font-bold uppercase tracking-[0.22em] text-[#00FF41]">
        {m.panelTitle}
      </p>

      <label className="block space-y-1 lg:col-span-2">
        <span className={labelClass}>{m.line1}</span>
        <input
          className={fieldClass}
          value={form.line1_pickupGrid}
          onChange={(e) => patch({ line1_pickupGrid: e.target.value })}
          placeholder={m.line1Placeholder}
          disabled={disabled}
        />
      </label>

      <label className="block space-y-1 lg:col-span-2">
        <span className={labelClass}>{m.line2}</span>
        <input
          className={fieldClass}
          value={form.line2_radioFreqCallsign}
          onChange={(e) => patch({ line2_radioFreqCallsign: e.target.value })}
          placeholder={m.line2Placeholder}
          disabled={disabled}
        />
      </label>

      <fieldset className="space-y-2 rounded-lg border border-[#00FF41]/15 bg-black/40 p-3 lg:col-span-2">
        <legend className={labelClass}>{m.line3}</legend>
        <div className="grid grid-cols-3 gap-2">
          {[
            ['urgent', m.line3Urgent],
            ['priority', m.line3Priority],
            ['routine', m.line3Routine],
          ].map(([key, label]) => (
            <label key={key} className="space-y-1">
              <span className="text-[8px] text-slate-600">{label}</span>
              <input
                type="number"
                min={0}
                className={fieldClass}
                value={form.line3_patientsPrecedence[key]}
                onChange={(e) =>
                  patch({
                    line3_patientsPrecedence: {
                      ...form.line3_patientsPrecedence,
                      [key]: e.target.value,
                    },
                  })
                }
                disabled={disabled}
              />
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2 rounded-lg border border-[#00FF41]/15 bg-black/40 p-3 lg:col-span-2">
        <legend className={labelClass}>{m.line4}</legend>
        {!hasEquipment ? (
          <p className="font-mono-technical text-[8px] text-slate-600">{m.line4NoneHint}</p>
        ) : null}
        <div className="flex flex-wrap gap-2" role="group" aria-label={m.line4Aria}>
          {equipmentOptions.map((opt) => {
            const key = /** @type {'hoist'|'ventilator'|'oxygen'} */ (opt.id)
            const on = Boolean(form.line4_medicalEquipment[key])
            return (
              <button
                key={opt.id}
                type="button"
                disabled={disabled}
                onClick={() => toggleEquipment(opt.id)}
                className={[
                  'rounded border px-2 py-1 font-mono-technical text-[8px] font-bold uppercase',
                  on
                    ? 'border-[#00FF41]/55 bg-[#00FF41]/12 text-[#00FF41]'
                    : 'border-white/12 text-slate-500',
                ].join(' ')}
                aria-pressed={on}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </fieldset>

      <fieldset className="space-y-2 rounded-lg border border-[#00FF41]/15 bg-black/40 p-3 lg:col-span-2">
        <legend className={labelClass}>{m.line5}</legend>
        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1">
            <span className="text-[8px] text-slate-600">{m.line5Litter}</span>
            <input
              type="number"
              min={0}
              className={fieldClass}
              value={form.line5_patientsType.litter}
              onChange={(e) =>
                patch({
                  line5_patientsType: { ...form.line5_patientsType, litter: e.target.value },
                })
              }
              disabled={disabled}
            />
          </label>
          <label className="space-y-1">
            <span className="text-[8px] text-slate-600">{m.line5Ambulatory}</span>
            <input
              type="number"
              min={0}
              className={fieldClass}
              value={form.line5_patientsType.ambulatory}
              onChange={(e) =>
                patch({
                  line5_patientsType: { ...form.line5_patientsType, ambulatory: e.target.value },
                })
              }
              disabled={disabled}
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="space-y-2 rounded-lg border border-[#00FF41]/15 bg-black/40 p-3 lg:col-span-2">
        <legend className={labelClass}>{m.line6}</legend>
        <TokenRow
          name={m.line6Aria}
          options={securityOptions}
          value={form.line6_pickupSecurity}
          onSelect={(id) => patch({ line6_pickupSecurity: id })}
          disabled={disabled}
        />
      </fieldset>

      <fieldset className="space-y-2 rounded-lg border border-[#00FF41]/15 bg-black/40 p-3 lg:col-span-2">
        <legend className={labelClass}>{m.line7}</legend>
        <TokenRow
          name={m.line7Aria}
          options={lzMarkingOptions}
          value={form.line7_lzMarking.method}
          onSelect={(id) =>
            patch({
              line7_lzMarking: { ...form.line7_lzMarking, method: id },
            })
          }
          disabled={disabled}
        />
        {form.line7_lzMarking.method === 'smoke' ? (
          <div className="mt-2 space-y-1">
            <span className="text-[8px] uppercase text-slate-600">{m.line7SmokeColor}</span>
            <TokenRow
              name={m.line7SmokeColorAria}
              options={smokeColorOptions}
              value={form.line7_lzMarking.smokeColor}
              onSelect={(id) =>
                patch({
                  line7_lzMarking: { ...form.line7_lzMarking, smokeColor: id },
                })
              }
              disabled={disabled}
            />
          </div>
        ) : null}
      </fieldset>

      <fieldset className="space-y-2 rounded-lg border border-[#00FF41]/15 bg-black/40 p-3 lg:col-span-2">
        <legend className={labelClass}>{m.line8}</legend>
        <TokenRow
          name={m.line8Aria}
          options={patientStatusOptions}
          value={form.line8_patientNationality}
          onSelect={(id) => patch({ line8_patientNationality: id })}
          disabled={disabled}
        />
        <input
          className={`${fieldClass} mt-2`}
          value={form.line8_patientNationality}
          onChange={(e) => patch({ line8_patientNationality: e.target.value })}
          placeholder={m.line8Placeholder}
          disabled={disabled}
        />
      </fieldset>

      <fieldset className="space-y-2 rounded-lg border border-[#00FF41]/15 bg-black/40 p-3 lg:col-span-2">
        <legend className={labelClass}>{m.line9}</legend>
        <TokenRow
          name="KBRN"
          options={cbrnOptions}
          value=""
          onSelect={appendCbrnToken}
          disabled={disabled}
        />
        <textarea
          rows={3}
          className={`${fieldClass} mt-2 resize-y`}
          value={form.line9_cbrnTerrain}
          onChange={(e) => patch({ line9_cbrnTerrain: e.target.value })}
          placeholder={m.line9Placeholder}
          disabled={disabled}
        />
      </fieldset>
    </div>
  )
}

/**
 * @param {{
 *   L: ReturnType<typeof getEvacLocale>
 *   form: typeof TACEVAC_INITIAL_FORM
 *   patch: (p: Partial<typeof TACEVAC_INITIAL_FORM>) => void
 *   disabled?: boolean
 * }} props
 */
function TacevacExtractionPanel({ L, form, patch, disabled = false }) {
  const t = L.tacevac

  const fireOptions = useMemo(() => evacOptionsFromMap(TACEVAC_FIRE_IDS, t.fire), [t.fire])
  const weaponOptions = useMemo(
    () => evacOptionsFromMap(TACEVAC_WEAPON_PROFILE_IDS, t.weapons),
    [t.weapons]
  )
  const casOptions = useMemo(() => evacOptionsFromMap(TACEVAC_CAS_IDS, t.cas), [t.cas])
  const vehicleOptions = useMemo(
    () =>
      TACEVAC_EXTRACTION_VEHICLE_OPTIONS.map((v) => ({
        id: v.id,
        label: t.vehicles[v.id] ?? v.label,
      })),
    [t.vehicles]
  )

  const toggleWeapon = (/** @type {string} */ id) => {
    const set = new Set(form.enemyWeaponProfiles)
    if (set.has(id)) set.delete(id)
    else set.add(id)
    patch({ enemyWeaponProfiles: [...set] })
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <p className="lg:col-span-2 font-mono-technical text-[10px] font-bold uppercase tracking-[0.22em] text-[#ffb400]">
        {t.panelTitle}
      </p>

      <label className="block space-y-1 lg:col-span-2">
        <span className={labelClass}>{t.pickupGrid}</span>
        <input
          className={tacevacFieldClass}
          value={form.pickupGrid}
          onChange={(e) => patch({ pickupGrid: e.target.value })}
          placeholder={t.pickupGridPlaceholder}
          disabled={disabled}
        />
      </label>

      <label className="block space-y-1 lg:col-span-2">
        <span className={labelClass}>{t.radio}</span>
        <input
          className={tacevacFieldClass}
          value={form.radioFreqCallsign}
          onChange={(e) => patch({ radioFreqCallsign: e.target.value })}
          placeholder={t.radioPlaceholder}
          disabled={disabled}
        />
      </label>

      <fieldset className="space-y-2 rounded-lg border border-[#ffb400]/20 bg-black/40 p-3 lg:col-span-2">
        <legend className={labelClass}>{t.fireStatus}</legend>
        <TokenRow
          name={t.fireStatusAria}
          accent="amber"
          options={fireOptions}
          value={form.activeFireStatus}
          onSelect={(id) => patch({ activeFireStatus: id })}
          disabled={disabled}
        />
      </fieldset>

      <label className="block space-y-1 lg:col-span-2">
        <span className={labelClass}>{t.threatLevel}</span>
        <input
          className={tacevacFieldClass}
          value={form.threatLevel}
          onChange={(e) => patch({ threatLevel: e.target.value })}
          placeholder={t.threatLevelPlaceholder}
          disabled={disabled}
        />
      </label>

      <fieldset className="space-y-2 rounded-lg border border-[#ffb400]/20 bg-black/40 p-3 lg:col-span-2">
        <legend className={labelClass}>{t.weaponsLegend}</legend>
        <div className="flex flex-wrap gap-2" role="group" aria-label={t.weaponsAria}>
          {weaponOptions.map((opt) => {
            const on = form.enemyWeaponProfiles.includes(opt.id)
            return (
              <button
                key={opt.id}
                type="button"
                disabled={disabled}
                onClick={() => toggleWeapon(opt.id)}
                className={[
                  'rounded border px-2 py-1 font-mono-technical text-[8px] font-bold uppercase',
                  on
                    ? 'border-[#ffb400]/55 bg-[#ffb400]/12 text-[#ffb400]'
                    : 'border-white/12 text-slate-500',
                ].join(' ')}
                aria-pressed={on}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
        <input
          className={`${tacevacFieldClass} mt-2`}
          value={form.enemyWeaponCustom}
          onChange={(e) => patch({ enemyWeaponCustom: e.target.value })}
          placeholder={t.weaponsCustomPlaceholder}
          disabled={disabled}
        />
      </fieldset>

      <fieldset className="space-y-2 rounded-lg border border-[#ffb400]/20 bg-black/40 p-3 lg:col-span-2">
        <legend className={labelClass}>{t.suppressiveLegend}</legend>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={form.suppressiveFireRequest}
            onChange={(e) =>
              patch({
                suppressiveFireRequest: e.target.checked,
                casSupportType: e.target.checked ? form.casSupportType : 'none',
              })
            }
            disabled={disabled}
            className="size-4 rounded border-[#ffb400]/40 accent-[#ffb400]"
          />
          <span className="font-mono-technical text-[10px] uppercase text-slate-300">{t.suppressiveCheckbox}</span>
        </label>
        {form.suppressiveFireRequest ? (
          <TokenRow
            name={t.casAria}
            accent="amber"
            options={casOptions}
            value={form.casSupportType === 'none' ? 'cas' : form.casSupportType}
            onSelect={(id) => patch({ casSupportType: id })}
            disabled={disabled}
          />
        ) : null}
      </fieldset>

      <fieldset className="space-y-2 rounded-lg border border-[#ffb400]/20 bg-black/40 p-3 lg:col-span-2">
        <legend className={labelClass}>{t.vehicleLegend}</legend>
        <select
          value={form.extractionVehicle}
          onChange={(e) => patch({ extractionVehicle: e.target.value })}
          disabled={disabled}
          className="dossier-blood-select w-full rounded-lg border border-[#ffb400]/25 bg-black/50 py-2 pl-2 pr-8 font-mono-technical text-xs uppercase text-[#ffb400] focus:border-[#ffb400]/50"
        >
          {vehicleOptions.map((v) => (
            <option key={v.id} value={v.id}>
              {v.label}
            </option>
          ))}
        </select>
      </fieldset>

      <label className="block space-y-1 lg:col-span-2">
        <span className={labelClass}>{t.operationalNotes}</span>
        <textarea
          rows={3}
          className={`${tacevacFieldClass} resize-y`}
          value={form.operationalNotes}
          onChange={(e) => patch({ operationalNotes: e.target.value })}
          placeholder={t.operationalNotesPlaceholder}
          disabled={disabled}
        />
      </label>
    </div>
  )
}

/**
 * @param {{
 *   disabled?: boolean
 *   userId: string
 *   addLog: (payload: Record<string, unknown>) => Promise<unknown>
 * }} props
 */
export default function TcccMedevacTab({ disabled = false, userId, addLog }) {
  /** Varsayılan `tr` — ileride global dil anahtarı `locale` state ile değiştirilecek */
  const [locale] = useState(/** @type {TcccEvacLocale} */ ('tr'))
  const L = useMemo(() => getEvacLocale(locale), [locale])

  const [evacMode, setEvacMode] = useState(/** @type {EvacMode} */ ('medevac'))
  const [medevacForm, setMedevacForm] = useState({ ...MEDEVAC_NINE_LINE_INITIAL })
  const [tacevacForm, setTacevacForm] = useState({ ...TACEVAC_INITIAL_FORM })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(/** @type {string | null} */ (null))

  const patchMedevac = (/** @type {Partial<typeof MEDEVAC_NINE_LINE_INITIAL>} */ p) => {
    setMedevacForm((f) => ({ ...f, ...p }))
    setSaved(false)
    setError(null)
  }

  const patchTacevac = (/** @type {Partial<typeof TACEVAC_INITIAL_FORM>} */ p) => {
    setTacevacForm((f) => ({ ...f, ...p }))
    setSaved(false)
    setError(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!userId) return
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      const payload =
        evacMode === 'medevac'
          ? buildMedevac9LinePayload(medevacForm, userId)
          : buildTacevacLogPayload(tacevacForm, userId)
      await addLog(payload)
      setSaved(true)
      if (evacMode === 'medevac') setMedevacForm({ ...MEDEVAC_NINE_LINE_INITIAL })
      else setTacevacForm({ ...TACEVAC_INITIAL_FORM })
    } catch {
      setError(evacMode === 'medevac' ? L.errorMedevac : L.errorTacevac)
    } finally {
      setSaving(false)
    }
  }

  const isMedevac = evacMode === 'medevac'

  return (
    <form
      onSubmit={handleSubmit}
      className={[
        'space-y-4 rounded-xl border bg-black/55 p-4 font-mono-technical shadow-[inset_0_0_32px_rgba(0,0,0,0.2)] sm:p-5',
        isMedevac ? 'border-[#00FF41]/20' : 'border-[#ffb400]/25',
      ].join(' ')}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          {isMedevac ? (
            <Radio className="size-5 text-[#00FF41]" strokeWidth={1.5} aria-hidden />
          ) : (
            <Shield className="size-5 text-[#ffb400]" strokeWidth={1.5} aria-hidden />
          )}
          <span
            className={[
              'text-xs font-bold uppercase tracking-[0.28em]',
              isMedevac ? 'text-[#00FF41]' : 'text-[#ffb400]',
            ].join(' ')}
          >
            {isMedevac ? L.medevacHeader : L.tacevacHeader}
          </span>
        </div>
        <div className="flex gap-1" role="group" aria-label={L.evacModeAria}>
          {(
            [
              ['medevac', L.modeMedevac],
              ['tacevac', L.modeTacevac],
            ]
          ).map(([id, label]) => {
            const on = evacMode === id
            return (
              <button
                key={id}
                type="button"
                disabled={disabled}
                onClick={() => setEvacMode(/** @type {EvacMode} */ (id))}
                className={[
                  'rounded border px-3 py-1.5 text-[8px] font-bold uppercase tracking-wider transition',
                  on && id === 'medevac'
                    ? 'border-[#00FF41]/60 bg-[#00FF41]/12 text-[#00FF41]'
                    : on && id === 'tacevac'
                      ? 'border-[#ffb400]/60 bg-[#ffb400]/12 text-[#ffb400]'
                      : 'border-white/10 text-slate-600 hover:text-slate-400',
                ].join(' ')}
                aria-pressed={on}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {isMedevac ? (
        <MedevacNineLinePanel L={L} form={medevacForm} patch={patchMedevac} disabled={disabled} />
      ) : (
        <TacevacExtractionPanel L={L} form={tacevacForm} patch={patchTacevac} disabled={disabled} />
      )}

      <button
        type="submit"
        disabled={disabled || saving}
        className={[
          'inline-flex w-full items-center justify-center gap-2 rounded-lg border py-3 text-sm font-bold uppercase disabled:opacity-40',
          isMedevac
            ? 'border-[#00FF41]/50 bg-[#00FF41]/10 text-[#00FF41]'
            : 'border-[#ffb400]/50 bg-[#ffb400]/10 text-[#ffb400]',
        ].join(' ')}
      >
        <Send className="size-4" aria-hidden />
        {saving ? L.submitSending : isMedevac ? L.submitMedevac : L.submitTacevac}
      </button>

      {saved ? (
        <p
          className={[
            'text-center text-[10px] font-bold uppercase',
            isMedevac ? 'text-[#00FF41]' : 'text-[#ffb400]',
          ].join(' ')}
        >
          {isMedevac ? L.savedMedevac : L.savedTacevac}
        </p>
      ) : null}
      {error ? <p className="text-center text-[10px] font-bold uppercase text-red-400">{error}</p> : null}
    </form>
  )
}
