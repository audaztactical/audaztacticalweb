import { Fragment, useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import TacticalPanel from '../ui/TacticalPanel'
import {
  extractAtisCaliberOptions,
  extractAtisDrillOptions,
  filterAtisLogs,
  formatAtisDateCell,
  formatAtisDurationCell,
  formatWeaponSpecsBlock,
  getAtisAccuracyPercent,
  getAtisAmmoName,
  getAtisCaliberLabel,
  getAtisDistanceM,
  getAtisDrillName,
  getAtisOperationNote,
  getAtisRoundsAndHits,
  getAtisTimingDetails,
  getAtisWeaponLabel,
  isAtisTimed,
  selectAtisShootingLogs,
} from '../../lib/atisLogRegistry'
import {
  formatAccessoriesAtShotLines,
  getLogBarrelWearPercent,
  getLogYivConditionPercent,
} from '../../lib/weaponMaintenanceAlarm'
import { formatConditionBar } from '../../lib/weaponIlws'

const filterSelectClass =
  'dossier-blood-select min-w-[8.5rem] flex-1 rounded border border-[#00FF41]/35 bg-[#0A0A0A] py-1.5 pl-2 pr-7 font-mono-technical text-[9px] uppercase text-white outline-none focus:border-[#00FF41]/60'

const FILTER_INITIAL = {
  weaponType: 'ALL',
  caliberKey: 'ALL',
  drillName: 'ALL',
  timing: 'ALL',
}

/**
 * @param {{ rangeLogs: Record<string, unknown>[]; loading?: boolean }} props
 */
export default function AtisLogRegistry({ rangeLogs, loading = false }) {
  const [filters, setFilters] = useState(FILTER_INITIAL)
  const [expandedId, setExpandedId] = useState(/** @type {string | null} */ (null))

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
    [atisLogs, filters]
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
          ATIŞ KAYITLARI VE FİLTRELEME
        </p>
        <p className="mt-0.5 font-mono-technical text-[7px] uppercase text-slate-600">
          range_logs · canlı senkron · {filtered.length}/{atisLogs.length} KAYIT
        </p>
      </div>

      <div className="border-b border-[#00FF41]/12 bg-[#050805] px-3 py-3">
        <p className="mb-2 font-mono-technical text-[7px] font-bold uppercase tracking-[0.24em] text-slate-500">
          FİLTRELEME BARİ
        </p>
        <div className="flex flex-wrap gap-2">
          <label className="flex min-w-[10rem] flex-1 flex-col gap-0.5">
            <span className="font-mono-technical text-[7px] uppercase text-slate-600">SİLAH TİPİ</span>
            <select
              className={filterSelectClass}
              value={filters.weaponType}
              onChange={(e) => patchFilter({ weaponType: e.target.value })}
            >
              <option value="ALL">TÜMÜ</option>
              <option value="HANDGUN">TABANCA</option>
              <option value="RIFLE">TÜFEK</option>
            </select>
          </label>
          <label className="flex min-w-[10rem] flex-1 flex-col gap-0.5">
            <span className="font-mono-technical text-[7px] uppercase text-slate-600">KALİBRE</span>
            <select
              className={filterSelectClass}
              value={filters.caliberKey}
              onChange={(e) => patchFilter({ caliberKey: e.target.value })}
            >
              <option value="ALL">TÜMÜ</option>
              {caliberOptions.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-[10rem] flex-1 flex-col gap-0.5">
            <span className="font-mono-technical text-[7px] uppercase text-slate-600">ATIŞ TÜRÜ</span>
            <select
              className={filterSelectClass}
              value={filters.drillName}
              onChange={(e) => patchFilter({ drillName: e.target.value })}
            >
              <option value="ALL">TÜMÜ</option>
              {drillOptions.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-[10rem] flex-1 flex-col gap-0.5">
            <span className="font-mono-technical text-[7px] uppercase text-slate-600">SÜRE</span>
            <select
              className={filterSelectClass}
              value={filters.timing}
              onChange={(e) => patchFilter({ timing: e.target.value })}
            >
              <option value="ALL">TÜMÜ</option>
              <option value="TIMED">SÜRELİ</option>
              <option value="UNTIMED">SÜRESİZ</option>
            </select>
          </label>
        </div>
      </div>

      <div className="ilws-green-scroll max-h-[min(52vh,520px)] overflow-auto">
        {loading ? (
          <p className="p-8 text-center font-mono-technical text-[10px] uppercase text-slate-500">SENKRON…</p>
        ) : filtered.length === 0 ? (
          <p className="p-8 text-center font-mono-technical text-[10px] uppercase text-slate-600">
            {atisLogs.length === 0 ? 'ATIŞ_KAYDI_YOK' : 'FİLTRE_SONUCU_YOK'}
          </p>
        ) : (
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead className="sticky top-0 z-[2] bg-[#0a0a0a]">
              <tr className="border-b border-[#00FF41]/25 font-mono-technical text-[8px] font-bold uppercase tracking-wider text-[#00FF41]/80">
                <th className="w-8 px-2 py-2" aria-hidden />
                <th className="px-3 py-2">TARİH</th>
                <th className="px-3 py-2">SİLAH</th>
                <th className="px-3 py-2">ATIŞ TÜRÜ</th>
                <th className="px-3 py-2">MESAFE</th>
                <th className="px-3 py-2">ATIM/İSABET</th>
                <th className="px-3 py-2">SKOR (%)</th>
                <th className="px-3 py-2">SÜRE</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const id = String(row.id)
                const open = expandedId === id
                const { totalRoundsFired, totalHits } = getAtisRoundsAndHits(row)
                const accuracy = getAtisAccuracyPercent(row)
                const duration = formatAtisDurationCell(row)
                const timing = getAtisTimingDetails(row)
                const specLines = formatWeaponSpecsBlock(row)

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
                      <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-400">{formatAtisDateCell(row)}</td>
                      <td className="max-w-[140px] truncate px-3 py-2 text-slate-200" title={getAtisWeaponLabel(row)}>
                        {getAtisWeaponLabel(row)}
                      </td>
                      <td className="max-w-[120px] truncate px-3 py-2 text-slate-300">{getAtisDrillName(row)}</td>
                      <td className="px-3 py-2 tabular-nums text-slate-400">{getAtisDistanceM(row)} m</td>
                      <td className="px-3 py-2 tabular-nums text-[#00FF41]">
                        {totalRoundsFired} / {totalHits}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-[#ffb400]">%{accuracy.toLocaleString('tr-TR')}</td>
                      <td
                        className={`px-3 py-2 tabular-nums ${duration.muted ? 'text-slate-600' : 'text-[#5ec8ff]'}`}
                      >
                        {duration.label}
                      </td>
                    </tr>
                    <tr className="border-b border-[#00FF41]/8">
                      <td colSpan={8} className="p-0">
                        <div
                          className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                            open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                          }`}
                        >
                          <div className="min-h-0 overflow-hidden">
                            <div className="mx-3 mb-3 mt-1 rounded border border-[#00FF41]/20 bg-black/50 p-3 font-mono-technical text-[8px] uppercase">
                              <p className="mb-2 font-bold tracking-wider text-[#00FF41]/85">DETAY PANELİ</p>
                              {isAtisTimed(row) && timing ? (
                                <div className="mb-3 grid gap-2 sm:grid-cols-2">
                                  <p className="rounded border border-[#00b4ff]/25 bg-[#00b4ff]/5 px-2 py-1.5">
                                    <span className="text-slate-500">İLK ATIŞ SÜRESİ · </span>
                                    <span className="text-[#5ec8ff]">{timing.firstShot}</span>
                                  </p>
                                  <p className="rounded border border-[#00b4ff]/25 bg-[#00b4ff]/5 px-2 py-1.5">
                                    <span className="text-slate-500">ORTALAMA SPLIT · </span>
                                    <span className="text-[#5ec8ff]">{timing.split}</span>
                                  </p>
                                </div>
                              ) : (
                                <p className="mb-3 text-slate-600">SÜRE VERİSİ · SÜRESİZ ATIŞ</p>
                              )}
                              <p className="mb-1 text-slate-500">
                                MÜHİMMAT: <span className="text-[#00FF41]">{getAtisAmmoName(row)}</span>
                                <span className="mx-2 text-white/20">|</span>
                                KALİBRE: <span className="text-slate-300">{getAtisCaliberLabel(row)}</span>
                              </p>
                              <div className="mb-3 rounded border border-[#7ab4ff]/25 bg-[#7ab4ff]/5 px-2 py-2">
                                <p className="mb-1 text-[7px] font-bold text-[#7ab4ff]/80">OPTİK / AKSESUAR DURUMU</p>
                                <ul className="space-y-0.5 text-slate-300">
                                  {formatAccessoriesAtShotLines(row.accessoriesAtShot).map((line) => (
                                    <li key={line}>{line}</li>
                                  ))}
                                </ul>
                              </div>
                              {(() => {
                                const yiv = getLogYivConditionPercent(row)
                                const wear = getLogBarrelWearPercent(row)
                                if (yiv == null) return null
                                return (
                                  <div className="mb-3 rounded border border-[#00FF41]/25 bg-[#00FF41]/5 px-2 py-2">
                                    <p className="mb-1 text-[7px] font-bold text-[#00FF41]/80">NAMLU / YİV-SET KONDİSYONU (KAYIT ANI)</p>
                                    <p className="text-[#00FF41]">
                                      [{formatConditionBar(yiv)}] %{yiv} KONDİSYON
                                    </p>
                                    {wear != null ? (
                                      <p className="mt-0.5 text-[8px] text-amber-400/90">AŞINMA: %{wear}</p>
                                    ) : null}
                                  </div>
                                )
                              })()}
                              {specLines.length > 0 ? (
                                <ul className="mb-3 space-y-0.5 border-l border-[#00FF41]/20 pl-2 text-slate-400">
                                  {specLines.map((line) => (
                                    <li key={line}>{line}</li>
                                  ))}
                                </ul>
                              ) : null}
                              <div className="rounded border border-white/10 bg-[#080808] px-2 py-2">
                                <p className="mb-1 text-[7px] text-slate-600">OPERASYON NOTU</p>
                                <p className="normal-case leading-relaxed text-slate-300">{getAtisOperationNote(row)}</p>
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
