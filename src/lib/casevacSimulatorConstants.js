/** CASEVAC hot-zone MIST transmission window (seconds). */
export const CASEVAC_TRANSMISSION_DEADLINE_SEC = 30

export const CASEVAC_SIM_INITIAL = {
  casualty_count: '1',
  /** @type {string[]} */
  mist_metric: [],
  mist_injury_site: '',
  mist_vitals: '',
  /** @type {string[]} */
  mist_treatment: [],
  pickup_callsign: '',
}

/** @type {{ id: string; label: string }[]} */
export const CASEVAC_MIST_METRIC_OPTIONS = [
  { id: 'bullet', label: 'KURŞUN YARASI' },
  { id: 'shrapnel', label: 'ŞARAPNEL' },
  { id: 'amputation', label: 'AMPÜTASYON' },
  { id: 'burn', label: 'YANIK' },
]

/** @type {{ id: string; label: string }[]} */
export const CASEVAC_MIST_INJURY_OPTIONS = [
  { id: 'head_neck', label: 'BAŞ / BOYUN' },
  { id: 'chest', label: 'GÖĞÜS' },
  { id: 'abdomen', label: 'BATIN' },
  { id: 'extremity', label: 'UZUVLAR' },
]

/** @type {{ id: string; label: string }[]} */
export const CASEVAC_MIST_VITALS_OPTIONS = [
  { id: 'conscious_open', label: 'BİLİNÇ AÇIK' },
  { id: 'unconscious', label: 'BİLİNÇ KAPALI' },
  { id: 'shock_yes', label: 'ŞOK BELİRTİSİ VAR' },
  { id: 'shock_no', label: 'ŞOK BELİRTİSİ YOK' },
]

/** @type {{ id: string; label: string }[]} */
export const CASEVAC_MIST_TREATMENT_OPTIONS = [
  { id: 'tourniquet', label: 'TURNİKE UYGULANDI' },
  { id: 'chest_seal', label: 'GÖĞÜS MÜHRÜ' },
  { id: 'airway', label: 'HAVA YOLU AÇILDI' },
  { id: 'morphine', label: 'MORFİN' },
]
