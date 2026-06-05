import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Activity,
  AlertCircle,
  ChevronRight,
  ClipboardList,
  Clock,
  Crosshair,
  GraduationCap,
  HeartPulse,
  Loader2,
  MinusCircle,
  Package,
} from 'lucide-react'
import CircularProgress from '../components/ui/CircularProgress'
import DashboardSystemLog from '../components/dashboard/DashboardSystemLog'
import HudFluffDecor from '../components/dashboard/HudFluffDecor'
import OrsReadinessGauge from '../components/dashboard/OrsReadinessGauge'
import WeekActivityAreaChart from '../components/dashboard/WeekActivityAreaChart'
import HudTicker from '../components/ui/HudTicker'
import MiniTrendSpark from '../components/ui/MiniTrendSpark'
import TacticalPanel from '../components/ui/TacticalPanel'
import { WeaponMaintenanceAlarmFromInventory } from '../components/armory/WeaponMaintenanceAlarmPanel'
import { MetricCardSkeleton, RowSkeleton } from '../components/ui/DataSkeleton'
import { useAuth } from '../context/AuthContext'
import { useTcccAlerts } from '../context/TcccAlertContext'
import { useAudazData } from '../hooks/useAudazData'
import { buildSystemLogEntries, buildWeekActivitySeries } from '../lib/dashboardHudData'
import { computeORS } from '../lib/orsEngine'

function BracketLabel({ children }) {
  return (
    <p className="font-mono-technical text-xs font-semibold uppercase tracking-[0.35em] text-[#ffb400]">
      <span className="text-white/35">[ </span>
      {children}
      <span className="text-white/35"> ]</span>
    </p>
  )
}

function MetricHudCard(props) {
  const Icon = props.icon
  const { title, children, footer, sparkSeed, trend, loading, embed, className = '' } = props
  const inner = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className="size-5 shrink-0 text-[#ffb400]" strokeWidth={1.5} aria-hidden />
          <h3 className="font-display text-[11px] font-semibold uppercase tracking-[0.22em] text-[#d4af37]">{title}</h3>
        </div>
        <MiniTrendSpark seed={sparkSeed} trend={trend} />
      </div>
      <div className="relative mt-3 flex flex-1 flex-col items-center justify-center gap-1.5 overflow-hidden">{children}</div>
      {footer ? <div className="mt-2 flex justify-center">{footer}</div> : null}
    </>
  )
  if (embed) {
    return (
      <div className={`relative px-3 py-3 sm:px-4 sm:py-4 ${loading ? 'hud-scanning' : ''} ${className}`.trim()}>
        {inner}
      </div>
    )
  }
  return (
    <TacticalPanel className={`flex flex-col p-4 sm:p-5 ${className}`.trim()} scanning={Boolean(loading)}>
      {inner}
    </TacticalPanel>
  )
}

/** @param {string | undefined} status */
function statusLooksComplete(status) {
  const s = String(status ?? '').toLowerCase()
  if (!s) return false
  return (
    s.includes('tamam') ||
    s.includes('complete') ||
    s.includes('bitti') ||
    s.includes('done') ||
    s.includes('kapalı') ||
    s === 'closed'
  )
}

/** @param {string | undefined} status */
function missionHudStatus(status) {
  if (statusLooksComplete(status)) return 'DURUM: KAPALI'
  const s = String(status ?? '').toLowerCase()
  if (!s) return 'DURUM: BİLİNMEYEN'
  if (s.includes('bekle') || s.includes('pending') || s.includes('plan')) return 'DURUM: BEKLEMEDE'
  if (s.includes('aktif') || s.includes('devam') || s.includes('open')) return 'DURUM: AKTİF'
  return `DURUM: ${String(status).slice(0, 18).toUpperCase()}`
}

/** @param {string | undefined} status */
function trainingHudStatus(status) {
  if (statusLooksComplete(status)) return 'DURUM: TAMAMLANDI'
  const s = String(status ?? '').toLowerCase()
  if (!s) return 'DURUM: HAZIR'
  if (s.includes('bekle') || s.includes('pending') || s.includes('plan')) return 'DURUM: BEKLEMEDE'
  if (s.includes('devam') || s.includes('aktif')) return 'DURUM: DEVAM'
  return `DURUM: ${String(status).slice(0, 16).toUpperCase()}`
}

