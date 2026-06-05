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

/** @type {{ id: string; label: string; code: string }[]} */
export const MEDEVAC_LINE3_PRECEDENCE = [
  { id: 'line3_urgent', label: 'A · ACİL', code: 'A' },
  { id: 'line3_urgent_surge', label: 'B · ÖNCELİKLİ ACİL', code: 'B' },
  { id: 'line3_priority', label: 'C · ÖNCELİKLİ', code: 'C' },
  { id: 'line3_routine', label: 'D · RUTİN', code: 'D' },
  { id: 'line3_convenience', label: 'E · KOLAYLIK', code: 'E' },
]

/** @type {{ id: string; label: string }[]} */
export const MEDEVAC_LINE4_OPTIONS = [
  { id: 'hoist', label: 'VİNÇ / HOIST' },
  { id: 'litter', label: 'SEDYE / LITTER' },
  { id: 'extraction', label: 'KURTARMA EKİPMANI' },
  { id: 'ventilator', label: 'SOLUNUM CİHAZI' },
]

/** HAT 6 — N / P / E / X */
export const MEDEVAC_LINE6_OPTIONS = [
  { id: 'no_enemy', label: 'N · DÜŞMAN YOK' },
  { id: 'possible_enemy', label: 'P · MUHTEMEL DÜŞMAN' },
  { id: 'enemy_area', label: 'E · BÖLGEDE DÜŞMAN VAR' },
  { id: 'armed_escort', label: 'X · SİLAHLI ESKORT GEREKLİ' },
]

/** HAT 7 — A / B / C / D */
export const MEDEVAC_LINE7_OPTIONS = [
  { id: 'panels', label: 'A · PANEL' },
  { id: 'pyrotechnic', label: 'B · FİŞEK' },
  { id: 'smoke', label: 'C · SİS BOMBASI' },
  { id: 'none', label: 'D · YOK' },
]

/** HAT 8 — A / B / C / D */
export const MEDEVAC_LINE8_OPTIONS = [
  { id: 'us_nato', label: 'A · DOST ASKER' },
  { id: 'non_nato', label: 'B · YABANCI ASKER' },
  { id: 'civilian', label: 'C · SİVİL' },
  { id: 'epw', label: 'D · SAVAŞ ESİRİ' },
]

/** HAT 9 KBRN */
export const MEDEVAC_LINE9_CBRN_OPTIONS = [
  { id: 'none', label: 'TEHDİT YOK' },
  { id: 'chemical', label: 'C · KİMYASAL' },
  { id: 'biological', label: 'B · BİYOLOJİK' },
  { id: 'radiological', label: 'R · RADYOLOJİK' },
  { id: 'nuclear', label: 'N · NÜKLEER' },
]

export const MEDEVAC_LINE9_TERRAIN_OPTIONS = [
  { id: 'obstacles', label: 'ARAZİ ENGELİ' },
  { id: 'flat', label: 'AÇIK ALAN' },
  { id: 'urban', label: 'KENTSEL / YAPI' },
]

/** Taktik çakışma kodları → Türkçe HUD metni */
export const MEDEVAC_CONFLICT_LABELS = {
  LINE3_ZERO_PATIENTS: 'HAT3 · YARALI SAYISI SIFIR',
  LINE5_ZERO_PATIENTS: 'HAT5 · TAŞIMA TİPİ SIFIR',
  PATIENT_COUNT_MISMATCH: 'HAT3/HAT5 · YARALI SAYISI UYUŞMUYOR',
  UNMARKED_SECURE_LZ: 'GÜVENLİ LZ · İŞARET YOK',
  CBRN_UNMARKED_LZ: 'KBRN · İŞARETSİZ LZ',
  HOT_LZ_NO_EXTRACTION: 'SICAK LZ · EKİPMAN YOK',
  URGENT_NO_EQUIP_TERRAIN: 'ACİL · EKİPMAN/ARAZİ UYUMSUZ',
}
