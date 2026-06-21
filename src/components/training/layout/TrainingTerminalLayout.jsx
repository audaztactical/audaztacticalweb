/**
 * @param {{
 *   onSubmit: (e: import('react').FormEvent) => void
 *   left: import('react').ReactNode
 *   right: import('react').ReactNode
 *   footer?: import('react').ReactNode
 * }} props
 */
export default function TrainingTerminalLayout({ onSubmit, left, right, footer }) {
  return (
    <form onSubmit={onSubmit} className="grid gap-4 lg:grid-cols-2 lg:items-stretch">
      {left}
      {right}
      {footer ? <div className="space-y-3 lg:col-span-2">{footer}</div> : null}
    </form>
  )
}
