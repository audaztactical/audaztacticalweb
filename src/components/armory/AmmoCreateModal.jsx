import TacticalPanel from '../ui/TacticalPanel'

const inputClass =
  'w-full border-0 border-b border-white/20 bg-transparent py-2 font-mono-technical text-sm text-slate-100 outline-none ring-0 placeholder:text-app-text/45 focus:border-accent/55'

/**
 * @param {{
 *   open: boolean
 *   saving: boolean
 *   form: { caliberName: string, calibre: string, initialStock: string, unitPrice: string, criticalThreshold: string }
 *   onClose: () => void
 *   onChange: (patch: Record<string, string>) => void
 *   onSubmit: (e: import('react').FormEvent) => void
 * }} props
 */
export default function AmmoCreateModal({ open, saving, form, onClose, onChange, onSubmit }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Kapat" onClick={() => !saving && onClose()} />
      <TacticalPanel className="relative z-[1] w-full max-w-lg border-accent/20 bg-app-bg/98 p-0 shadow-2xl backdrop-blur-md">
        <div className="border-b border-white/10 bg-app-bg px-3 py-2 sm:px-4">
          <p className="font-mono-technical text-[10px] font-bold uppercase tracking-[0.28em] text-accent/90">
            + YENİ_MÜHİMMAT_KAYDI
          </p>
          <p className="mt-0.5 font-mono-technical text-[7px] uppercase text-app-text/45">MHM · KALİBRE · STOK</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-3 px-3 py-3 sm:px-4 sm:py-4">
          <label className="block">
            <span className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.2em] text-app-text/55">KALİBRE_ADI (GÖRÜNEN)</span>
            <input
              className={inputClass}
              placeholder="9x19mm Parabellum"
              value={form.caliberName}
              onChange={(e) => onChange({ caliberName: e.target.value })}
              required
            />
          </label>
          <label className="block">
            <span className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.2em] text-app-text/55">KALİBRE_KODU</span>
            <input
              className={inputClass}
              placeholder="9x19"
              value={form.calibre}
              onChange={(e) => onChange({ calibre: e.target.value })}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.2em] text-app-text/55">BAŞLANGIÇ_STOK</span>
              <input
                type="number"
                min={0}
                className={inputClass}
                value={form.initialStock}
                onChange={(e) => onChange({ initialStock: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.2em] text-app-text/55">BİRİM_FİYAT</span>
              <input
                type="number"
                min={0}
                step="0.01"
                className={inputClass}
                placeholder="0.00"
                value={form.unitPrice}
                onChange={(e) => onChange({ unitPrice: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.2em] text-app-text/55">KRİTİK_EŞİK</span>
              <input
                type="number"
                min={1}
                className={inputClass}
                value={form.criticalThreshold}
                onChange={(e) => onChange({ criticalThreshold: e.target.value })}
              />
            </label>
          </div>
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
