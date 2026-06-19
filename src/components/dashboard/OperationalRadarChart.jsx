import { useId, useMemo } from 'react'
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'

/**
 * @param {{ data: { axis: string, value: number, fullMark: number }[], loading?: boolean }} props
 */
export default function OperationalRadarChart({ data, loading }) {
  const gid = useId().replace(/:/g, '')

  const chartData = useMemo(
    () => data.map((row) => ({ ...row, subject: row.axis, value: Math.round(row.value) })),
    [data],
  )

  const hasSignal = chartData.some((row) => row.value > 0)
  const maxValue = Math.max(0, ...chartData.map((row) => row.value))

  return (
    <div className="cmd-radar relative flex h-full min-h-[280px] flex-col">
      <div className="mb-3">
        <p className="cmd-panel__title">Kapasite radarı</p>
        <p className="cmd-panel__subtitle">Personel · lojistik · ekipman karşılaştırması</p>
      </div>
      <div className="relative h-[220px] w-full min-w-0">
        {loading ? (
          <div className="absolute inset-0 z-[2] flex items-center justify-center font-mono-technical text-xs uppercase tracking-widest text-app-text/55">
            Hesaplanıyor…
          </div>
        ) : null}
        {!loading && !hasSignal ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-2 z-[2] px-2 text-center font-mono-technical text-[9px] uppercase leading-relaxed tracking-wide text-app-text/45">
            Henüz kapasite verisi yok — antrenman, cephanelik ve sağlık kayıtları radarı doldurur.
          </div>
        ) : null}
        <ResponsiveContainer width="100%" height={220} minWidth={200} debounce={200}>
          <RadarChart data={chartData} cx="50%" cy="52%" outerRadius="72%">
            <defs>
              <linearGradient id={`radarFill-${gid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent-color)" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#004DFF" stopOpacity={0.12} />
              </linearGradient>
            </defs>
            <PolarGrid stroke="rgba(148,163,184,0.18)" />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fill: '#64748b', fontSize: 9 }}
              axisLine={false}
              tickCount={5}
            />
            <Radar
              name="Hazırlık"
              dataKey="value"
              stroke="var(--accent-color)"
              fill={`url(#radarFill-${gid})`}
              fillOpacity={maxValue < 15 ? 0.35 : 0.55}
              strokeWidth={2}
              isAnimationActive={false}
              style={{ filter: 'drop-shadow(0 0 10px rgba(0,255,65,0.35))' }}
            />
            <Tooltip
              contentStyle={{
                background: 'rgba(8,10,14,0.92)',
                border: '1px solid rgba(71,85,105,0.5)',
                borderRadius: 4,
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 11,
              }}
              formatter={(value) => [`${value ?? 0}/100`, 'Skor']}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      {!loading && hasSignal ? (
        <ul className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 font-mono-technical text-[9px] uppercase tracking-wide text-app-text/50">
          {chartData.map((row) => (
            <li key={row.axis}>
              {row.axis}{' '}
              <span className="tabular-nums text-accent/80">{row.value}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
