/** Tüm olası scroll köklerini en üste alır. */
export function scrollAppToTop() {
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  document.documentElement.scrollTop = 0
  document.body.scrollTop = 0

  document.querySelectorAll('[data-app-scroll-root]').forEach((el) => {
    if (el instanceof HTMLElement) {
      el.scrollTop = 0
    }
  })
}

/** Lazy route / animasyon sonrası için birkaç tur scroll sıfırlama. */
export function scheduleScrollAppToTop() {
  scrollAppToTop()
  requestAnimationFrame(scrollAppToTop)
  window.setTimeout(scrollAppToTop, 0)
  window.setTimeout(scrollAppToTop, 50)
  window.setTimeout(scrollAppToTop, 150)
}
