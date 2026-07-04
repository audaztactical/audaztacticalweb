import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import MatrixWireVisualizer from './MatrixWireVisualizer'
import TacticalPanel from '../ui/TacticalPanel'
import {
  MAINTENANCE_TYPES,
  todayIsoDate,
  filterOpticRows,
  formatConditionBar,
  getAttachedAccessoryId,
  getEffectiveTotalRoundsFired,
  getRoundsSinceLastMaintenance,
  getWeaponCreatedAt,
  getWeaponMaintenanceLogs,
  getYivConditionPercent,
  isOpticIdle,
  weaponDisplayName,
  weaponStokKodu,
} from '../../lib/weaponIlws'
import { submitWeaponMaintenanceLog } from '../../lib/weaponMaintenanceService'
import { isMaintenanceRequired } from '../../lib/weaponMaintenanceAlarm'
import WeaponMaintenanceCenterAlert from './WeaponMaintenanceCenterAlert'
import WeaponMaintenanceLogModal from './WeaponMaintenanceLogModal'
import { WeaponMaintenanceAlarmFromInventory } from './WeaponMaintenanceAlarmPanel'
import { syncDetachAccessory, syncMountAccessory } from '../../lib/armoryMountSync'
import { invStr } from '../../lib/inventoryIlws'

const selectClass =
  'dossier-blood-select w-full rounded border border-accent/35 bg-app-bg py-2 pl-2 pr-8 font-mono-technical text-[10px] uppercase text-app-text outline-none'

const dateInputClass =
  'w-full rounded border border-accent/40 bg-app-bg px-2 py-1.5 font-mono-technical text-[10px] text-accent outline-none [color-scheme:dark] focus:border-accent'

/**
 * @param {{
 *   weapons: Record<string, unknown>[]
 *   allItems: Record<string, unknown>[]
 *   imageSrc: string
 *   onBack: () => void
 *   onAddWeapon: () => void
 *   rangeLogs: Record<string, unknown>[]
 *   updateItem: (id: string, patch: Record<string, unknown>) => Promise<unknown>
 *   deleteItem: (id: string) => Promise<unknown>
 *   commitDeploymentBatch: (ops: {
 *     inventoryUpdates: { docId: string, patch: Record<string, unknown> }[]
 *     auditEntries: Record<string, unknown>[]
 *   }) => Promise<unknown>
 * }} props
 */
