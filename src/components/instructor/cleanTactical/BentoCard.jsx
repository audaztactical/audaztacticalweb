import CleanFade from './CleanFade'
import { ctCard, ctCardDesc, ctCardHeader, ctCardTitle } from './tokens'

/**
 * @param {{
 *   title: string
 *   description?: string
 *   icon?: import('lucide-react').LucideIcon
 *   action?: import('react').ReactNode
 *   children: import('react').ReactNode
 *   className?: string
 *   delay?: number
 * }} props
 */
export default function BentoCard({
  title,
  description,
  icon: Icon,
  action,
  children,
  className = '',
  delay = 0,
}) {
  return (
    <CleanFade className={`${ctCard} ${className}`} delay={delay}>
      <header className={ctCardHeader}>
        {Icon ? <Icon className="size-4 shrink-0 text-zinc-400" strokeWidth={1.5} aria-hidden /> : null}
        <div className="min-w-0 flex-1">
          <h3 className={ctCardTitle}>{title}</h3>
          {description ? <p className={ctCardDesc}>{description}</p> : null}
        </div>
        {action}
      </header>
      {children}
    </CleanFade>
  )
}
