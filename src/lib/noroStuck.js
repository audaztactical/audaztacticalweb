/**
 * NÖRO takılma ipucu — formlar `noro:stuck` olayını yayınlar.
 * Dinleyici: NoroAssistant (oturum/sayfa başına en fazla bir kez).
 */

export function emitNoroStuck(page = '') {
  try {
    window.dispatchEvent(
      new CustomEvent('noro:stuck', {
        detail: { page: String(page || '') },
      }),
    )
  } catch {
    /* */
  }
}

/**
 * Aynı sayfada 3 doğrulama hatası → stuck.
 * @returns {{ bump: () => void; reset: () => void }}
 */
export function createValidationStuckCounter(page, threshold = 3) {
  let n = 0
  return {
    bump() {
      n += 1
      if (n >= threshold) {
        emitNoroStuck(page)
        n = 0
      }
    },
    reset() {
      n = 0
    },
  }
}
