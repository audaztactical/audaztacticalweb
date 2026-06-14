/** @typedef {{ id: string; label: string }} TcccOption */

export const TCCC_CUSTOM = 'custom'

/** @type {TcccOption[]} */
export const TCCC_PHASE_OPTIONS = [
  { id: 'care_under_fire_cuf', label: 'Ateş Altında Bakım (CUF)' },
  { id: 'tactical_field_care_tfc', label: 'Taktik Saha Bakımı (TFC)' },
  { id: 'tactical_evacuation_care_tevac', label: 'Taktik Tahliye Bakımı (TEVAC)' },
  { id: TCCC_CUSTOM, label: 'Özel / Diğer Faz' },
]

/** @type {TcccOption[]} */
export const INJURY_TYPE_OPTIONS = [
  { id: 'extremity_bleeding', label: 'Uzuv Kanaması (Ağır Kanama)' },
  { id: 'thoracic_trauma', label: 'Göğüs Travması / Şarapnel (Solunum Krizi)' },
  { id: 'polytrauma', label: 'Çoklu Ağır Travma (Tüm Müdahaleler Gerekli)' },
]

export const TCCC_INJURY_EXTREMITY = 'extremity_bleeding'
export const TCCC_INJURY_THORACIC = 'thoracic_trauma'
export const TCCC_INJURY_POLYTRAUMA = 'polytrauma'

/** @type {TcccOption[]} */
export const CASUALTY_TYPE_OPTIONS = [
  { id: 'combat', label: 'Savaş (Combat)' },
  { id: 'accident', label: 'Kaza (Accident)' },
]

/** @type {TcccOption[]} */
export const PROCEDURE_PERFORMED_OPTIONS = [
  { id: 'tourniquet', label: 'Turnike' },
  { id: 'bandage', label: 'Bandaj / Yara Paketleme' },
  { id: 'airway', label: 'Hava Yolu (NPA)' },
]

/** @type {TcccOption[]} */
export const OUTCOME_OPTIONS = [
  { id: 'successful', label: 'Başarılı' },
  { id: 'failed', label: 'Başarısız' },
]

/** @type {TcccOption[]} */
export const TOURNIQUET_LOCATION_OPTIONS = [
  { id: 'right_arm', label: 'Sağ Kol' },
  { id: 'left_arm', label: 'Sol Kol' },
  { id: 'right_leg', label: 'Sağ Bacak' },
  { id: 'left_leg', label: 'Sol Bacak' },
  { id: 'none', label: 'Uygulanmadı / Yok' },
  { id: TCCC_CUSTOM, label: 'Özel / Diğer Konum' },
]

/** @type {Record<string, string>} */
const LABEL_INDEX = Object.fromEntries(
  [
    ...TCCC_PHASE_OPTIONS,
    ...INJURY_TYPE_OPTIONS,
    ...TOURNIQUET_LOCATION_OPTIONS,
    ...CASUALTY_TYPE_OPTIONS,
    ...OUTCOME_OPTIONS,
  ].map((o) => [o.id, o.label])
)

/**
 * @param {string} key
 */
export function resolveInjuryTypeValue(key) {
  const k = String(key || '').trim()
  if (LABEL_INDEX[k]) return LABEL_INDEX[k]
  if (k) return k
  return '—'
}

/**
 * @param {string} key
 * @param {string} [customText]
 */
export function resolveTcccSelectValue(key, customText = '') {
  const k = String(key || '').trim()
  if (k === TCCC_CUSTOM) {
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
export function resolveTcccSelectKey(key, customText = '') {
  const k = String(key || '').trim()
  if (k === TCCC_CUSTOM) {
    const custom = String(customText || '').trim()
    return custom ? `custom:${custom}` : TCCC_CUSTOM
  }
  return k
}
