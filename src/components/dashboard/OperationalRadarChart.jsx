import { memo, useId, useMemo } from 'react'
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  Tooltip,
} from 'recharts'
import { useTheme } from '../../contexts/ThemeContext'
import { getAccentColor } from '../../lib/themeColors'

const CHART_MAX = 100
const MIN_DISPLAY_VALUE = 8
const NEON_FALLBACK = '#00ff88'

/** Sabit sahne — ResponsiveContainer resize döngüsünü engeller */
const STAGE_W = 300
const STAGE_H = 248
const CHART_CX = STAGE_W / 2
const CHART_CY = STAGE_H / 2
const OUTER_R = 68

/** @type {Record<string, string>} */
const LABEL_SLOT = {
  Personel: 'cmd-radar__label--n',
  Lojistik: 'cmd-radar__label--sw',
  Ekipman: 'cmd-radar__label--se',
}

/**
 * Sıfır değerler merkeze çökmesin; tooltip gerçek skoru gösterir.
 * @param {number} raw
 */
function toDisplayValue(raw) {
  const n = Math.round(Math.max(0, Math.min(CHART_MAX, raw)))
  if (n === 0) return MIN_DISPLAY_VALUE
  return Math.max(n, MIN_DISPLAY_VALUE * 0.65)
}

/** Arka plan sonar — grafikten bağımsız compositor katmanı */
function RadarSonarLayer() {
  return (
    <div className="cmd-radar__sonar-layer" aria-hidden>
      <div className="cmd-radar__sonar-ring cmd-radar__sonar-ring--outer" />
      <div className="cmd-radar__sonar-ring cmd-radar__sonar-ring--mid" />
      <div className="cmd-radar__sonar-sweep">
        <div className="cmd-radar__sonar-sweep-arm" />
      </div>
    </div>
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
 * @param {{
 *   chartData: { subject: string; rawValue: number; value: number; fullMark: number }[]
 *   accent: string
 *   gid: string
 * }} props
 */
const RadarChartLayer = memo(function RadarChartLayer({ chartData, accent, gid }) {
  return (
    <RadarChart
      width={STAGE_W}
      height={STAGE_H}
      cx={CHART_CX}
      cy={CHART_CY}
      outerRadius={OUTER_R}
      data={chartData}
      margin={{ top: 16, right: 16, bottom: 16, left: 16 }}
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

      {/* Eksen etiketleri HTML katmanında — SVG re-render titremesini önler */}
      <PolarAngleAxis dataKey="subject" tick={false} tickLine={false} axisLine={false} />

      <PolarRadiusAxis
        angle={90}
        domain={[0, CHART_MAX]}
        scale="linear"
        allowDataOverflow
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
        isAnimationActive={false}
        style={{ filter: `drop-shadow(0 0 12px color-mix(in srgb, ${accent} 45%, transparent))` }}
      />

      <Tooltip
        cursor={{ stroke: accent, strokeOpacity: 0.35, strokeWidth: 1 }}
        content={(props) => <HudRadarTooltip {...props} accent={accent} />}
        wrapperStyle={{ outline: 'none', zIndex: 20 }}
      />
    </RadarChart>
  )
})

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

  const hasSignal = chartData.some((row) => row.rawValue > 0)

  return (
    <div className="cmd-radar relative flex h-full min-h-[300px] flex-col">
      <div className="mb-3 shrink-0">
        <p className="cmd-panel__title">Kapasite radarı</p>
        <p className="cmd-panel__subtitle">Personel · lojistik · ekipman karşılaştırması</p>
      </div>

      <div className="cmd-radar__viewport">
        <RadarSonarLayer />

        <div className="cmd-radar__chart-layer">
          <RadarChartLayer chartData={chartData} accent={accent} gid={gid} />
        </div>

        <div className="cmd-radar__labels" aria-hidden={loading}>
          {chartData.map((row) => (
            <span
              key={row.subject}
              className={['cmd-radar__label', LABEL_SLOT[row.subject] ?? 'cmd-radar__label--n'].join(' ')}
            >
              {row.subject}
            </span>
          ))}
        </div>

        {loading ? (
          <div className="cmd-radar__overlay cmd-radar__overlay--loading">
            Hesaplanıyor…
          </div>
        ) : null}

        {!loading && !hasSignal ? (
          <div className="cmd-radar__overlay cmd-radar__overlay--hint">
            Veri bekleniyor — antrenman ve cephanelik kayıtları radarı doldurur.
          </div>
        ) : null}
      </div>

      {!loading ? (
        <ul className="mt-2 flex shrink-0 flex-wrap justify-center gap-x-4 gap-y-1 font-mono-technical text-[9px] uppercase tracking-wide text-app-text/50">
          {chartData.map((row) => (
            <li key={row.subject} className="inline-flex items-center gap-1.5">
              <span
                className="size-1.5 shrink-0 rounded-full"
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
