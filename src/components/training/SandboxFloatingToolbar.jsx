import {
  ArrowUpRight,
  Circle,
  Eraser,
  MousePointer2,
  RectangleHorizontal,
  Slash,
  SquareDashed,
  Triangle,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatEgitimSandboxToolLabel } from '../../lib/trainingDisplayText'

/** @typedef {'select' | 'marquee' | 'arrow' | 'line' | 'circle' | 'triangle' | 'rectangle' | 'eraser'} SandboxTool */

/** @type {{ id: SandboxTool; Icon: typeof MousePointer2 }[]} */
const TOOLS = [
  { id: 'select', Icon: MousePointer2 },
  { id: 'marquee', Icon: SquareDashed },
  { id: 'arrow', Icon: ArrowUpRight },
  { id: 'line', Icon: Slash },
  { id: 'circle', Icon: Circle },
  { id: 'triangle', Icon: Triangle },
  { id: 'rectangle', Icon: RectangleHorizontal },
  { id: 'eraser', Icon: Eraser },
]

/**
 * @param {{
 *   activeTool: SandboxTool
 *   onToolChange: (tool: SandboxTool) => void
 *   disabled?: boolean
 * }} props
 */
export default function SandboxFloatingToolbar({ activeTool, onToolChange, disabled = false }) {
  const { t } = useTranslation('training')

  return (
    <div
      role="toolbar"
      aria-label={t('sectors.egitim.sandbox.toolbar.aria')}
      className="pointer-events-auto absolute left-3 top-3 z-20 flex flex-col gap-0.5 rounded border border-accent/45 bg-app-bg/95 p-1 shadow-[0_0_24px_-8px_color-mix(in_srgb,var(--accent-color)_35%,transparent)]] backdrop-blur-sm"
    >
      {TOOLS.map((tool) => {
        const ToolIcon = tool.Icon
        const active = activeTool === tool.id
        const label = formatEgitimSandboxToolLabel(tool.id)
        return (
          <button
            key={tool.id}
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={active}
            disabled={disabled}
            onClick={() => onToolChange(tool.id)}
            className={`flex size-9 items-center justify-center rounded border transition ${
              active
                ? 'border-accent/80 bg-accent/20 text-accent shadow-[0_0_24px_-8px_color-mix(in_srgb,var(--accent-color)_35%,transparent)]]'
                : 'border-transparent bg-black/40 text-app-text/70 hover:border-accent/35 hover:bg-accent/10 hover:text-accent/90'
            } disabled:opacity-35`}
          >
            <ToolIcon className="size-4 shrink-0" strokeWidth={active ? 2.25 : 1.75} aria-hidden />
          </button>
        )
      })}
    </div>
  )
}
