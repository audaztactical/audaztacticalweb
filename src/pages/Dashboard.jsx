import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, Bell } from 'lucide-react'
import CommandSideWidgets from '../components/dashboard/CommandSideWidgets'
import DashboardSystemLog from '../components/dashboard/DashboardSystemLog'
import OperationalRadarChart from '../components/dashboard/OperationalRadarChart'
import OrsReadinessGauge from '../components/dashboard/OrsReadinessGauge'
import { WeaponMaintenanceAlarmFromInventory } from '../components/armory/WeaponMaintenanceAlarmPanel'
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

  return (
    <div className="dashboard-hud-shell cmd-center relative mx-auto h-auto min-h-0 w-full max-w-[1440px] px-6 py-8 pt-14 sm:px-8 sm:pt-16 lg:px-10">
      <div className="relative z-[1] flex flex-col gap-6">
        <WeaponMaintenanceAlarmFromInventory
          inventory={inv.items}
          rangeLogs={rangeLogs.items}
          updateItem={inv.updateItem}
        />

        <header className="relative flex flex-wrap items-end justify-between gap-4">
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
          <div className="cmd-alert relative" role="status">
            <AlertCircle className="size-4 shrink-0 text-amber-400/90" strokeWidth={1.5} aria-hidden />
            <span>Veri akışında geçici kesinti. Bağlantı yenileniyor.</span>
          </div>
        ) : null}

        <section
          className="cmd-focus-row grid gap-6 lg:grid-cols-2 lg:items-stretch"
          aria-label="Operasyonel hazırlık ve kapasite radarı"
        >
          <div className="cmd-glass-panel cmd-focus-gauge flex h-full min-h-[320px] items-center justify-center p-5">
            <OrsReadinessGauge
              embedded
              loading={orsLoading}
              score={orsResult?.score ?? 0}
              penalties={orsResult?.penalties ?? []}
            />
          </div>
          <div className="cmd-glass-panel cmd-focus-radar flex h-full min-h-[320px] flex-col p-5">
            <OperationalRadarChart data={radarData} loading={orsLoading} />
          </div>
        </section>

        <div className="cmd-main-grid grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(240px,280px)] xl:grid-cols-[minmax(0,1fr)_280px] lg:items-stretch">
          <div className="cmd-left-column flex min-h-0 flex-col">
            <div className="cmd-log-shell flex min-h-[320px] flex-1 flex-col">
              <DashboardSystemLog entries={logEntries} />
            </div>
          </div>

          <aside className="cmd-right-column flex flex-col lg:sticky lg:top-20 lg:self-stretch" aria-label="Hızlı erişim widgetları">
            <CommandSideWidgets signalSeries={signalSeries} />
          </aside>
        </div>
      </div>
    </div>
  )
}
