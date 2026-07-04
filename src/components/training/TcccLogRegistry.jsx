import { Fragment, useMemo, useState } from 'react'
import { ChevronDown, FileDown } from 'lucide-react'
import TacticalPanel from '../ui/TacticalPanel'
import { useAuth } from '../../context/AuthContext'
import { generateTcccTacticalReportPdf } from '../../lib/tcccTacticalReportPdf'
import {
  countTcccScoredMarchInterventions,
  extractTcccPhaseOptions,
  filterTcccLogs,
  formatTcccBoolTr,
  formatTcccDateCell,
  formatTcccEvacWaitingTime,
  formatTcccFilterSummary,
  formatTcccInterventionTime,
  formatTcccSystolicBp,
  getTcccChestSealApplied,
  getTcccHypothermiaBlanket,
  getTcccInjuryType,
  getTcccNeedleDecompression,
  getTcccNpaInserted,
  getTcccOperationNote,
  getTcccPhase,
  getTcccTourniquetApplied,
  getTcccTourniquetLocation,
  getTcccWoundPacking,
  isTcccFilterActive,
  sortTcccLogsDesc,
} from '../../lib/tcccLogRegistry'
import { formatSuccessPercentCell } from '../../lib/trainingSuccessScore'

const filterSelectClass =
  'dossier-blood-select min-w-[8.5rem] flex-1 rounded border border-accent/35 bg-app-bg py-1.5 pl-2 pr-7 font-mono-technical text-[9px] uppercase text-app-text outline-none focus:border-accent/60'

const FILTER_INITIAL = {
  tcccPhaseKey: 'ALL',
}

/** @param {string} text */
function cellTitle(text) {
  const t = String(text || '').trim()
  return t && t !== '—' ? t : undefined
}

/**
 * @param {{ logs: Record<string, unknown>[]; loading?: boolean }} props
 */
