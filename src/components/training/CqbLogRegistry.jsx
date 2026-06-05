import { Fragment, useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import TacticalPanel from '../ui/TacticalPanel'
import {
  extractCqbEntryOptions,
  extractCqbTeamSizeOptions,
  extractCqbTopologyOptions,
  filterCqbLogs,
  formatCqbClearingTime,
  formatCqbDateCell,
  getCqbBreachingType,
  getCqbDoorState,
  getCqbEntryMethod,
  getCqbOperationNote,
  getCqbRoomTopology,
  countCqbTacticalErrors,
  getCqbTacticalErrorsGrouped,
  getCqbTeamSize,
  getCqbThreatNeutralized,
  selectCqbLogs,
} from '../../lib/cqbLogRegistry'
import { formatSuccessPercentCell } from '../../lib/trainingSuccessScore'

const filterSelectClass =
  'dossier-blood-select min-w-[8.5rem] flex-1 rounded border border-[#00FF41]/35 bg-[#0A0A0A] py-1.5 pl-2 pr-7 font-mono-technical text-[9px] uppercase text-white outline-none focus:border-[#00FF41]/60'

const FILTER_INITIAL = {
  roomTopologyKey: 'ALL',
  entryMethodKey: 'ALL',
  teamSize: 'ALL',
}

/**
 * @param {{ rangeLogs: Record<string, unknown>[]; loading?: boolean }} props
 */
export default function CqbLogRegistry({ rangeLogs, loading = false }) {
  const [filters, setFilters] = useState(FILTER_INITIAL)
  const [expandedId, setExpandedId] = useState(/** @type {string | null} */ (null))

  const cqbLogs = useMemo(() => selectCqbLogs(rangeLogs), [rangeLogs])
  const topologyOptions = useMemo(() => extractCqbTopologyOptions(cqbLogs), [cqbLogs])
  const entryOptions = useMemo(() => extractCqbEntryOptions(cqbLogs), [cqbLogs])
  const teamOptions = useMemo(() => extractCqbTeamSizeOptions(cqbLogs), [cqbLogs])

  const filtered = useMemo(
    () =>
      filterCqbLogs({
        logs: cqbLogs,
        roomTopologyKey: filters.roomTopologyKey,
        entryMethodKey: filters.entryMethodKey,
        teamSize: filters.teamSize,
      }),
    [cqbLogs, filters]
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
          GEÇMİŞ CQB KAYITLARI · FİLTRELEME
        </p>
        <p className="mt-0.5 font-mono-technical text-[7px] uppercase text-slate-600">
          range_logs · canlı senkron · {filtered.length}/{cqbLogs.length} KAYIT
        </p>
      </div>

      <div className="border-b border-[#00FF41]/12 bg-[#050805] px-3 py-3">
        <p className="mb-2 font-mono-technical text-[7px] font-bold uppercase tracking-[0.24em] text-slate-500">
          FİLTRELEME BARİ
        </p>
        <div className="flex flex-wrap gap-2">
          <label className="flex min-w-[10rem] flex-1 flex-col gap-0.5">
            <span className="font-mono-technical text-[7px] uppercase text-slate-600">ODA TOPOLOJİSİ</span>
            <select
              className={filterSelectClass}
              value={filters.roomTopologyKey}
              onChange={(e) => patchFilter({ roomTopologyKey: e.target.value })}
            >
              <option value="ALL">TÜMÜ</option>
              {topologyOptions.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-[10rem] flex-1 flex-col gap-0.5">
            <span className="font-mono-technical text-[7px] uppercase text-slate-600">GİRİŞ METODU</span>
            <select
              className={filterSelectClass}
              value={filters.entryMethodKey}
              onChange={(e) => patchFilter({ entryMethodKey: e.target.value })}
            >
              <option value="ALL">TÜMÜ</option>
              {entryOptions.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-[10rem] flex-1 flex-col gap-0.5">
            <span className="font-mono-technical text-[7px] uppercase text-slate-600">TAKIM</span>
            <select
              className={filterSelectClass}
              value={filters.teamSize}
              onChange={(e) => patchFilter({ teamSize: e.target.value })}
            >
              <option value="ALL">TÜMÜ</option>
              {teamOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
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
            {cqbLogs.length === 0 ? 'CQB_KAYDI_YOK' : 'FİLTRE_SONUCU_YOK'}
          </p>
        ) : (
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead className="sticky top-0 z-[2] bg-[#0a0a0a]">
              <tr className="border-b border-[#00FF41]/25 font-mono-technical text-[8px] font-bold uppercase tracking-wider text-[#00FF41]/80">
                <th className="w-8 px-2 py-2" aria-hidden />
                <th className="px-3 py-2">TARİH</th>
                <th className="px-3 py-2">TOPOLOJİ</th>
                <th className="px-3 py-2">GİRİŞ</th>
                <th className="px-3 py-2">KIRMA</th>
                <th className="px-3 py-2">TEHDİT/ETKİSİZ</th>
                <th className="px-3 py-2">TEMİZLİK</th>
                <th className="px-3 py-2">TAKIM</th>
                <th className="whitespace-nowrap px-3 py-2 text-[#00FF41]">BAŞARI ORANI (%)</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const id = String(row.id)
                const open = expandedId === id
                const { threats, neutralized } = getCqbThreatNeutralized(row)
                const errorGroups = getCqbTacticalErrorsGrouped(row)
                const errorCount = countCqbTacticalErrors(row)

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
                        {formatCqbDateCell(row)}
                      </td>
                      <td className="max-w-[120px] truncate px-3 py-2 text-slate-200" title={getCqbRoomTopology(row)}>
                        {getCqbRoomTopology(row)}
                      </td>
                      <td className="max-w-[120px] truncate px-3 py-2 text-slate-300" title={getCqbEntryMethod(row)}>
                        {getCqbEntryMethod(row)}
                      </td>
                      <td className="max-w-[100px] truncate px-3 py-2 text-slate-400">{getCqbBreachingType(row)}</td>
                      <td className="px-3 py-2 tabular-nums text-[#00FF41]">
                        {threats} / {neutralized}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-[#5ec8ff]">{formatCqbClearingTime(row)}</td>
                      <td className="px-3 py-2 text-[#ffb400]">{getCqbTeamSize(row)}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-sm font-bold tabular-nums text-[#00FF41]">
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
                              <p className="mb-2 font-bold tracking-wider text-[#00FF41]/85">CQB DETAY PANELİ</p>
                              <p className="mb-2 text-slate-400">
                                BAŞARI ORANI:{' '}
                                <span className="text-sm font-bold text-[#00FF41]">
                                  {formatSuccessPercentCell(row)}
                                </span>
                              </p>
                              <p className="mb-2 text-slate-400">
                                KAPI: <span className="text-slate-200">{getCqbDoorState(row)}</span>
                              </p>
                              {errorCount > 0 ? (
                                <div className="mb-3 rounded border border-amber-500/30 bg-amber-950/20 px-2 py-2">
                                  <p className="mb-2 text-[7px] font-bold text-amber-400/90">
                                    TAKTİK HATALAR · {errorCount} KAYIT
                                  </p>
                                  <div className="space-y-2">
                                    {errorGroups.map((group) => (
                                      <div key={group.phaseTitle}>
                                        <p className="mb-1 text-[7px] font-bold tracking-wider text-amber-500/80">
                                          {group.phaseTitle}
                                        </p>
                                        <ul className="list-inside list-disc space-y-0.5 text-amber-200/90">
                                          {group.labels.map((err) => (
                                            <li key={`${group.phaseTitle}-${err}`} className="normal-case">
                                              {err}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <p className="mb-3 text-slate-600">TAKTİK_HATA_KAYDI_YOK</p>
                              )}
                              <div className="rounded border border-white/10 bg-[#080808] px-2 py-2">
                                <p className="mb-1 text-[7px] text-slate-600">OPERASYON NOTU</p>
                                <p className="normal-case leading-relaxed text-slate-300">{getCqbOperationNote(row)}</p>
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
