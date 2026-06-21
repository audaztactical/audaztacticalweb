import { useCallback, useMemo, useState } from 'react'
import { AlertTriangle, Download, Loader2 } from 'lucide-react'
import TacticalPanel from '../ui/TacticalPanel'
import { useAuth } from '../../context/AuthContext'
import { generateTcccObservationFormPdf } from '../../lib/tcccObservationFormPdf'
import {
  TCCC_OBSERVED_EVAL_INITIAL_FORM,
  validateTcccObservedEvalForm,
} from '../../lib/tcccObservedEvalPayload'
import { submitTcccObservedEval } from '../../lib/tcccObservedEvalSubmit'
import {
  TCCC_MARCH_ACTION_CHIPS,
  TCCC_MARCH_EVALUATION_PHASES,
} from '../../lib/tcccEvaluationPayload'

/** @typedef {import('../../lib/tcccEvaluationPayload').TcccMarchPhaseId} TcccMarchPhaseId */

const inputClass =
  'w-full rounded border border-accent/30 bg-app-bg px-2 py-2 font-mono-technical text-sm text-slate-100 outline-none placeholder:text-app-text/45 focus:border-accent/60'

const textareaClass =
  'w-full min-h-[4rem] resize-y rounded border border-accent/30 bg-app-bg px-2 py-2 font-mono-technical text-sm leading-relaxed text-slate-100 outline-none placeholder:text-app-text/45 focus:border-accent/60'

const labelClass = 'font-mono-technical text-[8px] font-bold uppercase tracking-[0.22em] text-app-text/55'

const chipClass = (active) =>
  `rounded border px-2.5 py-1.5 font-mono-technical text-[10px] transition ${
    active
      ? 'border-accent/50 bg-accent/10 text-accent'
      : 'border-white/10 text-app-text/60 hover:border-accent/30'
  }`

const SEGMENT_VALUES = Array.from({ length: 10 }, (_, i) => i + 1)

/**
 * @param {{
 *   value: string
 *   onChange: (v: string) => void
 *   disabled?: boolean
 * }} props
 */
function ScoreBar({ value, onChange, disabled = false }) {
  const selected = disabled ? 0 : Number(value) || 0
  return (
    <div className="flex flex-wrap gap-1" role="group" aria-label="Skor 1-10">
      {SEGMENT_VALUES.map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          onClick={() => onChange(String(n))}
          className={[
            'h-8 min-w-[2rem] rounded border font-mono-technical text-[11px] font-bold tabular-nums',
            selected >= n
              ? 'border-accent/60 bg-accent/15 text-accent'
              : 'border-white/15 text-app-text/45 hover:border-accent/35',
            disabled ? 'cursor-not-allowed opacity-40' : '',
          ].join(' ')}
        >
          {n}
        </button>
      ))}
    </div>
  )
}

/**
 * @param {{
 *   addLog: (payload: Record<string, unknown>) => Promise<{ id: string }>
 *   onSubmitted?: () => void
 *   hidePdfBanner?: boolean
 * }} props
 */
