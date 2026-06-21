import TrainingTerminalPanel from '../../training/layout/TrainingTerminalPanel'
import { TRAINING_CATEGORIES } from '../../training/trainingCategories'
import CleanFade from '../cleanTactical/CleanFade'
import { resolveSectorAccent } from './instructorCommandTokens'

/**
 * BentoCard ile API uyumlu — TrainingTerminalPanel kabuğu + sektör tint.
 *
 * @param {{
 *   title: string
 *   description?: string
 *   icon?: import('lucide-react').LucideIcon
 *   action?: import('react').ReactNode
 *   children: import('react').ReactNode
 *   className?: string
 *   delay?: number
 *   sector?: import('./instructorCommandTokens').InstructorSectorId
 *   opsCode?: string
 *   corners?: 'top' | 'bottom' | null
 *   panelClassName?: string
 *   bodyClassName?: string
 * }} props
 */
export default function InstructorCommandPanel({
  title,
  description,
  icon: Icon,
  action,
  children,
  className = '',
  delay = 0,
  sector,
  opsCode,
  corners = 'top',
  panelClassName,
  bodyClassName = 'flex flex-1 flex-col space-y-4 p-4 sm:p-5',
}) {
  const accent = resolveSectorAccent(sector)
  const resolvedOpsCode =
    opsCode ?? TRAINING_CATEGORIES.find((c) => c.id === sector)?.opsCode ?? null
  const panelTitle = resolvedOpsCode
    ? `${title.toUpperCase()} · ${resolvedOpsCode}`
    : title.toUpperCase()

  const resolvedPanelClass =
    panelClassName ??
    `relative flex w-full min-w-0 flex-col overflow-hidden ${accent.panelBorder} bg-app-bg/95 p-0`

  return (
    <CleanFade delay={delay} className={className}>
      <TrainingTerminalPanel
        title={panelTitle}
        titleClassName={accent.title}
        corners={corners}
        cornerClassName={accent.corner}
        panelClassName={resolvedPanelClass}
        bodyClassName={bodyClassName}
      >
        {description || Icon || action ? (
          <header className="flex items-start gap-2 border-b border-accent/10 pb-3">
            {Icon ? (
              <Icon className={`size-4 shrink-0 ${accent.icon}`} strokeWidth={1.5} aria-hidden />
            ) : null}
            <div className="min-w-0 flex-1">
              {description ? (
                <p className="font-mono-technical text-[10px] uppercase leading-snug text-app-text/55">
                  {description}
                </p>
              ) : null}
            </div>
            {action}
          </header>
        ) : null}
        {children}
      </TrainingTerminalPanel>
    </CleanFade>
  )
}
