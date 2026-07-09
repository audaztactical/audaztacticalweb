import i18n from '../i18n'

const NS = 'ballistics'

/** @typedef {'drop'|'velocity'|'energy'|'moa'|'mrad'|'mach'} ChartMetricId */

/** Stable chart metric styling (labels/units come from i18n). */
export const CHART_METRIC_STYLE = {
  drop: {
    id: /** @type {ChartMetricId} */ ('drop'),
    dataKey: 'dropCm',
    axisTickColor: 'rgba(34,197,94,0.85)',
    stroke: 'url(#dropLineGrad)',
    strokeWidth: 2.5,
    useGradient: true,
    activeDot: { r: 5, fill: '#22c55e', stroke: '#052e16' },
    refLineColor: 'rgba(34,197,94,0.55)',
    cursorColor: 'rgba(34,197,94,0.35)',
  },
  velocity: {
    id: /** @type {ChartMetricId} */ ('velocity'),
    dataKey: 'velocity',
    axisTickColor: 'rgba(251,191,36,0.85)',
    stroke: '#fbbf24',
    strokeWidth: 2,
    activeDot: { r: 4, fill: '#fbbf24', stroke: '#422006' },
    refLineColor: 'rgba(251,191,36,0.55)',
    cursorColor: 'rgba(251,191,36,0.35)',
  },
  energy: {
    id: /** @type {ChartMetricId} */ ('energy'),
    dataKey: 'energy',
    axisTickColor: 'rgba(249,115,22,0.85)',
    stroke: '#f97316',
    strokeWidth: 2,
    activeDot: { r: 4, fill: '#f97316', stroke: '#431407' },
    refLineColor: 'rgba(249,115,22,0.55)',
    cursorColor: 'rgba(249,115,22,0.35)',
  },
  moa: {
    id: /** @type {ChartMetricId} */ ('moa'),
    dataKey: 'moa',
    axisTickColor: 'rgba(59,130,246,0.85)',
    stroke: '#3b82f6',
    strokeWidth: 2,
    activeDot: { r: 4, fill: '#3b82f6', stroke: '#172554' },
    refLineColor: 'rgba(59,130,246,0.55)',
    cursorColor: 'rgba(59,130,246,0.35)',
  },
  mrad: {
    id: /** @type {ChartMetricId} */ ('mrad'),
    dataKey: 'mrad',
    axisTickColor: 'rgba(168,85,247,0.85)',
    stroke: '#a855f7',
    strokeWidth: 2,
    activeDot: { r: 4, fill: '#a855f7', stroke: '#3b0764' },
    refLineColor: 'rgba(168,85,247,0.55)',
    cursorColor: 'rgba(168,85,247,0.35)',
  },
  mach: {
    id: /** @type {ChartMetricId} */ ('mach'),
    dataKey: 'mach',
    axisTickColor: 'rgba(6,182,212,0.85)',
    stroke: '#06b6d4',
    strokeWidth: 2,
    activeDot: { r: 4, fill: '#06b6d4', stroke: '#083344' },
    refLineColor: 'rgba(6,182,212,0.55)',
    cursorColor: 'rgba(6,182,212,0.35)',
  },
}

export const CHART_METRIC_IDS = /** @type {ChartMetricId[]} */ (Object.keys(CHART_METRIC_STYLE))

/** @returns {'tr-TR' | 'en-US'} */
export function ballisticsLocale() {
  return i18n.language?.startsWith('tr') ? 'tr-TR' : 'en-US'
}

/**
 * @param {string} key
 * @param {Record<string, unknown>} [params]
 */
export function ballisticsT(key, params = {}) {
  return i18n.t(key, { ns: NS, ...params })
}

/**
 * @param {string} termKey
 * @returns {{ termKey: string, termEn: string, termTr: string, definition: string, whyItMatters: string, actionAdvice: string } | undefined}
 */
export function getBallisticTermI18n(termKey) {
  const key = String(termKey ?? '').trim()
  if (!key) return undefined
  const base = `terms.${key}`
  const termEn = ballisticsT(`${base}.termEn`)
  if (termEn === `${base}.termEn`) return undefined
  return {
    termKey: key,
    termEn,
    termTr: ballisticsT(`${base}.termTr`),
    definition: ballisticsT(`${base}.definition`),
    whyItMatters: ballisticsT(`${base}.whyItMatters`),
    actionAdvice: ballisticsT(`${base}.actionAdvice`),
  }
}

