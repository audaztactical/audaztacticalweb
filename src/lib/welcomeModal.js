/** Hoş Geldin Operatör modal metin sürümü — içerik değişince artırın. */
export const WELCOME_MODAL_VERSION = 'v1.0'

/**
 * @param {unknown} dismissed
 * @param {string} [currentVersion]
 * @returns {boolean}
 */
export function shouldAutoShowWelcomeModal(dismissed, currentVersion = WELCOME_MODAL_VERSION) {
  if (!dismissed || typeof dismissed !== 'object') return true
  const d = /** @type {Record<string, unknown>} */ (dismissed)
  if (d.neverShowAgain !== true) return true
  const storedVersion = typeof d.version === 'string' ? d.version.trim() : ''
  if (!storedVersion || storedVersion !== currentVersion) return true
  return false
}
