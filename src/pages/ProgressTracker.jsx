import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import {
  Activity,
  ArrowLeft,
  Award,
  BarChart2,
  ChevronDown,
  ChevronRight,
  Clock,
  Crosshair,
  Filter,
  Shield,
  Target,
  Maximize2,
  TrendingUp,
  X,
} from 'lucide-react'
import PageShell from '../components/layout/PageShell'
import { useAuth } from '../context/AuthContext'
import { useAudazData } from '../hooks/useAudazData'
import { db, isFirebaseConfigured } from '../lib/firebase'
import { emitFirebaseError } from '../lib/firebaseErrorBus'
import { computeORS } from '../lib/orsEngine'
import { filterObservedEvalLogs } from '../lib/observedEvalRegistry'
import {
  DISCIPLINE_OPTIONS,
  buildActivityFeed,
  buildSubTopicOptions,
  buildTrendSeries,
  computeProgressStats,
  filterProgressLogs,
  getLogDisciplineTag,
  getLogSuccessOrAccuracy,
} from '../lib/progressAnalytics'
import PerformanceTrendChart from '../components/progress/PerformanceTrendChart'
import ProgressHudPanels, { EXPANDED_HUD_PANEL_IDS } from '../components/progress/ProgressHudPanels'
import { resolveLogFocusId } from '../lib/progressHudAnalytics'
import { buildLogsById } from '../lib/progressTacticalTooltip'

/** @typedef {import('../lib/progressAnalytics').DisciplineFilter} DisciplineFilter */
/** @typedef {import('../lib/progressAnalytics').TimeframeFilter} TimeframeFilter */

const TIMEFRAME_TABS = [
  { id: /** @type {TimeframeFilter} */ ('7d'), label: '7 GÜN' },
  { id: '30d', label: '30 GÜN' },
  { id: 'all', label: 'TÜM ZAMANLAR' },
]

const TAG_COLORS = {
  ATIS: 'border-sky-500/40 bg-sky-950/40 text-sky-400',
  CQB: 'border-amber-500/40 bg-amber-950/40 text-amber-400',
  TCCC: 'border-rose-500/40 bg-rose-950/40 text-rose-400',
  FOF: 'border-violet-500/40 bg-violet-950/40 text-violet-400',
  VBSS: 'border-blue-500/40 bg-blue-950/40 text-blue-400',
  OTHER: 'border-slate-600 bg-slate-900 text-app-text/70',
}

const selectClass =
  'w-full rounded-sm border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-wider text-app-text outline-none transition-colors focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/20'

const selectDisabledClass =
  'cursor-not-allowed border-slate-800/80 bg-slate-900/60 text-app-text/55 opacity-60 focus:border-slate-800 focus:ring-0'

/** @param {number | null | undefined} score */
function orsScoreTone(score) {
  if (score == null) return 'text-app-text/55 border-slate-800 bg-slate-900/50'
  if (score >= 85) return 'text-emerald-400 border-emerald-800/60 bg-emerald-950/40 shadow-[0_0_18px_rgba(52,211,153,0.12)]'
  if (score >= 50) return 'text-amber-400 border-amber-800/60 bg-amber-950/30'
  return 'text-rose-400 border-rose-800/70 bg-rose-950/30 shadow-[0_0_14px_rgba(244,63,94,0.15)]'
}

/**
 * @param {{
 *   label: React.ReactNode
 *   value: string
 *   options: { id: string; label: string }[]
 *   onChange: (id: string) => void
 *   disabled?: boolean
 *   hint?: React.ReactNode
 * }} props
 */
