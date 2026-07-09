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

/** IDs only — labels from health.json `sim.options` via healthDisplayText */
/** @type {{ id: string; label: string }[]} */
export const CASEVAC_MIST_METRIC_OPTIONS = [
  { id: 'bullet', label: 'GSW' },
  { id: 'shrapnel', label: 'SHRAPNEL' },
  { id: 'amputation', label: 'AMPUTATION' },
  { id: 'burn', label: 'BURN' },
]

/** @type {{ id: string; label: string }[]} */
export const CASEVAC_MIST_INJURY_OPTIONS = [
  { id: 'head_neck', label: 'HEAD_NECK' },
  { id: 'chest', label: 'CHEST' },
  { id: 'abdomen', label: 'ABDOMEN' },
  { id: 'extremity', label: 'EXTREMITY' },
]

/** @type {{ id: string; label: string }[]} */
export const CASEVAC_MIST_VITALS_OPTIONS = [
  { id: 'conscious_open', label: 'CONSCIOUS' },
  { id: 'unconscious', label: 'UNCONSCIOUS' },
  { id: 'shock_yes', label: 'SHOCK_YES' },
  { id: 'shock_no', label: 'SHOCK_NO' },
]

/** @type {{ id: string; label: string }[]} */
export const CASEVAC_MIST_TREATMENT_OPTIONS = [
  { id: 'tourniquet', label: 'TOURNIQUET' },
  { id: 'chest_seal', label: 'CHEST_SEAL' },
  { id: 'airway', label: 'AIRWAY' },
  { id: 'morphine', label: 'MORPHINE' },
]
