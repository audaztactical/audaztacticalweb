import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CartesianGrid,
  Line,
  LineChart,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts'
import {
  buildMpuScatterSeries,
  buildSplitTrendSeries,
} from '../../lib/standardShotSessionStore'
import { formatShotSeconds } from '../../lib/standardShotTimer'
import ChartSafeFrame from './ChartSafeFrame'

const GOLD = '#facc15'
const GRID = 'rgba(250,204,21,0.12)'
const MUTED = '#71717a'

/**
 * @param {{
 *   shotTimesMs: number[]
 *   mpuSamples?: import('../../lib/standardShotSessionStore').MpuSamplePoint[]
 *   compact?: boolean
 * }} props
 */
export default function StandardShotAnalytics({ shotTimesMs, mpuSamples = [], compact = false }) {
  const { t } = useTranslation('timer')
  const shotCount = shotTimesMs.length
  const [selected, setSelected] = useState(/** @type {number[]} */ ([]))

  const allIndices = useMemo(
    () => Array.from({ length: shotCount }, (_, i) => i + 1),
    [shotCount],
  )

  const activeSelection = selected.length > 0 ? selected : allIndices

  const trend = useMemo(
    () => buildSplitTrendSeries(shotTimesMs, activeSelection),
    [shotTimesMs, activeSelection],
  )
  const scatter = useMemo(() => buildMpuScatterSeries(mpuSamples), [mpuSamples])

  const toggleShot = (n) => {
    setSelected((prev) => {
      if (prev.length === 0) {
        return allIndices.filter((x) => x !== n)
      }
      if (prev.includes(n)) {
        const next = prev.filter((x) => x !== n)
        return next.length === 0 ? [] : next
      }
      return [...prev, n].sort((a, b) => a - b)
    })
  }

  const selectRange = (from, to) => {
    const lo = Math.min(from, to)
    const hi = Math.max(from, to)
    setSelected(allIndices.filter((n) => n >= lo && n <= hi))
  }

  const chartH = compact ? 160 : 200

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <div className="min-w-0 rounded-sm border border-zinc-600/55 bg-[#0a0a0b]/90 p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.28em] text-[#facc15]/80">
            {t('standardShot.analytics.multiSelect')}
          </p>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setSelected([])}
              className="rounded-sm border border-zinc-600/50 px-2 py-1 font-mono-technical text-[7px] uppercase tracking-[0.16em] text-zinc-400 hover:border-[#facc15]/40 hover:text-[#facc15]"
            >
              {t('standardShot.analytics.allShots')}
            </button>
            {shotCount >= 5 ? (
              <button
                type="button"
                onClick={() => selectRange(2, Math.min(5, shotCount))}
                className="rounded-sm border border-zinc-600/50 px-2 py-1 font-mono-technical text-[7px] uppercase tracking-[0.16em] text-zinc-400 hover:border-[#facc15]/40 hover:text-[#facc15]"
              >
                {t('standardShot.analytics.range25')}
              </button>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {allIndices.map((n) => {
            const on = activeSelection.includes(n)
            return (
              <button
                key={n}
                type="button"
                onClick={() => toggleShot(n)}
                aria-pressed={on}
                className={[
                  'min-h-9 min-w-9 rounded-sm border px-2 py-1.5 font-mono-technical text-[10px] font-bold tabular-nums transition',
                  on
                    ? 'border-[#facc15]/60 bg-[rgba(250,204,21,0.14)] text-[#facc15]'
                    : 'border-zinc-700/60 bg-zinc-900/40 text-zinc-500',
                ].join(' ')}
              >
                {n === 1 ? 'R' : n}
              </button>
            )
          })}
        </div>
      </div>

      <div className="min-w-0 rounded-sm border border-zinc-600/55 bg-[#0a0a0b]/90 p-3">
        <p className="mb-2 font-mono-technical text-[8px] font-bold uppercase tracking-[0.28em] text-[#facc15]/80">
          {t('standardShot.analytics.splitTrend')}
        </p>
        <ChartSafeFrame height={chartH}>
          <LineChart data={trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
            <XAxis dataKey="name" stroke={MUTED} tick={{ fill: MUTED, fontSize: 10 }} />
            <YAxis
              stroke={MUTED}
              tick={{ fill: MUTED, fontSize: 10 }}
              tickFormatter={(v) => Number(v).toFixed(2)}
              width={40}
            />
            <Tooltip
              contentStyle={{
                background: '#0a0a0b',
                border: '1px solid rgba(250,204,21,0.35)',
                borderRadius: 2,
                fontSize: 11,
              }}
              labelStyle={{ color: GOLD }}
              formatter={(value) => [`${formatShotSeconds(Number(value) * 1000)} s`, t('standardShot.analytics.sec')]}
            />
            <Line
              type="monotone"
              dataKey="sec"
              stroke={GOLD}
              strokeWidth={2}
              dot={{ r: 3, fill: GOLD }}
              isAnimationActive
              animationDuration={700}
            />
          </LineChart>
        </ChartSafeFrame>
      </div>

      {scatter.length > 0 ? (
        <div className="min-w-0 rounded-sm border border-zinc-600/55 bg-[#0a0a0b]/90 p-3">
          <p className="mb-2 font-mono-technical text-[8px] font-bold uppercase tracking-[0.28em] text-[#facc15]/80">
            {t('standardShot.analytics.mpuScatter')}
          </p>
          <ChartSafeFrame height={chartH}>
            <ScatterChart margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
              <XAxis
                type="number"
                dataKey="x"
                name="X"
                stroke={MUTED}
                tick={{ fill: MUTED, fontSize: 10 }}
                domain={[-1.2, 1.2]}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="Y"
                stroke={MUTED}
                tick={{ fill: MUTED, fontSize: 10 }}
                domain={[-1.2, 1.2]}
                width={40}
              />
              <ZAxis type="number" dataKey="magnitude" range={[40, 160]} />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                contentStyle={{
                  background: '#0a0a0b',
                  border: '1px solid rgba(250,204,21,0.35)',
                  borderRadius: 2,
                  fontSize: 11,
                }}
              />
              <Scatter
                data={scatter}
                fill={GOLD}
                fillOpacity={0.75}
                isAnimationActive
                animationDuration={800}
              />
            </ScatterChart>
          </ChartSafeFrame>
        </div>
      ) : null}
    </div>
  )
}
