/** @typedef {{ id: string; label: string }} CqbOption */

export const CQB_CUSTOM = 'custom'
export const CQB_BREACHING_NA = 'not_applicable'
export const CQB_DOOR_OPEN = 'open'

/** @type {CqbOption[]} */
export const ROOM_TOPOLOGY_OPTIONS = [
  { id: 'corner_fed', label: 'Köşe Girişli' },
  { id: 'center_fed', label: 'Merkez Girişli' },
  { id: 'open_front', label: 'Açık Cephe' },
  { id: 'l_shaped', label: 'L-Oda' },
  { id: 't_intersection', label: 'T-Kavşak' },
  { id: 'corridor', label: 'Koridor' },
  { id: CQB_CUSTOM, label: '[+] ÖZEL ODA TOPOLOJİSİ' },
]

/** @type {CqbOption[]} */
export const ENTRY_METHOD_OPTIONS = [
  { id: 'dynamic_buttonhook', label: 'Dinamik · Buttonhook' },
  { id: 'dynamic_criss_cross', label: 'Dinamik · Criss-Cross' },
  { id: 'threshold_pieing', label: 'Dilimleme / Açı Açma' },
  { id: 'limited_penetration', label: 'Sınırlı Penetrasyon' },
  { id: 'high_low', label: 'High-Low Giriş' },
  { id: CQB_CUSTOM, label: '[+] ÖZEL GİRİŞ METODU' },
]

/** @type {CqbOption[]} */
export const BREACHING_TYPE_OPTIONS = [
  { id: 'manual', label: 'Manuel' },
  { id: 'mechanical', label: 'Mekanik' },
  { id: 'ballistic', label: 'Balistik' },
  { id: 'explosive', label: 'Patlayıcı' },
  { id: CQB_CUSTOM, label: '[+] ÖZEL KIRMA TİPİ' },
]

/** @type {CqbOption[]} */
export const DOOR_STATE_OPTIONS = [
  { id: 'open', label: 'Açık' },
  { id: 'closed_inward', label: 'Kapalı · İçe Açılır' },
  { id: 'closed_outward', label: 'Kapalı · Dışa Açılır' },
]

/** @type {CqbOption[]} */
export const TEAM_SIZE_OPTIONS = [
  { id: '1-Man', label: '1-Man' },
  { id: '2-Man', label: '2-Man' },
  { id: '3-Man', label: '3-Man' },
  { id: '4-Man Team', label: '4-Man Team' },
]

/** Firestore tacticalErrors dizisinde özel metinler bu önek ile saklanır */
export const TACTICAL_ERROR_CUSTOM_PREFIX = 'custom_error:'

/**
 * @typedef {{ id: string; title: string; items: CqbOption[] }} TacticalErrorGroup
 */

/** @type {TacticalErrorGroup[]} */
export const TACTICAL_ERROR_GROUPS = [
  {
    id: 'pre_entry',
    title: 'GİRİŞ ÖNCESİ',
    items: [
      { id: 'breaching_delay', label: 'Breaching Gecikmesi' },
      { id: 'stack_exposure', label: 'Kolda Açık Verme' },
      { id: 'noise_discipline_compromised', label: 'Ses Disiplini İhlali' },
      { id: 'poor_threshold_pieing', label: 'Yetersiz Dilimleme' },
    ],
  },
  {
    id: 'entry_phase',
    title: 'GİRİŞ FAZI',
    items: [
      { id: 'fatal_funnel_hang', label: 'Ölüm Hunisinde Çakılma' },
      { id: 'over_penetration', label: 'Derine Fazla Kaçma' },
      { id: 'blind_entry', label: 'Körlemesine Giriş' },
      { id: 'slow_breach', label: 'Yavaş Kırma / Slow Breach' },
    ],
  },
  {
    id: 'room_geometry',
    title: 'ODA GEOMETRİSİ',
    items: [
      { id: 'poor_corner_check', label: 'Gevşek Köşe Kontrolü' },
      { id: 'leaving_sectors_uncovered', label: 'Sektör Boşluğu' },
      { id: 'colliding_with_teammate', label: 'Operatör Çarpışması' },
    ],
  },
  {
    id: 'weapon_comm',
    title: 'SİLAH VE İLETİŞİM',
    items: [
      { id: 'muzzle_flagging', label: 'Namlu İhlali / Dosta Doğrultma' },
      { id: 'tunnel_vision', label: 'Tünel Vizyonu' },
      { id: 'poor_comm_discipline', label: 'İletişim Kopukluğu' },
    ],
  },
]

