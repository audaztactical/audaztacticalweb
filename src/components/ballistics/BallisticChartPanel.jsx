import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import debounce from 'lodash/debounce'
import {
  isDualClickUnitDisplay,
  parseClickUnitSystem,
} from '../../lib/clickUnitSystem.js'
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

/** @typedef {'drop'|'velocity'|'energy'|'moa'|'mrad'|'mach'} ChartMetricId */

/** @type {Record<ChartMetricId, {
 *   id: ChartMetricId
 *   label: string
 *   shortLabel: string
 *   dataKey: string
 *   unit: string
 *   axisTickColor: string
 *   stroke: string
 *   strokeWidth: number
 *   useGradient?: boolean
 *   activeDot: { r: number, fill: string, stroke: string }
 *   refLineColor: string
 *   cursorColor: string
 * }>} */
export const CHART_METRICS = {
  drop: {
    id: 'drop',
    label: 'Drop (Düşüş, cm)',
    shortLabel: 'Drop',
    dataKey: 'dropCm',
    unit: 'cm',
    axisTickColor: 'rgba(34,197,94,0.85)',
    stroke: 'url(#dropLineGrad)',
    strokeWidth: 2.5,
    useGradient: true,
    activeDot: { r: 5, fill: '#22c55e', stroke: '#052e16' },
    refLineColor: 'rgba(34,197,94,0.55)',
    cursorColor: 'rgba(34,197,94,0.35)',
  },
  velocity: {
    id: 'velocity',
    label: 'Velocity (Kalan Hız, fps)',
    shortLabel: 'Velocity',
    dataKey: 'velocity',
    unit: 'fps',
    axisTickColor: 'rgba(251,191,36,0.85)',
    stroke: '#fbbf24',
    strokeWidth: 2,
    activeDot: { r: 4, fill: '#fbbf24', stroke: '#422006' },
    refLineColor: 'rgba(251,191,36,0.55)',
    cursorColor: 'rgba(251,191,36,0.35)',
  },
  energy: {
    id: 'energy',
    label: 'Energy (Kalan Enerji, ft·lb)',
    shortLabel: 'Energy',
    dataKey: 'energy',
    unit: 'ft·lb',
    axisTickColor: 'rgba(249,115,22,0.85)',
    stroke: '#f97316',
    strokeWidth: 2,
    activeDot: { r: 4, fill: '#f97316', stroke: '#431407' },
    refLineColor: 'rgba(249,115,22,0.55)',
    cursorColor: 'rgba(249,115,22,0.35)',
  },
  moa: {
    id: 'moa',
    label: 'MOA (MOA Düzeltmesi)',
    shortLabel: 'MOA',
    dataKey: 'moa',
    unit: 'MOA',
    axisTickColor: 'rgba(59,130,246,0.85)',
    stroke: '#3b82f6',
    strokeWidth: 2,
    activeDot: { r: 4, fill: '#3b82f6', stroke: '#172554' },
    refLineColor: 'rgba(59,130,246,0.55)',
    cursorColor: 'rgba(59,130,246,0.35)',
  },
  mrad: {
    id: 'mrad',
    label: 'MRAD (MRAD Düzeltmesi)',
    shortLabel: 'MRAD',
    dataKey: 'mrad',
    unit: 'MRAD',
    axisTickColor: 'rgba(168,85,247,0.85)',
    stroke: '#a855f7',
    strokeWidth: 2,
    activeDot: { r: 4, fill: '#a855f7', stroke: '#3b0764' },
    refLineColor: 'rgba(168,85,247,0.55)',
    cursorColor: 'rgba(168,85,247,0.35)',
  },
  mach: {
    id: 'mach',
    label: 'Mach (Mach Sayısı)',
    shortLabel: 'Mach',
    dataKey: 'mach',
    unit: 'Mach',
    axisTickColor: 'rgba(6,182,212,0.85)',
    stroke: '#06b6d4',
    strokeWidth: 2,
    activeDot: { r: 4, fill: '#06b6d4', stroke: '#083344' },
    refLineColor: 'rgba(6,182,212,0.55)',
    cursorColor: 'rgba(6,182,212,0.35)',
  },
}

export const CHART_METRIC_IDS = /** @type {ChartMetricId[]} */ (
  Object.keys(CHART_METRICS)
)

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
 * @param {ChartMetricId} current
 * @param {ChartMetricId} exclude
 */
function pickAlternateMetric(current, exclude) {
  return CHART_METRIC_IDS.find((id) => id !== exclude) ?? current
}

/**
 * @param {{
 *   id: string
 *   label: string
 *   value: ChartMetricId
 *   onChange: (id: ChartMetricId) => void
 *   exclude?: ChartMetricId
 *   metricIds?: ChartMetricId[]
 * }} props
 */
