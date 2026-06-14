import { useEffect, useRef, useState } from 'react'
import { MapPin, Paperclip, Plus } from 'lucide-react'
import { emitFirebaseError } from '../../lib/firebaseErrorBus'
import { sendChannelMessage, sendChatMessage } from '../../lib/firestoreTaktikMuhabere'

/** Firebase Storage geçici olarak devre dışı — görsel yükleme kapalı */
const MUHABERE_IMAGE_UPLOAD_ENABLED = false

/**
 * @param {{
 *   threadId: string
 *   mode: 'dm' | 'channel'
 *   uid: string
 *   receiverId?: string
 *   disabled?: boolean
 *   onUploadProgress: (pct: number | null) => void
 *   onMessageSent?: () => void
 * }} props
 */
export default function MuhabereAttachMenu({
  threadId,
  mode,
  uid,
  receiverId = '',
  disabled = false,
  onUploadProgress: _onUploadProgress,
  onMessageSent,
}) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const menuRef = useRef(/** @type {HTMLDivElement | null} */ (null))

  useEffect(() => {
    if (!open) return undefined
    const onDoc = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const dispatchDm = async (/** @type {Record<string, unknown>} */ payload) => {
    if (!threadId || !uid || !receiverId) return
    await sendChatMessage({
      chatId: threadId,
      senderId: uid,
      receiverId,
      ...payload,
    })
  }

  const dispatchChannel = async (/** @type {Record<string, unknown>} */ payload) => {
    if (!threadId || !uid) return
    await sendChannelMessage({
      channelId: threadId,
      senderId: uid,
      ...payload,
    })
  }

  const dispatch = (/** @type {Record<string, unknown>} */ payload) =>
    mode === 'channel' ? dispatchChannel(payload) : dispatchDm(payload)

  /*
   * Storage devre dışı — görsel yükleme geçici olarak kapatıldı.
   *
   * const handleImagePick = () => { ... }
   * const handleFileChange = async (e) => {
   *   const imageUrl = await uploadMuhabereChatImage(threadId, file, onUploadProgress)
   *   await dispatch({ type: 'image', text: '[ GÖRSEL ]', imageUrl })
   * }
   */

  const handleLocation = () => {
    setOpen(false)
    if (!navigator.geolocation || busy || disabled) {
      emitFirebaseError(new Error('Konum servisi kullanılamıyor.'))
      return
    }

    setBusy(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await dispatch({
            type: 'location',
            text: '[ STRATEJİK KOORDİNAT ]',
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          })
          onMessageSent?.()
        } catch (err) {
          emitFirebaseError(err)
        } finally {
          setBusy(false)
        }
      },
      (err) => {
        emitFirebaseError(err)
        setBusy(false)
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    )
  }

  return (
    <div ref={menuRef} className="relative shrink-0">
      <button
        type="button"
        disabled={disabled || busy || !threadId}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center justify-center rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-2.5 text-zinc-500 transition hover:text-lime-500 disabled:opacity-40"
        aria-label="Ek medya"
        aria-expanded={open}
      >
        <Paperclip className="size-4" strokeWidth={2} aria-hidden />
      </button>

      {open ? (
        <div
          className="absolute bottom-full left-0 z-20 mb-2 min-w-[11rem] overflow-hidden rounded-md border border-zinc-700 bg-zinc-950 py-1 shadow-xl"
          role="menu"
        >
          {MUHABERE_IMAGE_UPLOAD_ENABLED ? null : (
            <p className="hidden px-3 py-2 text-[10px] uppercase tracking-wider text-zinc-600" aria-hidden>
              Görsel yükle — Storage devre dışı
            </p>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={handleLocation}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-400 transition hover:bg-zinc-900 hover:text-lime-400"
          >
            <MapPin className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
            Grid / konum paylaş
          </button>
        </div>
      ) : null}

      {open ? (
        <span className="pointer-events-none absolute -left-1 -top-1 text-lime-500/80" aria-hidden>
          <Plus className="size-2.5" />
        </span>
      ) : null}
    </div>
  )
}