export default function TcccObservedEvalForm({ addLog, onSubmitted, hidePdfBanner = false }) {
  const { user, userData } = useAuth()
  const uid = user?.uid ?? ''
  const operatorName = (userData?.callsign || user?.displayName || '').trim()

  const [form, setForm] = useState(TCCC_OBSERVED_EVAL_INITIAL_FORM)
  const [saving, setSaving] = useState(false)
  const [pdfBusy, setPdfBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [ok, setOk] = useState(false)

  const validationError = useMemo(() => validateTcccObservedEvalForm(form), [form])

  const patch = useCallback((/** @type {Partial<typeof form>} */ next) => {
    setForm((f) => ({ ...f, ...next }))
    setMsg('')
    setOk(false)
  }, [])

  const patchPhase = useCallback(
    (/** @type {TcccMarchPhaseId} */ id, /** @type {Partial<typeof form.m>} */ next) => {
      setForm((f) => ({ ...f, [id]: { ...f[id], ...next } }))
      setMsg('')
      setOk(false)
    },
    [],
  )

  const toggleChip = useCallback((/** @type {TcccMarchPhaseId} */ phaseId, /** @type {string} */ chipId) => {
    setForm((f) => ({
      ...f,
      [phaseId]: {
        ...f[phaseId],
        actions: { ...f[phaseId].actions, [chipId]: !f[phaseId].actions[chipId] },
      },
    }))
    setMsg('')
    setOk(false)
  }, [])

  const handleDownloadPdf = async () => {
    setPdfBusy(true)
    setMsg('')
    try {
      const formId = await generateTcccObservationFormPdf({
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
      await submitTcccObservedEval({ addLog, userId: uid, operatorName, form })
      setOk(true)
      setMsg('Gözlem kaydı kaydedildi.')
      setForm({ ...TCCC_OBSERVED_EVAL_INITIAL_FORM })
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
              [ PDF GÖZLEM FORMU · MARCH ]
            </p>
            <p className="mt-1 font-mono-technical text-[9px] text-app-text/55">
              Formu indirin, gözlemci MARCH safhalarını işaretlesin, sonuçları buraya girin.
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
              <input type="checkbox" checked={form.isTimed} onChange={(e) => patch({ isTimed: e.target.checked, targetInterventionSec: e.target.checked ? form.targetInterventionSec || '180' : '' })} />
              <span className="font-mono-technical text-[9px] uppercase text-app-text/80">Zamanlı müdahale</span>
            </label>
            {form.isTimed ? (
              <label className="block space-y-1.5 sm:col-span-2">
                <span className={labelClass}>Hedef müdahale süresi (sn)</span>
                <input type="number" min={0.01} step={1} className={inputClass} value={form.targetInterventionSec} onChange={(e) => patch({ targetInterventionSec: e.target.value })} required />
              </label>
            ) : null}
          </div>
        </TacticalPanel>

        {TCCC_MARCH_EVALUATION_PHASES.map((meta) => {
          const phase = form[meta.id]
          return (
            <TacticalPanel key={meta.id} className="space-y-3 border-accent/15 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-mono-technical text-xs font-bold uppercase tracking-wider text-app-text">
                    {meta.letter} — {meta.title}
                  </p>
                  <p className="mt-0.5 font-mono-technical text-[9px] text-app-text/50">{meta.subtitle}</p>
                </div>
                <button
                  type="button"
                  onClick={() => patchPhase(meta.id, { criticalFail: !phase.criticalFail, score: !phase.criticalFail ? '' : phase.score })}
                  className={[
                    'inline-flex items-center gap-1 rounded border px-2 py-1 font-mono-technical text-[8px] font-bold uppercase tracking-wider',
                    phase.criticalFail
                      ? 'border-red-500/50 bg-red-950/40 text-red-400'
                      : 'border-white/15 text-app-text/50 hover:border-red-500/40',
                  ].join(' ')}
                >
                  <AlertTriangle className="size-3" aria-hidden />
                  {phase.criticalFail ? 'K.İ.A AKTİF' : 'Kritik hata'}
                </button>
              </div>

              <div className="space-y-1.5">
                <span className={labelClass}>Performans skoru (1–10) *</span>
                <ScoreBar value={phase.score} onChange={(v) => patchPhase(meta.id, { score: v })} disabled={phase.criticalFail} />
              </div>

              <div className="space-y-1.5">
                <span className={labelClass}>Taktik müdahale</span>
                <div className="flex flex-wrap gap-2">
                  {TCCC_MARCH_ACTION_CHIPS[meta.id].map((chip) => (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => toggleChip(meta.id, chip.id)}
                      className={chipClass(Boolean(phase.actions[chip.id]))}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>

              <label className="block space-y-1.5">
                <span className={labelClass}>Gözlem notu</span>
                <textarea className={textareaClass} value={phase.observation} onChange={(e) => patchPhase(meta.id, { observation: e.target.value })} />
              </label>
            </TacticalPanel>
          )
        })}

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
