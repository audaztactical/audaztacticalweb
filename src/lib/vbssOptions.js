/** @typedef {{ id: string; label: string }} VbssOption */

export const VBSS_CUSTOM = 'custom'

/** @type {VbssOption[]} */
export const INSERTION_METHOD_OPTIONS = [
  { id: 'fast_rope_heli', label: 'Helikopter (Fast-Rope)' },
  { id: 'hook_and_ladder_bot', label: 'Bot (Kanca ve Merdiven)' },
  { id: 'boat_to_boat', label: 'Bot-Bot / Boat-to-Boat' },
  { id: 'compliant_pier', label: 'İskele / Rıhtım Binişi' },
  { id: VBSS_CUSTOM, label: 'Özel / Diğer (Giriş Alanı)' },
]

/** Boarding Point — alias of insertion method options */
export const BOARDING_POINT_OPTIONS = INSERTION_METHOD_OPTIONS

/** @type {VbssOption[]} */
export const THREAT_LEVEL_OPTIONS = [
  { id: 'low', label: 'Düşük (Low)' },
  { id: 'moderate', label: 'Orta (Moderate)' },
  { id: 'high', label: 'Yüksek (High)' },
  { id: 'critical', label: 'Kritik (Critical)' },
]

/** @type {VbssOption[]} */
export const VESSEL_TYPE_OPTIONS = [
  { id: 'cargo_container', label: 'Kargo / Konteyner Gemisi' },
  { id: 'tanker_vessel', label: 'Petrol / Kimyasal Tanker' },
  { id: 'speed_yacht', label: 'Sürat Teknesi / Yat' },
  { id: 'fishing_vessel', label: 'Balıkçı Teknesi / Botu' },
  { id: VBSS_CUSTOM, label: 'Özel / Diğer (Giriş Alanı)' },
]

/** @type {VbssOption[]} */
export const SEA_STATE_OPTIONS = [
  { id: '0-Calm', label: '0 · Sakin (Calm)' },
  { id: '1-Smooth', label: '1 · Durgun (Smooth)' },
  { id: '2-Slight', label: '2 · Hafif Dalga (Slight)' },
  { id: '3-Moderate', label: '3 · Orta (Moderate)' },
  { id: '4-Rough', label: '4 · Kabarık (Rough)' },
  { id: VBSS_CUSTOM, label: '[+] ÖZEL DENİZ DURUMU' },
]

/** @type {Record<string, string>} */
const LABEL_INDEX = Object.fromEntries(
  [
    ...INSERTION_METHOD_OPTIONS,
    ...VESSEL_TYPE_OPTIONS,
    ...SEA_STATE_OPTIONS,
    ...THREAT_LEVEL_OPTIONS,
  ].map((o) => [o.id, o.label])
)

/**
 * @param {string} key
 * @param {string} [customText]
 */
export function resolveVbssSelectValue(key, customText = '') {
  const k = String(key || '').trim()
  if (k === VBSS_CUSTOM) {
    const custom = String(customText || '').trim()
    return custom || 'Özel'
  }
  if (LABEL_INDEX[k]) return LABEL_INDEX[k]
  if (k.startsWith('custom:')) return k.slice(7).trim() || 'Özel'
  if (k) return k
  return '—'
}

/**
 * @param {string} key
 * @param {string} [customText]
 */
export function resolveVbssSelectKey(key, customText = '') {
  const k = String(key || '').trim()
  if (k === VBSS_CUSTOM) {
    const custom = String(customText || '').trim()
    return custom ? `custom:${custom}` : VBSS_CUSTOM
  }
  return k
}

/** @deprecated alias */
export const resolveVbssSeaStateValue = resolveVbssSelectValue

/** @deprecated alias */
export const resolveVbssSeaStateKey = resolveVbssSelectKey