/**
 * @param {ChartMetricId | string} id
 */
export function labelChartMetric(id) {
  const key = String(id ?? '')
  const label = ballisticsT(`chart.metrics.${key}.label`)
  if (label === `chart.metrics.${key}.label`) return key
  return label
}

/**
 * @param {ChartMetricId | string} id
 */
export function chartMetricMeta(id) {
  const key = /** @type {ChartMetricId} */ (String(id ?? ''))
  const style = CHART_METRIC_STYLE[key]
  if (!style) return null
  return {
    ...style,
    label: ballisticsT(`chart.metrics.${key}.label`),
    shortLabel: ballisticsT(`chart.metrics.${key}.shortLabel`),
    unit: ballisticsT(`chart.metrics.${key}.unit`),
  }
}

/** @returns {{ id: ChartMetricId, label: string, shortLabel: string, unit: string }[]} */
export function chartMetricOptions() {
  return CHART_METRIC_IDS.map((id) => ({
    id,
    label: ballisticsT(`chart.metrics.${id}.label`),
    shortLabel: ballisticsT(`chart.metrics.${id}.shortLabel`),
    unit: ballisticsT(`chart.metrics.${id}.unit`),
  }))
}

/**
 * Positive dropCm = bullet below LOS → dial UP.
 * @param {number} dropCm
 * @returns {{ arrow: string, label: string, abbrev: string }}
 */
export function elevationDirection(dropCm) {
  const dialUp = Number(dropCm) >= 0
  return {
    arrow: dialUp ? '↑' : '↓',
    label: dialUp ? ballisticsT('quickRef.up') : ballisticsT('quickRef.down'),
    abbrev: dialUp ? ballisticsT('quickRef.abbrev.up') : ballisticsT('quickRef.abbrev.down'),
  }
}

/**
 * Positive windageCm = drift right → aim LEFT.
 * @param {number} windageCm
 * @returns {{ arrow: string, label: string, abbrev: string, none: boolean }}
 */
export function windDirection(windageCm) {
  if (Math.abs(Number(windageCm) || 0) < 0.05) {
    return { arrow: '·', label: '—', abbrev: '—', none: true }
  }
  const aimLeft = Number(windageCm) > 0
  return {
    arrow: aimLeft ? '←' : '→',
    label: aimLeft ? ballisticsT('quickRef.left') : ballisticsT('quickRef.right'),
    abbrev: aimLeft ? ballisticsT('quickRef.abbrev.left') : ballisticsT('quickRef.abbrev.right'),
    none: false,
  }
}

/** @type {Record<string, string>} */
const TABLE_COLUMN_KEY_MAP = {
  m: 'm',
  distance: 'm',
  drop: 'drop',
  wind: 'wind',
  windage: 'wind',
  tof: 'tof',
  timeOfFlight: 'tof',
  fps: 'fps',
  velocity: 'fps',
  energy: 'energy',
  remainingEnergy: 'energy',
  moa: 'moa',
  moaClicks: 'moa',
  mrad: 'mrad',
  mradClicks: 'mrad',
  mach: 'mach',
  machNumber: 'mach',
}

/**
 * @param {string} id — table.columns key or termKey alias
 */
export function labelTableColumn(id) {
  const mapped = TABLE_COLUMN_KEY_MAP[String(id ?? '')] ?? String(id ?? '')
  const key = `table.columns.${mapped}`
  const translated = ballisticsT(key)
  return translated === key ? mapped : translated
}

/**
 * @param {string} id — G1 | G7
 */
export function labelDragModel(id) {
  const u = String(id ?? '').toUpperCase()
  if (u === 'G1') return ballisticsT('form.dragG1')
  if (u === 'G7') return ballisticsT('form.dragG7')
  return u
}

/**
 * @param {string} id — FFP | SFP
 */
export function labelReticlePlane(id) {
  const u = String(id ?? '').toUpperCase()
  if (u === 'FFP') return ballisticsT('form.ffp')
  if (u === 'SFP') return ballisticsT('form.sfp')
  return u
}
