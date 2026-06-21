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
    <form
      onSubmit={onSubmit}
      className="grid w-full min-w-0 max-w-none gap-4 lg:grid-cols-2 lg:items-stretch lg:[&>*]:min-w-0"
    >
      {left}
      {right}
      {footer ? <div className="w-full min-w-0 space-y-3 lg:col-span-2">{footer}</div> : null}
    </form>
  )
}
