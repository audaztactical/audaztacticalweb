import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import MatrixWireVisualizer from './MatrixWireVisualizer'
import InventoryBallisticEditPanel from './InventoryBallisticEditPanel'
import TacticalPanel from '../ui/TacticalPanel'
import {
  AMMO_TX_TYPES,
  ammoDisplayLabel,
  ammoStokKodu,
  getAmmoCreatedAt,
  getAmmoTransactionLogs,
  getCriticalThreshold,
  getCurrentStock,
  getSafetyMarginBar,
  getSafetyMarginPercent,
  isAmmoCritical,
} from '../../lib/ammoIlws'
import { processUnsyncedRangeLogsForAmmo } from '../../lib/ammoRangeSync'
import { matchesIsoDateRange, matchesTypeFilter } from '../../lib/logSummaryFilters'
import { todayIsoDate } from '../../lib/weaponIlws'
import { armoryLocale, displayCaliberName, labelAmmoTxType } from '../../lib/armoryDisplayText'

const filterSelectClass =
  'dossier-blood-select mt-0.5 w-full rounded border border-accent/35 bg-app-bg py-1 pl-1.5 pr-6 font-mono-technical text-[8px] uppercase text-app-text outline-none'

const filterDateClass =
  'mt-0.5 w-full rounded border border-accent/50 bg-app-bg px-1.5 py-1 font-mono-technical text-[8px] text-accent outline-none [color-scheme:dark]'

const panelScroll = 'ilws-green-scroll min-h-0 overflow-y-auto overscroll-y-contain'

const terminalGrid =
  'grid max-h-[calc(100vh-180px)] min-h-[26rem] gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_minmax(0,1.4fr)]'

/**
 * @param {{
 *   ammo: Record<string, unknown>[]
 *   weapons: Record<string, unknown>[]
 *   rangeLogs: Record<string, unknown>[]
 *   imageSrc: string
 *   onBack: () => void
 *   onAddAmmo: () => void
 *   updateItem: (id: string, patch: Record<string, unknown>) => Promise<unknown>
 *   deleteItem: (id: string) => Promise<unknown>
 * }} props
 */
