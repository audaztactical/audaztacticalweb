import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Activity,
  Droplets,
  HeartPulse,
  Shield,
  ThermometerSun,
  Wind,
} from 'lucide-react'
import { CASUALTY_DD1380_INITIAL } from '../../lib/casualtyCardPayload'
import { MARCH_DD1380_BUTTON_STYLES } from '../../lib/marchDd1380Config'
import {
  avpuOptions,
  casualtyBloodTypeOptions,
  evacPriorityOptions,
  fluidOptions,
  marchStepDisplay,
  marchStepsDisplay,
  ndcGaugeOptions,
  pupilOptions,
  radialPulseOptions,
  tqLocationOptions,
} from '../../lib/healthDisplayText'

const STEP_ICONS = {
  M: Droplets,
  A: Wind,
  R: Activity,
  C: HeartPulse,
  H: ThermometerSun,
}

const fieldClass =
  'w-full rounded-lg border border-white/12 bg-black/50 px-3 py-2 font-mono-technical text-xs text-slate-100 focus:border-accent/45 focus:outline-none focus:ring-1 focus:ring-accent/25'

const selectClass =
  'dossier-blood-select w-full rounded-lg border border-white/15 bg-black/50 py-2 pl-2 pr-8 font-mono-technical text-xs uppercase text-slate-100 focus:border-accent/45'

/**
 * @param {{
 *   form: typeof CASUALTY_DD1380_INITIAL
 *   onPatch: (patch: Partial<typeof CASUALTY_DD1380_INITIAL>) => void
 *   onSave: () => void
 *   saving: boolean
 *   saveOk: boolean
 *   saveError: string | null
 *   disabled?: boolean
 *   onMarchLetterClick?: (key: import('../../lib/marchDd1380Config').MarchStepKey) => void
 *   protocolInline?: React.ReactNode
 * }} props
 */
