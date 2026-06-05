import { Fragment, useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import TacticalPanel from '../ui/TacticalPanel'
import {
  extractVbssSeaStateOptions,
  filterVbssLogs,
  formatVbssBoardingTime,
  formatVbssBoolTr,
  formatVbssBridgeControlTime,
  formatVbssContainmentTime,
  formatVbssDateCell,
  formatVbssEngineRoomControlTime,
  formatVbssVesselSpeed,
  getVbssInsertionMethod,
  getVbssBiometricCheck,
  getVbssCommsBlackoutSuccess,
  getVbssContrabandFound,
  getVbssCrewCount,
  getVbssOperationNote,
  getVbssScuttlingAttempt,
  getVbssSeaState,
  getVbssVesselType,
  selectVbssLogs,
} from '../../lib/vbssLogRegistry'
import { formatSuccessPercentCell } from '../../lib/trainingSuccessScore'

const filterSelectClass =
  'dossier-blood-select min-w-[8.5rem] flex-1 rounded border border-[#00FF41]/35 bg-[#0A0A0A] py-1.5 pl-2 pr-7 font-mono-technical text-[9px] uppercase text-white outline-none focus:border-[#00FF41]/60'

const FILTER_INITIAL = {
  seaStateKey: 'ALL',
}

/** @param {string} text */
function cellTitle(text) {
  const t = String(text || '').trim()
  return t && t !== '—' ? t : undefined
}

/**
 * @param {{ rangeLogs: Record<string, unknown>[]; loading?: boolean }} props
 */
export default function VbssLogRegistry({ rangeLogs, loading = false }) {
  const [filters, setFilters] = useState(FILTER_INITIAL)
  const [expandedId, setExpandedId] = useState(/** @type {string | null} */ (null))

  const vbssLogs = useMemo(() => selectVbssLogs(rangeLogs), [rangeLogs])
  const seaStateOptions = useMemo(() => extractVbssSeaStateOptions(vbssLogs), [vbssLogs])

  const filtered = useMemo(
    () => filterVbssLogs({ logs: vbssLogs, seaStateKey: filters.seaStateKey }),
    [vbssLogs, filters]
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
          GEÇMİŞ VBSS KAYITLARI · DENİZ MÜDAHALE
        </p>
        <p className="mt-0.5 font-mono-technical text-[7px] uppercase text-slate-600">
          range_logs · canlı senkron · {filtered.length}/{vbssLogs.length} KAYIT
        </p>
      </div>

      <div className="border-b border-[#00FF41]/12 bg-[#050805] px-3 py-3">
        <p className="mb-2 font-mono-technical text-[7px] font-bold uppercase tracking-[0.24em] text-slate-500">
          FİLTRELEME BARİ
        </p>
        <label className="flex min-w-[12rem] max-w-md flex-col gap-0.5">
          <span className="font-mono-technical text-[7px] uppercase text-slate-600">DENİZ DURUMU</span>
          <select
            className={filterSelectClass}
            value={filters.seaStateKey}
            onChange={(e) => patchFilter({ seaStateKey: e.target.value })}
          >
            <option value="ALL">TÜMÜ</option>
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
          <p className="p-8 text-center font-mono-technical text-[10px] uppercase text-slate-500">SENKRON…</p>
        ) : filtered.length === 0 ? (
          <p className="p-8 text-center font-mono-technical text-[10px] uppercase text-slate-600">
            {vbssLogs.length === 0 ? 'VBSS_KAYDI_YOK' : 'FİLTRE_SONUCU_YOK'}
          </p>
        ) : (
          <table className="w-full min-w-[1100px] border-collapse text-left">
            <thead className="sticky top-0 z-[2] bg-[#0a0a0a]">
              <tr className="border-b border-[#00FF41]/25 font-mono-technical text-[8px] font-bold uppercase tracking-wider text-[#00FF41]/80">
                <th className="w-8 px-2 py-2" aria-hidden />
                <th className="whitespace-nowrap px-3 py-2">TARİH</th>
                <th className="min-w-[8rem] px-3 py-2">İNTİKAL METODU</th>
                <th className="min-w-[8rem] px-3 py-2">GEMİ / UNSUR TİPİ</th>
                <th className="min-w-[7rem] px-3 py-2">DENİZ DURUMU</th>
                <th className="whitespace-nowrap px-3 py-2">GEMİ HIZI</th>
                <th className="whitespace-nowrap px-3 py-2">GEMİYE ÇIKIŞ</th>
                <th className="whitespace-nowrap px-3 py-2">KÖPRÜÜSTÜ</th>
                <th className="whitespace-nowrap px-3 py-2">MAKİNE D.</th>
                <th className="whitespace-nowrap px-3 py-2">EMNİYET</th>
                <th className="whitespace-nowrap px-3 py-2">MÜRETTEBAT</th>
                <th className="whitespace-nowrap px-3 py-2 text-[#00FF41]">BAŞARI ORANI (%)</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const id = String(row.id)
                const open = expandedId === id
                const seaState = getVbssSeaState(row)
                const insertionMethod = getVbssInsertionMethod(row)
                const vesselType = getVbssVesselType(row)

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
                        {formatVbssDateCell(row)}
                      </td>
                      <td
                        className="max-w-[12rem] break-words px-3 py-2 normal-case leading-snug text-slate-200"
                        title={cellTitle(insertionMethod)}
                      >
                        {insertionMethod}
                      </td>
                      <td
                        className="max-w-[12rem] break-words px-3 py-2 normal-case leading-snug text-slate-300"
                        title={cellTitle(vesselType)}
                      >
                        {vesselType}
                      </td>
                      <td
                        className="max-w-[10rem] break-words px-3 py-2 normal-case leading-snug text-slate-200"
                        title={cellTitle(seaState)}
                      >
                        {seaState}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 tabular-nums text-[#5ec8ff]">
                        {formatVbssVesselSpeed(row)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 tabular-nums text-[#00FF41]">
                        {formatVbssBoardingTime(row)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-300">
                        {formatVbssBridgeControlTime(row)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-300">
                        {formatVbssEngineRoomControlTime(row)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 tabular-nums text-[#ffb400]">
                        {formatVbssContainmentTime(row)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-200">
                        {getVbssCrewCount(row)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-sm font-bold tabular-nums text-[#00FF41]">
                        {formatSuccessPercentCell(row)}
                      </td>
                    </tr>
                    <tr className="border-b border-[#00FF41]/8">
                      <td colSpan={12} className="p-0">
                        <div
                          className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                            open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                          }`}
                        >
                          <div className="min-h-0 overflow-hidden">
                            <div className="mx-3 mb-3 mt-1 rounded border border-[#00FF41]/20 bg-black/50 p-3 font-mono-technical text-[8px] uppercase">
                              <p className="mb-2 font-bold tracking-wider text-[#00FF41]/85">
                                VBSS DETAY PANELİ · DENİZ MÜDAHALE
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
                                  title={cellTitle(insertionMethod)}
                                >
                                  İNTİKAL METODU:{' '}
                                  <span className="text-slate-100">{insertionMethod}</span>
                                </p>
                                <p
                                  className="break-words normal-case leading-relaxed text-slate-300"
                                  title={cellTitle(vesselType)}
                                >
                                  GEMİ / UNSUR TİPİ:{' '}
                                  <span className="text-slate-100">{vesselType}</span>
                                </p>
                                <p
                                  className="break-words normal-case leading-relaxed text-slate-300 sm:col-span-2"
                                  title={cellTitle(seaState)}
                                >
                                  DENİZ DURUMU: <span className="text-slate-100">{seaState}</span>
                                </p>
                              </div>
                              <div className="mb-3 grid gap-2 sm:grid-cols-2">
                                <p className="text-slate-400">
                                  GEMİYE ÇIKIŞ SÜRESİ:{' '}
                                  <span className="text-[#00FF41]">{formatVbssBoardingTime(row)}</span>
                                </p>
                                <p className="text-slate-400">
                                  KÖPRÜÜSTÜ KONTROLÜ:{' '}
                                  <span className="text-slate-200">{formatVbssBridgeControlTime(row)}</span>
                                </p>
                                <p className="text-slate-400">
                                  MAKİNE DAİRESİ KONTROLÜ:{' '}
                                  <span className="text-slate-200">{formatVbssEngineRoomControlTime(row)}</span>
                                </p>
                                <p className="text-slate-400">
                                  MÜRETTEBAT EMNİYETE ALMA:{' '}
                                  <span className="text-[#ffb400]">{formatVbssContainmentTime(row)}</span>
                                </p>
                                <p className="text-slate-400">
                                  GEMİNİN HIZI:{' '}
                                  <span className="text-[#5ec8ff]">{formatVbssVesselSpeed(row)}</span>
                                </p>
                                <p className="text-slate-400">
                                  MÜRETTEBAT SAYISI:{' '}
                                  <span className="text-slate-100">{getVbssCrewCount(row)}</span>
                                </p>
                              </div>
                              <div className="mb-3 grid gap-2 rounded border border-[#5ec8ff]/25 bg-[#0a1520]/50 p-2 sm:grid-cols-2">
                                <p className="text-slate-400">
                                  KAÇAK MALZEME / SİLAH:{' '}
                                  <span
                                    className={
                                      getVbssContrabandFound(row) ? 'text-amber-300' : 'text-slate-500'
                                    }
                                  >
                                    {formatVbssBoolTr(getVbssContrabandFound(row))}
                                  </span>
                                </p>
                                <p className="text-slate-400">
                                  BİYOMETRİK KİMLİK:{' '}
                                  <span
                                    className={getVbssBiometricCheck(row) ? 'text-green-400' : 'text-slate-500'}
                                  >
                                    {formatVbssBoolTr(getVbssBiometricCheck(row))}
                                  </span>
                                </p>
                                <p className="text-slate-400">
                                  BATIRMA / SABOTAJ:{' '}
                                  <span
                                    className={getVbssScuttlingAttempt(row) ? 'text-red-400' : 'text-slate-500'}
                                  >
                                    {formatVbssBoolTr(getVbssScuttlingAttempt(row))}
                                  </span>
                                </p>
                                <p className="text-slate-400">
                                  TELSİZ KÖR ETME:{' '}
                                  <span
                                    className={
                                      getVbssCommsBlackoutSuccess(row) ? 'text-green-400' : 'text-slate-500'
                                    }
                                  >
                                    {formatVbssBoolTr(getVbssCommsBlackoutSuccess(row))}
                                  </span>
                                </p>
                              </div>
                              <div className="rounded border border-white/10 bg-[#080808] px-2 py-2">
                                <p className="mb-1 text-[7px] text-slate-600">OPERASYON NOTU</p>
                                <p className="whitespace-pre-wrap break-words normal-case leading-relaxed text-slate-300">
                                  {getVbssOperationNote(row)}
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
