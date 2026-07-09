import { useCallback, useMemo } from 'react'
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
import { TacticalTooltipBox } from './TacticalTooltip'

const TAG_FILL = {
  ATIS: '#38bdf8',
  CQB: '#f59e0b',
  TCCC: '#fb7185',
  FOF: '#a78bfa',
  VBSS: '#60a5fa',
  OTHER: '#94a3b8',
}

const TOOLTIP_GAP_PX = 12
const TOOLTIP_FLIP_RATIO = 0.75

/**
 * @param {number} coordinateX
 * @param {number | undefined} plotWidth
 */
function shouldFlipTooltipLeft(coordinateX, plotWidth) {
  if (!plotWidth || plotWidth <= 0) return false
  return coordinateX > plotWidth * TOOLTIP_FLIP_RATIO
}

/**
 * @param {{
 *   coordinate: { x: number; y: number }
 *   viewBox?: { width?: number; height?: number; x?: number; y?: number }
 * }} args
 */
function getTooltipContentStyle({ coordinate, viewBox }) {
  const plotWidth = viewBox?.width ?? 0
  const flipLeft = shouldFlipTooltipLeft(coordinate.x, plotWidth)

  return {
    position: 'relative',
    minWidth: 280,
    width: 'max-content',
    transform: flipLeft
      ? `translate(calc(-100% - ${TOOLTIP_GAP_PX}px), -50%)`
      : `translate(${TOOLTIP_GAP_PX}px, -50%)`,
  }
}

/**
 * @param {{
 *   series: { id: string; label: string; value: number; tag: string; logRow?: Record<string, unknown> | null }[]
 *   barsAnimate: boolean
 *   variant?: 'compact' | 'expanded'
 * }} props
 */
export default function PerformanceTrendChart({ series, barsAnimate, variant = 'compact' }) {
  const { t } = useTranslation('progress')
  const expanded = variant === 'expanded'

  const chartData = useMemo(
    () =>
      series.map((bar) => ({
        ...bar,
        displayValue: barsAnimate ? bar.value : 0,
      })),
    [series, barsAnimate]
  )

  const chartHeight = expanded ? 'min-h-[min(52vh,420px)] h-full' : 'h-52 min-h-[13rem]'

  /** @param {import('recharts').TooltipProps<number, string>} props */
  const TacticalBarTooltip = useCallback((props) => {
    const { active, payload, coordinate, viewBox } = props
    if (!active || !payload?.length || !coordinate) return null

    const row = payload[0]?.payload?.logRow
    const lines = buildTacticalTooltipLines(
      row && typeof row === 'object' ? /** @type {Record<string, unknown>} */ (row) : null
    )

    return (
      <div className="pointer-events-none w-max" style={getTooltipContentStyle({ coordinate, viewBox })}>
        <TacticalTooltipBox lines={lines} />
      </div>
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
    <div className={`relative w-full min-w-0 overflow-visible ${chartHeight}`}>
      <div className="absolute inset-0 h-full w-full min-h-0 min-w-0 overflow-visible">
        <ResponsiveContainer
          width="100%"
          height="100%"
          minWidth={0}
          minHeight={expanded ? 280 : 208}
          debounce={50}
          initialDimension={{ width: expanded ? 720 : 400, height: expanded ? 320 : 208 }}
        >
          <BarChart
            data={chartData}
            margin={{ top: 16, right: expanded ? 28 : 20, bottom: 8, left: -8 }}
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
              useTranslate3d
              cursor={{ fill: 'rgba(52,211,153,0.08)' }}
              content={TacticalBarTooltip}
              allowEscapeViewBox={{ x: false, y: true }}
              wrapperStyle={{
                pointerEvents: 'none',
                zIndex: 40,
                outline: 'none',
                overflow: 'visible',
              }}
              contentStyle={{
                background: 'transparent',
                border: 'none',
                boxShadow: 'none',
                padding: 0,
                margin: 0,
                overflow: 'visible',
              }}
              itemStyle={{ display: 'none' }}
              labelStyle={{ display: 'none' }}
            />
            <Bar dataKey="displayValue" radius={[3, 3, 0, 0]} maxBarSize={expanded ? 56 : 36}>
              {chartData.map((entry) => (
                <Cell
                  key={entry.id}
                  fill={TAG_FILL[/** @type {keyof typeof TAG_FILL} */ (entry.tag)] ?? TAG_FILL.OTHER}
                  fillOpacity={0.92}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
