import TacticalPanel from '../ui/TacticalPanel'
import { utcHms } from '../../lib/dashboardHudData'

/**
 * @param {{ entries: { ms: number, code: string, msg: string }[] }} props
 */
export default function DashboardSystemLog({ entries }) {
  return (
    <TacticalPanel className="relative z-10 flex min-h-[320px] flex-col overflow-hidden bg-[#0c0c0e]/96 p-0 backdrop-blur-sm lg:sticky lg:top-6 lg:max-h-[calc(100dvh-6rem)]">
      <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-[#080808] px-3 py-2.5 sm:px-4 sm:py-3">
        <p className="font-mono-technical text-[10px] font-bold uppercase tracking-[0.38em] text-[#ffb400]/90">
          SİSTEM GÜNLÜĞÜ
        </p>
        <span className="rounded border border-white/15 bg-black/35 px-1.5 py-0.5 font-mono-technical text-[9px] text-slate-500">
          RX
        </span>
      </div>
      <div className="scrollbar-thin custom-log-scroll flex flex-1 flex-col gap-y-2.5 overflow-y-auto px-3 py-3 sm:px-4 sm:py-3.5">
        {entries.length === 0 ? (
          <p className="font-mono-technical text-[10px] text-slate-600">AKIŞ_YOK · BEKLEMEDE</p>
        ) : (
          entries.map((e, i) => (
            <div key={`${e.ms}-${i}`} className="flex gap-2 border-l border-[#ffb400]/20 py-0.5 pl-2.5 pr-1 text-[10px] leading-snug sm:pr-0">
              <span className="shrink-0 font-mono-technical tabular-nums text-slate-600">{utcHms(e.ms)}</span>
              <span className="shrink-0 font-mono-technical text-[9px] text-[#ffb400]/80">{e.code}</span>
              <span className="min-w-0 break-words font-mono-technical text-slate-400">{e.msg}</span>
            </div>
          ))
        )}
      </div>
    </TacticalPanel>
  )
}
