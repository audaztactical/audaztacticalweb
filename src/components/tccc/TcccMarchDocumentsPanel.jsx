import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FileDown, FileText, History, Radio, ScrollText } from 'lucide-react'
import TcccMarchTab from './TcccMarchTab'
import MedevacSimulator from './MedevacSimulator'
import SimulationHistory from './SimulationHistory'
import TcccMedicalHistoryTab from './TcccMedicalHistoryTab'
import { CASUALTY_DD1380_INITIAL } from '../../lib/casualtyCardPayload'
import { submitCasualtyDd1380Card } from '../../lib/casualtyCardSubmit'
import { fieldTemplateCopy, labelDocTab } from '../../lib/healthDisplayText'
import {
  generate9LineMedevacTemplate,
  generateCasevacMistTemplate,
  generateDD1380BlankTemplate,
  generateTcccFieldCardTemplate,
} from '../../lib/tcccFieldPdfTemplates'

/** @typedef {'march_dd1380' | 'medevac_9line' | 'simulation_history' | 'casualty_archive' | 'field_templates'} DocTab */

const DOC_TAB_IDS = /** @type {const} */ ([
  { id: /** @type {DocTab} */ ('march_dd1380'), Icon: FileText },
  { id: /** @type {DocTab} */ ('medevac_9line'), Icon: Radio },
  { id: /** @type {DocTab} */ ('simulation_history'), Icon: History },
  { id: /** @type {DocTab} */ ('casualty_archive'), Icon: ScrollText },
  { id: /** @type {DocTab} */ ('field_templates'), Icon: FileDown },
])

const FIELD_TEMPLATE_IDS = /** @type {const} */ (['dd1380', 'nine_line', 'casevac_mist', 'tccc_card'])

/** @param {string} templateId */
async function handleTemplateDownload(templateId) {
  if (templateId === 'nine_line') await generate9LineMedevacTemplate()
  else if (templateId === 'casevac_mist') await generateCasevacMistTemplate()
  else if (templateId === 'dd1380') await generateDD1380BlankTemplate()
  else if (templateId === 'tccc_card') await generateTcccFieldCardTemplate()
}

const tabBtnClass = (on) =>
  [
    'rounded border px-3 py-2 font-mono text-[9px] font-bold uppercase tracking-wider transition-all duration-200',
    on
      ? 'border-red-600/60 bg-red-950/40 text-red-400'
      : 'border-slate-800 bg-slate-950 text-app-text/55 hover:border-slate-700 hover:text-app-text/90',
  ].join(' ')

/**
 * @param {{
 *   disabled?: boolean
 *   userId: string
 *   casualtyCards: Record<string, unknown>[]
 *   cardsLoading: boolean
 *   addCasualtyCard: (payload: Record<string, unknown>) => Promise<unknown>
 *   addMedevacLog: (payload: Record<string, unknown>) => Promise<unknown>
 *   addRangeLog: (payload: Record<string, unknown>) => Promise<{ id: string }>
 *   rangeLogs: Record<string, unknown>[]
 *   rangeLogsLoading?: boolean
 * }} props
 */
