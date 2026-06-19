import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import HudFluffDecor from '../components/dashboard/HudFluffDecor'
import HudTicker from '../components/ui/HudTicker'
import AtisShootingTerminal from '../components/training/AtisShootingTerminal'
import CqbTerminal from '../components/training/CqbTerminal'
import FofTerminal from '../components/training/FofTerminal'
import VbssTerminal from '../components/training/VbssTerminal'
import TcccTerminal from '../components/training/TcccTerminal'
import EgitimTerminal from '../components/training/EgitimTerminal'
import GroupTrainingTerminal from '../components/training/GroupTrainingTerminal'
import TrainingCategoryHub from '../components/training/TrainingCategoryHub'
import {
  countVisibleTrainingChannels,
  resolveUserGroup,
  TRAINING_CATEGORIES,
} from '../components/training/trainingCategories'
import { TrainingSessionProvider, useTrainingSession } from '../context/TrainingSessionContext'
import { useAuth } from '../context/AuthContext'
import { filterIndividualTrainingRecords } from '../lib/trainingGroupFields'
import { useAudazData } from '../hooks/useAudazData'

/** @typedef {import('../components/training/trainingCategories').TrainingCategory} TrainingCategory */

/**
 * @param {unknown} state
 */
function itemTypeIsTrainingFromState(state) {
  return Boolean(
    state &&
      typeof state === 'object' &&
      'groupTrainingId' in state &&
      String(/** @type {{ groupTrainingId?: string }} */ (state).groupTrainingId ?? '').trim(),
  )
}

