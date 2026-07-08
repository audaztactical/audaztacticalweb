import { useEffect, useRef, useState } from 'react'
import { Loader2, Maximize2, Minus, Minimize2, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useMuhabereNotify } from '../../context/MuhabereNotifyContext'
import {
  formatMessageTime,
  markChatMessagesAsRead,
  sendChatMessage,
} from '../../lib/firestoreTaktikMuhabere'

/**
 * @param {{ uid: string }} props
 */
export default function TaktikMuhabereFloatingWidget({ uid }) {
  const { t } = useTranslation('messages')
  const { floatingChat, closeFloatingChat } = useMuhabereNotify()
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [isMinimized, setIsMinimized] = useState(true)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [hasUnreadAlert, setHasUnreadAlert] = useState(false)

  const messagesEndRef = useRef(/** @type {HTMLDivElement | null} */ (null))
  const messageInputRef = useRef(/** @type {HTMLInputElement | null} */ (null))
  const lastMessageIdRef = useRef('')

  const { open, peerUid, chatId, callsign, messages } = floatingChat

  const chatBodyVisible = isFullScreen || !isMinimized

  const expandWidget = () => {
    setIsMinimized(false)
    setHasUnreadAlert(false)
  }

  const minimizeWidget = () => {
    setIsMinimized(true)
    setIsFullScreen(false)
  }

  const enterFullScreen = () => {
    setIsFullScreen(true)
    setIsMinimized(false)
    setHasUnreadAlert(false)
  }

  const exitFullScreenToWidget = () => {
    setIsFullScreen(false)
    setIsMinimized(false)
  }

  const closeWidgetCompletely = () => {
    setIsFullScreen(false)
    setIsMinimized(true)
    closeFloatingChat()
  }

  useEffect(() => {
    if (!open) {
      setDraft('')
      setIsFullScreen(false)
      setHasUnreadAlert(false)
      lastMessageIdRef.current = ''
      return
    }

    setIsMinimized(true)
    setIsFullScreen(false)
    setHasUnreadAlert(true)
  }, [open, peerUid])

  useEffect(() => {
    if (!open || !chatId || !uid || !chatBodyVisible) return undefined
    void markChatMessagesAsRead(chatId, uid)
  }, [open, chatId, uid, chatBodyVisible])

  useEffect(() => {
    if (!chatBodyVisible || messages.length === 0) return
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, chatBodyVisible])

  useEffect(() => {
    if (!open || messages.length === 0) return

    const lastMsg = messages[messages.length - 1]
    const lastId = lastMsg?.id ?? ''

    if (
      isMinimized &&
      !isFullScreen &&
      lastMessageIdRef.current &&
      lastId !== lastMessageIdRef.current &&
      lastMsg.senderId !== uid
    ) {
      setHasUnreadAlert(true)
    }

    lastMessageIdRef.current = lastId
  }, [messages, isMinimized, isFullScreen, open, uid])

  const handleSend = async (e) => {
    e.preventDefault()
    const text = draft.trim()
    if (!text || !uid || !peerUid || !chatId || sending) return

    setSending(true)
    let sentOk = false
    try {
      await sendChatMessage({
        chatId,
        text,
        senderId: uid,
        receiverId: peerUid,
      })
      setDraft('')
      sentOk = true
    } finally {
      setSending(false)
      if (sentOk) {
        window.requestAnimationFrame(() => {
          messageInputRef.current?.focus()
        })
      }
    }
  }

  if (!open || !peerUid) return null

  const messageList =
    messages.length === 0 ? (
      <p className="py-8 text-center text-[10px] text-zinc-600">{t('floating.noMessages')}</p>
    ) : (
      <div className="flex flex-col gap-2">
        {(isFullScreen ? messages : messages.slice(-12)).map((msg) => {
          const outgoing = msg.senderId === uid
          return (
            <div
              key={msg.id}
              className={[
                'max-w-[90%] rounded border px-2 py-1.5 text-xs leading-relaxed',
                outgoing
                  ? 'ml-auto border-zinc-700 bg-zinc-800 text-zinc-300'
                  : 'border-zinc-800 bg-zinc-900/80 text-zinc-400',
              ].join(' ')}
            >
              <p>{msg.text}</p>
              <span className="mt-0.5 block text-[9px] text-zinc-600">
                {formatMessageTime(msg.timestamp)}
              </span>
            </div>
          )
        })}
      </div>
    )

  const chatBody = (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
        {messageList}
        <div ref={messagesEndRef} aria-hidden />
      </div>
      <footer className="shrink-0 border-t border-zinc-800 p-2">
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            ref={messageInputRef}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t('floating.placeholder')}
            disabled={sending}
            className="min-w-0 flex-1 rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 font-mono text-sm text-zinc-300 outline-none placeholder:text-zinc-600 focus:border-zinc-600"
            autoComplete="off"
            autoFocus
          />
          <button
            type="submit"
            disabled={!draft.trim() || sending}
            className="shrink-0 rounded border border-zinc-700 px-2 py-1.5 text-[10px] font-bold uppercase text-lime-500 hover:bg-lime-950/40 disabled:opacity-40"
          >
            {sending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : t('floating.send')}
          </button>
        </form>
      </footer>
    </>
  )

  const titleBar = (
    <p className="min-w-0 flex-1 truncate text-xs font-bold uppercase tracking-wider text-lime-400">
      {callsign}
      {isMinimized && !isFullScreen && hasUnreadAlert ? (
        <span className="ml-1.5 text-[9px] font-bold text-lime-300">{t('floating.signal')}</span>
      ) : null}
      {isFullScreen ? (
        <span className="ml-2 text-[9px] font-normal text-zinc-500">{t('floating.terminalMode')}</span>
      ) : null}
    </p>
  )

  if (isFullScreen) {
    return (
      <div className="pointer-events-none fixed inset-0 z-[90]" role="presentation">
        <div
          className="pointer-events-auto fixed inset-0 bg-black/80 backdrop-blur-sm"
          aria-hidden
        />
        <div className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="pointer-events-auto flex h-5/6 w-11/12 flex-col overflow-hidden rounded-md border border-lime-500/50 bg-zinc-950 font-mono shadow-2xl shadow-lime-900/10 md:w-3/4"
            role="dialog"
            aria-label={t('floating.terminalAria', { callsign })}
            aria-modal="true"
          >
            <header className="flex shrink-0 items-center gap-2 border-b border-zinc-800 px-4 py-3">
              {titleBar}
              <button
                type="button"
                onClick={exitFullScreenToWidget}
                className="shrink-0 rounded border border-zinc-700 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-zinc-400 transition hover:border-zinc-600 hover:bg-zinc-900 hover:text-lime-400"
                title={t('floating.windowModeTitle')}
              >
                <span className="flex items-center gap-1">
                  <Minimize2 className="size-3.5" strokeWidth={2} aria-hidden />
                  <span className="truncate">{t('floating.windowMode')}</span>
                </span>
              </button>
              <button
                type="button"
                onClick={closeWidgetCompletely}
                className="rounded p-1 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-200"
                aria-label={t('common.close')}
                title={t('common.close')}
              >
                <X className="size-4" strokeWidth={2} aria-hidden />
              </button>
            </header>
            <div className="flex min-h-0 flex-1 flex-col">{chatBody}</div>
          </div>
        </div>
      </div>
    )
  }

  const shellClass = [
    'muhabere-floating-widget pointer-events-auto fixed right-4 z-50 flex flex-col overflow-hidden rounded-md border font-mono shadow-lg transition-all duration-200',
    isMinimized
      ? [
          'w-56',
          hasUnreadAlert
            ? 'animate-pulse border-lime-400 bg-lime-900 text-lime-400 shadow-lime-900/30'
            : 'border-lime-500/50 bg-zinc-950 text-lime-400 shadow-lime-900/20',
        ].join(' ')
      : 'h-96 w-96 border-lime-500/50 bg-zinc-950 shadow-lime-900/20',
  ].join(' ')

  return (
    <div
      className={shellClass}
      role="dialog"
      aria-label={t('floating.quickResponseAria', { callsign })}
      aria-expanded={!isMinimized}
    >
      <header
        className={[
          'flex shrink-0 items-center gap-1.5 px-3 py-2',
          isMinimized ? 'cursor-pointer' : 'border-b border-zinc-800',
        ].join(' ')}
        onClick={isMinimized ? expandWidget : undefined}
        onKeyDown={
          isMinimized
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  expandWidget()
                }
              }
            : undefined
        }
        role={isMinimized ? 'button' : undefined}
        tabIndex={isMinimized ? 0 : undefined}
      >
        {titleBar}

        {isMinimized ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              closeWidgetCompletely()
            }}
            className="rounded p-1 text-current/80 transition hover:bg-black/20"
            aria-label={t('common.close')}
            title={t('common.close')}
          >
            <X className="size-3.5" strokeWidth={2} aria-hidden />
          </button>
        ) : (
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              onClick={minimizeWidget}
              className="rounded p-1 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-200"
              aria-label={t('floating.minimize')}
              title={t('floating.minimize')}
            >
              <Minus className="size-3.5" strokeWidth={2} aria-hidden />
            </button>
            <button
              type="button"
              onClick={closeWidgetCompletely}
              className="rounded p-1 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-200"
              aria-label={t('common.close')}
              title={t('common.close')}
            >
              <X className="size-3.5" strokeWidth={2} aria-hidden />
            </button>
            <button
              type="button"
              onClick={enterFullScreen}
              className="rounded px-1.5 py-1 text-[9px] font-bold uppercase tracking-wider text-zinc-500 transition hover:bg-zinc-800 hover:text-lime-400"
              aria-label={t('floating.fullscreen')}
              title={t('floating.fullscreenTitle')}
            >
              <Maximize2 className="size-3.5" strokeWidth={2} aria-hidden />
            </button>
          </div>
        )}
      </header>

      <div
        className={['flex min-h-0 flex-1 flex-col', isMinimized ? 'hidden' : 'flex'].join(' ')}
        aria-hidden={isMinimized}
      >
        {chatBody}
      </div>
    </div>
  )
}
