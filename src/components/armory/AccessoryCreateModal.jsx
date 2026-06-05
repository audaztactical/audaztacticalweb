import TacticalPanel from '../ui/TacticalPanel'
import { ACCESSORY_KINDS } from '../../lib/accessoryIlws'

const inputClass =
  'w-full border-0 border-b border-white/20 bg-transparent py-2 font-mono-technical text-sm text-slate-100 outline-none ring-0 placeholder:text-slate-600 focus:border-[#00FF41]/55'
const selectClass =
  'dossier-blood-select w-full rounded border border-[#00FF41]/30 bg-[#0A0A0A] py-2 pl-2 pr-1 font-mono-technical text-sm text-white outline-none'

/**
 * @param {{
 *   open: boolean
 *   saving: boolean
 *   form: {
 *     name: string
 *     accessoryKind: string
 *     technicalDescription: string
 *     brand: string
 *     serialNo: string
 *   }
 *   onClose: () => void
 *   onChange: (patch: Record<string, string>) => void
 *   onSubmit: (e: import('react').FormEvent) => void
 * }} props
 */
export default function AccessoryCreateModal({ open, saving, form, onClose, onChange, onSubmit }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Kapat" onClick={() => !saving && onClose()} />
      <TacticalPanel className="relative z-[1] w-full max-w-lg border-[#00FF41]/20 bg-[#0A0A0A]/98 p-0 shadow-2xl backdrop-blur-md">
        <div className="border-b border-white/10 bg-[#080808] px-3 py-2 sm:px-4">
          <p className="font-mono-technical text-[10px] font-bold uppercase tracking-[0.28em] text-[#00FF41]/90">
            + YENİ_AKSESUAR_KAYDI
          </p>
          <p className="mt-0.5 font-mono-technical text-[7px] uppercase text-slate-600">
            OPTİK · LAZER · FENER · TUTAMAK_SUSTURUCU
          </p>
        </div>
        <form onSubmit={onSubmit} className="space-y-3 px-3 py-3 sm:px-4 sm:py-4">
          <label className="block">
            <span className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.2em] text-slate-500">AKSESUAR_TÜRÜ</span>
            <select
              className={`${selectClass} mt-1`}
              value={form.accessoryKind}
              onChange={(e) => onChange({ accessoryKind: e.target.value })}
              required
            >
              {ACCESSORY_KINDS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.2em] text-slate-500">ÖĞE_ADI</span>
            <input className={inputClass} value={form.name} onChange={(e) => onChange({ name: e.target.value })} required />
          </label>
          <label className="block">
            <span className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.2em] text-slate-500">TEKNİK_TANIM</span>
            <textarea
              className={`${inputClass} min-h-[3rem] resize-y border border-white/10 bg-black/30 px-2 py-2`}
              value={form.technicalDescription}
              onChange={(e) => onChange({ technicalDescription: e.target.value })}
              rows={2}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.2em] text-slate-500">MARKA</span>
              <input className={inputClass} value={form.brand} onChange={(e) => onChange({ brand: e.target.value })} />
            </label>
            <label className="block">
              <span className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.2em] text-slate-500">SERİ_NO</span>
              <input className={inputClass} value={form.serialNo} onChange={(e) => onChange({ serialNo: e.target.value })} />
            </label>
          </div>
          <div className="flex flex-wrap justify-end gap-2 border-t border-white/10 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded border border-white/15 px-3 py-1.5 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-slate-400 hover:bg-white/5"
            >
              İPTAL
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded border border-[#00FF41]/45 bg-[#00FF41]/12 px-3 py-1.5 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-[#00FF41] disabled:opacity-50"
            >
              {saving ? '…' : 'KAYDET'}
            </button>
          </div>
        </form>
      </TacticalPanel>
    </div>
  )
}
