import { useId, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ReferenceLine,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { buildDryFireGraphSeries } from '../../lib/dryFireHits'
import ChartSafeFrame from './ChartSafeFrame'

const GOLD = '#facc15'
const MUTED = '#71717a'
const GRID = 'rgba(250,204,21,0.10)'
const AXIS = 'rgba(113,113,122,0.85)'
const EMERALD = '#34d399'
const SKY = '#60a5fa'
const ROSE = '#fb7185'
const ECG_GRID = 'rgba(244,63,94,0.12)'

const tipStyle = {
  background: 'rgba(10,10,11,0.96)',
  border: '1px solid rgba(250,204,21,0.4)',
  borderRadius: 2,
  fontSize: 11,
  fontFamily: 'ui-monospace, monospace',
  boxShadow: '0 8px 28px -12px rgba(0,0,0,0.85)',
}

/**
 * @param {{
 *   graphId: import('../../lib/dryFireHits').DryFireGraphId
 *   hits: import('../../lib/dryFireHits').DryFireHit[]
 * }} props
 */
export default function DryFireGraphCharts({ graphId, hits }) {
  const { t } = useTranslation('timer')
  const uid = useId().replace(/:/g, '')
  const series = useMemo(() => buildDryFireGraphSeries(hits), [hits])

  if (!hits.length) {
    return (
      <p className="flex h-full min-h-[8rem] items-center justify-center px-3 text-center font-mono-technical text-[9px] uppercase tracking-[0.2em] text-zinc-500">
        {t('dryFire.analytics.empty')}
      </p>
    )
  }

  const axisProps = {
    stroke: AXIS,
    tick: { fill: MUTED, fontSize: 10, fontFamily: 'ui-monospace, monospace' },
    tickLine: false,
    axisLine: { stroke: 'rgba(250,204,21,0.18)' },
  }

  /* 1 — Flinch: radar */
  if (graphId === 'flinch') {
    return (
      <ChartSafeFrame fill>
        <RadarChart data={series.flinchRadar} margin={{ top: 8, right: 16, bottom: 8, left: 16 }}>
          <PolarGrid stroke={GRID} />
          <PolarAngleAxis
            dataKey="dir"
            tick={{ fill: MUTED, fontSize: 10, fontFamily: 'ui-monospace, monospace' }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fill: MUTED, fontSize: 8 }}
            axisLine={false}
          />
          <Tooltip
            contentStyle={tipStyle}
            formatter={(value, _n, item) => [
              `${value} · n=${item?.payload?.count ?? 0}`,
              t('dryFire.tooltip.flinch'),
            ]}
          />
          <Radar
            name={t('dryFire.tooltip.flinch')}
            dataKey="flinch"
            stroke={GOLD}
            fill={GOLD}
            fillOpacity={0.28}
            strokeWidth={2}
            isAnimationActive
          />
        </RadarChart>
      </ChartSafeFrame>
    )
  }

  /* 2 — Barrel: helix / trace view */
  if (graphId === 'barrel') {
    const pts = series.barrelTrace
    const pathD =
      pts.length === 0
        ? ''
        : pts
            .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
            .join(' ')
    const gradId = `df-helix-${uid}`
    return (
      <div className="flex h-full min-h-0 w-full flex-col">
        <svg
          viewBox="0 0 200 200"
          className="h-full min-h-[8rem] w-full"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden
        >
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={EMERALD} stopOpacity="0.25" />
              <stop offset="45%" stopColor={GOLD} stopOpacity="0.85" />
              <stop offset="100%" stopColor={ROSE} stopOpacity="0.95" />
            </linearGradient>
          </defs>
          <circle cx="100" cy="100" r="78" fill="none" stroke="rgba(250,204,21,0.12)" strokeWidth="0.8" />
          <circle cx="100" cy="100" r="48" fill="none" stroke="rgba(52,211,153,0.15)" strokeWidth="0.6" strokeDasharray="3 4" />
          <line x1="100" y1="22" x2="100" y2="178" stroke="rgba(250,204,21,0.12)" strokeWidth="0.5" />
          <line x1="22" y1="100" x2="178" y2="100" stroke="rgba(250,204,21,0.12)" strokeWidth="0.5" />
          {pathD ? (
            <path
              d={pathD}
              fill="none"
              stroke={`url(#${gradId})`}
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
          {pts.map((p) => (
            <g key={`bt-${p.index}`}>
              <circle cx={p.x} cy={p.y} r="3.2" fill="#0a0a0b" stroke={p.color} strokeWidth="1.4" />
              <text
                x={p.x}
                y={p.y - 5}
                textAnchor="middle"
                fill={MUTED}
                fontSize="5.5"
                fontFamily="ui-monospace, monospace"
              >
                {p.index}
              </text>
            </g>
          ))}
        </svg>
        <p className="shrink-0 px-1 pb-0.5 text-center font-mono-technical text-[7px] uppercase tracking-[0.14em] text-zinc-600">
          {t('dryFire.analytics.graphs.barrelTraceHint')}
        </p>
      </div>
    )
  }

  /* 3 — Jerk: EKG spike */
  if (graphId === 'jerk') {
    return (
      <ChartSafeFrame fill>
        <LineChart data={series.jerkEcg} margin={{ top: 10, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid stroke={ECG_GRID} strokeDasharray="2 6" />
          <XAxis
            type="number"
            dataKey="t"
            hide
            domain={['dataMin', 'dataMax']}
          />
          <YAxis
            {...axisProps}
            width={28}
            domain={['auto', 'auto']}
            tick={{ fill: ROSE, fontSize: 8, fontFamily: 'ui-monospace, monospace' }}
          />
          <Tooltip
            contentStyle={{
              ...tipStyle,
              border: '1px solid rgba(251,113,133,0.45)',
            }}
            labelFormatter={() => t('dryFire.analytics.graphs.jerkMetric')}
            formatter={(v) => [typeof v === 'number' ? v.toFixed(1) : v, 'Δ']}
          />
          <ReferenceLine y={0} stroke="rgba(251,113,133,0.35)" strokeWidth={1} />
          <Line
            type="linear"
            dataKey="v"
            name={t('dryFire.analytics.graphs.jerkMetric')}
            stroke={ROSE}
            strokeWidth={1.75}
            dot={false}
            isAnimationActive
            activeDot={{ r: 3, fill: ROSE }}
          />
        </LineChart>
      </ChartSafeFrame>
    )
  }

  /* 4 — Split: vertical bars */
  if (graphId === 'split') {
    if (!series.split.length) {
      return (
        <p className="flex h-full min-h-[8rem] items-center justify-center px-3 text-center font-mono-technical text-[9px] uppercase tracking-[0.2em] text-zinc-500">
          {t('dryFire.analytics.graphs.needTwo')}
        </p>
      )
    }
    return (
      <ChartSafeFrame fill>
        <BarChart data={series.split} margin={{ top: 10, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="4 6" vertical={false} />
          <XAxis dataKey="name" {...axisProps} tick={{ ...axisProps.tick, fontSize: 8 }} />
          <YAxis {...axisProps} width={36} unit="ms" />
          <Tooltip contentStyle={tipStyle} />
          <Bar
            dataKey="splitMs"
            name={t('dryFire.analytics.graphs.splitMetric')}
            radius={[3, 3, 0, 0]}
            isAnimationActive
          >
            {series.split.map((row, i) => (
              <Cell
                key={`sp-${row.name}`}
                fill={i % 2 === 0 ? SKY : 'rgba(96,165,250,0.55)'}
              />
            ))}
          </Bar>
        </BarChart>
      </ChartSafeFrame>
    )
  }

  /* 5 — Axial: scatter / grouping cluster */
  if (graphId === 'axial') {
    return (
      <ChartSafeFrame fill>
        <ScatterChart margin={{ top: 10, right: 10, left: 0, bottom: 4 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="3 5" />
          <XAxis
            type="number"
            dataKey="x"
            name="X"
            domain={[-1, 1]}
            {...axisProps}
          />
          <YAxis
            type="number"
            dataKey="y"
            name="Y"
            domain={[-1, 1]}
            {...axisProps}
            width={34}
          />
          <ReferenceLine x={0} stroke="rgba(250,204,21,0.28)" strokeDasharray="4 4" />
          <ReferenceLine y={0} stroke="rgba(250,204,21,0.28)" strokeDasharray="4 4" />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            contentStyle={tipStyle}
            formatter={(value, name) => [
              typeof value === 'number' ? value.toFixed(3) : value,
              String(name).toUpperCase(),
            ]}
          />
          <Scatter data={series.axial} fill={GOLD}>
            {series.axial.map((p) => (
              <Cell key={`ax-${p.index}`} fill={p.fill} />
            ))}
          </Scatter>
        </ScatterChart>
      </ChartSafeFrame>
    )
  }

  /* 6 — Shot vectors: list / vector cards */
  if (graphId === 'shotVectors') {
    if (!series.shotVectors.length) {
      return (
        <p className="flex h-full min-h-[8rem] items-center justify-center px-3 text-center font-mono-technical text-[9px] uppercase tracking-[0.2em] text-zinc-500">
          {t('dryFire.analytics.graphs.needTwo')}
        </p>
      )
    }
    return (
      <ul className="flex h-full min-h-0 flex-col gap-1.5 overflow-y-auto overscroll-contain px-0.5 py-0.5">
        {series.shotVectors.map((row) => (
          <li
            key={row.name}
            className="shrink-0 rounded-sm border border-[#facc15]/22 bg-[#0a0a0b]/90 px-2.5 py-2"
          >
            <div className="flex items-center gap-2">
              <svg width="36" height="16" viewBox="0 0 36 16" className="shrink-0" aria-hidden>
                <circle cx="4" cy="8" r="3" fill={row.fromColor || GOLD} />
                <line
                  x1="8"
                  y1="8"
                  x2="28"
                  y2="8"
                  stroke="rgba(250,204,21,0.55)"
                  strokeWidth="1.25"
                  strokeDasharray="2 2"
                />
                <polygon points="28,4 34,8 28,12" fill="rgba(250,204,21,0.9)" />
                <circle cx="32" cy="8" r="2.2" fill={row.toColor || SKY} opacity="0.9" />
              </svg>
              <p className="min-w-0 flex-1 truncate font-mono-technical text-[9px] font-bold uppercase tracking-[0.14em] text-[#facc15]">
                #{row.fromIndex} → #{row.toIndex}
              </p>
            </div>
            <dl className="mt-1.5 grid grid-cols-2 gap-x-2 gap-y-0.5 font-mono-technical text-[8px]">
              <div className="flex justify-between gap-1">
                <dt className="uppercase tracking-[0.1em] text-zinc-500">
                  {t('dryFire.analytics.graphs.distanceMetric')}
                </dt>
                <dd className="tabular-nums text-zinc-200">{row.distance.toFixed(3)}</dd>
              </div>
              <div className="flex justify-between gap-1">
                <dt className="uppercase tracking-[0.1em] text-zinc-500">
                  {t('dryFire.analytics.graphs.splitMetric')}
                </dt>
                <dd className="tabular-nums text-sky-300">{row.splitMs} ms</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    )
  }

  return null
}
