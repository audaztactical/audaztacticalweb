import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { summarizeDryFireHits } from '../../lib/dryFireHits'
import ChartSafeFrame from './ChartSafeFrame'

const GOLD = '#facc15'
const MUTED = '#71717a'
const GRID = 'rgba(250,204,21,0.12)'

/**
 * @param {{
 *   hits: import('../../lib/dryFireHits').DryFireHit[]
 *   reactionTimesMs?: number[]
 *   lastDrawMs?: number | null
 * }} props
 */
export default function DryFireAnalytics({ hits, reactionTimesMs = [], lastDrawMs = null }) {
  const { t } = useTranslation('timer')
  const summary = useMemo(() => summarizeDryFireHits(hits), [hits])
  const drawMs =
    lastDrawMs ?? (reactionTimesMs.length > 0 ? reactionTimesMs[0] : null)

  const flinchSeries = useMemo(
    () =>
      hits.map((h) => ({
        name: String(h.index),
        flinch: h.flinchScore,
        trigger: h.triggerPressMs,
      })),
    [hits],
  )

  const scatter = useMemo(
    () =>
      hits.map((h) => ({
        x: h.deviationX,
        y: h.deviationY,
        fill: h.color,
        index: h.index,
      })),
    [hits],
  )

  if (hits.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-sm border border-dashed border-[#facc15]/25 bg-[#0a0a0b]/70 px-4 py-8 text-center">
        <span className="pointer-events-none absolute left-2 top-2 h-2 w-2 border-l border-t border-[#facc15]/40" />
        <span className="pointer-events-none absolute right-2 top-2 h-2 w-2 border-r border-t border-[#facc15]/40" />
        <span className="pointer-events-none absolute bottom-2 left-2 h-2 w-2 border-b border-l border-[#facc15]/40" />
        <span className="pointer-events-none absolute bottom-2 right-2 h-2 w-2 border-b border-r border-[#facc15]/40" />
        <p className="font-mono-technical text-[9px] uppercase tracking-[0.22em] text-zinc-500">
          {t('dryFire.analytics.empty')}
        </p>
      </div>
    )
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <div className="grid w-full min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label={t('dryFire.analytics.shots')} value={String(summary.count)} />
        <Stat
          label={t('dryFire.timer.draw')}
          value={drawMs != null ? `${drawMs} ms` : '—'}
          accent
        />
        <Stat
          label={t('dryFire.analytics.avgFlinch')}
          value={summary.avgFlinch != null ? String(summary.avgFlinch) : '—'}
        />
        <Stat
          label={t('dryFire.analytics.avgTrigger')}
          value={summary.avgTriggerMs != null ? `${summary.avgTriggerMs} ms` : '—'}
        />
        <Stat
          label={t('dryFire.analytics.group')}
          value={summary.groupRadius != null ? summary.groupRadius.toFixed(3) : '—'}
        />
      </div>

      <div className="w-full min-w-0 overflow-hidden rounded-sm border border-zinc-600/55 bg-[#0a0a0b]/90 p-3">
        <p className="mb-2 font-mono-technical text-[8px] font-bold uppercase tracking-[0.28em] text-[#facc15]/80">
          {t('dryFire.analytics.flinchTrend')}
        </p>
        <ChartSafeFrame height={200}>
          <LineChart data={flinchSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
            <XAxis dataKey="name" stroke={MUTED} tick={{ fill: MUTED, fontSize: 10 }} />
            <YAxis stroke={MUTED} tick={{ fill: MUTED, fontSize: 10 }} width={36} domain={[0, 100]} />
            <Tooltip
              contentStyle={{
                background: '#0a0a0b',
                border: '1px solid rgba(250,204,21,0.35)',
                fontSize: 11,
              }}
            />
            <Line
              type="monotone"
              dataKey="flinch"
              name={t('dryFire.tooltip.flinch')}
              stroke={GOLD}
              strokeWidth={2}
              dot={{ r: 3, fill: GOLD }}
              isAnimationActive
            />
          </LineChart>
        </ChartSafeFrame>
      </div>

      <div className="w-full min-w-0 overflow-hidden rounded-sm border border-zinc-600/55 bg-[#0a0a0b]/90 p-3">
        <p className="mb-2 font-mono-technical text-[8px] font-bold uppercase tracking-[0.28em] text-[#facc15]/80">
          {t('dryFire.analytics.scatter')}
        </p>
        <ChartSafeFrame height={200}>
          <ScatterChart margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="x"
              name="X"
              domain={[-1, 1]}
              stroke={MUTED}
              tick={{ fill: MUTED, fontSize: 10 }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="Y"
              domain={[-1, 1]}
              stroke={MUTED}
              tick={{ fill: MUTED, fontSize: 10 }}
              width={36}
            />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              contentStyle={{
                background: '#0a0a0b',
                border: '1px solid rgba(250,204,21,0.35)',
                fontSize: 11,
              }}
            />
            <Scatter data={scatter} fill={GOLD}>
              {scatter.map((p) => (
                <Cell key={`cell-${p.index}`} fill={p.fill} />
              ))}
            </Scatter>
          </ScatterChart>
        </ChartSafeFrame>
        <ul className="mt-2 flex max-w-full flex-wrap gap-1.5 overflow-hidden">
          {hits.map((h) => (
            <li
              key={h.id}
              className="inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 font-mono-technical text-[8px] uppercase tracking-[0.12em]"
              style={{ borderColor: `${h.color}66`, color: h.color }}
            >
              #{h.index}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/**
 * @param {{ label: string, value: string, accent?: boolean }} props
 */
function Stat({ label, value, accent = false }) {
  return (
    <div
      className={[
        'min-w-0 rounded-lg border px-2.5 py-2.5',
        accent
          ? 'border-[#facc15]/35 bg-[rgba(250,204,21,0.08)]'
          : 'border-slate-800 bg-slate-950',
      ].join(' ')}
    >
      <p className="truncate font-mono text-[7px] uppercase tracking-[0.22em] text-app-text/45">
        {label}
      </p>
      <p
        className={[
          'mt-0.5 truncate font-mono text-sm font-bold tabular-nums',
          accent ? 'text-[#facc15]' : 'text-slate-100',
        ].join(' ')}
      >
        {value}
      </p>
    </div>
  )
}
