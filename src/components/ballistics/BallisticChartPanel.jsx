import { useCallback, useEffect, useMemo, useRef } from 'react'
import debounce from 'lodash/debounce'
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

/**
 * @param {import('../../lib/ballisticsEngine.js').BallisticsPointResult[]} results
 * @param {number} distanceM
 */
export function pickNearestResult(results, distanceM) {
  if (!results?.length) return null
  return results.reduce((best, r) =>
    Math.abs(r.distance - distanceM) < Math.abs(best.distance - distanceM) ? r : best,
  )
}

/**
 * @param {{
 *   results: import('../../lib/ballisticsEngine.js').BallisticsPointResult[]
 *   activeDistance: number
 *   onActiveDistanceChange: (d: number) => void
 *   rangeMin: number
 *   rangeMax: number
 * }} props
 */
export default function BallisticChartPanel({
  results,
  activeDistance,
  onActiveDistanceChange,
  rangeMin,
  rangeMax,
}) {
  const chartData = useMemo(
    () =>
      (results ?? []).map((r) => ({
        distance: r.distance,
        dropCm: Math.abs(r.dropCm),
        velocity: r.velocityRemaining,
        raw: r,
      })),
    [results],
  )

  const activeResult = useMemo(
    () => pickNearestResult(results, activeDistance),
    [results, activeDistance],
  )

  const onActiveDistanceChangeRef = useRef(onActiveDistanceChange)
  onActiveDistanceChangeRef.current = onActiveDistanceChange

  const debouncedHoverDistance = useMemo(
    () =>
      debounce((distance) => {
        onActiveDistanceChangeRef.current(distance)
      }, 65),
    [],
  )

  useEffect(() => () => debouncedHoverDistance.cancel(), [debouncedHoverDistance])

  const handleChartMouseMove = useCallback(
    (state) => {
      const label = state?.activeLabel
      if (label != null && label !== '') {
        debouncedHoverDistance(Number(label))
      }
    },
    [debouncedHoverDistance],
  )

  const handleSliderChange = useCallback(
    (e) => {
      debouncedHoverDistance.cancel()
      onActiveDistanceChange(Number(e.target.value))
    },
    [debouncedHoverDistance, onActiveDistanceChange],
  )

  /** @param {import('recharts').TooltipProps<number, string>} props */
  const ChartTooltip = useCallback(({ active, payload }) => {
    if (!active || !payload?.length) return null
    const row = payload[0]?.payload
    if (!row?.raw) return null
    const r = row.raw
    return (
      <div className="pointer-events-none w-[min(18rem,calc(100vw-2rem))] rounded border border-emerald-500/40 bg-black/95 px-3 py-2 shadow-xl">
        <p className="font-mono-technical text-[10px] font-bold uppercase tracking-wider text-emerald-400">
          {r.distance} m
        </p>
        <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 font-mono-technical text-[10px] text-slate-300">
          <dt className="text-slate-500">Drop</dt>
          <dd>{Math.abs(r.dropCm).toFixed(1)} cm</dd>
          <dt className="text-slate-500">Windage</dt>
          <dd>{Math.abs(r.windageCm).toFixed(1)} cm</dd>
          <dt className="text-slate-500">TOF</dt>
          <dd>{r.timeOfFlightSeconds.toFixed(3)} s</dd>
          <dt className="text-slate-500">Hız</dt>
          <dd>{r.velocityRemaining.toFixed(0)} fps</dd>
          <dt className="text-slate-500">Enerji</dt>
          <dd>{r.energyRemaining.toFixed(0)} ft·lb</dd>
          <dt className="text-slate-500">MOA drop</dt>
          <dd>{r.dropMOA.toFixed(2)}</dd>
          <dt className="text-slate-500">MRAD drop</dt>
          <dd>{r.dropMRAD.toFixed(2)}</dd>
          {r.dropClicksMoa != null ? (
            <>
              <dt className="text-slate-500">MOA tık</dt>
              <dd>{r.dropClicksMoa.toFixed(1)}</dd>
            </>
          ) : null}
          {r.dropClicksMrad != null ? (
            <>
              <dt className="text-slate-500">MRAD tık</dt>
              <dd>{r.dropClicksMrad.toFixed(1)}</dd>
            </>
          ) : null}
        </dl>
      </div>
    )
  }, [])

  if (!chartData.length) {
    return (
      <p className="py-12 text-center font-mono-technical text-[10px] uppercase tracking-wider text-app-text/45">
        HESAPLAMA BEKLİYOR
      </p>
    )
  }

  const sliderStep = Math.max(1, Math.round((rangeMax - rangeMin) / 100))

  return (
    <div className="space-y-3">
      <div id="balistik-chart-export" className="h-64 min-h-[14rem] w-full sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 8, right: 12, left: 4, bottom: 4 }}
            onMouseMove={handleChartMouseMove}
          >
            <defs>
              <linearGradient id="dropLineGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#22c55e" />
                <stop offset="50%" stopColor="#eab308" />
                <stop offset="100%" stopColor="#ef4444" />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
            <XAxis
              dataKey="distance"
              tick={{ fill: 'rgba(148,163,184,0.8)', fontSize: 10, fontFamily: 'monospace' }}
              unit="m"
            />
            <YAxis
              yAxisId="drop"
              tick={{ fill: 'rgba(34,197,94,0.85)', fontSize: 10, fontFamily: 'monospace' }}
            />
            <YAxis
              yAxisId="vel"
              orientation="right"
              tick={{ fill: 'rgba(251,191,36,0.85)', fontSize: 10, fontFamily: 'monospace' }}
            />
            <Tooltip content={ChartTooltip} cursor={{ stroke: 'rgba(34,197,94,0.35)' }} />
            <ReferenceLine
              x={activeResult?.distance ?? activeDistance}
              stroke="rgba(34,197,94,0.55)"
              strokeDasharray="4 4"
            />
            <Line
              yAxisId="drop"
              type="monotone"
              dataKey="dropCm"
              stroke="url(#dropLineGrad)"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, fill: '#22c55e', stroke: '#052e16' }}
            />
            <Line
              yAxisId="vel"
              type="monotone"
              dataKey="velocity"
              stroke="#fbbf24"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#fbbf24', stroke: '#422006' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-lg border border-white/10 bg-black/40 px-3 py-2">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="font-mono-technical text-[9px] font-bold uppercase tracking-[0.2em] text-emerald-500/80">
            Mesafe seçici
          </span>
          <span className="font-mono-technical text-sm tabular-nums text-emerald-400">
            {Math.round(activeDistance)} m
          </span>
        </div>
        <input
          type="range"
          min={rangeMin}
          max={rangeMax}
          step={sliderStep}
          value={Math.min(rangeMax, Math.max(rangeMin, activeDistance))}
          onChange={handleSliderChange}
          className="h-2 w-full cursor-pointer accent-emerald-500"
          aria-label="Aktif mesafe"
        />
      </div>

      {activeResult ? (
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/[0.04] p-3 sm:grid-cols-4">
          {[
            ['Drop', `${Math.abs(activeResult.dropCm).toFixed(1)} cm`],
            ['Wind', `${Math.abs(activeResult.windageCm).toFixed(1)} cm`],
            ['TOF', `${activeResult.timeOfFlightSeconds.toFixed(3)} s`],
            ['Hız', `${activeResult.velocityRemaining.toFixed(0)} fps`],
            ['Enerji', `${activeResult.energyRemaining.toFixed(0)} ft·lb`],
            ['MOA', activeResult.dropMOA.toFixed(2)],
            ['MRAD', activeResult.dropMRAD.toFixed(2)],
            ['Mach', activeResult.machNumber.toFixed(3)],
          ].map(([k, v]) => (
            <div key={k}>
              <p className="font-mono-technical text-[8px] uppercase tracking-wider text-app-text/45">{k}</p>
              <p className="font-mono-technical text-xs tabular-nums text-slate-100">{v}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
