export const MEDEVAC_SIM_INITIAL = {
  line1_mgrs: '',
  line2_freq_callsign: '',
  line3_urgent: '0',
  line3_urgent_surge: '0',
  line3_priority: '0',
  line3_routine: '0',
  line3_convenience: '0',
  /** @type {string[]} */
  line4_equipment: [],
  line5_litter: '0',
  line5_ambulatory: '0',
  line6_security: '',
  line7_marking: '',
  line8_nationality: '',
  line9_cbrn: '',
  line9_terrain: '',
}

/** IDs/codes only — labels from health.json `sim.options` via healthDisplayText */
/** @type {{ id: string; label: string; code: string }[]} */
export const MEDEVAC_LINE3_PRECEDENCE = [
  { id: 'line3_urgent', label: 'A · URGENT', code: 'A' },
  { id: 'line3_urgent_surge', label: 'B · URGENT-SURGE', code: 'B' },
  { id: 'line3_priority', label: 'C · PRIORITY', code: 'C' },
  { id: 'line3_routine', label: 'D · ROUTINE', code: 'D' },
  { id: 'line3_convenience', label: 'E · CONVENIENCE', code: 'E' },
]

/** @type {{ id: string; label: string }[]} */
export const MEDEVAC_LINE4_OPTIONS = [
  { id: 'hoist', label: 'HOIST' },
  { id: 'litter', label: 'LITTER' },
  { id: 'extraction', label: 'EXTRACTION' },
  { id: 'ventilator', label: 'VENTILATOR' },
]

/** LINE 6 — N / P / E / X */
export const MEDEVAC_LINE6_OPTIONS = [
  { id: 'no_enemy', label: 'N' },
  { id: 'possible_enemy', label: 'P' },
  { id: 'enemy_area', label: 'E' },
  { id: 'armed_escort', label: 'X' },
]

/** LINE 7 — A / B / C / D */
export const MEDEVAC_LINE7_OPTIONS = [
  { id: 'panels', label: 'A' },
  { id: 'pyrotechnic', label: 'B' },
  { id: 'smoke', label: 'C' },
  { id: 'none', label: 'D' },
]

/** LINE 8 — A / B / C / D */
export const MEDEVAC_LINE8_OPTIONS = [
  { id: 'us_nato', label: 'A' },
  { id: 'non_nato', label: 'B' },
  { id: 'civilian', label: 'C' },
  { id: 'epw', label: 'D' },
]

/** LINE 9 CBRN */
export const MEDEVAC_LINE9_CBRN_OPTIONS = [
  { id: 'none', label: 'NONE' },
  { id: 'chemical', label: 'C' },
  { id: 'biological', label: 'B' },
  { id: 'radiological', label: 'R' },
  { id: 'nuclear', label: 'N' },
]

export const MEDEVAC_LINE9_TERRAIN_OPTIONS = [
  { id: 'obstacles', label: 'OBSTACLES' },
  { id: 'flat', label: 'FLAT' },
  { id: 'urban', label: 'URBAN' },
]

/** @deprecated Prefer labelMedevacConflict() from healthDisplayText */
export const MEDEVAC_CONFLICT_LABELS = {
  LINE3_ZERO_PATIENTS: 'LINE3_ZERO_PATIENTS',
  LINE5_ZERO_PATIENTS: 'LINE5_ZERO_PATIENTS',
  PATIENT_COUNT_MISMATCH: 'PATIENT_COUNT_MISMATCH',
  UNMARKED_SECURE_LZ: 'UNMARKED_SECURE_LZ',
  CBRN_UNMARKED_LZ: 'CBRN_UNMARKED_LZ',
  HOT_LZ_NO_EXTRACTION: 'HOT_LZ_NO_EXTRACTION',
  URGENT_NO_EQUIP_TERRAIN: 'URGENT_NO_EQUIP_TERRAIN',
}
