import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChevronDown, FileDown, GitCompare, Loader2, Trash2 } from 'lucide-react'
import ChartSafeFrame from './ChartSafeFrame'
import StandardShotAnalytics from './StandardShotAnalytics'
import { useAuth } from '../../context/AuthContext'
import { buildCompareSeries } from '../../lib/standardShotSessionStore'
import { formatShotSeconds } from '../../lib/standardShotTimer'
import { exportStandardShotSessionPdf } from '../../lib/standardShotReportPdf'

const GOLD = '#facc15'
const MUTED = '#71717a'
const SERIES_COLORS = ['#facc15', '#34d399', '#60a5fa', '#f472b6', '#fb923c']

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
 *   sessions: import('../../lib/standardShotSessionStore').StandardShotSession[]
 *   loading?: boolean
 *   deletingId?: string | null
 *   onDeleteSession?: (id: string) => Promise<void> | void
 *   locale?: string
 * }} props
 */
export default function StandardShotHistory({
  sessions,
  loading = false,
  deletingId = null,
  onDeleteSession,
  locale = 'tr',
}) {
  const { t, i18n } = useTranslation('timer')
  const { userData, user } = useAuth()
  const [expandedId, setExpandedId] = useState(/** @type {string | null} */ (null))
  const [compareIds, setCompareIds] = useState(/** @type {string[]} */ ([]))
  const [compareMode, setCompareMode] = useState(false)
  const [pdfBusy, setPdfBusy] = useState(false)

  const lng = locale || (i18n.language?.startsWith('tr') ? 'tr' : 'en')

  const toggleExpand = useCallback((id) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }, [])

  const toggleComparePick = useCallback((id) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= 4) return prev
      return [...prev, id]
    })
  }, [])

  const compareSessions = useMemo(
    () => sessions.filter((s) => compareIds.includes(s.id)),
    [sessions, compareIds],
  )

  const compareData = useMemo(() => buildCompareSeries(compareSessions), [compareSessions])

  const handleDelete = useCallback(
    async (id) => {
      if (!onDeleteSession || deletingId) return
      try {
        await onDeleteSession(id)
        setCompareIds((prev) => prev.filter((x) => x !== id))
        if (expandedId === id) setExpandedId(null)
      } catch {
        /* hook error state */
      }
    },
    [deletingId, expandedId, onDeleteSession],
  )

  const handlePdf = useCallback(
    async (session) => {
      setPdfBusy(true)
      try {
        await exportStandardShotSessionPdf({
          session,
          operator: {
            callsign: userData?.callsign || user?.displayName || session.operator?.callsign || '',
            username: userData?.username || session.operator?.username || '',
            bloodType: userData?.bloodType || '',
            email: userData?.email || user?.email || '',
          },
        })
      } finally {
        setPdfBusy(false)
      }
    },
    [user?.displayName, user?.email, userData?.bloodType, userData?.callsign, userData?.email, userData?.username],
  )

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-sm border border-zinc-600/50 bg-[#0a0a0b]/80 px-4 py-12">
        <Loader2 className="size-6 animate-spin text-[#facc15]/80" strokeWidth={1.5} aria-hidden />
        <p className="font-mono-technical text-[10px] uppercase tracking-[0.24em] text-zinc-500">
          {t('standardShot.history.loading')}
        </p>
      </div>
    )
  }

  if (sessions.length === 0) {
    return (
      <div className="rounded-sm border border-zinc-600/50 bg-[#0a0a0b]/80 px-4 py-10 text-center">
        <p className="font-mono-technical text-[10px] uppercase tracking-[0.24em] text-zinc-500">
          {t('standardShot.history.empty')}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.28em] text-[#facc15]/80">
          {t('standardShot.history.kicker')} · {sessions.length}
        </p>
        <button
          type="button"
          onClick={() => {
            setCompareMode((v) => !v)
            if (compareMode) setCompareIds([])
          }}
          className={[
            'inline-flex min-h-10 items-center gap-1.5 rounded-sm border px-2.5 py-1.5 font-mono-technical text-[8px] uppercase tracking-[0.18em] transition',
            compareMode
              ? 'border-[#facc15]/55 bg-[rgba(250,204,21,0.12)] text-[#facc15]'
              : 'border-zinc-600/50 text-zinc-400 hover:border-[#facc15]/40 hover:text-[#facc15]',
          ].join(' ')}
        >
          <GitCompare className="size-3.5" strokeWidth={1.5} aria-hidden />
          {t('standardShot.history.compare')}
        </button>
      </div>

      {compareMode ? (
        <p className="font-mono-technical text-[9px] text-app-text/50">
          {t('standardShot.history.compareHint', { count: compareIds.length })}
        </p>
      ) : null}

      <ul className="flex flex-col gap-2">
        {sessions.map((session) => {
          const open = expandedId === session.id
          const picked = compareIds.includes(session.id)
          return (
            <li
              key={session.id}
              className={[
                'overflow-hidden rounded-sm border transition',
                open || picked
                  ? 'border-[#facc15]/45 bg-[#0a0a0b]'
                  : 'border-zinc-600/55 bg-[#0a0a0b]/85',
              ].join(' ')}
            >
              <div className="flex items-stretch gap-1">
                {compareMode ? (
                  <button
                    type="button"
                    onClick={() => toggleComparePick(session.id)}
                    aria-pressed={picked}
                    className={[
                      'flex w-10 shrink-0 items-center justify-center border-r border-zinc-700/50 font-mono-technical text-[11px] font-bold',
                      picked ? 'bg-[rgba(250,204,21,0.15)] text-[#facc15]' : 'text-zinc-500',
                    ].join(' ')}
                  >
                    {picked ? '✓' : '+'}
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() => toggleExpand(session.id)}
                  className="flex min-w-0 flex-1 items-center gap-3 px-3 py-3 text-left touch-manipulation"
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
                      {t('standardShot.history.rowMeta', {
                        shots: session.shotCount,
                        reaction: formatShotSeconds(session.summary.reactionMs ?? 0),
                        g: session.calibration.mpuGForceRange,
                      })}
                    </p>
                  </div>
                  <div className="hidden shrink-0 text-right sm:block">
                    <p className="font-mono-technical text-sm font-bold tabular-nums text-[#facc15]">
                      {formatShotSeconds(session.summary.totalMs ?? 0)}s
                    </p>
                    <p className="font-mono-technical text-[7px] uppercase tracking-[0.16em] text-zinc-500">
                      {t('standardShot.summary.total')}
                    </p>
                  </div>
                </button>
              </div>

              <div
                className={[
                  'grid transition-[grid-template-rows] duration-300 ease-out',
                  open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                ].join(' ')}
              >
                <div className="min-h-0 overflow-hidden">
                  {open ? (
                  <div className="space-y-3 border-t border-zinc-700/50 px-3 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={pdfBusy}
                        onClick={() => void handlePdf(session)}
                        className="inline-flex min-h-10 items-center gap-1.5 rounded-sm border border-[#facc15]/45 bg-[rgba(250,204,21,0.1)] px-2.5 py-1.5 font-mono-technical text-[8px] font-bold uppercase tracking-[0.18em] text-[#facc15] disabled:opacity-50"
                      >
                        <FileDown className="size-3.5" strokeWidth={1.5} aria-hidden />
                        {t('standardShot.pdf.download')}
                      </button>
                      <button
                        type="button"
                        disabled={deletingId === session.id}
                        onClick={() => void handleDelete(session.id)}
                        className="inline-flex min-h-10 items-center gap-1.5 rounded-sm border border-red-500/30 px-2.5 py-1.5 font-mono-technical text-[8px] uppercase tracking-[0.18em] text-red-300/80 hover:border-red-400/50 disabled:opacity-50"
                      >
                        {deletingId === session.id ? (
                          <Loader2 className="size-3.5 animate-spin" strokeWidth={1.5} aria-hidden />
                        ) : (
                          <Trash2 className="size-3.5" strokeWidth={1.5} aria-hidden />
                        )}
                        {t('standardShot.history.delete')}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <Mini
                        label={t('standardShot.summary.bestReaction')}
                        value={`${formatShotSeconds(session.summary.reactionMs ?? 0)}s`}
                      />
                      <Mini
                        label={t('standardShot.summary.avgSplit')}
                        value={
                          session.summary.avgSplitMs != null
                            ? `${formatShotSeconds(session.summary.avgSplitMs)}s`
                            : '—'
                        }
                      />
                      <Mini label={t('calibration.sound.threshold')} value={String(session.calibration.soundThreshold)} />
                      <Mini label={t('calibration.mpu.gForce')} value={session.calibration.mpuGForceRange} />
                    </div>

                    <StandardShotAnalytics
                      shotTimesMs={session.shotTimesMs}
                      mpuSamples={session.mpuSamples}
                      compact
                    />
                  </div>
                  ) : null}
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      {compareMode && compareSessions.length >= 2 ? (
        <div className="min-w-0 rounded-sm border border-[#facc15]/35 bg-[#0a0a0b] p-3 sm:p-4">
          <p className="mb-3 font-mono-technical text-[8px] font-bold uppercase tracking-[0.28em] text-[#facc15]/80">
            {t('standardShot.history.compareTitle')}
          </p>
          <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {compareSessions.map((s, i) => (
              <div
                key={s.id}
                className="rounded-sm border border-zinc-600/50 px-3 py-2"
                style={{ borderColor: `${SERIES_COLORS[i % SERIES_COLORS.length]}66` }}
              >
                <p className="font-mono-technical text-[8px] uppercase tracking-[0.16em]" style={{ color: SERIES_COLORS[i % SERIES_COLORS.length] }}>
                  {t('standardShot.history.series', { n: i + 1 })}
                </p>
                <p className="mt-1 font-mono-technical text-[10px] text-app-text/80">
                  {formatWhen(s.createdAt, lng)} · R {formatShotSeconds(s.summary.reactionMs ?? 0)}s
                </p>
              </div>
            ))}
          </div>
          <ChartSafeFrame height={220}>
            <LineChart data={compareData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="rgba(250,204,21,0.12)" strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke={MUTED} tick={{ fill: MUTED, fontSize: 10 }} />
              <YAxis stroke={MUTED} tick={{ fill: MUTED, fontSize: 10 }} width={40} />
              <Tooltip
                contentStyle={{
                  background: '#0a0a0b',
                  border: '1px solid rgba(250,204,21,0.35)',
                  fontSize: 11,
                }}
              />
              <Legend />
              {compareSessions.map((_, i) => (
                <Line
                  key={i}
                  type="monotone"
                  dataKey={`s${i}`}
                  name={t('standardShot.history.series', { n: i + 1 })}
                  stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  connectNulls
                  isAnimationActive
                />
              ))}
            </LineChart>
          </ChartSafeFrame>
        </div>
      ) : null}
    </div>
  )
}

/**
 * @param {{ label: string, value: string }} props
 */
function Mini({ label, value }) {
  return (
    <div className="rounded-sm border border-zinc-700/50 bg-zinc-900/40 px-2.5 py-2">
      <p className="font-mono-technical text-[7px] uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className="mt-0.5 font-mono-technical text-sm font-bold tabular-nums text-[#facc15]">{value}</p>
    </div>
  )
}