export default function WeaponsDeepDive({
  weapons,
  allItems,
  imageSrc,
  onBack,
  onAddWeapon,
  rangeLogs,
  updateItem,
  deleteItem,
  commitDeploymentBatch,
}) {
  const optics = useMemo(() => filterOpticRows(allItems), [allItems])
  const [selectedId, setSelectedId] = useState(/** @type {string | null} */ (null))
  const [maintType, setMaintType] = useState(MAINTENANCE_TYPES[0])
  const [maintDate, setMaintDate] = useState(todayIsoDate)
  const [maintNote, setMaintNote] = useState('')
  const [maintSaving, setMaintSaving] = useState(false)
  const [attachId, setAttachId] = useState('')
  const [busy, setBusy] = useState(false)
  const [maintModalOpen, setMaintModalOpen] = useState(false)
  const maintFormRef = useRef(/** @type {HTMLDivElement | null} */ (null))

  const selected = useMemo(
    () => weapons.find((w) => String(w.id) === selectedId) ?? weapons[0] ?? null,
    [weapons, selectedId]
  )

  useEffect(() => {
    if (weapons.length === 0) {
      setSelectedId(null)
      return
    }
    if (!selectedId || !weapons.some((w) => String(w.id) === selectedId)) {
      setSelectedId(String(weapons[0].id))
    }
  }, [weapons, selectedId])

  useEffect(() => {
    setMaintDate(todayIsoDate())
  }, [selectedId])

  const idleOptics = useMemo(() => optics.filter(isOpticIdle), [optics])

  const attachedOptic = useMemo(() => {
    if (!selected) return null
    const aid = getAttachedAccessoryId(selected)
    if (!aid) return null
    return optics.find((o) => String(o.id) === aid) ?? allItems.find((o) => String(o.id) === aid) ?? null
  }, [selected, optics, allItems])

  const totalRounds = selected ? getEffectiveTotalRoundsFired(selected, rangeLogs) : 0
  const yivPercent = selected ? getYivConditionPercent(selected, rangeLogs) : 100
  const roundsSinceMaint = selected ? getRoundsSinceLastMaintenance(selected, rangeLogs) : 0
  const maintenanceLogs = selected ? getWeaponMaintenanceLogs(selected) : []
  const inventoryEntryDate = selected ? getWeaponCreatedAt(selected) : '—'

  const periodicAlert = roundsSinceMaint > 500
  const criticalAlert = yivPercent < 30

  const deleteWeapon = useCallback(
    async (weaponRow, e) => {
      e.stopPropagation()
      const id = String(weaponRow.id)
      const label = weaponDisplayName(weaponRow)
      const ok = window.confirm(`SİLAH ENVANTERDEN TAMAMEN ÇIKARILSIN MI?\n\n[${weaponStokKodu(id)}] ${label}`)
      if (!ok) return
      setBusy(true)
      try {
        const aid = getAttachedAccessoryId(weaponRow)
        if (aid) {
          const optic =
            optics.find((o) => String(o.id) === aid) ?? allItems.find((o) => String(o.id) === aid) ?? null
          if (optic) {
            await syncDetachAccessory({
              commitDeploymentBatch,
              accessory: optic,
              weapon: weaponRow,
              logDate: todayIsoDate(),
            })
          } else {
            await updateItem(String(weaponRow.id), { attached_accessory_id: null })
          }
        }
        await deleteItem(id)
        if (selectedId === id) setSelectedId(null)
      } finally {
        setBusy(false)
      }
    },
    [deleteItem, updateItem, selectedId, optics, allItems, commitDeploymentBatch]
  )

  const detachAccessory = useCallback(async () => {
    if (!selected?.id || !attachedOptic?.id) return
    setBusy(true)
    try {
      await syncDetachAccessory({
        commitDeploymentBatch,
        accessory: attachedOptic,
        weapon: selected,
        logDate: todayIsoDate(),
      })
      setAttachId('')
    } finally {
      setBusy(false)
    }
  }, [selected, attachedOptic, commitDeploymentBatch])

  const attachAccessory = useCallback(async () => {
    if (!selected?.id || !attachId) return
    const optic = optics.find((o) => String(o.id) === attachId)
    if (!optic || !isOpticIdle(optic)) return
    setBusy(true)
    try {
      await syncMountAccessory({
        commitDeploymentBatch,
        accessory: optic,
        weapon: selected,
        logDate: todayIsoDate(),
        previousAccessoryOnWeapon: attachedOptic,
      })
      setAttachId('')
    } finally {
      setBusy(false)
    }
  }, [selected, attachId, optics, attachedOptic, commitDeploymentBatch])

  const openMaintenanceFlow = useCallback(() => {
    if (isMaintenanceRequired(selected ?? {})) {
      setMaintModalOpen(true)
      return
    }
    maintFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [selected])

  const submitMaintenance = useCallback(
    async (e) => {
      e.preventDefault()
      if (!selected?.id) return
      setMaintSaving(true)
      try {
        await submitWeaponMaintenanceLog({
          updateItem,
          weapon: selected,
          rangeLogs,
          maintenanceType: maintType,
          date: maintDate,
          cleanedBy: '',
          note: maintNote,
        })
        setMaintNote('')
        setMaintType(MAINTENANCE_TYPES[0])
        setMaintDate(todayIsoDate())
        setMaintModalOpen(false)
      } finally {
        setMaintSaving(false)
      }
    },
    [selected, rangeLogs, maintType, maintDate, maintNote, updateItem]
  )

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 rounded border border-accent/50 bg-accent/12 px-3 py-2 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-accent shadow-[0_0_12px_-4px_rgba(255,180,0,0.4)] transition hover:bg-accent/20"
      >
        <span aria-hidden>↩️</span>
        GERİ DÖN / RETURN
      </button>

      <WeaponMaintenanceAlarmFromInventory
        inventory={allItems}
        rangeLogs={rangeLogs}
        updateItem={updateItem}
        className="mb-1"
      />

      <div className="grid min-h-[32rem] gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_minmax(0,1.4fr)]">
        {/* Sol — silah rafı */}
        <TacticalPanel className="flex min-h-0 flex-col border-white/10 bg-black/40 p-0">
          <p className="border-b border-white/10 bg-app-bg px-3 py-2 font-mono-technical text-[8px] font-bold uppercase tracking-[0.24em] text-accent/85">
            Silah Rafı
          </p>
          <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2 op-detay-col-scroll">
            {weapons.length === 0 ? (
              <li className="py-8 text-center font-mono-technical text-[9px] uppercase text-app-text/45">SİLAH_KAYDI_YOK</li>
            ) : (
              weapons.map((w) => {
                const id = String(w.id)
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
                      {active ? (
                        <span className="mb-1 block animate-pulse text-accent">[ ➔ ]</span>
                      ) : null}
                      <span className="block truncate text-[10px] font-bold uppercase text-inherit">{weaponDisplayName(w)}</span>
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={(e) => deleteWeapon(w, e)}
                      className="shrink-0 self-stretch rounded border border-red-500/35 px-1.5 font-mono-technical text-[8px] font-bold uppercase text-red-400 hover:bg-red-950/40 disabled:opacity-40"
                      aria-label={`${weaponDisplayName(w)} sil`}
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
              onClick={onAddWeapon}
              className="flex w-full items-center justify-center gap-1.5 rounded border border-accent/40 bg-accent/10 py-2 font-mono-technical text-[8px] font-bold uppercase tracking-wider text-accent hover:bg-accent/16"
            >
              <Plus className="size-3" aria-hidden />
              + YENİ_SİLAH_KAYDI
            </button>
          </div>
        </TacticalPanel>

        {/* Orta — monitör */}
        <TacticalPanel className="flex min-h-0 flex-col border-white/10 bg-black/40 p-0">
          <p className="border-b border-white/10 bg-app-bg px-3 py-2 font-mono-technical text-[8px] font-bold uppercase tracking-[0.24em] text-accent/80">
            3D Silah Görünümü
          </p>
          {selected ? (
            <>
              <WeaponMaintenanceCenterAlert weapon={selected} onOpenMaintenance={openMaintenanceFlow} />
              <MatrixWireVisualizer
                variant="pistol"
                imageSrc={imageSrc}
                imageAlt={weaponDisplayName(selected)}
                label=""
              />
              <div className="space-y-3 border-t border-white/10 p-3 font-mono-technical text-[9px] uppercase">
                <div>
                  <p className="mb-1 text-app-text/55">Yiv-Set Durumu</p>
                  <p className="text-accent">
                    Durum: [{formatConditionBar(yivPercent)}] %{yivPercent}
                  </p>
                </div>
                <div className="text-app-text/55">
                  <span>
                    TOPLAM ATIM SAYISI: <span className="tabular-nums text-app-text">{totalRounds.toLocaleString('tr-TR')}</span>
                  </span>
                </div>
                <p className="font-mono-technical text-[9px] uppercase tracking-[0.12em] text-accent">
                  Envantere Giriş Tarihi: <span className="tabular-nums">{inventoryEntryDate}</span>
                </p>
              </div>
            </>
          ) : (
            <p className="flex flex-1 items-center justify-center p-6 font-mono-technical text-[9px] uppercase text-app-text/45">
              SİLAH_SEÇİN
            </p>
          )}
        </TacticalPanel>

        {/* Sağ — lojistik */}
        <TacticalPanel className="flex min-h-0 flex-col border-white/10 bg-black/40 p-0">
          <p className="border-b border-white/10 bg-app-bg px-3 py-2 font-mono-technical text-[8px] font-bold uppercase tracking-[0.24em] text-[#7ab4ff]/85">
            Bakım Terminali
          </p>
          {!selected ? (
            <p className="p-6 font-mono-technical text-[9px] uppercase text-app-text/45">TERMİNAL_BEKLEMEDE</p>
          ) : (
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 op-detay-col-scroll">
              {periodicAlert ? (
                <p className="animate-pulse rounded border border-orange-500/60 bg-orange-950/30 px-2 py-1.5 text-center font-mono-technical text-[8px] font-bold text-orange-400">
                  [ 🛠️ PERIYODIK BAKIM ZAMANI ]
                </p>
              ) : null}
              {criticalAlert ? (
                <p className="animate-pulse rounded border border-red-500/70 bg-red-950/40 px-2 py-1.5 text-center font-mono-technical text-[8px] font-bold text-red-400">
                  [ ⚠️ YİV-SET KRİTİK / NAMLU DEĞİŞİMİ ]
                </p>
              ) : null}

              <div className="space-y-2 border-b border-white/10 pb-3">
                <p className="font-mono-technical text-[8px] font-bold uppercase text-app-text/55">AKSESUAR:</p>
                {attachedOptic ? (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-[10px] text-[#7ab4ff]">{invStr(attachedOptic.name) || '—'}</span>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={detachAccessory}
                      className="rounded border border-red-500/40 px-2 py-1 font-mono-technical text-[8px] uppercase text-red-400 hover:bg-red-950/30"
                    >
                      [ ⌧ SÖK / DETACH ]
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <select
                      className={selectClass}
                      value={attachId}
                      onChange={(e) => setAttachId(e.target.value)}
                      disabled={busy || idleOptics.length === 0}
                    >
                      <option value="">— Aksesuar Seç —</option>
                      {idleOptics.map((o) => (
                        <option key={String(o.id)} value={String(o.id)}>
                          {invStr(o.name) || String(o.id)}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={busy || !attachId}
                      onClick={attachAccessory}
                      className="shrink-0 rounded border border-accent/40 px-2 py-2 font-mono-technical text-[8px] uppercase text-accent hover:bg-accent/10 disabled:opacity-40"
                    >
                      MONTAJ
                    </button>
                  </div>
                )}
              </div>

              <div ref={maintFormRef} className="space-y-2">
                <p className="font-mono-technical text-[8px] font-bold uppercase tracking-wider text-app-text/55">
                  Bakım Günlüğü
                </p>
                <p className="font-mono text-[8px] text-app-text/45">
                  SON_BAKIMDAN_ATIM: <span className="text-accent">{roundsSinceMaint.toLocaleString('tr-TR')}</span>
                </p>

                <form onSubmit={submitMaintenance} className="space-y-2 rounded border border-white/10 bg-black/50 p-2">
                  <p className="font-mono-technical text-[7px] font-bold uppercase text-accent/80">Yeni Bakım Kaydı</p>
                  <label className="block">
                    <span className="font-mono-technical text-[7px] font-bold uppercase tracking-wider text-app-text/55">
                      BAKIM TARİHİ:
                    </span>
                    <input
                      type="date"
                      className={`${dateInputClass} mt-1`}
                      value={maintDate}
                      max={todayIsoDate()}
                      onChange={(e) => setMaintDate(e.target.value)}
                      disabled={maintSaving}
                      required
                    />
                  </label>
                  <select
                    className={selectClass}
                    value={maintType}
                    onChange={(e) => setMaintType(e.target.value)}
                    disabled={maintSaving}
                  >
                    {MAINTENANCE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <input
                    className="w-full border border-white/15 bg-transparent px-2 py-1.5 font-mono text-[10px] text-app-text outline-none focus:border-accent/40"
                    placeholder="Bakım notu"
                    value={maintNote}
                    onChange={(e) => setMaintNote(e.target.value)}
                    disabled={maintSaving}
                  />
                  <button
                    type="submit"
                    disabled={maintSaving}
                    className="w-full rounded border border-accent/35 py-1.5 font-mono-technical text-[8px] font-bold uppercase text-accent hover:bg-accent/10 disabled:opacity-50"
                  >
                    {maintSaving ? '…' : 'KAYDET'}
                  </button>
                </form>

                <div className="my-2 border-t border-dashed border-white/15" aria-hidden>
                  -------------------------
                </div>

                <ul className="space-y-2">
                  {maintenanceLogs.length === 0 ? (
                    <li className="font-mono text-[9px] text-app-text/45">BAKIM_KAYDI_YOK</li>
                  ) : (
                    maintenanceLogs.map((log, i) => (
                      <li key={`${log.date}-${i}`} className="border-b border-dashed border-white/[0.06] pb-2 font-mono text-[9px] leading-snug text-accent/85">
                        <span className="text-app-text/55">[{log.date}]</span> · ATIM:{log.rounds_at_maintenance} ·{' '}
                        {log.maintenanceType}
                        {log.note ? ` · ${log.note}` : ''}
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>
          )}
        </TacticalPanel>
      </div>

      <WeaponMaintenanceLogModal
        open={maintModalOpen}
        weapon={selected}
        rangeLogs={rangeLogs}
        updateItem={updateItem}
        lockDismiss
        onSuccess={() => setMaintModalOpen(false)}
      />
    </div>
  )
}
