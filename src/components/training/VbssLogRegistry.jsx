import { Fragment, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, FileDown } from 'lucide-react'
import TacticalPanel from '../ui/TacticalPanel'
import { useAuth } from '../../context/AuthContext'
import { generateVbssTacticalReportPdf } from '../../lib/vbssTacticalReportPdf'
import {
  extractVbssSeaStateOptions,
  filterVbssLogs,
  formatVbssBoardingTime,
  formatVbssBridgeControlTime,
  formatVbssContainmentTime,
  formatVbssEngineRoomControlTime,
  formatVbssVesselSpeed,
  getVbssBiometricCheck,
  getVbssCommsBlackoutSuccess,
  getVbssContrabandFound,
  getVbssCrewCount,
  getVbssScuttlingAttempt,
  isVbssFilterActive,
  sortVbssLogsDesc,
} from '../../lib/vbssLogRegistry'
import {
  formatVbssBoolDisplay,
  formatVbssDateCellDisplay,
  formatVbssFilterSummaryDisplay,
  formatVbssOperationNoteDisplay,
  formatVbssSelectFieldDisplay,
} from '../../lib/trainingDisplayText'
import { formatSuccessPercentCell } from '../../lib/trainingSuccessScore'

const filterSelectClass =
  'dossier-blood-select min-w-[8.5rem] flex-1 rounded border border-accent/35 bg-app-bg py-1.5 pl-2 pr-7 font-mono-technical text-[9px] uppercase text-app-text outline-none focus:border-accent/60'

const FILTER_INITIAL = {
  seaStateKey: 'ALL',
}

/** @param {string} text */
function cellTitle(text) {
  const t = String(text || '').trim()
  return t && t !== '—' ? t : undefined
}

/**
 * @param {{ logs: Record<string, unknown>[]; loading?: boolean }} props
 */
