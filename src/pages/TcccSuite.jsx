import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import {
  AlertTriangle,
  ClipboardList,
  Package,
  Shield,
} from 'lucide-react'
import PageShell from '../components/layout/PageShell'
import PersonalHealthCard from '../components/tccc/PersonalHealthCard'
import TcccExpiryAlertBanner from '../components/tccc/TcccExpiryAlertBanner'
import TcccIfakInventoryTab from '../components/tccc/TcccIfakInventoryTab'
import TcccMarchDocumentsPanel from '../components/tccc/TcccMarchDocumentsPanel'
import { useAuth } from '../context/AuthContext'
import { useTcccAlerts } from '../context/TcccAlertContext'
import { useAudazData } from '../hooks/useAudazData'

/** @typedef {'menu' | 'personal_health' | 'march_documents' | 'ifak_logistics'} ActiveSection */

const MENU_CARD_META = [
  {
    id: /** @type {ActiveSection} */ ('personal_health'),
    titleKey: 'menu.personalHealth.title',
    descriptionKey: 'menu.personalHealth.description',
    Icon: Shield,
    accent: 'red',
  },
  {
    id: /** @type {ActiveSection} */ ('march_documents'),
    titleKey: 'menu.marchDocuments.title',
    descriptionKey: 'menu.marchDocuments.description',
    Icon: ClipboardList,
    accent: 'slate',
  },
  {
    id: /** @type {ActiveSection} */ ('ifak_logistics'),
    titleKey: 'menu.ifakLogistics.title',
    descriptionKey: 'menu.ifakLogistics.description',
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
 *   enterLabel: string
 *   onClick: () => void
 *   disabled?: boolean
 * }} props
 */
function CategoryCard({ title, description, preview, alert, accent, icon, enterLabel, onClick, disabled = false }) {
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
          className={`size-6 shrink-0 ${accent === 'red' ? 'text-red-500' : accent === 'amber' ? 'text-amber-500' : 'text-app-text/70'} transition-colors group-hover:text-red-400`}
          strokeWidth={1.5}
          aria-hidden
        />
        <span className="rounded border border-slate-800 bg-slate-900 px-2 py-0.5 font-mono text-[8px] font-bold uppercase tracking-widest text-app-text/55 group-hover:border-slate-700 group-hover:text-app-text/90">
          {enterLabel}
        </span>
      </div>
      <h3 className="font-mono text-sm font-bold uppercase leading-snug tracking-wide text-slate-100">{title}</h3>
      <p className="mt-2 font-mono text-[11px] leading-relaxed text-app-text/55">{description}</p>
      <div className="mt-5">{preview}</div>
    </button>
  )
}

export default function TcccSuite() {
  const { t } = useTranslation('health')
  const location = useLocation()
  const { user, userData, isConfigured } = useAuth()
  const { hasCriticalExpiry, criticalCount } = useTcccAlerts()

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

  useEffect(() => {
    setActiveSection('menu')
  }, [location.pathname, location.key])

  useEffect(() => {
    /** @param {Event} event */
    const onReenter = (event) => {
      const detail = /** @type {{ to?: string } | undefined} */ (
        /** @type {CustomEvent} */ (event).detail
      )
      if (detail?.to === '/tccc') {
        setActiveSection('menu')
      }
    }
    window.addEventListener('audaz:route-reenter', onReenter)
    return () => window.removeEventListener('audaz:route-reenter', onReenter)
  }, [])

  const bloodType = (userData?.bloodType || '').trim() || t('shell.bloodUnspecified')
  const callsign = (userData?.callsign || user?.displayName || '').trim() || '—'

  const readyData =
    isConfigured && cardsReady && ifakReady && medevacReady && rangeLogsReady && Boolean(user)

  const statusBanner =
    !isConfigured || !readyData ? (
      <p className="font-mono text-[10px] uppercase text-app-text/55">{t('shell.sessionChannel')}</p>
    ) : ifakListenError ? (
      <div className="flex rounded-lg border border-red-500/30 bg-red-950/30 px-3 py-2 text-red-300">
        <AlertTriangle className="size-5" aria-hidden />
        <span className="ml-2 font-mono text-[10px] uppercase">{t('shell.channelDown')}</span>
      </div>
    ) : null

  const renderMenu = () => (
    <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-3">
      <CategoryCard
        accent="red"
        icon={Shield}
        disabled={!readyData}
        enterLabel={t('shell.enter')}
        title={t(MENU_CARD_META[0].titleKey)}
        description={t(MENU_CARD_META[0].descriptionKey)}
        onClick={() => setActiveSection('personal_health')}
        preview={
          <div className="rounded-lg border border-red-800/50 bg-red-950/25 px-4 py-3">
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-red-500/80">{t('shell.militaryIdStatus')}</p>
            <p className="mt-2 font-mono text-[10px] uppercase text-app-text/55">{t('shell.callsign')}</p>
            <p className="font-mono text-sm font-bold uppercase tracking-wider text-app-text">{callsign}</p>
            <p className="mt-3 font-mono text-[10px] uppercase text-app-text/55">{t('shell.bloodType')}</p>
            <p className="font-mono text-2xl font-black uppercase tracking-[0.1em] text-red-500">{bloodType}</p>
          </div>
        }
      />

      <CategoryCard
        accent="slate"
        icon={ClipboardList}
        disabled={!readyData}
        enterLabel={t('shell.enter')}
        title={t(MENU_CARD_META[1].titleKey)}
        description={t(MENU_CARD_META[1].descriptionKey)}
        onClick={() => setActiveSection('march_documents')}
        preview={
          <p className="font-mono text-[10px] font-bold uppercase leading-relaxed tracking-wide text-app-text/70">
            {t('shell.marchPreview')}
          </p>
        }
      />

      <CategoryCard
        accent="amber"
        icon={Package}
        disabled={!readyData}
        enterLabel={t('shell.enter')}
        title={t(MENU_CARD_META[2].titleKey)}
        description={t(MENU_CARD_META[2].descriptionKey)}
        onClick={() => setActiveSection('ifak_logistics')}
        alert={
          hasCriticalExpiry ? (
            <div
              role="alert"
              className="mb-4 animate-pulse rounded-lg border border-amber-500/60 bg-gradient-to-r from-amber-950/60 via-red-950/50 to-amber-950/60 px-3 py-2 font-mono text-[9px] font-bold uppercase tracking-wider text-amber-300"
            >
              {t('shell.criticalStockAlert', { count: criticalCount })}
            </div>
          ) : null
        }
        preview={
          <p className="font-mono text-[10px] font-bold uppercase leading-relaxed tracking-wide text-app-text/70">
            {t('shell.ifakPreview')}
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
        className="mb-4 inline-flex items-center gap-2 rounded-sm border border-slate-800 bg-slate-900/50 px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider text-app-text/70 transition-colors hover:border-red-900/50 hover:text-red-500"
      >
        <span aria-hidden>⬅</span>
        {t('shell.backToMenu')}
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
    <div className="px-4 sm:px-6 md:px-8">
    <PageShell title={t('page.title')} subtitle={t('page.subtitle')}>
      <div className="tccc-march-shell h-auto min-h-0 space-y-5 text-app-text">
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
    </PageShell>
    </div>
  )
}
