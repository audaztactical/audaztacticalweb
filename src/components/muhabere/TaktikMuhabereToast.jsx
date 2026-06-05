import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * @typedef {{
 *   id: string
 *   senderCallsign: string
 *   preview: string
 *   senderId: string
 *   kind?: 'message' | 'system'
 * }} MuhabereToastItem
 */

const TOAST_LIFETIME_MS = 3500
const TOAST_FADE_MS = 400

/**
 * @param {{
 *   toast: MuhabereToastItem
 *   onDismiss: (id: string) => void
 * }} props
 */
function TaktikMuhabereToastCard({ toast, onDismiss }) {
  const navigate = useNavigate()
  const [exiting, setExiting] = useState(false)
  const isSystem = toast.kind === 'system'

  useEffect(() => {
    const fadeTimer = window.setTimeout(() => setExiting(true), TOAST_LIFETIME_MS)
    const removeTimer = window.setTimeout(() => onDismiss(toast.id), TOAST_LIFETIME_MS + TOAST_FADE_MS)
    return () => {
      window.clearTimeout(fadeTimer)
      window.clearTimeout(removeTimer)
    }
  }, [toast.id, onDismiss])

  const shellClass = [
    'pointer-events-auto flex w-full max-w-sm overflow-hidden rounded-md border border-lime-500/50 bg-zinc-950 text-left shadow-[0_8px_32px_rgba(0,0,0,0.55)] transition-all duration-[400ms]',
    exiting ? 'translate-x-3 opacity-0' : 'translate-x-0 opacity-100 animate-fade-in',
  ].join(' ')

  const body = (
    <>
      <span className="w-1 shrink-0 self-stretch bg-lime-500" aria-hidden />
      <span className="min-w-0 flex-1 px-3 py-2.5 font-mono">
        {isSystem ? (
          <p className="text-xs font-bold uppercase leading-relaxed tracking-wider text-lime-400">
            {toast.preview}
          </p>
        ) : (
          <>
            <p className="text-xs font-bold uppercase tracking-wider text-lime-400">
              YENİ İLETİ — {toast.senderCallsign}
            </p>
            <p className="mt-1 truncate text-sm text-zinc-300">{toast.preview}</p>
          </>
        )}
      </span>
    </>
  )

  if (isSystem) {
    return (
      <div className={shellClass} role="status" aria-live="polite">
        {body}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => {
        navigate('/mesajlar', { state: { peerId: toast.senderId } })
        onDismiss(toast.id)
      }}
      className={shellClass}
      aria-live="polite"
    >
      {body}
    </button>
  )
}

/**
 * @param {{
 *   toasts: MuhabereToastItem[]
 *   onDismiss: (id: string) => void
 * }} props
 */
export default function TaktikMuhabereToastStack({ toasts, onDismiss }) {
  if (toasts.length === 0) return null

  return (
    <div
      className="pointer-events-none fixed bottom-6 right-4 z-[200] flex w-[min(100%,20rem)] flex-col gap-2 sm:right-6"
      aria-label="Taktik ileti bildirimleri"
    >
      {toasts.map((t) => (
        <TaktikMuhabereToastCard key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  )
}
