import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  Bandage,
  Cable,
  ClipboardList,
  Droplets,
  Package,
  Shield,
  Syringe,
  Wind,
} from 'lucide-react'
import PageShell from '../components/layout/PageShell'
import PersonalHealthCard from '../components/tccc/PersonalHealthCard'
import TcccExpiryAlertBanner from '../components/tccc/TcccExpiryAlertBanner'
import TcccIfakInventoryTab from '../components/tccc/TcccIfakInventoryTab'
import TcccMarchDocumentsPanel from '../components/tccc/TcccMarchDocumentsPanel'
import { InjuryBodyMap } from '../components/tccc/InjuryBodyMap'
import { useAuth } from '../context/AuthContext'
import { useTcccAlerts } from '../context/TcccAlertContext'
import { useAudazData } from '../hooks/useAudazData'

const INCIDENT_KIND = 'incident'

const TCCC_INTERVENTIONS = [
  { id: 'tq', Icon: Cable },
  { id: 'bdg', Icon: Bandage },
  { id: 'hms', Icon: Droplets },
  { id: 'air', Icon: Wind },
  { id: 'med', Icon: Syringe },
]

/** @typedef {'menu' | 'personal_health' | 'march_documents' | 'ifak_logistics'} ActiveSection */

const MENU_CARDS = [
  {
    id: /** @type {ActiveSection} */ ('personal_health'),
    title: 'KİŞİSEL SAĞLIK & OPERATÖR DURUMU',
    description: 'Kişisel medikal profil, alerji takibi ve aşı kayıtları defteri.',
    Icon: Shield,
    accent: 'red',
  },
  {
    id: 'march_documents',
    title: 'TAKTİK MEDİKAL KILAVUZ & EVRAK ÇANTASI',
    description:
      'Operasyonel yaralı kartları, tıbbi tahliye telsiz protokolleri ve basılabilir saha şablonları.',
    Icon: ClipboardList,
    accent: 'slate',
  },
  {
    id: 'ifak_logistics',
    title: 'IFAK & LOJİSTİK ENVANTER',
    description: 'Kişisel IFAK malzeme yönetimi ve kritik son kullanma tarihi (SKT) takibi.',
    Icon: Package,
    accent: 'amber',
  },
]

/**
 * @param {{
 *   title: string
 *   description: string
 *   preview: import('react').ReactNode
 *   alert?: import('react').ReactNode
 *   accent: string
 *   icon: import('lucide-react').LucideIcon
 *   onClick: () => void
 *   disabled?: boolean
 * }} props
 */
function CategoryCard({ title, description, preview, alert, accent, icon, onClick, disabled = false }) {
  const CardIcon = icon
  const hoverBorder =
    accent === 'red'
      ? 'hover:border-red-600/50 hover:shadow-[0_8px_32px_-12px_rgba(239,68,68,0.35)]'
      : accent === 'amber'
        ? 'hover:border-amber-600/45 hover:shadow-[0_8px_32px_-12px_rgba(245,158,11,0.25)]'
        : 'hover:border-slate-600 hover:shadow-[0_8px_32px_-12px_rgba(148,163,184,0.15)]'

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        'group relative flex w-full flex-col rounded-xl border border-slate-800 bg-slate-950 p-5 text-left',
        'transition-all duration-200 hover:-translate-y-1 disabled:cursor-not-allowed disabled:opacity-45',
        hoverBorder,
      ].join(' ')}
    >
      {alert}
      <div className="mb-4 flex items-start justify-between gap-3">
        <CardIcon
          className={`size-6 shrink-0 ${accent === 'red' ? 'text-red-500' : accent === 'amber' ? 'text-amber-500' : 'text-slate-400'} transition-colors group-hover:text-red-400`}
          strokeWidth={1.5}
          aria-hidden
        />
        <span className="rounded border border-slate-800 bg-slate-900 px-2 py-0.5 font-mono text-[8px] font-bold uppercase tracking-widest text-slate-500 group-hover:border-slate-700 group-hover:text-slate-300">
          GİRİŞ
        </span>
      </div>
      <h3 className="font-mono text-sm font-bold uppercase leading-snug tracking-wide text-slate-100">{title}</h3>
      <p className="mt-2 font-mono text-[11px] leading-relaxed text-slate-500">{description}</p>
      <div className="mt-5">{preview}</div>
    </button>
  )
}

