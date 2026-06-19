import { Fragment, useMemo, useState } from 'react'
import { ChevronDown, FileDown } from 'lucide-react'
import TacticalPanel from '../ui/TacticalPanel'
import { useAuth } from '../../context/AuthContext'
import { generateFofTacticalReportPdf } from '../../lib/fofTacticalReportPdf'
import {
  countFofTacticalErrors,
  extractFofEngagementTypeOptions,
  extractFofScenarioOptions,
  extractFofSimSystemOptions,
  filterFofLogs,
  formatFofCoverUtilization,
  formatFofDateCell,
  formatFofDuration,
  formatFofFilterSummary,
  formatFofTimeToFirstEngagement,
  getFofBlueOnBlue,
  getFofDebriefNotes,
  getFofDecisionAccuracy,
  getFofEngagementType,
  getFofFriendlyCasualties,
  getFofHitTakenRatioLabel,
  getFofHitsTaken,
  getFofLethalHits,
  getFofNonLethalHits,
  getFofOperationNote,
  getFofOpforCount,
  getFofScenarioType,
  getFofSelfTcccApplied,
  getFofSimSystem,
  getFofTacticalErrors,
  isFofFilterActive,
  selectFofLogs,
} from '../../lib/fofLogRegistry'
import { formatMeteoOverviewRows, getLogMeteoData } from '../../lib/meteoDataCapture'
import { formatSuccessPercentCell } from '../../lib/trainingSuccessScore'

const filterSelectClass =
  'dossier-blood-select min-w-[8.5rem] flex-1 rounded border border-accent/35 bg-app-bg py-1.5 pl-2 pr-7 font-mono-technical text-[9px] uppercase text-app-text outline-none focus:border-accent/60'

const FILTER_INITIAL = {
  scenarioTypeKey: 'ALL',
  simSystemKey: 'ALL',
  engagementType: 'ALL',
}

/**
 * @param {{ rangeLogs: Record<string, unknown>[]; loading?: boolean }} props
 */
