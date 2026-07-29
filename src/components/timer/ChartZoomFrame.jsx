import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Maximize2, Minimize2, RotateCcw } from 'lucide-react'

const MIN_ZOOM = 1
const MAX_ZOOM = 6

/**
 * Grafik çerçevesi — tam ekran + tekerlek zoom + pan.
 * Başlık zoom dışında kalır; eksen etiketleri zoom’a karşı ters ölçeklenir.
 *
 * @param {{
 *   title?: string
 *   className?: string
 *   bodyClassName?: string
 *   children: import('react').ReactNode
 *   feedback?: import('react').ReactNode
 * }} props
 */
export default function ChartZoomFrame({
  title,
  className = '',
  bodyClassName = '',
  children,
  feedback = null,
}) {
  const { t } = useTranslation('timer')
  const rootRef = useRef(/** @type {HTMLDivElement | null} */ (null))
  const viewportRef = useRef(/** @type {HTMLDivElement | null} */ (null))
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isFs, setIsFs] = useState(false)
  const dragRef = useRef(/** @type {{ x: number, y: number, panX: number, panY: number } | null} */ (null))
  const zoomRef = useRef(1)
  const panRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    zoomRef.current = zoom
  }, [zoom])

  useEffect(() => {
    panRef.current = pan
  }, [pan])

  useEffect(() => {
    const onFs = () => {
      const el = rootRef.current
      setIsFs(Boolean(el && document.fullscreenElement === el))
      if (!el || document.fullscreenElement !== el) {
        setZoom(1)
        setPan({ x: 0, y: 0 })
      }
    }
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [])

  const resetView = useCallback(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [])

  const toggleFs = useCallback(async () => {
    const el = rootRef.current
    if (!el) return
    try {
      if (document.fullscreenElement === el) {
        await document.exitFullscreen()
      } else {
        await el.requestFullscreen()
      }
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    const vp = viewportRef.current
    if (!vp) return undefined

    const onWheel = (e) => {
      e.preventDefault()
      const rect = vp.getBoundingClientRect()
      const cx = e.clientX - rect.left
      const cy = e.clientY - rect.top
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12
      const prev = zoomRef.current
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev * factor))
      const ratio = next / prev
      const p = panRef.current
      const nextPan =
        next <= MIN_ZOOM + 0.01
          ? { x: 0, y: 0 }
          : {
              x: cx - (cx - p.x) * ratio,
              y: cy - (cy - p.y) * ratio,
            }
      zoomRef.current = next
      panRef.current = nextPan
      setZoom(next)
      setPan(nextPan)
    }

    vp.addEventListener('wheel', onWheel, { passive: false })
    return () => vp.removeEventListener('wheel', onWheel)
  }, [])

  const onPointerDown = (e) => {
    if (zoom <= 1.01) return
    if (e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y }
  }

  const onPointerMove = (e) => {
    const d = dragRef.current
    if (!d) return
    const next = {
      x: d.panX + (e.clientX - d.x),
      y: d.panY + (e.clientY - d.y),
    }
    panRef.current = next
    setPan(next)
  }

  const onPointerUp = (e) => {
    dragRef.current = null
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
  }

  const invZoom = 1 / Math.max(zoom, 0.01)

  return (
    <div
      ref={rootRef}
      className={[
        'flex min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-sm border border-slate-700/70 bg-slate-950',
        isFs
          ? [
              'fixed inset-0 z-[200] h-[100dvh] max-h-[100dvh] w-screen max-w-none rounded-none border-0',
              'pt-[max(1.25rem,env(safe-area-inset-top))]',
              'pb-[max(1rem,env(safe-area-inset-bottom))]',
              'pl-[max(1rem,env(safe-area-inset-left))]',
              'pr-[max(1rem,env(safe-area-inset-right))]',
            ].join(' ')
          : '',
        className,
      ].join(' ')}
    >
      {/* Başlık — zoom transform dışında, FS’te safe padding içinde */}
      <div
        className={[
          'relative z-20 flex shrink-0 items-center justify-between gap-3 border-b border-slate-800/80 bg-slate-950',
          isFs ? 'mb-2 px-2.5 py-2.5 sm:px-4 sm:py-3' : 'px-2.5 py-2',
        ].join(' ')}
      >
        <p
          className={[
            'min-w-0 truncate font-mono text-xs font-bold uppercase leading-none tracking-[0.12em] text-[#facc15] sm:text-sm',
          ].join(' ')}
        >
          {title || t('dryFire.chartZoom.chart')}
          {zoom > 1.02 ? (
            <span className="ml-2 tabular-nums text-[#facc15]/70">
              {t('dryFire.chartZoom.zoomLevel', { n: zoom.toFixed(1) })}
            </span>
          ) : null}
        </p>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={resetView}
            disabled={zoom <= 1.01 && Math.abs(pan.x) < 1 && Math.abs(pan.y) < 1}
            className="inline-flex size-8 items-center justify-center rounded-sm border border-slate-700 text-zinc-400 transition hover:border-[#facc15]/40 hover:text-[#facc15] disabled:opacity-35"
            title={t('dryFire.chartZoom.reset')}
            aria-label={t('dryFire.chartZoom.reset')}
          >
            <RotateCcw className="size-3.5" strokeWidth={1.5} aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => void toggleFs()}
            className="inline-flex size-8 items-center justify-center rounded-sm border border-slate-700 text-zinc-400 transition hover:border-[#facc15]/40 hover:text-[#facc15]"
            title={isFs ? t('dryFire.chartZoom.exitFs') : t('dryFire.chartZoom.maximize')}
            aria-label={isFs ? t('dryFire.chartZoom.exitFs') : t('dryFire.chartZoom.maximize')}
          >
            {isFs ? (
              <Minimize2 className="size-3.5" strokeWidth={1.5} aria-hidden />
            ) : (
              <Maximize2 className="size-3.5" strokeWidth={1.5} aria-hidden />
            )}
          </button>
        </div>
      </div>

      <div
        ref={viewportRef}
        className={[
          'relative z-10 flex min-h-[150px] min-w-0 flex-1 touch-none overflow-hidden',
          isFs ? 'items-stretch justify-stretch' : 'items-stretch justify-stretch',
          zoom > 1.01 ? 'cursor-grab active:cursor-grabbing' : '',
          bodyClassName,
        ].join(' ')}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role="presentation"
      >
        <div
          className="chart-zoom-surface flex h-full w-full min-h-0 flex-col origin-center will-change-transform"
          style={{
            // @ts-expect-error CSS custom prop
            '--chart-zoom': zoom,
            '--chart-inv-zoom': invZoom,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        >
          <div className="flex h-full min-h-0 w-full flex-col">{children}</div>
        </div>
      </div>

      {/* Hint — absolute değil; kontrollerle üst üste binmez */}
      <p className="shrink-0 border-t border-slate-800/60 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-500 sm:text-xs">
        {t('dryFire.chartZoom.hint')}
      </p>

      {feedback ? (
        <div className="relative z-20 shrink-0 border-t border-slate-800/80 bg-slate-950">
          {feedback}
        </div>
      ) : null}

      {/* Eksen / SVG etiketleri zoom’dan bağımsız okunur kalsın */}
      <style>{`
        .chart-zoom-surface .recharts-cartesian-axis-tick text,
        .chart-zoom-surface .recharts-polar-angle-axis-tick text,
        .chart-zoom-surface .recharts-polar-radius-axis-tick text,
        .chart-zoom-surface .recharts-label,
        .chart-zoom-surface .recharts-text,
        .chart-zoom-surface text {
          transform: scale(var(--chart-inv-zoom, 1));
          transform-box: fill-box;
          transform-origin: center;
        }
      `}</style>
    </div>
  )
}
