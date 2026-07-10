import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion as Motion } from 'framer-motion'
import {
  AlertTriangle,
  Crosshair,
  Radio,
  RotateCcw,
  Shield,
  ShieldAlert,
  Target,
  UserX,
} from 'lucide-react'
import TacticalPanel from '../ui/TacticalPanel'
import {
  FOF_HIT_STATUS_OPTIONS,
  FOF_PENALTY_OPTIONS,
  FOF_SCENARIO_TYPES,
  computeFofInstructorScore,
  fofScoreHudTone,
} from '../../lib/instructorFofAssessment'
import {
  formatInstructorFofFailReason,
  formatInstructorFofHitStatusField,
  formatInstructorFofHudToneLabel,
  formatInstructorFofPenaltyField,
  formatInstructorFofScenarioLabel,
} from '../../lib/instructorDisplayText'

/** @typedef {import('../../lib/instructorFofAssessment').FofEvaluationInput} FofEvaluationInput */

/**
 * @typedef {{
 *   uid: string
 *   callsign?: string
 *   username?: string
 *   displayName?: string
 * }} SelectedOperator
 */

const labelClass = 'font-mono-technical text-[8px] font-bold uppercase tracking-[0.22em] text-app-text/55'

const selectClass =
  'dossier-blood-select w-full rounded border border-accent/35 bg-app-bg py-2 pl-2 pr-8 font-mono-technical text-[11px] uppercase text-app-text outline-none focus:border-accent/60'

const textareaClass =
  'w-full min-h-[5.5rem] resize-y rounded border border-accent/25 bg-app-bg px-3 py-2 font-mono-technical text-sm leading-relaxed text-slate-100 outline-none placeholder:text-app-text/45 focus:border-accent/55'

/** @returns {FofEvaluationInput} */
function createInitialForm() {
  return {
    scenarioType: FOF_SCENARIO_TYPES[0],
    oodaCycle: 3,
    tacticalCommunication: 3,
    coverManagement: 3,
    hitStatus: 'TEMİZ',
    penalties: {
      muzzleAwarenessViolation: false,
      collateralDamage: false,
      panicFreeze: false,
    },
    aarNotes: '',
  }
}

const METRIC_FIELD_DEFS = [
  { key: 'oodaCycle', Icon: Target, weight: '×10' },
  { key: 'tacticalCommunication', Icon: Radio, weight: '×8' },
  { key: 'coverManagement', Icon: Shield, weight: '×8' },
]

const HUD_TONE_STYLES = {
  green: {
    ring: 'border-accent/55 shadow-[0_0_24px_-8px_color-mix(in_srgb,var(--accent-color)_35%,transparent)]]',
    text: 'text-accent',
    bar: 'bg-accent',
  },
  amber: {
    ring: 'border-accent/55 shadow-[0_0_32px_-8px_rgba(255,180,0,0.4)]',
    text: 'text-accent',
    bar: 'bg-accent',
  },
  red: {
    ring: 'border-red-500/55 shadow-[0_0_32px_-8px_rgba(239,68,68,0.45)]',
    text: 'text-red-400',
    bar: 'bg-red-500',
  },
}

/**
 * @param {{
 *   selectedOperator?: SelectedOperator | null
 *   onSaveEvaluation: (payload: FofEvaluationInput & { finalScore: number; passed: boolean; instantFail: boolean; failReason: string | null; operatorId: string }) => void | Promise<void>
 *   saving?: boolean
 * }} props
 */
