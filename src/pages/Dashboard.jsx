import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, Bell, ClipboardList } from 'lucide-react'
import CommandSideWidgets from '../components/dashboard/CommandSideWidgets'
import DashboardSystemLog from '../components/dashboard/DashboardSystemLog'
import OperationalRadarChart from '../components/dashboard/OperationalRadarChart'
import OrsReadinessGauge from '../components/dashboard/OrsReadinessGauge'
import { WeaponMaintenanceAlarmFromInventory } from '../components/armory/WeaponMaintenanceAlarmPanel'
import { RowSkeleton } from '../components/ui/DataSkeleton'
import { useAuth } from '../context/AuthContext'
import { useMuhabereNotify } from '../context/MuhabereNotifyContext'
import { useAudazData } from '../hooks/useAudazData'
import { buildSystemLogEntries } from '../lib/dashboardHudData'
import { computeORS } from '../lib/orsEngine'
import { filterObservedEvalLogs } from '../lib/observedEvalRegistry'

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
function missionStatusLabel(status) {
  if (statusLooksComplete(status)) return 'Kapalı'
  const s = String(status ?? '').toLowerCase()
  if (!s) return 'Beklemede'
  if (s.includes('bekle') || s.includes('pending') || s.includes('plan')) return 'Beklemede'
  if (s.includes('aktif') || s.includes('devam') || s.includes('open')) return 'Aktif'
  return String(status).slice(0, 24)
}

/** @param {string | undefined} status */
function missionSeverity(status) {
  const s = String(status ?? '').toLowerCase()
  if (s.includes('krit') || s.includes('acil') || s.includes('critical') || s.includes('alarm')) {
    return 'critical'
  }
  if (s.includes('aktif') || s.includes('devam') || s.includes('open')) return 'active'
  if (!s || s.includes('bekle') || s.includes('pending') || s.includes('plan')) return 'warning'
  return 'warning'
}

function formatShortDate(row) {
  const u = row.updatedAt ?? row.createdAt ?? row.performedAt ?? row.dueAt
  if (u && typeof u.toMillis === 'function') {
    return new Date(u.toMillis()).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
  }
  return '—'
}

