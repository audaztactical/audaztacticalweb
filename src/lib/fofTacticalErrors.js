/** @typedef {{ id: string; label: string }} FofTacticalErrorOption */

/** FOF analitik / ORS ile hizalı zorunlu taktik hata kutuları */
export const FOF_TACTICAL_ERROR_OPTIONS = [
  { id: 'blue_on_blue', label: 'MAVİ-MAVİ / BLUE ON BLUE' },
  { id: 'muzzle_flagging', label: 'NAMLU İHLALİ / MUZZLE FLAGGING' },
  { id: 'slow_breach', label: 'YAVAŞ KIRMA / SLOW BREACH' },
]

/**
 * @param {string[]} tacticalErrors
 * @param {{ blueOnBlue?: boolean }} [flags]
 */
export function buildFofTacticalErrorsForPayload(tacticalErrors, flags = {}) {
  const set = new Set(
    (Array.isArray(tacticalErrors) ? tacticalErrors : [])
      .map((id) => String(id || '').trim())
      .filter(Boolean)
  )
  if (flags.blueOnBlue) set.add('blue_on_blue')
  return [...set]
}

/**
 * @param {string[]} tacticalErrors
 */
export function fofPayloadHasBlueOnBlue(tacticalErrors) {
  const ids = buildFofTacticalErrorsForPayload(tacticalErrors, { blueOnBlue: false })
  return ids.includes('blue_on_blue')
}
