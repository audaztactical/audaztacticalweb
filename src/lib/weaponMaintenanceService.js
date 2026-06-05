import { invStr } from './inventoryIlws'
import {
  getEffectiveTotalRoundsFired,
  getWeaponMaintenanceLogs,
  MAINTENANCE_TYPES,
  todayIsoDate,
} from './weaponIlws'
import { buildMaintenanceClearedPatch } from './weaponMaintenanceAlarm'

/**
 * @param {{
 *   updateItem: (id: string, patch: Record<string, unknown>) => Promise<unknown>
 *   weapon: Record<string, unknown>
 *   rangeLogs: Record<string, unknown>[]
 *   maintenanceType: string
 *   date: string
 *   cleanedBy: string
 *   note: string
 * }} p
 */
export async function submitWeaponMaintenanceLog({
  updateItem,
  weapon,
  rangeLogs,
  maintenanceType,
  date,
  cleanedBy,
  note,
}) {
  const id = String(weapon.id)
  const savedDate = invStr(date).slice(0, 10) || todayIsoDate()
  const type = invStr(maintenanceType).trim() || MAINTENANCE_TYPES[0]
  const totalRounds = getEffectiveTotalRoundsFired(weapon, rangeLogs)

  const entry = {
    date: savedDate,
    rounds_at_maintenance: totalRounds,
    maintenanceType: type,
    note: note.trim(),
    cleanedBy: cleanedBy.trim() || null,
  }

  const prev = getWeaponMaintenanceLogs(weapon)
  const nextLogs = [entry, ...prev]

  await updateItem(id, {
    ...buildMaintenanceClearedPatch(weapon),
    maintenance_logs: nextLogs,
    lastMaintenanceAt: savedDate,
    auditLogCode: 'CEP_GNC',
    auditLogMsg: `${invStr(weapon.name) || 'SİLAH'} · BAKIM · ${type}`,
  })

  return entry
}
