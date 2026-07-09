import { useCallback, useMemo, useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import vbssImg from '../../assets/vbss.webp'
import TacticalPanel from '../ui/TacticalPanel'
import { useAuth } from '../../context/AuthContext'
import { generateVbssObservationFormPdf } from '../../lib/vbssObservationFormPdf'
import { VBSS_EVALUATION_PHASES, VBSS_PHASE_SUB_CRITERIA } from '../../lib/vbssEvaluationPayload'
import { VBSS_OBSERVED_EVAL_INITIAL_FORM } from '../../lib/vbssObservedEvalPayload'
import { submitVbssObservedEval } from '../../lib/vbssObservedEvalSubmit'
import { computeVbssEntryPreview } from '../../lib/vbssEntryPreview'
import {
  formatObservedEvalPhaseTitle,
  formatVbssObservedEvalValidationError,
} from '../../lib/trainingDisplayText'
import TrainingTerminalLayout from './layout/TrainingTerminalLayout'
import TrainingTerminalPanel from './layout/TrainingTerminalPanel'
import TrainingMetricGrid, { TrainingMetricField } from './layout/TrainingMetricGrid'
import TrainingVisualStage from './layout/TrainingVisualStage'
import TrainingStatusBar from './layout/TrainingStatusBar'
import VbssPhaseScoreBlock from './VbssPhaseScoreBlock'
import { inputClass, textareaClass, labelClass } from './layout/trainingTerminalTokens'

/**
 * @param {{
 *   addLog: (payload: Record<string, unknown>) => Promise<{ id: string }>
 *   onSubmitted?: () => void
 *   hidePdfBanner?: boolean
 * }} props
 */
export default function VbssEntryTerminal({ addLog, onSubmitted, hidePdfBanner = false }) {
  const { t } = useTranslation('training')
  const { user, userData } = useAuth()
  const uid = user?.uid ?? ''
  const operatorName = (userData?.callsign || user?.displayName || '').trim()

  const [form, setForm] = useState(VBSS_OBSERVED_EVAL_INITIAL_FORM)
  const [saving, setSaving] = useState(false)
  const [pdfBusy, setPdfBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [ok, setOk] = useState(false)

  const preview = useMemo(() => computeVbssEntryPreview(form), [form])
  const canSubmit = !preview.validationError && Boolean(uid)
  const submitBlockedReason = formatVbssObservedEvalValidationError(preview.validationError)

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
      setMsg(t('sectors.vbss.observedEval.messages.pdfDownloaded', { formId }))
    } catch (err) {
      setMsg(err instanceof Error ? err.message : t('sectors.vbss.observedEval.messages.pdfFailed'))
    } finally {
      setPdfBusy(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!uid || preview.validationError) return
    setSaving(true)
    setMsg('')
    setOk(false)
    try {
      await submitVbssObservedEval({ addLog, userId: uid, operatorName, form })
      setOk(true)
      setMsg(t('sectors.vbss.observedEval.messages.submitSuccess'))
      setForm({ ...VBSS_OBSERVED_EVAL_INITIAL_FORM })
      onSubmitted?.()
    } catch (err) {
      setMsg(err instanceof Error ? err.message : t('sectors.vbss.observedEval.messages.submitFailed'))
    } finally {
      setSaving(false)
    }
  }

  const entryForm = (
    <TrainingTerminalLayout
      onSubmit={handleSubmit}
      left={
        <TrainingTerminalPanel title={t('sectors.vbss.observedEval.form.metaPanel')}>
            <TrainingMetricField label={t('sectors.vbss.observedEval.form.observerName')}>
              <input
                className={inputClass}
                value={form.observerName}
                onChange={(e) => patch({ observerName: e.target.value })}
                required
              />
            </TrainingMetricField>
            <TrainingMetricField label={t('sectors.vbss.observedEval.form.observerCallsign')}>
              <input
                className={inputClass}
                value={form.observerCallsign}
                onChange={(e) => patch({ observerCallsign: e.target.value })}
              />
            </TrainingMetricField>
            <TrainingMetricField label={t('sectors.vbss.observedEval.form.observedDate')}>
              <input
                type="date"
                className={inputClass}
                value={form.observedAt}
                onChange={(e) => patch({ observedAt: e.target.value })}
                required
              />
            </TrainingMetricField>
            <label className="flex cursor-pointer items-center gap-2.5 rounded border border-white/10 px-3 py-2.5">
              <input
                type="checkbox"
                checked={form.isTimed}
                onChange={(e) =>
                  patch({
                    isTimed: e.target.checked,
                    targetOperationSec: e.target.checked ? form.targetOperationSec || '300' : '',
                  })
                }
              />
              <span className="font-mono-technical text-[9px] uppercase text-app-text/80">
                {t('sectors.vbss.observedEval.form.timedSession')}
              </span>
            </label>
            {form.isTimed ? (
              <TrainingMetricField label={t('sectors.vbss.observedEval.form.targetDurationSec')}>
                <input
                  type="number"
                  min={0.01}
                  step={1}
                  className={`${inputClass} tabular-nums`}
                  value={form.targetOperationSec}
                  onChange={(e) => patch({ targetOperationSec: e.target.value })}
                  required
                />
              </TrainingMetricField>
            ) : null}

            <TrainingMetricGrid title={t('sectors.vbss.observedEval.form.phaseAverages')} gridClassName="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {VBSS_EVALUATION_PHASES.map((meta) => (
                <div
                  key={meta.id}
                  className="rounded border border-accent/15 bg-black/30 px-2 py-2 text-center"
                >
                  <p className="font-mono-technical text-[7px] uppercase text-app-text/45">
                    {formatObservedEvalPhaseTitle('vbss', meta.id, meta.title)}
                  </p>
                  <p className="mt-1 font-mono-technical text-lg font-bold tabular-nums text-accent">
                    {preview.phaseScores[meta.id]?.toFixed(1) ?? '—'}
                  </p>
                </div>
              ))}
            </TrainingMetricGrid>

            <TrainingVisualStage
              imageSrc={vbssImg}
              imageAlt={t('sectors.vbss.observedEval.form.imageAlt')}
              stats={
                <>
                  <p>
                    {t('sectors.vbss.observedEval.form.overallScore', {
                      score: preview.overallScore.toFixed(1),
                    })}
                  </p>
                  {VBSS_EVALUATION_PHASES.map((meta) => (
                    <p key={meta.id} className="mt-0.5">
                      {formatObservedEvalPhaseTitle('vbss', meta.id, meta.title).split(' ')[0]}:{' '}
                      <span className="text-accent tabular-nums">
                        {preview.phaseScores[meta.id]?.toFixed(1) ?? '—'}
                      </span>
                    </p>
                  ))}
                </>
              }
            />
          </TrainingTerminalPanel>
        }
        right={
          <TrainingTerminalPanel
            title={t('sectors.vbss.observedEval.form.phaseScoresPanel')}
            titleClassName="text-app-text"
            corners="bottom"
            panelClassName="relative flex min-h-0 flex-col border-accent/25 bg-app-bg/95 p-0"
            bodyClassName="flex min-h-0 flex-1 flex-col space-y-4 p-4 sm:p-5"
          >
            <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto pr-0.5 sm:max-h-[min(32rem,42vh)] lg:max-h-[min(36rem,48vh)]">
              {VBSS_EVALUATION_PHASES.map((meta) => (
                <VbssPhaseScoreBlock
                  key={meta.id}
                  phaseId={meta.id}
                  criteria={VBSS_PHASE_SUB_CRITERIA[meta.id]}
                  subScores={form[meta.id].subScores}
                  observation={form[meta.id].observation}
                  onSubScoreChange={(criterionId, value) =>
                    patchPhase(meta.id, { subScores: { [criterionId]: value } })
                  }
                  onObservationChange={(value) => patchPhase(meta.id, { observation: value })}
                />
              ))}
            </div>

            <label className="mt-auto block shrink-0 space-y-1">
              <span className={labelClass}>{t('sectors.vbss.observedEval.form.generalOperationNote')}</span>
              <textarea
                className={`${textareaClass} min-h-[4.5rem]`}
                placeholder={t('sectors.vbss.observedEval.form.generalOperationNotePlaceholder')}
                value={form.operationNote}
                onChange={(e) => patch({ operationNote: e.target.value })}
                rows={3}
                maxLength={2000}
              />
            </label>
          </TrainingTerminalPanel>
        }
        footer={
          <TrainingStatusBar
            successPercent={preview.successPercent}
            submitBlockedReason={submitBlockedReason}
            saving={saving}
            canSubmit={canSubmit}
            submitLabel={t('sectors.vbss.observedEval.form.submit')}
            successMessage={ok ? msg : null}
            errorMessage={!ok && msg ? msg : null}
          />
        }
      />
  )

  if (hidePdfBanner) {
    return entryForm
  }

  return (
    <div className="w-full min-w-0 max-w-none space-y-4">
      <TacticalPanel className="border-accent/25 bg-app-bg/90 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-mono-technical text-[10px] font-bold uppercase tracking-[0.28em] text-accent/85">
              {t('sectors.vbss.observedEval.pdfBanner.kicker')}
            </p>
            <p className="mt-1 font-mono-technical text-[9px] text-app-text/55">
              {t('sectors.vbss.observedEval.pdfBanner.hint')}
            </p>
          </div>
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={pdfBusy}
            className="inline-flex items-center justify-center gap-2 rounded border border-accent/50 bg-accent/12 px-4 py-2 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-accent transition hover:bg-accent/20 disabled:opacity-50"
          >
            {pdfBusy ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
            {t('sectors.vbss.observedEval.pdfBanner.download')}
          </button>
        </div>
      </TacticalPanel>
      {entryForm}
    </div>
  )
}
