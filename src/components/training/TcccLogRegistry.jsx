import { Fragment, useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import TacticalPanel from '../ui/TacticalPanel'
import {
  countTcccScoredMarchInterventions,
  getTcccInjuryType,
  extractTcccPhaseOptions,
  filterTcccLogs,
  formatTcccBoolTr,
  formatTcccDateCell,
  formatTcccEvacWaitingTime,
  formatTcccInjuryToTqTime,
  formatTcccSystolicBp,
  getTcccChestSealApplied,
  getTcccHypothermiaBlanket,
  getTcccNeedleDecompression,
  getTcccNpaInserted,
  getTcccOperationNote,
  getTcccPhase,
  getTcccTourniquetApplied,
  getTcccTourniquetLocation,
  getTcccWoundPacking,
  selectTcccLogs,
} from '../../lib/tcccLogRegistry'
import { formatSuccessPercentCell } from '../../lib/trainingSuccessScore'

const filterSelectClass =
  'dossier-blood-select min-w-[8.5rem] flex-1 rounded border border-[#00FF41]/35 bg-[#0A0A0A] py-1.5 pl-2 pr-7 font-mono-technical text-[9px] uppercase text-white outline-none focus:border-[#00FF41]/60'

const FILTER_INITIAL = {
  tcccPhaseKey: 'ALL',
}

/** @param {string} text */
function cellTitle(text) {
  const t = String(text || '').trim()
  return t && t !== '—' ? t : undefined
}

/**
 * @param {{ rangeLogs: Record<string, unknown>[]; loading?: boolean }} props
 */
export default function TcccLogRegistry({ rangeLogs, loading = false }) {
  const [filters, setFilters] = useState(FILTER_INITIAL)
  const [expandedId, setExpandedId] = useState(/** @type {string | null} */ (null))

  const tcccLogs = useMemo(() => selectTcccLogs(rangeLogs), [rangeLogs])
  const phaseOptions = useMemo(() => extractTcccPhaseOptions(tcccLogs), [tcccLogs])

  const filtered = useMemo(
    () => filterTcccLogs({ logs: tcccLogs, tcccPhaseKey: filters.tcccPhaseKey }),
    [tcccLogs, filters]
  )

  const patchFilter = (/** @type {Partial<typeof FILTER_INITIAL>} */ next) => {
    setFilters((f) => ({ ...f, ...next }))
    setExpandedId(null)
  }

  return (
    <TacticalPanel className="relative border-[#00FF41]/20 bg-[#0a0a0a]/95 p-0">
      <span className="pointer-events-none absolute left-2 top-2 z-10 h-3 w-3 border-l border-t border-[#00FF41]/45" />
      <span className="pointer-events-none absolute right-2 top-2 z-10 h-3 w-3 border-r border-t border-[#00FF41]/45" />
      <span className="pointer-events-none absolute bottom-2 left-2 z-10 h-3 w-3 border-b border-l border-[#00FF41]/45" />
      <span className="pointer-events-none absolute bottom-2 right-2 z-10 h-3 w-3 border-b border-r border-[#00FF41]/45" />

      <div className="border-b border-[#00FF41]/15 bg-[#080808] px-4 py-2">
        <p className="font-mono-technical text-[9px] font-bold uppercase tracking-[0.28em] text-[#00FF41]/90">
          GEÇMİŞ TCCC KAYITLARI · TAKTİK SAĞLIK
        </p>
        <p className="mt-0.5 font-mono-technical text-[7px] uppercase text-slate-600">
          range_logs · canlı senkron · {filtered.length}/{tcccLogs.length} KAYIT
        </p>
      </div>

      <div className="border-b border-[#00FF41]/12 bg-[#050805] px-3 py-3">
        <p className="mb-2 font-mono-technical text-[7px] font-bold uppercase tracking-[0.24em] text-slate-500">
          FİLTRELEME BARİ
        </p>
        <label className="flex min-w-[12rem] max-w-md flex-col gap-0.5">
          <span className="font-mono-technical text-[7px] uppercase text-slate-600">TCCC FAZI</span>
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
          <p className="p-8 text-center font-mono-technical text-[10px] uppercase text-slate-500">SENKRON…</p>
        ) : filtered.length === 0 ? (
          <p className="p-8 text-center font-mono-technical text-[10px] uppercase text-slate-600">
            {tcccLogs.length === 0 ? 'TCCC_KAYDI_YOK' : 'FİLTRE_SONUCU_YOK'}
          </p>
        ) : (
          <table className="w-full min-w-[1050px] border-collapse text-left">
            <thead className="sticky top-0 z-[2] bg-[#0a0a0a]">
              <tr className="border-b border-[#00FF41]/25 font-mono-technical text-[8px] font-bold uppercase tracking-wider text-[#00FF41]/80">
                <th className="w-8 px-2 py-2" aria-hidden />
                <th className="whitespace-nowrap px-3 py-2">TARİH</th>
                <th className="min-w-[9rem] px-3 py-2">YARALANMA</th>
                <th className="min-w-[9rem] px-3 py-2">TCCC FAZI</th>
                <th className="min-w-[8rem] px-3 py-2">TURNİKE KONUMU</th>
                <th className="whitespace-nowrap px-3 py-2">TURNİKE SÜRESİ</th>
                <th className="whitespace-nowrap px-3 py-2">TAHLİYE BEKLEME</th>
                <th className="whitespace-nowrap px-3 py-2">SİSTOLİK BP</th>
                <th className="whitespace-nowrap px-3 py-2">MARCH</th>
                <th className="whitespace-nowrap px-3 py-2 text-[#00FF41]">BAŞARI ORANI (%)</th>
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
                        {formatTcccDateCell(row)}
                      </td>
                      <td
                        className="max-w-[11rem] break-words px-3 py-2 normal-case leading-snug text-slate-200"
                        title={cellTitle(injuryType)}
                      >
                        {injuryType}
                      </td>
                      <td
                        className="max-w-[12rem] break-words px-3 py-2 normal-case leading-snug text-slate-300"
                        title={cellTitle(phase)}
                      >
                        {phase}
                      </td>
                      <td
                        className="max-w-[10rem] break-words px-3 py-2 normal-case leading-snug text-slate-300"
                        title={cellTitle(tqLoc)}
                      >
                        {tqLoc}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 tabular-nums text-[#00FF41]">
                        {formatTcccInjuryToTqTime(row)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 tabular-nums text-[#5ec8ff]">
                        {formatTcccEvacWaitingTime(row)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 tabular-nums text-red-400/90">
                        {formatTcccSystolicBp(row)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 tabular-nums text-[#ffb400]">
                        {marchScore.total > 0 ? `${marchScore.done}/${marchScore.total}` : '—'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-sm font-bold tabular-nums text-[#00FF41]">
                        {formatSuccessPercentCell(row)}
                      </td>
                    </tr>
                    <tr className="border-b border-[#00FF41]/8">
                      <td colSpan={10} className="p-0">
                        <div
                          className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                            open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                          }`}
                        >
                          <div className="min-h-0 overflow-hidden">
                            <div className="mx-3 mb-3 mt-1 rounded border border-[#00FF41]/20 bg-black/50 p-3 font-mono-technical text-[8px] uppercase">
                              <p className="mb-2 font-bold tracking-wider text-[#00FF41]/85">
                                TCCC DETAY PANELİ · MARCH MÜDAHALELERİ
                              </p>
                              <p className="mb-2 text-slate-400">
                                BAŞARI ORANI:{' '}
                                <span className="text-sm font-bold text-[#00FF41]">
                                  {formatSuccessPercentCell(row)}
                                </span>
                              </p>
                              <div className="mb-3 grid gap-2 sm:grid-cols-2">
                                <p
                                  className="break-words normal-case leading-relaxed text-slate-300"
                                  title={cellTitle(injuryType)}
                                >
                                  YARALANMA TİPİ: <span className="text-slate-100">{injuryType}</span>
                                </p>
                                <p
                                  className="break-words normal-case leading-relaxed text-slate-300"
                                  title={cellTitle(phase)}
                                >
                                  TCCC FAZI: <span className="text-slate-100">{phase}</span>
                                </p>
                                <p
                                  className="break-words normal-case leading-relaxed text-slate-300"
                                  title={cellTitle(tqLoc)}
                                >
                                  TURNİKE KONUMU: <span className="text-slate-100">{tqLoc}</span>
                                </p>
                                <p className="text-slate-400">
                                  TURNİKE SÜRESİ:{' '}
                                  <span className="text-[#00FF41]">{formatTcccInjuryToTqTime(row)}</span>
                                </p>
                                <p className="text-slate-400">
                                  TAHLİYE BEKLEME:{' '}
                                  <span className="text-[#5ec8ff]">{formatTcccEvacWaitingTime(row)}</span>
                                </p>
                                <p className="text-slate-400 sm:col-span-2">
                                  SİSTOLİK TANSİYON:{' '}
                                  <span className="text-red-300/90">{formatTcccSystolicBp(row)}</span>
                                </p>
                              </div>
                              <div className="mb-3 grid gap-2 sm:grid-cols-2">
                                <p className="text-slate-400">
                                  TURNİKE UYGULANDI:{' '}
                                  <span className="text-[#00FF41]">
                                    {formatTcccBoolTr(getTcccTourniquetApplied(row))}
                                  </span>
                                </p>
                                <p className="text-slate-400">
                                  YARA PAKETLEME:{' '}
                                  <span className="text-slate-200">
                                    {formatTcccBoolTr(getTcccWoundPacking(row))}
                                  </span>
                                </p>
                                <p className="text-slate-400">
                                  NPA TÜP:{' '}
                                  <span className="text-slate-200">
                                    {formatTcccBoolTr(getTcccNpaInserted(row))}
                                  </span>
                                </p>
                                <p className="text-slate-400">
                                  GÖĞÜS MÜHRÜ:{' '}
                                  <span className="text-slate-200">
                                    {formatTcccBoolTr(getTcccChestSealApplied(row))}
                                  </span>
                                </p>
                                <p className="text-slate-400">
                                  İĞNE DEKOMPRESYONU:{' '}
                                  <span className="text-slate-200">
                                    {formatTcccBoolTr(getTcccNeedleDecompression(row))}
                                  </span>
                                </p>
                                <p className="text-slate-400">
                                  HİPOTERMİ BATTANİYESİ:{' '}
                                  <span className="text-slate-200">
                                    {formatTcccBoolTr(getTcccHypothermiaBlanket(row))}
                                  </span>
                                </p>
                              </div>
                              <p className="break-words normal-case leading-relaxed text-slate-400">
                                OPERASYON NOTU:{' '}
                                <span className="text-slate-200">{getTcccOperationNote(row)}</span>
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
