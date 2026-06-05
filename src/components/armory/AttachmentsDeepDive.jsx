import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import AccessoryMaintenanceModal from './AccessoryMaintenanceModal'
import AccessoryMountModal from './AccessoryMountModal'
import MatrixWireVisualizer from './MatrixWireVisualizer'
import TacticalPanel from '../ui/TacticalPanel'
import {
  ACCESSORY_MAINTENANCE_TYPES,
  accessoryDisplayName,
  accessoryStokKodu,
  getAccessoryCreatedAt,
  getAccessoryMaintenanceLogs,
  getAccessoryMountStatusLabel,
  getMountedWeaponId,
  isAccessoryIdle,
  isAccessoryMounted,
  localizedAccessoryTypeLabel,
} from '../../lib/accessoryIlws'
import { filterAuditForAccessory, resolveAuditEntryDisplay } from '../../lib/armoryAuditTrail'
import { syncDetachAccessory, syncMountAccessory } from '../../lib/armoryMountSync'
import {
  getAttachedAccessoryId,
  isWeaponIdleForAccessoryMount,
  todayIsoDate,
} from '../../lib/weaponIlws'
import { matchesIsoDateRange, matchesTypeFilter } from '../../lib/logSummaryFilters'

const dateInputClass =
  'w-full rounded border border-[#00FF41] bg-[#0A0A0A] px-2 py-1.5 font-mono-technical text-[10px] text-[#00FF41] outline-none [color-scheme:dark] focus:border-[#00FF41]'

const filterSelectClass =
  'dossier-blood-select mt-0.5 w-full rounded border border-[#00FF41]/35 bg-[#0A0A0A] py-1 pl-1.5 pr-6 font-mono-technical text-[8px] uppercase text-white outline-none'

const filterDateClass =
  'mt-0.5 w-full rounded border border-[#00FF41]/50 bg-[#0A0A0A] px-1.5 py-1 font-mono-technical text-[8px] text-[#00FF41] outline-none [color-scheme:dark]'

const DEPLOY_ACTION_FILTERS = [
  { value: 'ALL', label: 'TÜM İŞLEMLER' },
  { value: 'MONTAJ', label: 'MONTAJ' },
  { value: 'SÖKME', label: 'SÖKME' },
]

const panelScroll = 'ilws-green-scroll min-h-0 overflow-y-auto overscroll-y-contain'

const terminalGrid =
  'grid max-h-[calc(100vh-180px)] min-h-[26rem] gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_minmax(0,1.4fr)]'

/**
 * @param {{
 *   accessories: Record<string, unknown>[]
 *   weapons: Record<string, unknown>[]
 *   imageSrc: string
 *   auditEntries: Record<string, unknown>[]
 *   onBack: () => void
 *   onAddAccessory: () => void
 *   updateItem: (id: string, patch: Record<string, unknown>) => Promise<unknown>
 *   deleteItem: (id: string) => Promise<unknown>
 *   commitDeploymentBatch: (ops: {
 *     inventoryUpdates: { docId: string, patch: Record<string, unknown> }[]
 *     auditEntries: Record<string, unknown>[]
 *   }) => Promise<unknown>
 * }} props
 */
