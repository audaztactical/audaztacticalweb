import { useOperatorPhoto } from '../../hooks/useOperatorPhoto'
import OperatorBadge from './OperatorBadge'

/** @typedef {'sm' | 'md' | 'lg'} OperatorBadgeSize */

/**
 * UID ile canlı profil görseli — OperatorBadge sarmalayıcısı.
 * @param {{
 *   uid?: string | null
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
export default function OperatorAvatar({
  uid,
  callsign,
  username,
  displayName,
  photoUrl: photoUrlOverride,
  size = 'md',
  signal = false,
  online = null,
  className = '',
  title,
}) {
  const subscribedPhoto = useOperatorPhoto(uid)
  const photoUrl = (photoUrlOverride || subscribedPhoto || '').trim()

  return (
    <OperatorBadge
      callsign={callsign}
      username={username}
      displayName={displayName}
      photoUrl={photoUrl}
      size={size}
      signal={signal}
      online={online}
      className={className}
      title={title}
    />
  )
}
