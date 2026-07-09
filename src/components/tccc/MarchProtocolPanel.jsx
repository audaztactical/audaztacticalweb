import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { marchProtocolDetail, marchStepDisplay } from '../../lib/healthDisplayText'

/** @typedef {import('../../lib/marchDd1380Config').MarchStepKey} MarchStepKey */

/**
 * @param {{
 *   stepKey: MarchStepKey
 *   onClose: () => void
 *   variant?: 'side' | 'inline'
 * }} props
 */
export default function MarchProtocolPanel({ stepKey, onClose, variant = 'side' }) {
  const { t } = useTranslation('health')
  const step = marchStepDisplay(stepKey)
  const detail = marchProtocolDetail(stepKey)

  return (
    <div
      className={[
        'rounded-xl border p-4 sm:p-5',
        step.panelBorder,
        step.panelBg,
        variant === 'side' ? 'h-fit lg:sticky lg:top-4' : '',
        variant === 'inline' ? 'h-auto w-full' : '',
      ].join(' ')}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className={`font-mono-technical text-[10px] font-bold uppercase tracking-[0.28em] ${step.accent}`}>
            {step.key} · {t('march.protocolCard')}
          </p>
          <p className="font-mono-technical text-sm font-bold text-app-text">{step.title}</p>
          <p className="font-mono-technical text-xs text-app-text/70">{step.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-white/15 p-1.5 text-app-text/55 transition hover:text-accent"
          aria-label={t('march.protocolClose')}
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>

      <p className="mb-4 font-mono-technical text-[11px] leading-relaxed text-app-text">{detail.definition}</p>

      <ul className="space-y-2">
        {detail.protocols.map((line) => (
          <li
            key={line}
            className="rounded-lg border border-white/8 bg-black/35 px-3 py-2 font-mono-technical text-[10px] leading-relaxed text-app-text/90"
          >
            <span className="text-accent">▸ </span>
            {line}
          </li>
        ))}
      </ul>

      <p className="mt-4 rounded-lg border border-white/8 bg-black/40 px-3 py-2.5 font-mono-technical text-[10px] leading-relaxed text-app-text/55">
        {step.doctrine}
      </p>
    </div>
  )
}
