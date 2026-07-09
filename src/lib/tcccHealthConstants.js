/** @typedef {'tccc_march' | 'ifak_inventory' | 'medevac_request' | 'medical_history'} TcccCategory */

/** @typedef {'TQ' | 'Celox' | 'Chest Seal' | 'Needle' | 'Drug' | 'Other'} IfakItemCategory */

export const TCCC_OPERATION_CATEGORY = 'health_tccc'

/** @type {{ id: TcccCategory; label: string; short: string }[]} */
export const TCCC_CATEGORY_TABS = [
  { id: 'tccc_march', label: 'MARCH · DD-1380', short: 'MARCH' },
  { id: 'ifak_inventory', label: 'IFAK ENVANTER', short: 'IFAK' },
  { id: 'medevac_request', label: '9-LINE MEDEVAC', short: 'MEDEVAC' },
  { id: 'medical_history', label: 'YARALI ARŞİVİ', short: 'ARŞİV' },
]

/** IDs only — display labels from healthDisplayText / health.json `ifak.categories` */
/** @type {{ id: IfakItemCategory; label: string }[]} */
export const IFAK_ITEM_CATEGORIES = [
  { id: 'TQ', label: 'TQ' },
  { id: 'Celox', label: 'Celox' },
  { id: 'Chest Seal', label: 'Chest Seal' },
  { id: 'Needle', label: 'Needle' },
  { id: 'Drug', label: 'Drug' },
  { id: 'Other', label: 'Other' },
]

export const IFAK_INITIAL_ITEM_FORM = {
  itemName: '',
  category: /** @type {IfakItemCategory} */ ('TQ'),
  quantity: '1',
  expirationDate: '',
}

/** @typedef {'medevac' | 'tacevac'} EvacRequestMode */

export const MEDEVAC_NINE_LINE_INITIAL = {
  line1_pickupGrid: '',
  line2_radioFreqCallsign: '',
  line3_patientsPrecedence: {
    urgent: '',
    priority: '',
    routine: '',
  },
  line4_medicalEquipment: {
    hoist: false,
    ventilator: false,
    oxygen: false,
  },
  line5_patientsType: {
    litter: '',
    ambulatory: '',
  },
  line6_pickupSecurity: 'no_troops',
  line7_lzMarking: {
    method: 'panels',
    smokeColor: '',
  },
  line8_patientNationality: '',
  line9_cbrnTerrain: '',
}

export const TACEVAC_INITIAL_FORM = {
  pickupGrid: '',
  radioFreqCallsign: '',
  activeFireStatus: 'cold_lz',
  threatLevel: '',
  enemyWeaponProfiles: /** @type {string[]} */ ([]),
  enemyWeaponCustom: '',
  suppressiveFireRequest: false,
  casSupportType: 'none',
  extractionVehicle: 'heavy_armored_cruiser',
  operationalNotes: '',
}

/** @deprecated Use MEDEVAC_NINE_LINE_INITIAL */
export const MEDEVAC_INITIAL_FORM = MEDEVAC_NINE_LINE_INITIAL

/** @type {{ id: string; label: string }[]} */
export const MEDEVAC_LZ_MARKING_OPTIONS = [
  { id: 'panels', label: 'Panels' },
  { id: 'smoke', label: 'Smoke' },
  { id: 'strobe', label: 'Strobe' },
  { id: 'ir_strobe', label: 'IR Strobe' },
]

/** @type {{ id: string; label: string }[]} */
export const MEDEVAC_SMOKE_COLOR_OPTIONS = [
  { id: 'purple', label: 'Purple' },
  { id: 'yellow', label: 'Yellow' },
  { id: 'green', label: 'Green' },
  { id: 'red', label: 'Red' },
  { id: 'white', label: 'White' },
]

/** @type {{ id: string; label: string }[]} */
export const MEDEVAC_MEDICAL_EQUIPMENT_OPTIONS = [
  { id: 'hoist', label: 'Hoist' },
  { id: 'ventilator', label: 'Ventilator' },
  { id: 'oxygen', label: 'Oxygen' },
]

/** @type {{ id: string; label: string }[]} */
export const MEDEVAC_SECURITY_OPTION_IDS = ['no_troops', 'no_threat', 'enemy_area', 'hot_lz']

/** @deprecated Labels from tcccEvacLocales */
export const MEDEVAC_SECURITY_OPTIONS = [
  { id: 'no_troops', label: 'No enemy troops' },
  { id: 'no_threat', label: 'No threat' },
  { id: 'enemy_area', label: 'Enemy in area' },
  { id: 'hot_lz', label: 'Hot LZ' },
]

/** @deprecated Use MEDEVAC_LZ_MARKING_OPTIONS */
export const MEDEVAC_MARKING_OPTIONS = MEDEVAC_LZ_MARKING_OPTIONS

/** @type {{ id: string; label: string }[]} */
export const TACEVAC_FIRE_STATUS_OPTIONS = [
  { id: 'cold_lz', label: 'Cold LZ' },
  { id: 'hot_lz', label: 'Hot LZ' },
]

/** @type {{ id: string; label: string }[]} */
export const TACEVAC_WEAPON_PROFILE_IDS = ['small_arms', 'heavy_mg', 'rpg', 'atgm']

/** @deprecated Labels from tcccEvacLocales */
export const TACEVAC_WEAPON_PROFILE_OPTIONS = [
  { id: 'small_arms', label: 'Small Arms' },
  { id: 'heavy_mg', label: 'Heavy MG' },
  { id: 'rpg', label: 'RPG' },
  { id: 'atgm', label: 'ATGM' },
]

/** @type {{ id: string; label: string }[]} */
export const TACEVAC_EXTRACTION_VEHICLE_OPTIONS = [
  { id: 'heavy_armored_cruiser', label: 'Heavy Armored Cruiser' },
  { id: 'combat_boat_zodiac', label: 'Combat Boat / Zodiac' },
  { id: 'armed_transport_helo', label: 'Armed Transport Helicopter' },
]

/** @type {{ id: string; label: string }[]} */
export const TACEVAC_CAS_SUPPORT_OPTIONS = [
  { id: 'none', label: 'None' },
  { id: 'cas', label: 'Close Air Support (CAS)' },
  { id: 'indirect_fire', label: 'Indirect Fire Suppression' },
]
