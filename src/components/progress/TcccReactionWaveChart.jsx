import { useCallback, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
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
import {
  clampTooltipToViewport,
  rechartsCoordinateToViewport,
  TacticalTooltipBox,
} from './TacticalTooltip'

/** @typedef {import('react').ComponentType<{ logRow: Record<string, unknown> | null }>} TcccTooltipContentComponent */

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
 *   logs?: Record<string, unknown>[]
 *   data?: TcccChartPoint[]
 *   variant?: 'compact' | 'expanded'
 *   emerald?: boolean
 *   TooltipContent?: TcccTooltipContentComponent | null
 *   stableDebriefTooltip?: boolean
 *   rechartsTooltipProps?: Record<string, unknown>
 * }} props
 */
export default function TcccReactionWaveChart({
  logs = [],
  data,
  variant = 'compact',
  emerald = false,
  TooltipContent = null,
  stableDebriefTooltip = false,
  rechartsTooltipProps = null,
}) {
  const { t } = useTranslation('progress')
  const chartRef = useRef(/** @type {HTMLDivElement | null} */ (null))
  const expanded = variant === 'expanded'
  const stroke = emerald ? '#34d399' : '#fbbf24'
  const strokeMuted = emerald ? 'rgba(52,211,153,0.25)' : 'rgba(251,191,36,0.25)'
  const gridStroke = emerald ? 'rgba(52,211,153,0.08)' : 'rgba(251,191,36,0.08)'
  const cursorStroke = emerald ? 'rgba(52,211,153,0.35)' : 'rgba(245,158,11,0.35)'
  const gradientId = emerald ? 'tcccStressReactionFill' : 'tcccReactionFill'
  const series = useMemo(
    () => (data?.length ? data : buildTcccReactionChartPoints(logs, 8)),
    [logs, data],
  )

  const chartHeight = expanded ? 'min-h-[min(48vh,380px)] h-full' : 'h-48 min-h-[12rem] sm:h-52 sm:min-h-[13rem]'

  /** @param {import('recharts').TooltipProps<number, string>} props */
  const TcccSimTooltip = useCallback(
    (props) => {
      const { active, payload, coordinate } = props
      if (!active || !payload?.length || !coordinate) return null
      const point = payload[0]?.payload
      if (!point) return null
      const row =
        point.logRow && typeof point.logRow === 'object'
          ? /** @type {Record<string, unknown>} */ (point.logRow)
          : null
      const TooltipBody = TooltipContent
      const anchor = rechartsCoordinateToViewport(coordinate, chartRef.current)
      const approxW = Math.min(352, typeof window !== 'undefined' ? window.innerWidth - 24 : 352)
      const approxH = stableDebriefTooltip ? 220 : 160
      const { left, top, maxWidth } = clampTooltipToViewport(anchor.x, anchor.y, approxW, approxH)

      return createPortal(
        <div
          className="pointer-events-none z-[230]"
          style={{ position: 'fixed', left, top, maxWidth, width: 'max-content' }}
        >
          {TooltipBody ? (
            <TooltipBody logRow={row} />
          ) : (
            <TacticalTooltipBox lines={buildTacticalTooltipLines(row)} />
          )}
        </div>,
        document.body,
      )
    },
    [TooltipContent, stableDebriefTooltip],
  )

  if (series.length === 0) {
    return (
      <p className="py-8 text-center font-mono text-[10px] uppercase tracking-wider text-app-text/45">
        {t('charts.tcccWaveEmpty')}
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
          <AreaChart data={series} margin={{ top: 12, right: expanded ? 20 : 12, bottom: 4, left: -8 }}>
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
              width={expanded ? 40 : 32}
            />
            <Tooltip
              content={TcccSimTooltip}
              cursor={{ stroke: cursorStroke, strokeWidth: 1 }}
              wrapperStyle={{ outline: 'none', visibility: 'hidden' }}
              {...(rechartsTooltipProps ?? {})}
            />
            <Area
              type="monotone"
              dataKey="efficiency"
              stroke={stroke}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              dot={{ r: expanded ? 4 : 3, strokeWidth: 1, stroke: '#0f172a', fill: stroke }}
              activeDot={{ r: expanded ? 6 : 5, fill: stroke }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p
        className={`mt-1 text-center font-mono text-[8px] uppercase tracking-wider ${
          emerald ? 'text-emerald-700/80' : 'text-amber-700/80'
        }`}
      >
        {t('charts.tcccWaveCaption')}
      </p>
    </div>
  )
}
