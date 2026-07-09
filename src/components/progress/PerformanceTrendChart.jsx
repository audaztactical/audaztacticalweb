import { useCallback, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { buildTacticalTooltipLines } from '../../lib/progressTacticalTooltip'
import {
  clampTooltipToViewport,
  rechartsCoordinateToViewport,
  TacticalTooltipBox,
} from './TacticalTooltip'

const TAG_FILL = {
  ATIS: '#38bdf8',
  CQB: '#f59e0b',
  TCCC: '#fb7185',
  FOF: '#a78bfa',
  VBSS: '#60a5fa',
  OTHER: '#94a3b8',
}

/**
 * @param {{
 *   series: { id: string; label: string; value: number; tag: string; logRow?: Record<string, unknown> | null }[]
 *   barsAnimate?: boolean
 *   variant?: 'compact' | 'expanded'
 * }} props
 */
export default function PerformanceTrendChart({ series, barsAnimate = true, variant = 'compact' }) {
  const { t } = useTranslation('progress')
  const chartRef = useRef(/** @type {HTMLDivElement | null} */ (null))
  const expanded = variant === 'expanded'

  const chartData = useMemo(
    () =>
      series.map((bar) => ({
        ...bar,
        displayValue: barsAnimate ? bar.value : 0,
      })),
    [series, barsAnimate],
  )

  const chartHeight = expanded ? 'min-h-[min(48vh,380px)] h-full' : 'h-48 min-h-[12rem] sm:h-52 sm:min-h-[13rem]'

  /** @param {import('recharts').TooltipProps<number, string>} props */
  const TacticalBarTooltip = useCallback((props) => {
    const { active, payload, coordinate } = props
    if (!active || !payload?.length || !coordinate) return null

    const row = payload[0]?.payload?.logRow
    const lines = buildTacticalTooltipLines(
      row && typeof row === 'object' ? /** @type {Record<string, unknown>} */ (row) : null,
    )
    const anchor = rechartsCoordinateToViewport(coordinate, chartRef.current)
    const approxW = Math.min(352, typeof window !== 'undefined' ? window.innerWidth - 24 : 352)
    const { left, top, maxWidth } = clampTooltipToViewport(anchor.x, anchor.y, approxW, 180)

    return createPortal(
      <div
        className="pointer-events-none z-[230]"
        style={{ position: 'fixed', left, top, maxWidth, width: 'max-content' }}
      >
        <TacticalTooltipBox lines={lines} />
      </div>,
      document.body,
    )
  }, [])

  if (series.length === 0) {
    return (
      <p className="py-8 text-center font-mono text-[10px] uppercase tracking-wider text-app-text/45">
        {t('trend.empty')}
      </p>
    )
  }

  return (
    <div className={`relative w-full min-w-0 ${chartHeight}`}>
      <div ref={chartRef} className="absolute inset-0 h-full w-full min-h-0 min-w-0">
        <ResponsiveContainer
          width="100%"
          height="100%"
          minWidth={0}
          minHeight={expanded ? 260 : 192}
          debounce={50}
        >
          <BarChart
            data={chartData}
            margin={{ top: 12, right: expanded ? 20 : 12, bottom: 4, left: -8 }}
          >
            <CartesianGrid stroke="rgba(52,211,153,0.08)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: '#64748b', fontSize: expanded ? 10 : 8, fontFamily: 'JetBrains Mono, monospace' }}
              stroke="rgba(52,211,153,0.15)"
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              width={28}
              tick={{ fill: '#475569', fontSize: 9, fontFamily: 'JetBrains Mono, monospace' }}
              stroke="rgba(255,255,255,0.06)"
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              cursor={{ fill: 'rgba(52,211,153,0.08)' }}
              content={TacticalBarTooltip}
              wrapperStyle={{ outline: 'none', visibility: 'hidden' }}
            />
            <Bar dataKey="displayValue" radius={[2, 2, 0, 0]} isAnimationActive={false}>
              {chartData.map((entry) => (
                <Cell
                  key={entry.id}
                  fill={TAG_FILL[/** @type {keyof typeof TAG_FILL} */ (entry.tag)] ?? TAG_FILL.OTHER}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
