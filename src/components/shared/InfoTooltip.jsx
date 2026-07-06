import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { Info } from 'lucide-react'
import { getBallisticTerm } from '../../data/ballisticTerms.js'

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
  const [align, setAlign] = useState(/** @type {'left' | 'right'} */ ('left'))
  const [openViaHover, setOpenViaHover] = useState(false)

  const close = useCallback(() => {
    setOpen(false)
    setOpenViaHover(false)
  }, [])

  const toggle = useCallback(() => {
    setOpenViaHover(false)
    setOpen((prev) => !prev)
  }, [])

  useLayoutEffect(() => {
    if (!open || !triggerRef.current || !popoverRef.current) return

    const trigger = triggerRef.current.getBoundingClientRect()
    const popover = popoverRef.current.getBoundingClientRect()
    const margin = 8
    const spaceRight = window.innerWidth - trigger.left - margin
    const spaceLeft = trigger.right - margin

    if (popover.width > spaceRight && spaceLeft >= spaceRight) {
      setAlign('right')
    } else {
      setAlign('left')
    }
  }, [open, termKey])

  useEffect(() => {
    if (!open) return undefined

    const onKeyDown = (e) => {
      if (e.key === 'Escape') close()
    }

    const onPointerDown = (e) => {
      const target = /** @type {Node | null} */ (e.target)
      if (
        triggerRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) {
        return
      }
      close()
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [open, close])

  if (!term) return null

  return (
    <span className={`relative inline-flex align-middle ${className}`.trim()}>
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

      {open ? (
        <div
          ref={popoverRef}
          id={popoverId}
          role="tooltip"
          className={`absolute top-[calc(100%+6px)] z-[200] w-[min(calc(100vw-2rem),17rem)] rounded border border-emerald-500/40 bg-black px-3 py-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.65)] sm:w-72 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
          style={{ maxWidth: 'min(18rem, calc(100vw - 1rem))' }}
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
        </div>
      ) : null}
    </span>
  )
}