export default function AmmoDeepDive({
  ammo,
  weapons,
  rangeLogs,
  imageSrc,
  onBack,
  onAddAmmo,
  updateItem,
  deleteItem,
}) {
  const { t, i18n } = useTranslation('armory')
  const locale = armoryLocale()
  const txFilters = useMemo(
    () => [
      { value: 'ALL', label: t('ammoDeepDive.allActions') },
      { value: AMMO_TX_TYPES.SUPPLY, label: labelAmmoTxType(AMMO_TX_TYPES.SUPPLY) },
      { value: AMMO_TX_TYPES.TRAINING, label: labelAmmoTxType(AMMO_TX_TYPES.TRAINING) },
    ],
    [t, i18n.language]
  )

  const [selectedId, setSelectedId] = useState(/** @type {string | null} */ (null))
  const [isViewingLogs, setIsViewingLogs] = useState(false)
  const [busy, setBusy] = useState(false)
  const [txTypeFilter, setTxTypeFilter] = useState('ALL')
  const [txDateFrom, setTxDateFrom] = useState('')
  const [txDateTo, setTxDateTo] = useState('')
  const syncLock = useRef(false)

  const selected = useMemo(
    () => ammo.find((a) => String(a.id) === selectedId) ?? ammo[0] ?? null,
    [ammo, selectedId]
  )

  useEffect(() => {
    if (ammo.length === 0) {
      setSelectedId(null)
      return
    }
    if (!selectedId || !ammo.some((a) => String(a.id) === selectedId)) {
      setSelectedId(String(ammo[0].id))
    }
  }, [ammo, selectedId])

  useEffect(() => {
    setIsViewingLogs(false)
    setTxTypeFilter('ALL')
    setTxDateFrom('')
    setTxDateTo('')
  }, [selectedId])

  useEffect(() => {
    if (!ammo.length || !weapons.length || !rangeLogs.length) return undefined
    let cancelled = false

    const run = async () => {
      if (syncLock.current) return
      syncLock.current = true
      try {
        await processUnsyncedRangeLogsForAmmo({ rangeLogs, ammoRows: ammo, weapons, updateItem })
      } catch {
        /* Firestore listener yeniden dener */
      } finally {
        if (!cancelled) syncLock.current = false
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [ammo, weapons, rangeLogs, updateItem])

  const stock = selected ? getCurrentStock(selected) : 0
  const totalStock = useMemo(
    () => ammo.reduce((sum, row) => sum + getCurrentStock(row), 0),
    [ammo]
  )
  const threshold = selected ? getCriticalThreshold(selected) : 500
  const safetyPct = getSafetyMarginPercent(stock, threshold)
  const safetyBar = getSafetyMarginBar(stock, threshold)
  const critical = selected ? isAmmoCritical(selected) : false
  const entryDate = selected ? getAmmoCreatedAt(selected) : t('common.emDash')

  const transactionLogs = useMemo(() => {
    if (!selected) return []
    return getAmmoTransactionLogs(selected)
  }, [selected])

  const filteredTransactions = useMemo(() => {
    return transactionLogs.filter(
      (log) =>
        matchesTypeFilter(log.type, txTypeFilter) && matchesIsoDateRange(log.date, txDateFrom, txDateTo)
    )
  }, [transactionLogs, txTypeFilter, txDateFrom, txDateTo])

  const inventoryStats = useMemo(() => {
    let criticalCount = 0
    for (const row of ammo) {
      if (isAmmoCritical(row)) criticalCount += 1
    }
    return { total: ammo.length, critical: criticalCount }
  }, [ammo])

  const deleteAmmo = useCallback(
    async (row, e) => {
      e.stopPropagation()
      const id = String(row.id)
      const ok = window.confirm(t('ammoDeepDive.deleteConfirm', { label: ammoDisplayLabel(row) }))
      if (!ok) return
      setBusy(true)
      try {
        await deleteItem(id)
        if (selectedId === id) setSelectedId(null)
      } finally {
        setBusy(false)
      }
    },
    [deleteItem, selectedId, t]
  )

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 rounded border border-accent/50 bg-accent/12 px-3 py-2 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-accent shadow-[0_0_12px_-4px_rgba(255,180,0,0.4)] transition hover:bg-accent/20"
      >
        <span aria-hidden>↩️</span>
        {t('ammoDeepDive.back')}
      </button>

      <div className={terminalGrid}>
        <div className="flex min-h-0 flex-col gap-2">
          <TacticalPanel className="flex min-h-0 flex-1 flex-col overflow-hidden border-white/10 bg-black/40 p-0">
            <p className="shrink-0 border-b border-white/10 bg-app-bg px-3 py-2 font-mono-technical text-[8px] font-bold uppercase tracking-[0.24em] text-accent/85">
              {t('ammoDeepDive.rackTitle')}
            </p>
            <ul className={`min-h-0 flex-1 space-y-1 p-2 ${panelScroll}`}>
              {ammo.length === 0 ? (
                <li className="py-8 text-center font-mono-technical text-[9px] uppercase text-app-text/45">
                  {t('ammoDeepDive.empty')}
                </li>
              ) : (
                ammo.map((row) => {
                  const id = String(row.id)
                  const active = selected && String(selected.id) === id
                  const qty = getCurrentStock(row)
                  const crit = isAmmoCritical(row)
                  return (
                    <li key={id} className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setSelectedId(id)}
                        className={`min-w-0 flex-1 rounded border px-2 py-2 text-left font-mono-technical text-[9px] transition ${
                          active
                            ? 'border-accent/50 bg-accent/10 text-accent'
                            : crit
                              ? 'border-red-500/40 bg-red-950/20 text-red-300'
                              : 'border-white/8 bg-black/30 text-app-text/70 hover:border-white/20 hover:text-app-text'
                        }`}
                      >
                        {active ? <span className="mb-1 block animate-pulse text-accent">[ ➔ ]</span> : null}
                        <span className="block text-[8px] text-app-text/55">[{ammoStokKodu(id)}]</span>
                        <span className="block truncate text-[10px] font-bold uppercase">{displayCaliberName(row)}</span>
                        <span className="mt-0.5 block text-[8px] tabular-nums text-app-text/55">
                          {t('ammoDeepDive.qtyUnit', { qty })}
                        </span>
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={(e) => deleteAmmo(row, e)}
                        className="shrink-0 self-stretch rounded border border-red-500/35 px-1.5 font-mono-technical text-[8px] font-bold uppercase text-red-400 hover:bg-red-950/40 disabled:opacity-40"
                      >
                        {t('ammoDeepDive.delete')}
                      </button>
                    </li>
                  )
                })
              )}
            </ul>
            <div className="shrink-0 border-t border-white/10 p-2">
              <button
                type="button"
                onClick={onAddAmmo}
                className="flex w-full items-center justify-center gap-1.5 rounded border border-accent/40 bg-accent/10 py-2 font-mono-technical text-[8px] font-bold uppercase tracking-wider text-accent hover:bg-accent/16"
              >
                <Plus className="size-3" aria-hidden />
                {t('ammoDeepDive.addAmmo')}
              </button>
            </div>
          </TacticalPanel>

          <TacticalPanel className="shrink-0 border border-accent/25 bg-black/50 p-0">
            <p className="border-b border-accent/30 bg-app-bg px-3 py-1.5 font-mono-technical text-[8px] font-bold uppercase tracking-wider text-accent/90">
              {t('ammoDeepDive.depotSummary')}
            </p>
            <div className="grid grid-cols-2 gap-2 p-2 font-mono-technical text-[9px] uppercase">
              <p className="rounded border border-white/10 bg-black/40 px-2 py-1.5 text-center">
                <span className="block text-[7px] text-app-text/55">{t('ammoDeepDive.calibre')}</span>
                <span className="text-accent">{inventoryStats.total}</span>
              </p>
              <p className="rounded border border-red-500/30 bg-red-950/15 px-2 py-1.5 text-center">
                <span className="block text-[7px] text-app-text/55">{t('ammoDeepDive.critical')}</span>
                <span className="text-red-400">{inventoryStats.critical}</span>
              </p>
            </div>
          </TacticalPanel>
        </div>

        <TacticalPanel className="flex min-h-0 flex-col overflow-hidden border-white/10 bg-black/40 p-0">
          <p className="shrink-0 border-b border-white/10 bg-app-bg px-3 py-2 font-mono-technical text-[8px] font-bold uppercase tracking-[0.24em] text-accent/80">
            {isViewingLogs ? t('ammoDeepDive.spendLedger') : t('ammoDeepDive.view3d')}
          </p>
          {selected ? (
            <div className="flex min-h-0 flex-1 flex-col">
              {isViewingLogs ? (
                <>
                  <div className="flex shrink-0 items-start justify-between gap-2 border-b border-[#00b4ff]/25 bg-[#050a12] px-3 py-2">
                    <div>
                      <p className="font-mono-technical text-[8px] font-bold uppercase tracking-wider text-[#5ec8ff]">
                        {t('ammoDeepDive.ledgerTitle')}
                      </p>
                      <p className="mt-0.5 font-mono-technical text-[7px] tabular-nums text-app-text/55">
                        {t('ammoDeepDive.recordCount', {
                          filtered: filteredTransactions.length,
                          total: transactionLogs.length,
                        })}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsViewingLogs(false)}
                      className="shrink-0 rounded border border-red-500/55 bg-red-950/25 px-2 py-1 font-mono-technical text-[8px] font-bold uppercase tracking-wide text-red-400 shadow-[0_0_12px_rgba(239,68,68,0.25)] transition hover:bg-red-950/45"
                    >
                      {t('ammoDeepDive.returnToMonitor')}
                    </button>
                  </div>
                  <div className={`min-h-0 flex-1 space-y-2 p-3 ${panelScroll}`}>
                    <div className="grid gap-1.5 rounded border border-[#00b4ff]/35 bg-[#00b4ff]/5 p-2">
                      <p className="font-mono-technical text-[7px] font-bold uppercase text-[#5ec8ff]/80">
                        {t('ammoDeepDive.filter')}
                      </p>
                      <div className="grid gap-1.5 sm:grid-cols-3">
                        <label className="block">
                          <span className="font-mono-technical text-[7px] uppercase text-app-text/55">
                            {t('ammoDeepDive.actionType')}
                          </span>
                          <select className={filterSelectClass} value={txTypeFilter} onChange={(e) => setTxTypeFilter(e.target.value)}>
                            {txFilters.map((f) => (
                              <option key={f.value} value={f.value}>
                                {f.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="block">
                          <span className="font-mono-technical text-[7px] uppercase text-app-text/55">
                            {t('ammoDeepDive.dateFrom')}
                          </span>
                          <input
                            type="date"
                            className={filterDateClass}
                            value={txDateFrom}
                            max={txDateTo || todayIsoDate()}
                            onChange={(e) => setTxDateFrom(e.target.value)}
                          />
                        </label>
                        <label className="block">
                          <span className="font-mono-technical text-[7px] uppercase text-app-text/55">
                            {t('ammoDeepDive.dateTo')}
                          </span>
                          <input
                            type="date"
                            className={filterDateClass}
                            value={txDateTo}
                            min={txDateFrom || undefined}
                            max={todayIsoDate()}
                            onChange={(e) => setTxDateTo(e.target.value)}
                          />
                        </label>
                      </div>
                    </div>
                    <ul className="space-y-1.5 rounded border border-[#00b4ff]/30 bg-black/30 p-2">
                      {transactionLogs.length === 0 ? (
                        <li className="font-mono-technical text-[9px] uppercase text-app-text/45">
                          {t('ammoDeepDive.noRecords')}
                        </li>
                      ) : filteredTransactions.length === 0 ? (
                        <li className="font-mono-technical text-[9px] uppercase text-app-text/45">
                          {t('ammoDeepDive.noFilterResults')}
                        </li>
                      ) : (
                        filteredTransactions.map((log, i) => (
                          <li
                            key={`${log.date}-${log.type}-${log.rangeLogId ?? i}`}
                            className="rounded border border-white/8 bg-black/50 px-2 py-1.5 font-mono-technical text-[8px] uppercase"
                          >
                            <span className="text-app-text/55">{log.date}</span>
                            <span className={`ml-2 ${log.type === AMMO_TX_TYPES.SUPPLY ? 'text-accent' : 'text-amber-400'}`}>
                              {labelAmmoTxType(log.type)}
                            </span>
                            <span className={`ml-2 tabular-nums ${log.amount >= 0 ? 'text-accent' : 'text-red-400'}`}>
                              {log.amount >= 0 ? '+' : ''}
                              {log.amount}
                            </span>
                            <p className="mt-0.5 normal-case text-app-text/90">{log.note || t('common.emDash')}</p>
                            {log.balanceAfter != null ? (
                              <p className="mt-0.5 text-[7px] text-app-text/55">
                                {t('ammoDeepDive.balance', { balance: log.balanceAfter })}
                              </p>
                            ) : null}
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                </>
              ) : (
                <>
                  <MatrixWireVisualizer
                    variant="cartridge"
                    imageSrc={imageSrc}
                    imageAlt={displayCaliberName(selected)}
                    label=""
                  />
                  <div className="shrink-0 space-y-3 border-t border-white/10 px-3 py-3">
                    <p className="font-mono-technical text-[9px] uppercase text-app-text/55">
                      {t('ammoDeepDive.calibreLabel')} <span className="text-accent">{displayCaliberName(selected)}</span>
                    </p>
                    <p className="font-mono-technical text-[9px] uppercase tracking-[0.12em] text-accent">
                      {t('ammoDeepDive.inventoryEntry')} <span className="tabular-nums">{entryDate}</span>
                    </p>
                    <p className="font-mono-technical text-2xl font-bold tabular-nums tracking-wider text-accent sm:text-3xl">
                      {t('ammoDeepDive.currentStock')}{' '}
                      <span className="text-app-text">{totalStock.toLocaleString(locale)}</span>{' '}
                      <span className="text-lg text-app-text/70">{t('ammoDeepDive.unit')}</span>
                    </p>
                    <p className="font-mono-technical text-sm font-bold tabular-nums uppercase tracking-wider text-app-text/55">
                      {t('ammoDeepDive.selectedAmmo')}{' '}
                      <span className="text-accent">{stock.toLocaleString(locale)}</span>{' '}
                      <span className="text-xs text-app-text/70">{t('ammoDeepDive.unit')}</span>
                    </p>
                    <div className="rounded border border-accent/25 bg-black/40 px-2 py-2">
                      <p className="font-mono-technical text-[8px] uppercase text-app-text/55">
                        {t('ammoDeepDive.safetyMargin')} <span className="text-accent">{safetyBar}</span>{' '}
                        <span className="tabular-nums">%{safetyPct}</span>
                      </p>
                    </div>
                    {critical ? (
                      <p className="animate-pulse rounded border border-red-500/50 bg-red-950/30 px-2 py-2 text-center font-mono-technical text-[9px] font-bold uppercase text-red-400 shadow-[0_0_16px_rgba(239,68,68,0.35)]">
                        {t('ammoDeepDive.criticalAlert')}
                      </p>
                    ) : null}
                  </div>
                </>
              )}
            </div>
          ) : (
            <p className="flex flex-1 items-center justify-center p-6 font-mono-technical text-[9px] uppercase text-app-text/45">
              {t('ammoDeepDive.selectCalibre')}
            </p>
          )}
        </TacticalPanel>

        <TacticalPanel className="flex min-h-0 flex-col overflow-hidden border-white/10 bg-black/40 p-0">
          <p className="shrink-0 border-b border-white/10 bg-app-bg px-3 py-2 font-mono-technical text-[8px] font-bold uppercase tracking-[0.24em] text-accent/80">
            {t('ammoDeepDive.analyticsHub')}
          </p>
          {selected ? (
            <div className={`min-h-0 flex-1 space-y-3 p-3 ${panelScroll}`}>
              <InventoryBallisticEditPanel kind="ammo" row={selected} updateItem={updateItem} />
              <div className="rounded border border-accent/30 bg-black/50 p-3">
                <p className="font-mono-technical text-[8px] font-bold uppercase tracking-wider text-app-text/55">
                  {t('ammoDeepDive.criticalThreshold')}
                </p>
                <p className="mt-1 font-mono-technical text-xl font-bold tabular-nums text-accent">
                  {threshold.toLocaleString(locale)}
                </p>
                <p className="mt-2 font-mono-technical text-[8px] uppercase text-app-text/45">
                  {t('ammoDeepDive.currentSafety', { stock, pct: safetyPct })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsViewingLogs(true)}
                disabled={!selected}
                className="w-full rounded border border-[#00b4ff]/55 bg-[#00b4ff]/12 py-2.5 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-[#5ec8ff] shadow-[0_0_18px_rgba(0,180,255,0.28)] transition hover:bg-[#00b4ff]/20 disabled:opacity-40"
              >
                {t('ammoDeepDive.viewSpendLogs')}
              </button>
            </div>
          ) : (
            <p className="flex flex-1 items-center justify-center p-6 font-mono-technical text-[9px] uppercase text-app-text/45">
              {t('ammoDeepDive.selectCalibre')}
            </p>
          )}
        </TacticalPanel>
      </div>
    </div>
  )
}
