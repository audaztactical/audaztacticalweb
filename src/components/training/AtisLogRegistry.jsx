import { Fragment, useMemo, useState } from 'react'
import { ChevronDown, FileDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import TacticalPanel from '../ui/TacticalPanel'
import { useAuth } from '../../context/AuthContext'
import { generateAtisShootingReportPdf } from '../../lib/atisShootingReportPdf'
import {
  extractAtisCaliberOptions,
  extractAtisDrillOptions,
  filterAtisLogs,
  getAtisAccuracyPercent,
  getAtisAmmoName,
  getAtisDistanceM,
  getAtisRoundsAndHits,
  getAtisTimingDetails,
  getAtisWeaponLabel,
  isAtisFilterActive,
  isAtisTimed,
  selectAtisShootingLogs,
} from '../../lib/atisLogRegistry'
import { getLogMeteoData } from '../../lib/meteoDataCapture'
import {
  getLogBarrelWearPercent,
  getLogYivConditionPercent,
} from '../../lib/weaponMaintenanceAlarm'
import { formatConditionBar } from '../../lib/weaponIlws'
import { formatLogAmmoCostLabel, resolveLogAmmoCost, formatAmmoCostTry } from '../../lib/ammoCost'
import {
  formatAtisAccessoriesLinesDisplay,
  formatAtisCaliberLabelDisplay,
  formatAtisDateCellDisplay,
  formatAtisDrillNameDisplay,
  formatAtisDurationCellDisplay,
  formatAtisFilterSummaryDisplay,
  formatAtisMeteoRowsDisplay,
  formatAtisOperationNoteDisplay,
  formatAtisWeaponSpecsLinesDisplay,
  trainingLocale,
} from '../../lib/trainingDisplayText'

const filterSelectClass =
  'dossier-blood-select min-w-[8.5rem] flex-1 rounded border border-accent/35 bg-app-bg py-1.5 pl-2 pr-7 font-mono-technical text-[9px] uppercase text-app-text outline-none focus:border-accent/60'

const FILTER_INITIAL = {
  weaponType: 'ALL',
  caliberKey: 'ALL',
  drillName: 'ALL',
  timing: 'ALL',
}

/**
 * @param {{ rangeLogs: Record<string, unknown>[]; inventory?: Record<string, unknown>[]; loading?: boolean }} props
 */
export default function AtisLogRegistry({ rangeLogs, inventory = [], loading = false }) {
  const { t } = useTranslation('training')
  const { userData } = useAuth()
  const [filters, setFilters] = useState(FILTER_INITIAL)
  const [expandedId, setExpandedId] = useState(/** @type {string | null} */ (null))
  const [pdfBusyId, setPdfBusyId] = useState(/** @type {string | null} */ (null))
  const [bulkPdfBusy, setBulkPdfBusy] = useState(false)

  const filterActive = useMemo(() => isAtisFilterActive(filters), [filters])

  const atisLogs = useMemo(() => selectAtisShootingLogs(rangeLogs), [rangeLogs])
  const caliberOptions = useMemo(() => extractAtisCaliberOptions(atisLogs), [atisLogs])
  const drillOptions = useMemo(() => extractAtisDrillOptions(atisLogs), [atisLogs])

  const filtered = useMemo(
    () =>
      filterAtisLogs({
        logs: atisLogs,
        weaponType: /** @type {import('../../lib/atisLogRegistry').WeaponTypeFilter} */ (filters.weaponType),
        caliberKey: filters.caliberKey,
        drillName: filters.drillName,
        timing: /** @type {import('../../lib/atisLogRegistry').TimingFilter} */ (filters.timing),
      }),
    [atisLogs, filters],
  )

  const patchFilter = (/** @type {Partial<typeof FILTER_INITIAL>} */ next) => {
    setFilters((f) => ({ ...f, ...next }))
    setExpandedId(null)
  }

  const handleDownloadPdf = async (/** @type {Record<string, unknown>} */ row) => {
    const id = String(row.id)
    setPdfBusyId(id)
    try {
      await generateAtisShootingReportPdf({
        logs: [row],
        operator: userData,
        inventory,
      })
    } finally {
      setPdfBusyId(null)
    }
  }

  const handleDownloadBulkPdf = async () => {
    if (filtered.length === 0) return
    setBulkPdfBusy(true)
    try {
      await generateAtisShootingReportPdf({
        logs: filtered,
        operator: userData,
        filterActive,
        filterLabel: formatAtisFilterSummaryDisplay(filters),
        inventory,
      })
    } finally {
      setBulkPdfBusy(false)
    }
  }

  return (
    <TacticalPanel className="relative border-accent/20 bg-app-bg/95 p-0">
      <span className="pointer-events-none absolute left-2 top-2 z-10 h-3 w-3 border-l border-t border-accent/45" />
      <span className="pointer-events-none absolute right-2 top-2 z-10 h-3 w-3 border-r border-t border-accent/45" />
      <span className="pointer-events-none absolute bottom-2 left-2 z-10 h-3 w-3 border-b border-l border-accent/45" />
      <span className="pointer-events-none absolute bottom-2 right-2 z-10 h-3 w-3 border-b border-r border-accent/45" />

      <div className="border-b border-accent/15 bg-app-bg px-4 py-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono-technical text-[9px] font-bold uppercase tracking-[0.28em] text-accent/90">
              {t('sectors.atis.history.title')}
            </p>
            <p className="mt-0.5 font-mono-technical text-[7px] uppercase text-app-text/45">
              {t('sectors.atis.history.syncMeta', { filtered: filtered.length, total: atisLogs.length })}
            </p>
          </div>
          {filtered.length > 0 ? (
            <button
              type="button"
              disabled={bulkPdfBusy}
              onClick={handleDownloadBulkPdf}
              className="inline-flex items-center gap-2 rounded border border-accent/45 bg-accent/10 px-3 py-1.5 font-mono-technical text-[9px] font-bold uppercase tracking-[0.14em] text-accent transition hover:border-accent/65 hover:bg-accent/16 disabled:opacity-50"
            >
              <FileDown className="size-3.5" strokeWidth={2} aria-hidden />
              {bulkPdfBusy ? t('sectors.atis.history.preparingPdf') : t('sectors.atis.history.downloadPdf')}
            </button>
          ) : null}
        </div>
      </div>

      <div className="border-b border-accent/12 bg-app-bg px-3 py-3">
        <p className="mb-2 font-mono-technical text-[7px] font-bold uppercase tracking-[0.24em] text-app-text/55">
          {t('sectors.atis.history.filterBar')}
        </p>
        <div className="flex flex-wrap gap-2">
          <label className="flex min-w-[10rem] flex-1 flex-col gap-0.5">
            <span className="font-mono-technical text-[7px] uppercase text-app-text/45">
              {t('sectors.atis.history.weaponType')}
            </span>
            <select
              className={filterSelectClass}
              value={filters.weaponType}
              onChange={(e) => patchFilter({ weaponType: e.target.value })}
            >
              <option value="ALL">{t('sectors.atis.history.all')}</option>
              <option value="HANDGUN">{t('sectors.atis.history.handgun')}</option>
              <option value="RIFLE">{t('sectors.atis.history.rifle')}</option>
            </select>
          </label>
          <label className="flex min-w-[10rem] flex-1 flex-col gap-0.5">
            <span className="font-mono-technical text-[7px] uppercase text-app-text/45">
              {t('sectors.atis.history.caliber')}
            </span>
            <select
              className={filterSelectClass}
              value={filters.caliberKey}
              onChange={(e) => patchFilter({ caliberKey: e.target.value })}
            >
              <option value="ALL">{t('sectors.atis.history.all')}</option>
              {caliberOptions.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-[10rem] flex-1 flex-col gap-0.5">
            <span className="font-mono-technical text-[7px] uppercase text-app-text/45">
              {t('sectors.atis.history.drillType')}
            </span>
            <select
              className={filterSelectClass}
              value={filters.drillName}
              onChange={(e) => patchFilter({ drillName: e.target.value })}
            >
              <option value="ALL">{t('sectors.atis.history.all')}</option>
              {drillOptions.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-[10rem] flex-1 flex-col gap-0.5">
            <span className="font-mono-technical text-[7px] uppercase text-app-text/45">
              {t('sectors.atis.history.timing')}
            </span>
            <select
              className={filterSelectClass}
              value={filters.timing}
              onChange={(e) => patchFilter({ timing: e.target.value })}
            >
              <option value="ALL">{t('sectors.atis.history.all')}</option>
              <option value="TIMED">{t('sectors.atis.history.timed')}</option>
              <option value="UNTIMED">{t('sectors.atis.history.untimed')}</option>
            </select>
          </label>
        </div>
      </div>

      <div className="ilws-green-scroll max-h-[min(52vh,520px)] overflow-auto">
        {loading ? (
          <p className="p-8 text-center font-mono-technical text-[10px] uppercase text-app-text/55">
            {t('sectors.atis.history.syncing')}
          </p>
        ) : filtered.length === 0 ? (
          <p className="p-8 text-center font-mono-technical text-[10px] uppercase text-app-text/45">
            {atisLogs.length === 0 ? t('sectors.atis.history.empty') : t('sectors.atis.history.noFilterResults')}
          </p>
        ) : (
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead className="sticky top-0 z-[2] bg-app-bg">
              <tr className="border-b border-accent/25 font-mono-technical text-[8px] font-bold uppercase tracking-wider text-accent/80">
                <th className="w-8 px-2 py-2" aria-hidden />
                <th className="px-3 py-2">{t('sectors.atis.history.columns.date')}</th>
                <th className="px-3 py-2">{t('sectors.atis.history.columns.weapon')}</th>
                <th className="px-3 py-2">{t('sectors.atis.history.columns.drill')}</th>
                <th className="px-3 py-2">{t('sectors.atis.history.columns.distance')}</th>
                <th className="px-3 py-2">{t('sectors.atis.history.columns.roundsHits')}</th>
                <th className="px-3 py-2">{t('sectors.atis.history.columns.cost')}</th>
                <th className="px-3 py-2">{t('sectors.atis.history.columns.score')}</th>
                <th className="px-3 py-2">{t('sectors.atis.history.columns.duration')}</th>
                <th className="px-3 py-2 text-right">{t('sectors.atis.history.columns.report')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const id = String(row.id)
                const open = expandedId === id
                const { totalRoundsFired, totalHits } = getAtisRoundsAndHits(row)
                const ammoCost = resolveLogAmmoCost(row, inventory)
                const costLabel = formatLogAmmoCostLabel(row, inventory)
                const accuracy = getAtisAccuracyPercent(row)
                const duration = formatAtisDurationCellDisplay(row)
                const timing = getAtisTimingDetails(row)
                const specLines = formatAtisWeaponSpecsLinesDisplay(row)

                return (
                  <Fragment key={id}>
                    <tr
                      role="button"
                      tabIndex={0}
                      onClick={() => setExpandedId(open ? null : id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setExpandedId(open ? null : id)
                        }
                      }}
                      className={`cursor-pointer border-b border-accent/10 font-mono-technical text-[9px] uppercase transition hover:bg-accent/[0.04] ${
                        open ? 'bg-accent/[0.06]' : ''
                      }`}
                    >
                      <td className="px-2 py-2 text-accent/60">
                        <ChevronDown
                          className={`size-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
                          aria-hidden
                        />
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 tabular-nums text-app-text/70">
                        {formatAtisDateCellDisplay(row)}
                      </td>
                      <td className="max-w-[140px] truncate px-3 py-2 text-app-text" title={getAtisWeaponLabel(row)}>
                        {getAtisWeaponLabel(row)}
                      </td>
                      <td className="max-w-[120px] truncate px-3 py-2 text-app-text/90">{formatAtisDrillNameDisplay(row)}</td>
                      <td className="px-3 py-2 tabular-nums text-app-text/70">{getAtisDistanceM(row)} m</td>
                      <td className="px-3 py-2 tabular-nums text-accent">
                        {totalRoundsFired} / {totalHits}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-accent">{costLabel}</td>
                      <td className="px-3 py-2 tabular-nums text-accent">
                        %{accuracy.toLocaleString(trainingLocale())}
                      </td>
                      <td
                        className={`px-3 py-2 tabular-nums ${duration.muted ? 'text-app-text/45' : 'text-[#5ec8ff]'}`}
                      >
                        {duration.label}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          disabled={pdfBusyId === id}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDownloadPdf(row)
                          }}
                          className="inline-flex items-center gap-1.5 rounded border border-accent/35 bg-accent/8 px-2 py-1 font-mono-technical text-[7px] font-bold uppercase tracking-[0.1em] text-accent transition hover:border-accent/55 hover:bg-accent/14 disabled:opacity-50"
                        >
                          <FileDown className="size-3" strokeWidth={2} aria-hidden />
                          {pdfBusyId === id ? '…' : 'PDF'}
                        </button>
                      </td>
                    </tr>
                    <tr className="border-b border-accent/8">
                      <td colSpan={10} className="p-0">
                        <div
                          className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                            open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                          }`}
                        >
                          <div className="min-h-0 overflow-hidden">
                            <div className="mx-3 mb-3 mt-1 rounded border border-accent/20 bg-black/50 p-3 font-mono-technical text-[8px] uppercase">
                              <p className="mb-2 font-bold tracking-wider text-accent/85">
                                {t('sectors.atis.history.detail.title')}
                              </p>
                              {isAtisTimed(row) && timing ? (
                                <div className="mb-3 grid gap-2 sm:grid-cols-2">
                                  <p className="rounded border border-[#00b4ff]/25 bg-[#00b4ff]/5 px-2 py-1.5">
                                    <span className="text-app-text/55">
                                      {t('sectors.atis.history.detail.firstShot')} ·{' '}
                                    </span>
                                    <span className="text-[#5ec8ff]">{timing.firstShot}</span>
                                  </p>
                                  <p className="rounded border border-[#00b4ff]/25 bg-[#00b4ff]/5 px-2 py-1.5">
                                    <span className="text-app-text/55">
                                      {t('sectors.atis.history.detail.avgSplit')} ·{' '}
                                    </span>
                                    <span className="text-[#5ec8ff]">{timing.split}</span>
                                  </p>
                                </div>
                              ) : (
                                <p className="mb-3 text-app-text/45">{t('sectors.atis.history.detail.noTiming')}</p>
                              )}
                              <p className="mb-1 text-app-text/55">
                                {t('sectors.atis.history.detail.ammo')}:{' '}
                                <span className="text-accent">{getAtisAmmoName(row)}</span>
                                <span className="mx-2 text-app-text/20">|</span>
                                {t('sectors.atis.history.detail.caliber')}:{' '}
                                <span className="text-app-text/90">{formatAtisCaliberLabelDisplay(row)}</span>
                                {ammoCost ? (
                                  <>
                                    <span className="mx-2 text-app-text/20">|</span>
                                    {t('sectors.atis.history.detail.unitPrice')}:{' '}
                                    <span className="text-accent">{formatAmmoCostTry(ammoCost.unitPrice)}</span>
                                    <span className="mx-2 text-app-text/20">|</span>
                                    {t('sectors.atis.history.detail.totalCost')}:{' '}
                                    <span className="text-accent">{formatAmmoCostTry(ammoCost.totalCost)}</span>
                                  </>
                                ) : null}
                              </p>
                              {(() => {
                                const meteo = getLogMeteoData(row)
                                if (!meteo) return null
                                const rows = formatAtisMeteoRowsDisplay(meteo)
                                return (
                                  <div className="mb-3 rounded border border-sky-500/25 bg-sky-500/5 px-2 py-2">
                                    <p className="mb-1 text-[7px] font-bold text-sky-400/85">
                                      {t('sectors.atis.history.detail.meteo')}
                                    </p>
                                    <ul className="space-y-0.5 text-app-text/90">
                                      {rows.map(([label, value]) => (
                                        <li key={label}>
                                          <span className="text-app-text/55">{label}: </span>
                                          <span className="text-sky-300">{value}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )
                              })()}
                              <div className="mb-3 rounded border border-[#7ab4ff]/25 bg-[#7ab4ff]/5 px-2 py-2">
                                <p className="mb-1 text-[7px] font-bold text-[#7ab4ff]/80">
                                  {t('sectors.atis.history.detail.accessories')}
                                </p>
                                <ul className="space-y-0.5 text-app-text/90">
                                  {formatAtisAccessoriesLinesDisplay(row.accessoriesAtShot).map((line) => (
                                    <li key={line}>{line}</li>
                                  ))}
                                </ul>
                              </div>
                              {(() => {
                                const yiv = getLogYivConditionPercent(row)
                                const wear = getLogBarrelWearPercent(row)
                                if (yiv == null) return null
                                return (
                                  <div className="mb-3 rounded border border-accent/25 bg-accent/5 px-2 py-2">
                                    <p className="mb-1 text-[7px] font-bold text-accent/80">
                                      {t('sectors.atis.history.detail.barrel')}
                                    </p>
                                    <p className="text-accent">
                                      [{formatConditionBar(yiv)}]{' '}
                                      {t('sectors.atis.history.detail.condition', { percent: yiv })}
                                    </p>
                                    {wear != null ? (
                                      <p className="mt-0.5 text-[8px] text-amber-400/90">
                                        {t('sectors.atis.history.detail.wear', { percent: wear })}
                                      </p>
                                    ) : null}
                                  </div>
                                )
                              })()}
                              {specLines.length > 0 ? (
                                <ul className="mb-3 space-y-0.5 border-l border-accent/20 pl-2 text-app-text/70">
                                  {specLines.map((line) => (
                                    <li key={line}>{line}</li>
                                  ))}
                                </ul>
                              ) : null}
                              <div className="rounded border border-white/10 bg-app-bg px-2 py-2">
                                <p className="mb-1 text-[7px] text-app-text/45">
                                  {t('sectors.atis.history.detail.operationNote')}
                                </p>
                                <p className="normal-case leading-relaxed text-app-text/90">
                                  {formatAtisOperationNoteDisplay(row)}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </TacticalPanel>
  )
}
