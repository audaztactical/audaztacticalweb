import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Info } from 'lucide-react'
import { getBallisticTerm } from '../../data/ballisticTerms.js'

const VIEWPORT_MARGIN = 12
const GAP = 6
const MAX_WIDTH = 288

/**
 * @param {DOMRect} trigger
 * @param {{ width: number, height: number }} popoverSize
 */
function computePopoverPosition(trigger, popoverSize) {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const maxWidth = Math.min(MAX_WIDTH, vw - VIEWPORT_MARGIN * 2)
  const width = Math.min(maxWidth, popoverSize.width || maxWidth)
  const height = popoverSize.height

  let left = trigger.left
  if (left + width > vw - VIEWPORT_MARGIN) {
    left = vw - VIEWPORT_MARGIN - width
  }
  if (left < VIEWPORT_MARGIN) left = VIEWPORT_MARGIN

  const spaceBelow = vh - trigger.bottom - VIEWPORT_MARGIN
  const spaceAbove = trigger.top - VIEWPORT_MARGIN
  let top = trigger.bottom + GAP
  let placement = 'bottom'

  if (height > spaceBelow && spaceAbove >= spaceBelow) {
    top = trigger.top - height - GAP
    placement = 'top'
  }

  if (top + height > vh - VIEWPORT_MARGIN) {
    top = vh - VIEWPORT_MARGIN - height
  }
  if (top < VIEWPORT_MARGIN) {
    top = VIEWPORT_MARGIN
  }

  return { top, left, width, maxHeight: vh - VIEWPORT_MARGIN * 2, placement }
}

/**
 * Balistik terim açıklama ipucu — tıklama / masaüstü hover, ESC ve dış tıklama ile kapanır.
 * @param {{ termKey: string, className?: string }} props
 */
export default function InfoTooltip({ termKey, className = '' }) {
  const term = getBallisticTerm(termKey)
  const popoverId = useId()
  const triggerRef = useRef(/** @type {HTMLButtonElement | null} */ (null))
  const popoverRef = useRef(/** @type {HTMLDivElement | null} */ (null))
  const [open, setOpen] = useState(false)
  const [openViaHover, setOpenViaHover] = useState(false)
  const [coords, setCoords] = useState(
    /** @type {{ top: number, left: number, width: number, maxHeight: number, placement: string } | null} */ (
      null
    ),
  )

  const close = useCallback(() => {
    setOpen(false)
    setOpenViaHover(false)
    setCoords(null)
  }, [])

  const toggle = useCallback(() => {
    setOpenViaHover(false)
    setOpen((prev) => !prev)
  }, [])

  useLayoutEffect(() => {
    if (!open || !triggerRef.current || !popoverRef.current) return

    const trigger = triggerRef.current.getBoundingClientRect()
    const popoverEl = popoverRef.current
    const maxWidth = Math.min(MAX_WIDTH, window.innerWidth - VIEWPORT_MARGIN * 2)

    popoverEl.style.width = `${maxWidth}px`
    popoverEl.style.visibility = 'hidden'
    popoverEl.style.display = 'block'

    const measured = {
      width: popoverEl.offsetWidth,
      height: popoverEl.offsetHeight,
    }

    const next = computePopoverPosition(trigger, measured)
    setCoords(next)
    popoverEl.style.visibility = 'visible'
  }, [open, termKey])

  useEffect(() => {
    if (!open) return undefined

    const onKeyDown = (e) => {
      if (e.key === 'Escape') close()
    }

    const onPointerDown = (e) => {
      const target = /** @type {Node | null} */ (e.target)
      if (triggerRef.current?.contains(target) || popoverRef.current?.contains(target)) {
        return
      }
      close()
    }

    const onViewportChange = () => {
      if (!triggerRef.current || !popoverRef.current) return
      const trigger = triggerRef.current.getBoundingClientRect()
      const measured = {
        width: popoverRef.current.offsetWidth,
        height: popoverRef.current.offsetHeight,
      }
      setCoords(computePopoverPosition(trigger, measured))
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('resize', onViewportChange)
    window.addEventListener('scroll', onViewportChange, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('resize', onViewportChange)
      window.removeEventListener('scroll', onViewportChange, true)
    }
  }, [open, close])

  if (!term) return null

  const popover =
    open
      ? createPortal(
          <div
            ref={popoverRef}
            id={popoverId}
            role="tooltip"
            className="rounded border border-emerald-500/40 bg-black px-3 py-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.65)]"
            style={{
              position: 'fixed',
              top: coords?.top ?? 0,
              left: coords?.left ?? 0,
              width: coords?.width ?? Math.min(MAX_WIDTH, window.innerWidth - VIEWPORT_MARGIN * 2),
              maxHeight: coords?.maxHeight ?? window.innerHeight - VIEWPORT_MARGIN * 2,
              overflowY: 'auto',
              visibility: coords ? 'visible' : 'hidden',
              zIndex: 10000,
            }}
          >
            <p className="font-mono-technical text-[10px] font-bold uppercase leading-snug tracking-[0.12em] text-emerald-400/95">
              {term.termEn}
              <span className="mx-1 text-emerald-500/40">—</span>
              <span className="text-slate-100">{term.termTr}</span>
            </p>
            <p className="mt-2 font-mono-technical text-[11px] leading-relaxed text-slate-300/90">
              {term.definition}
            </p>
            <p className="mt-2 font-mono-technical text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-500/75">
              Neden gerekli?
            </p>
            <p className="mt-1 font-mono-technical text-[11px] leading-relaxed text-slate-400/95">
              {term.whyItMatters}
            </p>
            {term.actionAdvice ? (
              <>
                <p className="mt-2 font-mono-technical text-[9px] font-bold uppercase tracking-[0.18em] text-amber-400/85">
                  Ne yapmalı?
                </p>
                <p className="mt-1 font-mono-technical text-[11px] leading-relaxed text-slate-300/95">
                  {term.actionAdvice}
                </p>
              </>
            ) : null}
          </div>,
          document.body,
        )
      : null

  return (
    <span className={`inline-flex align-middle ${className}`.trim()}>
      <button
        ref={triggerRef}
        type="button"
        className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-emerald-500/45 bg-black/80 text-emerald-400/90 transition hover:border-emerald-400/70 hover:bg-emerald-500/10 hover:text-emerald-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-emerald-500/60 sm:h-[18px] sm:w-[18px]"
        aria-label={`${term.termTr} hakkında bilgi`}
        aria-expanded={open}
        aria-controls={popoverId}
        onClick={toggle}
        onMouseEnter={() => {
          if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
            setOpenViaHover(true)
            setOpen(true)
          }
        }}
        onMouseLeave={() => {
          if (openViaHover) close()
        }}
      >
        <Info className="h-2.5 w-2.5 sm:h-3 sm:w-3" strokeWidth={2.25} aria-hidden />
      </button>
      {popover}
    </span>
  )
}
