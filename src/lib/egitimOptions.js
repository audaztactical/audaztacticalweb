/** @typedef {{ id: string; label: string }} EgitimOption */

export const EGITIM_CUSTOM = 'custom'

/** @type {EgitimOption[]} */
export const TRAINING_FOCUS_OPTIONS = [
  { id: 'atis_mastery', label: 'Atış Ustalığı (ATIŞ)' },
  { id: 'cqb_tactics', label: 'Meskun Mahal Taktikleri (CQB)' },
  { id: 'fof_simulation', label: 'Force-on-Force Simülasyonu (FOF)' },
  { id: 'vbss_maritime', label: 'Deniz Borda Geçişi (VBSS)' },
  { id: 'tccc_medical', label: 'Taktik Saha Sağlığı (TCCC)' },
  { id: EGITIM_CUSTOM, label: 'Özel / Diğer Odak' },
]

/** @type {EgitimOption[]} */
export const DIFFICULTY_LEVEL_OPTIONS = [
  { id: 'green_low', label: 'Yeşil · Düşük Stres' },
  { id: 'amber_medium', label: 'Kehribar · Orta Stres' },
  { id: 'red_hardcore', label: 'Kırmızı · Hardcore' },
]

/** @type {Record<string, string>} */
const LABEL_INDEX = Object.fromEntries(
  [...TRAINING_FOCUS_OPTIONS, ...DIFFICULTY_LEVEL_OPTIONS].map((o) => [o.id, o.label])
)

/**
 * @param {string} key
 * @param {string} [customText]
 */
export function resolveEgitimSelectValue(key, customText = '') {
  const k = String(key || '').trim()
  if (k === EGITIM_CUSTOM) {
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
export function resolveEgitimSelectKey(key, customText = '') {
  const k = String(key || '').trim()
  if (k === EGITIM_CUSTOM) {
    const custom = String(customText || '').trim()
    return custom ? `custom:${custom}` : EGITIM_CUSTOM
  }
  return k
}

/**
 * @param {string} status
 */
export function formatEgitimStatusLabel(status) {
  const s = String(status || '').trim().toLowerCase()
  if (s === 'planned') return 'PLANLANDI'
  if (s === 'active' || s === 'in_progress') return 'AKTİF'
  if (s === 'completed' || s === 'done') return 'TAMAMLANDI'
  if (s === 'cancelled') return 'İPTAL'
  if (s) return s.toUpperCase()
  return '—'
}
