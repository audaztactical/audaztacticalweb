import { useId } from 'react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts'

/**
 * @param {{ data: { gun: string; day: string; events: number }[], loading?: boolean }} props
 */
export default function WeekActivityAreaChart({ data, loading }) {
  const gid = useId().replace(/:/g, '')

  return (
    <div className="relative mt-3 h-[188px] min-h-[188px] w-full min-w-0 md:h-[200px] md:min-h-[200px]">
      {loading ? (
        <div className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center bg-black/20 font-mono-technical text-[10px] uppercase tracking-widest text-slate-500">
          TOPLANIYOR...
        </div>
      ) : null}
      {!loading && data.length > 0 ? (
      <div className="absolute inset-0 h-full w-full min-h-0 min-w-0">
      <ResponsiveContainer
        width="100%"
        height="100%"
        minWidth={0}
        minHeight={188}
        debounce={50}
        initialDimension={{ width: 320, height: 188 }}
      >
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
          <defs>
            <linearGradient id={`actFill-${gid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00FF41" stopOpacity={0.28} />
              <stop offset="55%" stopColor="#00FF41" stopOpacity={0.08} />
              <stop offset="100%" stopColor="#ffb400" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="gun"
            tick={{ fill: '#64748b', fontSize: 9, fontFamily: 'JetBrains Mono, monospace' }}
            stroke="rgba(255,255,255,0.08)"
            tickLine={false}
          />
          <YAxis
            width={24}
            tick={{ fill: '#475569', fontSize: 9, fontFamily: 'JetBrains Mono, monospace' }}
            stroke="rgba(255,255,255,0.06)"
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ stroke: 'rgba(0,255,65,0.35)', strokeWidth: 1 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const row = payload[0].payload
              const g = row?.gun ?? ''
              const d = row?.day ?? ''
              const ev = row?.events ?? 0
              return (
                <div
                  className="rounded-md border border-white/12 px-2.5 py-1.5 font-mono-technical text-[10px] text-slate-200"
                  style={{
                    backgroundColor: '#0a0a0a',
                    boxShadow: '0 0 0 1px rgba(0,255,65,0.12)',
                  }}
                >
                  <p className="text-[#00FF41]/90">
                    GÜN {g} · {d}
                  </p>
                  <p className="mt-0.5 tabular-nums text-slate-400">
                    OLAY: <span className="text-white">{ev}</span>
                  </p>
                </div>
              )
            }}
          />
          <Area
            type="monotone"
            dataKey="events"
            stroke="#00FF41"
            strokeWidth={1.35}
            fill={`url(#actFill-${gid})`}
            dot={false}
            activeDot={{ r: 3, fill: '#ffb400', stroke: '#00FF41' }}
          />
        </AreaChart>
      </ResponsiveContainer>
      </div>
      ) : !loading ? (
        <div className="flex h-full items-center justify-center font-mono-technical text-[10px] uppercase text-slate-600">
          VERİ_YOK
        </div>
      ) : null}
    </div>
  )
}
