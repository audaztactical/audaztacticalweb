import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Maximize2, ShieldAlert } from 'lucide-react'

/**
 * @returns {Element | null}
 */
function getFullscreenElement() {
  const doc = document
  return (
    doc.fullscreenElement ||
    /** @type {{ webkitFullscreenElement?: Element | null }} */ (doc).webkitFullscreenElement ||
    null
  )
}

/**
 * Taktik Timer — zorunlu tam ekran protokolü.
 * Fullscreen olmadan etkileşim kilitli; seans sırasında çıkışta uyarı + yeniden kilit.
 *
 * Hedef tahtası gibi iç içe FS: etkileşim açık kalır (pointer-events kilitlenmez).
 * Abort yalnızca protokol kökü gerçekten tam ekrandayken kaybedilirse tetiklenir.
 *
 * @param {{
 *   children: import('react').ReactNode
 *   sessionActive?: boolean
 *   onFullscreenLost?: () => void
 * }} props
 */
export default function TimerFullscreenProtocol({
  children,
  sessionActive = false,
  onFullscreenLost,
}) {
  const { t } = useTranslation('timer')
  const rootRef = useRef(/** @type {HTMLDivElement | null} */ (null))
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(/** @type {string | null} */ (null))
  const [exitNotice, setExitNotice] = useState(false)
  const sessionActiveRef = useRef(sessionActive)
  const onLostRef = useRef(onFullscreenLost)
  /** Protokol kökünün kendisi FS'teydi — iç içe (board) FS bunu set etmez */
  const wasProtocolFsRef = useRef(false)

  useEffect(() => {
    sessionActiveRef.current = sessionActive
  }, [sessionActive])

  useEffect(() => {
    onLostRef.current = onFullscreenLost
  }, [onFullscreenLost])

  const syncFs = useCallback(() => {
    const el = rootRef.current
    const active = getFullscreenElement()
    const protocolFs = Boolean(active && el && active === el)
    const nestedFs = Boolean(active && el && active !== el && el.contains(active))
    const unlocked = protocolFs || nestedFs

    setIsFullscreen(unlocked)

    if (protocolFs) {
      wasProtocolFsRef.current = true
      setExitNotice(false)
      setError(null)
      return
    }

    if (nestedFs) {
      // Hedef tahtası FS — UI tıklanabilir kalsın; protokol abort üretme
      setExitNotice(false)
      setError(null)
      return
    }

    // FS yok: yalnızca protokol kökü FS iken kaybedildiyse abort
    if (wasProtocolFsRef.current && sessionActiveRef.current) {
      setExitNotice(true)
      onLostRef.current?.()
    }
  }, [])

  useEffect(() => {
    syncFs()
    const onChange = () => syncFs()
    document.addEventListener('fullscreenchange', onChange)
    document.addEventListener('webkitfullscreenchange', onChange)
    return () => {
      document.removeEventListener('fullscreenchange', onChange)
      document.removeEventListener('webkitfullscreenchange', onChange)
    }
  }, [syncFs])

  const enterFullscreen = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      const el = rootRef.current
      if (!el) throw new Error('no-root')
      if (typeof el.requestFullscreen === 'function') {
        await el.requestFullscreen({ navigationUI: 'hide' })
      } else {
        const webkitReq =
          /** @type {{ webkitRequestFullscreen?: () => Promise<void> | void }} */ (el)
            .webkitRequestFullscreen
        if (typeof webkitReq === 'function') await webkitReq.call(el)
        else throw new Error('unsupported')
      }
      setExitNotice(false)
      wasProtocolFsRef.current = true
    } catch {
      setError(t('fullscreen.unsupported'))
    } finally {
      setBusy(false)
      window.setTimeout(syncFs, 60)
    }
  }, [syncFs, t])

  const locked = Boolean(sessionActive) && !isFullscreen

  useEffect(() => {
    if (sessionActive) return
    setExitNotice(false)
  }, [sessionActive])

  return (
    <div
      ref={rootRef}
      className="relative min-h-[min(100dvh,100%)] w-full min-w-0 bg-app-bg"
      data-timer-fs-root=""
      data-fs-locked={locked ? '1' : '0'}
    >
      <div
        className={locked ? 'pointer-events-none select-none opacity-[0.28]' : undefined}
        style={locked ? undefined : { pointerEvents: 'auto' }}
      >
        {children}
      </div>

      {locked ? (
        <div
          className="absolute inset-0 z-[240] flex min-h-[min(100dvh,100%)] items-end justify-center bg-black/90 p-3 sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="timer-fs-gate-title"
        >
          <div className="relative w-full max-w-md overflow-hidden rounded-sm border border-[#facc15]/50 bg-[#0a0a0b] shadow-[0_0_48px_-12px_rgba(250,204,21,0.4)]">
            <div className="relative z-[1] px-4 py-5 sm:px-5 sm:py-6">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-sm border border-[#facc15]/45 bg-[rgba(250,204,21,0.12)]">
                  {exitNotice ? (
                    <ShieldAlert className="size-5 text-amber-300" strokeWidth={1.5} aria-hidden />
                  ) : (
                    <Maximize2 className="size-5 text-[#facc15]" strokeWidth={1.5} aria-hidden />
                  )}
                </span>
                <div className="min-w-0">
                  <p
                    id="timer-fs-gate-title"
                    className="font-mono-technical text-[10px] font-bold uppercase tracking-[0.28em] text-[#facc15]"
                  >
                    {exitNotice
                      ? t('fullscreen.protocol.reentryTitle')
                      : t('fullscreen.protocol.title')}
                  </p>
                  <p className="mt-2 font-mono-technical text-[11px] leading-relaxed text-app-text/70">
                    {exitNotice
                      ? t('fullscreen.protocol.reentryBody')
                      : t('fullscreen.protocol.body')}
                  </p>
                </div>
              </div>

              {error ? (
                <p className="mt-3 font-mono-technical text-[10px] text-red-400/90" role="alert">
                  {error}
                </p>
              ) : null}

              <p className="mt-4 font-mono-technical text-[8px] uppercase tracking-[0.16em] text-zinc-500">
                {t('fullscreen.protocol.hint')}
              </p>

              <button
                type="button"
                disabled={busy}
                onClick={() => void enterFullscreen()}
                className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-sm border border-[#facc15]/55 bg-[#facc15]/15 px-3 font-mono-technical text-[10px] font-bold uppercase tracking-[0.22em] text-[#facc15] transition hover:bg-[#facc15]/22 disabled:opacity-50"
              >
                <Maximize2 className="size-4" strokeWidth={1.5} aria-hidden />
                {busy ? t('fullscreen.protocol.entering') : t('fullscreen.protocol.enter')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
