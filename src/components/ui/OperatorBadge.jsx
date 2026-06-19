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
 *   photoUrl?: string
 *   size?: OperatorBadgeSize
 *   signal?: boolean
 *   online?: boolean | null
 *   className?: string
 *   title?: string
 * }} props
 */
export default function OperatorBadge({
  callsign,
  username,
  displayName,
  photoUrl,
  size = 'md',
  signal = false,
  online = null,
  className = '',
  title,
}) {
  const initials = deriveOperatorInitials({ callsign, username, displayName })
  const label = title ?? callsign ?? username ?? displayName ?? 'Operatör'
  const photo = typeof photoUrl === 'string' && photoUrl.trim() ? photoUrl.trim() : ''

  return (
    <div
      className={[
        'relative flex shrink-0 items-center justify-center overflow-hidden border-lime-500 bg-zinc-900 font-mono font-bold text-lime-400',
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
      {photo ? (
        <img src={photo} alt="" className="size-full object-cover" loading="lazy" decoding="async" />
      ) : (
        <span className="select-none leading-none tracking-tight">{initials}</span>
      )}
      {signal ? (
        <span className="absolute -right-0.5 -top-0.5 size-2 animate-pulse rounded-full bg-lime-400" aria-hidden />
      ) : null}
      {typeof online === 'boolean' ? (
        <span
          className={[
            'absolute -bottom-0.5 -right-0.5 size-2 rounded-full border border-zinc-950',
            online ? 'bg-lime-400' : 'bg-zinc-500',
          ].join(' ')}
          aria-hidden
        />
      ) : null}
    </div>
  )
}
