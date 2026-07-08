import { useTranslation } from 'react-i18next'

/**
 * @param {{
 *   online?: boolean
 *   label?: string
 *   showLabel?: boolean
 *   className?: string
 * }} props
 */
export default function PresenceIndicator({
  online = false,
  label = '',
  showLabel = true,
  className = '',
}) {
  const { t } = useTranslation('messages')
  const text = label || (online ? t('presence.online') : t('presence.offline'))

  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider',
        online ? 'text-lime-500' : 'text-zinc-500',
        className,
      ].join(' ')}
    >
      <span
        className={[
          'size-1.5 shrink-0 rounded-full',
          online ? 'bg-lime-400' : 'bg-zinc-500',
        ].join(' ')}
        aria-hidden
      />
      {showLabel ? <span>{text}</span> : null}
    </span>
  )
}
