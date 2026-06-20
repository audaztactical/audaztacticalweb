import { useEffect } from 'react'

/**
 * Açılan akordeon/detay bloğunu görünür alana yumuşak kaydırır.
 * @param {boolean} isOpen
 * @param {React.RefObject<HTMLElement | null>} ref
 */
export function useAccordionReveal(isOpen, ref) {
  useEffect(() => {
    if (!isOpen || !ref.current) return undefined
    const frame = requestAnimationFrame(() => {
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
    return () => cancelAnimationFrame(frame)
  }, [isOpen, ref])
}