export default function ForceonForceTerminal({ selectedOperator = null, onSaveEvaluation, saving = false }) {
  const { t } = useTranslation('instructor')
  const [form, setForm] = useState(createInitialForm)
  const [saveMsg, setSaveMsg] = useState('')
  const [saveOk, setSaveOk] = useState(false)

  const metricFields = useMemo(
    () =>
      METRIC_FIELD_DEFS.map((field) => ({
        ...field,
        label: t(`education.fof.metrics.${field.key}.label`),
        hint: t(`education.fof.metrics.${field.key}.hint`),
      })),
    [t],
  )

  const operatorLabel = useMemo(() => {
    if (!selectedOperator) return null
    return (
      selectedOperator.callsign?.trim() ||
      selectedOperator.username?.trim() ||
      selectedOperator.displayName?.trim() ||
      selectedOperator.uid.slice(0, 8).toUpperCase()
    )
  }, [selectedOperator])

  const assessment = useMemo(() => computeFofInstructorScore(form), [form])
  const hudTone = fofScoreHudTone(assessment.finalScore, assessment.instantFail)
  const hudStyle = HUD_TONE_STYLES[hudTone]

  const patch = useCallback((/** @type {Partial<FofEvaluationInput>} */ next) => {
    setForm((prev) => ({ ...prev, ...next }))
    setSaveMsg('')
    setSaveOk(false)
  }, [])

  const patchPenalty = useCallback((/** @type {keyof FofEvaluationInput['penalties']} */ key, value) => {
    setForm((prev) => ({
      ...prev,
      penalties: { ...prev.penalties, [key]: value },
    }))
    setSaveMsg('')
    setSaveOk(false)
  }, [])

  const handleReset = () => {
    setForm(createInitialForm())
    setSaveMsg('')
    setSaveOk(false)
  }

  const handleSave = async () => {
    if (!selectedOperator?.uid) return
    setSaveMsg('')
    setSaveOk(false)
    try {
      await onSaveEvaluation({
        ...form,
        finalScore: assessment.finalScore,
        passed: assessment.passed,
        instantFail: assessment.instantFail,
        failReason: assessment.failReason,
        operatorId: selectedOperator.uid,
      })
      setSaveMsg(t('education.fof.logged'))
      setSaveOk(true)
      setForm(createInitialForm())
    } catch (err) {
      setSaveOk(false)
      setSaveMsg(err instanceof Error ? err.message : t('education.shared.saveFailed'))
    }
  }

  if (!selectedOperator) {
    return (
      <Motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-lg border border-amber-500/35 bg-amber-950/20 px-4 py-8 text-center"
      >
        <UserX className="mx-auto mb-3 size-10 text-amber-500/70" strokeWidth={1.25} aria-hidden />
        <p className="font-mono-technical text-[11px] font-bold uppercase tracking-[0.28em] text-amber-300">
          {t('education.fof.emptyTitle')}
        </p>
        <p className="mt-2 font-mono-technical text-[9px] uppercase text-app-text/55">
          {t('education.fof.emptyHint')}
        </p>
      </Motion.div>
    )
  }

  return (
    <div className="space-y-4">
      <TacticalPanel className="relative overflow-hidden border-accent/25 bg-app-bg/95 p-0">
        <span className="pointer-events-none absolute left-2 top-2 z-10 h-4 w-4 border-l border-t border-accent/40" />
        <span className="pointer-events-none absolute right-2 top-2 z-10 h-4 w-4 border-r border-t border-accent/40" />

        <div className="flex flex-col gap-4 border-b border-accent/15 bg-app-bg px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="min-w-0">
            <p className="font-mono-technical text-[8px] font-bold uppercase tracking-[0.32em] text-accent/75">
              {t('education.fof.liveBanner')}
            </p>
            <div className="mt-1 flex items-center gap-2">
              <Crosshair className="size-4 shrink-0 text-accent" strokeWidth={1.5} aria-hidden />
              <h3 className="truncate font-display text-base font-bold tracking-[0.12em] text-app-text sm:text-lg">
                {operatorLabel}
              </h3>
            </div>
            <p className="mt-0.5 font-mono-technical text-[9px] uppercase text-app-text/55">
              {t('education.fof.uidPrefix', { uid: selectedOperator.uid.slice(0, 12) })}
            </p>
          </div>

          <Motion.div
            key={`${assessment.finalScore}-${assessment.instantFail}`}
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 320, damping: 24 }}
            className={`flex min-w-[9rem] flex-col items-center rounded-lg border-2 px-5 py-3 ${hudStyle.ring}`}
          >
            <p className="font-mono-technical text-[7px] font-bold uppercase tracking-[0.28em] text-app-text/55">
              {t('education.fof.hudScore')}
            </p>
            <p className={`font-display text-4xl font-bold tabular-nums leading-none ${hudStyle.text}`}>
              {assessment.finalScore}
            </p>
            <p className={`mt-1 font-mono-technical text-[8px] font-bold uppercase tracking-wider ${hudStyle.text}`}>
              {formatInstructorFofHudToneLabel(hudTone)}
            </p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <Motion.div
                className={`h-full rounded-full ${hudStyle.bar}`}
                initial={{ width: 0 }}
                animate={{ width: `${assessment.finalScore}%` }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </Motion.div>
        </div>

        <AnimatePresence mode="wait">
          {assessment.instantFail && assessment.failReason ? (
            <Motion.div
              key={assessment.failReason}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-b border-red-500/30 bg-red-950/30 px-4 py-2.5 sm:px-5"
            >
              <p className="flex items-center gap-2 font-mono-technical text-[9px] font-bold uppercase text-red-300">
                <ShieldAlert className="size-3.5 shrink-0" aria-hidden />
                {t('education.fof.instantFail', {
                  reason: formatInstructorFofFailReason(assessment.failReason),
                })}
              </p>
            </Motion.div>
          ) : null}
        </AnimatePresence>

        <div className="space-y-5 p-4 sm:p-5">
          <label className="block space-y-1.5">
            <span className={labelClass}>{t('education.fof.scenarioType')}</span>
            <select
              className={selectClass}
              value={form.scenarioType}
              onChange={(e) => patch({ scenarioType: e.target.value })}
            >
              {FOF_SCENARIO_TYPES.map((s) => (
                <option key={s} value={s}>
                  {formatInstructorFofScenarioLabel(s)}
                </option>
              ))}
            </select>
          </label>

          <fieldset className="space-y-3">
            <legend className={`${labelClass} mb-2 block`}>{t('education.fof.metricsLegend')}</legend>
            <div className="grid gap-3 lg:grid-cols-3">
              {metricFields.map((field, idx) => {
                const MetricIcon = field.Icon
                return (
                <Motion.div
                  key={field.key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.06 }}
                  className="rounded border border-accent/20 bg-black/40 p-3"
                >
                  <div className="mb-2 flex items-start gap-2">
                    <MetricIcon className="mt-0.5 size-4 shrink-0 text-accent" strokeWidth={1.5} aria-hidden />
                    <div className="min-w-0">
                      <p className="font-mono-technical text-[9px] font-bold uppercase leading-snug text-app-text">
                        {field.label}
                      </p>
                      <p className="mt-0.5 font-mono-technical text-[7px] uppercase text-app-text/45">{field.hint}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={1}
                      max={5}
                      step={1}
                      value={form[field.key]}
                      onChange={(e) => patch({ [field.key]: Number(e.target.value) })}
                      className="h-1.5 flex-1 cursor-pointer accent-accent"
                      aria-label={field.label}
                    />
                    <span className="w-8 text-center font-display text-lg font-bold tabular-nums text-accent">
                      {form[field.key]}
                    </span>
                    <span className="font-mono-technical text-[7px] text-app-text/45">{field.weight}</span>
                  </div>
                </Motion.div>
                )
              })}
            </div>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className={`${labelClass} mb-2 block`}>{t('education.fof.hitStatusLegend')}</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {FOF_HIT_STATUS_OPTIONS.map((opt) => {
                const active = form.hitStatus === opt.id
                const isCritical = opt.id === 'KRİTİK'
                const displayLabel = formatInstructorFofHitStatusField(opt.id, 'label', opt.label)
                const displayHint = formatInstructorFofHitStatusField(opt.id, 'hint', opt.hint)
                return (
                  <Motion.button
                    key={opt.id}
                    type="button"
                    whileTap={{ scale: 0.98 }}
                    onClick={() => patch({ hitStatus: /** @type {FofEvaluationInput['hitStatus']} */ (opt.id) })}
                    className={[
                      'rounded border px-3 py-2.5 text-left transition',
                      active
                        ? isCritical
                          ? 'border-red-500/60 bg-red-950/40 text-red-300'
                          : opt.id === 'YARALI'
                            ? 'border-amber-500/50 bg-amber-950/30 text-amber-300'
                            : 'border-accent/50 bg-accent/10 text-accent'
                        : 'border-white/10 bg-black/30 text-app-text/70 hover:border-accent/30 hover:text-app-text',
                    ].join(' ')}
                  >
                    <p className="font-mono-technical text-[10px] font-bold uppercase tracking-wider">{displayLabel}</p>
                    <p className="mt-0.5 font-mono-technical text-[7px] uppercase leading-snug opacity-80">
                      {displayHint}
                    </p>
                  </Motion.button>
                )
              })}
            </div>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className={`${labelClass} mb-2 flex items-center gap-2`}>
              <AlertTriangle className="size-3 text-red-400" aria-hidden />
              {t('education.fof.penaltiesLegend')}
            </legend>
            <div className="grid gap-2 sm:grid-cols-1">
              {FOF_PENALTY_OPTIONS.map((pen) => {
                const active = form.penalties[pen.id] === true
                const displayLabel = formatInstructorFofPenaltyField(pen.id, 'label', pen.label)
                const displaySublabel = formatInstructorFofPenaltyField(pen.id, 'sublabel', pen.sublabel)
                return (
                  <Motion.label
                    key={pen.id}
                    whileTap={{ scale: 0.995 }}
                    className={[
                      'flex cursor-pointer items-start gap-3 rounded border px-3 py-3 transition',
                      active
                        ? pen.instantFail
                          ? 'border-red-500/55 bg-red-950/35 text-red-300'
                          : 'border-amber-500/45 bg-amber-950/25 text-amber-200'
                        : 'border-white/10 bg-black/25 text-app-text/70 hover:border-accent/25',
                    ].join(' ')}
                  >
                    <input
                      type="checkbox"
                      className="mt-1 size-4 shrink-0 accent-accent"
                      checked={active}
                      onChange={(e) => patchPenalty(pen.id, e.target.checked)}
                    />
                    <span>
                      <span className="block font-mono-technical text-[10px] font-bold uppercase tracking-wide">
                        {displayLabel}
                        {pen.instantFail ? (
                          <span className="ml-2 text-red-400">{t('education.fof.instantFailSuffix')}</span>
                        ) : pen.deduction ? (
                          <span className="ml-2 text-app-text/55">· −{pen.deduction}</span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 block font-mono-technical text-[8px] uppercase text-app-text/55">
                        {displaySublabel}
                      </span>
                    </span>
                  </Motion.label>
                )
              })}
            </div>
          </fieldset>

          <label className="block space-y-1.5">
            <span className={labelClass}>{t('education.fof.aarLabel')}</span>
            <textarea
              className={textareaClass}
              placeholder={t('education.fof.aarPlaceholder')}
              value={form.aarNotes}
              onChange={(e) => patch({ aarNotes: e.target.value })}
              maxLength={2000}
              rows={4}
            />
          </label>
        </div>
      </TacticalPanel>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <AnimatePresence>
          {saveMsg ? (
            <Motion.p
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className={[
                'font-mono-technical text-[9px] font-bold uppercase',
                saveOk ? 'text-accent' : 'text-red-400',
              ].join(' ')}
            >
              {saveMsg}
            </Motion.p>
          ) : (
            <p className="font-mono-technical text-[8px] uppercase text-app-text/45">
              {t('education.fof.orsHint')}
            </p>
          )}
        </AnimatePresence>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleReset}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded border border-white/15 bg-black/40 px-4 py-2.5 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-app-text/70 transition hover:border-white/30 hover:text-app-text disabled:opacity-40"
          >
            <RotateCcw className="size-3.5" aria-hidden />
            {t('education.fof.reset')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded border border-accent/55 bg-accent/12 px-5 py-2.5 font-mono-technical text-[9px] font-bold uppercase tracking-wider text-accent shadow-[0_0_20px_-6px_rgba(255,180,0,0.45)] transition hover:bg-accent/22 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Target className="size-3.5" aria-hidden />
            {saving ? t('education.fof.logging') : t('education.fof.logButton')}
          </button>
        </div>
      </div>
    </div>
  )
}