function MetricSelect({ id, label, value, onChange, exclude, metricIds = CHART_METRIC_IDS }) {
  const options = exclude ? metricIds.filter((metricId) => metricId !== exclude) : metricIds

  return (
    <label htmlFor={id} className="flex min-w-[10rem] flex-1 flex-col gap-1 sm:max-w-xs">
      <span className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.18em] text-app-text/45">
        {label}
      </span>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(/** @type {ChartMetricId} */ (e.target.value))}
        className="w-full rounded-md border border-white/15 bg-black/50 px-2 py-2 font-mono-technical text-[10px] text-slate-100 outline-none transition focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
      >
        {options.map((metricId) => (
          <option key={metricId} value={metricId} className="bg-[#0a0a0a] text-slate-100">
            {CHART_METRICS[metricId].label}
          </option>
        ))}
      </select>
    </label>
  )
}

/**
 * @param {{
 *   metricId: ChartMetricId
 *   chartData: object[]
 *   gradientId: string
 *   activeDistance: number
 *   activeResult: import('../../lib/ballisticsEngine.js').BallisticsPointResult | null
 *   onMouseMove: (state: import('recharts/types/chart/types').CategoricalChartState) => void
 *   compact?: boolean
 *   showHeader?: boolean
 *   tooltipContent: import('react').ComponentType<import('recharts').TooltipProps<number, string>>
 * }} props
 */
function MetricChart({
  metricId,
  chartData,
  gradientId,
  activeDistance,
  activeResult,
  onMouseMove,
  compact = false,
  showHeader = false,
  tooltipContent,
}) {
  const metric = CHART_METRICS[metricId]

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-1">
      {showHeader ? (
        <p
          className="font-mono-technical text-[9px] font-bold uppercase tracking-[0.2em]"
          style={{ color: metric.stroke.startsWith('#') ? metric.stroke : '#22c55e' }}
        >
          {metric.shortLabel}
          <span className="ml-1 font-normal text-app-text/45">({metric.unit})</span>
        </p>
      ) : null}
      <div className={compact ? 'h-52 min-h-[12rem] w-full sm:h-56' : 'h-56 min-h-[13rem] w-full sm:h-64'}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 8, right: 12, left: 4, bottom: 4 }}
            onMouseMove={onMouseMove}
          >
            {metric.useGradient ? (
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#22c55e" />
                  <stop offset="50%" stopColor="#eab308" />
                  <stop offset="100%" stopColor="#ef4444" />
                </linearGradient>
              </defs>
            ) : null}
            <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
            <XAxis
              dataKey="distance"
              tick={{ fill: 'rgba(148,163,184,0.8)', fontSize: 10, fontFamily: 'monospace' }}
              unit="m"
            />
            <YAxis
              tick={{ fill: metric.axisTickColor, fontSize: 10, fontFamily: 'monospace' }}
              unit={metric.unit === 'Mach' || metric.unit === 'MOA' || metric.unit === 'MRAD' ? '' : ` ${metric.unit}`}
            />
            <Tooltip content={tooltipContent} cursor={{ stroke: metric.cursorColor }} />
            <ReferenceLine
              x={activeResult?.distance ?? activeDistance}
              stroke={metric.refLineColor}
              strokeDasharray="4 4"
            />
            <Line
              type="monotone"
              dataKey={metric.dataKey}
              stroke={metric.useGradient ? `url(#${gradientId})` : metric.stroke}
              strokeWidth={metric.strokeWidth}
              dot={false}
              activeDot={metric.activeDot}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/**
 * @param {unknown} clickUnitSystem
 * @returns {ChartMetricId[]}
 */
function chartMetricsForUnit(clickUnitSystem) {
  if (parseClickUnitSystem(clickUnitSystem) === 'MOA') {
    return CHART_METRIC_IDS.filter((id) => id !== 'mrad')
  }
  if (parseClickUnitSystem(clickUnitSystem) === 'MRAD') {
    return CHART_METRIC_IDS.filter((id) => id !== 'moa')
  }
  return CHART_METRIC_IDS
}

/**
 * @param {{
 *   results: import('../../lib/ballisticsEngine.js').BallisticsPointResult[]
 *   activeDistance: number
 *   onActiveDistanceChange: (d: number) => void
 *   rangeMin: number
 *   rangeMax: number
 *   clickUnitSystem?: string | null
 * }} props
 */
