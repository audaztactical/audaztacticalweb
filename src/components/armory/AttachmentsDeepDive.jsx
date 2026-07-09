import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import AccessoryMaintenanceModal from './AccessoryMaintenanceModal'
import AccessoryMountModal from './AccessoryMountModal'
import InventoryBallisticEditPanel from './InventoryBallisticEditPanel'
import MatrixWireVisualizer from './MatrixWireVisualizer'
import TacticalPanel from '../ui/TacticalPanel'
import {
  ACCESSORY_MAINTENANCE_TYPES,
  accessoryDisplayName,
  accessoryStokKodu,
  getAccessoryCreatedAt,
  getAccessoryMaintenanceLogs,
  getMountedWeaponId,
  isAccessoryIdle,
  isAccessoryMounted,
  resolveAccessoryKind,
} from '../../lib/accessoryIlws'
import { filterAuditForAccessory, resolveAuditEntryDisplay } from '../../lib/armoryAuditTrail'
import { syncDetachAccessory, syncMountAccessory } from '../../lib/armoryMountSync'
import {
  getAttachedAccessoryId,
  isWeaponIdleForAccessoryMount,
  todayIsoDate,
} from '../../lib/weaponIlws'
import { matchesIsoDateRange, matchesTypeFilter } from '../../lib/logSummaryFilters'
import {
  accessoryMaintenanceTypeOptions,
  formatAccessoryMountStatus,
  formatAccessoryTypeLabel,
  formatIdleStatus,
  labelAccessoryMaintenanceType,
} from '../../lib/armoryDisplayText'

const dateInputClass =
  'w-full rounded border border-accent bg-app-bg px-2 py-1.5 font-mono-technical text-[10px] text-accent outline-none [color-scheme:dark] focus:border-accent'

const filterSelectClass =
  'dossier-blood-select mt-0.5 w-full rounded border border-accent/35 bg-app-bg py-1 pl-1.5 pr-6 font-mono-technical text-[8px] uppercase text-app-text outline-none'

