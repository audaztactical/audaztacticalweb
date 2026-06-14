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
  'dossier-blood-select min-w-[8.5rem] flex-1 rounded border border-[#00FF41]/35 bg-[#0A0A0A] py-1.5 pl-2 pr-7 font-mono-technical text-[9px] uppercase text-white outline-none focus:border-[#00FF41]/60'

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
    <TacticalPanel className="relative border-[#00FF41]/20 bg-[#0a0a0a]/95 p-0">
      <span className="pointer-events-none absolute left-2 top-2 z-10 h-3 w-3 border-l border-t border-[#00FF41]/45" />
      <span className="pointer-events-none absolute right-2 top-2 z-10 h-3 w-3 border-r border-t border-[#00FF41]/45" />
      <span className="pointer-events-none absolute bottom-2 left-2 z-10 h-3 w-3 border-b border-l border-[#00FF41]/45" />
      <span className="pointer-events-none absolute bottom-2 right-2 z-10 h-3 w-3 border-b border-r border-[#00FF41]/45" />

      <div className="border-b border-[#00FF41]/15 bg-[#080808] px-4 py-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono-technical text-[9px] font-bold uppercase tracking-[0.28em] text-[#00FF41]/90">
              GEÇMİŞ FOF KAYITLARI · FİLTRELEME
            </p>
            <p className="mt-0.5 font-mono-technical text-[7px] uppercase text-slate-600">
              range_logs · canlı senkron · {filtered.length}/{fofLogs.length} KAYIT
            </p>
          </div>
          {filtered.length > 0 ? (
            <button
              type="button"
              disabled={bulkPdfBusy}
              onClick={handleDownloadBulkPdf}
              className="inline-flex items-center gap-2 rounded border border-[#ffb400]/45 bg-[#ffb400]/10 px-3 py-1.5 font-mono-technical text-[9px] font-bold uppercase tracking-[0.14em] text-[#ffb400] transition hover:border-[#ffb400]/65 hover:bg-[#ffb400]/16 disabled:opacity-50"
            >
              <FileDown className="size-3.5" strokeWidth={2} aria-hidden />
              {bulkButtonLabel}
            </button>
          ) : null}
        </div>
      </div>

      <div className="border-b border-[#00FF41]/12 bg-[#050805] px-3 py-3">
        <p className="mb-2 font-mono-technical text-[7px] font-bold uppercase tracking-[0.24em] text-slate-500">
          FİLTRELEME BARİ
        </p>
        <div className="flex flex-wrap gap-2">
          <label className="flex min-w-[10rem] flex-1 flex-col gap-0.5">
            <span className="font-mono-technical text-[7px] uppercase text-slate-600">SENARYO TİPİ</span>
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
            <span className="font-mono-technical text-[7px] uppercase text-slate-600">SİMÜLASYON</span>
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
            <span className="font-mono-technical text-[7px] uppercase text-slate-600">ANGAJMAN TÜRÜ</span>
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
          <p className="p-8 text-center font-mono-technical text-[10px] uppercase text-slate-500">SENKRON…</p>
        ) : filtered.length === 0 ? (
          <p className="p-8 text-center font-mono-technical text-[10px] uppercase text-slate-600">
            {fofLogs.length === 0 ? 'FOF_KAYDI_YOK' : 'FİLTRE_SONUCU_YOK'}
          </p>
        ) : (
          <table className="w-full min-w-[980px] border-collapse text-left">
            <thead className="sticky top-0 z-[2] bg-[#0a0a0a]">
              <tr className="border-b border-[#00FF41]/25 font-mono-technical text-[8px] font-bold uppercase tracking-wider text-[#00FF41]/80">
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
                      className={`cursor-pointer border-b border-[#00FF41]/10 font-mono-technical text-[9px] uppercase transition hover:bg-[#00FF41]/[0.04] ${
                        open ? 'bg-[#00FF41]/[0.06]' : ''
                      }`}
                    >
                      <td className="px-2 py-2 text-[#00FF41]/60">
                        <ChevronDown
                          className={`size-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
                          aria-hidden
                        />
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-400">
                        {formatFofDateCell(row)}
                      </td>
                      <td className="px-3 py-2 text-slate-300">{getFofEngagementType(row)}</td>
                      <td
                        className="max-w-[130px] truncate px-3 py-2 text-slate-200"
                        title={getFofScenarioType(row)}
                      >
                        {getFofScenarioType(row)}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-[#5ec8ff]">{formatFofDuration(row)}</td>
                      <td className="px-3 py-2 tabular-nums text-[#ffb400]">
                        %{getFofDecisionAccuracy(row).toLocaleString('tr-TR')}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-slate-200">
                        {getFofHitTakenRatioLabel(row)}
                      </td>
                      <td
                        className={`whitespace-nowrap px-3 py-2 text-sm font-bold tabular-nums ${
                          getFofBlueOnBlue(row) ? 'text-red-400' : 'text-[#00FF41]'
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
                          className="inline-flex items-center gap-1.5 rounded border border-[#ffb400]/35 bg-[#ffb400]/8 px-2 py-1 font-mono-technical text-[7px] font-bold uppercase tracking-[0.1em] text-[#ffb400] transition hover:border-[#ffb400]/55 hover:bg-[#ffb400]/14 disabled:opacity-50"
                        >
                          <FileDown className="size-3" strokeWidth={2} aria-hidden />
                          {pdfBusyId === id ? '…' : 'PDF'}
                        </button>
                      </td>
                    </tr>
                    <tr className="border-b border-[#00FF41]/8">
                      <td colSpan={9} className="p-0">
                        <div
                          className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                            open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                          }`}
                        >
                          <div className="min-h-0 overflow-hidden">
                            <div className="mx-3 mb-3 mt-1 rounded border border-[#00FF41]/20 bg-black/50 p-3 font-mono-technical text-[8px] uppercase">
                              <p className="mb-2 font-bold tracking-wider text-[#00FF41]/85">
                                FOF TACTICAL PERFORMANCE REPORT · DETAY
                              </p>
                              <div className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                                <p className="rounded border border-[#00b4ff]/25 bg-[#00b4ff]/5 px-2 py-1.5">
                                  <span className="text-slate-500">SİM · </span>
                                  <span className="text-[#5ec8ff]">{getFofSimSystem(row)}</span>
                                </p>
                                <p className="rounded border border-[#00b4ff]/25 bg-[#00b4ff]/5 px-2 py-1.5">
                                  <span className="text-slate-500">OPFOR · </span>
                                  <span className="text-[#5ec8ff]">{getFofOpforCount(row)}</span>
                                </p>
                                <p className="rounded border border-[#00FF41]/25 bg-[#00FF41]/5 px-2 py-1.5">
                                  <span className="text-slate-500">VURUŞ · </span>
                                  <span className="text-[#00FF41]">
                                    {getFofLethalHits(row)} / {getFofNonLethalHits(row)} / alınan{' '}
                                    {getFofHitsTaken(row)}
                                  </span>
                                </p>
                                <p className="rounded border border-[#ffb400]/25 bg-[#ffb400]/5 px-2 py-1.5">
                                  <span className="text-slate-500">İLK ATIŞ · </span>
                                  <span className="text-[#ffb400]">{formatFofTimeToFirstEngagement(row)}</span>
                                </p>
                              </div>
                              <div className="mb-3 grid gap-2 sm:grid-cols-2">
                                <p className="text-slate-400">
                                  SİPER KULLANIMI:{' '}
                                  <span className="text-slate-200">{formatFofCoverUtilization(row)}</span>
                                </p>
                                <p className="text-slate-400">
                                  DOST KAYBI:{' '}
                                  <span className="text-red-300">{getFofFriendlyCasualties(row)}</span>
                                </p>
                                <p className="text-slate-400">
                                  BLUE-ON-BLUE:{' '}
                                  <span className={getFofBlueOnBlue(row) ? 'text-red-400' : 'text-slate-500'}>
                                    {getFofBlueOnBlue(row) ? 'EVET' : 'HAYIR'}
                                  </span>
                                </p>
                                <p className="text-slate-400">
                                  TCCC (ATEŞ ALTINDA):{' '}
                                  <span className={getFofSelfTcccApplied(row) ? 'text-green-400' : 'text-slate-500'}>
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
                                    <ul className="space-y-0.5 text-slate-300">
                                      {rows.map(([label, value]) => (
                                        <li key={label}>
                                          <span className="text-slate-500">{label}: </span>
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
                              <div className="mb-3 rounded border border-white/10 bg-[#080808] px-2 py-2">
                                <p className="mb-1 text-[7px] text-slate-600">DEBRIEF NOTES</p>
                                <p className="normal-case leading-relaxed text-slate-300">{getFofDebriefNotes(row)}</p>
                              </div>
                              <div className="rounded border border-white/10 bg-[#080808] px-2 py-2">
                                <p className="mb-1 text-[7px] text-slate-600">OPERASYON NOTU</p>
                                <p className="normal-case leading-relaxed text-slate-300">{getFofOperationNote(row)}</p>
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
