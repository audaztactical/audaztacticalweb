import { useCallback, useMemo, useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import TacticalPanel from '../ui/TacticalPanel'
import { useAuth } from '../../context/AuthContext'
import { generateVbssObservationFormPdf } from '../../lib/vbssObservationFormPdf'
import {
  VBSS_EVALUATION_PHASES,
  VBSS_OBSERVED_EVAL_INITIAL_FORM,
  validateVbssObservedEvalForm,
} from '../../lib/vbssObservedEvalPayload'
import { VBSS_PHASE_SUB_CRITERIA } from '../../lib/vbssEvaluationPayload'
import { submitVbssObservedEval } from '../../lib/vbssObservedEvalSubmit'
import PhaseSubCriteriaFields from './PhaseSubCriteriaFields'

const inputClass =
  'w-full rounded border border-accent/30 bg-app-bg px-2 py-2 font-mono-technical text-sm text-slate-100 outline-none placeholder:text-app-text/45 focus:border-accent/60'

const selectClass =
  'dossier-blood-select w-full rounded border border-accent/35 bg-app-bg py-2 pl-2 pr-8 font-mono-technical text-[11px] uppercase text-app-text outline-none focus:border-accent/60'

const textareaClass =
  'w-full min-h-[4rem] resize-y rounded border border-accent/30 bg-app-bg px-2 py-2 font-mono-technical text-sm leading-relaxed text-slate-100 outline-none placeholder:text-app-text/45 focus:border-accent/60'

const labelClass = 'font-mono-technical text-[8px] font-bold uppercase tracking-[0.22em] text-app-text/55'

/**
 * @param {{
 *   addLog: (payload: Record<string, unknown>) => Promise<{ id: string }>
 *   onSubmitted?: () => void
 *   hidePdfBanner?: boolean
 * }} props
 */
export default function VbssObservedEvalForm({ addLog, onSubmitted, hidePdfBanner = false }) {
  const { user, userData } = useAuth()
  const uid = user?.uid ?? ''
  const operatorName = (userData?.callsign || user?.displayName || '').trim()

  const [form, setForm] = useState(VBSS_OBSERVED_EVAL_INITIAL_FORM)
  const [saving, setSaving] = useState(false)
  const [pdfBusy, setPdfBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [ok, setOk] = useState(false)

  const validationError = useMemo(() => validateVbssObservedEvalForm(form), [form])

  const patch = useCallback((/** @type {Partial<typeof form>} */ next) => {
    setForm((f) => ({ ...f, ...next }))
    setMsg('')
    setOk(false)
  }, [])

  const patchPhase = useCallback(
    (/** @type {import('../../lib/vbssEvaluationPayload').VbssPhaseId} */ id, /** @type {Partial<{ subScores: Record<string, string>; observation: string }>} */ next) => {
      setForm((f) => ({
        ...f,
        [id]: {
          ...f[id],
          ...next,
          subScores: next.subScores ? { ...f[id].subScores, ...next.subScores } : f[id].subScores,
        },
      }))
      setMsg('')
      setOk(false)
    },
    [],
  )

  const handleDownloadPdf = async () => {
    setPdfBusy(true)
    setMsg('')
    try {
      const formId = await generateVbssObservationFormPdf({
        callsign: userData?.callsign,
        username: userData?.username,
        displayName: user?.displayName ?? undefined,
      })
      setMsg(`PDF indirildi · ${formId}`)
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'PDF oluşturulamadı')
    } finally {
      setPdfBusy(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!uid || validationError) return
    setSaving(true)
    setMsg('')
    setOk(false)
    try {
      await submitVbssObservedEval({ addLog, userId: uid, operatorName, form })
      setOk(true)
      setMsg('Gözlem kaydı kaydedildi.')
      setForm({ ...VBSS_OBSERVED_EVAL_INITIAL_FORM })
      onSubmitted?.()
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Kayıt başarısız')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {!hidePdfBanner ? (
      <TacticalPanel className="border-accent/25 bg-app-bg/90 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-mono-technical text-[10px] font-bold uppercase tracking-[0.28em] text-accent/85">
              [ PDF GÖZLEM FORMU ]
            </p>
            <p className="mt-1 font-mono-technical text-[9px] text-app-text/55">
              Formu indirin, arkadaşınıza gözlem yaptırın, işaretlemeleri aşağıya girin.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={pdfBusy}
            className="inline-flex items-center justify-center gap-2 rounded border border-accent/50 bg-accent/12 px-4 py-2 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-accent transition hover:bg-accent/20 disabled:opacity-50"
          >
            {pdfBusy ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
            PDF Formu İndir
          </button>
        </div>
      </TacticalPanel>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4">
        <TacticalPanel className="space-y-4 border-accent/20 p-4">
          <p className="font-mono-technical text-[9px] font-bold uppercase tracking-[0.24em] text-accent/75">
            Gözlem meta
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className={labelClass}>Gözlemci adı *</span>
              <input className={inputClass} value={form.observerName} onChange={(e) => patch({ observerName: e.target.value })} required />
            </label>
            <label className="block space-y-1.5">
              <span className={labelClass}>Gözlemci callsign</span>
              <input className={inputClass} value={form.observerCallsign} onChange={(e) => patch({ observerCallsign: e.target.value })} />
            </label>
            <label className="block space-y-1.5">
              <span className={labelClass}>Saha tarihi *</span>
              <input type="date" className={inputClass} value={form.observedAt} onChange={(e) => patch({ observedAt: e.target.value })} required />
            </label>
            <label className="flex cursor-pointer items-center gap-2.5 self-end rounded border border-white/10 px-3 py-2.5">
              <input type="checkbox" checked={form.isTimed} onChange={(e) => patch({ isTimed: e.target.checked, targetOperationSec: e.target.checked ? form.targetOperationSec || '300' : '' })} />
              <span className="font-mono-technical text-[9px] uppercase text-app-text/80">Zamanlı oturum</span>
            </label>
            {form.isTimed ? (
              <label className="block space-y-1.5 sm:col-span-2">
                <span className={labelClass}>Hedef operasyon süresi (sn)</span>
                <input type="number" min={0.01} step={1} className={inputClass} value={form.targetOperationSec} onChange={(e) => patch({ targetOperationSec: e.target.value })} required />
              </label>
            ) : null}
          </div>
        </TacticalPanel>

        {VBSS_EVALUATION_PHASES.map((meta) => (
          <TacticalPanel key={meta.id} className="space-y-3 border-accent/15 p-4">
            <div>
              <p className="font-mono-technical text-xs font-bold uppercase tracking-wider text-app-text">{meta.title}</p>
              <p className="mt-0.5 font-mono-technical text-[9px] text-app-text/50">{meta.subtitle}</p>
            </div>
            <PhaseSubCriteriaFields
              criteria={VBSS_PHASE_SUB_CRITERIA[meta.id]}
              subScores={form[meta.id].subScores}
              onSubScoreChange={(criterionId, value) =>
                patchPhase(meta.id, { subScores: { [criterionId]: value } })
              }
              min={0}
              max={10}
              variant="select"
              selectClassName={selectClass}
              labelClassName={labelClass}
            />
            <label className="block space-y-1.5">
              <span className={labelClass}>Gözlem notu</span>
              <textarea className={textareaClass} value={form[meta.id].observation} onChange={(e) => patchPhase(meta.id, { observation: e.target.value })} />
            </label>
          </TacticalPanel>
        ))}

        <label className="block space-y-1.5">
          <span className={labelClass}>Genel operasyon notu</span>
          <textarea className={textareaClass} value={form.operationNote} onChange={(e) => patch({ operationNote: e.target.value })} />
        </label>

        {validationError && !saving ? (
          <p className="font-mono-technical text-[9px] uppercase text-amber-400/90">{validationError}</p>
        ) : null}
        {msg ? (
          <p className={`font-mono-technical text-[9px] uppercase ${ok ? 'text-accent' : 'text-red-400'}`}>{msg}</p>
        ) : null}

        <button
          type="submit"
          disabled={saving || !uid || Boolean(validationError)}
          className="inline-flex w-full items-center justify-center gap-2 rounded border border-accent/55 bg-accent/15 py-3 font-mono-technical text-[10px] font-bold uppercase tracking-[0.2em] text-accent transition hover:bg-accent/25 disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto sm:px-8"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : null}
          Kaydı Gönder
        </button>
      </form>
    </div>
  )
}