export default function AttachmentsDeepDive({
  accessories,
  weapons,
  imageSrc,
  auditEntries,
  onBack,
  onAddAccessory,
  updateItem,
  deleteItem,
  commitDeploymentBatch,
}) {
  const [selectedId, setSelectedId] = useState(/** @type {string | null} */ (null))
  const [mountWeaponId, setMountWeaponId] = useState('')
  const [logDate, setLogDate] = useState(todayIsoDate)
  const [techMaintType, setTechMaintType] = useState(ACCESSORY_MAINTENANCE_TYPES[0])
  const [techMaintDate, setTechMaintDate] = useState(todayIsoDate)
  const [techMaintNote, setTechMaintNote] = useState('')
  const [techMaintSaving, setTechMaintSaving] = useState(false)
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false)
  const [isMountModalOpen, setIsMountModalOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [deployActionFilter, setDeployActionFilter] = useState('ALL')
  const [deployDateFrom, setDeployDateFrom] = useState('')
  const [deployDateTo, setDeployDateTo] = useState('')
  const [techTypeFilter, setTechTypeFilter] = useState('ALL')
  const [techDateFrom, setTechDateFrom] = useState('')
  const [techDateTo, setTechDateTo] = useState('')
  const [rightTab, setRightTab] = useState(/** @type {'deploy' | 'maint'} */ ('deploy'))
  const [isViewingLogs, setIsViewingLogs] = useState(false)
  const [centerLogStream, setCenterLogStream] = useState(/** @type {'deploy' | 'maint'} */ ('deploy'))

  const selected = useMemo(
    () => accessories.find((a) => String(a.id) === selectedId) ?? accessories[0] ?? null,
    [accessories, selectedId]
  )

  useEffect(() => {
    if (accessories.length === 0) {
      setSelectedId(null)
      return
    }
    if (!selectedId || !accessories.some((a) => String(a.id) === selectedId)) {
      setSelectedId(String(accessories[0].id))
    }
  }, [accessories, selectedId])

  useEffect(() => {
    setLogDate(todayIsoDate())
    setTechMaintDate(todayIsoDate())
    setTechMaintType(ACCESSORY_MAINTENANCE_TYPES[0])
    setTechMaintNote('')
    setMountWeaponId('')
    setDeployActionFilter('ALL')
    setDeployDateFrom('')
    setDeployDateTo('')
    setTechTypeFilter('ALL')
    setTechDateFrom('')
    setTechDateTo('')
    setIsViewingLogs(false)
    setCenterLogStream('deploy')
    setIsMaintenanceModalOpen(false)
    setIsMountModalOpen(false)
  }, [selectedId])

  const openCenterLogs = useCallback((stream) => {
    setCenterLogStream(stream)
    setIsViewingLogs(true)
  }, [])

  const resetMaintenanceForm = useCallback(() => {
    setTechMaintType(ACCESSORY_MAINTENANCE_TYPES[0])
    setTechMaintDate(todayIsoDate())
    setTechMaintNote('')
  }, [])

  const closeMaintenanceModal = useCallback(() => {
    if (techMaintSaving) return
    setIsMaintenanceModalOpen(false)
    resetMaintenanceForm()
  }, [techMaintSaving, resetMaintenanceForm])

  const closeMountModal = useCallback(() => {
    if (busy) return
    setIsMountModalOpen(false)
    setMountWeaponId('')
  }, [busy])

  useEffect(() => {
    if (!isMaintenanceModalOpen && !isMountModalOpen) return
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return
      if (isMountModalOpen) closeMountModal()
      else closeMaintenanceModal()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isMaintenanceModalOpen, isMountModalOpen, closeMaintenanceModal, closeMountModal])

  const mountedWeapon = useMemo(() => {
    if (!selected) return null
    const wid = getMountedWeaponId(selected)
    if (!wid) return null
    return weapons.find((w) => String(w.id) === wid) ?? null
  }, [selected, weapons])

  const entryDate = selected ? getAccessoryCreatedAt(selected) : '—'
  const typeLabel = selected ? localizedAccessoryTypeLabel(selected) : '—'
  const mounted = selected ? isAccessoryMounted(selected) : false
  const statusLabel = selected ? getAccessoryMountStatusLabel(selected, mountedWeapon) : '—'

  const deploymentHistory = useMemo(() => {
    if (!selected?.id) return []
    return filterAuditForAccessory(auditEntries, String(selected.id)).map((entry) =>
      resolveAuditEntryDisplay(entry, weapons, accessories)
    )
  }, [auditEntries, selected, weapons, accessories])

  const technicalMaintenanceLogs = useMemo(() => {
    if (!selected) return []
    return getAccessoryMaintenanceLogs(selected)
  }, [selected])

  const filteredDeploymentHistory = useMemo(() => {
    return deploymentHistory.filter(
      (log) =>
        matchesTypeFilter(log.action_type, deployActionFilter) &&
        matchesIsoDateRange(log.date, deployDateFrom, deployDateTo)
    )
  }, [deploymentHistory, deployActionFilter, deployDateFrom, deployDateTo])

  const filteredTechnicalLogs = useMemo(() => {
    return technicalMaintenanceLogs.filter(
      (log) =>
        matchesTypeFilter(log.maintenanceType, techTypeFilter) &&
        matchesIsoDateRange(log.date, techDateFrom, techDateTo)
    )
  }, [technicalMaintenanceLogs, techTypeFilter, techDateFrom, techDateTo])

  const idleWeaponsForMount = useMemo(
    () => weapons.filter(isWeaponIdleForAccessoryMount),
    [weapons]
  )

  const inventoryStats = useMemo(() => {
    let mountedCount = 0
    let idleCount = 0
    for (const row of accessories) {
      if (isAccessoryMounted(row)) mountedCount += 1
      else idleCount += 1
    }
    return { total: accessories.length, mounted: mountedCount, idle: idleCount }
  }, [accessories])

  const submitTechnicalMaintenance = useCallback(
    async (e) => {
      e.preventDefault()
      if (!selected?.id) return
      const id = String(selected.id)
      const savedDate = techMaintDate.trim() || todayIsoDate()
      const entry = {
        date: savedDate,
        maintenanceType: techMaintType,
        note: techMaintNote.trim(),
      }
      const prev = getAccessoryMaintenanceLogs(selected)
      setTechMaintSaving(true)
      try {
        await updateItem(id, {
          maintenance_logs: [entry, ...prev],
          lastMaintenanceAt: savedDate,
          auditLogCode: 'CEP_GNC',
          auditLogMsg: `TEKNİK_BAKIM · ${techMaintType}`,
        })
        setIsMaintenanceModalOpen(false)
        resetMaintenanceForm()
      } finally {
        setTechMaintSaving(false)
      }
    },
    [selected, techMaintDate, techMaintType, techMaintNote, updateItem, resetMaintenanceForm]
  )

  const confirmMountAccessory = useCallback(
    async (e) => {
      e.preventDefault()
      if (!selected?.id || !mountWeaponId) return
      const weapon = weapons.find((w) => String(w.id) === mountWeaponId)
      if (!weapon) return
      if (!isAccessoryIdle(selected)) return
      if (!isWeaponIdleForAccessoryMount(weapon)) return

      const prevAttachedId = getAttachedAccessoryId(weapon)
      const previousAccessory = prevAttachedId
        ? accessories.find((a) => String(a.id) === prevAttachedId) ?? null
        : null

      const savedDate = logDate.trim() || todayIsoDate()
      setBusy(true)
      try {
        await syncMountAccessory({
          commitDeploymentBatch,
          accessory: selected,
          weapon,
          logDate: savedDate,
          previousAccessoryOnWeapon: previousAccessory,
        })
        setIsMountModalOpen(false)
        setMountWeaponId('')
      } finally {
        setBusy(false)
      }
    },
    [selected, mountWeaponId, weapons, accessories, logDate, commitDeploymentBatch]
  )

  const detachAccessory = useCallback(async () => {
    if (!selected?.id || !mounted) return
    const savedDate = logDate.trim() || todayIsoDate()
    setBusy(true)
    try {
      await syncDetachAccessory({
        commitDeploymentBatch,
        accessory: selected,
        weapon: mountedWeapon,
        logDate: savedDate,
      })
    } finally {
      setBusy(false)
    }
  }, [selected, mounted, mountedWeapon, logDate, commitDeploymentBatch])

  const deleteAccessory = useCallback(
    async (row, e) => {
      e.stopPropagation()
      const id = String(row.id)
      const label = accessoryDisplayName(row)
      const ok = window.confirm(`AKSESUAR ENVANTERDEN TAMAMEN ÇIKARILSIN MI?\n\n[${accessoryStokKodu(id)}] ${label}\n\nMontaj geçmişi kayıt defterinde kalır.`)
      if (!ok) return
      setBusy(true)
      try {
        const wid = getMountedWeaponId(row)
        if (wid) {
          const weapon = weapons.find((w) => String(w.id) === wid)
          if (weapon) {
            await syncDetachAccessory({
              commitDeploymentBatch,
              accessory: row,
              weapon,
              logDate: todayIsoDate(),
            })
          }
        }
        await deleteItem(id)
        if (selectedId === id) setSelectedId(null)
      } finally {
        setBusy(false)
      }
    },
    [deleteItem, weapons, selectedId, commitDeploymentBatch]
  )

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 rounded border border-[#ffb400]/50 bg-[#ffb400]/12 px-3 py-2 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-[#ffb400] shadow-[0_0_12px_-4px_rgba(255,180,0,0.4)] transition hover:bg-[#ffb400]/20"
      >
        <span aria-hidden>↩️</span>
        GERİ DÖN / RETURN
      </button>

      <div className={terminalGrid}>
        <div className="flex min-h-0 flex-col gap-2">
          <TacticalPanel className="flex min-h-0 flex-1 flex-col overflow-hidden border-white/10 bg-black/40 p-0">
            <p className="shrink-0 border-b border-white/10 bg-[#080808] px-3 py-2 font-mono-technical text-[8px] font-bold uppercase tracking-[0.24em] text-[#ffb400]/85">
              AKSESUAR_RAFI
            </p>
            <ul className={`min-h-0 flex-1 space-y-1 p-2 ${panelScroll}`}>
            {accessories.length === 0 ? (
              <li className="py-8 text-center font-mono-technical text-[9px] uppercase text-slate-600">AKSESUAR_KAYDI_YOK</li>
            ) : (
              accessories.map((a) => {
                const id = String(a.id)
                const active = selected && String(selected.id) === id
                return (
                  <li key={id} className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setSelectedId(id)}
                      className={`min-w-0 flex-1 rounded border px-2 py-2 text-left font-mono-technical text-[9px] transition ${
                        active
                          ? 'border-[#00FF41]/50 bg-[#00FF41]/10 text-[#00FF41]'
                          : 'border-white/8 bg-black/30 text-slate-400 hover:border-white/20 hover:text-slate-200'
                      }`}
                    >
                      {active ? <span className="mb-1 block animate-pulse text-[#00FF41]">[ ➔ ]</span> : null}
                      <span className="block text-[8px] text-slate-500">[{accessoryStokKodu(id)}]</span>
                      <span className="block truncate text-[10px] font-bold uppercase">{accessoryDisplayName(a)}</span>
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={(e) => deleteAccessory(a, e)}
                      className="shrink-0 self-stretch rounded border border-red-500/35 px-1.5 font-mono-technical text-[8px] font-bold uppercase text-red-400 hover:bg-red-950/40 disabled:opacity-40"
                    >
                      [ ❌ SİL ]
                    </button>
                  </li>
                )
              })
            )}
          </ul>
          <div className="shrink-0 border-t border-white/10 p-2">
            <button
              type="button"
              onClick={onAddAccessory}
              className="flex w-full items-center justify-center gap-1.5 rounded border border-[#ffb400]/40 bg-[#ffb400]/10 py-2 font-mono-technical text-[8px] font-bold uppercase tracking-wider text-[#ffb400] hover:bg-[#ffb400]/16"
            >
              <Plus className="size-3" aria-hidden />
              + YENİ_AKSESUAR_KAYDI
            </button>
          </div>
          </TacticalPanel>

          <TacticalPanel className="shrink-0 border border-[#00FF41]/25 bg-black/50 p-0">
            <p className="border-b border-[#00FF41]/30 bg-[#080808] px-3 py-1.5 font-mono-technical text-[8px] font-bold uppercase tracking-wider text-[#00FF41]/90">
              [ ENVANTER_ÖZETİ ]
            </p>
            <div className="grid grid-cols-3 gap-2 p-2 font-mono-technical text-[9px] uppercase">
              <p className="rounded border border-white/10 bg-black/40 px-2 py-1.5 text-center">
                <span className="block text-[7px] text-slate-500">TOPLAM</span>
                <span className="text-[#00FF41]">{inventoryStats.total}</span>
              </p>
              <p className="rounded border border-[#00FF41]/25 bg-[#00FF41]/5 px-2 py-1.5 text-center">
                <span className="block text-[7px] text-slate-500">MONTAJLI</span>
                <span className="text-[#00FF41]">{inventoryStats.mounted}</span>
              </p>
              <p className="rounded border border-[#ffb400]/25 bg-[#ffb400]/5 px-2 py-1.5 text-center">
                <span className="block text-[7px] text-slate-500">BOŞTA</span>
                <span className="text-[#ffb400]">{inventoryStats.idle}</span>
              </p>
            </div>
          </TacticalPanel>
        </div>

        <TacticalPanel className="flex min-h-0 flex-col overflow-hidden border-white/10 bg-black/40 p-0">
          <p className="shrink-0 border-b border-white/10 bg-[#080808] px-3 py-2 font-mono-technical text-[8px] font-bold uppercase tracking-[0.24em] text-[#00FF41]/80">
            {isViewingLogs ? 'TAKTİK_MONİTÖR · KAYIT_DEFTERİ' : 'TAKTİK_MONİTÖR · 3D_ANALİTİK'}
          </p>
          {selected ? (
            <div className="flex min-h-0 flex-1 flex-col">
              {isViewingLogs ? (
                <>
                  <div className="flex shrink-0 items-start justify-between gap-2 border-b border-[#00b4ff]/25 bg-[#050a12] px-3 py-2">
                    <div className="min-w-0">
                      <p className="font-mono-technical text-[8px] font-bold uppercase tracking-wider text-[#5ec8ff]">
                        {centerLogStream === 'deploy'
                          ? 'AKSESUAR MONTAJ / SÖKME KAYIT DEFTERİ'
                          : 'TEKNİK BAKIM VE ONARIM GÜNLÜĞÜ'}
                      </p>
                      <p className="mt-0.5 font-mono-technical text-[7px] tabular-nums text-slate-500">
                        {centerLogStream === 'deploy'
                          ? `${filteredDeploymentHistory.length}/${deploymentHistory.length} KAYIT`
                          : `${filteredTechnicalLogs.length}/${technicalMaintenanceLogs.length} KAYIT`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsViewingLogs(false)}
                      className="shrink-0 rounded border border-red-500/55 bg-red-950/25 px-2 py-1 font-mono-technical text-[8px] font-bold uppercase tracking-wide text-red-400 shadow-[0_0_12px_rgba(239,68,68,0.25)] transition hover:bg-red-950/45"
                    >
                      [ ↩️ MONİTÖRE GERİ DÖN / RETURN ]
                    </button>
                  </div>
                  <div className={`min-h-0 flex-1 space-y-2 p-3 ${panelScroll}`}>
                    {centerLogStream === 'deploy' ? (
                      <>
                        <div className="grid gap-1.5 rounded border border-[#00b4ff]/35 bg-[#00b4ff]/5 p-2">
                          <p className="font-mono-technical text-[7px] font-bold uppercase text-[#5ec8ff]/80">FİLTRE</p>
                          <div className="grid gap-1.5 sm:grid-cols-3">
                            <label className="block">
                              <span className="font-mono-technical text-[7px] uppercase text-slate-500">İŞLEM TÜRÜ</span>
                              <select className={filterSelectClass} value={deployActionFilter} onChange={(e) => setDeployActionFilter(e.target.value)}>
                                {DEPLOY_ACTION_FILTERS.map((f) => (
                                  <option key={f.value} value={f.value}>{f.label}</option>
                                ))}
                              </select>
                            </label>
                            <label className="block">
                              <span className="font-mono-technical text-[7px] uppercase text-slate-500">TARİH BAŞ</span>
                              <input type="date" className={filterDateClass} value={deployDateFrom} max={deployDateTo || todayIsoDate()} onChange={(e) => setDeployDateFrom(e.target.value)} />
                            </label>
                            <label className="block">
                              <span className="font-mono-technical text-[7px] uppercase text-slate-500">TARİH BİT</span>
                              <input type="date" className={filterDateClass} value={deployDateTo} min={deployDateFrom || undefined} max={todayIsoDate()} onChange={(e) => setDeployDateTo(e.target.value)} />
                            </label>
                          </div>
                          {(deployActionFilter !== 'ALL' || deployDateFrom || deployDateTo) && (
                            <button type="button" onClick={() => { setDeployActionFilter('ALL'); setDeployDateFrom(''); setDeployDateTo('') }} className="font-mono-technical text-[7px] uppercase text-[#5ec8ff]/80 hover:text-[#5ec8ff]">FİLTREYİ SIFIRLA</button>
                          )}
                        </div>
                        <ul className="space-y-1.5 rounded border border-[#00b4ff]/30 bg-black/30 p-2">
                          {deploymentHistory.length === 0 ? (
                            <li className="font-mono-technical text-[9px] uppercase text-slate-600">KAYIT_YOK</li>
                          ) : filteredDeploymentHistory.length === 0 ? (
                            <li className="font-mono-technical text-[9px] uppercase text-slate-600">FİLTRE_SONUCU_YOK</li>
                          ) : (
                            filteredDeploymentHistory.map((log, i) => (
                              <li key={`${log.date}-${log.action_type}-${i}`} className="rounded border border-[#00b4ff]/20 bg-black/50 px-2 py-1.5 font-mono-technical text-[8px] uppercase">
                                <span className="text-slate-500">{log.date}</span>
                                <span className={`ml-2 ${log.action_type === 'MONTAJ' ? 'text-[#00FF41]' : 'text-amber-400'}`}>{log.action_type}</span>
                                <p className="mt-0.5 text-slate-300">{log.target_weapon}</p>
                              </li>
                            ))
                          )}
                        </ul>
                      </>
                    ) : (
                      <>
                        <div className="grid gap-1.5 rounded border border-[#ffb400]/25 bg-[#ffb400]/5 p-2">
                          <p className="font-mono-technical text-[7px] font-bold uppercase text-[#ffb400]/80">FİLTRE</p>
                          <div className="grid gap-1.5 sm:grid-cols-3">
                            <label className="block">
                              <span className="font-mono-technical text-[7px] uppercase text-slate-500">BAKIM TÜRÜ</span>
                              <select className={filterSelectClass} value={techTypeFilter} onChange={(e) => setTechTypeFilter(e.target.value)}>
                                <option value="ALL">TÜM TÜRLER</option>
                                {ACCESSORY_MAINTENANCE_TYPES.map((t) => (
                                  <option key={t} value={t}>{t}</option>
                                ))}
                              </select>
                            </label>
                            <label className="block">
                              <span className="font-mono-technical text-[7px] uppercase text-slate-500">TARİH BAŞ</span>
                              <input type="date" className={filterDateClass} value={techDateFrom} max={techDateTo || todayIsoDate()} onChange={(e) => setTechDateFrom(e.target.value)} />
                            </label>
                            <label className="block">
                              <span className="font-mono-technical text-[7px] uppercase text-slate-500">TARİH BİT</span>
                              <input type="date" className={filterDateClass} value={techDateTo} min={techDateFrom || undefined} max={todayIsoDate()} onChange={(e) => setTechDateTo(e.target.value)} />
                            </label>
                          </div>
                          {(techTypeFilter !== 'ALL' || techDateFrom || techDateTo) && (
                            <button type="button" onClick={() => { setTechTypeFilter('ALL'); setTechDateFrom(''); setTechDateTo('') }} className="font-mono-technical text-[7px] uppercase text-[#ffb400]/80 hover:text-[#ffb400]">FİLTREYİ SIFIRLA</button>
                          )}
                        </div>
                        <ul className="space-y-0 rounded border border-[#ffb400]/25 bg-black/30 p-2">
                          {technicalMaintenanceLogs.length === 0 ? (
                            <li className="font-mono-technical text-[9px] uppercase text-slate-600">TEKNİK_KAYIT_YOK</li>
                          ) : filteredTechnicalLogs.length === 0 ? (
                            <li className="font-mono-technical text-[9px] uppercase text-slate-600">FİLTRE_SONUCU_YOK</li>
                          ) : (
                            filteredTechnicalLogs.map((log, i) => (
                              <li key={`${log.date}-${log.maintenanceType}-${i}`}>
                                {i > 0 ? <div className="my-2 font-mono-technical text-[8px] text-slate-600" aria-hidden>-------------------------</div> : null}
                                <p className="font-mono-technical text-[9px] tabular-nums text-slate-500">{log.date}</p>
                                <span className="mt-0.5 inline-block rounded border border-[#ffb400]/40 bg-[#ffb400]/10 px-1.5 py-0.5 font-mono-technical text-[7px] font-bold uppercase text-[#ffb400]">{log.maintenanceType}</span>
                                <p className="mt-1 font-mono-technical text-[9px] normal-case leading-snug text-slate-300">{log.note || '—'}</p>
                              </li>
                            ))
                          )}
                        </ul>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <MatrixWireVisualizer variant="reddot" imageSrc={imageSrc} imageAlt={accessoryDisplayName(selected)} label={accessoryStokKodu(String(selected.id))} />
                  <div className="shrink-0 space-y-1 border-t border-white/10 px-3 py-2 font-mono-technical text-[9px] uppercase">
                    <p className="text-slate-500">AKSESUAR TÜRÜ: <span className="text-[#00FF41]">{typeLabel}</span></p>
                    <p className="font-mono-technical text-[9px] uppercase tracking-[0.12em] text-[#00FF41]">ENVANTERE GİRİŞ TARİHİ: <span className="tabular-nums">{entryDate}</span></p>
                  </div>
                  <div className="mt-auto shrink-0 border-t border-[#00FF41]/25 bg-[#050805] px-3 py-2">
                    <p className={`font-mono-technical text-[9px] font-bold uppercase ${mounted ? 'text-[#00FF41]' : 'animate-pulse text-[#ffb400]'}`}>
                      DURUM: {mounted ? statusLabel : 'BOŞTA · ENSTALASYONA HAZIR'}
                    </p>
                  </div>
                </>
              )}
            </div>
          ) : (
            <p className="flex flex-1 items-center justify-center p-6 font-mono-technical text-[9px] uppercase text-slate-600">AKSESUAR_SEÇİN</p>
          )}
        </TacticalPanel>

        <TacticalPanel className="flex min-h-0 flex-col overflow-hidden border-white/10 bg-black/40 p-0">
          <p className="shrink-0 border-b border-white/10 bg-[#080808] px-3 py-2 font-mono-technical text-[8px] font-bold uppercase tracking-[0.24em] text-[#00FF41]/80">
            EYLEM · DENETİM_HUB
          </p>
          {selected ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex shrink-0 gap-1 border-b border-white/10 bg-[#080808] p-1">
                <button type="button" onClick={() => setRightTab('deploy')} className={`flex-1 rounded px-2 py-1.5 font-mono-technical text-[7px] font-bold uppercase tracking-wide ${rightTab === 'deploy' ? 'border border-[#00FF41]/50 bg-[#00FF41]/15 text-[#00FF41]' : 'text-slate-500 hover:text-slate-300'}`}>[ 📑 MONTAJ KAYITLARI ]</button>
                <button type="button" onClick={() => setRightTab('maint')} className={`flex-1 rounded px-2 py-1.5 font-mono-technical text-[7px] font-bold uppercase tracking-wide ${rightTab === 'maint' ? 'border border-[#ffb400]/50 bg-[#ffb400]/15 text-[#ffb400]' : 'text-slate-500 hover:text-slate-300'}`}>[ 🛠️ TEKNİK BAKIM ]</button>
              </div>

              <div className={`min-h-0 flex-1 p-3 ${panelScroll}`}>
                {rightTab === 'deploy' ? (
                  <section className="space-y-3">
                    <button type="button" onClick={() => openCenterLogs('deploy')} disabled={!selected} className="w-full rounded border border-[#00b4ff]/55 bg-[#00b4ff]/12 py-2.5 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-[#5ec8ff] shadow-[0_0_18px_rgba(0,180,255,0.28)] transition hover:bg-[#00b4ff]/20 hover:shadow-[0_0_24px_rgba(0,180,255,0.4)] disabled:opacity-40">
                      [ 🔍 İŞLEM KAYITLARINI GÖRÜNTÜLE ]
                    </button>
                    <div className="space-y-2 rounded border border-red-500/45 bg-red-950/15 p-3 shadow-[0_0_14px_rgba(239,68,68,0.12)]">
                      <p className="font-mono-technical text-[8px] font-bold uppercase tracking-wider text-red-400/90">MONTAJ_KONTROL · EYLEM</p>
                      {mounted ? (
                        <>
                          <p className="rounded border border-[#00FF41]/40 bg-[#00FF41]/10 px-2 py-1.5 font-mono-technical text-[9px] font-bold uppercase text-[#00FF41]">DURUM: {statusLabel}</p>
                          <label className="block">
                            <span className="font-mono-technical text-[7px] uppercase text-slate-500">İŞLEM_TARİHİ (KAYIT)</span>
                            <input type="date" className={`${dateInputClass} mt-1`} value={logDate} max={todayIsoDate()} onChange={(e) => setLogDate(e.target.value)} disabled={busy} />
                          </label>
                          <button type="button" disabled={busy} onClick={detachAccessory} className="w-full rounded border border-amber-500/45 bg-amber-950/25 py-2.5 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.15)] transition hover:bg-amber-950/45 disabled:opacity-40">[ ⌧ AKSESUARI SÖK / DETACH ]</button>
                        </>
                      ) : (
                        <>
                          <p className="animate-pulse font-mono-technical text-[9px] font-bold uppercase text-[#ffb400]">DURUM: BOŞTA · ENSTALASYONA HAZIR</p>
                          <button type="button" onClick={() => setIsMountModalOpen(true)} disabled={busy} className="w-full rounded border border-[#00FF41]/60 bg-[#00FF41]/15 py-2.5 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-[#00FF41] shadow-[0_0_20px_rgba(0,255,65,0.35)] transition hover:bg-[#00FF41]/25 hover:shadow-[0_0_28px_rgba(0,255,65,0.5)] disabled:opacity-40">[ ⚡ YENİ MONTAJ İŞLEMİ BAŞLAT ]</button>
                        </>
                      )}
                    </div>
                  </section>
                ) : (
                  <section className="space-y-3">
                    <button type="button" onClick={() => setIsMaintenanceModalOpen(true)} disabled={busy || techMaintSaving} className="w-full rounded border border-[#00FF41]/60 bg-[#00FF41]/15 py-2.5 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-[#00FF41] shadow-[0_0_20px_rgba(0,255,65,0.35)] transition hover:bg-[#00FF41]/25 hover:shadow-[0_0_28px_rgba(0,255,65,0.5)] disabled:opacity-40">[ + YENİ TEKNİK KAYIT GİRİŞİ ]</button>
                    <button type="button" onClick={() => openCenterLogs('maint')} disabled={!selected} className="w-full rounded border border-[#00b4ff]/55 bg-[#00b4ff]/12 py-2.5 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-[#5ec8ff] shadow-[0_0_18px_rgba(0,180,255,0.28)] transition hover:bg-[#00b4ff]/20 hover:shadow-[0_0_24px_rgba(0,180,255,0.4)] disabled:opacity-40">
                      [ 🔍 İŞLEM KAYITLARINI GÖRÜNTÜLE ]
                    </button>
                  </section>
                )}
              </div>
            </div>
          ) : (
            <p className="flex flex-1 items-center justify-center p-6 font-mono-technical text-[9px] uppercase text-slate-600">AKSESUAR_SEÇİN</p>
          )}
        </TacticalPanel>
      </div>

      <AccessoryMaintenanceModal
        open={isMaintenanceModalOpen}
        saving={techMaintSaving}
        busy={busy}
        maintenanceType={techMaintType}
        maintenanceDate={techMaintDate}
        maintenanceNote={techMaintNote}
        onMaintenanceTypeChange={setTechMaintType}
        onMaintenanceDateChange={setTechMaintDate}
        onMaintenanceNoteChange={setTechMaintNote}
        onClose={closeMaintenanceModal}
        onSubmit={submitTechnicalMaintenance}
      />

      <AccessoryMountModal
        open={isMountModalOpen}
        busy={busy}
        mountWeaponId={mountWeaponId}
        logDate={logDate}
        idleWeapons={idleWeaponsForMount}
        onMountWeaponIdChange={setMountWeaponId}
        onLogDateChange={setLogDate}
        onClose={closeMountModal}
        onConfirm={confirmMountAccessory}
      />
    </div>
  )
}
