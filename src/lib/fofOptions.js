/** @typedef {{ id: string; label: string }} FofOption */

export const FOF_CUSTOM = 'custom'

/** @type {FofOption[]} */
export const SCENARIO_TYPE_OPTIONS = [
  { id: 'active_shooter', label: 'Aktif Nişancı' },
  { id: 'hostage_rescue', label: 'Rehine Kurtarma' },
  { id: 'vip_protection', label: 'VIP Koruma' },
  { id: 'hvt_raid', label: 'HVT Baskını' },
  { id: 'barricaded_suspect', label: 'Barikatlı Şüpheli' },
  { id: 'vehicle_interdiction', label: 'Araç Müdahalesi' },
  { id: 'tubular_assault', label: 'Boru / Tünel Baskını' },
  { id: 'low_light_nvg', label: 'Düşük Işık · NVG' },
  { id: 'cbrn_threat', label: 'CBRN Tehdidi' },
  { id: 'mass_casualty_mascal', label: 'Kitlesel Yaralanma (MASCAL)' },
  { id: FOF_CUSTOM, label: '[+] ÖZEL SENARYO' },
]

/** @type {FofOption[]} */
export const SIM_SYSTEM_OPTIONS = [
  { id: 'simunition', label: 'Simunition' },
  { id: 'airsoft', label: 'Airsoft' },
  { id: 'miles', label: 'MILES' },
  { id: FOF_CUSTOM, label: '[+] ÖZEL SİMÜLASYON' },
]

/** @type {FofOption[]} */
export const ENGAGEMENT_TYPE_OPTIONS = [
  { id: 'one_on_one', label: 'Birebir' },
  { id: 'team', label: 'Takım' },
  { id: 'ambush', label: 'Pusu' },
  { id: 'multi_team', label: 'Çoklu Takım' },
  { id: 'reactive', label: 'Reaktif Angajman' },
]

/** @type {Record<string, string>} */
const ENGAGEMENT_TYPE_LABELS = Object.fromEntries(
  ENGAGEMENT_TYPE_OPTIONS.map((o) => [o.id, o.label])
)

/**
 * @param {string} key
 */
export function resolveEngagementTypeLabel(key) {
  const k = String(key || '').trim()
  return ENGAGEMENT_TYPE_LABELS[k] ?? (k || '—')
}

/** @type {Record<string, string>} */
const LABEL_INDEX = Object.fromEntries(
  [...SCENARIO_TYPE_OPTIONS, ...SIM_SYSTEM_OPTIONS, ...ENGAGEMENT_TYPE_OPTIONS].map((o) => [
    o.id,
    o.label,
  ])
)

/**
 * @param {string} key
 * @param {string} [customText]
 */
export function resolveFofSelectValue(key, customText = '') {
  const k = String(key || '').trim()
  if (k === FOF_CUSTOM) {
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
export function resolveFofSelectKey(key, customText = '') {
  const k = String(key || '').trim()
  if (k === FOF_CUSTOM) {
    const custom = String(customText || '').trim()
    return custom ? `custom:${custom}` : FOF_CUSTOM
  }
  return k
}

