import { useCallback, useMemo, useState } from 'react'
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
import { ChevronDown, FileDown, Loader2, Trash2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { exportDryFireSessionPdf } from '../../lib/dryFireReportPdf'
import { formatShotMillis } from '../../lib/dryFireTimer'
import ChartSafeFrame from './ChartSafeFrame'

const GOLD = '#facc15'
const MUTED = '#71717a'
const GRID = 'rgba(250,204,21,0.12)'

/**
 * @param {number} ms
 * @param {string} locale
 */
function formatWhen(ms, locale) {
  try {
    return new Date(ms).toLocaleString(locale === 'tr' ? 'tr-TR' : 'en-US', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  } catch {
    return String(ms)
  }
}

/**
 * @param {{
 *   sessions: import('../../lib/dryFireSessionStore').DryFireSession[]
 *   loading?: boolean
 *   deletingId?: string | null
 *   onDelete?: (id: string) => Promise<void> | void
 * }} props
 */
export default function DryFireHistoryPanel({
  sessions,
  loading = false,
  deletingId = null,
  onDelete,
}) {
  const { t, i18n } = useTranslation('timer')
  const { userData, user } = useAuth()
  const [expandedId, setExpandedId] = useState(/** @type {string | null} */ (null))
  const [pdfBusyId, setPdfBusyId] = useState(/** @type {string | null} */ (null))

  const lng = i18n.language?.startsWith('tr') ? 'tr' : 'en'

  const toggleExpand = useCallback((id) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }, [])

  const handleDelete = useCallback(
    async (id) => {
      if (!onDelete || deletingId) return
      try {
        await onDelete(id)
        if (expandedId === id) setExpandedId(null)
      } catch {
        /* hook */
      }
    },
    [deletingId, expandedId, onDelete],
  )

  const handlePdf = useCallback(
    async (session) => {
      setPdfBusyId(session.id)
      try {
        await exportDryFireSessionPdf({
          session,
          operator: {
            callsign: userData?.callsign || user?.displayName || session.operator?.callsign || '',
            username: userData?.username || session.operator?.username || '',
            bloodType: userData?.bloodType || '',
            email: userData?.email || user?.email || '',
          },
        })
      } finally {
        setPdfBusyId(null)
      }
    },
    [user?.displayName, user?.email, userData?.bloodType, userData?.callsign, userData?.email, userData?.username],
  )

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-sm border border-zinc-600/50 bg-[#0a0a0b]/80 px-4 py-12">
        <Loader2 className="size-6 animate-spin text-[#facc15]/80" strokeWidth={1.5} aria-hidden />
        <p className="font-mono-technical text-[10px] uppercase tracking-[0.24em] text-zinc-500">
          {t('dryFire.history.loading')}
        </p>
      </div>
    )
  }

  if (sessions.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-sm border border-dashed border-[#facc15]/25 bg-[#0a0a0b]/70 px-4 py-10 text-center">
        <span className="pointer-events-none absolute left-2 top-2 h-2 w-2 border-l border-t border-[#facc15]/40" />
        <span className="pointer-events-none absolute right-2 top-2 h-2 w-2 border-r border-t border-[#facc15]/40" />
        <span className="pointer-events-none absolute bottom-2 left-2 h-2 w-2 border-b border-l border-[#facc15]/40" />
        <span className="pointer-events-none absolute bottom-2 right-2 h-2 w-2 border-b border-r border-[#facc15]/40" />
        <p className="font-mono-technical text-[10px] uppercase tracking-[0.24em] text-zinc-500">
          {t('dryFire.history.empty')}
        </p>
        <p className="mt-2 font-mono-technical text-[8px] tracking-[0.12em] text-zinc-600">
          {t('dryFire.history.emptyHint')}
        </p>
      </div>
    )
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-3">
      <p className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.28em] text-[#facc15]/80">
        {t('dryFire.history.kicker')} · {sessions.length}
      </p>

      <ul className="flex flex-col gap-2">
        {sessions.map((session) => {
          const open = expandedId === session.id
          const drawMs = session.timingSummary?.reactionMs
          const avgFlinch = session.hitSummary?.avgFlinch
          return (
            <li
              key={session.id}
              className={[
                'overflow-hidden rounded-sm border transition',
                open
                  ? 'border-[#facc15]/45 bg-[#0a0a0b]'
                  : 'border-zinc-600/55 bg-[#0a0a0b]/85',
              ].join(' ')}
            >
              <button
                type="button"
                onClick={() => toggleExpand(session.id)}
                aria-expanded={open}
                className="flex w-full min-w-0 items-center gap-3 px-3 py-3 text-left touch-manipulation"
              >
                <ChevronDown
                  className={[
                    'size-4 shrink-0 text-[#facc15]/70 transition-transform duration-300',
                    open ? 'rotate-0' : '-rotate-90',
                  ].join(' ')}
                  strokeWidth={1.5}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono-technical text-[10px] font-bold uppercase tracking-[0.16em] text-app-text">
                    {formatWhen(session.createdAt, lng)}
                  </p>
                  <p className="mt-0.5 font-mono-technical text-[8px] uppercase tracking-[0.14em] text-zinc-500">
                    {t('dryFire.history.rowMeta', {
                      shots: session.shotCount,
                      draw:
                        drawMs != null ? `${formatShotMillis(drawMs)} ms` : '—',
                      flinch: avgFlinch != null ? String(avgFlinch) : '—',
                    })}
                  </p>
                </div>
                <div className="hidden shrink-0 grid-cols-3 gap-3 text-right sm:grid">
                  <RowStat
                    label={t('dryFire.history.colShots')}
                    value={String(session.shotCount)}
                  />
                  <RowStat
                    label={t('dryFire.timer.draw')}
                    value={drawMs != null ? `${formatShotMillis(drawMs)}` : '—'}
                    unit={drawMs != null ? 'ms' : undefined}
                    accent
                  />
                  <RowStat
                    label={t('dryFire.analytics.avgFlinch')}
                    value={avgFlinch != null ? String(avgFlinch) : '—'}
                  />
                </div>
              </button>

              <div
                className={[
                  'grid transition-[grid-template-rows] duration-300 ease-out',
                  open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                ].join(' ')}
              >
                <div className="min-h-0 overflow-hidden">
                  {open ? (
                    <SessionDetail
                      session={session}
                      pdfBusy={pdfBusyId === session.id}
                      deleting={deletingId === session.id}
                      onPdf={() => void handlePdf(session)}
                      onDelete={() => void handleDelete(session.id)}
                    />
                  ) : null}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/**
 * @param {{
 *   session: import('../../lib/dryFireSessionStore').DryFireSession
 *   pdfBusy: boolean
 *   deleting: boolean
 *   onPdf: () => void
 *   onDelete: () => void
 * }} props
 */
function SessionDetail({ session, pdfBusy, deleting, onPdf, onDelete }) {
  const { t } = useTranslation('timer')

  const flinchSeries = useMemo(
    () =>
      session.hits.map((h) => ({
        name: String(h.index),
        flinch: h.flinchScore,
      })),
    [session.hits],
  )

  const scatter = useMemo(
    () =>
      session.hits.map((h) => ({
        x: h.x,
        y: h.y,
        fill: h.color || GOLD,
        index: h.index,
      })),
    [session.hits],
  )

  const times = session.reactionTimesMs?.length
    ? session.reactionTimesMs
    : session.shotTimesMs || []

  return (
    <div className="space-y-3 border-t border-zinc-700/50 px-3 py-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pdfBusy}
          onClick={onPdf}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-sm border border-[#facc15]/45 bg-[rgba(250,204,21,0.1)] px-2.5 py-1.5 font-mono-technical text-[8px] font-bold uppercase tracking-[0.18em] text-[#facc15] disabled:opacity-50"
        >
          {pdfBusy ? (
            <Loader2 className="size-3.5 animate-spin" strokeWidth={1.5} aria-hidden />
          ) : (
            <FileDown className="size-3.5" strokeWidth={1.5} aria-hidden />
          )}
          {t('dryFire.history.reportAction')}
        </button>
        <button
          type="button"
          disabled={deleting}
          onClick={onDelete}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-sm border border-red-500/30 px-2.5 py-1.5 font-mono-technical text-[8px] uppercase tracking-[0.18em] text-red-300/80 hover:border-red-400/50 disabled:opacity-50"
        >
          {deleting ? (
            <Loader2 className="size-3.5 animate-spin" strokeWidth={1.5} aria-hidden />
          ) : (
            <Trash2 className="size-3.5" strokeWidth={1.5} aria-hidden />
          )}
          {t('dryFire.history.delete')}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Mini
          label={t('dryFire.analytics.shots')}
          value={String(session.hitSummary.count || session.shotCount)}
        />
        <Mini
          label={t('dryFire.timer.draw')}
          value={
            session.timingSummary.reactionMs != null
              ? `${formatShotMillis(session.timingSummary.reactionMs)} ms`
              : '—'
          }
        />
        <Mini
          label={t('dryFire.analytics.avgFlinch')}
          value={
            session.hitSummary.avgFlinch != null ? String(session.hitSummary.avgFlinch) : '—'
          }
        />
        <Mini
          label={t('dryFire.analytics.group')}
          value={
            session.hitSummary.groupRadius != null
              ? session.hitSummary.groupRadius.toFixed(3)
              : '—'
          }
        />
      </div>

      {times.length > 0 ? (
        <div className="min-w-0">
          <p className="mb-1.5 font-mono-technical text-[7px] uppercase tracking-[0.18em] text-zinc-500">
            {t('dryFire.history.splits')}
          </p>
          <ul className="flex max-w-full flex-wrap gap-1.5">
            {times.map((ms, i) => (
              <li
                key={`${session.id}-t-${i}`}
                className="rounded-sm border border-[#facc15]/30 px-1.5 py-0.5 font-mono-technical text-[8px] tabular-nums text-[#facc15]"
              >
                #{i + 1} {formatShotMillis(ms)} ms
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {flinchSeries.length > 0 ? (
        <div className="min-w-0 overflow-hidden rounded-sm border border-zinc-700/50 bg-zinc-950/40 p-2.5">
          <p className="mb-1.5 font-mono-technical text-[7px] uppercase tracking-[0.18em] text-zinc-500">
            {t('dryFire.analytics.flinchTrend')}
          </p>
          <ChartSafeFrame height={160}>
            <LineChart data={flinchSeries} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke={MUTED} tick={{ fill: MUTED, fontSize: 9 }} />
              <YAxis
                stroke={MUTED}
                tick={{ fill: MUTED, fontSize: 9 }}
                width={28}
                domain={[0, 100]}
              />
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
                stroke={GOLD}
                strokeWidth={2}
                dot={{ r: 2.5, fill: GOLD }}
                isAnimationActive={false}
              />
            </LineChart>
          </ChartSafeFrame>
        </div>
      ) : null}

      {scatter.length > 0 ? (
        <div className="min-w-0 overflow-hidden rounded-sm border border-zinc-700/50 bg-zinc-950/40 p-2.5">
          <p className="mb-1.5 font-mono-technical text-[7px] uppercase tracking-[0.18em] text-zinc-500">
            {t('dryFire.analytics.scatter')}
          </p>
          <ChartSafeFrame height={168}>
            <ScatterChart margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
              <XAxis
                type="number"
                dataKey="x"
                domain={[-1, 1]}
                stroke={MUTED}
                tick={{ fill: MUTED, fontSize: 9 }}
              />
              <YAxis
                type="number"
                dataKey="y"
                domain={[-1, 1]}
                stroke={MUTED}
                tick={{ fill: MUTED, fontSize: 9 }}
                width={28}
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
                  <Cell key={`c-${p.index}`} fill={p.fill} />
                ))}
              </Scatter>
            </ScatterChart>
          </ChartSafeFrame>
        </div>
      ) : null}

      {session.hits.length > 0 ? (
        <div className="min-w-0">
          <p className="mb-1.5 font-mono-technical text-[7px] uppercase tracking-[0.18em] text-zinc-500">
            {t('dryFire.history.coords')}
          </p>
          <ul className="max-h-32 space-y-1 overflow-y-auto overscroll-contain font-mono-technical text-[8px] tabular-nums text-zinc-400 [scrollbar-gutter:stable]">
            {session.hits.map((h) => (
              <li
                key={h.id}
                className="flex min-w-0 justify-between gap-2 border-b border-zinc-800/80 py-0.5"
              >
                <span>#{h.index}</span>
                <span className="truncate">
                  {h.x.toFixed(3)}, {h.y.toFixed(3)}
                </span>
                <span className="shrink-0 text-[#facc15]/80">F{h.flinchScore}</span>
                {h.reactionMs != null ? (
                  <span className="shrink-0 text-zinc-500">{formatShotMillis(h.reactionMs)} ms</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

/**
 * @param {{ label: string, value: string, unit?: string, accent?: boolean }} props
 */
function RowStat({ label, value, unit, accent = false }) {
  return (
    <div className="min-w-[4.5rem]">
      <p
        className={[
          'font-mono-technical text-sm font-bold tabular-nums',
          accent ? 'text-[#facc15]' : 'text-app-text',
        ].join(' ')}
      >
        {value}
        {unit ? (
          <span className="ml-0.5 text-[8px] font-normal text-zinc-500">{unit}</span>
        ) : null}
      </p>
      <p className="font-mono-technical text-[7px] uppercase tracking-[0.14em] text-zinc-500">
        {label}
      </p>
    </div>
  )
}

/**
 * @param {{ label: string, value: string }} props
 */
function Mini({ label, value }) {
  return (
    <div className="min-w-0 rounded-sm border border-zinc-700/50 bg-zinc-900/40 px-2.5 py-2">
      <p className="truncate font-mono-technical text-[7px] uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </p>
      <p className="mt-0.5 truncate font-mono-technical text-sm font-bold tabular-nums text-[#facc15]">
        {value}
      </p>
    </div>
  )
}
