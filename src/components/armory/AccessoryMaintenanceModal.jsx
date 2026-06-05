import { ACCESSORY_MAINTENANCE_TYPES } from '../../lib/accessoryIlws'
import { todayIsoDate } from '../../lib/weaponIlws'

const selectClass =
  'dossier-blood-select w-full rounded border border-[#00FF41]/35 bg-[#0A0A0A] py-2 pl-2 pr-8 font-mono-technical text-[10px] uppercase text-white outline-none'

const dateInputClass =
  'w-full rounded border border-[#00FF41] bg-[#0A0A0A] px-2 py-1.5 font-mono-technical text-[10px] text-[#00FF41] outline-none [color-scheme:dark] focus:border-[#00FF41]'

const textareaClass =
  'mt-1 min-h-[5rem] w-full resize-y rounded border border-[#00FF41]/35 bg-[#0A0A0A] px-2 py-1.5 font-mono-technical text-[10px] normal-case text-slate-200 outline-none placeholder:text-slate-600 focus:border-[#00FF41]'

/**
 * @param {{
 *   open: boolean
 *   saving: boolean
 *   busy: boolean
 *   maintenanceType: string
 *   maintenanceDate: string
 *   maintenanceNote: string
 *   onMaintenanceTypeChange: (value: string) => void
 *   onMaintenanceDateChange: (value: string) => void
 *   onMaintenanceNoteChange: (value: string) => void
 *   onClose: () => void
 *   onSubmit: (e: import('react').FormEvent) => void
 * }} props
 */
export default function AccessoryMaintenanceModal({
  open,
  saving,
  busy,
  maintenanceType,
  maintenanceDate,
  maintenanceNote,
  onMaintenanceTypeChange,
  onMaintenanceDateChange,
  onMaintenanceNoteChange,
  onClose,
  onSubmit,
}) {
  if (!open) return null

  const disabled = saving || busy

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="accessory-maint-modal-title"
    >
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Kapat" onClick={() => !disabled && onClose()} />
      <div className="relative z-[1] w-full max-w-md border border-[#00FF41] bg-[#0A0A0A] p-0 shadow-[0_0_50px_rgba(0,255,65,0.2)]">
        <div className="flex items-start justify-between gap-2 border-b border-[#00FF41]/30 bg-[#050805] px-3 py-2 sm:px-4">
          <div>
            <p
              id="accessory-maint-modal-title"
              className="font-mono-technical text-[10px] font-bold uppercase tracking-[0.28em] text-[#00FF41]"
            >
              + YENİ TEKNİK KAYIT GİRİŞİ
            </p>
            <p className="mt-0.5 font-mono-technical text-[7px] uppercase text-slate-600">TEKNİK_BAKIM · ONARIM_GÜNLÜĞÜ</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={disabled}
            className="shrink-0 rounded border border-white/15 px-2 py-1 font-mono-technical text-[9px] font-bold uppercase text-slate-400 hover:border-[#00FF41]/40 hover:text-[#00FF41] disabled:opacity-40"
            aria-label="Kapat"
          >
            [ X ]
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-3 px-3 py-3 sm:px-4 sm:py-4">
          <label className="block">
            <span className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.2em] text-slate-500">BAKIM TÜRÜ</span>
            <select
              className={`${selectClass} mt-1`}
              value={maintenanceType}
              onChange={(e) => onMaintenanceTypeChange(e.target.value)}
              disabled={disabled}
              required
            >
              {ACCESSORY_MAINTENANCE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.2em] text-slate-500">TARİH</span>
            <input
              type="date"
              className={`${dateInputClass} mt-1`}
              value={maintenanceDate}
              max={todayIsoDate()}
              onChange={(e) => onMaintenanceDateChange(e.target.value)}
              disabled={disabled}
              required
            />
          </label>
          <label className="block">
            <span className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.2em] text-slate-500">TEKNİK AÇIKLAMA</span>
            <textarea
              className={textareaClass}
              placeholder="Teknik müdahale veya onarım detaylarını buraya işleyin..."
              value={maintenanceNote}
              onChange={(e) => onMaintenanceNoteChange(e.target.value)}
              disabled={disabled}
              rows={4}
            />
          </label>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#00FF41]/20 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={disabled}
              className="rounded border border-white/15 px-3 py-1.5 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-slate-400 hover:bg-white/5 disabled:opacity-40"
            >
              [ ESC: KAPAT ]
            </button>
            <button
              type="submit"
              disabled={disabled}
              className="rounded border border-[#00FF41]/55 bg-[#00FF41]/15 px-4 py-1.5 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-[#00FF41] shadow-[0_0_16px_rgba(0,255,65,0.25)] hover:bg-[#00FF41]/25 disabled:opacity-50"
            >
              {saving ? '…' : 'KAYDET'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
