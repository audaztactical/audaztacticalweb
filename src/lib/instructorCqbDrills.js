import { CQB_DRILL_CUSTOM, CQB_DRILL_LEVELS } from './cqbDrills'

export { CQB_DRILL_CUSTOM, CQB_DRILL_LEVELS }

/** @typedef {{ totalThreats: number; maxTargetSeconds: number; targetType: string }} CqbPresetMetrics */

/** @type {Record<number, string>} */
export const INSTRUCTOR_CQB_OPTGROUP_LABELS = {
  1: 'SEVİYE 1: TEMEL ODA GİRİŞLERİ',
  2: 'SEVİYE 2: TİM KOORDİNASYONU',
  3: 'SEVİYE 3: DİNAMİK SENARYOLAR',
}

/** @type {Record<string, CqbPresetMetrics & { level: number; drillName: string }>} */
export const CQB_PRESET_DRILL_METRICS = {
  'l1-single-room': {
    level: 1,
    drillName: 'Single Room Clearing',
    totalThreats: 2,
    maxTargetSeconds: 8,
    targetType: 'Tek Oda / L-Oda',
  },
  'l1-corner-entry': {
    level: 1,
    drillName: 'Corner Check & Entry',
    totalThreats: 2,
    maxTargetSeconds: 7,
    targetType: 'Köşe Fed Oda',
  },
  'l1-fatal-funnel': {
    level: 1,
    drillName: 'Fatal Funnel Transition',
    totalThreats: 1,
    maxTargetSeconds: 5,
    targetType: 'Kapı Eşiği / Hunisi',
  },
  'l2-high-low': {
    level: 2,
    drillName: 'High-Low Entry Technique',
    totalThreats: 3,
    maxTargetSeconds: 10,
    targetType: '2-Man Stack',
  },
  'l2-cross-entry': {
    level: 2,
    drillName: 'Cross Entry / Crossover',
    totalThreats: 3,
    maxTargetSeconds: 9,
    targetType: 'Çapraz Giriş',
  },
  'l2-hook-entry': {
    level: 2,
    drillName: 'Hook Entry',
    totalThreats: 3,
    maxTargetSeconds: 9,
    targetType: 'Buttonhook / Hook',
  },
  'l3-multi-room': {
    level: 3,
    drillName: 'Multi-Room & Corridor Clearing',
    totalThreats: 5,
    maxTargetSeconds: 18,
    targetType: 'Çoklu Oda + Koridor',
  },
  'l3-hostage': {
    level: 3,
    drillName: 'Hostage Rescue',
    totalThreats: 4,
    maxTargetSeconds: 14,
    targetType: 'Rehineli Oda',
  },
  'l3-nvg-lowlight': {
    level: 3,
    drillName: 'NVG & Low-Light Night Operations',
    totalThreats: 4,
    maxTargetSeconds: 16,
    targetType: 'Düşük Işık / NVG',
  },
}

export const CQB_DRILL_SELECT_PRESET_PREFIX = 'preset:'
export const CQB_DRILL_SELECT_TEMPLATE_PREFIX = 'template:'

/**
 * @param {string} selection
 */
export function parseCqbDrillSelection(selection) {
  if (!selection) return { kind: 'none' }
  if (selection === CQB_DRILL_CUSTOM) return { kind: 'custom_action' }
  if (selection.startsWith(CQB_DRILL_SELECT_PRESET_PREFIX)) {
    const drillKey = selection.slice(CQB_DRILL_SELECT_PRESET_PREFIX.length)
    return { kind: 'preset', drillKey }
  }
  if (selection.startsWith(CQB_DRILL_SELECT_TEMPLATE_PREFIX)) {
    const templateId = selection.slice(CQB_DRILL_SELECT_TEMPLATE_PREFIX.length)
    return { kind: 'template', templateId }
  }
  return { kind: 'none' }
}

/**
 * @param {'preset' | 'template'} kind
 * @param {string} id
 */
export function buildCqbDrillSelection(kind, id) {
  return kind === 'preset' ? `${CQB_DRILL_SELECT_PRESET_PREFIX}${id}` : `${CQB_DRILL_SELECT_TEMPLATE_PREFIX}${id}`
}

/**
 * @param {import('./firestoreGroupTraining').GroupTrainingTemplate[]} customTemplates
 */
export function groupCustomCqbTemplatesByLevel(customTemplates) {
  /** @type {Record<number, import('./firestoreGroupTraining').GroupTrainingTemplate[]>} */
  const byLevel = { 1: [], 2: [], 3: [] }
  for (const t of customTemplates) {
    const lvl = t.drillLevel >= 1 && t.drillLevel <= 3 ? t.drillLevel : 1
    byLevel[lvl].push(t)
  }
  return byLevel
}
