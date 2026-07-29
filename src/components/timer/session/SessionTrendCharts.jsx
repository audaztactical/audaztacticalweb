import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts'
import ChartSafeFrame from '../ChartSafeFrame'
import ChartZoomFrame from '../ChartZoomFrame'

const GOLD = '#facc15'
const SKY = '#38bdf8'
const ORANGE = '#fb923c'
const ROSE = '#fb7185'
const EMERALD = '#34d399'
const GRID = 'rgba(148,163,184,0.12)'
const MUTED = '#71717a'

/**
 * @param {{ shots: import('../../../lib/sessionEngine').ShotRecord[] }} props
 */
export default function SessionTrendCharts({ shots }) {
  const { t } = useTranslation('timer')

  const series = useMemo(
    () =>
      shots.map((s) => ({
        n: s.shotNumber,
        overall: s.overallScore,
        hold: s.holdScore,
        flinch: s.flinchScore,
        follow: s.followThroughScore,
        trace: s.traceScore,
      })),
    [shots],
  )

  if (series.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-700/80 bg-slate-950/50 px-4 py-8 text-center">
        <p className="font-mono text-sm uppercase tracking-[0.14em] text-zinc-400">
          {t('dryFire.sessionDash.chartsEmpty')}
        </p>
      </div>
    )
  }

  const charts = [
    { key: 'overall', dataKey: 'overall', color: GOLD, title: t('dryFire.sessionDash.trendOverall') },
    { key: 'hold', dataKey: 'hold', color: EMERALD, title: t('dryFire.sessionDash.trendHold') },
    { key: 'flinch', dataKey: 'flinch', color: ROSE, title: t('dryFire.sessionDash.trendFlinch') },
    { key: 'follow', dataKey: 'follow', color: ORANGE, title: t('dryFire.sessionDash.trendFollow') },
    { key: 'trace', dataKey: 'trace', color: SKY, title: t('dryFire.sessionDash.trendTrace') },
  ]

  return (
    <div className="grid w-full min-w-0 grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {charts.map((c) => (
        <ChartZoomFrame key={c.key} title={c.title} bodyClassName="min-h-[9rem]">
          <div className="p-2">
            <ChartSafeFrame height={140} className="w-full">
              <LineChart data={series} margin={{ top: 4, right: 6, left: -18, bottom: 0 }}>
                <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
                <XAxis
                  dataKey="n"
                  tick={{ fill: MUTED, fontSize: 12 }}
                  axisLine={{ stroke: GRID }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: MUTED, fontSize: 12 }}
                  axisLine={{ stroke: GRID }}
                  tickLine={false}
                  width={36}
                />
                <Tooltip
                  contentStyle={{
                    background: '#0a0a0b',
                    border: '1px solid rgba(250,204,21,0.25)',
                    borderRadius: 4,
                    fontSize: 13,
                  }}
                  labelFormatter={(n) => t('dryFire.units.shotIndex', { n })}
                />
                <Line
                  type="monotone"
                  dataKey={c.dataKey}
                  name={c.title}
                  stroke={c.color}
                  strokeWidth={1.75}
                  dot={series.length <= 24}
                  isAnimationActive={false}
                />
              </LineChart>
            </ChartSafeFrame>
          </div>
        </ChartZoomFrame>
      ))}
    </div>
  )
}
