import { useEffect } from 'react'
import { useMuhabereNotify } from '../../context/MuhabereNotifyContext'

/**
 * Kanal sohbet penceresi — yalnızca channelId değiştiğinde okundu işaretler.
 * @param {{
 *   channelId: string
 *   uid: string
 *   children: import('react').ReactNode
 * }} props
 */
export default function ChatWindow({ channelId, uid, children }) {
  const { markChannelAsRead } = useMuhabereNotify()

  useEffect(() => {
    const cid = String(channelId ?? '').trim()
    if (!uid || !cid) return
    markChannelAsRead(cid)
  }, [uid, channelId, markChannelAsRead])

  return children
}