/** Eski kayıtlar için geriye dönük etiketler */
const LEGACY_TACTICAL_ERROR_LABELS = {
  slow_breaching: 'Yavaş Kırma',
  poor_corner_piercing: 'Zayıf Köşe Delme / Poor Corner Piercing',
  blue_on_blue: 'Mavi-Mavi / Blue on Blue',
}

/** @type {CqbOption[]} */
export const TACTICAL_ERROR_PRESETS = TACTICAL_ERROR_GROUPS.flatMap((g) => g.items)

/** @type {Record<string, string>} */
const PRESET_ERROR_LABEL_INDEX = Object.fromEntries(
  TACTICAL_ERROR_PRESETS.map((o) => [o.id, o.label])
)

/** @type {Record<string, string>} */
const PRESET_ERROR_PHASE_INDEX = Object.fromEntries(
  TACTICAL_ERROR_GROUPS.flatMap((g) => g.items.map((item) => [item.id, g.title]))
)

/** @type {Record<string, string>} */
const LABEL_INDEX = Object.fromEntries(
  [
    ...ROOM_TOPOLOGY_OPTIONS,
    ...ENTRY_METHOD_OPTIONS,
    ...BREACHING_TYPE_OPTIONS,
    ...DOOR_STATE_OPTIONS,
    ...TACTICAL_ERROR_PRESETS,
    ...Object.entries(LEGACY_TACTICAL_ERROR_LABELS).map(([id, label]) => ({ id, label })),
  ].map((o) => [o.id, o.label])
)

/**
 * @param {string} key
 * @param {string} customText
 */
export function resolveCqbSelectValue(key, customText = '') {
  const k = String(key || '').trim()
  if (k === CQB_BREACHING_NA) return '—'
  if (k === CQB_CUSTOM) {
    const custom = String(customText || '').trim()
    return custom || 'Özel'
  }
  if (LABEL_INDEX[k]) return LABEL_INDEX[k]
  if (k) return k
  return '—'
}

/**
 * @param {string} key
 * @param {string} customText
 */
export function resolveCqbSelectKey(key, customText = '') {
  const k = String(key || '').trim()
  if (k === CQB_BREACHING_NA) return CQB_BREACHING_NA
  if (k === CQB_CUSTOM) {
    const custom = String(customText || '').trim()
    return custom ? `custom:${custom}` : CQB_CUSTOM
  }
  return k
}

/**
 * @param {string} text
 */
export function encodeCustomTacticalError(text) {
  const t = String(text || '').trim()
  return t ? `${TACTICAL_ERROR_CUSTOM_PREFIX}${t}` : ''
}

/**
 * @param {string} errorId
 */
export function isCustomTacticalError(errorId) {
  return invStr(errorId).startsWith(TACTICAL_ERROR_CUSTOM_PREFIX)
}

/**
 * @param {string} errorId
 */
export function decodeCustomTacticalError(errorId) {
  const s = invStr(errorId)
  if (!s.startsWith(TACTICAL_ERROR_CUSTOM_PREFIX)) return ''
  return s.slice(TACTICAL_ERROR_CUSTOM_PREFIX.length).trim()
}

/**
 * @param {string} errorId
 */
export function labelTacticalError(errorId) {
  const id = invStr(errorId).trim()
  if (!id) return '—'
  if (isCustomTacticalError(id)) {
    const custom = decodeCustomTacticalError(id)
    return custom || 'Özel Hata'
  }
  return PRESET_ERROR_LABEL_INDEX[id] ?? LEGACY_TACTICAL_ERROR_LABELS[id] ?? id
}

/**
 * @param {string} errorId
 */
export function getTacticalErrorPhaseTitle(errorId) {
  if (isCustomTacticalError(errorId)) return 'ÖZEL HATA'
  return PRESET_ERROR_PHASE_INDEX[invStr(errorId)] ?? 'DİĞER'
}

