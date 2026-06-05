import { useMemo, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import WeaponMaintenanceLogModal from './WeaponMaintenanceLogModal'
import { MAINTENANCE_ALERT_MESSAGE, isMaintenanceRequired } from '../../lib/weaponMaintenanceAlarm'
import { filterWeaponRows, weaponDisplayName, weaponStokKodu } from '../../lib/weaponIlws'

/**
 * @param {{
 *   weapons: Record<string, unknown>[]
 *   rangeLogs: Record<string, unknown>[]
 *   updateItem: (id: string, patch: Record<string, unknown>) => Promise<unknown>
 *   className?: string
 * }} props
 */
export default function WeaponMaintenanceAlarmPanel({ weapons, rangeLogs, updateItem, className = '' }) {
  const alarmWeapons = useMemo(() => weapons.filter(isMaintenanceRequired), [weapons])
  const [modalWeapon, setModalWeapon] = useState(/** @type {Record<string, unknown> | null} */ (null))

  if (alarmWeapons.length === 0) return null

  return (
    <>
      <div
        className={`weapon-maint-alarm space-y-2 rounded border border-red-500/55 bg-red-950/25 px-3 py-3 shadow-[inset_0_0_24px_rgba(239,68,68,0.12)] ${className}`.trim()}
        role="alert"
      >
        <p className="flex items-start gap-2 font-mono-technical text-[9px] font-bold uppercase leading-relaxed tracking-wide text-red-400">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 animate-pulse" aria-hidden />
          <span>[ ALERT: {MAINTENANCE_ALERT_MESSAGE} ]</span>
        </p>
        <ul className="space-y-1.5 border-t border-red-500/25 pt-2">
          {alarmWeapons.map((w) => (
            <li
              key={String(w.id)}
              className="flex flex-wrap items-center justify-between gap-2 rounded border border-red-500/30 bg-black/40 px-2 py-1.5"
            >
              <span className="font-mono-technical text-[8px] uppercase text-slate-300">
                <span className="text-red-400/90">[{weaponStokKodu(String(w.id))}]</span> {weaponDisplayName(w)}
              </span>
              <button
                type="button"
                onClick={() => setModalWeapon(w)}
                className="shrink-0 rounded border border-[#ffb400]/50 bg-[#ffb400]/10 px-2 py-1 font-mono-technical text-[8px] font-bold uppercase tracking-wider text-[#ffb400] hover:bg-[#ffb400]/20"
              >
                BAKIM KAYDI GİR
              </button>
            </li>
          ))}
        </ul>
      </div>

      <WeaponMaintenanceLogModal
        open={Boolean(modalWeapon)}
        weapon={modalWeapon}
        rangeLogs={rangeLogs}
        updateItem={updateItem}
        lockDismiss
        onSuccess={() => setModalWeapon(null)}
      />
    </>
  )
}

/** @param {{ inventory: Record<string, unknown>[], rangeLogs: Record<string, unknown>[], updateItem: Function, className?: string }} props */
export function WeaponMaintenanceAlarmFromInventory({ inventory, rangeLogs, updateItem, className }) {
  const weapons = useMemo(() => filterWeaponRows(inventory), [inventory])
  return (
    <WeaponMaintenanceAlarmPanel
      weapons={weapons}
      rangeLogs={rangeLogs}
      updateItem={updateItem}
      className={className}
    />
  )
}
