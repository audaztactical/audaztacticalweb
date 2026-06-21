import { labelClass } from './trainingTerminalTokens'

/**
 * @param {{
 *   title?: string
 *   children: import('react').ReactNode
 *   footer?: import('react').ReactNode
 *   gridClassName?: string
 * }} props
 */
export default function TrainingMetricGrid({
  title = 'SAHA METRİKLERİ',
  children,
  footer,
  gridClassName = 'grid grid-cols-2 gap-3 sm:grid-cols-3',
}) {
  return (
    <div className="rounded border border-accent/20 bg-black/40 p-3">
      <p className="mb-3 font-mono-technical text-[7px] font-bold uppercase tracking-[0.2em] text-accent/80">
        {title}
      </p>
      <div className={gridClassName}>{children}</div>
      {footer}
    </div>
  )
}

/**
 * @param {{
 *   label: string
 *   children: import('react').ReactNode
 *   className?: string
 * }} props
 */
export function TrainingMetricField({ label, children, className = '' }) {
  return (
    <label className={`block space-y-1 ${className}`}>
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  )
}