/**
 * @param {string[]} errorIds
 * @returns {{ phaseTitle: string; labels: string[] }[]}
 */
export function groupTacticalErrorsForDisplay(errorIds) {
  /** @type {Map<string, string[]>} */
  const buckets = new Map()

  for (const raw of errorIds) {
    const id = invStr(raw).trim()
    if (!id) continue
    const phase = getTacticalErrorPhaseTitle(id)
    const label = labelTacticalError(id)
    const list = buckets.get(phase) ?? []
    list.push(label)
    buckets.set(phase, list)
  }

  const phaseOrder = [
    ...TACTICAL_ERROR_GROUPS.map((g) => g.title),
    'ÖZEL HATA',
    'DİĞER',
  ]

  return phaseOrder
    .filter((title) => buckets.has(title))
    .map((phaseTitle) => ({
      phaseTitle,
      labels: buckets.get(phaseTitle) ?? [],
    }))
}

/**
 * Form gönderiminde kullanılacak birleşik dizi
 * @param {string[]} presetIds
 * @param {string[]} customTexts
 */
export function mergeTacticalErrorsForPayload(presetIds, customTexts) {
  const presets = presetIds.map((id) => invStr(id).trim()).filter(Boolean)
  const customs = customTexts
    .map((t) => encodeCustomTacticalError(t))
    .filter(Boolean)
  return [...presets, ...customs]
}

/** @param {string} s */
function invStr(s) {
  return s == null ? '' : String(s)
}

/** @type {CqbOption[]} */
export const TACTICAL_DECISION_OPTIONS = [
  { id: 'fast', label: 'Hızlı' },
  { id: 'correct', label: 'Doğru' },
  { id: 'hesitant', label: 'Tereddütlü' },
]

/** @type {Record<string, string>} */
const TACTICAL_DECISION_LABELS = Object.fromEntries(
  TACTICAL_DECISION_OPTIONS.map((o) => [o.id, o.label])
)

/**
 * @param {string} key
 */
export function resolveTacticalDecisionLabel(key) {
  const k = invStr(key).trim()
  return TACTICAL_DECISION_LABELS[k] ?? (k || '—')
}

export const CQB_INITIAL_FORM = {
  roomTopology: '',
  customRoomTopology: '',
  entryMethod: '',
  customEntryMethod: '',
  breachingType: '',
  customBreachingType: '',
  doorState: '',
  teamSize: '',
  threatCount: '0',
  neutralizedCount: '0',
  clearanceTimeMs: '',
  accuracyScore: '',
  safetyViolations: '0',
  tacticalDecision: '',
  tacticalErrors: /** @type {string[]} */ ([]),
  customTacticalErrors: /** @type {string[]} */ ([]),
  operationNote: '',
}

/** @returns {typeof CQB_INITIAL_FORM} */
export function createCqbInitialForm() {
  return {
    ...CQB_INITIAL_FORM,
    tacticalErrors: [],
    customTacticalErrors: [],
  }
}

/** @type {Record<string, Set<string>>} */
const CQB_SELECT_ID_INDEX = {
  roomTopology: new Set(ROOM_TOPOLOGY_OPTIONS.map((o) => o.id)),
  entryMethod: new Set(ENTRY_METHOD_OPTIONS.map((o) => o.id)),
  breachingType: new Set([...BREACHING_TYPE_OPTIONS.map((o) => o.id), CQB_BREACHING_NA]),
  doorState: new Set(DOOR_STATE_OPTIONS.map((o) => o.id)),
  teamSize: new Set(TEAM_SIZE_OPTIONS.map((o) => o.id)),
  tacticalDecision: new Set(TACTICAL_DECISION_OPTIONS.map((o) => o.id)),
}

/**
 * @param {'roomTopology' | 'entryMethod' | 'breachingType' | 'doorState' | 'teamSize' | 'tacticalDecision'} field
 * @param {string} value
 */
export function isKnownCqbSelectId(field, value) {
  const id = String(value ?? '').trim()
  if (!id) return false
  return CQB_SELECT_ID_INDEX[field]?.has(id) ?? false
}
