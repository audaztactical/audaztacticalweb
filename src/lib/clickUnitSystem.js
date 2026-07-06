import { invStr } from './inventoryIlws.js'

/** @typedef {'MOA' | 'MRAD'} ClickUnitSystem */

/**
 * @param {unknown} value
 * @returns {ClickUnitSystem | null}
 */
export function parseClickUnitSystem(value) {
  const u = invStr(value).toUpperCase()
  return u === 'MOA' || u === 'MRAD' ? u : null
}

/**
 * Birim seçilmemişse eski davranış: MOA ve MRAD birlikte gösterilir.
 * @param {unknown} unitSystem
 */
export function isDualClickUnitDisplay(unitSystem) {
  return !parseClickUnitSystem(unitSystem)
}

/**
 * @param {unknown} unitSystem
 * @returns {ClickUnitSystem | null}
 */
export function resolveClickUnitSystem(unitSystem) {
  return parseClickUnitSystem(unitSystem)
}

/**
 * @param {unknown} unitSystem
 * @returns {{ label: string, termKey: string }[]}
 */
export function buildAngleTableColumns(unitSystem) {
  if (isDualClickUnitDisplay(unitSystem)) {
    return [
      { label: 'MOA', termKey: 'moaClicks' },
      { label: 'MRAD', termKey: 'mradClicks' },
    ]
  }
  if (parseClickUnitSystem(unitSystem) === 'MOA') {
    return [{ label: 'MOA', termKey: 'moaClicks' }]
  }
  return [{ label: 'MRAD', termKey: 'mradClicks' }]
}

/**
 * @param {import('./ballisticsEngine.js').BallisticsPointResult} r
 * @param {unknown} unitSystem
 */
export function angleTableCellsForRow(r, unitSystem) {
  if (isDualClickUnitDisplay(unitSystem)) {
    return [r.dropMOA.toFixed(2), r.dropMRAD.toFixed(2)]
  }
  if (parseClickUnitSystem(unitSystem) === 'MOA') {
    return [r.dropMOA.toFixed(2)]
  }
  return [r.dropMRAD.toFixed(2)]
}

/**
 * @param {unknown} unitSystem
 * @returns {string[]}
 */
export function buildPdfRangeTableHead(unitSystem) {
  const base = ['M (m)', 'Drop (cm)', 'Wind (cm)', 'TOF (s)', 'V (fps)', 'E (ft·lb)']
  if (isDualClickUnitDisplay(unitSystem)) {
    return [...base, 'MOA', 'MRAD', 'Mach']
  }
  if (parseClickUnitSystem(unitSystem) === 'MOA') {
    return [...base, 'MOA', 'Mach']
  }
  return [...base, 'MRAD', 'Mach']
}

/**
 * @param {import('./ballisticsEngine.js').BallisticsPointResult} r
 * @param {unknown} unitSystem
 */
export function pdfRangeTableRowForResult(r, unitSystem) {
  const base = [
    String(r.distance),
    Math.abs(r.dropCm).toFixed(1),
    Math.abs(r.windageCm).toFixed(1),
    r.timeOfFlightSeconds.toFixed(3),
    r.velocityRemaining.toFixed(0),
    r.energyRemaining.toFixed(0),
  ]
  if (isDualClickUnitDisplay(unitSystem)) {
    return [...base, r.dropMOA.toFixed(2), r.dropMRAD.toFixed(2), r.machNumber.toFixed(3)]
  }
  if (parseClickUnitSystem(unitSystem) === 'MOA') {
    return [...base, r.dropMOA.toFixed(2), r.machNumber.toFixed(3)]
  }
  return [...base, r.dropMRAD.toFixed(2), r.machNumber.toFixed(3)]
}
