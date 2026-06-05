import { ATIS_DRILL_CUSTOM, ATIS_DRILL_LEVELS } from './atisDrills'

export { ATIS_DRILL_CUSTOM }

/** @typedef {{ totalRounds: number; requiredHits: number; maxSeconds: number; targetType: string }} AtisPresetMetrics */

/** @type {Record<number, string>} */
export const INSTRUCTOR_ATIS_OPTGROUP_LABELS = {
  1: 'SEVİYE 1: TEMEL MEKANİKLER',
  2: 'SEVİYE 2: MANİPÜLASYON VE GEÇİŞ',
  3: 'SEVİYE 3: DİNAMİK VE REAKSİYON',
}

/** @type {Record<string, AtisPresetMetrics & { level: number; drillName: string }>} */
export const ATIS_PRESET_DRILL_METRICS = {
  'l1-draw-first': { level: 1, drillName: 'Draw & First Shot', totalRounds: 5, requiredHits: 3, maxSeconds: 2.5, targetType: 'IPSC / Silüet' },
  'l1-double-tap': { level: 1, drillName: 'Double Tap', totalRounds: 10, requiredHits: 6, maxSeconds: 3.0, targetType: 'IPSC / Silüet' },
  'l1-ready': { level: 1, drillName: 'Ready Position', totalRounds: 6, requiredHits: 4, maxSeconds: 2.0, targetType: 'IPSC / Silüet' },
  'l2-reload': { level: 2, drillName: 'Reload Drills', totalRounds: 12, requiredHits: 8, maxSeconds: 4.5, targetType: 'IPSC / Silüet' },
  'l2-rifle-pistol': { level: 2, drillName: 'Rifle to Pistol Transition', totalRounds: 8, requiredHits: 5, maxSeconds: 5.0, targetType: 'Geçiş Hedefi' },
  'l2-malfunction': { level: 2, drillName: 'Malfunction Clearance', totalRounds: 6, requiredHits: 4, maxSeconds: 6.0, targetType: 'Arıza Senaryosu' },
  'l3-mozambique': { level: 3, drillName: 'Mozambique Drill', totalRounds: 3, requiredHits: 3, maxSeconds: 2.2, targetType: 'Çoklu Bölge' },
  'l3-multi-target': { level: 3, drillName: 'Multi-Target Transition', totalRounds: 12, requiredHits: 8, maxSeconds: 5.5, targetType: 'Çoklu Hedef' },
}

export const ATIS_DRILL_SELECT_PRESET_PREFIX = 'preset:'
export const ATIS_DRILL_SELECT_TEMPLATE_PREFIX = 'template:'

/**
 * @param {string} drillKey
 */
export function isAtisPresetDrillKey(drillKey) {
  return Boolean(ATIS_PRESET_DRILL_METRICS[drillKey])
}

/**
 * @param {string} selection
 */
export function parseAtisDrillSelection(selection) {
  if (!selection) return { kind: 'none' }
  if (selection === ATIS_DRILL_CUSTOM) return { kind: 'custom_action' }
  if (selection.startsWith(ATIS_DRILL_SELECT_PRESET_PREFIX)) {
    const drillKey = selection.slice(ATIS_DRILL_SELECT_PRESET_PREFIX.length)
    return { kind: 'preset', drillKey }
  }
  if (selection.startsWith(ATIS_DRILL_SELECT_TEMPLATE_PREFIX)) {
    const templateId = selection.slice(ATIS_DRILL_SELECT_TEMPLATE_PREFIX.length)
    return { kind: 'template', templateId }
  }
  return { kind: 'none' }
}

/**
 * @param {'preset' | 'template'} kind
 * @param {string} id
 */
export function buildAtisDrillSelection(kind, id) {
  return kind === 'preset' ? `${ATIS_DRILL_SELECT_PRESET_PREFIX}${id}` : `${ATIS_DRILL_SELECT_TEMPLATE_PREFIX}${id}`
}

/**
 * @param {import('./firestoreGroupTraining').GroupTrainingTemplate[]} customTemplates
 */
export function groupCustomTemplatesByLevel(customTemplates) {
  /** @type {Record<number, import('./firestoreGroupTraining').GroupTrainingTemplate[]>} */
  const byLevel = { 1: [], 2: [], 3: [] }
  for (const t of customTemplates) {
    const lvl = t.drillLevel >= 1 && t.drillLevel <= 3 ? t.drillLevel : 1
    byLevel[lvl].push(t)
  }
  return byLevel
}

export { ATIS_DRILL_LEVELS }
