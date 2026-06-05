import { Fragment, useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import TacticalPanel from '../ui/TacticalPanel'
import {
  extractFofScenarioOptions,
  extractFofSimSystemOptions,
  filterFofLogs,
  formatFofCoverUtilization,
  formatFofDateCell,
  formatFofDuration,
  formatFofTimeToFirstEngagement,
  getFofBlueOnBlue,
  getFofFriendlyCasualties,
  getFofHitsTaken,
  getFofLethalHits,
  getFofNonLethalHits,
  getFofOperationNote,
  getFofOpforCount,
  getFofScenarioType,
  getFofSelfTcccApplied,
  getFofSimSystem,
  selectFofLogs,
} from '../../lib/fofLogRegistry'
import { formatSuccessPercentCell } from '../../lib/trainingSuccessScore'

const filterSelectClass =
  'dossier-blood-select min-w-[8.5rem] flex-1 rounded border border-[#00FF41]/35 bg-[#0A0A0A] py-1.5 pl-2 pr-7 font-mono-technical text-[9px] uppercase text-white outline-none focus:border-[#00FF41]/60'

const FILTER_INITIAL = {
  scenarioTypeKey: 'ALL',
  simSystemKey: 'ALL',
}

/**
 * @param {{ rangeLogs: Record<string, unknown>[]; loading?: boolean }} props
 */
export default function FofLogRegistry({ rangeLogs, loading = false }) {
  const [filters, setFilters] = useState(FILTER_INITIAL)
  const [expandedId, setExpandedId] = useState(/** @type {string | null} */ (null))

  const fofLogs = useMemo(() => selectFofLogs(rangeLogs), [rangeLogs])
  const scenarioOptions = useMemo(() => extractFofScenarioOptions(fofLogs), [fofLogs])
  const simOptions = useMemo(() => extractFofSimSystemOptions(fofLogs), [fofLogs])

  const filtered = useMemo(
    () =>
      filterFofLogs({
        logs: fofLogs,
        scenarioTypeKey: filters.scenarioTypeKey,
        simSystemKey: filters.simSystemKey,
      }),
    [fofLogs, filters]
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
          GEÇMİŞ FOF KAYITLARI · FİLTRELEME
        </p>
        <p className="mt-0.5 font-mono-technical text-[7px] uppercase text-slate-600">
          range_logs · canlı senkron · {filtered.length}/{fofLogs.length} KAYIT
        </p>
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
          <table className="w-full min-w-[880px] border-collapse text-left">
            <thead className="sticky top-0 z-[2] bg-[#0a0a0a]">
              <tr className="border-b border-[#00FF41]/25 font-mono-technical text-[8px] font-bold uppercase tracking-wider text-[#00FF41]/80">
                <th className="w-8 px-2 py-2" aria-hidden />
                <th className="px-3 py-2">TARİH</th>
                <th className="px-3 py-2">SENARYO</th>
                <th className="px-3 py-2">SİM</th>
                <th className="px-3 py-2">OPFOR</th>
                <th className="px-3 py-2">SÜRE</th>
                <th className="px-3 py-2">VURUŞ</th>
                <th className="px-3 py-2">ÖL/ÖL-OLMAYAN</th>
                <th className="whitespace-nowrap px-3 py-2 text-[#00FF41]">BAŞARI ORANI (%)</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const id = String(row.id)
                const open = expandedId === id

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
                      <td
                        className="max-w-[140px] truncate px-3 py-2 text-slate-200"
                        title={getFofScenarioType(row)}
                      >
                        {getFofScenarioType(row)}
                      </td>
                      <td className="max-w-[100px] truncate px-3 py-2 text-slate-300" title={getFofSimSystem(row)}>
                        {getFofSimSystem(row)}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-[#00FF41]">{getFofOpforCount(row)}</td>
                      <td className="px-3 py-2 tabular-nums text-[#5ec8ff]">{formatFofDuration(row)}</td>
                      <td className="px-3 py-2 tabular-nums text-[#ffb400]">{getFofHitsTaken(row)}</td>
                      <td className="px-3 py-2 tabular-nums text-slate-200">
                        {getFofLethalHits(row)} / {getFofNonLethalHits(row)}
                      </td>
                      <td
                        className={`whitespace-nowrap px-3 py-2 text-sm font-bold tabular-nums ${
                          getFofBlueOnBlue(row) ? 'text-red-400' : 'text-[#00FF41]'
                        }`}
                      >
                        {formatSuccessPercentCell(row)}
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
                              <p className="mb-2 font-bold tracking-wider text-[#00FF41]/85">FOF DETAY PANELİ</p>
                              <p className="mb-2 text-slate-400">
                                BAŞARI ORANI:{' '}
                                <span
                                  className={`text-sm font-bold ${
                                    getFofBlueOnBlue(row) ? 'text-red-400' : 'text-[#00FF41]'
                                  }`}
                                >
                                  {formatSuccessPercentCell(row)}
                                </span>
                              </p>
                              <div className="mb-3 grid gap-2 sm:grid-cols-2">
                                <p className="text-slate-400">
                                  SİPER KULLANIMI:{' '}
                                  <span className="text-slate-200">{formatFofCoverUtilization(row)}</span>
                                </p>
                                <p className="text-slate-400">
                                  İLK ATIŞ SÜRESİ:{' '}
                                  <span className="text-[#5ec8ff]">{formatFofTimeToFirstEngagement(row)}</span>
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
                                <p className="text-slate-400 sm:col-span-2">
                                  TCCC (ATEŞ ALTINDA):{' '}
                                  <span className={getFofSelfTcccApplied(row) ? 'text-green-400' : 'text-slate-500'}>
                                    {getFofSelfTcccApplied(row) ? 'UYGULANDI' : 'HAYIR'}
                                  </span>
                                </p>
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
