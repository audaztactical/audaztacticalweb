import { useState } from 'react'
import { FileDown, FileText, History, Radio, ScrollText } from 'lucide-react'
import TcccMarchTab from './TcccMarchTab'
import MedevacSimulator from './MedevacSimulator'
import SimulationHistory from './SimulationHistory'
import TcccMedicalHistoryTab from './TcccMedicalHistoryTab'
import { CASUALTY_DD1380_INITIAL } from '../../lib/casualtyCardPayload'
import { submitCasualtyDd1380Card } from '../../lib/casualtyCardSubmit'
import { openTcccFieldPdfTemplate } from '../../lib/tcccFieldPdfTemplates'

/** @typedef {'march_dd1380' | 'medevac_9line' | 'simulation_history' | 'casualty_archive' | 'field_templates'} DocTab */

const DOC_TABS = [
  { id: /** @type {DocTab} */ ('march_dd1380'), label: 'MARCH - DD-1380 YARALI KARTI', Icon: FileText },
  { id: 'medevac_9line', label: '((•)) 9-LINE TAHLİYE TALEBİ SİMÜLASYONU', Icon: Radio },
  { id: 'simulation_history', label: '((•)) SİMÜLASYON GEÇMİŞ KAYITLARI', Icon: History },
  { id: 'casualty_archive', label: 'YARALI ARŞİVİ', Icon: ScrollText },
  { id: 'field_templates', label: 'PDF ŞABLONLARI', Icon: FileDown },
]

const FIELD_TEMPLATES = [
  { id: 'dd1380', title: 'DD FORM 1380', subtitle: 'YARALI KARTI · BOŞ ŞABLON' },
  { id: 'nine_line', title: '9-LINE TAHLİYE', subtitle: 'TELSİZ PROTOKOLÜ · BOŞ ŞABLON' },
  { id: 'casevac_mist', title: 'CASEVAC MIST', subtitle: 'SICAK BÖLGE · BOŞ ŞABLON' },
  { id: 'tccc_card', title: 'TCCC SAHA KARTI', subtitle: 'CEP REFERANSI · BOŞ ŞABLON' },
]

/** @param {string} templateId */
function handleTemplateDownload(templateId) {
  if (templateId === 'nine_line') openTcccFieldPdfTemplate('nine_line')
  else if (templateId === 'casevac_mist') openTcccFieldPdfTemplate('casevac_mist')
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
  const [activeDocTab, setActiveDocTab] = useState(/** @type {DocTab} */ ('march_dd1380'))
  const [dd1380Form, setDd1380Form] = useState({ ...CASUALTY_DD1380_INITIAL })
  const [savingCard, setSavingCard] = useState(false)
  const [saveCardOk, setSaveCardOk] = useState(false)
  const [saveCardError, setSaveCardError] = useState(/** @type {string | null} */ (null))

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
      setSaveCardError(`KART_KAYIT_BAŞARISIZ${code ? ` · ${code}` : ''}`)
    } finally {
      setSavingCard(false)
    }
  }

  return (
    <div className="tccc-doc-panel h-auto min-h-0 space-y-4">
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-3">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-app-text/70">
          Taktik Medikal Kılavuz
        </p>
        <p className="mt-1 font-mono text-xs leading-relaxed text-app-text/55">
          MARCH · DD-1380 yaralı kartı · 9-line tahliye · PDF şablonları
        </p>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Document workflow">
        {DOC_TABS.map((tab) => {
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
                {tab.label}
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
          <section aria-label="Field PDF templates" className="space-y-3">
            <p className="font-mono text-[10px] uppercase tracking-wider text-app-text/55">
              BOŞ PDF ŞABLON İNDİRME MERKEZİ
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {FIELD_TEMPLATES.map((tpl) => {
                const pdfReady = tpl.id === 'nine_line' || tpl.id === 'casevac_mist'
                return (
                  <div
                    key={tpl.id}
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
                      disabled={!pdfReady}
                      onClick={() => handleTemplateDownload(tpl.id)}
                      className={[
                        'mt-4 w-full rounded border px-2 py-2 font-mono text-[9px] font-bold uppercase tracking-wider transition',
                        pdfReady
                          ? 'border-red-800/60 bg-red-950/40 text-red-300 hover:border-red-600/60 hover:bg-red-950/60'
                          : 'border-slate-800 bg-slate-900 text-app-text/45',
                      ].join(' ')}
                      title={
                        pdfReady
                          ? 'Yazdır ile PDF olarak kaydedin'
                          : 'Şablon dosyası yakında eklenecek'
                      }
                    >
                      {pdfReady
                        ? tpl.id === 'casevac_mist'
                          ? '📄 CASEVAC MIST ŞABLONU'
                          : '📄 9-LINE TAHLİYE'
                        : 'İNDİR · YAKINDA'}
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
