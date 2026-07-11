import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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
  const { t, i18n } = useTranslation('dashboard')
  const { userData, profileLoading } = useAuth()
  const { totalNotifications } = useMuhabereNotify()
  const m = useAudazData('missions')
  const trainings = useAudazData('trainings')
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

  const anyErr = Boolean(m.listenError || trainings.listenError || inv.listenError || h.listenError)
  const orsLoading =
    !m.ready ||
    !trainings.ready ||
    !inv.ready ||
    !h.ready ||
    !rangeLogs.ready ||
    !vbssLogs.ready ||
    !tcccLogs.ready

  const observedEvalLogs = useMemo(
    () => filterObservedEvalLogs([...vbssLogs.items, ...tcccLogs.items]),
    [vbssLogs.items, tcccLogs.items],
  )

  const activeMissions = useMemo(
    () => m.items.filter((row) => !statusLooksComplete(/** @type {string} */ (row.status))),
    [m.items],
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
        trainings: trainings.items,
        inventory: inv.items,
        health: h.items,
        sessionOpenMs: sessionOpenedMs,
      }),
    [m.items, trainings.items, inv.items, h.items, sessionOpenedMs, i18n.language],
  )

  const orsResult = useMemo(() => {
    void orsClock
    if (orsLoading) return null
    return computeORS({
      inventory: inv.items,
      trainings: trainings.items,
      health: h.items,
      rangeLogs: rangeLogs.items,
      observedEvalLogs,
      nowMs: Date.now(),
    })
  }, [
    orsLoading,
    trainings.items,
    inv.items,
    h.items,
    rangeLogs.items,
    observedEvalLogs,
    orsClock,
  ])

  const heroMessage = useMemo(() => {
    if (pendingMissions.length > 0) {
      return t('hero.pending', { count: pendingMissions.length })
    }
    if (inProgressMissions.length > 0) {
      return t('hero.inProgress', { count: inProgressMissions.length })
    }
    if (activeMissions.length > 0) {
      return t('hero.active', { count: activeMissions.length })
    }
    return t('hero.ready')
  }, [pendingMissions.length, inProgressMissions.length, activeMissions.length, t, i18n.language])

  const radarData = useMemo(() => {
    if (!orsResult) {
      return [
        { axisKey: 'personnel', value: 0, fullMark: 100 },
        { axisKey: 'logistics', value: 0, fullMark: 100 },
        { axisKey: 'equipment', value: 0, fullMark: 100 },
      ]
    }
    const meta = orsResult.meta
    const trainPct = Math.min(
      100,
      Math.round((meta.trainingsLast7 / Math.max(1, meta.trainingMin)) * 100),
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
      { axisKey: 'personnel', value: personnel, fullMark: 100 },
      { axisKey: 'logistics', value: logistical, fullMark: 100 },
      { axisKey: 'equipment', value: equipment, fullMark: 100 },
    ]
  }, [orsResult])

  const signalSeries = useMemo(() => {
    const base = orsResult?.score ?? 68
    const notifyDrag = totalNotifications > 0 ? -10 : 0
    return ['08', '10', '12', '14', '16', '18', '20'].map((hour, i) => ({
      t: `${hour}:00`,
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
          <div className="min-w-0 space-y-2">
            <p className="cmd-kicker">{t('header.kicker')}</p>
            <h1 className="cmd-page-title break-words">
              {profileLoading ? '…' : (userData?.callsign ?? t('header.operatorFallback'))}
            </h1>
            <p className="cmd-hero-message !text-base sm:!text-lg">{heroMessage}</p>
          </div>
          {totalNotifications > 0 ? (
            <Link to="/mesajlar" className="cmd-action-btn shrink-0">
              <Bell className="size-4" strokeWidth={1.75} aria-hidden />
              {t('header.notifications', { count: totalNotifications })}
            </Link>
          ) : null}
        </header>

        {anyErr ? (
          <div className="cmd-alert relative" role="status">
            <AlertCircle className="size-4 shrink-0 text-amber-400/90" strokeWidth={1.5} aria-hidden />
            <span>{t('alert.dataInterrupted')}</span>
          </div>
        ) : null}

        <section
          className="cmd-focus-row grid gap-6 lg:grid-cols-2 lg:items-stretch"
          aria-label={t('focusSectionAria')}
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

          <aside
            className="cmd-right-column flex flex-col lg:sticky lg:top-20 lg:self-stretch"
            aria-label={t('sideWidgetsAria')}
          >
            <CommandSideWidgets signalSeries={signalSeries} />
          </aside>
        </div>
      </div>
    </div>
  )
}