function TacticalFilterSelect({ label, value, options, onChange, disabled = false, hint = null }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(/** @type {HTMLDivElement | null} */ (null))

  useEffect(() => {
    if (!open) return undefined
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(/** @type {Node} */ (e.target))) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  useEffect(() => {
    if (disabled) setOpen(false)
  }, [disabled])

  const selected = options.find((o) => o.id === value) ?? options[0]

  return (
    <div ref={rootRef} className={['relative min-h-[4.75rem] space-y-1.5', open ? 'z-[80]' : 'z-30'].join(' ')}>
      <span className="block text-[9px] font-bold uppercase tracking-wider text-app-text/55">{label}</span>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={[
          'flex w-full items-center justify-between gap-2 rounded-sm border px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-wider transition-colors',
          disabled ? selectDisabledClass : selectClass,
          open && !disabled ? 'border-emerald-500/60 ring-1 ring-emerald-500/20' : '',
        ].join(' ')}
      >
        <span className="min-w-0 truncate text-left text-app-text">{selected?.label ?? '—'}</span>
        <ChevronDown
          className={['size-4 shrink-0 text-emerald-500/80 transition-transform', open ? 'rotate-180' : ''].join(
            ' '
          )}
          strokeWidth={2}
          aria-hidden
        />
      </button>
      {open && !disabled ? (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-full z-[100] mt-1 max-h-52 overflow-y-auto overscroll-contain rounded-sm border border-emerald-800/45 bg-slate-950 py-1 shadow-[0_16px_48px_rgba(0,0,0,0.72)]"
        >
          {options.map((opt) => {
            const active = opt.id === value
            return (
              <li key={opt.id} role="option" aria-selected={active}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(opt.id)
                    setOpen(false)
                  }}
                  className={[
                    'w-full px-3 py-2 text-left font-mono text-[10px] font-bold uppercase tracking-wider transition-colors',
                    active
                      ? 'bg-emerald-950/90 text-emerald-400'
                      : 'text-app-text/90 hover:bg-slate-900 hover:text-emerald-300',
                  ].join(' ')}
                >
                  {opt.label}
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
      {hint}
    </div>
  )
}

function OrsHudReadout({ score, loading = false, penaltyCount = 0, tcccPenaltyActive = false }) {
  const tone = orsScoreTone(score)
  return (
    <div
      className={[
        'rounded-lg border px-4 py-2.5 text-right transition-all duration-500',
        tone,
        tcccPenaltyActive ? 'ring-1 ring-rose-500/50 shadow-[0_0_18px_rgba(244,63,94,0.3)]' : '',
      ].join(' ')}
    >
      <p className="font-mono text-[8px] font-bold uppercase tracking-[0.28em] text-app-text/55">
        ORS · OPERASYONEL HAZIRLIK
      </p>
      {loading ? (
        <p className="mt-1 font-mono text-lg font-black uppercase tracking-wider text-app-text/45 animate-pulse">
          —
        </p>
      ) : (
        <p className="mt-0.5 font-mono text-3xl font-black tabular-nums leading-none">
          {score != null ? score : '—'}
        </p>
      )}
      <p className="mt-1 font-mono text-[8px] font-bold uppercase tracking-wider text-app-text/45">
        {loading
          ? 'MOTOR SENKRON...'
          : score != null
            ? `CANLI · ${penaltyCount > 0 ? `${penaltyCount} CEZA` : 'MOTOR AKTİF'}`
            : 'VERİ BEKLENİYOR'}
      </p>
      {tcccPenaltyActive && !loading ? (
        <p className="mt-1 font-mono text-[8px] font-bold uppercase tracking-wider text-rose-400 animate-pulse">
          HATA_KODU: TCCC EŞİK ALTINDA · −14 ORS
        </p>
      ) : null}
    </div>
  )
}

/**
 * @param {{
 *   label: string
 *   value: string | number
 *   sub?: string
 *   accent?: 'emerald' | 'amber' | 'rose' | 'slate'
 *   progress?: number
 *   animate?: boolean
 *   warning?: boolean
 * }} props
 */
function KpiCard({ label, value, sub, accent = 'emerald', progress, animate = false, warning = false }) {
  const valueColor =
    accent === 'amber'
      ? 'text-amber-400'
      : accent === 'rose'
        ? 'text-rose-400'
        : accent === 'slate'
          ? 'text-app-text'
          : 'text-emerald-400'

  const barTone =
    accent === 'amber'
      ? 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.45)]'
      : accent === 'rose'
        ? 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.5)]'
        : 'bg-emerald-500 shadow-[0_0_12px_rgba(52,211,153,0.5)]'

  return (
    <div
      className={[
        'rounded-xl border bg-slate-950 p-4 transition-colors',
        warning ? 'border-rose-800/80 bg-rose-950/20' : 'border-slate-800',
      ].join(' ')}
    >
      <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-app-text/55">{label}</p>
      <p className={`mt-2 font-mono text-2xl font-black tabular-nums ${valueColor}`}>{value}</p>
      {sub ? <p className="mt-1 font-mono text-[9px] uppercase tracking-wider text-app-text/45">{sub}</p> : null}
      {progress != null ? (
        <div className="mt-3 h-1.5 overflow-hidden rounded-sm border border-slate-800 bg-slate-900">
          <div
            className={`h-full rounded-sm transition-all duration-1000 ease-out ${barTone}`}
            style={{ width: animate ? `${Math.min(100, Math.max(0, progress))}%` : '0%' }}
          />
        </div>
      ) : null}
    </div>
  )
}

/** @typedef {typeof EXPANDED_HUD_PANEL_IDS[number]} ExpandedHudPanelId */

/**
 * @param {{ feed: { id: string; tag: string; title: string; timestampMs: number; success: number | null; unverified?: boolean }[] }} props
 */
function ActivityFeedPanel({ feed, selectedLogId = null, onSelectLog }) {
  if (feed.length === 0) {
    return (
      <p className="py-8 text-center font-mono text-[10px] uppercase tracking-wider text-app-text/45">
        KAYIT AKIŞI BOŞ
      </p>
    )
  }

  return (
    <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
      {feed.map((item) => {
        const tagClass = TAG_COLORS[/** @type {keyof typeof TAG_COLORS} */ (item.tag)] ?? TAG_COLORS.OTHER
        const when = item.timestampMs
          ? new Date(item.timestampMs).toLocaleString('tr-TR', {
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })
          : '—'

        const selected = selectedLogId === item.id

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectLog?.(item.id)}
            className={[
              'flex w-full cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors',
              item.unverified ? 'opacity-60' : '',
              selected
                ? 'border-amber-500/55 bg-amber-950/25 shadow-[0_0_16px_rgba(245,158,11,0.12)]'
                : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/50',
            ].join(' ')}
            aria-pressed={selected}
          >
            <span className={`shrink-0 rounded border px-1.5 py-0.5 font-mono text-[8px] font-bold ${tagClass}`}>
              [{item.tag}]
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-mono text-[11px] font-bold uppercase text-app-text">{item.title}</p>
              <p className="mt-0.5 font-mono text-[9px] text-app-text/55">{when}</p>
              {item.unverified ? (
                <p className="mt-1 font-mono text-[8px] font-bold uppercase tracking-wider text-amber-500/85">
                  Gözlem · Doğrulanmadı
                </p>
              ) : null}
            </div>
            {item.success != null ? (
              <span
                className={[
                  'shrink-0 font-mono text-xs font-black tabular-nums',
                  selected ? 'text-amber-300' : 'text-emerald-400',
                ].join(' ')}
              >
                {item.success}%
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

/**
 * @param {{ logId: string; onRelease: () => void }} props
 */
function LogFocusBanner({ logId, onRelease }) {
  const shortId = logId.length > 12 ? logId.slice(-8).toUpperCase() : logId.toUpperCase()

  return (
    <div
      role="status"
      className="progress-log-focus-banner flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/45 bg-gradient-to-r from-amber-950/30 via-rose-950/20 to-amber-950/30 px-4 py-3"
    >
      <p className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300">
        <Crosshair className="size-4 shrink-0 text-rose-400" strokeWidth={1.5} aria-hidden />
        <span>
          [⚠️ OTURUMA KİLİTLENDİ: LOG_ID_{shortId}] - SPESİFİK ETKİNLİK VERİSİ İZOLE EDİLİYOR
        </span>
      </p>
      <button
        type="button"
        onClick={onRelease}
        className="inline-flex items-center gap-1.5 rounded border border-rose-500/50 bg-rose-950/40 px-3 py-1.5 font-mono text-[9px] font-bold uppercase tracking-wider text-rose-300 transition-colors hover:border-rose-400/70 hover:bg-rose-950/60"
      >
        <X className="size-3.5" aria-hidden />
        KİLİDİ KALDIR / X
      </button>
    </div>
  )
}

/**
 * @param {{ onBack?: () => void }} props
 */
export default function ProgressTracker({ onBack }) {
  const navigate = useNavigate()
  const { user, userData, loading, profileLoading, isConfigured } = useAuth()
  const inv = useAudazData('inventory')
  const trainings = useAudazData('trainings')
  const health = useAudazData('health_records')
  const vbssLogs = useAudazData('vbss_logs')
  const tcccLogs = useAudazData('tccc_logs')

  const [discipline, setDiscipline] = useState(/** @type {DisciplineFilter} */ ('all'))
  const [subTopic, setSubTopic] = useState('all')
  const [timeframe, setTimeframe] = useState(/** @type {TimeframeFilter} */ ('30d'))
  const [logs, setLogs] = useState(/** @type {Record<string, unknown>[]} */ ([]))
  const [logsLoading, setLogsLoading] = useState(true)
  const [barsAnimate, setBarsAnimate] = useState(false)
  const [focusedLogId, setFocusedLogId] = useState(/** @type {string | null} */ (null))
  const [hudExpandedPanel, setHudExpandedPanel] = useState(/** @type {ExpandedHudPanelId | null} */ (null))
  const hudOverlayActive = hudExpandedPanel != null

  const handleTrendExpand = () => {
    setHudExpandedPanel('TREND')
  }

  const uid = user?.uid ?? null
  const authBusy = loading || profileLoading
  const waitingUser = authBusy || !user
  const callsign = (userData?.callsign || user?.displayName || 'OPERATÖR').trim()

  const handleBack = onBack ?? (() => navigate('/dashboard'))

  useEffect(() => {
    if (!uid || !isFirebaseConfigured() || !db) {
      setLogs([])
      setLogsLoading(false)
      return undefined
    }

    setLogsLoading(true)
    let unsub = () => {}

    try {
      const entriesRef = collection(db, 'range_logs', uid, 'entries')
      const q = query(entriesRef, orderBy('updatedAt', 'desc'))

      unsub = onSnapshot(
        q,
        (snap) => {
          const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
          rows.sort((a, b) => {
            const tb =
              typeof b.updatedAt?.toMillis === 'function'
                ? b.updatedAt.toMillis()
                : Date.parse(String(b.timestamp || '')) || 0
            const ta =
              typeof a.updatedAt?.toMillis === 'function'
                ? a.updatedAt.toMillis()
                : Date.parse(String(a.timestamp || '')) || 0
            return tb - ta
          })
          setLogs(rows)
          setLogsLoading(false)
        },
        (err) => {
          emitFirebaseError(err)
          setLogsLoading(false)
        }
      )
    } catch (err) {
      emitFirebaseError(err)
      setLogsLoading(false)
    }

    return () => {
      const off = unsub
      window.setTimeout(() => {
        try {
          off()
        } catch {
          /* teardown */
        }
      }, 0)
    }
  }, [uid])

  useEffect(() => {
    setSubTopic('all')
  }, [discipline])

  const subTopics = useMemo(() => buildSubTopicOptions(logs, discipline), [logs, discipline])

  useEffect(() => {
    if (discipline === 'all') {
      if (subTopic !== 'all') setSubTopic('all')
      return
    }
    if (!subTopics.some((t) => t.id === subTopic)) {
      setSubTopic('all')
    }
  }, [discipline, subTopics, subTopic])

  const subTopicDisabled = discipline === 'all'

  const filteredLogs = useMemo(
    () => filterProgressLogs(logs, { discipline, subTopic, timeframe }, subTopics),
    [logs, discipline, subTopic, timeframe, subTopics]
  )

  const observedEvalLogs = useMemo(
    () => filterObservedEvalLogs([...vbssLogs.items, ...tcccLogs.items]),
    [vbssLogs.items, tcccLogs.items],
  )

  const filteredObservedEvalLogs = useMemo(
    () => filterProgressLogs(observedEvalLogs, { discipline, subTopic, timeframe }, subTopics),
    [observedEvalLogs, discipline, subTopic, timeframe, subTopics],
  )

  const activitySourceLogs = useMemo(
    () => [...filteredLogs, ...filteredObservedEvalLogs],
    [filteredLogs, filteredObservedEvalLogs],
  )

  const focusedLog = useMemo(() => {
    if (!focusedLogId) return null
    return filteredLogs.find((row) => resolveLogFocusId(row) === focusedLogId) ?? null
  }, [focusedLogId, filteredLogs])

  useEffect(() => {
    if (focusedLogId && !focusedLog) setFocusedLogId(null)
  }, [focusedLogId, focusedLog])

  const stats = useMemo(
    () => computeProgressStats(filteredLogs, { activeDiscipline: discipline }),
    [filteredLogs, discipline],
  )
  const displayStats = useMemo(
    () =>
      focusedLog
        ? computeProgressStats([focusedLog], { activeDiscipline: discipline })
        : stats,
    [focusedLog, stats, discipline],
  )

  const displayOverallSuccess = displayStats.overallSuccess
  const trendSeries = useMemo(() => buildTrendSeries(filteredLogs, 8), [filteredLogs])
  const displayTrendSeries = useMemo(() => {
    if (!focusedLog) return trendSeries
    return [
      {
        id: resolveLogFocusId(focusedLog),
        label: 'LOCK',
        value: getLogSuccessOrAccuracy(focusedLog) ?? 0,
        tag: getLogDisciplineTag(focusedLog),
      },
    ]
  }, [focusedLog, trendSeries])

  const trendChartSeries = useMemo(() => {
    const byId = buildLogsById(filteredLogs)
    return displayTrendSeries.map((bar) => ({
      ...bar,
      logRow: byId.get(bar.id) ?? null,
    }))
  }, [displayTrendSeries, filteredLogs])

  const activityFeed = useMemo(() => buildActivityFeed(activitySourceLogs, 24), [activitySourceLogs])

  const hudRadarLogs = useMemo(
    () => (focusedLog ? [focusedLog] : filteredLogs),
    [focusedLog, filteredLogs]
  )

  const orsReady = inv.ready && trainings.ready && health.ready && !logsLoading && !waitingUser
  const orsResult = useMemo(() => {
    if (!orsReady) return null
    return computeORS({
      inventory: inv.items,
      trainings: trainings.items,
      health: health.items,
      rangeLogs: logs,
      observedEvalLogs,
      nowMs: Date.now(),
    })
  }, [orsReady, inv.items, trainings.items, health.items, logs, observedEvalLogs])

  const tcccOrsPenaltyActive = useMemo(
    () =>
      Boolean(
        orsResult?.penalties?.some((p) =>
          String(p.code).includes('TCCC EŞİK ALTINDA')
        )
      ),
    [orsResult?.penalties]
  )

  useEffect(() => {
    setBarsAnimate(false)
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setBarsAnimate(true))
    })
    return () => cancelAnimationFrame(id)
  }, [filteredLogs, discipline, subTopic, timeframe, focusedLogId])

  const syncing = waitingUser || logsLoading

  return (
    <PageShell
      title="Başarı Takibi"
      subtitle="TACTICAL ANALYTICS HUB · OPERASYONEL PERFORMANS İSTİHBARATI"
      headerAction={<BarChart2 className="size-6 text-emerald-500/80" strokeWidth={1.5} aria-hidden />}
    >
      <div className="space-y-5 font-mono text-slate-100">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-2 rounded-sm border border-slate-800 bg-slate-900/60 px-4 py-2 text-xs font-bold uppercase tracking-wider text-app-text/70 transition-colors hover:border-emerald-800/50 hover:text-emerald-400"
          >
            <ArrowLeft className="size-4 shrink-0" strokeWidth={2} aria-hidden />
            KOMUTA MERKEZİNE DÖN
          </button>
          <div className="flex flex-col items-end gap-2">
            <OrsHudReadout
              score={orsResult?.score ?? null}
              loading={syncing || !orsReady}
              penaltyCount={orsResult?.penalties?.length ?? 0}
              tcccPenaltyActive={tcccOrsPenaltyActive}
            />
            <div className="text-right">
              <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-app-text/55">OPERATÖR</p>
              <p className="text-sm font-bold uppercase tracking-wider text-app-text">{callsign}</p>
            </div>
          </div>
        </div>

        {syncing ? (
          <div className="space-y-4 animate-pulse">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-emerald-500/80">
              SYNCHRONIZING OPERATOR DATA...
            </p>
            <div className="h-14 rounded-lg border border-slate-800 bg-slate-900/50" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="h-28 rounded-xl border border-slate-800 bg-slate-900/40" />
              ))}
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="h-64 rounded-xl border border-slate-800 bg-slate-900/40" />
              <div className="h-64 rounded-xl border border-slate-800 bg-slate-900/40" />
            </div>
          </div>
        ) : (
          <>
            <div className="relative z-50 isolate overflow-visible rounded-xl border border-slate-800 bg-slate-950 p-4">
              <div className="mb-4 flex items-center gap-2">
                <Filter className="size-4 text-emerald-500" strokeWidth={1.5} aria-hidden />
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-emerald-400">
                  TAKTİK FİLTRE MATRİSİ
                </p>
              </div>

              <div className="grid gap-3 overflow-visible lg:grid-cols-3 lg:items-start">
                <TacticalFilterSelect
                  label="ANA DİSİPLİN"
                  value={discipline}
                  options={DISCIPLINE_OPTIONS}
                  onChange={(id) => setDiscipline(/** @type {DisciplineFilter} */ (id))}
                />

                <TacticalFilterSelect
                  label={
                    <>
                      ALT GÖREV / KONU
                      {subTopicDisabled ? (
                        <span className="ml-2 text-emerald-600/80">· KİLİTLİ</span>
                      ) : null}
                    </>
                  }
                  value={subTopicDisabled ? 'all' : subTopic}
                  disabled={subTopicDisabled}
                  options={
                    subTopics.length > 0
                      ? subTopics.map((opt) => ({ id: opt.id, label: opt.label }))
                      : [{ id: 'all', label: 'TÜM GÖREVLER' }]
                  }
                  onChange={setSubTopic}
                  hint={
                    subTopicDisabled ? (
                      <p className="font-mono text-[8px] uppercase tracking-wider text-app-text/45">
                        TÜM DİSİPLİNLER · GÖREV FİLTRESİ DEVRE DIŞI
                      </p>
                    ) : subTopics.length <= 1 ? (
                      <p className="font-mono text-[8px] uppercase tracking-wider text-amber-600/80">
                        BU DİSİPLİNDE KAYIT YOK · ŞABLON LİSTESİ
                      </p>
                    ) : (
                      <p className="font-mono text-[8px] uppercase tracking-wider text-emerald-600/70">
                        {subTopics.length - 1} GÖREV · RANGE_LOGS SENKRON
                      </p>
                    )
                  }
                />

                <div className="space-y-1.5">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-app-text/55">
                    ZAMAN ARALIĞI
                  </span>
                  <div className="flex gap-1 rounded-sm border border-slate-800 bg-slate-900 p-1">
                    {TIMEFRAME_TABS.map((tab) => {
                      const active = timeframe === tab.id
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setTimeframe(tab.id)}
                          className={[
                            'flex-1 rounded-sm px-2 py-2 font-mono text-[9px] font-bold uppercase tracking-wider transition-all',
                            active
                              ? 'bg-emerald-600 text-slate-950 shadow-[0_0_12px_rgba(52,211,153,0.35)]'
                              : 'text-app-text/55 hover:text-app-text/90',
                          ].join(' ')}
                        >
                          {tab.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>

            {focusedLogId ? (
              <LogFocusBanner logId={focusedLogId} onRelease={() => setFocusedLogId(null)} />
            ) : null}

            <Link
              to="/ayarlar"
              className="group flex items-center gap-3 rounded-xl border border-emerald-900/35 bg-slate-950/80 px-4 py-3 transition hover:border-emerald-600/45 hover:bg-emerald-950/20"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded border border-emerald-600/35 bg-emerald-950/40 text-emerald-400">
                <Target className="size-5" strokeWidth={1.5} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400/90">
                  Taktik tim
                </span>
                <span className="mt-0.5 block font-mono text-[11px] text-app-text/65 group-hover:text-app-text/85">
                  Grubuna katılmak veya kadronu görmek için Ayarlar → Taktik Tim bölümüne git →
                </span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-emerald-500/70" strokeWidth={1.75} aria-hidden />
            </Link>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                label="GENEL BAŞARI ORANI"
                value={`%${displayOverallSuccess}`}
                sub={
                  focusedLog
                    ? 'TEK OTURUM · LOCK_ON_TARGET'
                    : discipline === 'all'
                      ? `${filteredLogs.length} OTURUM · ATIS+CQB+FOF+TCCC`
                      : `${filteredLogs.length} OTURUM · FİLTRELİ`
                }
                progress={displayOverallSuccess}
                animate={barsAnimate}
                accent="emerald"
              />
              <KpiCard
                label="TOPLAM KAYITLI OLAY"
                value={displayStats.totalEvents}
                sub={focusedLog ? 'İZOLE OTURUM' : 'RANGE_LOGS · FIRESTORE'}
                accent="slate"
              />
              <KpiCard
                label="ORTALAMA İSABET"
                value={`%${displayStats.avgAccuracy}`}
                progress={displayStats.avgAccuracy}
                animate={barsAnimate}
                accent="amber"
              />
              <KpiCard
                label="KRİTİK HATALAR"
                value={displayStats.criticalErrors}
                sub={
                  displayStats.criticalErrors > 0
                    ? focusedLog
                      ? 'BU GÖREVDE İHLAL'
                      : 'GÜVENLİK İHLALİ TESPİT EDİLDİ'
                    : 'EŞİK İÇİ · TEMİZ'
                }
                accent="rose"
                warning={displayStats.criticalErrors > 0}
              />
            </div>

            {!focusedLog && discipline === 'all' && displayStats.disciplineSuccess ? (
              <div className="grid gap-3 sm:grid-cols-3">
                <KpiCard
                  label="ATIŞ BAŞARI ORANI"
                  value={`%${displayStats.disciplineSuccess.atis}`}
                  sub={`${displayStats.categoryTotals?.atis ?? 0} OTURUM · ATIS`}
                  progress={displayStats.disciplineSuccess.atis}
                  animate={barsAnimate}
                  accent="slate"
                />
                <KpiCard
                  label="CQB BAŞARI ORANI"
                  value={`%${displayStats.disciplineSuccess.cqb}`}
                  sub={`${displayStats.categoryTotals?.cqb ?? 0} OTURUM · YAKIN MESAFE`}
                  progress={displayStats.disciplineSuccess.cqb}
                  animate={barsAnimate}
                  accent="amber"
                />
                <KpiCard
                  label="FOF BAŞARI ORANI"
                  value={`%${displayStats.disciplineSuccess.fof}`}
                  sub={`${displayStats.categoryTotals?.fof ?? 0} OTURUM · FORCE-ON-FORCE`}
                  progress={displayStats.disciplineSuccess.fof}
                  animate={barsAnimate}
                  accent="slate"
                />
              </div>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-2">
              <div
                className="flex min-w-0 flex-col"
                aria-hidden={hudOverlayActive ? true : undefined}
                {...(hudOverlayActive ? { inert: true } : {})}
              >
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 sm:p-4">
                  <div className="mb-4 flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <TrendingUp className="size-4 shrink-0 text-emerald-500" strokeWidth={1.5} aria-hidden />
                      <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-app-text sm:text-[11px] sm:tracking-[0.2em]">
                        PERFORMANS TRENDİ
                      </h2>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="font-mono text-[8px] uppercase text-app-text/45 sm:text-[9px]">
                        SON {trendSeries.length} OTURUM
                      </span>
                      <button
                        type="button"
                        onClick={handleTrendExpand}
                        className="rounded border border-slate-700 bg-slate-900/80 p-1.5 text-app-text/70 transition-colors hover:border-emerald-600/50 hover:text-emerald-400"
                        aria-label="Performans trendi tam ekran"
                      >
                        <Maximize2 className="size-4" strokeWidth={1.75} aria-hidden />
                      </button>
                    </div>
                  </div>
                  <PerformanceTrendChart barsAnimate={barsAnimate} series={trendChartSeries} />
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <div className="mb-4 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Activity className="size-4 text-sky-400" strokeWidth={1.5} aria-hidden />
                    <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-app-text">
                      CANLI KAYIT AKIŞI
                    </h2>
                  </div>
                  <Clock className="size-4 text-app-text/45" strokeWidth={1.5} aria-hidden />
                </div>
                <ActivityFeedPanel
                  feed={activityFeed}
                  selectedLogId={focusedLogId}
                  onSelectLog={setFocusedLogId}
                />
              </div>
            </div>

            <ProgressHudPanels
              logs={logs}
              focusedLogId={focusedLogId}
              radarLogs={hudRadarLogs}
              expandedPanel={hudExpandedPanel}
              onExpandedPanelChange={setHudExpandedPanel}
              trendSeries={trendChartSeries}
              barsAnimate={barsAnimate}
            />

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800/80 bg-slate-900/30 px-4 py-3">
              <div className="flex flex-wrap items-center gap-4 text-[9px] uppercase tracking-wider text-app-text/45">
                <span className="inline-flex items-center gap-1.5">
                  <Target className="size-3.5 text-emerald-500" aria-hidden />
                  {isConfigured ? 'FIRESTORE · CANLI' : 'OFFLINE MOD'}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Shield className="size-3.5 text-amber-500" aria-hidden />
                  TOPLAM HAM: {logs.length}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Award className="size-3.5 text-rose-500" aria-hidden />
                  FİLTRELİ: {filteredLogs.length}
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </PageShell>
  )
}
