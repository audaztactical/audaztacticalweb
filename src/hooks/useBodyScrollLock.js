import { useEffect } from 'react'

/** @type {Set<string>} */
const activeLocks = new Set()

/** @type {number} */
let savedScrollY = 0

/** @type {{
 *   bodyOverflow: string
 *   bodyPosition: string
 *   bodyTop: string
 *   bodyWidth: string
 *   htmlOverflow: string
 * } | null} */
let savedStyles = null

function applyBodyScrollLock() {
  if (typeof document === 'undefined' || typeof window === 'undefined') return
  savedScrollY = window.scrollY
  savedStyles = {
    bodyOverflow: document.body.style.overflow,
    bodyPosition: document.body.style.position,
    bodyTop: document.body.style.top,
    bodyWidth: document.body.style.width,
    htmlOverflow: document.documentElement.style.overflow,
  }
  document.body.style.overflow = 'hidden'
  document.documentElement.style.overflow = 'hidden'
  document.body.style.position = 'fixed'
  document.body.style.top = `-${savedScrollY}px`
  document.body.style.width = '100%'
}

function releaseBodyScrollLock() {
  if (typeof document === 'undefined' || typeof window === 'undefined' || !savedStyles) return
  document.body.style.overflow = savedStyles.bodyOverflow
  document.documentElement.style.overflow = savedStyles.htmlOverflow
  document.body.style.position = savedStyles.bodyPosition
  document.body.style.top = savedStyles.bodyTop
  document.body.style.width = savedStyles.bodyWidth
  window.scrollTo(0, savedScrollY)
  savedStyles = null
}

/**
 * Ref-count tabanlı body scroll kilidi.
 * @param {string} id Benzersiz kilit kimliği
 * @param {boolean} [enabled=true]
 */
export function useBodyScrollLock(id, enabled = true) {
  useEffect(() => {
    if (!enabled || !id) return undefined

    const wasEmpty = activeLocks.size === 0
    activeLocks.add(id)
    if (wasEmpty) applyBodyScrollLock()

    return () => {
      activeLocks.delete(id)
      if (activeLocks.size === 0) releaseBodyScrollLock()
    }
  }, [id, enabled])
}
