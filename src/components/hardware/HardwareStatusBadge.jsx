import { useEffect, useRef, useState } from 'react'
import { Bluetooth, Cable, Unplug } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useHardware } from '../../context/HardwareContext'

/**
 * Modül üstü canlı donanım bağlantı rozeti — lastTrigger + ses seviyesi.
 * Range Card: armed=yeşil, idle/kopuk=gri, link-lost=kırmızı.
 * @param {{ className?: string, showDisconnect?: boolean, armed?: boolean }} [props]
 */
export default function HardwareStatusBadge({
  className = '',
  showDisconnect = false,
  armed = false,
}) {
  const { t } = useTranslation('timer')
  const {
    isConnected,
    connectionType,
    deviceName,
    lastTrigger,
    disconnect,
    connecting,
    error,
    telemetryRef,
  } = useHardware()

  const [liveLvl, setLiveLvl] = useState(0)
  const [linkLostFlash, setLinkLostFlash] = useState(false)
  const prevConnectedRef = useRef(isConnected)

  useEffect(() => {
    if (!isConnected) {
      setLiveLvl(0)
      return undefined
    }
    let raf = 0
    let lastSeq = -1
    const tick = () => {
      const snap = telemetryRef.current
      if (snap.seq !== lastSeq) {
        lastSeq = snap.seq
        setLiveLvl(Math.round(snap.lvl || 0))
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [isConnected, telemetryRef])

  useEffect(() => {
    if (error === 'link-lost') {
      setLinkLostFlash(true)
    }
    if (isConnected) {
      setLinkLostFlash(false)
    }
  }, [error, isConnected])

  useEffect(() => {
    const was = prevConnectedRef.current
    prevConnectedRef.current = isConnected
    if (was && !isConnected && error === 'link-lost') {
      setLinkLostFlash(true)
    }
  }, [error, isConnected])

  const typeLabel =
    connectionType === 'BLUETOOTH'
      ? 'BLE'
      : connectionType === 'USB_SERIAL'
        ? 'USB'
        : '—'

  const showLinkLost = linkLostFlash || error === 'link-lost'

  /** @type {'lost' | 'armed' | 'connected' | 'idle'} */
  const tone = showLinkLost
    ? 'lost'
    : isConnected && armed
      ? 'armed'
      : isConnected
        ? 'connected'
        : 'idle'

  const liveTone = tone === 'armed' || tone === 'connected'

  return (
    <div className={['flex min-w-0 flex-col gap-1', className].join(' ')}>
      <div
        className={[
          'flex flex-wrap items-center gap-2 rounded-sm border px-2.5 py-1.5',
          tone === 'lost'
            ? 'border-red-500/55 bg-red-500/10'
            : tone === 'armed'
              ? 'border-emerald-500/55 bg-emerald-500/15'
              : tone === 'connected'
                ? 'border-emerald-500/40 bg-emerald-500/10'
                : 'border-zinc-600/55 bg-[#0a0a0b]/80',
        ].join(' ')}
      >
        {isConnected ? (
          connectionType === 'BLUETOOTH' ? (
            <Bluetooth
              className={['size-3.5 shrink-0', liveTone ? 'text-emerald-300' : 'text-zinc-400'].join(
                ' ',
              )}
              strokeWidth={1.5}
              aria-hidden
            />
          ) : (
            <Cable
              className={['size-3.5 shrink-0', liveTone ? 'text-emerald-300' : 'text-zinc-400'].join(
                ' ',
              )}
              strokeWidth={1.5}
              aria-hidden
            />
          )
        ) : (
          <Unplug
            className={[
              'size-3.5 shrink-0',
              showLinkLost ? 'text-red-400' : 'text-zinc-500',
            ].join(' ')}
            strokeWidth={1.5}
            aria-hidden
          />
        )}
        <div className="min-w-0">
          <p
            className={[
              'truncate font-mono-technical text-[8px] font-bold uppercase tracking-[0.16em]',
              tone === 'lost' ? 'text-red-400' : liveTone ? 'text-emerald-300' : 'text-zinc-500',
            ].join(' ')}
          >
            {showLinkLost && !isConnected
              ? t('hardware.badge.linkLost')
              : isConnected
                ? t('hardware.badge.connected', {
                    name: deviceName || 'AUDAZ-DRYFIRE-S3',
                    type: typeLabel,
                  })
                : connecting
                  ? t('hardware.badge.connecting')
                  : t('hardware.badge.offline')}
          </p>
          {isConnected ? (
            <p className="mt-0.5 font-mono-technical text-[7px] tabular-nums tracking-[0.08em] text-zinc-500">
              {lastTrigger
                ? t('hardware.badge.lastTrigger', {
                    loud: lastTrigger.loudness,
                    flinch: lastTrigger.flinch ?? '—',
                  })
                : t('hardware.badge.listening', { lvl: liveLvl })}
            </p>
          ) : null}
        </div>
        {showDisconnect && isConnected ? (
          <button
            type="button"
            onClick={() => void disconnect()}
            className="ml-auto inline-flex min-h-7 shrink-0 items-center rounded-sm border border-zinc-600/50 px-2 font-mono-technical text-[7px] uppercase tracking-[0.14em] text-zinc-400 transition hover:border-red-400/40 hover:text-red-300"
          >
            {t('hardware.disconnect')}
          </button>
        ) : null}
      </div>
      {showLinkLost && !isConnected ? (
        <p
          role="alert"
          className="rounded-sm border border-red-500/40 bg-red-500/10 px-2.5 py-1.5 font-mono-technical text-[8px] leading-relaxed text-red-200/90"
        >
          {t('hardware.error.linkLost')}
        </p>
      ) : null}
    </div>
  )
}