export default function Dashboard() {
  const { userData, profileLoading } = useAuth()
  const { totalNotifications } = useMuhabereNotify()
  const m = useAudazData('missions')
  const t = useAudazData('trainings')
  const inv = useAudazData('inventory')
  const rangeLogs = useAudazData('range_logs')
  const vbssLogs = useAudazData('vbss_logs')
  const tcccLogs = useAudazData('tccc_logs')
  const h = useAudazData('health_records')

  const [sessionOpenedMs] = useState(() => Date.now())
  const [orsClock, setOrsClock] = useState(0)

  useEffect(() => {
    const id = window.setInterval(() => setOrsClock((c) => c + 1), 30000)
    return () => window.clearInterval(id)
  }, [])

  const anyErr = Boolean(m.listenError || t.listenError || inv.listenError || h.listenError)
  const orsLoading =
    !m.ready || !t.ready || !inv.ready || !h.ready || !rangeLogs.ready || !vbssLogs.ready || !tcccLogs.ready

  const observedEvalLogs = useMemo(
    () => filterObservedEvalLogs([...vbssLogs.items, ...tcccLogs.items]),
    [vbssLogs.items, tcccLogs.items],
  )

  const activeMissions = useMemo(
    () => m.items.filter((row) => !statusLooksComplete(/** @type {string} */ (row.status))),
    [m.items]
  )

  const pendingMissions = useMemo(() => {
    return activeMissions.filter((row) => {
      const s = String(row.status ?? '').toLowerCase()
      return !s || s.includes('bekle') || s.includes('pending') || s.includes('plan')
    })
  }, [activeMissions])

  const inProgressMissions = useMemo(() => {
    return activeMissions.filter((row) => {
      const s = String(row.status ?? '').toLowerCase()
      return s && (s.includes('aktif') || s.includes('devam') || s.includes('open'))
    })
  }, [activeMissions])

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

  const orsResult = useMemo(() => {
    void orsClock
    if (orsLoading) return null
    return computeORS({
      inventory: inv.items,
      trainings: t.items,
      health: h.items,
      rangeLogs: rangeLogs.items,
      observedEvalLogs,
      nowMs: Date.now(),
    })
  }, [
    orsLoading,
    t.items,
    inv.items,
    h.items,
    rangeLogs.items,
    observedEvalLogs,
    orsClock,
  ])

  const heroMessage = useMemo(() => {
    if (pendingMissions.length > 0) {
      return `Sırada bekleyen ${pendingMissions.length} operasyonunuz var`
    }
    if (inProgressMissions.length > 0) {
      return `${inProgressMissions.length} aktif operasyon devam ediyor`
    }
    if (activeMissions.length > 0) {
      return `${activeMissions.length} açık görev kayıtlı`
    }
    return 'Operasyonel durum hazır — bekleyen görev yok'
  }, [pendingMissions.length, inProgressMissions.length, activeMissions.length])

  const radarData = useMemo(() => {
    if (!orsResult) {
      return [
        { axis: 'Personel', value: 0, fullMark: 100 },
        { axis: 'Lojistik', value: 0, fullMark: 100 },
        { axis: 'Ekipman', value: 0, fullMark: 100 },
      ]
    }
    const meta = orsResult.meta
    const trainPct = Math.min(
      100,
      Math.round((meta.trainingsLast7 / Math.max(1, meta.trainingMin)) * 100)
    )
    const personnel =
      meta.combatScore != null ? Math.round((meta.combatScore + trainPct) / 2) : trainPct
    const logistical = meta.logisticalScore ?? 0
    let equipment =
      meta.ammoThreshold > 0
        ? Math.min(100, Math.round((meta.ammoTotal / meta.ammoThreshold) * 100))
        : 50
    if (meta.incidentFlags?.applies) equipment = Math.max(0, equipment - 25)

    return [
      { axis: 'Personel', value: personnel, fullMark: 100 },
      { axis: 'Lojistik', value: logistical, fullMark: 100 },
      { axis: 'Ekipman', value: equipment, fullMark: 100 },
    ]
  }, [orsResult])

  const signalSeries = useMemo(() => {
    const base = orsResult?.score ?? 68
    const notifyDrag = totalNotifications > 0 ? -10 : 0
    return ['08', '10', '12', '14', '16', '18', '20'].map((hour, i) => ({
      t: hour,
      v: Math.max(18, Math.min(100, base + ((i % 3) - 1) * 5 + notifyDrag)),
    }))
  }, [orsResult?.score, totalNotifications])

  const displayMissions = activeMissions.length > 0 ? activeMissions.slice(0, 6) : m.items.slice(0, 4)

  return (
    <div className="dashboard-hud-shell cmd-center relative mx-auto h-auto min-h-0 max-w-[1440px] px-5 py-8 pt-14 sm:px-6 md:px-8 sm:pt-16">
      <WeaponMaintenanceAlarmFromInventory
        inventory={inv.items}
        rangeLogs={rangeLogs.items}
        updateItem={inv.updateItem}
        className="mb-6"
      />

      <header className="relative z-[1] mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="cmd-kicker">Operasyonel Komuta Merkezi</p>
          <h1 className="cmd-page-title">
            {profileLoading ? '…' : userData?.callsign ?? 'Operatör'}
          </h1>
          <p className="cmd-hero-message !text-base sm:!text-lg">{heroMessage}</p>
        </div>
        {totalNotifications > 0 ? (
          <Link to="/mesajlar" className="cmd-action-btn shrink-0">
            <Bell className="size-4" strokeWidth={1.75} aria-hidden />
            {totalNotifications} bildirim
          </Link>
        ) : null}
      </header>

      {anyErr ? (
        <div className="cmd-alert relative z-[1] mb-6" role="status">
          <AlertCircle className="size-4 shrink-0 text-amber-400/90" strokeWidth={1.5} aria-hidden />
          <span>Veri akışında geçici kesinti. Bağlantı yenileniyor.</span>
        </div>
      ) : null}

      <section
        className="cmd-focus-row relative z-[1] mb-6 grid gap-4 lg:grid-cols-[minmax(280px,0.95fr)_minmax(0,1.15fr)] lg:items-stretch"
        aria-label="Operasyonel hazırlık ve kapasite radarı"
      >
        <div className="cmd-glass-panel cmd-focus-gauge flex items-center justify-center p-4 sm:p-5">
          <OrsReadinessGauge
            embedded
            loading={orsLoading}
            score={orsResult?.score ?? 0}
            penalties={orsResult?.penalties ?? []}
          />
        </div>
        <div className="cmd-glass-panel cmd-focus-radar p-4 sm:p-5">
          <OperationalRadarChart data={radarData} loading={orsLoading} />
        </div>
      </section>

      <div className="cmd-main-grid relative z-[1] grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(200px,220px)] xl:grid-cols-[minmax(0,1fr)_240px] lg:items-start">
        <div className="cmd-left-column flex flex-col gap-6">
          <section className="cmd-panel cmd-glass-panel" aria-label="Aktif görevler">
            <div className="cmd-panel__head">
              <div>
                <h2 className="cmd-panel__title">Operasyon akışı</h2>
                <p className="cmd-panel__subtitle">Aktif ve bekleyen görevler</p>
              </div>
            </div>

            <div className="cmd-panel__body">
              {!m.ready || m.loading ? (
                <RowSkeleton rows={4} />
              ) : displayMissions.length === 0 ? (
                <div className="cmd-empty">
                  <ClipboardList className="size-8 text-app-text/45" strokeWidth={1.25} aria-hidden />
                  <p className="cmd-empty__title">Aktif görev kaydı yok</p>
                  <p className="cmd-empty__text">Yeni operasyon oluşturduğunuzda burada görünecek.</p>
                </div>
              ) : (
                <ul className="cmd-mission-list cmd-mission-list--spacious">
                  {displayMissions.map((row) => {
                    const status = missionStatusLabel(/** @type {string} */ (row.status))
                    const sev = missionSeverity(/** @type {string} */ (row.status))
                    return (
                      <li key={row.id} className={['cmd-mission-item', `cmd-mission-item--${sev}`].join(' ')}>
                        <div className="min-w-0 flex-1">
                          <p className="cmd-mission-item__title">
                            {typeof row.title === 'string' && row.title ? row.title : 'Adsız görev'}
                          </p>
                          <p className="cmd-mission-item__meta">
                            Son güncelleme · {formatShortDate(row)}
                          </p>
                        </div>
                        <span
                          className={[
                            'cmd-mission-item__badge',
                            sev === 'active'
                              ? 'cmd-mission-item__badge--active'
                              : sev === 'critical'
                                ? 'cmd-mission-item__badge--critical'
                                : 'cmd-mission-item__badge--warning',
                          ].join(' ')}
                        >
                          {status}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </section>

          <DashboardSystemLog entries={logEntries} />
        </div>

        <aside className="cmd-right-column lg:sticky lg:top-20" aria-label="Hızlı erişim widgetları">
          <CommandSideWidgets signalSeries={signalSeries} />
        </aside>
      </div>
    </div>
  )
}
