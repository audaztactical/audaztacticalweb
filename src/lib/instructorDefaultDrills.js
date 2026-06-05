/** @typedef {{
 *   id: string
 *   instructorId: string
 *   name: string
 *   level: string
 *   defaultAmmo: number
 *   defaultMinPassScore: number
 *   isTimedDefault: boolean
 *   isPreset?: boolean
 * }} InstructorDrillOption */

export const PRESET_DRILL_ID_PREFIX = 'preset:'

/** @type {Record<string, string[]>} */
export const INSTRUCTOR_DEFAULT_DRILL_CATALOG = {
  'Seviye 1 (Temel Mekanikler)': [
    'Draw & First Shot',
    'Double Tap',
    'Ready Position',
  ],
  'Seviye 2 (Manipülasyon ve Geçiş)': [
    'Reload Drills',
    'Rifle to Pistol Transition',
    'Malfunction Clearance',
  ],
  'Seviye 3 (Dinamik ve Reaksiyon)': [
    'Mozambique Drill',
    'Multi Target Transition',
  ],
}

export const DEFAULT_INSTRUCTOR_LEVELS = Object.keys(INSTRUCTOR_DEFAULT_DRILL_CATALOG)

const PRESET_DEFAULT_AMMO = 10
const PRESET_DEFAULT_BARAJ = 6

/**
 * @param {string} level
 * @param {string} drillName
 */
export function buildPresetDrillId(level, drillName) {
  const slug = drillName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  const levelSlug = level
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
  return `${PRESET_DRILL_ID_PREFIX}${levelSlug}:${slug}`
}

/**
 * @param {string} id
 */
export function isPresetDrillId(id) {
  return String(id).startsWith(PRESET_DRILL_ID_PREFIX)
}

/**
 * @param {string} level
 * @returns {InstructorDrillOption[]}
 */
export function buildPresetDrillsForLevel(level) {
  const names = INSTRUCTOR_DEFAULT_DRILL_CATALOG[level] ?? []
  return names.map((name) => ({
    id: buildPresetDrillId(level, name),
    instructorId: '',
    name,
    level,
    defaultAmmo: PRESET_DEFAULT_AMMO,
    defaultMinPassScore: PRESET_DEFAULT_BARAJ,
    isTimedDefault: true,
    isPreset: true,
  }))
}

/**
 * @param {string} level
 * @param {InstructorDrillOption[]} firestoreTemplates
 * @returns {InstructorDrillOption[]}
 */
export function mergeDrillsForLevel(level, firestoreTemplates) {
  if (!level.trim()) return []
  const custom = firestoreTemplates.filter((t) => t.level === level)
  const customNames = new Set(custom.map((t) => t.name.trim().toLowerCase()))
  const presets = buildPresetDrillsForLevel(level).filter(
    (p) => !customNames.has(p.name.trim().toLowerCase()),
  )
  return [...presets, ...custom]
}

/**
 * @param {InstructorDrillOption[]} templates
 * @param {string[]} extraLevels
 */
export function collectInstructorDrillLevels(templates, extraLevels = []) {
  const set = new Set([...DEFAULT_INSTRUCTOR_LEVELS, ...extraLevels])
  for (const t of templates) {
    if (t.level?.trim()) set.add(t.level.trim())
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'tr'))
}
