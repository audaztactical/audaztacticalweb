import TacticalPanel from '../ui/TacticalPanel'
import { ACCESSORY_KINDS } from '../../lib/accessoryIlws'

const labelClass =
  'block font-mono-technical text-xs font-bold uppercase tracking-[0.2em] text-app-text/55 sm:text-[8px]'
const inputClass =
  'w-full border-0 border-b border-white/20 bg-transparent py-1.5 px-2 font-mono-technical text-xs text-slate-100 outline-none ring-0 placeholder:text-app-text/45 focus:border-accent/55 sm:py-2 sm:px-3 sm:text-sm'
const selectClass =
  'dossier-blood-select w-full rounded border border-accent/30 bg-app-bg py-1.5 px-2 font-mono-technical text-xs text-app-text outline-none sm:py-2 sm:px-3 sm:text-sm'
const textareaClass = `${inputClass} min-h-[2.5rem] resize-y border border-white/10 bg-black/30 sm:min-h-[3rem]`
const actionBarClass =
  'sticky bottom-0 z-10 flex w-full gap-2 border-t border-white/10 bg-app-bg/95 px-3 py-2 backdrop-blur-sm sm:justify-end sm:px-4 sm:py-3'
const cancelBtnClass =
  'flex-1 rounded border border-white/15 px-2 py-2 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-app-text/70 hover:bg-white/5 sm:flex-none sm:px-3 sm:py-1.5'
const submitBtnClass =
  'flex-1 rounded border border-accent/45 bg-accent/12 px-2 py-2 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-accent disabled:opacity-50 sm:flex-none sm:px-3 sm:py-1.5'

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
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/75 p-3 backdrop-blur-sm sm:items-center sm:overflow-y-auto sm:overscroll-y-contain sm:[-webkit-overflow-scrolling:touch]">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Kapat" onClick={() => !saving && onClose()} />
      <TacticalPanel className="relative z-[1] flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden border-accent/20 bg-app-bg/98 p-0 shadow-2xl backdrop-blur-md sm:my-3 sm:max-h-none">
        <div className="shrink-0 border-b border-white/10 bg-app-bg px-3 py-1.5 sm:px-4 sm:py-2">
          <p className="font-mono-technical text-[10px] font-bold uppercase tracking-[0.28em] text-accent/90">
            + YENİ_AKSESUAR_KAYDI
          </p>
          <p className="mt-0.5 font-mono-technical text-[7px] uppercase text-app-text/45">
            OPTİK · LAZER · FENER · TUTAMAK_SUSTURUCU
          </p>
        </div>
        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex flex-1 flex-col gap-2 overflow-y-auto overscroll-contain px-3 py-2 [-webkit-overflow-scrolling:touch] sm:gap-3 sm:px-4 sm:py-4">
            <label className="block space-y-1">
              <span className={labelClass}>AKSESUAR_TÜRÜ</span>
              <select
                className={selectClass}
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
            <label className="block space-y-1">
              <span className={labelClass}>ÖĞE_ADI</span>
              <input className={inputClass} value={form.name} onChange={(e) => onChange({ name: e.target.value })} required />
            </label>
            <label className="block space-y-1">
              <span className={labelClass}>TEKNİK_TANIM</span>
              <textarea
                className={textareaClass}
                value={form.technicalDescription}
                onChange={(e) => onChange({ technicalDescription: e.target.value })}
                rows={2}
              />
            </label>
            <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
              <label className="block space-y-1">
                <span className={labelClass}>MARKA</span>
                <input className={inputClass} value={form.brand} onChange={(e) => onChange({ brand: e.target.value })} />
              </label>
              <label className="block space-y-1">
                <span className={labelClass}>SERİ_NO</span>
                <input className={inputClass} value={form.serialNo} onChange={(e) => onChange({ serialNo: e.target.value })} />
              </label>
            </div>
          </div>
          <div className={actionBarClass}>
            <button type="button" onClick={onClose} disabled={saving} className={cancelBtnClass}>
              İPTAL
            </button>
            <button type="submit" disabled={saving} className={submitBtnClass}>
              {saving ? '…' : 'KAYDET'}
            </button>
          </div>
        </form>
      </TacticalPanel>
    </div>
  )
}
