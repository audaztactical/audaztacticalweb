import { useEffect, useRef, useState } from 'react'
import { MoreHorizontal, Trash2 } from 'lucide-react'
import { deleteBurnMessage, formatMessageTime, markMessageAsRead } from '../../lib/firestoreTaktikMuhabere'

/** @typedef {import('../../lib/firestoreTaktikMuhabere').MuhabereMessage} MuhabereMessage */

/**
 * @param {{
 *   msg: MuhabereMessage
 *   uid: string
 *   chatId: string
 *   onBurnDestroyed: (msg: MuhabereMessage) => void
 *   onHideMessage?: (messageId: string) => void
 *   hideBusy?: boolean
 *   onMediaLoaded?: () => void
 * }} props
 */
export default function MuhabereMessageRow({
  msg,
  uid,
  chatId,
  onBurnDestroyed,
  onHideMessage,
  hideBusy = false,
  onMediaLoaded,
}) {
  const rowRef = useRef(/** @type {HTMLDivElement | null} */ (null))
  const menuRef = useRef(/** @type {HTMLDivElement | null} */ (null))
  const markedRef = useRef(false)
  const burnDoneRef = useRef(false)
  const [countdown, setCountdown] = useState(/** @type {number | null} */ (null))
  const [localDestroyed, setLocalDestroyed] = useState(msg.destroyed === true)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const outgoing = msg.senderId === uid
  const incoming = !outgoing
  const displayDestroyed = localDestroyed || msg.destroyed
  const isDm = Boolean(msg.receiverId)
  const msgType = msg.type ?? 'text'
  const canHide = Boolean(onHideMessage) && !displayDestroyed

  useEffect(() => {
    markedRef.current = false
    burnDoneRef.current = false
    setCountdown(null)
    setLocalDestroyed(msg.destroyed === true)
    setLightboxOpen(false)
    setMenuOpen(false)
  }, [msg.id, msg.destroyed])

  useEffect(() => {
    if (!menuOpen) return undefined
    const onDoc = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [menuOpen])

  useEffect(() => {
    if (!incoming || !isDm || msg.status === 'read' || displayDestroyed || !rowRef.current || !chatId) {
      return undefined
    }

    const el = rowRef.current
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((e) => e.isIntersecting)
        if (!visible || markedRef.current || msg.status === 'read') return
        markedRef.current = true
        void markMessageAsRead(chatId, msg.id)
      },
      { threshold: 0.6 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [incoming, isDm, msg.id, msg.status, chatId, displayDestroyed])

  useEffect(() => {
    if (!incoming || !msg.isBurn || msg.status !== 'read' || displayDestroyed) {
      setCountdown(null)
      return undefined
    }

    const seconds = Math.max(1, msg.burnTime ?? 10)
    setCountdown(seconds)

    const timer = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev == null || prev <= 1) {
          window.clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => window.clearInterval(timer)
  }, [incoming, msg.isBurn, msg.status, msg.burnTime, msg.id, displayDestroyed])

  useEffect(() => {
    if (
      countdown !== 0 ||
      !incoming ||
      !msg.isBurn ||
      msg.status !== 'read' ||
      displayDestroyed ||
      burnDoneRef.current
    ) {
      return undefined
    }

    burnDoneRef.current = true
    let active = true
    ;(async () => {
      try {
        await deleteBurnMessage(chatId, msg.id)
      } catch {
        /* imha hatası — yerel hayalet göster */
      }
      if (!active) return
      setLocalDestroyed(true)
      onBurnDestroyed({ ...msg, destroyed: true, text: '' })
    })()

    return () => {
      active = false
    }
  }, [countdown, incoming, msg, chatId, displayDestroyed, onBurnDestroyed])

  const handleHide = () => {
    if (!onHideMessage || hideBusy) return
    const confirmed = window.confirm(
      'Bu mesajı benim ekranımdan kaldır\n\nKarşı tarafın mesajı etkilenmez; yalnızca sizin görünümünüzden silinir.',
    )
    if (!confirmed) return
    setMenuOpen(false)
    onHideMessage(msg.id)
  }

  const receipt =
    outgoing && !displayDestroyed && isDm ? (
      <span
        className={[
          'text-[9px] font-bold uppercase tracking-wider',
          msg.status === 'read' ? 'text-lime-500' : 'text-zinc-600',
        ].join(' ')}
      >
        {msg.status === 'read' ? '[ GÖRÜLDÜ ]' : '[ İLETİLDİ ]'}
      </span>
    ) : null

  const burnBadge =
    msg.isBurn && !displayDestroyed ? (
      <span className="text-[9px] font-bold uppercase tracking-wider text-red-500/90">
        {incoming && countdown != null && msg.status === 'read'
          ? `İMHA ${countdown}s`
          : 'BURN'}
      </span>
    ) : null

  const renderBody = () => {
    if (displayDestroyed) {
      return (
        <p className="font-mono text-xs font-bold uppercase tracking-wider text-red-500">
          [ VERİ İMHA EDİLDİ ]
        </p>
      )
    }

    if (msgType === 'image' && msg.imageUrl) {
      return (
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          className="block overflow-hidden rounded-sm border border-zinc-700 transition hover:border-lime-500/40"
        >
          <img
            src={msg.imageUrl}
            alt="Taktik görsel"
            loading="eager"
            decoding="async"
            onLoad={() => onMediaLoaded?.()}
            className="max-h-64 max-w-xs object-cover"
          />
        </button>
      )
    }

    if (msgType === 'location' && typeof msg.lat === 'number' && typeof msg.lng === 'number') {
      const mapsUrl = `https://www.google.com/maps?q=${msg.lat},${msg.lng}`
      return (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-sm border border-lime-900 bg-lime-900/20 p-2 font-mono text-lime-400 transition hover:border-lime-500/50 hover:bg-lime-900/30"
        >
          <p className="text-[10px] font-bold uppercase tracking-wider">[ STRATEJİK KOORDİNAT ALINDI ]</p>
          <p className="mt-1 text-[10px] text-lime-300/90">
            LAT: {msg.lat.toFixed(5)} | LNG: {msg.lng.toFixed(5)}
          </p>
        </a>
      )
    }

    return <p>{msg.text}</p>
  }

  return (
    <>
      <div
        ref={rowRef}
        className={[
          'group/msg relative flex max-w-[85%] flex-col gap-1',
          outgoing ? 'ml-auto items-end' : 'items-start',
        ].join(' ')}
      >
        {canHide ? (
          <div
            ref={menuRef}
            className={[
              'absolute top-0 z-10',
              outgoing ? 'left-0 -translate-x-full pr-1' : 'right-0 translate-x-full pl-1',
            ].join(' ')}
          >
            <button
              type="button"
              disabled={hideBusy}
              onClick={() => setMenuOpen((v) => !v)}
              className={[
                'inline-flex size-7 items-center justify-center rounded-md border transition disabled:opacity-40',
                'border-zinc-600/80 bg-zinc-900 text-zinc-300',
                'hover:border-lime-500/50 hover:bg-zinc-800 hover:text-lime-400',
                menuOpen ? 'border-lime-500/50 text-lime-400' : '',
              ].join(' ')}
              aria-label="Mesaj seçenekleri"
              aria-expanded={menuOpen}
            >
              <MoreHorizontal className="size-4" strokeWidth={2.25} aria-hidden />
            </button>
            {menuOpen ? (
              <div
                className={[
                  'absolute top-full z-20 mt-1 min-w-[12rem] overflow-hidden rounded-md border border-zinc-700 bg-zinc-950 py-1 shadow-xl',
                  outgoing ? 'left-0' : 'right-0',
                ].join(' ')}
                role="menu"
              >
                <button
                  type="button"
                  role="menuitem"
                  disabled={hideBusy}
                  onClick={handleHide}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-400 transition hover:bg-zinc-900 hover:text-red-400 disabled:opacity-40"
                >
                  <Trash2 className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
                  Mesajı sil
                </button>
                <p className="border-t border-zinc-800 px-3 py-2 text-[9px] leading-relaxed text-zinc-600">
                  Bu mesajı benim ekranımdan kaldır
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        <div
          className={[
            'rounded-md border px-3 py-2 text-sm leading-relaxed',
            displayDestroyed
              ? 'border-red-950/60 bg-black/70 text-red-500'
              : outgoing
                ? msg.isBurn
                  ? 'border-red-900/50 bg-red-950/30 text-red-200'
                  : 'border-zinc-700 bg-zinc-800 text-zinc-300'
                : msg.isBurn
                  ? 'border-red-900/40 bg-red-950/20 text-red-100'
                  : 'border-zinc-800 bg-zinc-900/80 text-zinc-400',
          ].join(' ')}
        >
          {renderBody()}
        </div>
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-zinc-500">
          <span>{formatMessageTime(msg.timestamp)}</span>
          {receipt}
          {burnBadge}
        </div>
      </div>

      {lightboxOpen && msg.imageUrl ? (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          role="presentation"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded border border-zinc-700 px-2 py-1 text-[10px] font-bold uppercase text-zinc-400 hover:text-lime-400"
            onClick={() => setLightboxOpen(false)}
          >
            Kapat
          </button>
          <img
            src={msg.imageUrl}
            alt="Tam ekran görsel"
            loading="lazy"
            decoding="async"
            className="max-h-[90vh] max-w-full rounded-sm border border-zinc-700 object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
    </>
  )
}
