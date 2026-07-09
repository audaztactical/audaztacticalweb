import { invStr } from './inventoryIlws.js'
import { ballisticsPdfT } from './pdfReportText.js'
import { labelTableColumn } from './ballisticsDisplayText.js'

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
 * @returns {{ label: string, termKey: string, columnId: string }[]}
 */
export function buildAngleTableColumns(unitSystem) {
  if (isDualClickUnitDisplay(unitSystem)) {
    return [
      { label: labelTableColumn('moa'), termKey: 'moaClicks', columnId: 'moa' },
      { label: labelTableColumn('mrad'), termKey: 'mradClicks', columnId: 'mrad' },
    ]
  }
  if (parseClickUnitSystem(unitSystem) === 'MOA') {
    return [{ label: labelTableColumn('moa'), termKey: 'moaClicks', columnId: 'moa' }]
  }
  return [{ label: labelTableColumn('mrad'), termKey: 'mradClicks', columnId: 'mrad' }]
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
  const base = [
    ballisticsPdfT('table.columns.m'),
    ballisticsPdfT('table.columns.dropCm'),
    ballisticsPdfT('table.columns.windCm'),
    ballisticsPdfT('table.columns.tof'),
    ballisticsPdfT('table.columns.velocityFps'),
    ballisticsPdfT('table.columns.energy'),
  ]
  if (isDualClickUnitDisplay(unitSystem)) {
    return [...base, ballisticsPdfT('table.columns.moa'), ballisticsPdfT('table.columns.mrad'), ballisticsPdfT('table.columns.mach')]
  }
  if (parseClickUnitSystem(unitSystem) === 'MOA') {
    return [...base, ballisticsPdfT('table.columns.moa'), ballisticsPdfT('table.columns.mach')]
  }
  return [...base, ballisticsPdfT('table.columns.mrad'), ballisticsPdfT('table.columns.mach')]
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
