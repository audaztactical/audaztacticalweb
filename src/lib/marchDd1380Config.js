/** @typedef {'M' | 'A' | 'R' | 'C' | 'H'} MarchStepKey */

/** @typedef {'URGENT' | 'PRIORITY' | 'ROUTINE'} EvacPriority */

/**
 * Visual/meta only — titles/subtitles/doctrine come from health i18n via healthDisplayText.
 * @typedef {Object} MarchStepMeta
 * @property {MarchStepKey} key
 * @property {string} title
 * @property {string} subtitle
 * @property {string} accent
 * @property {string} panelBorder
 * @property {string} panelBg
 * @property {string} doctrine
 */

/** @type {MarchStepMeta[]} */
export const MARCH_DD1380_STEPS = [
  {
    key: 'M',
    title: 'MASSIVE BLEEDING',
    subtitle: 'Massive Bleeding',
    accent: 'text-red-400',
    panelBorder: 'border-red-500/45',
    panelBg: 'bg-gradient-to-br from-red-950/40 to-black/70',
    doctrine: '',
  },
  {
    key: 'A',
    title: 'AIRWAY',
    subtitle: 'Airway',
    accent: 'text-amber-400',
    panelBorder: 'border-amber-500/40',
    panelBg: 'bg-gradient-to-br from-amber-950/35 to-black/70',
    doctrine: '',
  },
  {
    key: 'R',
    title: 'RESPIRATION',
    subtitle: 'Respiration',
    accent: 'text-sky-400',
    panelBorder: 'border-sky-500/40',
    panelBg: 'bg-gradient-to-br from-sky-950/40 to-black/70',
    doctrine: '',
  },
  {
    key: 'C',
    title: 'CIRCULATION',
    subtitle: 'Circulation',
    accent: 'text-emerald-400',
    panelBorder: 'border-emerald-500/40',
    panelBg: 'bg-gradient-to-br from-emerald-950/35 to-black/70',
    doctrine: '',
  },
  {
    key: 'H',
    title: 'HYPOTHERMIA & HEAD',
    subtitle: 'Hypothermia & Head',
    accent: 'text-cyan-300',
    panelBorder: 'border-cyan-500/40',
    panelBg: 'bg-gradient-to-br from-cyan-950/30 to-black/70',
    doctrine: '',
  },
]

/** @deprecated Prefer marchProtocolDetail() from healthDisplayText */
export const MARCH_PROTOCOL_DETAILS = {
  M: { definition: '', protocols: [] },
  A: { definition: '', protocols: [] },
  R: { definition: '', protocols: [] },
  C: { definition: '', protocols: [] },
  H: { definition: '', protocols: [] },
}

export const MARCH_DD1380_BUTTON_STYLES = {
  M: 'border-red-500/40 bg-gradient-to-br from-red-950/50 to-black/60 shadow-[0_0_40px_-8px_rgba(239,68,68,0.45)] ring-1 ring-red-500/25',
  A: 'border-amber-500/35 bg-gradient-to-br from-amber-950/40 to-black/60 shadow-[0_0_36px_-8px_rgba(245,158,11,0.35)] ring-1 ring-amber-500/20',
  R: 'border-sky-500/40 bg-gradient-to-br from-sky-950/45 to-black/60 shadow-[0_0_40px_-8px_rgba(56,189,248,0.4)] ring-1 ring-sky-500/25',
  C: 'border-emerald-500/35 bg-gradient-to-br from-emerald-950/40 to-black/60 shadow-[0_0_36px_-8px_rgba(52,211,153,0.35)] ring-1 ring-emerald-500/20',
  H: 'border-cyan-500/35 bg-gradient-to-br from-cyan-950/35 to-black/60 shadow-[0_0_36px_-8px_rgba(34,211,238,0.35)] ring-1 ring-cyan-500/20',
}

/** IDs only — labels from healthDisplayText / health.json */
export const CASUALTY_BLOOD_TYPE_OPTIONS = [
  { id: 'A RH+', label: 'A Rh+' },
  { id: 'A RH-', label: 'A Rh-' },
  { id: 'B RH+', label: 'B Rh+' },
  { id: 'B RH-', label: 'B Rh-' },
  { id: 'AB RH+', label: 'AB Rh+' },
  { id: 'AB RH-', label: 'AB Rh-' },
  { id: '0 RH+', label: '0 Rh+' },
  { id: '0 RH-', label: '0 Rh-' },
  { id: 'unknown', label: 'Unknown' },
]

export const TQ_LOCATION_DD_OPTIONS = [
  { id: 'right_arm', label: 'Right Arm' },
  { id: 'left_arm', label: 'Left Arm' },
  { id: 'right_leg', label: 'Right Leg' },
  { id: 'left_leg', label: 'Left Leg' },
  { id: 'custom', label: 'Custom Location' },
]

export const FLUID_DD_OPTIONS = [
  { id: 'whole_blood', label: 'Whole Blood' },
  { id: 'plasma', label: 'Plasma' },
  { id: 'saline', label: 'Normal Saline' },
]

export const RADIAL_PULSE_OPTIONS = [
  { id: 'present', label: 'Present' },
  { id: 'absent', label: 'Absent' },
]

export const AVPU_OPTIONS = [
  { id: 'alert', label: 'Alert (A)' },
  { id: 'verbal', label: 'Verbal (V)' },
  { id: 'pain', label: 'Pain (P)' },
  { id: 'unresponsive', label: 'Unresponsive (U)' },
]

export const PUPIL_OPTIONS = [
  { id: 'normal', label: 'Normal' },
  { id: 'blown', label: 'Blown / Dilated' },
]

export const NDC_GAUGE_OPTIONS = [
  { id: '10', label: '10 Gauge' },
  { id: '14', label: '14 Gauge' },
]

/** @type {{ id: EvacPriority; label: string }[]} */
export const EVAC_PRIORITY_OPTIONS = [
  { id: 'URGENT', label: 'URGENT' },
  { id: 'PRIORITY', label: 'PRIORITY' },
  { id: 'ROUTINE', label: 'ROUTINE' },
]