function TrainingInner() {
  const { role, userData, profileLoading } = useAuth()
  const userGroup = useMemo(() => resolveUserGroup(userData), [userData])
  const isInstructor = role === 'instructor'
  const canAccessGrupEgitimi = Boolean(userGroup) || isInstructor
  const visibleCategoryCount = useMemo(
    () =>
      countVisibleTrainingChannels({
        role: role ?? 'operator',
        userGroup,
      }),
    [role, userGroup],
  )

  const {
    items: inventory,
    updateItem,
    ready: inventoryReady,
    listenError: inventoryListenError,
  } = useAudazData('inventory')

  const {
    items: rangeLogs,
    addItem: addRangeLog,
    ready: rangeLogsReady,
    loading: rangeLogsLoading,
    listenError: rangeLogsListenError,
  } = useAudazData('range_logs')

  const {
    items: trainingPlans,
    addItem: addTrainingPlan,
    updateItem: updateTrainingPlan,
    ready: trainingsReady,
    loading: trainingsLoading,
    listenError: trainingsListenError,
  } = useAudazData('trainings')

  const {
    items: vbssLogs,
    ready: vbssLogsReady,
    loading: vbssLogsLoading,
    listenError: vbssLogsListenError,
  } = useAudazData('vbss_logs')

  const {
    items: tcccLogs,
    ready: tcccLogsReady,
    loading: tcccLogsLoading,
    listenError: tcccLogsListenError,
  } = useAudazData('tccc_logs')

  const { wrapRangeLogPayload, wrapTrainingPayload } = useTrainingSession()

  const individualRangeLogs = useMemo(
    () => filterIndividualTrainingRecords(rangeLogs),
    [rangeLogs],
  )
  const individualTrainingPlans = useMemo(
    () => filterIndividualTrainingRecords(trainingPlans),
    [trainingPlans],
  )

  const ready = inventoryReady && rangeLogsReady
  const listenError = inventoryListenError ?? rangeLogsListenError

  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const sectorFromUrl = searchParams.get('sector')?.trim() ?? ''
  const trainingFromUrl = searchParams.get('training')?.trim() ?? ''
  const navState = /** @type {{ groupTrainingId?: string, trainingSector?: string } | null} */ (location.state)
  const trainingFromState = String(navState?.groupTrainingId ?? '').trim()
  const sectorFromState = String(navState?.trainingSector ?? '').trim()

  const [activeCategory, setActiveCategory] = useState(/** @type {TrainingCategory | null} */ (null))
  const [deepLinkTrainingId, setDeepLinkTrainingId] = useState('')

  useEffect(() => {
    if (profileLoading) return

    const trainingId = trainingFromUrl || trainingFromState
    const wantsGroupSector =
      sectorFromUrl === 'grup-egitimi' ||
      sectorFromState === 'grup-egitimi' ||
      Boolean(trainingId) ||
      itemTypeIsTrainingFromState(location.state)

    if (!sectorFromUrl && !trainingFromUrl && !trainingFromState && !sectorFromState && !wantsGroupSector) {
      return
    }

    if (wantsGroupSector && canAccessGrupEgitimi) {
      const category = TRAINING_CATEGORIES.find((c) => c.id === 'grup-egitimi') ?? null
      if (category) setActiveCategory(category)
    } else if (sectorFromUrl && sectorFromUrl !== 'egitmen-komuta') {
      const category = TRAINING_CATEGORIES.find((c) => c.id === sectorFromUrl) ?? null
      if (category) setActiveCategory(category)
    }

    if (trainingId && canAccessGrupEgitimi) setDeepLinkTrainingId(trainingId)

    if (sectorFromUrl || trainingFromUrl) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.delete('sector')
          next.delete('training')
          return next
        },
        { replace: true },
      )
    }
  }, [
    sectorFromUrl,
    trainingFromUrl,
    trainingFromState,
    sectorFromState,
    location.state,
    location.key,
    setSearchParams,
    profileLoading,
    canAccessGrupEgitimi,
  ])

  useEffect(() => {
    if (profileLoading) return
    if (activeCategory?.id === 'grup-egitimi' && !canAccessGrupEgitimi) {
      setActiveCategory(null)
      setDeepLinkTrainingId('')
    }
  }, [activeCategory, canAccessGrupEgitimi, profileLoading])

  const handleCategorySelect = useCallback(
    (/** @type {TrainingCategory} */ category) => {
      if (profileLoading) return
      if (category.id === 'grup-egitimi' && !canAccessGrupEgitimi) return
      if (category.externalRoute) return
      setActiveCategory(category)
    },
    [profileLoading, canAccessGrupEgitimi],
  )

  const exitCategory = useCallback(() => {
    setActiveCategory(null)
  }, [])

  const addRangeLogEntry = useCallback(
    async (payload) => {
      const enriched = wrapRangeLogPayload(payload)
      return addRangeLog(enriched)
    },
    [addRangeLog, wrapRangeLogPayload],
  )

  const addTrainingPlanEntry = useCallback(
    async (payload) => {
      const enriched = wrapTrainingPayload(payload)
      return addTrainingPlan(enriched)
    },
    [addTrainingPlan, wrapTrainingPayload],
  )

  const showAtis = activeCategory?.id === 'atis'
  const showCqb = activeCategory?.id === 'cqb'
  const showFof = activeCategory?.id === 'fof'
  const showVbss = activeCategory?.id === 'vbss'
  const showTccc = activeCategory?.id === 'tccc'
  const showEgitim = activeCategory?.id === 'egitim'
  const showGrupEgitimi = activeCategory?.id === 'grup-egitimi' && canAccessGrupEgitimi

  const headerTitle = showAtis
    ? 'ATIŞ · RNG-01'
    : showCqb
      ? 'CQB · CQB-02'
      : showFof
        ? 'FOF · FOF-03'
        : showVbss
          ? 'VBSS · VBS-04'
          : showTccc
            ? 'TCCC · MED-05'
            : showEgitim
              ? 'EĞİTİM · EDU-06'
              : showGrupEgitimi
                ? 'GRUP EĞİTİMİ · GRP-07'
                : 'TAKTİK EĞİTİM TERMINALİ'

  const headerSubtitle = showAtis
    ? 'Kişisel atış kayıtları — range_logs (bireysel kanal)'
    : showCqb
      ? 'Kişisel CQB drill kayıtları — range_logs (bireysel kanal)'
      : showFof
        ? 'Kişisel FOF kayıtları — range_logs (bireysel kanal)'
        : showVbss
          ? 'Canlı HUD (vbss_evaluations) · kişisel kayıtlar (vbss_logs)'
          : showTccc
            ? 'Canlı HUD (tccc_evaluations) · kişisel kayıtlar (tccc_logs)'
            : showEgitim
              ? 'Kişisel eğitim planları — trainings (bireysel kanal)'
              : showGrupEgitimi
                ? 'Grup oturumu — group_trainings · training_results'
                : 'Bireysel antrenman tüm kullanıcılara açık · grup ve komuta panelleri rol bazlı'

  const terminalProps = {
    onBack: exitCategory,
    ready,
    listenError,
  }

  return (
    <div className="ilws-shell relative mx-auto max-w-[1480px] px-3 py-5 pt-12 sm:px-4 sm:pt-14 md:px-6">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
        <HudFluffDecor />
      </div>

      <div className="relative z-[2] space-y-5">
        <header className="flex flex-wrap items-end justify-between gap-3 border-b border-white/10 pb-3">
          <div className="min-w-0 flex-1">
            <p className="font-mono-technical text-[10px] font-semibold uppercase tracking-[0.32em] text-accent/85">
              [ ANTRENMAN VE OPERASYON ]
            </p>
            <h1 className="font-display mt-1 text-lg font-bold tracking-[0.1em] text-app-text sm:text-xl">
              {headerTitle}
            </h1>
            <p className="mt-0.5 max-w-xl font-mono-technical text-[9px] leading-snug text-app-text/55">
              {headerSubtitle}
            </p>
          </div>
          <HudTicker className="text-right" />
        </header>

        {showAtis ? (
          <AtisShootingTerminal
            inventory={inventory}
            rangeLogs={individualRangeLogs}
            addLog={addRangeLogEntry}
            updateInventory={updateItem}
            logsLoading={rangeLogsLoading}
            {...terminalProps}
          />
        ) : showCqb ? (
          <CqbTerminal
            rangeLogs={individualRangeLogs}
            addLog={addRangeLogEntry}
            logsLoading={rangeLogsLoading}
            {...terminalProps}
          />
        ) : showFof ? (
          <FofTerminal
            rangeLogs={individualRangeLogs}
            addLog={addRangeLogEntry}
            logsLoading={rangeLogsLoading}
            {...terminalProps}
          />
        ) : showVbss ? (
          <VbssTerminal
            {...terminalProps}
            logs={vbssLogs}
            logsLoading={vbssLogsLoading}
            logsReady={vbssLogsReady}
            logsListenError={vbssLogsListenError}
          />
        ) : showTccc ? (
          <TcccTerminal
            {...terminalProps}
            logs={tcccLogs}
            logsLoading={tcccLogsLoading}
            logsReady={tcccLogsReady}
            logsListenError={tcccLogsListenError}
          />
        ) : showEgitim ? (
          <EgitimTerminal
            trainingPlans={individualTrainingPlans}
            addPlan={addTrainingPlanEntry}
            updatePlan={updateTrainingPlan}
            plansLoading={trainingsLoading}
            listenError={trainingsListenError ?? listenError}
            ready={trainingsReady}
            onBack={exitCategory}
          />
        ) : showGrupEgitimi ? (
          <GroupTrainingTerminal onBack={exitCategory} initialTrainingId={deepLinkTrainingId} />
        ) : (
          <section aria-label="Operasyon kategorileri">
            <p className="mb-3 font-mono-technical text-[8px] font-bold uppercase tracking-[0.28em] text-accent/70">
              SEKTÖR_SEÇİMİ · {visibleCategoryCount} KANAL
            </p>
            <TrainingCategoryHub onCategorySelect={handleCategorySelect} />
          </section>
        )}
      </div>
    </div>
  )
}

export default function Training() {
  return (
    <TrainingSessionProvider>
      <TrainingInner />
    </TrainingSessionProvider>
  )
}
