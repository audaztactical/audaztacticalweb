import { deriveOperatorInitials } from '../../lib/operatorInitials'

/** @typedef {'sm' | 'md' | 'lg'} OperatorBadgeSize */

const SIZE_CLASS = {
  sm: 'size-8 rounded-sm border text-xs',
  md: 'size-10 rounded-sm border-2 text-sm',
  lg: 'size-24 rounded-sm border-2 text-3xl',
}

/**
 * @param {{
 *   callsign?: string
 *   username?: string
 *   displayName?: string
 *   size?: OperatorBadgeSize
 *   signal?: boolean
 *   className?: string
 *   title?: string
 * }} props
 */
export default function OperatorBadge({
  callsign,
  username,
  displayName,
  size = 'md',
  signal = false,
  className = '',
  title,
}) {
  const initials = deriveOperatorInitials({ callsign, username, displayName })
  const label = title ?? callsign ?? username ?? displayName ?? 'Operatör'

  return (
    <div
      className={[
        'relative flex shrink-0 items-center justify-center border-lime-500 bg-zinc-900 font-mono font-bold text-lime-400',
        SIZE_CLASS[size],
        signal ? 'ring-2 ring-lime-500/40 ring-offset-1 ring-offset-zinc-950' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      role="img"
      aria-label={`${label} rozeti`}
      title={label}
    >
      <span className="select-none leading-none tracking-tight">{initials}</span>
      {signal ? (
        <span className="absolute -right-0.5 -top-0.5 size-2 animate-pulse rounded-full bg-lime-400" aria-hidden />
      ) : null}
    </div>
  )
}