export default function VbssLogRegistry({ logs, loading = false }) {
  const { t } = useTranslation('training')
  const { userData } = useAuth()
  const [filters, setFilters] = useState(FILTER_INITIAL)
  const [expandedId, setExpandedId] = useState(/** @type {string | null} */ (null))
  const [pdfBusyId, setPdfBusyId] = useState(/** @type {string | null} */ (null))
  const [bulkPdfBusy, setBulkPdfBusy] = useState(false)

  const vbssLogs = useMemo(() => sortVbssLogsDesc(logs), [logs])
  const filterActive = useMemo(() => isVbssFilterActive(filters), [filters])
  const seaStateOptions = useMemo(() => extractVbssSeaStateOptions(vbssLogs), [vbssLogs])

  const filtered = useMemo(
    () => filterVbssLogs({ logs: vbssLogs, ...filters }),
    [vbssLogs, filters],
  )

  const exportRows = filterActive ? filtered : vbssLogs

  const patchFilter = (/** @type {Partial<typeof FILTER_INITIAL>} */ next) => {
    setFilters((f) => ({ ...f, ...next }))
    setExpandedId(null)
  }

  const handleDownloadPdf = async (/** @type {Record<string, unknown>} */ row) => {
    const id = String(row.id)
    setPdfBusyId(id)
    try {
      await generateVbssTacticalReportPdf({
        logs: [row],
        operator: userData,
      })
    } finally {
      setPdfBusyId(null)
    }
  }

  const handleDownloadBulkPdf = async () => {
    if (exportRows.length === 0) return
    setBulkPdfBusy(true)
    try {
      await generateVbssTacticalReportPdf({
        logs: exportRows,
        operator: userData,
        filterActive,
        filterLabel: formatVbssFilterSummaryDisplay(filters),
      })
    } finally {
      setBulkPdfBusy(false)
    }
  }

  const bulkButtonLabel = bulkPdfBusy
    ? t('sectors.vbss.history.preparingPdf')
    : filterActive
      ? t('sectors.vbss.history.downloadFiltered')
      : t('sectors.vbss.history.downloadAll')

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
              {t('sectors.vbss.history.title')}
            </p>
            <p className="mt-0.5 font-mono-technical text-[7px] uppercase text-app-text/45">
              {t('sectors.vbss.history.syncMeta', { filtered: filtered.length, total: vbssLogs.length })}
            </p>
          </div>
          {exportRows.length > 0 ? (
            <button
              type="button"
              disabled={bulkPdfBusy}
              onClick={handleDownloadBulkPdf}
              className="inline-flex items-center gap-2 rounded border border-accent/45 bg-accent/10 px-3 py-1.5 font-mono-technical text-[9px] font-bold uppercase tracking-[0.14em] text-accent transition hover:border-accent/65 hover:bg-accent/16 disabled:opacity-50"
            >
              <FileDown className="size-3.5" strokeWidth={2} aria-hidden />
              {bulkButtonLabel}
            </button>
          ) : null}
        </div>
      </div>

      <div className="border-b border-accent/12 bg-app-bg px-3 py-3">
        <p className="mb-2 font-mono-technical text-[7px] font-bold uppercase tracking-[0.24em] text-app-text/55">
          {t('sectors.vbss.history.filterBar')}
        </p>
        <label className="flex min-w-[12rem] max-w-md flex-col gap-0.5">
          <span className="font-mono-technical text-[7px] uppercase text-app-text/45">
            {t('sectors.vbss.history.seaState')}
          </span>
          <select
            className={filterSelectClass}
            value={filters.seaStateKey}
            onChange={(e) => patchFilter({ seaStateKey: e.target.value })}
          >
            <option value="ALL">{t('sectors.vbss.history.all')}</option>
            {seaStateOptions.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="ilws-green-scroll max-h-[min(58vh,560px)] overflow-auto">
        {loading ? (
          <p className="p-8 text-center font-mono-technical text-[10px] uppercase text-app-text/55">
            {t('sectors.vbss.history.syncing')}
          </p>
        ) : filtered.length === 0 ? (
          <p className="p-8 text-center font-mono-technical text-[10px] uppercase text-app-text/45">
            {vbssLogs.length === 0 ? t('sectors.vbss.history.empty') : t('sectors.vbss.history.noFilterResults')}
          </p>
        ) : (
          <table className="w-full min-w-[1100px] border-collapse text-left">
            <thead className="sticky top-0 z-[2] bg-app-bg">
              <tr className="border-b border-accent/25 font-mono-technical text-[8px] font-bold uppercase tracking-wider text-accent/80">
                <th className="w-8 px-2 py-2" aria-hidden />
                <th className="whitespace-nowrap px-3 py-2">{t('sectors.vbss.history.columns.date')}</th>
                <th className="min-w-[8rem] px-3 py-2">{t('sectors.vbss.history.columns.insertionMethod')}</th>
                <th className="min-w-[8rem] px-3 py-2">{t('sectors.vbss.history.columns.vesselType')}</th>
                <th className="min-w-[7rem] px-3 py-2">{t('sectors.vbss.history.columns.seaState')}</th>
                <th className="whitespace-nowrap px-3 py-2">{t('sectors.vbss.history.columns.vesselSpeed')}</th>
                <th className="whitespace-nowrap px-3 py-2">{t('sectors.vbss.history.columns.boardingTime')}</th>
                <th className="whitespace-nowrap px-3 py-2">{t('sectors.vbss.history.columns.bridgeControl')}</th>
                <th className="whitespace-nowrap px-3 py-2">{t('sectors.vbss.history.columns.engineRoom')}</th>
                <th className="whitespace-nowrap px-3 py-2">{t('sectors.vbss.history.columns.containment')}</th>
                <th className="whitespace-nowrap px-3 py-2">{t('sectors.vbss.history.columns.crew')}</th>
                <th className="whitespace-nowrap px-3 py-2 text-accent">{t('sectors.vbss.history.columns.successRate')}</th>
                <th className="px-3 py-2 text-right">{t('sectors.vbss.history.columns.report')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const id = String(row.id)
                const open = expandedId === id
                const insertionMethod = formatVbssSelectFieldDisplay(row, 'insertionMethod')
                const vesselType = formatVbssSelectFieldDisplay(row, 'vesselType')
                const seaState = formatVbssSelectFieldDisplay(row, 'seaState')

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
                        {formatVbssDateCellDisplay(row)}
                      </td>
                      <td
                        className="max-w-[12rem] break-words px-3 py-2 normal-case leading-snug text-app-text"
                        title={cellTitle(insertionMethod)}
                      >
                        {insertionMethod}
                      </td>
                      <td
                        className="max-w-[12rem] break-words px-3 py-2 normal-case leading-snug text-app-text/90"
                        title={cellTitle(vesselType)}
                      >
                        {vesselType}
                      </td>
                      <td
                        className="max-w-[10rem] break-words px-3 py-2 normal-case leading-snug text-app-text"
                        title={cellTitle(seaState)}
                      >
                        {seaState}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 tabular-nums text-[#5ec8ff]">
                        {formatVbssVesselSpeed(row)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 tabular-nums text-accent">
                        {formatVbssBoardingTime(row)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 tabular-nums text-app-text/90">
                        {formatVbssBridgeControlTime(row)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 tabular-nums text-app-text/90">
                        {formatVbssEngineRoomControlTime(row)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 tabular-nums text-accent">
                        {formatVbssContainmentTime(row)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 tabular-nums text-app-text">
                        {getVbssCrewCount(row)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-sm font-bold tabular-nums text-accent">
                        {formatSuccessPercentCell(row)}
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
                      <td colSpan={13} className="p-0">
                        <div
                          className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                            open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                          }`}
                        >
                          <div className="min-h-0 overflow-hidden">
                            <div className="mx-3 mb-3 mt-1 rounded border border-accent/20 bg-black/50 p-3 font-mono-technical text-[8px] uppercase">
                              <p className="mb-2 font-bold tracking-wider text-accent/85">
                                {t('sectors.vbss.history.detail.title')}
                              </p>
                              <p className="mb-2 text-app-text/70">
                                {t('sectors.vbss.history.detail.successRate')}{' '}
                                <span className="text-sm font-bold text-accent">
                                  {formatSuccessPercentCell(row)}
                                </span>
                              </p>
                              <div className="mb-3 grid gap-2 sm:grid-cols-2">
                                <p
                                  className="break-words normal-case leading-relaxed text-app-text/90"
                                  title={cellTitle(insertionMethod)}
                                >
                                  {t('sectors.vbss.history.detail.insertionMethod')}{' '}
                                  <span className="text-slate-100">{insertionMethod}</span>
                                </p>
                                <p
                                  className="break-words normal-case leading-relaxed text-app-text/90"
                                  title={cellTitle(vesselType)}
                                >
                                  {t('sectors.vbss.history.detail.vesselType')}{' '}
                                  <span className="text-slate-100">{vesselType}</span>
                                </p>
                                <p
                                  className="break-words normal-case leading-relaxed text-app-text/90 sm:col-span-2"
                                  title={cellTitle(seaState)}
                                >
                                  {t('sectors.vbss.history.detail.seaState')}{' '}
                                  <span className="text-slate-100">{seaState}</span>
                                </p>
                              </div>
                              <div className="mb-3 grid gap-2 sm:grid-cols-2">
                                <p className="text-app-text/70">
                                  {t('sectors.vbss.history.detail.boardingTime')}{' '}
                                  <span className="text-accent">{formatVbssBoardingTime(row)}</span>
                                </p>
                                <p className="text-app-text/70">
                                  {t('sectors.vbss.history.detail.bridgeControl')}{' '}
                                  <span className="text-app-text">{formatVbssBridgeControlTime(row)}</span>
                                </p>
                                <p className="text-app-text/70">
                                  {t('sectors.vbss.history.detail.engineRoom')}{' '}
                                  <span className="text-app-text">{formatVbssEngineRoomControlTime(row)}</span>
                                </p>
                                <p className="text-app-text/70">
                                  {t('sectors.vbss.history.detail.containment')}{' '}
                                  <span className="text-accent">{formatVbssContainmentTime(row)}</span>
                                </p>
                                <p className="text-app-text/70">
                                  {t('sectors.vbss.history.detail.vesselSpeed')}{' '}
                                  <span className="text-[#5ec8ff]">{formatVbssVesselSpeed(row)}</span>
                                </p>
                                <p className="text-app-text/70">
                                  {t('sectors.vbss.history.detail.crewCount')}{' '}
                                  <span className="text-slate-100">{getVbssCrewCount(row)}</span>
                                </p>
                              </div>
                              <div className="mb-3 grid gap-2 rounded border border-[#5ec8ff]/25 bg-[#0a1520]/50 p-2 sm:grid-cols-2">
                                <p className="text-app-text/70">
                                  {t('sectors.vbss.history.detail.contraband')}{' '}
                                  <span
                                    className={
                                      getVbssContrabandFound(row) ? 'text-amber-300' : 'text-app-text/55'
                                    }
                                  >
                                    {formatVbssBoolDisplay(getVbssContrabandFound(row))}
                                  </span>
                                </p>
                                <p className="text-app-text/70">
                                  {t('sectors.vbss.history.detail.biometric')}{' '}
                                  <span
                                    className={getVbssBiometricCheck(row) ? 'text-green-400' : 'text-app-text/55'}
                                  >
                                    {formatVbssBoolDisplay(getVbssBiometricCheck(row))}
                                  </span>
                                </p>
                                <p className="text-app-text/70">
                                  {t('sectors.vbss.history.detail.scuttling')}{' '}
                                  <span
                                    className={getVbssScuttlingAttempt(row) ? 'text-red-400' : 'text-app-text/55'}
                                  >
                                    {formatVbssBoolDisplay(getVbssScuttlingAttempt(row))}
                                  </span>
                                </p>
                                <p className="text-app-text/70">
                                  {t('sectors.vbss.history.detail.commsBlackout')}{' '}
                                  <span
                                    className={
                                      getVbssCommsBlackoutSuccess(row) ? 'text-green-400' : 'text-app-text/55'
                                    }
                                  >
                                    {formatVbssBoolDisplay(getVbssCommsBlackoutSuccess(row))}
                                  </span>
                                </p>
                              </div>
                              <div className="rounded border border-white/10 bg-app-bg px-2 py-2">
                                <p className="mb-1 text-[7px] text-app-text/45">
                                  {t('sectors.vbss.history.detail.operationNote')}
                                </p>
                                <p className="whitespace-pre-wrap break-words normal-case leading-relaxed text-app-text/90">
                                  {formatVbssOperationNoteDisplay(row)}
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
