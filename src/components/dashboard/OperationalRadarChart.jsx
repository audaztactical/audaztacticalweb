import { useEffect, useId, useMemo, useRef, useState } from 'react'
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { useTheme } from '../../contexts/ThemeContext'
import { getAccentColor } from '../../lib/themeColors'

const CHART_MAX = 100
const MIN_DISPLAY_VALUE = 8
const NEON_FALLBACK = '#00ff88'

/**
 * Sıfır değerler merkeze çökmesin; tooltip gerçek skoru gösterir.
 * @param {number} raw
 */
function toDisplayValue(raw) {
  const n = Math.round(Math.max(0, Math.min(CHART_MAX, raw)))
  if (n === 0) return MIN_DISPLAY_VALUE
  return Math.max(n, MIN_DISPLAY_VALUE * 0.65)
}

/**
 * @param {{ x: number, y: number, payload: { value: string }; cx: number; cy: number }} props
 */
function HudAxisTick({ x, y, payload, cx, cy }) {
  const label = payload?.value ?? ''
  const dx = x - cx
  const dy = y - cy
  const dist = Math.hypot(dx, dy) || 1
  const pad = 10
  const tx = x + (dx / dist) * pad
  const ty = y + (dy / dist) * pad
  const anchor = Math.abs(dx) < 8 ? 'middle' : dx > 0 ? 'start' : 'end'

  return (
    <text
      x={tx}
      y={ty}
      textAnchor={anchor}
      dominantBaseline="central"
      fill="rgba(148, 163, 184, 0.88)"
      fontSize={10}
      fontWeight={600}
      fontFamily="'JetBrains Mono', 'Roboto Mono', monospace"
      letterSpacing="0.12em"
      style={{ textTransform: 'uppercase' }}
    >
      {label}
    </text>
  )
}

/**
 * @param {import('recharts').TooltipProps<number, string> & { accent: string }} props
 */
function HudRadarTooltip({ active, payload, accent }) {
  if (!active || !payload?.length) return null

  const row = payload[0]?.payload
  if (!row) return null

  const raw = row.rawValue ?? 0
  const pct = Math.round((raw / CHART_MAX) * 100)

  return (
    <div className="cmd-radar-tooltip" role="status">
      <p className="cmd-radar-tooltip__kicker">Kapasite metriği</p>
      <p className="cmd-radar-tooltip__label">{row.subject}</p>
      <p className="cmd-radar-tooltip__value" style={{ color: accent }}>
        {raw}
        <span className="cmd-radar-tooltip__unit"> / {CHART_MAX}</span>
      </p>
      <div className="cmd-radar-tooltip__bar" aria-hidden>
        <span className="cmd-radar-tooltip__bar-fill" style={{ width: `${pct}%`, background: accent }} />
      </div>
    </div>
  )
}

/**
 * @param {{ data: { axis: string; value: number; fullMark: number }[]; loading?: boolean }} props
 */
