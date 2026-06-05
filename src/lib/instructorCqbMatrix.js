/** @typedef {{ value: string; label: string }} CqbSelectOption */

/** @typedef {{ key: string; label: string }} CqbPhaseInfractionItem */

/** @typedef {{ id: string; title: string; subtitle: string; items: CqbPhaseInfractionItem[] }} CqbPhaseInfractionGroup */

export const CQB_SELECT_PLACEHOLDER = ''

/** @type {CqbSelectOption[]} */
export const CQB_ROOM_TOPOLOGY_OPTIONS = [
  { value: CQB_SELECT_PLACEHOLDER, label: 'Seçin' },
  { value: 'single_room', label: 'Single Room' },
  { value: 'l_room', label: 'L-Room' },
  { value: 't_room', label: 'T-Room' },
  { value: 'corridor', label: 'Corridor' },
]

/** @type {CqbSelectOption[]} */
export const CQB_ENTRY_METHOD_OPTIONS = [
  { value: CQB_SELECT_PLACEHOLDER, label: 'Seçin' },
  { value: 'cross_entry', label: 'Cross Entry' },
  { value: 'hook_entry', label: 'Hook Entry' },
  { value: 'high_low', label: 'High-Low Technique' },
  { value: 'dynamic_entry', label: 'Dynamic Entry' },
]

/** @type {CqbSelectOption[]} */
export const CQB_BREACHING_TYPE_OPTIONS = [
  { value: CQB_SELECT_PLACEHOLDER, label: 'Seçin' },
  { value: 'mechanical', label: 'Mechanical Breach' },
  { value: 'ballistic', label: 'Ballistic Breach' },
  { value: 'explosive', label: 'Explosive Breach' },
  { value: 'stealth', label: 'Stealth/Silent' },
]

/** @type {CqbSelectOption[]} */
export const CQB_DOOR_STATE_OPTIONS = [
  { value: CQB_SELECT_PLACEHOLDER, label: 'Seçin' },
  { value: 'open', label: 'Açık (Open)' },
  { value: 'locked', label: 'Kapalı/Kilitli (Locked)' },
  { value: 'barricaded', label: 'Barikatlı (Barricaded)' },
]

/** @type {CqbPhaseInfractionGroup[]} */
export const CQB_PHASE_INFRACTION_MATRIX = [
  {
    id: 'pre_breach',
    title: 'GİRİŞ ÖNCESİ',
    subtitle: 'Pre-Breach Discipline',
    items: [
      { key: 'breachingGecikmesi', label: 'Breaching Gecikmesi' },
      { key: 'koldaAcikVerme', label: 'Kolda Açık Verme' },
      { key: 'sesDisipliniIhlali', label: 'Ses Disiplini İhlali' },
      { key: 'yetersizDilimleme', label: 'Yetersiz Dilimleme' },
    ],
  },
  {
    id: 'entry_phase',
    title: 'GİRİŞ FAZI / FATAL FUNNEL',
    subtitle: 'Entry Phase',
    items: [
      { key: 'olumHunisindeCakilma', label: 'Ölüm Hunisinde Çakılma' },
      { key: 'derineFazlaKacma', label: 'Derine Fazla Kaçma' },
      { key: 'korlemesineGiris', label: 'Körlemesine Giriş' },
      { key: 'yavasKirma', label: 'Yavaş Kırma / Slow Breach' },
    ],
  },
  {
    id: 'room_geometry',
    title: 'ODA GEOMETRİSİ',
    subtitle: 'Room Geometry',
    items: [
      { key: 'gevsekKoseKontrolu', label: 'Gevşek Köşe Kontrolü' },
      { key: 'sektorBoslugu', label: 'Sektör Boşluğu' },
      { key: 'tehditOnceligiHatasi', label: 'Tehdit Önceliği Hatası' },
      { key: 'operatorCakismasi', label: 'Operatör Çakışması' },
    ],
  },
  {
    id: 'weapon_comm',
    title: 'SİLAH VE İLETİŞİM',
    subtitle: 'Weapon & Communication',
    items: [
      { key: 'namluIhlali', label: 'Namlu İhlali / Dosta Doğrultma' },
      { key: 'tunelVizyonu', label: 'Tünel Vizyonu' },
      { key: 'zayifIletisim', label: 'Zayıf Telsiz / Sözlü İletişim' },
      { key: 'taktikSarjorHatasi', label: 'Taktik Şarjör Değişim Hatası' },
    ],
  },
]

/** @type {Record<string, string>} */
export const CQB_PHASE_INFRACTION_LABELS = Object.fromEntries(
  CQB_PHASE_INFRACTION_MATRIX.flatMap((g) => g.items.map((item) => [item.key, item.label])),
)

/** @returns {Record<string, boolean>} */
export function createInitialCqbInfractionFlags() {
  /** @type {Record<string, boolean>} */
  const flags = {}
  for (const group of CQB_PHASE_INFRACTION_MATRIX) {
    for (const item of group.items) {
      flags[item.key] = false
    }
  }
  return flags
}

/**
 * @param {Record<string, boolean>} flags
 * @returns {string[]}
 */
export function collectInstructorInfractions(flags) {
  /** @type {string[]} */
  const list = []
  for (const [key, label] of Object.entries(CQB_PHASE_INFRACTION_LABELS)) {
    if (flags[key]) list.push(label)
  }
  return list
}

/**
 * @param {CqbSelectOption[]} options
 * @param {string} value
 */
export function labelCqbSelectOption(options, value) {
  const hit = options.find((o) => o.value === value)
  return hit?.label ?? (value || '—')
}

/**
 * @param {{
 *   roomTopology: string
 *   entryMethod: string
 *   breachingType: string
 *   doorState: string
 * }} setup
 */
export function buildCqbDrillNameFromSetup(setup) {
  const room = labelCqbSelectOption(CQB_ROOM_TOPOLOGY_OPTIONS, setup.roomTopology)
  const entry = labelCqbSelectOption(CQB_ENTRY_METHOD_OPTIONS, setup.entryMethod)
  if (room === 'Seçin' || entry === 'Seçin') return 'CQB OPERASYON'
  return `${room} · ${entry}`
}
