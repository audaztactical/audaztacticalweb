import TacticalPanel from '../ui/TacticalPanel'

const WEAPON_CATEGORIES = [
  { value: 'T_TAB', label: 'T_TAB · Taktik Tabanca' },
  { value: 'P_TFK', label: 'P_TFK · Piyade Tüfeği' },
  { value: 'AV_TFK', label: 'AV_TFK · Av Tüfeği' },
]

const inputClass =
  'w-full border-0 border-b border-white/20 bg-transparent py-2 font-mono-technical text-sm text-slate-100 outline-none ring-0 placeholder:text-app-text/45 focus:border-accent/55'
const selectClass =
  'dossier-blood-select w-full rounded border border-accent/30 bg-app-bg py-2 pl-2 pr-1 font-mono-technical text-sm text-app-text outline-none'

/**
 * @param {{
 *   open: boolean
 *   saving: boolean
 *   form: {
 *     name: string
 *     tacticalCategory: string
 *     technicalDescription: string
 *     brand: string
 *     serialNo: string
 *     calibre: string
 *   }
 *   onClose: () => void
 *   onChange: (patch: Record<string, string>) => void
 *   onSubmit: (e: import('react').FormEvent) => void
 * }} props
 */
export default function WeaponCreateModal({ open, saving, form, onClose, onChange, onSubmit }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto overscroll-y-contain bg-black/75 p-3 backdrop-blur-sm [-webkit-overflow-scrolling:touch] sm:flex sm:items-center sm:justify-center">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Kapat" onClick={() => !saving && onClose()} />
      <TacticalPanel className="relative z-[1] mx-auto my-3 w-full max-w-lg border-accent/20 bg-app-bg/98 p-0 shadow-2xl backdrop-blur-md sm:my-0">
        <div className="border-b border-white/10 bg-app-bg px-3 py-2 sm:px-4">
          <p className="font-mono-technical text-[10px] font-bold uppercase tracking-[0.28em] text-accent/90">
            + YENİ_SİLAH_KAYDI
          </p>
          <p className="mt-0.5 font-mono-technical text-[7px] uppercase text-app-text/45">P_TFK · T_TAB · AV_TFK · SİLAH_RAFI</p>
        </div>
        <form
          onSubmit={onSubmit}
          className="max-h-[calc(100dvh-5.5rem)] space-y-3 overflow-y-auto overscroll-contain px-3 py-3 [-webkit-overflow-scrolling:touch] sm:max-h-none sm:overflow-visible sm:px-4 sm:py-4"
        >
          <label className="block">
            <span className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.2em] text-app-text/55">SİLAH_TİPİ</span>
            <select
              className={`${selectClass} mt-1`}
              value={form.tacticalCategory}
              onChange={(e) => onChange({ tacticalCategory: e.target.value })}
              required
            >
              {WEAPON_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.2em] text-app-text/55">ÖĞE_ADI</span>
            <input className={inputClass} value={form.name} onChange={(e) => onChange({ name: e.target.value })} required />
          </label>
          <label className="block">
            <span className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.2em] text-app-text/55">TEKNİK_TANIM</span>
            <textarea
              className={`${inputClass} min-h-[3rem] resize-y border border-white/10 bg-black/30 px-2 py-2`}
              value={form.technicalDescription}
              onChange={(e) => onChange({ technicalDescription: e.target.value })}
              rows={2}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.2em] text-app-text/55">MARKA</span>
              <input className={inputClass} value={form.brand} onChange={(e) => onChange({ brand: e.target.value })} />
            </label>
            <label className="block">
              <span className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.2em] text-app-text/55">SERİ_NO</span>
              <input className={inputClass} value={form.serialNo} onChange={(e) => onChange({ serialNo: e.target.value })} />
            </label>
          </div>
          <label className="block">
            <span className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.2em] text-app-text/55">KALİBRE</span>
            <input className={inputClass} value={form.calibre} onChange={(e) => onChange({ calibre: e.target.value })} placeholder="9×19" />
          </label>
          <div className="flex flex-wrap justify-end gap-2 border-t border-white/10 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded border border-white/15 px-3 py-1.5 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-app-text/70 hover:bg-white/5"
            >
              İPTAL
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded border border-accent/45 bg-accent/12 px-3 py-1.5 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-accent disabled:opacity-50"
            >
              {saving ? '…' : 'KAYDET'}
            </button>
          </div>
        </form>
      </TacticalPanel>
    </div>
  )
}
