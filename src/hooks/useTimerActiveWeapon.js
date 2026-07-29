import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useHardware } from '../context/HardwareContext'
import { useAudazData } from './useAudazData'
import { getTacticalCategory } from '../lib/inventoryIlws'
import { filterWeaponRows } from '../lib/weaponIlws'
import {
  buildActiveWeaponSnapshot,
  readStoredActiveWeaponId,
  writeStoredActiveWeaponId,
} from '../lib/timerActiveWeapon'

/**
 * Timer aktif silah — envanter + MODE komutu + kalıcı seçim.
 */
export function useTimerActiveWeapon() {
  const { isConnected, sendCommand } = useHardware()
  const { items, loading, ready } = useAudazData('inventory')
  const weapons = useMemo(() => filterWeaponRows(items), [items])
  const [weaponId, setWeaponId] = useState(() => readStoredActiveWeaponId())
  const lastModeSentRef = useRef('')

  const selectedWeapon = useMemo(
    () => weapons.find((w) => String(w.id) === weaponId) ?? null,
    [weapons, weaponId],
  )

  const activeWeapon = useMemo(
    () => buildActiveWeaponSnapshot(selectedWeapon),
    [selectedWeapon],
  )

  const hasActiveWeapon = Boolean(activeWeapon)

  useEffect(() => {
    if (!ready || loading) return
    if (!weaponId) return
    if (weapons.some((w) => String(w.id) === weaponId)) return
    setWeaponId('')
    writeStoredActiveWeaponId('')
    lastModeSentRef.current = ''
  }, [loading, ready, weaponId, weapons])

  const pushModeCommand = useCallback(
    async (/** @type {Record<string, unknown> | null} */ weapon) => {
      if (!weapon || !isConnected) return false
      const code = getTacticalCategory(weapon)
      if (!code || code === 'OPT' || code === 'MHM') return false
      const line = `MODE:${code}`
      if (lastModeSentRef.current === line) return true
      const ok = await sendCommand(line)
      if (ok) lastModeSentRef.current = line
      return ok
    },
    [isConnected, sendCommand],
  )

  useEffect(() => {
    if (!isConnected) {
      lastModeSentRef.current = ''
      return
    }
    if (!selectedWeapon) return
    void pushModeCommand(selectedWeapon)
  }, [selectedWeapon, isConnected, pushModeCommand])

  const selectWeapon = useCallback(
    (/** @type {string} */ id) => {
      setWeaponId(id)
      writeStoredActiveWeaponId(id)
      lastModeSentRef.current = ''
      const weapon = weapons.find((w) => String(w.id) === id) ?? null
      if (weapon && isConnected) void pushModeCommand(weapon)
    },
    [isConnected, pushModeCommand, weapons],
  )

  return {
    weapons,
    weaponId,
    selectWeapon,
    selectedWeapon,
    activeWeapon,
    hasActiveWeapon,
    loading,
    ready,
    isConnected,
  }
}