export default function Dd1380MarchWorkspace({
  form,
  onPatch,
  onSave,
  saving,
  saveOk,
  saveError,
  disabled = false,
  onMarchLetterClick,
  protocolInline = null,
}) {
  const { t } = useTranslation('health')
  const steps = marchStepsDisplay()
  const activeStep = marchStepDisplay(form.activeMarchStep)
  const detailPanelRef = useRef(/** @type {HTMLDivElement | null} */ (null))

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      detailPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
    return () => cancelAnimationFrame(frame)
  }, [form.activeMarchStep])

  return (
    <div className="h-auto min-h-0 space-y-4">
      <section aria-label={t('march.ariaMarch')}>
        <div className="mb-3 flex items-center gap-2">
          <Shield className="size-5 text-accent" strokeWidth={1.5} aria-hidden />
          <span className="font-mono-technical text-xs font-bold tracking-[0.35em] text-accent">
            {t('march.cardTitle')}
          </span>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 sm:grid sm:grid-cols-5 sm:overflow-visible">
          {steps.map((step) => {
            const Icon = STEP_ICONS[step.key]
            const active = form.activeMarchStep === step.key
            return (
              <button
                key={step.key}
                type="button"
                disabled={disabled}
                onClick={() => {
                  onPatch({ activeMarchStep: step.key })
                  onMarchLetterClick?.(step.key)
                }}
                className={[
                  'flex min-w-[3.5rem] shrink-0 flex-col items-center rounded-xl border px-1.5 py-2 transition hover:brightness-110 sm:min-w-0 sm:px-2 sm:py-3',
                  MARCH_DD1380_BUTTON_STYLES[step.key],
                  active ? 'ring-2 ring-accent/70 brightness-110' : 'opacity-85',
                ].join(' ')}
                aria-pressed={active}
              >
                <span
                  className={[
                    'font-mono-technical text-2xl font-black tabular-nums leading-none sm:text-3xl',
                    step.accent,
                  ].join(' ')}
                >
                  {step.key}
                </span>
                <Icon className={`mt-1 size-5 opacity-90 sm:mt-1.5 sm:size-6 ${step.accent}`} strokeWidth={1.5} aria-hidden />
              </button>
            )
          })}
        </div>

        {protocolInline}

        <div
          ref={detailPanelRef}
          className={[
            'mt-3 h-auto min-h-0 rounded-xl border p-3 sm:p-5',
            activeStep.panelBorder,
            activeStep.panelBg,
          ].join(' ')}
        >
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <p className={`font-mono-technical text-[10px] font-bold uppercase tracking-[0.28em] ${activeStep.accent}`}>
                {t('march.stepHeading', {
                  key: activeStep.key,
                  title: activeStep.title,
                  subtitle: activeStep.subtitle.toUpperCase(),
                })}
              </p>
            </div>
          </div>

          <MarchStepFields stepKey={form.activeMarchStep} form={form} onPatch={onPatch} disabled={disabled} />

          <p className="mt-4 rounded-lg border border-white/8 bg-black/40 px-3 py-2.5 font-mono-technical text-[10px] leading-relaxed text-app-text/70">
            {activeStep.doctrine}
          </p>
        </div>
      </section>

      <section
        aria-label={t('march.ariaIdentity')}
        className="rounded-xl border border-accent/20 bg-gradient-to-b from-black/80 to-red-950/[0.12] p-4 sm:p-5"
      >
        <p className="mb-4 font-mono-technical text-xs tracking-[0.25em] text-accent">{t('march.identityHeading')}</p>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <label className="block shrink-0 space-y-2 lg:min-w-[10rem]">
            <span className="font-mono-technical text-[9px] font-bold uppercase tracking-wider text-red-400/90">
              {t('march.fields.bloodType')}
            </span>
            <div className="rounded-lg border border-accent/35 bg-black/50 px-3 py-3 shadow-[0_0_48px_-12px_rgba(255,180,0,0.35)]">
              <select
                value={form.bloodType || ''}
                onChange={(e) => onPatch({ bloodType: e.target.value })}
                disabled={disabled}
                className={`${selectClass} text-center text-lg font-black text-accent`}
                aria-label={t('march.ariaBloodType')}
              >
                <option value="">{t('march.selectPlaceholder')}</option>
                {casualtyBloodTypeOptions().map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </label>
          <div className="min-w-0 flex-1 space-y-3">
            <label className="block space-y-1">
              <span className="font-mono-technical text-[9px] font-bold uppercase tracking-wider text-app-text/55">
                {t('march.fields.patientName')}
              </span>
              <input
                type="text"
                value={form.patientName}
                onChange={(e) => onPatch({ patientName: e.target.value })}
                disabled={disabled}
                className={fieldClass}
                placeholder={t('march.fields.patientNamePlaceholder')}
                maxLength={80}
              />
            </label>
            <label className="block space-y-1">
              <span className="font-mono-technical text-[9px] font-bold uppercase tracking-wider text-app-text/55">
                {t('march.fields.allergies')}
              </span>
              <textarea
                rows={2}
                value={form.allergies}
                onChange={(e) => onPatch({ allergies: e.target.value })}
                disabled={disabled}
                className={`${fieldClass} resize-y`}
                maxLength={300}
              />
            </label>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-accent/20 bg-black/50 p-4 sm:p-5">
        <p className="mb-3 font-mono-technical text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
          {t('march.injuryHeading')}
        </p>
        <label className="mb-3 block space-y-1">
          <span className="font-mono-technical text-[9px] font-bold uppercase tracking-wider text-app-text/55">
            {t('march.fields.moi')}
          </span>
          <input
            type="text"
            value={form.mechanismOfInjury}
            onChange={(e) => onPatch({ mechanismOfInjury: e.target.value })}
            disabled={disabled}
            className={fieldClass}
            placeholder={t('march.fields.moiPlaceholder')}
            maxLength={200}
          />
        </label>
        <label className="mb-3 block space-y-1">
          <span className="font-mono-technical text-[9px] font-bold uppercase tracking-wider text-app-text/55">
            {t('march.fields.treatments')}
          </span>
          <textarea
            rows={2}
            value={form.appliedTreatmentsNote}
            onChange={(e) => onPatch({ appliedTreatmentsNote: e.target.value })}
            disabled={disabled}
            className={`${fieldClass} resize-y`}
            placeholder={t('march.fields.treatmentsPlaceholder')}
            maxLength={800}
          />
        </label>
        <label className="mb-3 block space-y-1">
          <span className="font-mono-technical text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
            {t('march.fields.operationNote')}
          </span>
          <textarea
            rows={4}
            value={form.operationNote}
            onChange={(e) => onPatch({ operationNote: e.target.value })}
            disabled={disabled}
            className={`${fieldClass} min-h-[5.5rem] resize-y text-sm leading-relaxed`}
            placeholder={t('march.fields.operationNotePlaceholder')}
            maxLength={2000}
          />
        </label>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <span className="font-mono-technical text-[9px] font-bold uppercase tracking-wider text-app-text/55">
              {t('march.fields.evacPriority')}
            </span>
            <div className="flex flex-wrap gap-2" role="group" aria-label={t('march.ariaEvacPriority')}>
              {evacPriorityOptions().map((opt) => {
                const on = form.evacPriority === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => onPatch({ evacPriority: /** @type {import('../../lib/marchDd1380Config').EvacPriority} */ (opt.id) })}
                    className={[
                      'rounded border px-3 py-2 font-mono-technical text-[9px] font-bold uppercase tracking-wider transition',
                      on
                        ? 'border-accent/70 bg-accent/18 text-accent shadow-[0_0_12px_rgba(251,191,36,0.3)]'
                        : 'border-white/15 bg-black/40 text-app-text/55 hover:border-accent/35',
                    ].join(' ')}
                    aria-pressed={on}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          <button
            type="button"
            disabled={disabled || saving}
            onClick={onSave}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-accent/55 bg-accent/12 px-6 py-3 font-mono-technical text-sm font-bold uppercase tracking-wider text-accent shadow-[0_0_20px_rgba(251,191,36,0.25)] transition hover:bg-accent/22 disabled:opacity-40"
          >
            <span className="text-xl leading-none" aria-hidden>
              ✓
            </span>
            {saving ? t('march.saving') : t('march.saveCard')}
          </button>
        </div>

        {saveOk ? (
          <p className="mt-3 text-center font-mono-technical text-[10px] font-bold uppercase text-accent">
            {t('march.saveOk')}
          </p>
        ) : null}
        {saveError ? (
          <p className="mt-3 text-center font-mono-technical text-[10px] font-bold uppercase text-red-400">
            {saveError}
          </p>
        ) : null}
      </section>
    </div>
  )
}

/**
 * @param {{
 *   stepKey: string
 *   form: typeof CASUALTY_DD1380_INITIAL
 *   onPatch: (patch: Partial<typeof CASUALTY_DD1380_INITIAL>) => void
 *   disabled?: boolean
 * }} props
 */
function MarchStepFields({ stepKey, form, onPatch, disabled }) {
  const { t } = useTranslation('health')

  if (stepKey === 'M') {
    const tqActive = Boolean(form.tourniquetApplied)
    const tqFieldDisabled = disabled || !tqActive

    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <CheckRow
          label={t('march.checks.tourniquet')}
          checked={form.tourniquetApplied}
          onChange={(v) => onPatch({ tourniquetApplied: v })}
          disabled={disabled}
          className="sm:col-span-2"
        />
        <label className={`block space-y-1 sm:col-span-2 ${tqFieldDisabled ? 'opacity-45' : ''}`}>
          <LabelMuted>{t('march.fields.tqTime')}</LabelMuted>
          <input
            type="time"
            value={form.tqInsertionTime}
            onChange={(e) => onPatch({ tqInsertionTime: e.target.value })}
            disabled={tqFieldDisabled}
            className={fieldClass}
          />
        </label>
        <label className={`block space-y-1 ${tqFieldDisabled ? 'opacity-45' : ''}`}>
          <LabelMuted>{t('march.fields.tqLocation')}</LabelMuted>
          <select
            value={form.tqLocation}
            onChange={(e) => onPatch({ tqLocation: e.target.value })}
            disabled={tqFieldDisabled}
            className={selectClass}
          >
            {tqLocationOptions().map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        {form.tqLocation === 'custom' ? (
          <label className={`block space-y-1 ${tqFieldDisabled ? 'opacity-45' : ''}`}>
            <LabelMuted>{t('march.fields.tqCustom')}</LabelMuted>
            <input
              type="text"
              value={form.tqLocationCustom}
              onChange={(e) => onPatch({ tqLocationCustom: e.target.value })}
              disabled={tqFieldDisabled}
              className={fieldClass}
            />
          </label>
        ) : (
          <div className="hidden sm:block" />
        )}
        <CheckRow
          label={t('march.checks.woundPacking')}
          checked={form.woundPackingHemostatic}
          onChange={(v) => onPatch({ woundPackingHemostatic: v })}
          disabled={disabled}
        />
        <CheckRow
          label={t('march.checks.pressureBandage')}
          checked={form.pressureBandage}
          onChange={(v) => onPatch({ pressureBandage: v })}
          disabled={disabled}
        />
      </div>
    )
  }

  if (stepKey === 'A') {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <CheckRow
          label={t('march.checks.npa')}
          checked={form.npaInserted}
          onChange={(v) => onPatch({ npaInserted: v })}
          disabled={disabled}
        />
        <CheckRow
          label={t('march.checks.intubatedCric')}
          checked={form.intubatedCric}
          onChange={(v) => onPatch({ intubatedCric: v })}
          disabled={disabled}
        />
        <CheckRow
          label={t('march.checks.recoveryPosition')}
          checked={form.recoveryPosition}
          onChange={(v) => onPatch({ recoveryPosition: v })}
          disabled={disabled}
          className="sm:col-span-2"
        />
      </div>
    )
  }

  if (stepKey === 'R') {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <CheckRow
          label={t('march.checks.ventedChestSeal')}
          checked={form.ventedChestSeal}
          onChange={(v) => onPatch({ ventedChestSeal: v })}
          disabled={disabled}
        />
        <CheckRow
          label={t('march.checks.needleDecompression')}
          checked={form.needleDecompression}
          onChange={(v) => onPatch({ needleDecompression: v })}
          disabled={disabled}
        />
        <label className="block space-y-1">
          <LabelMuted>{t('march.fields.ndcGauge')}</LabelMuted>
          <select
            value={form.ndcGauge}
            onChange={(e) => onPatch({ ndcGauge: e.target.value })}
            disabled={disabled || !form.needleDecompression}
            className={selectClass}
          >
            {ndcGaugeOptions().map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <LabelMuted>{t('march.fields.respiratoryRate')}</LabelMuted>
          <input
            type="number"
            min={0}
            max={80}
            step={1}
            value={form.respiratoryRate}
            onChange={(e) => onPatch({ respiratoryRate: e.target.value })}
            disabled={disabled}
            className={fieldClass}
            placeholder={t('march.fields.respiratoryRatePlaceholder')}
          />
        </label>
      </div>
    )
  }

  if (stepKey === 'C') {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <CheckRow
          label={t('march.checks.ivIo')}
          checked={form.ivIoAccess}
          onChange={(v) => onPatch({ ivIoAccess: v })}
          disabled={disabled}
        />
        <CheckRow
          label={t('march.checks.txa')}
          checked={form.txaAdministered}
          onChange={(v) => onPatch({ txaAdministered: v })}
          disabled={disabled}
        />
        <label className="block space-y-1">
          <LabelMuted>{t('march.fields.fluid')}</LabelMuted>
          <select
            value={form.fluidAdministered}
            onChange={(e) => onPatch({ fluidAdministered: e.target.value })}
            disabled={disabled || !form.ivIoAccess}
            className={selectClass}
          >
            <option value="">{t('march.selectPlaceholderShort')}</option>
            {fluidOptions().map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <LabelMuted>{t('march.fields.radialPulse')}</LabelMuted>
          <select
            value={form.radialPulse}
            onChange={(e) => onPatch({ radialPulse: e.target.value })}
            disabled={disabled}
            className={selectClass}
          >
            <option value="">{t('march.selectPlaceholderShort')}</option>
            {radialPulseOptions().map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    )
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <CheckRow
        label={t('march.checks.hypothermiaWrap')}
        checked={form.hypothermiaWrap}
        onChange={(v) => onPatch({ hypothermiaWrap: v })}
        disabled={disabled}
      />
      <CheckRow
        label={t('march.checks.activeHeating')}
        checked={form.activeHeating}
        onChange={(v) => onPatch({ activeHeating: v })}
        disabled={disabled}
      />
      <label className="block space-y-1">
        <LabelMuted>{t('march.fields.avpu')}</LabelMuted>
        <select
          value={form.avpuLevel}
          onChange={(e) => onPatch({ avpuLevel: e.target.value })}
          disabled={disabled}
          className={selectClass}
        >
          <option value="">{t('march.selectPlaceholderShort')}</option>
          {avpuOptions().map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-1">
        <LabelMuted>{t('march.fields.pupil')}</LabelMuted>
        <select
          value={form.pupilStatus}
          onChange={(e) => onPatch({ pupilStatus: e.target.value })}
          disabled={disabled}
          className={selectClass}
        >
          <option value="">{t('march.selectPlaceholderShort')}</option>
          {pupilOptions().map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}

/**
 * @param {{
 *   label: string
 *   checked: boolean
 *   onChange: (v: boolean) => void
 *   disabled?: boolean
 *   className?: string
 * }} props
 */
function CheckRow({ label, checked, onChange, disabled, className = '' }) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-lg border border-white/10 bg-black/35 px-3 py-2.5 transition hover:border-white/20 ${className}`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-4 shrink-0 accent-accent"
      />
      <span className="font-mono-technical text-[10px] uppercase leading-snug text-app-text/90">{label}</span>
    </label>
  )
}

function LabelMuted({ children }) {
  return (
    <span className="font-mono-technical text-[9px] font-bold uppercase tracking-wider text-app-text/55">
      {children}
    </span>
  )
}
