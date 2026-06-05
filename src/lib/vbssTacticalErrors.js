/** @typedef {{ id: string; label: string }} VbssTacticalErrorOption */

export const VBSS_TACTICAL_ERROR_OPTIONS = [
  { id: 'fatal_funnel_hang', label: 'ÖLÜM HUNİSİNDE ASILI KALMA / FATAL FUNNEL HANG' },
  { id: 'poor_corner_piercing', label: 'ZAYIF KÖŞE DELME / POOR CORNER PIERCING' },
]

/**
 * @param {string[]} tacticalErrors
 */
export function buildVbssTacticalErrorsForPayload(tacticalErrors) {
  return (Array.isArray(tacticalErrors) ? tacticalErrors : [])
    .map((id) => String(id || '').trim())
    .filter(Boolean)
}