export default function TcccSuite() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, userData, isConfigured } = useAuth()
  const { hasCriticalExpiry, criticalCount } = useTcccAlerts()

  const { addItem: addHealthRecord } = useAudazData('health_records')
  const {
    items: casualtyCards,
    addItem: addCasualtyCard,
    loading: cardsLoading,
    ready: cardsReady,
  } = useAudazData('casualty_cards')
  const {
    items: ifakItems,
    addItem: addIfakItem,
    updateItem: updateIfakItem,
    deleteItem: deleteIfakItem,
    loading: ifakLoading,
    ready: ifakReady,
    listenError: ifakListenError,
  } = useAudazData('ifak_inventory')
  const { addItem: addMedevacLog, ready: medevacReady } = useAudazData('medevac_logs')
  const {
    items: rangeLogs,
    loading: rangeLogsLoading,
    addItem: addRangeLog,
    ready: rangeLogsReady,
  } = useAudazData('range_logs')

  const [activeSection, setActiveSection] = useState(/** @type {ActiveSection} */ ('menu'))
  const [incidentModal, setIncidentModal] = useState(false)
  const [injuryZone, setInjuryZone] = useState(/** @type {string | null} */ (null))
  const [interventionSet, setInterventionSet] = useState(() => new Set())
  const [severity, setSeverity] = useState(2)
  const [savingIncident, setSavingIncident] = useState(false)

  const bloodType = (userData?.bloodType || '').trim() || 'BELİRTİLMEDİ'
  const callsign = (userData?.callsign || user?.displayName || '').trim() || '—'

  const readyData =
    isConfigured && cardsReady && ifakReady && medevacReady && rangeLogsReady && Boolean(user)

  useEffect(() => {
    const st = location.state
    if (st && typeof st === 'object' && st.quickRecord === true) {
      setInjuryZone(null)
      setInterventionSet(new Set())
      setSeverity(2)
      setIncidentModal(true)
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location.state, location.pathname, navigate])

  const openQuickIncident = () => {
    setInjuryZone(null)
    setInterventionSet(new Set())
    setSeverity(2)
    setIncidentModal(true)
  }

  const toggleIntervention = (id) => {
    setInterventionSet((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSaveIncident = async (e) => {
    e.preventDefault()
    if (!injuryZone) return
    setSavingIncident(true)
    try {
      await addHealthRecord({
        kind: INCIDENT_KIND,
        injuryZone,
        interventions: [...interventionSet],
        severity,
      })
      setIncidentModal(false)
    } finally {
      setSavingIncident(false)
    }
  }

  const quickIncidentButton = (
    <button
      type="button"
      onClick={openQuickIncident}
      disabled={!readyData}
      className="inline-flex items-center gap-2 rounded-lg border border-red-600/55 bg-red-950/45 px-3 py-2 font-mono text-[9px] font-bold uppercase tracking-wider text-red-400 shadow-[0_0_24px_-8px_rgba(239,68,68,0.45)] transition hover:border-red-500 hover:bg-red-950/70 disabled:opacity-40"
      aria-label="Hızlı olay kaydı"
    >
      <ClipboardList className="size-4 shrink-0" strokeWidth={2} aria-hidden />
      <span className="hidden sm:inline">HIZLI OLAY KAYDI</span>
      <span className="sm:hidden">HIZLI OLAY KAYDI</span>
    </button>
  )

  const statusBanner =
    !isConfigured || !readyData ? (
      <p className="font-mono text-[10px] uppercase text-slate-500">OTURUM / VERİ KANALI</p>
    ) : ifakListenError ? (
      <div className="flex rounded-lg border border-red-500/30 bg-red-950/30 px-3 py-2 text-red-300">
        <AlertTriangle className="size-5" aria-hidden />
        <span className="ml-2 font-mono text-[10px] uppercase">VERİ_KANALI_KESİLDİ</span>
      </div>
    ) : null

  const renderMenu = () => (
    <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-3">
      <CategoryCard
        accent="red"
        icon={Shield}
        disabled={!readyData}
        title={MENU_CARDS[0].title}
        description={MENU_CARDS[0].description}
        onClick={() => setActiveSection('personal_health')}
        preview={
          <div className="rounded-lg border border-red-800/50 bg-red-950/25 px-4 py-3">
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-red-500/80">ASKERİ KÜNYE · DURUM</p>
            <p className="mt-2 font-mono text-[10px] uppercase text-slate-500">TELSİZ KODU</p>
            <p className="font-mono text-sm font-bold uppercase tracking-wider text-slate-200">{callsign}</p>
            <p className="mt-3 font-mono text-[10px] uppercase text-slate-500">KAN GRUBU</p>
            <p className="font-mono text-2xl font-black uppercase tracking-[0.1em] text-red-500">{bloodType}</p>
          </div>
        }
      />

      <CategoryCard
        accent="slate"
        icon={ClipboardList}
        disabled={!readyData}
        title={MENU_CARDS[1].title}
        description={MENU_CARDS[1].description}
        onClick={() => setActiveSection('march_documents')}
        preview={
          <p className="font-mono text-[10px] font-bold uppercase leading-relaxed tracking-wide text-slate-400">
            MARCH DOKTRİNİ, CANLI DD-1380 YARALI KARTI, 9-LINE MEDEVAC VE BOŞ PDF ŞABLON İNDİRME MERKEZİ
          </p>
        }
      />

      <CategoryCard
        accent="amber"
        icon={Package}
        disabled={!readyData}
        title={MENU_CARDS[2].title}
        description={MENU_CARDS[2].description}
        onClick={() => setActiveSection('ifak_logistics')}
        alert={
          hasCriticalExpiry ? (
            <div
              role="alert"
              className="mb-4 animate-pulse rounded-lg border border-amber-500/60 bg-gradient-to-r from-amber-950/60 via-red-950/50 to-amber-950/60 px-3 py-2 font-mono text-[9px] font-bold uppercase tracking-wider text-amber-300"
            >
              ⚠️ CRITICAL STOCK ALERT · {criticalCount} KALEM ≤30 GÜN / SKT GEÇMİŞ
            </div>
          ) : null
        }
        preview={
          <p className="font-mono text-[10px] font-bold uppercase leading-relaxed tracking-wide text-slate-400">
            KİŞİSEL IFAK MALZEME YÖNETİMİ & KRİTİK SON KULLANMA TARİHİ (SKT) TAKİBİ
          </p>
        }
      />
    </div>
  )

  const tacticalBackButton =
    activeSection !== 'menu' ? (
      <button
        type="button"
        onClick={() => setActiveSection('menu')}
        className="mb-4 inline-flex items-center gap-2 rounded-sm border border-slate-800 bg-slate-900/50 px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider text-slate-400 transition-colors hover:border-red-900/50 hover:text-red-500"
      >
        <span aria-hidden>⬅</span>
        TAKTİK MENÜYE DÖN
      </button>
    ) : null

  const renderSection = () => {
    if (activeSection === 'personal_health') {
      return <PersonalHealthCard />
    }

    if (activeSection === 'march_documents') {
      return (
        <TcccMarchDocumentsPanel
          disabled={!readyData}
          userId={user?.uid ?? ''}
          casualtyCards={casualtyCards}
          cardsLoading={cardsLoading}
          addCasualtyCard={addCasualtyCard}
          addMedevacLog={addMedevacLog}
          addRangeLog={addRangeLog}
          rangeLogs={rangeLogs}
          rangeLogsLoading={rangeLogsLoading}
        />
      )
    }

    if (activeSection === 'ifak_logistics') {
      return (
        <div className="space-y-4">
          <TcccExpiryAlertBanner />
          <TcccIfakInventoryTab
            items={ifakItems}
            loading={ifakLoading}
            disabled={!readyData}
            addItem={addIfakItem}
            updateItem={updateIfakItem}
            deleteItem={deleteIfakItem}
            userId={user?.uid ?? ''}
          />
        </div>
      )
    }

    return null
  }

  return (
    <PageShell title="TCCC" subtitle="TACTICAL MEDICAL SUITE" headerAction={quickIncidentButton}>
      <div className="space-y-5 text-slate-200">
        {statusBanner}

        {activeSection === 'menu' ? (
          renderMenu()
        ) : (
          <div className="space-y-4">
            {tacticalBackButton}
            {renderSection()}
          </div>
        )}
      </div>

      {incidentModal ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/88"
            aria-label="Kapat"
            onClick={() => !savingIncident && setIncidentModal(false)}
          />
          <div className="relative max-h-[min(92vh,680px)] w-full max-w-lg overflow-y-auto rounded-2xl border border-red-500/35 bg-slate-950 p-5">
            <p className="mb-6 font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-red-500">
              QUICK INCIDENT RECORD · QUICK_TCCC
            </p>
            <form className="space-y-8" onSubmit={handleSaveIncident}>
              <InjuryBodyMap selectedId={injuryZone} onSelect={setInjuryZone} />
              <div className="flex flex-wrap justify-center gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setSeverity(n)}
                    className={`flex size-10 items-center justify-center rounded-lg border font-mono text-lg font-black ${severity === n ? 'border-red-500 bg-red-950/40 text-red-400' : 'border-slate-800 text-slate-500'}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-5 gap-2">
                {TCCC_INTERVENTIONS.map((intr) => {
                  const Icon = intr.Icon
                  const on = interventionSet.has(intr.id)
                  return (
                    <button
                      key={intr.id}
                      type="button"
                      onClick={() => toggleIntervention(intr.id)}
                      className={`flex aspect-square items-center justify-center rounded-xl border ${on ? 'border-red-500/70 bg-red-950/30 text-red-400' : 'border-slate-800 text-slate-500'}`}
                    >
                      <Icon className="size-7" aria-hidden />
                    </button>
                  )
                })}
              </div>
              <button
                type="submit"
                disabled={savingIncident || !injuryZone || interventionSet.size === 0}
                className="w-full rounded-lg border border-red-600/50 py-3 font-mono font-bold uppercase tracking-wider text-red-400 disabled:opacity-40"
              >
                KAYDET
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </PageShell>
  )
}