export default function TcccMarchDocumentsPanel({
  disabled = false,
  userId,
  casualtyCards,
  cardsLoading,
  addCasualtyCard,
  addMedevacLog,
  addRangeLog,
  rangeLogs = [],
  rangeLogsLoading = false,
}) {
  const { t } = useTranslation('health')
  const [activeDocTab, setActiveDocTab] = useState(/** @type {DocTab} */ ('march_dd1380'))
  const [dd1380Form, setDd1380Form] = useState({ ...CASUALTY_DD1380_INITIAL })
  const [savingCard, setSavingCard] = useState(false)
  const [saveCardOk, setSaveCardOk] = useState(false)
  const [saveCardError, setSaveCardError] = useState(/** @type {string | null} */ (null))
  const [templateBusy, setTemplateBusy] = useState(/** @type {string | null} */ (null))

  const patchDd1380 = (/** @type {Partial<typeof CASUALTY_DD1380_INITIAL>} */ patch) => {
    setDd1380Form((f) => ({ ...f, ...patch }))
    setSaveCardOk(false)
    setSaveCardError(null)
  }

  const handleSaveCasualtyCard = async () => {
    if (!userId) return
    setSavingCard(true)
    setSaveCardOk(false)
    setSaveCardError(null)
    try {
      await submitCasualtyDd1380Card({
        addCard: addCasualtyCard,
        userId,
        form: dd1380Form,
      })
      setSaveCardOk(true)
    } catch (err) {
      const code = err && typeof err === 'object' && 'code' in err ? String(err.code) : ''
      setSaveCardError(`${t('docs.saveCardError')}${code ? ` · ${code}` : ''}`)
    } finally {
      setSavingCard(false)
    }
  }

  return (
    <div className="tccc-doc-panel h-auto min-h-0 space-y-4">
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-3">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-app-text/70">
          {t('docs.title')}
        </p>
        <p className="mt-1 font-mono text-xs leading-relaxed text-app-text/55">
          {t('docs.subtitle')}
        </p>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label={t('docs.tablistAria')}>
        {DOC_TAB_IDS.map((tab) => {
          const TabIcon = tab.Icon
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeDocTab === tab.id}
              disabled={disabled}
              onClick={() => setActiveDocTab(tab.id)}
              className={tabBtnClass(activeDocTab === tab.id)}
            >
              <span className="inline-flex items-center gap-1.5">
                <TabIcon className="size-3.5" aria-hidden />
                {labelDocTab(tab.id)}
              </span>
            </button>
          )
        })}
      </div>

      <div className="h-auto min-h-0">
        {activeDocTab === 'march_dd1380' ? (
          <TcccMarchTab
            form={dd1380Form}
            onPatch={patchDd1380}
            onSave={handleSaveCasualtyCard}
            saving={savingCard}
            saveOk={saveCardOk}
            saveError={saveCardError}
            disabled={disabled}
          />
        ) : null}

        {activeDocTab === 'medevac_9line' ? (
          <MedevacSimulator
            disabled={disabled}
            userId={userId}
            addRangeLog={addRangeLog}
            addMedevacLog={addMedevacLog}
          />
        ) : null}

        {activeDocTab === 'simulation_history' ? (
          <SimulationHistory rangeLogs={rangeLogs} loading={rangeLogsLoading} />
        ) : null}

        {activeDocTab === 'casualty_archive' ? (
          <TcccMedicalHistoryTab cards={casualtyCards} loading={cardsLoading} />
        ) : null}

        {activeDocTab === 'field_templates' ? (
          <section aria-label={t('docs.templates.heading')} className="space-y-3">
            <p className="font-mono text-[10px] uppercase tracking-wider text-app-text/55">
              {t('docs.templates.heading')}
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {FIELD_TEMPLATE_IDS.map((tplId) => {
                const tpl = fieldTemplateCopy(tplId)
                const busy = templateBusy === tplId
                return (
                  <div
                    key={tplId}
                    className="flex flex-col justify-between rounded-lg border border-slate-800 bg-slate-950 p-4 transition-all duration-200 hover:border-red-800/50"
                  >
                    <div>
                      <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-red-500/90">
                        {tpl.title}
                      </p>
                      <p className="mt-1 font-mono text-[9px] uppercase text-app-text/55">{tpl.subtitle}</p>
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={async () => {
                        setTemplateBusy(tplId)
                        try {
                          await handleTemplateDownload(tplId)
                        } finally {
                          setTemplateBusy(null)
                        }
                      }}
                      className={[
                        'mt-4 w-full rounded border px-2 py-2 font-mono text-[9px] font-bold uppercase tracking-wider transition',
                        busy
                          ? 'border-slate-800 bg-slate-900 text-app-text/45'
                          : 'border-red-800/60 bg-red-950/40 text-red-300 hover:border-red-600/60 hover:bg-red-950/60',
                      ].join(' ')}
                      title={t('docs.templates.downloadTitle')}
                    >
                      {busy ? t('docs.templates.preparing') : tpl.button}
                    </button>
                  </div>
                )
              })}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  )
}