/** @param {Record<string, unknown>[]} trainings */
function trainingCompletionPct(trainings) {
  if (!trainings.length) return 0
  const done = trainings.filter((x) => statusLooksComplete(/** @type {string} */ (x.status))).length
  return Math.round((done / trainings.length) * 100)
}

function formatShortDate(row) {
  const u = row.updatedAt ?? row.createdAt ?? row.performedAt ?? row.dueAt
  if (u && typeof u.toMillis === 'function') {
    return new Date(u.toMillis()).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
  }
  return ''
}

/** @param {unknown} v */
function toNum(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

/** @param {unknown} role */
function accessBadge(role) {
  const r = String(role || 'operator').toLowerCase()
  if (r === 'admin')
    return { label: 'SEV-5 · SİSTEM', className: 'border-red-400/35 bg-red-950/35 text-red-300' }
  if (r.includes('command') || r === 'cmd')
    return { label: 'SEV-3 · KOMUTA', className: 'border-sky-400/35 bg-sky-950/30 text-sky-300' }
  return { label: 'SEV-1 · ERİŞİM', className: 'border-emerald-500/35 bg-emerald-950/25 text-emerald-300/95' }
}

function DataLoadingBanner() {
  return (
    <div
      className="hud-scanning flex min-h-[3.5rem] items-center rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 backdrop-blur-md"
      role="status"
      aria-live="polite"
    >
      <span className="pointer-events-none mr-3 font-mono-technical text-[10px] uppercase tracking-widest text-[#ffb400]/80">
        TARAMA
      </span>
      <span
        className="inline-block size-4 shrink-0 animate-spin rounded-full border-2 border-[#ffb400] border-t-transparent"
        aria-hidden
      />
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { userData, profileLoading } = useAuth()
  const m = useAudazData('missions')
  const t = useAudazData('trainings')
  const inv = useAudazData('inventory')
  const rangeLogs = useAudazData('range_logs')
  const h = useAudazData('health_records')

  const [sessionOpenedMs] = useState(() => Date.now())
  const [ammoBusy, setAmmoBusy] = useState(false)
  /** ORS için 24s/7g sınırlarının zamanla güncellenmesi (24h olay penceresi vb.) */
  const [orsClock, setOrsClock] = useState(0)

  useEffect(() => {
    const id = window.setInterval(() => setOrsClock((c) => c + 1), 30000)
    return () => window.clearInterval(id)
  }, [])

  const allReady = m.ready && t.ready && inv.ready && h.ready
  const dataLoading = allReady && (m.loading || t.loading || inv.loading || h.loading)

  const anyErr = Boolean(m.listenError || t.listenError || inv.listenError || h.listenError)
  const trainPct = trainingCompletionPct(t.items)

  const recentMissions = useMemo(() => m.items.slice(0, 3), [m.items])
  const recentTrainings = useMemo(() => t.items.slice(0, 3), [t.items])

  const nextTrainingFocus = useMemo(() => {
    const open = t.items.find((row) => !statusLooksComplete(/** @type {string} */ (row.status)))
    return open ?? t.items[0] ?? null
  }, [t.items])

  const logEntries = useMemo(
    () =>
      buildSystemLogEntries({
        missions: m.items,
        trainings: t.items,
        inventory: inv.items,
        health: h.items,
        sessionOpenMs: sessionOpenedMs,
      }),
    [m.items, t.items, inv.items, h.items, sessionOpenedMs]
  )

  const weekSeries = useMemo(
    () => buildWeekActivitySeries(m.items, t.items, inv.items, h.items),
    [m.items, t.items, inv.items, h.items]
  )

  const orsResult = useMemo(() => {
    void orsClock
    if (!m.ready || !t.ready || !inv.ready || !h.ready || !rangeLogs.ready) return null
    return computeORS({
      inventory: inv.items,
      trainings: t.items,
      health: h.items,
      rangeLogs: rangeLogs.items,
      nowMs: Date.now(),
    })
  }, [
    m.ready,
    t.ready,
    inv.ready,
    h.ready,
    rangeLogs.ready,
    t.items,
    inv.items,
    h.items,
    rangeLogs.items,
    orsClock,
  ])

  const sparkM = Math.max(1, m.items.length * 104729 + 1703)
  const sparkT = Math.max(1, t.items.length * 7919 + trainPct * 43)
  const sparkI = Math.max(1, inv.items.length * 7937 + 491)

  const trendM = m.items.length >= 3 ? 'up' : m.items.length <= 1 ? 'down' : 'neutral'
  const trendT = trainPct >= 50 ? 'up' : trainPct <= 20 ? 'down' : 'neutral'
  const trendI = inv.items.length % 4 < 2 ? 'up' : 'neutral'

  const badge = accessBadge(userData?.role)
  const tcccAlerts = useTcccAlerts()

  const handleQuickTccc = () => {
    navigate('/tccc', { state: { quickRecord: true } })
  }

  const handleAmmoDown = async () => {
    if (!inv.ready || ammoBusy) return
    const rows = inv.items.filter((row) => String(row.category) === 'Mühimmat')
    rows.sort((a, b) => toNum(b.quantity) - toNum(a.quantity))
    const row = rows[0]
    if (!row?.id) return
    setAmmoBusy(true)
    try {
      const next = Math.max(0, Math.floor(toNum(row.quantity)) - 1)
      await inv.updateItem(row.id, { quantity: next })
    } finally {
      setAmmoBusy(false)
    }
  }

  return (
    <div className="dashboard-hud-shell relative mx-auto max-w-[1480px] px-3 py-5 pt-12 sm:px-4 sm:pt-14 md:px-6">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
        <HudFluffDecor />
      </div>

      <div className="relative z-[2]">
        <WeaponMaintenanceAlarmFromInventory
          inventory={inv.items}
          rangeLogs={rangeLogs.items}
          updateItem={inv.updateItem}
          className="mb-4"
        />
        <header className="relative z-[1] mb-2 space-y-2 border-b border-white/10 pb-3 sm:mb-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div className="space-y-2">
                <BracketLabel>SİSTEM</BracketLabel>
                {profileLoading ? (
                  <DataLoadingBanner />
                ) : (
                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-2">
                    <h1 className="font-display text-xl font-bold tracking-[0.08em] text-white sm:text-2xl md:text-3xl">
                      <span className="text-gold-glow">{userData?.callsign ?? '—'}</span>
                      <span className="text-slate-600"> · </span>
                      <span className="text-slate-400">{userData?.status ?? '—'}</span>
                    </h1>
                    <span
                      className={`inline-flex w-fit items-center rounded border px-2.5 py-1 font-mono-technical text-[9px] font-bold uppercase tracking-wider shadow-[inset_0_0_12px_-4px_rgba(255,255,255,0.06)] ${badge.className}`}
                      title="Erişim seviyesi"
                    >
                      {badge.label}
                    </span>
                    <span
                      className="inline-flex w-fit items-center gap-1.5 rounded border border-[#ffb400]/35 bg-[#ffb400]/10 px-2.5 py-1 font-mono-technical text-[10px] font-semibold uppercase tracking-wider text-[#ffb400] shadow-[0_0_14px_-4px_rgba(255,180,0,0.4)]"
                      title="Kan grubu"
                    >
                      <span className="opacity-70">◎</span>
                      {userData?.bloodType ?? '—'}
                    </span>
                  </div>
                )}
              </div>
              <HudTicker />
            </div>
            <div className="flex flex-wrap gap-3 text-[10px] text-slate-600">
              <span className="font-mono-technical tabular-nums">
                IZGARA_REF {String((m.items.length ^ t.items.length ^ inv.items.length ^ h.items.length) % 997).padStart(3, '0')}
              </span>
              <span className="font-mono-technical tabular-nums">KANAL_A7</span>
              <span className="font-mono-technical tabular-nums">İMZ_OK</span>
            </div>
            <div className="h-px max-w-xl bg-gradient-to-r from-[#ffb400]/45 via-white/15 to-transparent" aria-hidden />
        </header>

        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_min(280px,30%)] lg:items-start lg:gap-3">
          <div className="min-w-0 space-y-2">
            {allReady && orsResult ? (
            <div className="flex w-full justify-center px-2">
              <OrsReadinessGauge score={orsResult.score} penalties={orsResult.penalties} loading={Boolean(dataLoading)} />
            </div>
            ) : null}

          {anyErr ? (
            <div
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-amber-950/20 px-3 py-2 text-amber-200/90 backdrop-blur-md"
              role="status"
            >
              <AlertCircle className="size-4 shrink-0" strokeWidth={1.5} aria-hidden />
              <span className="font-mono-technical text-[10px] tracking-wider">VERİ_AKIŞI_HATASI</span>
            </div>
          ) : null}

          {!allReady ? (
            <section aria-label="Gösterge iskeleti" className="grid gap-1.5 md:grid-cols-3">
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
            </section>
          ) : (
            <>
              <TacticalPanel className="overflow-hidden p-0">
                {dataLoading ? (
                  <div className="grid gap-1.5 p-2 md:grid-cols-3">
                    <MetricCardSkeleton />
                    <MetricCardSkeleton />
                    <MetricCardSkeleton />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 divide-y divide-white/[0.12] md:grid-cols-3 md:divide-x md:divide-y-0">
                      <MetricHudCard
                        embed
                        icon={ClipboardList}
                        title="AKTİF GÖREV"
                        sparkSeed={sparkM}
                        trend={trendM}
                        loading={m.loading}
                        footer={<Clock className="size-3.5 text-slate-600" aria-hidden />}
                      >
                        <p className="hud-value-pulse font-mono-technical text-3xl font-bold tabular-nums text-white sm:text-4xl">
                          {m.items.length}
                        </p>
                        <p className="font-mono-technical text-[9px] tabular-nums text-slate-600">SAYI</p>
                      </MetricHudCard>

                      <MetricHudCard
                        embed
                        icon={GraduationCap}
                        title="EĞİTİM"
                        sparkSeed={sparkT}
                        trend={trendT}
                        loading={t.loading}
                      >
                        <div className="relative flex items-center justify-center" title="Tamamlanma oranı">
                          <CircularProgress percent={trainPct} size={100} stroke={5} />
                          <span className="absolute font-mono-technical text-xl font-bold text-[#ffb400]">{trainPct}%</span>
                        </div>
                        <p className="font-mono-technical text-[9px] tabular-nums text-slate-600">TAMAMLANMA · KAYIT {t.items.length}</p>
                      </MetricHudCard>

                      <MetricHudCard
                        embed
                        icon={Package}
                        title="CEPHANELİK"
                        sparkSeed={sparkI}
                        trend={trendI}
                        loading={inv.loading}
                      >
                        <p className="hud-value-pulse font-mono-technical text-3xl font-bold tabular-nums text-white sm:text-4xl">
                          {inv.items.length}
                        </p>
                        <p className="font-mono-technical text-[9px] tabular-nums text-slate-600">ENVANTER ENDEKSİ</p>
                      </MetricHudCard>
                    </div>

                    <div className="flex flex-wrap gap-2 border-t border-white/10 px-3 py-2">
                      <button
                        type="button"
                        onClick={handleQuickTccc}
                        className="relative inline-flex items-center gap-2 rounded border border-red-500/45 bg-red-950/40 px-3 py-2 font-mono-technical text-[9px] font-bold uppercase tracking-[0.18em] text-red-300 transition hover:bg-red-950/60"
                        title={
                          tcccAlerts.hasCriticalExpiry
                            ? `IFAK SKT uyarısı · ${tcccAlerts.criticalCount} kritik kalem`
                            : 'Saha TCCC kaydı'
                        }
                      >
                        <HeartPulse className="size-3.5 text-red-400" strokeWidth={1.65} aria-hidden />
                        HIZLI_TCCC
                        {tcccAlerts.hasCriticalExpiry ? (
                          <span
                            className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full border border-amber-400/80 bg-amber-500 text-[8px] font-black text-black shadow-[0_0_10px_rgba(251,191,36,0.6)] animate-pulse"
                            aria-label={`${tcccAlerts.criticalCount} IFAK son kullanım uyarısı`}
                          >
                            !
                          </span>
                        ) : null}
                      </button>
                      <button
                        type="button"
                        disabled={ammoBusy || !inv.items.some((row) => String(row.category) === 'Mühimmat')}
                        onClick={handleAmmoDown}
                        className="inline-flex items-center gap-2 rounded border border-[#ffb400]/45 bg-[#ffb400]/10 px-3 py-2 font-mono-technical text-[9px] font-bold uppercase tracking-[0.18em] text-[#ffb400] transition hover:bg-[#ffb400]/18 disabled:cursor-not-allowed disabled:opacity-35"
                        title="İlk mühimmat satırı −1"
                      >
                        {ammoBusy ? (
                          <Loader2 className="size-3.5 animate-spin" strokeWidth={2} aria-hidden />
                        ) : (
                          <MinusCircle className="size-3.5" strokeWidth={1.65} aria-hidden />
                        )}
                        MÜHİMMAT_ÇIKIŞ
                      </button>
                    </div>

                    <div className="border-t border-white/10 px-3 py-3">
                      <div className="flex flex-wrap items-end justify-between gap-2">
                        <div>
                          <p className="font-mono-technical text-[10px] font-bold uppercase tracking-[0.32em] text-[#00FF41]/85">
                            HAFTALIK AKTİVİTE
                          </p>
                          <p className="mt-0.5 font-mono-technical text-[9px] text-slate-600">7G · UTC GÜN KOVASI</p>
                        </div>
                        <Activity className="size-7 text-[#00FF41]/20" aria-hidden />
                      </div>
                      <WeekActivityAreaChart data={weekSeries} loading={Boolean(m.loading || t.loading || inv.loading || h.loading)} />
                    </div>

                    <div className="grid grid-cols-1 divide-y divide-white/10 lg:grid-cols-2 lg:divide-x lg:divide-y-0">
                      <div className="flex flex-col p-3 sm:p-3.5">
                        <div className="flex shrink-0 items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <ClipboardList className="size-4 text-[#ffb400]" strokeWidth={1.5} aria-hidden />
                            <h2 className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-[#ffb400]">GÖREV ÖZET</h2>
                          </div>
                          <Link to="/gorevler" className="rounded p-1 text-slate-500 transition hover:text-[#ffb400]" aria-label="Görevler">
                            <ChevronRight className="size-4" strokeWidth={2} />
                          </Link>
                        </div>
                        {!m.ready ? (
                          <RowSkeleton rows={3} />
                        ) : m.loading ? (
                          <RowSkeleton rows={3} />
                        ) : recentMissions.length === 0 ? (
                          <div className="mt-2 flex items-center gap-2 rounded border border-dashed border-white/12 bg-black/35 px-2.5 py-2.5">
                            <ClipboardList className="size-7 shrink-0 text-slate-800" strokeWidth={1} aria-hidden />
                            <div className="font-mono-technical text-[9px] text-slate-600">
                              <p className="text-slate-500">GÖREV KUYRUĞU BOŞ</p>
                              <p className="mt-0.5 text-[#00FF41]/70">DURUM: BEKLEMEDE</p>
                            </div>
                          </div>
                        ) : (
                          <ul className="mt-2 space-y-1.5">
                            {recentMissions.map((row, idx) => (
                              <li
                                key={row.id}
                                className="rounded border border-white/10 bg-black/40 px-2.5 py-2 transition hover:border-[#ffb400]/25"
                              >
                                <div className="flex items-start gap-2">
                                  <span className="mt-px font-mono-technical text-[8px] text-slate-600">SIRA_{idx + 1}</span>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate font-mono-technical text-[10px] font-semibold text-slate-200">
                                      {typeof row.title === 'string' && row.title ? row.title : 'ADSIZ_GÖREV'}
                                    </p>
                                    <p className="mt-0.5 font-mono-technical text-[8px] text-[#ffb400]/75">
                                      {missionHudStatus(/** @type {string} */ (row.status))}
                                    </p>
                                    <p className="mt-0.5 font-mono-technical text-[8px] text-slate-600">
                                      HEDEF {formatShortDate(row)} · SENK {typeof row.updatedAt?.toMillis === 'function' ? 'TX' : '—'}
                                    </p>
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div className="flex flex-col p-3 sm:p-3.5">
                        <div className="flex shrink-0 items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Crosshair className="size-4 text-[#ffb400]" strokeWidth={1.5} aria-hidden />
                            <h2 className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-[#ffb400]">EĞİTİM YIĞINI</h2>
                          </div>
                          <Link to="/antrenman" className="rounded p-1 text-slate-500 transition hover:text-[#ffb400]" aria-label="Antrenman">
                            <ChevronRight className="size-4" strokeWidth={2} />
                          </Link>
                        </div>

                        {nextTrainingFocus ? (
                          <div className="mt-2 rounded border border-sky-500/25 bg-sky-950/15 px-2.5 py-2">
                            <p className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.28em] text-sky-400/90">BİRİNCİL HEDEF</p>
                            <p className="mt-1 truncate font-mono-technical text-[10px] font-semibold text-slate-100">
                              {typeof nextTrainingFocus.title === 'string' && nextTrainingFocus.title ? nextTrainingFocus.title : '—'}
                            </p>
                            <p className="mt-0.5 font-mono-technical text-[8px] text-sky-300/85">
                              {trainingHudStatus(/** @type {string} */ (nextTrainingFocus.status))}
                            </p>
                            <p className="mt-0.5 font-mono-technical text-[8px] text-slate-600">
                              BRANŞ {String(nextTrainingFocus.discipline ?? '—')} · FAZ OP
                            </p>
                          </div>
                        ) : null}

                        {!t.ready ? (
                          <RowSkeleton rows={3} />
                        ) : t.loading ? (
                          <RowSkeleton rows={3} />
                        ) : recentTrainings.length === 0 ? (
                          <div className="mt-2 flex items-center gap-2 rounded border border-dashed border-white/12 bg-black/30 px-2.5 py-2.5">
                            <GraduationCap className="size-7 shrink-0 text-slate-800" strokeWidth={1} aria-hidden />
                            <div className="font-mono-technical text-[9px] text-slate-600">
                              <p>YIĞIN BOŞ</p>
                              <p className="mt-0.5 text-[#00FF41]/70">DURUM: BEKLEMEDE</p>
                            </div>
                          </div>
                        ) : (
                          <ul className="mt-2 space-y-1.5">
                            {recentTrainings.map((row, idx) => (
                              <li key={row.id} className="rounded border border-white/10 bg-black/35 px-2.5 py-2">
                                <div className="flex items-start gap-2">
                                  <span className="mt-px font-mono-technical text-[8px] text-slate-600">K_{idx + 1}</span>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate font-mono-technical text-[10px] font-semibold text-slate-200">
                                      {typeof row.title === 'string' && row.title ? row.title : '—'}
                                    </p>
                                    <p className="mt-0.5 font-mono-technical text-[8px] text-emerald-400/85">
                                      {trainingHudStatus(/** @type {string} */ (row.status))}
                                    </p>
                                    <p className="mt-0.5 font-mono-technical text-[8px] text-slate-600">
                                      {String(row.discipline ?? '—')} · SIRA {idx + 1}
                                    </p>
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </TacticalPanel>
            </>
          )}
        </div>

        <aside className="relative z-10 min-w-0 lg:self-start" aria-label="Sistem günlükleri">
          <DashboardSystemLog entries={logEntries} />
        </aside>
        </div>
      </div>
    </div>
  )
}
