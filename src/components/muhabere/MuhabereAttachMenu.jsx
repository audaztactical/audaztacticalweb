import { useEffect, useRef, useState } from 'react'
import { Image, MapPin, Paperclip, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { emitFirebaseError } from '../../lib/firebaseErrorBus'
import { uploadMuhabereChatImage } from '../../lib/muhabereChatMedia'
import { sendChannelMessage, sendChatMessage } from '../../lib/firestoreTaktikMuhabere'

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
  onUploadProgress,
  onMessageSent,
}) {
  const { t } = useTranslation('messages')
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const menuRef = useRef(/** @type {HTMLDivElement | null} */ (null))
  const fileInputRef = useRef(/** @type {HTMLInputElement | null} */ (null))

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

  const handleImagePick = () => {
    setOpen(false)
    if (busy || disabled || !threadId) return
    fileInputRef.current?.click()
  }

  const handleFileChange = async (/** @type {import('react').ChangeEvent<HTMLInputElement>} */ e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || busy || disabled) return

    if (!file.type.startsWith('image/')) {
      emitFirebaseError(new Error(t('attach.imagesOnly')))
      return
    }

    setBusy(true)
    onUploadProgress(0)

    try {
      const imageUrl = await uploadMuhabereChatImage(threadId, file, (pct) => onUploadProgress(pct))
      await dispatch({ type: 'image', text: '[ GÖRSEL ]', imageUrl })
      onMessageSent?.()
    } catch (err) {
      emitFirebaseError(err)
    } finally {
      onUploadProgress(null)
      setBusy(false)
    }
  }

  const handleLocation = () => {
    setOpen(false)
    if (!navigator.geolocation || busy || disabled) {
      emitFirebaseError(new Error(t('attach.locationUnavailable')))
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
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        onChange={handleFileChange}
        disabled={disabled || busy}
      />
      <button
        type="button"
        disabled={disabled || busy || !threadId}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center justify-center rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-2.5 text-zinc-500 transition hover:text-lime-500 disabled:opacity-40"
        aria-label={t('attach.aria')}
        aria-expanded={open}
      >
        <Paperclip className="size-4" strokeWidth={2} aria-hidden />
      </button>

      {open ? (
        <div
          className="absolute bottom-full left-0 z-20 mb-2 min-w-[11rem] overflow-hidden rounded-md border border-zinc-700 bg-zinc-950 py-1 shadow-xl"
          role="menu"
        >
          <button
            type="button"
            role="menuitem"
            onClick={handleImagePick}
            className="flex w-full min-w-0 items-center gap-2 px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-400 transition hover:bg-zinc-900 hover:text-lime-400"
          >
            <Image className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
            <span className="min-w-0 truncate">{t('attach.shareImage')}</span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={handleLocation}
            className="flex w-full min-w-0 items-center gap-2 px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-400 transition hover:bg-zinc-900 hover:text-lime-400"
          >
            <MapPin className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
            <span className="min-w-0 truncate">{t('attach.shareLocation')}</span>
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
