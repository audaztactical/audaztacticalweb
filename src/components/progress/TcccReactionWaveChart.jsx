import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { buildTcccReactionChartPoints } from '../../lib/tcccSimHudAnalytics'
import { buildTacticalTooltipLines } from '../../lib/progressTacticalTooltip'
import { TacticalTooltipBox } from './TacticalTooltip'

/** @typedef {import('react').ComponentType<{ logRow: Record<string, unknown> | null }>} TcccTooltipContentComponent */

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

const STABLE_TOOLTIP_OFFSET_PX = 25

/**
 * @param {{
 *   coordinate: { x: number; y: number }
 *   viewBox?: { width?: number; height?: number }
 *   stable?: boolean
 * }} args
 */
function getTooltipContentStyle({ coordinate, viewBox, stable = false }) {
  const plotWidth = viewBox?.width ?? 0
  const flipLeft = shouldFlipTooltipLeft(coordinate.x, plotWidth)
  const gap = stable ? STABLE_TOOLTIP_OFFSET_PX : TOOLTIP_GAP_PX
  if (stable) {
    return {
      position: 'relative',
      minWidth: 280,
      width: 'max-content',
      transform: flipLeft ? `translate(calc(-100% - ${gap}px), 0)` : `translate(${gap}px, 0)`,
    }
  }
  return {
    position: 'relative',
    minWidth: 280,
    width: 'max-content',
    transform: flipLeft
      ? `translate(calc(-100% - ${gap}px), -50%)`
      : `translate(${gap}px, -50%)`,
  }
}

/**
 * @typedef {{
 *   id: string
 *   label: string
 *   timestamp: string
 *   efficiency: number
 *   mod?: string
 *   statusLabel?: string
 *   rejectionReason?: string
 *   logRow?: Record<string, unknown>
 * }} TcccChartPoint
 */

/**
 * @param {{
 *   logs: Record<string, unknown>[]
 *   data?: TcccChartPoint[]
 *   variant?: 'compact' | 'expanded'
 *   accent?: 'amber' | 'emerald'
 *   TooltipContent?: TcccTooltipContentComponent | null
 *   stableDebriefTooltip?: boolean
 *   rechartsTooltipProps?: Record<string, unknown>
 * }} props
 */
export default function TcccReactionWaveChart({
  logs,
  data,
  variant = 'compact',
  accent = 'amber',
  TooltipContent = null,
  stableDebriefTooltip = false,
  rechartsTooltipProps = null,
}) {
  const { t } = useTranslation('progress')
  const expanded = variant === 'expanded'
  const emerald = accent === 'emerald'
  const stroke = emerald ? '#34d399' : '#f59e0b'
  const strokeMuted = emerald ? 'rgba(52,211,153,0.25)' : 'rgba(245,158,11,0.25)'
  const gridStroke = emerald ? 'rgba(52,211,153,0.1)' : 'rgba(245,158,11,0.1)'
  const cursorStroke = emerald ? 'rgba(52,211,153,0.35)' : 'rgba(245,158,11,0.35)'
  const gradientId = emerald ? 'tcccStressReactionFill' : 'tcccReactionFill'
  const dotStroke = emerald ? '#065f46' : '#78350f'
  const activeFill = emerald ? '#6ee7b7' : '#fbbf24'
  const captionClass = emerald ? 'text-emerald-700/80' : 'text-amber-700/80'
  const series = useMemo(
    () => (data?.length ? data : buildTcccReactionChartPoints(logs, 8)),
    [logs, data],
  )

  const chartHeight = expanded ? 'min-h-[min(52vh,420px)] h-full' : 'h-52 min-h-[13rem]'

  /** @param {import('recharts').TooltipProps<number, string>} props */
  const TcccSimTooltip = useCallback((props) => {
    const { active, payload, coordinate, viewBox } = props
    if (!active || !payload?.length || !coordinate) return null
    const point = payload[0]?.payload
    if (!point) return null
    const row =
      point.logRow && typeof point.logRow === 'object'
        ? /** @type {Record<string, unknown>} */ (point.logRow)
        : null
    const Tooltip = TooltipContent

    return (
      <div
        className="pointer-events-none w-max"
        style={getTooltipContentStyle({ coordinate, viewBox, stable: stableDebriefTooltip })}
      >
        {Tooltip ? (
          <Tooltip logRow={row} />
        ) : (
          <TacticalTooltipBox lines={buildTacticalTooltipLines(row)} />
        )}
      </div>
    )
  }, [TooltipContent, stableDebriefTooltip])

  if (series.length === 0) {
    return (
      <p className="py-8 text-center font-mono text-[10px] uppercase tracking-wider text-app-text/45">
        {t('charts.tcccWaveEmpty')}
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
          <AreaChart data={series} margin={{ top: 16, right: expanded ? 28 : 16, bottom: 8, left: -4 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={stroke} stopOpacity={0.45} />
                <stop offset="100%" stopColor={stroke} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={gridStroke} vertical={false} />
            <XAxis
              dataKey="timestamp"
              tick={{ fill: '#64748b', fontSize: expanded ? 10 : 8, fontFamily: 'JetBrains Mono, monospace' }}
              axisLine={{ stroke: strokeMuted }}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={expanded ? 28 : 18}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: '#64748b', fontSize: expanded ? 10 : 8, fontFamily: 'JetBrains Mono, monospace' }}
              axisLine={{ stroke: strokeMuted }}
              tickLine={false}
              tickFormatter={(v) => `%${v}`}
              width={expanded ? 44 : 36}
            />
            <Tooltip
              content={TcccSimTooltip}
              cursor={{ stroke: cursorStroke, strokeWidth: 1 }}
              {...(stableDebriefTooltip
                ? {
                    offset: 25,
                    allowEscapeViewBox: { x: false, y: true },
                    position: (coord) => ({
                      x: coord?.x ?? 0,
                      y: 50,
                    }),
                  }
                : null)}
              {...(rechartsTooltipProps ?? {})}
            />
            <Area
              type="monotone"
              dataKey="efficiency"
              stroke={stroke}
              strokeWidth={expanded ? 2.5 : 2}
              fill={`url(#${gradientId})`}
              dot={{
                r: expanded ? 4 : 3,
                fill: stroke,
                stroke: dotStroke,
                strokeWidth: 1,
              }}
              activeDot={{
                r: expanded ? 6 : 5,
                fill: activeFill,
                stroke: '#fffbeb',
                strokeWidth: 1,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className={`mt-2 text-center font-mono text-[8px] uppercase tracking-wider ${captionClass}`}>
        {t('charts.tcccWaveCaption')}
      </p>
    </div>
  )
}