export default function FofLogRegistry({ rangeLogs, loading = false }) {
  const { userData } = useAuth()
  const [filters, setFilters] = useState(FILTER_INITIAL)
  const [expandedId, setExpandedId] = useState(/** @type {string | null} */ (null))
  const [pdfBusyId, setPdfBusyId] = useState(/** @type {string | null} */ (null))
  const [bulkPdfBusy, setBulkPdfBusy] = useState(false)

  const filterActive = useMemo(() => isFofFilterActive(filters), [filters])

  const fofLogs = useMemo(() => selectFofLogs(rangeLogs), [rangeLogs])
  const scenarioOptions = useMemo(() => extractFofScenarioOptions(fofLogs), [fofLogs])
  const simOptions = useMemo(() => extractFofSimSystemOptions(fofLogs), [fofLogs])
  const engagementOptions = useMemo(() => extractFofEngagementTypeOptions(fofLogs), [fofLogs])

  const filtered = useMemo(
    () =>
      filterFofLogs({
        logs: fofLogs,
        scenarioTypeKey: filters.scenarioTypeKey,
        simSystemKey: filters.simSystemKey,
        engagementType: filters.engagementType,
      }),
    [fofLogs, filters]
  )

  const patchFilter = (/** @type {Partial<typeof FILTER_INITIAL>} */ next) => {
    setFilters((f) => ({ ...f, ...next }))
    setExpandedId(null)
  }

  const handleDownloadPdf = async (/** @type {Record<string, unknown>} */ row) => {
    const id = String(row.id)
    setPdfBusyId(id)
    try {
      await generateFofTacticalReportPdf({
        logs: [row],
        operator: userData,
      })
    } finally {
      setPdfBusyId(null)
    }
  }

  const handleDownloadBulkPdf = async () => {
    if (filtered.length === 0) return
    setBulkPdfBusy(true)
    try {
      await generateFofTacticalReportPdf({
        logs: filtered,
        operator: userData,
        filterActive,
        filterLabel: formatFofFilterSummary(filters),
      })
    } finally {
      setBulkPdfBusy(false)
    }
  }

  const bulkButtonLabel = bulkPdfBusy
    ? 'HAZIRLANIYOR…'
    : filterActive
      ? 'FİLTRELENENİ İNDİR'
      : 'TÜMÜNÜ İNDİR'

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
              GEÇMİŞ FOF KAYITLARI · FİLTRELEME
            </p>
            <p className="mt-0.5 font-mono-technical text-[7px] uppercase text-app-text/45">
              range_logs · canlı senkron · {filtered.length}/{fofLogs.length} KAYIT
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
              {bulkButtonLabel}
            </button>
          ) : null}
        </div>
      </div>

      <div className="border-b border-accent/12 bg-app-bg px-3 py-3">
        <p className="mb-2 font-mono-technical text-[7px] font-bold uppercase tracking-[0.24em] text-app-text/55">
          FİLTRELEME BARİ
        </p>
        <div className="flex flex-wrap gap-2">
          <label className="flex min-w-[10rem] flex-1 flex-col gap-0.5">
            <span className="font-mono-technical text-[7px] uppercase text-app-text/45">SENARYO TİPİ</span>
            <select
              className={filterSelectClass}
              value={filters.scenarioTypeKey}
              onChange={(e) => patchFilter({ scenarioTypeKey: e.target.value })}
            >
              <option value="ALL">TÜMÜ</option>
              {scenarioOptions.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-[10rem] flex-1 flex-col gap-0.5">
            <span className="font-mono-technical text-[7px] uppercase text-app-text/45">SİMÜLASYON</span>
            <select
              className={filterSelectClass}
              value={filters.simSystemKey}
              onChange={(e) => patchFilter({ simSystemKey: e.target.value })}
            >
              <option value="ALL">TÜMÜ</option>
              {simOptions.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-[10rem] flex-1 flex-col gap-0.5">
            <span className="font-mono-technical text-[7px] uppercase text-app-text/45">ANGAJMAN TÜRÜ</span>
            <select
              className={filterSelectClass}
              value={filters.engagementType}
              onChange={(e) => patchFilter({ engagementType: e.target.value })}
            >
              <option value="ALL">TÜMÜ</option>
              {engagementOptions.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="ilws-green-scroll max-h-[min(58vh,560px)] overflow-auto">
        {loading ? (
          <p className="p-8 text-center font-mono-technical text-[10px] uppercase text-app-text/55">SENKRON…</p>
        ) : filtered.length === 0 ? (
          <p className="p-8 text-center font-mono-technical text-[10px] uppercase text-app-text/45">
            {fofLogs.length === 0 ? 'FOF_KAYDI_YOK' : 'FİLTRE_SONUCU_YOK'}
          </p>
        ) : (
          <table className="w-full min-w-[980px] border-collapse text-left">
            <thead className="sticky top-0 z-[2] bg-app-bg">
              <tr className="border-b border-accent/25 font-mono-technical text-[8px] font-bold uppercase tracking-wider text-accent/80">
                <th className="w-8 px-2 py-2" aria-hidden />
                <th className="px-3 py-2">TARİH</th>
                <th className="px-3 py-2">ANGAJMAN</th>
                <th className="px-3 py-2">SENARYO</th>
                <th className="px-3 py-2">SÜRE</th>
                <th className="px-3 py-2">KARAR %</th>
                <th className="px-3 py-2">HIT/TAKEN</th>
                <th className="px-3 py-2">BAŞARI %</th>
                <th className="px-3 py-2 text-right">RAPOR</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const id = String(row.id)
                const open = expandedId === id
                const errorCount = countFofTacticalErrors(row)

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
                        {formatFofDateCell(row)}
                      </td>
                      <td className="px-3 py-2 text-app-text/90">{getFofEngagementType(row)}</td>
                      <td
                        className="max-w-[130px] truncate px-3 py-2 text-app-text"
                        title={getFofScenarioType(row)}
                      >
                        {getFofScenarioType(row)}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-[#5ec8ff]">{formatFofDuration(row)}</td>
                      <td className="px-3 py-2 tabular-nums text-accent">
                        %{getFofDecisionAccuracy(row).toLocaleString('tr-TR')}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-app-text">
                        {getFofHitTakenRatioLabel(row)}
                      </td>
                      <td
                        className={`whitespace-nowrap px-3 py-2 text-sm font-bold tabular-nums ${
                          getFofBlueOnBlue(row) ? 'text-red-400' : 'text-accent'
                        }`}
                      >
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
                      <td colSpan={9} className="p-0">
                        <div
                          className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                            open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                          }`}
                        >
                          <div className="min-h-0 overflow-hidden">
                            <div className="mx-3 mb-3 mt-1 rounded border border-accent/20 bg-black/50 p-3 font-mono-technical text-[8px] uppercase">
                              <p className="mb-2 font-bold tracking-wider text-accent/85">
                                FOF TACTICAL PERFORMANCE REPORT · DETAY
                              </p>
                              <div className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                                <p className="rounded border border-[#00b4ff]/25 bg-[#00b4ff]/5 px-2 py-1.5">
                                  <span className="text-app-text/55">SİM · </span>
                                  <span className="text-[#5ec8ff]">{getFofSimSystem(row)}</span>
                                </p>
                                <p className="rounded border border-[#00b4ff]/25 bg-[#00b4ff]/5 px-2 py-1.5">
                                  <span className="text-app-text/55">OPFOR · </span>
                                  <span className="text-[#5ec8ff]">{getFofOpforCount(row)}</span>
                                </p>
                                <p className="rounded border border-accent/25 bg-accent/5 px-2 py-1.5">
                                  <span className="text-app-text/55">VURUŞ · </span>
                                  <span className="text-accent">
                                    {getFofLethalHits(row)} / {getFofNonLethalHits(row)} / alınan{' '}
                                    {getFofHitsTaken(row)}
                                  </span>
                                </p>
                                <p className="rounded border border-accent/25 bg-accent/5 px-2 py-1.5">
                                  <span className="text-app-text/55">İLK ATIŞ · </span>
                                  <span className="text-accent">{formatFofTimeToFirstEngagement(row)}</span>
                                </p>
                              </div>
                              <div className="mb-3 grid gap-2 sm:grid-cols-2">
                                <p className="text-app-text/70">
                                  SİPER KULLANIMI:{' '}
                                  <span className="text-app-text">{formatFofCoverUtilization(row)}</span>
                                </p>
                                <p className="text-app-text/70">
                                  DOST KAYBI:{' '}
                                  <span className="text-red-300">{getFofFriendlyCasualties(row)}</span>
                                </p>
                                <p className="text-app-text/70">
                                  BLUE-ON-BLUE:{' '}
                                  <span className={getFofBlueOnBlue(row) ? 'text-red-400' : 'text-app-text/55'}>
                                    {getFofBlueOnBlue(row) ? 'EVET' : 'HAYIR'}
                                  </span>
                                </p>
                                <p className="text-app-text/70">
                                  TCCC (ATEŞ ALTINDA):{' '}
                                  <span className={getFofSelfTcccApplied(row) ? 'text-green-400' : 'text-app-text/55'}>
                                    {getFofSelfTcccApplied(row) ? 'UYGULANDI' : 'HAYIR'}
                                  </span>
                                </p>
                              </div>
                              {(() => {
                                const meteo = getLogMeteoData(row)
                                if (!meteo) return null
                                const rows = formatMeteoOverviewRows(meteo)
                                return (
                                  <div className="mb-3 rounded border border-sky-500/25 bg-sky-500/5 px-2 py-2">
                                    <p className="mb-1 text-[7px] font-bold text-sky-400/85">METEO-DATA (KAYIT ANI)</p>
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
                              {errorCount > 0 ? (
                                <div className="mb-3 rounded border border-red-500/30 bg-red-950/20 px-2 py-2">
                                  <p className="mb-1 text-[7px] font-bold text-red-400/90">
                                    TAKTİK HATALAR · {errorCount} KAYIT
                                  </p>
                                  <ul className="list-inside list-disc space-y-0.5 text-red-200/90">
                                    {getFofTacticalErrors(row).map((err) => (
                                      <li key={err} className="normal-case">
                                        {err}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ) : null}
                              <div className="mb-3 rounded border border-white/10 bg-app-bg px-2 py-2">
                                <p className="mb-1 text-[7px] text-app-text/45">DEBRIEF NOTES</p>
                                <p className="normal-case leading-relaxed text-app-text/90">{getFofDebriefNotes(row)}</p>
                              </div>
                              <div className="rounded border border-white/10 bg-app-bg px-2 py-2">
                                <p className="mb-1 text-[7px] text-app-text/45">OPERASYON NOTU</p>
                                <p className="normal-case leading-relaxed text-app-text/90">{getFofOperationNote(row)}</p>
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
