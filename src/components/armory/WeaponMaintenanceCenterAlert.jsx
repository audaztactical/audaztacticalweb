import { AlertTriangle } from 'lucide-react'
import { MAINTENANCE_ALERT_MESSAGE, isMaintenanceRequired } from '../../lib/weaponMaintenanceAlarm'
import { weaponDisplayName } from '../../lib/weaponIlws'

/**
 * @param {{
 *   weapon: Record<string, unknown>
 *   onOpenMaintenance: () => void
 * }} props
 */
export default function WeaponMaintenanceCenterAlert({ weapon, onOpenMaintenance }) {
  if (!isMaintenanceRequired(weapon)) return null

  return (
    <div className="weapon-maint-alarm mx-3 mt-3 rounded border border-red-500/60 bg-red-950/35 px-3 py-2.5">
      <p className="flex items-start gap-2 font-mono-technical text-[8px] font-bold uppercase leading-snug tracking-wide text-red-400">
        <AlertTriangle className="size-3.5 shrink-0 animate-pulse" aria-hidden />
        <span>[ ALERT: {MAINTENANCE_ALERT_MESSAGE} ]</span>
      </p>
      <p className="mt-1 font-mono-technical text-[7px] uppercase text-slate-500">{weaponDisplayName(weapon)}</p>
      <button
        type="button"
        onClick={onOpenMaintenance}
        className="mt-2 w-full rounded border border-[#ffb400]/55 bg-[#ffb400]/12 py-1.5 font-mono-technical text-[8px] font-bold uppercase tracking-wider text-[#ffb400] hover:bg-[#ffb400]/18"
      >
        BAKIM KAYDI GİR · ALARMI KAPAT
      </button>
    </div>
  )
}