export default function BallisticChartPanel({
  results,
  activeDistance,
  onActiveDistanceChange,
  rangeMin,
  rangeMax,
  clickUnitSystem = null,
}) {
  const [primaryMetric, setPrimaryMetric] = useState(/** @type {ChartMetricId} */ ('drop'))
  const [compareMode, setCompareMode] = useState(false)
  const [secondaryMetric, setSecondaryMetric] = useState(/** @type {ChartMetricId} */ ('velocity'))

  const availableMetrics = useMemo(
    () => chartMetricsForUnit(clickUnitSystem),
    [clickUnitSystem],
  )

  const dualUnitDisplay = isDualClickUnitDisplay(clickUnitSystem)
  const unit = parseClickUnitSystem(clickUnitSystem)

  const chartData = useMemo(
    () =>
      (results ?? []).map((r) => ({
        distance: r.distance,
        dropCm: Math.abs(r.dropCm),
        velocity: r.velocityRemaining,
        energy: r.energyRemaining,
        moa: r.dropMOA,
        mrad: r.dropMRAD,
        mach: r.machNumber,
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

  useEffect(() => {
    if (compareMode && secondaryMetric === primaryMetric) {
      setSecondaryMetric(pickAlternateMetric(secondaryMetric, primaryMetric))
    }
  }, [compareMode, primaryMetric, secondaryMetric])

  useEffect(() => {
    if (!availableMetrics.includes(primaryMetric)) {
      setPrimaryMetric('drop')
    }
    if (!availableMetrics.includes(secondaryMetric)) {
      setSecondaryMetric(pickAlternateMetric('velocity', primaryMetric))
    }
  }, [availableMetrics, primaryMetric, secondaryMetric])

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

  const handlePrimaryMetricChange = useCallback((metricId) => {
    setPrimaryMetric(metricId)
    setSecondaryMetric((prev) => (prev === metricId ? pickAlternateMetric(prev, metricId) : prev))
  }, [])

  /** @param {import('recharts').TooltipProps<number, string>} props */
  const ChartTooltip = useCallback(
    ({ active, payload }) => {
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
            {dualUnitDisplay || unit === 'MOA' ? (
              <>
                <dt className="text-slate-500">MOA drop</dt>
                <dd>{r.dropMOA.toFixed(2)}</dd>
              </>
            ) : null}
            {dualUnitDisplay || unit === 'MRAD' ? (
              <>
                <dt className="text-slate-500">MRAD drop</dt>
                <dd>{r.dropMRAD.toFixed(2)}</dd>
              </>
            ) : null}
            {dualUnitDisplay || unit === 'MOA' ? (
              r.dropClicksMoa != null ? (
                <>
                  <dt className="text-slate-500">MOA tık</dt>
                  <dd>{r.dropClicksMoa.toFixed(1)}</dd>
                </>
              ) : null
            ) : null}
            {dualUnitDisplay || unit === 'MRAD' ? (
              r.dropClicksMrad != null ? (
                <>
                  <dt className="text-slate-500">MRAD tık</dt>
                  <dd>{r.dropClicksMrad.toFixed(1)}</dd>
                </>
              ) : null
            ) : null}
          </dl>
        </div>
      )
    },
    [dualUnitDisplay, unit],
  )

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
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-white/10 bg-black/30 px-3 py-3">
        <MetricSelect
          id="balistik-metric-primary"
          label="Metrik"
          value={primaryMetric}
          onChange={handlePrimaryMetricChange}
          metricIds={availableMetrics}
        />
        <div className="flex shrink-0 flex-col gap-1">
          <span className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.18em] text-app-text/45">
            Görünüm
          </span>
          <button
            type="button"
            aria-pressed={compareMode}
            onClick={() => setCompareMode((prev) => !prev)}
            className={[
              'rounded-md border px-3 py-2 font-mono-technical text-[10px] font-bold uppercase tracking-[0.16em] transition min-h-[36px]',
              compareMode
                ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300'
                : 'border-white/15 bg-black/40 text-app-text/55 hover:border-white/25 hover:text-app-text/75',
            ].join(' ')}
          >
            Karşılaştır
          </button>
        </div>
        {compareMode ? (
          <MetricSelect
            id="balistik-metric-secondary"
            label="2. Metrik"
            value={secondaryMetric}
            onChange={setSecondaryMetric}
            exclude={primaryMetric}
            metricIds={availableMetrics}
          />
        ) : null}
      </div>

      <div
        id="balistik-chart-export"
        className={
          compareMode
            ? 'grid grid-cols-1 gap-3 md:grid-cols-2'
            : 'w-full'
        }
      >
        <MetricChart
          metricId={primaryMetric}
          chartData={chartData}
          gradientId="dropLineGrad-primary"
          activeDistance={activeDistance}
          activeResult={activeResult}
          onMouseMove={handleChartMouseMove}
          compact={compareMode}
          showHeader={compareMode}
          tooltipContent={ChartTooltip}
        />
        {compareMode ? (
          <MetricChart
            metricId={secondaryMetric}
            chartData={chartData}
            gradientId="dropLineGrad-secondary"
            activeDistance={activeDistance}
            activeResult={activeResult}
            onMouseMove={handleChartMouseMove}
            compact
            showHeader
            tooltipContent={ChartTooltip}
          />
        ) : null}
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
            ...(dualUnitDisplay || unit === 'MOA'
              ? [['MOA', activeResult.dropMOA.toFixed(2)]]
              : []),
            ...(dualUnitDisplay || unit === 'MRAD'
              ? [['MRAD', activeResult.dropMRAD.toFixed(2)]]
              : []),
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
