import { todayIsoDate, weaponDisplayName, weaponStokKodu } from '../../lib/weaponIlws'

const selectClass =
  'dossier-blood-select w-full rounded border border-accent/35 bg-app-bg py-2 pl-2 pr-8 font-mono-technical text-[10px] uppercase text-app-text outline-none'

const dateInputClass =
  'w-full rounded border border-accent bg-app-bg px-2 py-1.5 font-mono-technical text-[10px] text-accent outline-none [color-scheme:dark] focus:border-accent'

/**
 * @param {{
 *   open: boolean
 *   busy: boolean
 *   mountWeaponId: string
 *   logDate: string
 *   idleWeapons: Record<string, unknown>[]
 *   onMountWeaponIdChange: (value: string) => void
 *   onLogDateChange: (value: string) => void
 *   onClose: () => void
 *   onConfirm: (e: import('react').FormEvent) => void
 * }} props
 */
export default function AccessoryMountModal({
  open,
  busy,
  mountWeaponId,
  logDate,
  idleWeapons,
  onMountWeaponIdChange,
  onLogDateChange,
  onClose,
  onConfirm,
}) {
  if (!open) return null

  const disabled = busy
  const canConfirm = Boolean(mountWeaponId) && idleWeapons.length > 0

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="accessory-mount-modal-title"
    >
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Kapat" onClick={() => !disabled && onClose()} />
      <div className="relative z-[1] w-full max-w-md border border-accent bg-app-bg p-0 shadow-[0_0_24px_-8px_color-mix(in_srgb,var(--accent-color)_35%,transparent)]]">
        <div className="flex items-start justify-between gap-2 border-b border-accent/30 bg-app-bg px-3 py-2 sm:px-4">
          <div>
            <p
              id="accessory-mount-modal-title"
              className="font-mono-technical text-[10px] font-bold uppercase tracking-[0.28em] text-accent"
            >
              ⚡ MONTAJ_KONTROL · EYLEM_PENCERESİ
            </p>
            <p className="mt-0.5 font-mono-technical text-[7px] uppercase text-app-text/45">AKSESUAR · SİLAH_KİLİTLEME</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={disabled}
            className="shrink-0 rounded border border-white/15 px-2 py-1 font-mono-technical text-[9px] font-bold uppercase text-app-text/70 hover:border-accent/40 hover:text-accent disabled:opacity-40"
            aria-label="Kapat"
          >
            [ X ]
          </button>
        </div>

        <form onSubmit={onConfirm} className="space-y-3 px-3 py-3 sm:px-4 sm:py-4">
          <label className="block">
            <span className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.2em] text-accent/90">
              MONTAJ YAPILACAK SİLAH SEÇİMİ:
            </span>
            {idleWeapons.length === 0 ? (
              <p className="mt-2 rounded border border-amber-500/35 bg-amber-950/20 px-2 py-2 font-mono-technical text-[9px] uppercase text-amber-300">
                BOŞTA_SİLAH_YOK · ENVANTERDE_MÜSAİT_KAYIT_BULUNAMADI
              </p>
            ) : (
              <select
                className={`${selectClass} mt-1`}
                value={mountWeaponId}
                onChange={(e) => onMountWeaponIdChange(e.target.value)}
                disabled={disabled}
                required
              >
                <option value="">— SİLAH SEÇ —</option>
                {idleWeapons.map((w) => (
                  <option key={String(w.id)} value={String(w.id)}>
                    [{weaponStokKodu(String(w.id))}] {weaponDisplayName(w)}
                  </option>
                ))}
              </select>
            )}
          </label>
          <label className="block">
            <span className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.2em] text-app-text/55">İŞLEM_TARİHİ (KAYIT)</span>
            <input
              type="date"
              className={`${dateInputClass} mt-1`}
              value={logDate}
              max={todayIsoDate()}
              onChange={(e) => onLogDateChange(e.target.value)}
              disabled={disabled}
              required
            />
          </label>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-accent/20 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={disabled}
              className="rounded border border-white/15 px-3 py-1.5 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-app-text/70 hover:bg-white/5 disabled:opacity-40"
            >
              [ ESC: İPTAL ]
            </button>
            <button
              type="submit"
              disabled={disabled || !canConfirm}
              className="rounded border border-accent/55 bg-accent/15 px-3 py-1.5 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-accent shadow-[0_0_24px_-8px_color-mix(in_srgb,var(--accent-color)_35%,transparent)]] hover:bg-accent/25 disabled:opacity-50"
            >
              [ MONTAJI_ONAYLA_VE_KİLİTLE ]
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