export default function TcccLogRegistry({ logs, loading = false }) {
  const { userData } = useAuth()
  const [filters, setFilters] = useState(FILTER_INITIAL)
  const [expandedId, setExpandedId] = useState(/** @type {string | null} */ (null))
  const [pdfBusyId, setPdfBusyId] = useState(/** @type {string | null} */ (null))
  const [bulkPdfBusy, setBulkPdfBusy] = useState(false)

  const tcccLogs = useMemo(() => sortTcccLogsDesc(logs), [logs])
  const filterActive = useMemo(() => isTcccFilterActive(filters), [filters])
  const phaseOptions = useMemo(() => extractTcccPhaseOptions(tcccLogs), [tcccLogs])

  const filtered = useMemo(
    () => filterTcccLogs({ logs: tcccLogs, ...filters }),
    [tcccLogs, filters],
  )

  const exportRows = filterActive ? filtered : tcccLogs

  const patchFilter = (/** @type {Partial<typeof FILTER_INITIAL>} */ next) => {
    setFilters((f) => ({ ...f, ...next }))
    setExpandedId(null)
  }

  const handleDownloadPdf = async (/** @type {Record<string, unknown>} */ row) => {
    const id = String(row.id)
    setPdfBusyId(id)
    try {
      await generateTcccTacticalReportPdf({
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
      await generateTcccTacticalReportPdf({
        logs: exportRows,
        operator: userData,
        filterActive,
        filterLabel: formatTcccFilterSummary(filters),
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
              GEÇMİŞ TCCC KAYITLARI · TAKTİK SAĞLIK
            </p>
            <p className="mt-0.5 font-mono-technical text-[7px] uppercase text-app-text/45">
              tccc_logs · canlı senkron · {filtered.length}/{tcccLogs.length} KAYIT
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
          FİLTRELEME BARİ
        </p>
        <label className="flex min-w-[12rem] max-w-md flex-col gap-0.5">
          <span className="font-mono-technical text-[7px] uppercase text-app-text/45">TCCC FAZI</span>
          <select
            className={filterSelectClass}
            value={filters.tcccPhaseKey}
            onChange={(e) => patchFilter({ tcccPhaseKey: e.target.value })}
          >
            <option value="ALL">TÜMÜ</option>
            {phaseOptions.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="ilws-green-scroll max-h-[min(58vh,560px)] overflow-auto">
        {loading ? (
          <p className="p-8 text-center font-mono-technical text-[10px] uppercase text-app-text/55">SENKRON…</p>
        ) : filtered.length === 0 ? (
          <p className="p-8 text-center font-mono-technical text-[10px] uppercase text-app-text/45">
            {tcccLogs.length === 0 ? 'TCCC_KAYDI_YOK' : 'FİLTRE_SONUCU_YOK'}
          </p>
        ) : (
          <table className="w-full min-w-[1050px] border-collapse text-left">
            <thead className="sticky top-0 z-[2] bg-app-bg">
              <tr className="border-b border-accent/25 font-mono-technical text-[8px] font-bold uppercase tracking-wider text-accent/80">
                <th className="w-8 px-2 py-2" aria-hidden />
                <th className="whitespace-nowrap px-3 py-2">TARİH</th>
                <th className="min-w-[9rem] px-3 py-2">YARALANMA</th>
                <th className="min-w-[9rem] px-3 py-2">TCCC FAZI</th>
                <th className="min-w-[8rem] px-3 py-2">TURNİKE KONUMU</th>
                <th className="whitespace-nowrap px-3 py-2">TURNİKE SÜRESİ</th>
                <th className="whitespace-nowrap px-3 py-2">TAHLİYE BEKLEME</th>
                <th className="whitespace-nowrap px-3 py-2">SİSTOLİK BP</th>
                <th className="whitespace-nowrap px-3 py-2">MARCH</th>
                <th className="whitespace-nowrap px-3 py-2 text-accent">BAŞARI ORANI (%)</th>
                <th className="px-3 py-2 text-right">RAPOR</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const id = String(row.id)
                const open = expandedId === id
                const phase = getTcccPhase(row)
                const tqLoc = getTcccTourniquetLocation(row)
                const injuryType = getTcccInjuryType(row)
                const marchScore = countTcccScoredMarchInterventions(row)

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
                        {formatTcccDateCell(row)}
                      </td>
                      <td
                        className="max-w-[11rem] break-words px-3 py-2 normal-case leading-snug text-app-text"
                        title={cellTitle(injuryType)}
                      >
                        {injuryType}
                      </td>
                      <td
                        className="max-w-[12rem] break-words px-3 py-2 normal-case leading-snug text-app-text/90"
                        title={cellTitle(phase)}
                      >
                        {phase}
                      </td>
                      <td
                        className="max-w-[10rem] break-words px-3 py-2 normal-case leading-snug text-app-text/90"
                        title={cellTitle(tqLoc)}
                      >
                        {tqLoc}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 tabular-nums text-accent">
                        {formatTcccInterventionTime(row)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 tabular-nums text-[#5ec8ff]">
                        {formatTcccEvacWaitingTime(row)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 tabular-nums text-red-400/90">
                        {formatTcccSystolicBp(row)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 tabular-nums text-accent">
                        {marchScore.total > 0 ? `${marchScore.done}/${marchScore.total}` : '—'}
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
                      <td colSpan={11} className="p-0">
                        <div
                          className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                            open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                          }`}
                        >
                          <div className="min-h-0 overflow-hidden">
                            <div className="mx-3 mb-3 mt-1 rounded border border-accent/20 bg-black/50 p-3 font-mono-technical text-[8px] uppercase">
                              <p className="mb-2 font-bold tracking-wider text-accent/85">
                                TCCC DETAY PANELİ · MARCH MÜDAHALELERİ
                              </p>
                              <p className="mb-2 text-app-text/70">
                                BAŞARI ORANI:{' '}
                                <span className="text-sm font-bold text-accent">
                                  {formatSuccessPercentCell(row)}
                                </span>
                              </p>
                              <div className="mb-3 grid gap-2 sm:grid-cols-2">
                                <p
                                  className="break-words normal-case leading-relaxed text-app-text/90"
                                  title={cellTitle(injuryType)}
                                >
                                  YARALANMA TİPİ: <span className="text-slate-100">{injuryType}</span>
                                </p>
                                <p
                                  className="break-words normal-case leading-relaxed text-app-text/90"
                                  title={cellTitle(phase)}
                                >
                                  TCCC FAZI: <span className="text-slate-100">{phase}</span>
                                </p>
                                <p
                                  className="break-words normal-case leading-relaxed text-app-text/90"
                                  title={cellTitle(tqLoc)}
                                >
                                  TURNİKE KONUMU: <span className="text-slate-100">{tqLoc}</span>
                                </p>
                                <p className="text-app-text/70">
                                  TURNİKE SÜRESİ:{' '}
                                  <span className="text-accent">{formatTcccInterventionTime(row)}</span>
                                </p>
                                <p className="text-app-text/70">
                                  TAHLİYE BEKLEME:{' '}
                                  <span className="text-[#5ec8ff]">{formatTcccEvacWaitingTime(row)}</span>
                                </p>
                                <p className="text-app-text/70 sm:col-span-2">
                                  SİSTOLİK TANSİYON:{' '}
                                  <span className="text-red-300/90">{formatTcccSystolicBp(row)}</span>
                                </p>
                              </div>
                              <div className="mb-3 grid gap-2 sm:grid-cols-2">
                                <p className="text-app-text/70">
                                  TURNİKE UYGULANDI:{' '}
                                  <span className="text-accent">
                                    {formatTcccBoolTr(getTcccTourniquetApplied(row))}
                                  </span>
                                </p>
                                <p className="text-app-text/70">
                                  YARA PAKETLEME:{' '}
                                  <span className="text-app-text">
                                    {formatTcccBoolTr(getTcccWoundPacking(row))}
                                  </span>
                                </p>
                                <p className="text-app-text/70">
                                  NPA TÜP:{' '}
                                  <span className="text-app-text">
                                    {formatTcccBoolTr(getTcccNpaInserted(row))}
                                  </span>
                                </p>
                                <p className="text-app-text/70">
                                  GÖĞÜS MÜHRÜ:{' '}
                                  <span className="text-app-text">
                                    {formatTcccBoolTr(getTcccChestSealApplied(row))}
                                  </span>
                                </p>
                                <p className="text-app-text/70">
                                  İĞNE DEKOMPRESYONU:{' '}
                                  <span className="text-app-text">
                                    {formatTcccBoolTr(getTcccNeedleDecompression(row))}
                                  </span>
                                </p>
                                <p className="text-app-text/70">
                                  HİPOTERMİ BATTANİYESİ:{' '}
                                  <span className="text-app-text">
                                    {formatTcccBoolTr(getTcccHypothermiaBlanket(row))}
                                  </span>
                                </p>
                              </div>
                              <p className="break-words normal-case leading-relaxed text-app-text/70">
                                OPERASYON NOTU:{' '}
                                <span className="text-app-text">{getTcccOperationNote(row)}</span>
                              </p>
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
