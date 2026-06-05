import { useCallback, useState } from 'react'
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
import { TrainingSessionProvider, useTrainingSession } from '../context/TrainingSessionContext'
import { useAudazData } from '../hooks/useAudazData'

/** @typedef {import('../components/training/trainingCategories').TrainingCategory} TrainingCategory */

function TrainingInner() {
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

  const { wrapRangeLogPayload, wrapTrainingPayload, afterRangeLogSaved, afterTrainingSaved } =
    useTrainingSession()

  const ready = inventoryReady && rangeLogsReady
  const listenError = inventoryListenError ?? rangeLogsListenError

  const [activeCategory, setActiveCategory] = useState(/** @type {TrainingCategory | null} */ (null))

  const handleCategorySelect = useCallback((/** @type {TrainingCategory} */ category) => {
    setActiveCategory(category)
  }, [])

  const exitCategory = useCallback(() => {
    setActiveCategory(null)
  }, [])

  const addRangeLogEntry = useCallback(
    async (payload) => {
      const enriched = wrapRangeLogPayload(payload)
      const ref = await addRangeLog(enriched)
      const logId = String(ref?.id ?? '')
      if (logId) {
        try {
          await afterRangeLogSaved({ logId, payload: enriched })
        } catch (feedErr) {
          console.error('[Training] group activity feed failed', feedErr)
        }
      }
      return ref
    },
    [addRangeLog, wrapRangeLogPayload, afterRangeLogSaved],
  )

  const addTrainingPlanEntry = useCallback(
    async (payload) => {
      const enriched = wrapTrainingPayload(payload)
      const ref = await addTrainingPlan(enriched)
      const logId = String(ref?.id ?? '')
      if (logId) {
        try {
          await afterTrainingSaved({ logId, payload: enriched })
        } catch (feedErr) {
          console.error('[Training] group training feed failed', feedErr)
        }
      }
      return ref
    },
    [addTrainingPlan, wrapTrainingPayload, afterTrainingSaved],
  )

  const showAtis = activeCategory?.id === 'atis'
  const showCqb = activeCategory?.id === 'cqb'
  const showFof = activeCategory?.id === 'fof'
  const showVbss = activeCategory?.id === 'vbss'
  const showTccc = activeCategory?.id === 'tccc'
  const showEgitim = activeCategory?.id === 'egitim'
  const showGrupEgitimi = activeCategory?.id === 'grup-egitimi'

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
    ? 'Silah · mühimmat · atım/isabet · drill — range_logs + ILWS stok senkronu'
    : showCqb
      ? 'Oda topolojisi · giriş · kırma · tehdit/etkisiz — range_logs CQB_DRILL'
      : showFof
        ? 'Senaryo · simülasyon · muharebe metrikleri — range_logs FOF_DRILL'
        : showVbss
          ? 'Gemi operasyonu görev HUD — eğitmen değerlendirmesi · vbss_evaluations canlı senkron'
          : showTccc
            ? 'MARCH taktik tıbbi HUD — eğitmen değerlendirmesi · tccc_evaluations canlı senkron'
            : showEgitim
              ? 'Eğitim odağı · takvim · lojistik kontrol listesi — trainings TRAINING_PLAN'
              : showGrupEgitimi
                ? 'Eğitmenin açtığı canlı oturum · vuruş ve süre — training_results'
                : 'Operasyon kategorisi seçin · kayıt modülleri sektör bazında açılır'

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
            <p className="font-mono-technical text-[10px] font-semibold uppercase tracking-[0.32em] text-[#ffb400]/85">
              [ ANTRENMAN VE OPERASYON ]
            </p>
            <h1 className="font-display mt-1 text-lg font-bold tracking-[0.1em] text-white sm:text-xl">
              {headerTitle}
            </h1>
            <p className="mt-0.5 max-w-xl font-mono-technical text-[9px] leading-snug text-slate-500">
              {headerSubtitle}
            </p>
          </div>
          <HudTicker className="text-right" />
        </header>

        {showAtis ? (
          <AtisShootingTerminal
            inventory={inventory}
            rangeLogs={rangeLogs}
            addLog={addRangeLogEntry}
            updateInventory={updateItem}
            logsLoading={rangeLogsLoading}
            {...terminalProps}
          />
        ) : showCqb ? (
          <CqbTerminal
            rangeLogs={rangeLogs}
            addLog={addRangeLogEntry}
            logsLoading={rangeLogsLoading}
            {...terminalProps}
          />
        ) : showFof ? (
          <FofTerminal
            rangeLogs={rangeLogs}
            addLog={addRangeLogEntry}
            logsLoading={rangeLogsLoading}
            {...terminalProps}
          />
        ) : showVbss ? (
          <VbssTerminal {...terminalProps} />
        ) : showTccc ? (
          <TcccTerminal {...terminalProps} />
        ) : showEgitim ? (
          <EgitimTerminal
            trainingPlans={trainingPlans}
            addPlan={addTrainingPlanEntry}
            updatePlan={updateTrainingPlan}
            plansLoading={trainingsLoading}
            listenError={trainingsListenError ?? listenError}
            ready={trainingsReady}
            onBack={exitCategory}
          />
        ) : showGrupEgitimi ? (
          <GroupTrainingTerminal onBack={exitCategory} />
        ) : (
          <section aria-label="Operasyon kategorileri">
            <p className="mb-3 font-mono-technical text-[8px] font-bold uppercase tracking-[0.28em] text-[#00FF41]/70">
              SEKTÖR_SEÇİMİ · 7 KANAL
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