export default function OperationalRadarChart({ data, loading }) {
  const gid = useId().replace(/:/g, '')
  const { themeClass } = useTheme()
  const accent = useMemo(() => getAccentColor(NEON_FALLBACK), [themeClass])

  const chartData = useMemo(
    () =>
      data.map((row) => {
        const rawValue = Math.round(Math.max(0, Math.min(CHART_MAX, row.value)))
        return {
          subject: row.axis,
          rawValue,
          value: toDisplayValue(rawValue),
          fullMark: CHART_MAX,
        }
      }),
    [data],
  )

  const valueKey = useMemo(() => chartData.map((r) => r.rawValue).join('|'), [chartData])
  const prevKeyRef = useRef(/** @type {string | null} */ (null))
  const [animateRadar, setAnimateRadar] = useState(true)

  useEffect(() => {
    if (prevKeyRef.current === valueKey) return undefined
    prevKeyRef.current = valueKey
    setAnimateRadar(true)
    const t = window.setTimeout(() => setAnimateRadar(false), 1100)
    return () => window.clearTimeout(t)
  }, [valueKey])

  const hasSignal = chartData.some((row) => row.rawValue > 0)

  return (
    <div className="cmd-radar relative flex h-full min-h-[300px] flex-col">
      <div className="mb-3 shrink-0">
        <p className="cmd-panel__title">Kapasite radarı</p>
        <p className="cmd-panel__subtitle">Personel · lojistik · ekipman karşılaştırması</p>
      </div>

      <div className="cmd-radar__stage relative mx-auto w-full max-w-[340px] flex-1">
        <div className="cmd-radar__sonar-ring cmd-radar__sonar-ring--outer" aria-hidden />
        <div className="cmd-radar__sonar-ring cmd-radar__sonar-ring--mid" aria-hidden />
        <div className="cmd-radar__sonar-sweep" aria-hidden />

        {loading ? (
          <div className="absolute inset-0 z-[3] flex items-center justify-center font-mono-technical text-xs uppercase tracking-widest text-app-text/55">
            Hesaplanıyor…
          </div>
        ) : null}

        {!loading && !hasSignal ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-1 z-[3] px-2 text-center font-mono-technical text-[9px] uppercase leading-relaxed tracking-wide text-app-text/45">
            Veri bekleniyor — antrenman ve cephanelik kayıtları radarı doldurur.
          </div>
        ) : null}

        <ResponsiveContainer width="100%" height={248} minWidth={220} debounce={180}>
          <RadarChart
            data={chartData}
            cx="50%"
            cy="50%"
            outerRadius="56%"
            margin={{ top: 28, right: 44, bottom: 28, left: 44 }}
          >
            <defs>
              <linearGradient id={`radarFill-${gid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={accent} stopOpacity={0.42} />
                <stop offset="55%" stopColor={accent} stopOpacity={0.22} />
                <stop offset="100%" stopColor="#004dff" stopOpacity={0.08} />
              </linearGradient>
              <filter id={`radarGlow-${gid}`} x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <PolarGrid
              gridType="polygon"
              stroke="rgba(0, 255, 136, 0.16)"
              strokeWidth={1}
              radialLines
            />

            <PolarAngleAxis dataKey="subject" tick={HudAxisTick} tickLine={false} axisLine={false} />

            <PolarRadiusAxis
              angle={90}
              domain={[0, CHART_MAX]}
              tickCount={5}
              axisLine={false}
              tickLine={false}
              tick={{
                fill: 'rgba(100, 116, 139, 0.55)',
                fontSize: 8,
                fontFamily: "'JetBrains Mono', monospace",
              }}
            />

            <Radar
              name="Hazırlık"
              dataKey="value"
              stroke={accent}
              fill={`url(#radarFill-${gid})`}
              fillOpacity={0.48}
              strokeWidth={1.75}
              dot={{
                r: 3,
                fill: accent,
                stroke: '#0a0b0d',
                strokeWidth: 1,
                fillOpacity: 0.95,
              }}
              activeDot={{
                r: 5,
                fill: accent,
                stroke: '#fff',
                strokeWidth: 1,
                filter: `url(#radarGlow-${gid})`,
              }}
              isAnimationActive={animateRadar && !loading}
              animationDuration={900}
              animationEasing="ease-out"
              style={{ filter: `drop-shadow(0 0 12px color-mix(in srgb, ${accent} 45%, transparent))` }}
            />

            <Tooltip
              cursor={{ stroke: accent, strokeOpacity: 0.35, strokeWidth: 1 }}
              content={(props) => <HudRadarTooltip {...props} accent={accent} />}
              wrapperStyle={{ outline: 'none', zIndex: 20 }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {!loading ? (
        <ul className="mt-2 flex shrink-0 flex-wrap justify-center gap-x-4 gap-y-1 font-mono-technical text-[9px] uppercase tracking-wide text-app-text/50">
          {chartData.map((row) => (
            <li key={row.subject} className="inline-flex items-center gap-1.5">
              <span
                className="size-1.5 rounded-full"
                style={{
                  background: accent,
                  boxShadow: `0 0 6px color-mix(in srgb, ${accent} 70%, transparent)`,
                  opacity: row.rawValue > 0 ? 1 : 0.35,
                }}
                aria-hidden
              />
              {row.subject}
              <span className="tabular-nums text-accent/85">{row.rawValue}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
