import { useTranslation } from 'react-i18next'
import { resolveGuideFlowDisplay } from '../../lib/guideDisplayText'

/**
 * Terminal estetiğinde yatay adım şeması.
 *
 * @param {{
 *   flowId?: string
 *   title?: string
 *   opsCode?: string
 *   steps?: { id: string, label: string }[]
 *   className?: string
 * }} props
 */
export default function GuideFlowDiagram({ flowId, title, opsCode, steps: stepsProp, className = '' }) {
  const { t, i18n } = useTranslation('guide')
  void i18n.language

  const resolved = flowId ? resolveGuideFlowDisplay(flowId) : null
  const steps = stepsProp ?? resolved?.steps ?? []
  const displayTitle = title ?? resolved?.title ?? ''
  const displayOps = opsCode ?? resolved?.opsCode

  if (!steps.length) return null

  return (
    <figure
      className={['overflow-x-auto rounded-lg border border-amber-500/25 bg-zinc-950/80 p-4', className].join(' ')}
      aria-label={displayTitle}
    >
      <figcaption className="mb-3 flex flex-wrap items-center gap-2">
        <span className="font-mono-technical text-[9px] font-bold uppercase tracking-[0.28em] text-amber-400/90">
          {t('ui.flowDiagramLabel')}
        </span>
        <span className="font-mono-technical text-[10px] font-bold uppercase tracking-wider text-app-text/80">
          {displayTitle}
        </span>
        {displayOps ? (
          <span className="font-mono-technical text-[8px] tabular-nums text-app-text/45">{displayOps}</span>
        ) : null}
      </figcaption>

      <svg
        viewBox={`0 0 ${Math.max(steps.length * 140, 280)} 72`}
        className="mx-auto min-w-[min(100%,520px)] max-w-full"
        role="img"
        aria-hidden
      >
        {steps.map((step, index) => {
          const x = 16 + index * 140
          const isLast = index === steps.length - 1
          return (
            <g key={step.id}>
              <rect
                x={x}
                y={12}
                width={112}
                height={44}
                rx={4}
                fill="rgba(24,24,27,0.95)"
                stroke="rgba(245,158,11,0.45)"
                strokeWidth={1.5}
              />
              <text
                x={x + 56}
                y={30}
                textAnchor="middle"
                fill="rgba(251,191,36,0.55)"
                fontSize={9}
                fontFamily="ui-monospace, monospace"
              >
                {String(index + 1).padStart(2, '0')}
              </text>
              <text
                x={x + 56}
                y={46}
                textAnchor="middle"
                fill="rgba(228,228,231,0.92)"
                fontSize={8.5}
                fontFamily="ui-monospace, monospace"
              >
                {step.label.length > 16 ? `${step.label.slice(0, 14)}…` : step.label}
              </text>
              {!isLast ? (
                <>
                  <line
                    x1={x + 112}
                    y1={34}
                    x2={x + 128}
                    y2={34}
                    stroke="rgba(245,158,11,0.5)"
                    strokeWidth={1.5}
                  />
                  <polygon
                    points={`${x + 128},34 ${x + 122},31 ${x + 122},37`}
                    fill="rgba(245,158,11,0.65)"
                  />
                </>
              ) : null}
            </g>
          )
        })}
      </svg>

      <ol className="mt-3 flex flex-wrap gap-x-4 gap-y-1 sm:hidden">
        {steps.map((step, index) => (
          <li key={step.id} className="font-mono-technical text-[10px] text-app-text/65">
            <span className="text-amber-500/80">{index + 1}.</span> {step.label}
          </li>
        ))}
      </ol>
    </figure>
  )
}