const filterDateClass =
  'mt-0.5 w-full rounded border border-accent/50 bg-app-bg px-1.5 py-1 font-mono-technical text-[8px] text-accent outline-none [color-scheme:dark]'

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
  const { t, i18n } = useTranslation('armory')
  const maintTypeOptions = useMemo(() => accessoryMaintenanceTypeOptions(), [i18n.language])
  const deployActionFilters = useMemo(
    () => [
      { value: 'ALL', label: t('attachmentsDeepDive.allActions') },
      { value: 'MONTAJ', label: t('attachmentsDeepDive.actionMontaj') },
      { value: 'SÖKME', label: t('attachmentsDeepDive.actionSokme') },
    ],
    [t, i18n.language]
  )

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

  const entryDate = selected ? getAccessoryCreatedAt(selected) : t('common.emDash')
  const typeLabel = selected ? formatAccessoryTypeLabel(selected) : t('common.emDash')
  const mounted = selected ? isAccessoryMounted(selected) : false
  const statusLabel = selected ? formatAccessoryMountStatus(selected, mountedWeapon) : t('common.emDash')
  const idleStatusLabel = formatIdleStatus()

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
      const ok = window.confirm(
        t('attachmentsDeepDive.deleteConfirm', { code: accessoryStokKodu(id), name: label })
      )
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
    [deleteItem, weapons, selectedId, commitDeploymentBatch, t]
  )

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 rounded border border-accent/50 bg-accent/12 px-3 py-2 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-accent shadow-[0_0_12px_-4px_rgba(255,180,0,0.4)] transition hover:bg-accent/20"
      >
        <span aria-hidden>↩️</span>
        {t('attachmentsDeepDive.back')}
      </button>

      <div className={terminalGrid}>
        <div className="flex min-h-0 flex-col gap-2">
          <TacticalPanel className="flex min-h-0 flex-1 flex-col overflow-hidden border-white/10 bg-black/40 p-0">
            <p className="shrink-0 border-b border-white/10 bg-app-bg px-3 py-2 font-mono-technical text-[8px] font-bold uppercase tracking-[0.24em] text-accent/85">
              {t('attachmentsDeepDive.rackTitle')}
            </p>
            <ul className={`min-h-0 flex-1 space-y-1 p-2 ${panelScroll}`}>
            {accessories.length === 0 ? (
              <li className="py-8 text-center font-mono-technical text-[9px] uppercase text-app-text/45">
                {t('attachmentsDeepDive.empty')}
              </li>
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
                          ? 'border-accent/50 bg-accent/10 text-accent'
                          : 'border-white/8 bg-black/30 text-app-text/70 hover:border-white/20 hover:text-app-text'
                      }`}
                    >
                      {active ? <span className="mb-1 block animate-pulse text-accent">[ ➔ ]</span> : null}
                      <span className="block text-[8px] text-app-text/55">[{accessoryStokKodu(id)}]</span>
                      <span className="block truncate text-[10px] font-bold uppercase">{accessoryDisplayName(a)}</span>
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={(e) => deleteAccessory(a, e)}
                      className="shrink-0 self-stretch rounded border border-red-500/35 px-1.5 font-mono-technical text-[8px] font-bold uppercase text-red-400 hover:bg-red-950/40 disabled:opacity-40"
                    >
                      {t('attachmentsDeepDive.delete')}
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
              className="flex w-full items-center justify-center gap-1.5 rounded border border-accent/40 bg-accent/10 py-2 font-mono-technical text-[8px] font-bold uppercase tracking-wider text-accent hover:bg-accent/16"
            >
              <Plus className="size-3" aria-hidden />
              {t('attachmentsDeepDive.addAccessory')}
            </button>
          </div>
          </TacticalPanel>

          <TacticalPanel className="shrink-0 border border-accent/25 bg-black/50 p-0">
            <p className="border-b border-accent/30 bg-app-bg px-3 py-1.5 font-mono-technical text-[8px] font-bold uppercase tracking-wider text-accent/90">
              {t('attachmentsDeepDive.inventorySummary')}
            </p>
            <div className="grid grid-cols-3 gap-2 p-2 font-mono-technical text-[9px] uppercase">
              <p className="rounded border border-white/10 bg-black/40 px-2 py-1.5 text-center">
                <span className="block text-[7px] text-app-text/55">{t('attachmentsDeepDive.total')}</span>
                <span className="text-accent">{inventoryStats.total}</span>
              </p>
              <p className="rounded border border-accent/25 bg-accent/5 px-2 py-1.5 text-center">
                <span className="block text-[7px] text-app-text/55">{t('attachmentsDeepDive.mounted')}</span>
                <span className="text-accent">{inventoryStats.mounted}</span>
              </p>
              <p className="rounded border border-accent/25 bg-accent/5 px-2 py-1.5 text-center">
                <span className="block text-[7px] text-app-text/55">{t('attachmentsDeepDive.idle')}</span>
                <span className="text-accent">{inventoryStats.idle}</span>
              </p>
            </div>
          </TacticalPanel>
        </div>

        <TacticalPanel className="flex min-h-0 flex-col overflow-hidden border-white/10 bg-black/40 p-0">
          <p className="shrink-0 border-b border-white/10 bg-app-bg px-3 py-2 font-mono-technical text-[8px] font-bold uppercase tracking-[0.24em] text-accent/80">
            {isViewingLogs ? t('attachmentsDeepDive.logBook') : t('attachmentsDeepDive.view3d')}
          </p>
          {selected ? (
            <div className="flex min-h-0 flex-1 flex-col">
              {isViewingLogs ? (
                <>
                  <div className="flex shrink-0 items-start justify-between gap-2 border-b border-[#00b4ff]/25 bg-[#050a12] px-3 py-2">
                    <div className="min-w-0">
                      <p className="font-mono-technical text-[8px] font-bold uppercase tracking-wider text-[#5ec8ff]">
                        {centerLogStream === 'deploy'
                          ? t('attachmentsDeepDive.deployLogTitle')
                          : t('attachmentsDeepDive.techLogTitle')}
                      </p>
                      <p className="mt-0.5 font-mono-technical text-[7px] tabular-nums text-app-text/55">
                        {centerLogStream === 'deploy'
                          ? t('attachmentsDeepDive.recordCount', {
                              filtered: filteredDeploymentHistory.length,
                              total: deploymentHistory.length,
                            })
                          : t('attachmentsDeepDive.recordCount', {
                              filtered: filteredTechnicalLogs.length,
                              total: technicalMaintenanceLogs.length,
                            })}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsViewingLogs(false)}
                      className="shrink-0 rounded border border-red-500/55 bg-red-950/25 px-2 py-1 font-mono-technical text-[8px] font-bold uppercase tracking-wide text-red-400 shadow-[0_0_12px_rgba(239,68,68,0.25)] transition hover:bg-red-950/45"
                    >
                      {t('attachmentsDeepDive.returnToMonitor')}
                    </button>
                  </div>
                  <div className={`min-h-0 flex-1 space-y-2 p-3 ${panelScroll}`}>
                    {centerLogStream === 'deploy' ? (
                      <>
                        <div className="grid gap-1.5 rounded border border-[#00b4ff]/35 bg-[#00b4ff]/5 p-2">
                          <p className="font-mono-technical text-[7px] font-bold uppercase text-[#5ec8ff]/80">
                            {t('attachmentsDeepDive.filter')}
                          </p>
                          <div className="grid gap-1.5 sm:grid-cols-3">
                            <label className="block">
                              <span className="font-mono-technical text-[7px] uppercase text-app-text/55">
                                {t('attachmentsDeepDive.actionType')}
                              </span>
                              <select className={filterSelectClass} value={deployActionFilter} onChange={(e) => setDeployActionFilter(e.target.value)}>
                                {deployActionFilters.map((f) => (
                                  <option key={f.value} value={f.value}>{f.label}</option>
                                ))}
                              </select>
                            </label>
                            <label className="block">
                              <span className="font-mono-technical text-[7px] uppercase text-app-text/55">
                                {t('attachmentsDeepDive.dateFrom')}
                              </span>
                              <input type="date" className={filterDateClass} value={deployDateFrom} max={deployDateTo || todayIsoDate()} onChange={(e) => setDeployDateFrom(e.target.value)} />
                            </label>
                            <label className="block">
                              <span className="font-mono-technical text-[7px] uppercase text-app-text/55">
                                {t('attachmentsDeepDive.dateTo')}
                              </span>
                              <input type="date" className={filterDateClass} value={deployDateTo} min={deployDateFrom || undefined} max={todayIsoDate()} onChange={(e) => setDeployDateTo(e.target.value)} />
                            </label>
                          </div>
                          {(deployActionFilter !== 'ALL' || deployDateFrom || deployDateTo) && (
                            <button type="button" onClick={() => { setDeployActionFilter('ALL'); setDeployDateFrom(''); setDeployDateTo('') }} className="font-mono-technical text-[7px] uppercase text-[#5ec8ff]/80 hover:text-[#5ec8ff]">
                              {t('attachmentsDeepDive.resetFilter')}
                            </button>
                          )}
                        </div>
                        <ul className="space-y-1.5 rounded border border-[#00b4ff]/30 bg-black/30 p-2">
                          {deploymentHistory.length === 0 ? (
                            <li className="font-mono-technical text-[9px] uppercase text-app-text/45">
                              {t('attachmentsDeepDive.noRecords')}
                            </li>
                          ) : filteredDeploymentHistory.length === 0 ? (
                            <li className="font-mono-technical text-[9px] uppercase text-app-text/45">
                              {t('attachmentsDeepDive.noFilterResults')}
                            </li>
                          ) : (
                            filteredDeploymentHistory.map((log, i) => (
                              <li key={`${log.date}-${log.action_type}-${i}`} className="rounded border border-[#00b4ff]/20 bg-black/50 px-2 py-1.5 font-mono-technical text-[8px] uppercase">
                                <span className="text-app-text/55">{log.date}</span>
                                <span className={`ml-2 ${log.action_type === 'MONTAJ' ? 'text-accent' : 'text-amber-400'}`}>
                                  {log.action_label || log.action_type}
                                </span>
                                <p className="mt-0.5 text-app-text/90">{log.target_weapon}</p>
                              </li>
                            ))
                          )}
                        </ul>
                      </>
                    ) : (
                      <>
                        <div className="grid gap-1.5 rounded border border-accent/25 bg-accent/5 p-2">
                          <p className="font-mono-technical text-[7px] font-bold uppercase text-accent/80">
                            {t('attachmentsDeepDive.filter')}
                          </p>
                          <div className="grid gap-1.5 sm:grid-cols-3">
                            <label className="block">
                              <span className="font-mono-technical text-[7px] uppercase text-app-text/55">
                                {t('attachmentsDeepDive.maintType')}
                              </span>
                              <select className={filterSelectClass} value={techTypeFilter} onChange={(e) => setTechTypeFilter(e.target.value)}>
                                <option value="ALL">{t('attachmentsDeepDive.allTypes')}</option>
                                {maintTypeOptions.map((opt) => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                              </select>
                            </label>
                            <label className="block">
                              <span className="font-mono-technical text-[7px] uppercase text-app-text/55">
                                {t('attachmentsDeepDive.dateFrom')}
                              </span>
                              <input type="date" className={filterDateClass} value={techDateFrom} max={techDateTo || todayIsoDate()} onChange={(e) => setTechDateFrom(e.target.value)} />
                            </label>
                            <label className="block">
                              <span className="font-mono-technical text-[7px] uppercase text-app-text/55">
                                {t('attachmentsDeepDive.dateTo')}
                              </span>
                              <input type="date" className={filterDateClass} value={techDateTo} min={techDateFrom || undefined} max={todayIsoDate()} onChange={(e) => setTechDateTo(e.target.value)} />
                            </label>
                          </div>
                          {(techTypeFilter !== 'ALL' || techDateFrom || techDateTo) && (
                            <button type="button" onClick={() => { setTechTypeFilter('ALL'); setTechDateFrom(''); setTechDateTo('') }} className="font-mono-technical text-[7px] uppercase text-accent/80 hover:text-accent">
                              {t('attachmentsDeepDive.resetFilter')}
                            </button>
                          )}
                        </div>
                        <ul className="space-y-0 rounded border border-accent/25 bg-black/30 p-2">
                          {technicalMaintenanceLogs.length === 0 ? (
                            <li className="font-mono-technical text-[9px] uppercase text-app-text/45">
                              {t('attachmentsDeepDive.noTechRecords')}
                            </li>
                          ) : filteredTechnicalLogs.length === 0 ? (
                            <li className="font-mono-technical text-[9px] uppercase text-app-text/45">
                              {t('attachmentsDeepDive.noFilterResults')}
                            </li>
                          ) : (
                            filteredTechnicalLogs.map((log, i) => (
                              <li key={`${log.date}-${log.maintenanceType}-${i}`}>
                                {i > 0 ? <div className="my-2 font-mono-technical text-[8px] text-app-text/45" aria-hidden>-------------------------</div> : null}
                                <p className="font-mono-technical text-[9px] tabular-nums text-app-text/55">{log.date}</p>
                                <span className="mt-0.5 inline-block rounded border border-accent/40 bg-accent/10 px-1.5 py-0.5 font-mono-technical text-[7px] font-bold uppercase text-accent">
                                  {labelAccessoryMaintenanceType(log.maintenanceType)}
                                </span>
                                <p className="mt-1 font-mono-technical text-[9px] normal-case leading-snug text-app-text/90">
                                  {log.note || t('common.emDash')}
                                </p>
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
                  <MatrixWireVisualizer variant="reddot" imageSrc={imageSrc} imageAlt={accessoryDisplayName(selected)} label="" />
                  <div className="shrink-0 space-y-1 border-t border-white/10 px-3 py-2 font-mono-technical text-[9px] uppercase">
                    <p className="text-app-text/55">
                      {t('attachmentsDeepDive.accessoryType')} <span className="text-accent">{typeLabel}</span>
                    </p>
                    <p className="font-mono-technical text-[9px] uppercase tracking-[0.12em] text-accent">
                      {t('attachmentsDeepDive.inventoryEntryDate')} <span className="tabular-nums">{entryDate}</span>
                    </p>
                  </div>
                  <div className="mt-auto shrink-0 border-t border-accent/25 bg-app-bg px-3 py-2">
                    <p className={`font-mono-technical text-[9px] font-bold uppercase ${mounted ? 'text-accent' : 'animate-pulse text-accent'}`}>
                      {t('status.statusPrefix')} {mounted ? statusLabel : idleStatusLabel}
                    </p>
                  </div>
                </>
              )}
            </div>
          ) : (
            <p className="flex flex-1 items-center justify-center p-6 font-mono-technical text-[9px] uppercase text-app-text/45">
              {t('attachmentsDeepDive.selectAccessory')}
            </p>
          )}
        </TacticalPanel>

        <TacticalPanel className="flex min-h-0 flex-col overflow-hidden border-white/10 bg-black/40 p-0">
          <p className="shrink-0 border-b border-white/10 bg-app-bg px-3 py-2 font-mono-technical text-[8px] font-bold uppercase tracking-[0.24em] text-accent/80">
            {t('attachmentsDeepDive.actionHub')}
          </p>
          {selected ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex shrink-0 gap-1 border-b border-white/10 bg-app-bg p-1">
                <button type="button" onClick={() => setRightTab('deploy')} className={`flex-1 rounded px-2 py-1.5 font-mono-technical text-[7px] font-bold uppercase tracking-wide ${rightTab === 'deploy' ? 'border border-accent/50 bg-accent/15 text-accent' : 'text-app-text/55 hover:text-app-text/90'}`}>
                  {t('attachmentsDeepDive.tabDeploy')}
                </button>
                <button type="button" onClick={() => setRightTab('maint')} className={`flex-1 rounded px-2 py-1.5 font-mono-technical text-[7px] font-bold uppercase tracking-wide ${rightTab === 'maint' ? 'border border-accent/50 bg-accent/15 text-accent' : 'text-app-text/55 hover:text-app-text/90'}`}>
                  {t('attachmentsDeepDive.tabMaint')}
                </button>
              </div>

              <div className={`min-h-0 flex-1 p-3 ${panelScroll}`}>
                {resolveAccessoryKind(selected.accessoryKind) === 'OPTIK' ? (
                  <div className="mb-3">
                    <InventoryBallisticEditPanel kind="optic" row={selected} updateItem={updateItem} />
                  </div>
                ) : null}
                {rightTab === 'deploy' ? (
                  <section className="space-y-3">
                    <button type="button" onClick={() => openCenterLogs('deploy')} disabled={!selected} className="w-full rounded border border-[#00b4ff]/55 bg-[#00b4ff]/12 py-2.5 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-[#5ec8ff] shadow-[0_0_18px_rgba(0,180,255,0.28)] transition hover:bg-[#00b4ff]/20 hover:shadow-[0_0_24px_rgba(0,180,255,0.4)] disabled:opacity-40">
                      {t('attachmentsDeepDive.viewRecords')}
                    </button>
                    <div className="space-y-2 rounded border border-red-500/45 bg-red-950/15 p-3 shadow-[0_0_14px_rgba(239,68,68,0.12)]">
                      <p className="font-mono-technical text-[8px] font-bold uppercase tracking-wider text-red-400/90">
                        {t('attachmentsDeepDive.mountControl')}
                      </p>
                      {mounted ? (
                        <>
                          <p className="rounded border border-accent/40 bg-accent/10 px-2 py-1.5 font-mono-technical text-[9px] font-bold uppercase text-accent">
                            {t('status.statusPrefix')} {statusLabel}
                          </p>
                          <label className="block">
                            <span className="font-mono-technical text-[7px] uppercase text-app-text/55">
                              {t('attachmentsDeepDive.logDate')}
                            </span>
                            <input type="date" className={`${dateInputClass} mt-1`} value={logDate} max={todayIsoDate()} onChange={(e) => setLogDate(e.target.value)} disabled={busy} />
                          </label>
                          <button type="button" disabled={busy} onClick={detachAccessory} className="w-full rounded border border-amber-500/45 bg-amber-950/25 py-2.5 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.15)] transition hover:bg-amber-950/45 disabled:opacity-40">
                            {t('attachmentsDeepDive.detachAccessory')}
                          </button>
                        </>
                      ) : (
                        <>
                          <p className="animate-pulse font-mono-technical text-[9px] font-bold uppercase text-accent">
                            {t('status.statusPrefix')} {idleStatusLabel}
                          </p>
                          <button type="button" onClick={() => setIsMountModalOpen(true)} disabled={busy} className="w-full rounded border border-accent/60 bg-accent/15 py-2.5 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-accent shadow-[0_0_24px_-8px_color-mix(in_srgb,var(--accent-color)_35%,transparent)]] transition hover:bg-accent/25 hover:shadow-[0_0_24px_-8px_color-mix(in_srgb,var(--accent-color)_35%,transparent)]] disabled:opacity-40">
                            {t('attachmentsDeepDive.startMount')}
                          </button>
                        </>
                      )}
                    </div>
                  </section>
                ) : (
                  <section className="space-y-3">
                    <button type="button" onClick={() => setIsMaintenanceModalOpen(true)} disabled={busy || techMaintSaving} className="w-full rounded border border-accent/60 bg-accent/15 py-2.5 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-accent shadow-[0_0_24px_-8px_color-mix(in_srgb,var(--accent-color)_35%,transparent)]] transition hover:bg-accent/25 hover:shadow-[0_0_24px_-8px_color-mix(in_srgb,var(--accent-color)_35%,transparent)]] disabled:opacity-40">
                      {t('attachmentsDeepDive.newTechEntry')}
                    </button>
                    <button type="button" onClick={() => openCenterLogs('maint')} disabled={!selected} className="w-full rounded border border-[#00b4ff]/55 bg-[#00b4ff]/12 py-2.5 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-[#5ec8ff] shadow-[0_0_18px_rgba(0,180,255,0.28)] transition hover:bg-[#00b4ff]/20 hover:shadow-[0_0_24px_rgba(0,180,255,0.4)] disabled:opacity-40">
                      {t('attachmentsDeepDive.viewRecords')}
                    </button>
                  </section>
                )}
              </div>
            </div>
          ) : (
            <p className="flex flex-1 items-center justify-center p-6 font-mono-technical text-[9px] uppercase text-app-text/45">
              {t('attachmentsDeepDive.selectAccessory')}
            </p>
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
